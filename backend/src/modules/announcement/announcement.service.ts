import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AppException, validationFailed } from '../../common/errors';
import { distanceMeters, GeoPoint, randomShift } from '../../common/utils/geo';
import appConfig from '../../config/app.config';
import { AuthUser } from '../auth/auth-user';
import { CategoriesService } from '../categories/categories.service';
import { MailService } from '../email/mail.service';
import { expiryReminderEmail } from '../email/mail.templates';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Role } from '../users/enums/role.enum';
import { FileStorage } from '../storage/file-storage';
import { ImageSanitizerService } from '../storage/image-sanitizer.service';
import { SignedUrlService } from '../storage/signed-url.service';
import { AnnouncementPhoto } from './entities/announcement-photo.entity';
import {
  APPROX_MAX_METERS,
  APPROX_MIN_METERS,
  DAY_MS,
  DEFAULT_EXPIRY_DAYS,
  LOCATION_UNCHANGED_METERS,
  MAX_ACTIVE_ANNOUNCEMENTS,
  MAX_EXTEND_DAYS,
  MAX_PHOTOS,
  PAGE_SIZE,
  REMINDER_BEFORE_EXPIRY_HOURS,
  REPUBLISH_WINDOW_DAYS,
} from './announcement.constants';
import { Announcement } from './entities/announcement.entity';
import {
  AnnouncementAction,
  AnnouncementDetails,
  AnnouncementListItem,
  AnnouncementPage,
  OwnAnnouncementItem,
  PhotoView,
} from './announcement.views';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementSort,
  ListAnnouncementsQueryDto,
} from './dto/list-announcements.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementStatus } from './enums/announcement-status.enum';
import { AnnouncementType } from './enums/announcement-type.enum';
import { ModerationService } from './moderation.service';

/** Great-circle distance in km between the parameters :lat/:lng and the public point of the announcement. */
const DISTANCE_SQL = `6371 * 2 * ASIN(LEAST(1, SQRT(
  POWER(SIN(RADIANS(CAST("a"."approx_latitude" AS double precision) - :lat) / 2), 2) +
  COS(RADIANS(:lat)) * COS(RADIANS(CAST("a"."approx_latitude" AS double precision))) *
  POWER(SIN(RADIANS(CAST("a"."approx_longitude" AS double precision) - :lng) / 2), 2))))`;

const displayName = (user: { firstName: string; lastName: string }) =>
  `${user.firstName} ${user.lastName.charAt(0)}.`;

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcements: Repository<Announcement>,
    @InjectRepository(AnnouncementPhoto)
    private readonly photos: Repository<AnnouncementPhoto>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly categories: CategoriesService,
    private readonly geocoding: GeocodingService,
    private readonly moderation: ModerationService,
    private readonly signer: SignedUrlService,
    private readonly storage: FileStorage,
    private readonly sanitizer: ImageSanitizerService,
    private readonly mail: MailService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // 3.2.4 Creating a help announcement
  // ---------------------------------------------------------------------------------------------

  async create(
    user: AuthUser,
    dto: CreateAnnouncementDto,
  ): Promise<AnnouncementDetails> {
    this.assertCanPublish(user);
    await this.assertActiveLimit(user.id);
    await this.assertCategory(dto.categoryId);

    const type =
      user.role === Role.Volunteer
        ? AnnouncementType.HelpOffer
        : AnnouncementType.HelpRequest;
    if (dto.isUrgent && type !== AnnouncementType.HelpRequest)
      throw this.urgentNotAllowed();

    const exact = await this.resolveLocation(dto);
    const approx = randomShift(
      exact.point,
      APPROX_MIN_METERS,
      APPROX_MAX_METERS,
    );
    const now = new Date();
    const expiryDays = dto.expiryDays ?? DEFAULT_EXPIRY_DAYS;

    const id = await this.dataSource.transaction(async (manager) => {
      // serialise concurrent publications of one user so that the limit cannot be bypassed
      await manager.query('SELECT pg_advisory_xact_lock($1)', [user.id]);
      const active = await manager.count(Announcement, {
        where: { userId: user.id, status: AnnouncementStatus.Active },
      });
      if (active >= MAX_ACTIVE_ANNOUNCEMENTS)
        throw new AppException('ACTIVE_LIMIT_REACHED');

      const saved = await manager.save(
        manager.create(Announcement, {
          type,
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          currentLocation: exact.address,
          latitude: exact.point.latitude,
          longitude: exact.point.longitude,
          approxLatitude: approx.latitude,
          approxLongitude: approx.longitude,
          isUrgent: dto.isUrgent ?? false,
          status: AnnouncementStatus.Active,
          datePosted: now,
          expiresAt: new Date(now.getTime() + expiryDays * DAY_MS),
          isFlaggedForModeration: this.moderation.containsStopWord(
            `${dto.title}\n${dto.description}`,
          ),
          userId: user.id,
        }),
      );
      return saved.id;
    });

    return this.getDetails(id, user, { countView: false });
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.6 Browsing the announcement list
  // ---------------------------------------------------------------------------------------------

  async findAll(query: ListAnnouncementsQueryDto): Promise<AnnouncementPage> {
    const page = query.page ?? 1;
    const hasPoint = query.lat !== undefined && query.lng !== undefined;

    const qb = this.announcements
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.category', 'category')
      .innerJoinAndSelect('a.user', 'user')
      .leftJoinAndSelect('user.volunteer', 'volunteer')
      .where('a.status = :status', { status: AnnouncementStatus.Active })
      .andWhere('a.expiresAt > now()');

    if (hasPoint)
      qb.addSelect(DISTANCE_SQL, 'distance_km').setParameters({
        lat: query.lat,
        lng: query.lng,
      });

    if (query.sort === AnnouncementSort.Urgent) {
      qb.orderBy('a.isUrgent', 'DESC').addOrderBy('a.datePosted', 'DESC');
    } else if (query.sort === AnnouncementSort.Nearest && hasPoint) {
      qb.orderBy('distance_km', 'ASC').addOrderBy('a.datePosted', 'DESC');
    } else {
      qb.orderBy('a.datePosted', 'DESC');
    }
    qb.addOrderBy('a.id', 'DESC')
      .offset((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1);

    const { entities, raw } = await qb.getRawAndEntities();
    const distances = new Map<number, number>();
    for (const row of raw) {
      if (row.distance_km !== null && row.distance_km !== undefined)
        distances.set(row.a_id, Number(row.distance_km));
    }

    const pageEntities = entities.slice(0, PAGE_SIZE);
    const thumbnails = await this.firstPhotos(
      pageEntities.map((entity) => entity.id),
    );
    return {
      items: pageEntities.map((entity) =>
        this.toListItem(
          entity,
          thumbnails.get(entity.id) ?? null,
          distances.get(entity.id) ?? null,
        ),
      ),
      page,
      pageSize: PAGE_SIZE,
      hasMore: entities.length > PAGE_SIZE,
    };
  }

  /** "My announcements" (SRS 3.2.5.3 step 1): everything the user has published except deleted entries. */
  async findMine(user: AuthUser): Promise<OwnAnnouncementItem[]> {
    const entities = await this.announcements
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.category', 'category')
      .innerJoinAndSelect('a.user', 'user')
      .leftJoinAndSelect('user.volunteer', 'volunteer')
      .where('a.userId = :userId', { userId: user.id })
      .andWhere('a.status != :deleted', { deleted: AnnouncementStatus.Deleted })
      .orderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .limit(200)
      .getMany();
    for (const entity of entities) await this.ensureCurrent(entity);
    const thumbnails = await this.firstPhotos(
      entities.map((entity) => entity.id),
    );
    return entities.map((entity) => ({
      ...this.toListItem(entity, thumbnails.get(entity.id) ?? null, null),
      viewsCount: entity.viewsCount,
      responsesCount: entity.responsesCount,
      allowedActions: this.allowedActions(entity),
      republishUntil: this.republishUntil(entity),
    }));
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.7 Viewing announcement details
  // ---------------------------------------------------------------------------------------------

  async getDetails(
    id: number,
    viewer?: AuthUser,
    options: { countView?: boolean } = {},
  ): Promise<AnnouncementDetails> {
    const entity = await this.announcements.findOne({
      where: { id },
      relations: { category: true, user: { volunteer: true }, photos: true },
      order: { photos: { position: 'ASC', id: 'ASC' } },
    });
    if (!entity || entity.status === AnnouncementStatus.Deleted)
      throw new AppException('ANNOUNCEMENT_UNAVAILABLE');

    const isOwner = viewer?.id === entity.userId;
    const isAdmin = viewer?.role === Role.Administrator;
    if (entity.status === AnnouncementStatus.Hidden && !isOwner && !isAdmin) {
      throw new AppException('ANNOUNCEMENT_UNAVAILABLE');
    }
    await this.ensureCurrent(entity);

    if (!isOwner && options.countView !== false) {
      await this.announcements.increment({ id }, 'viewsCount', 1);
      entity.viewsCount += 1;
    }
    return this.toDetails(entity, isOwner);
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.5 Editing, closing and deleting an announcement
  // ---------------------------------------------------------------------------------------------

  async update(
    user: AuthUser,
    id: number,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementDetails> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status === AnnouncementStatus.InProgress)
      throw new AppException('EDIT_IN_PROGRESS');
    if (entity.status !== AnnouncementStatus.Active)
      throw new AppException('NOT_EDITABLE');

    const values: QueryDeepPartialEntity<Announcement> = {};
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.categoryId !== undefined) {
      await this.assertCategory(dto.categoryId);
      values.categoryId = dto.categoryId;
    }
    if (dto.isUrgent !== undefined) {
      if (dto.isUrgent && entity.type !== AnnouncementType.HelpRequest)
        throw this.urgentNotAllowed();
      values.isUrgent = dto.isUrgent;
    }
    if (dto.expiryDays !== undefined)
      values.expiresAt = new Date(Date.now() + dto.expiryDays * DAY_MS);
    if (dto.title !== undefined || dto.description !== undefined) {
      const title = dto.title ?? entity.title ?? '';
      const description = dto.description ?? entity.description;
      if (this.moderation.containsStopWord(`${title}\n${description}`))
        values.isFlaggedForModeration = true;
    }

    if (
      dto.latitude !== undefined ||
      dto.longitude !== undefined ||
      dto.address !== undefined
    ) {
      const exact = await this.resolveLocation(dto);
      values.latitude = exact.point.latitude;
      values.longitude = exact.point.longitude;
      values.currentLocation = exact.address;
      const moved = distanceMeters(exact.point, {
        latitude: entity.latitude,
        longitude: entity.longitude,
      });
      if (moved > LOCATION_UNCHANGED_METERS) {
        const approx = randomShift(
          exact.point,
          APPROX_MIN_METERS,
          APPROX_MAX_METERS,
        );
        values.approxLatitude = approx.latitude;
        values.approxLongitude = approx.longitude;
      }
    }

    if (
      Object.keys(values).length > 0 &&
      !(await this.guardedUpdate(id, [AnnouncementStatus.Active], values))
    ) {
      throw new AppException('NOT_EDITABLE');
    }
    return this.getDetails(id, user, { countView: false });
  }

  async close(user: AuthUser, id: number): Promise<AnnouncementDetails> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status !== AnnouncementStatus.Active)
      throw new AppException('CLOSE_NOT_ALLOWED');
    const closed = await this.guardedUpdate(id, [AnnouncementStatus.Active], {
      status: AnnouncementStatus.Closed,
      closedAt: new Date(),
    });
    if (!closed) throw new AppException('CLOSE_NOT_ALLOWED');
    return this.getDetails(id, user, { countView: false });
  }

  async remove(user: AuthUser, id: number): Promise<void> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status === AnnouncementStatus.InProgress)
      throw new AppException('DELETE_IN_PROGRESS');
    if (
      entity.status !== AnnouncementStatus.Active &&
      entity.status !== AnnouncementStatus.Closed
    ) {
      throw new AppException('DELETE_NOT_ALLOWED');
    }
    const deleted = await this.guardedUpdate(
      id,
      [AnnouncementStatus.Active, AnnouncementStatus.Closed],
      {
        status: AnnouncementStatus.Deleted,
      },
    );
    if (!deleted) throw new AppException('DELETE_NOT_ALLOWED');
  }

  /** "Extend" adds up to 14 days to the expiry date (SRS 3.2.5.3 step 5). */
  async extend(
    user: AuthUser,
    id: number,
    days: number = MAX_EXTEND_DAYS,
  ): Promise<AnnouncementDetails> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status !== AnnouncementStatus.Active)
      throw new AppException('EXTEND_NOT_ALLOWED');
    const base = Math.max(entity.expiresAt.getTime(), Date.now());
    const extended = await this.guardedUpdate(id, [AnnouncementStatus.Active], {
      expiresAt: new Date(base + days * DAY_MS),
      expiryReminderSentAt: null,
    });
    if (!extended) throw new AppException('EXTEND_NOT_ALLOWED');
    return this.getDetails(id, user, { countView: false });
  }

  /** A closed announcement can be published again within 30 days (SRS 3.2.5.3 step 6, STD "Author republishes"). */
  async republish(
    user: AuthUser,
    id: number,
    expiryDays: number = DEFAULT_EXPIRY_DAYS,
  ): Promise<AnnouncementDetails> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status !== AnnouncementStatus.Closed)
      throw new AppException('REPUBLISH_NOT_ALLOWED');
    const until = this.republishUntil(entity);
    if (!until || new Date(until).getTime() < Date.now())
      throw new AppException('REPUBLISH_EXPIRED');
    this.assertCanPublish(user);

    await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [user.id]);
      const active = await manager.count(Announcement, {
        where: { userId: user.id, status: AnnouncementStatus.Active },
      });
      if (active >= MAX_ACTIVE_ANNOUNCEMENTS)
        throw new AppException('ACTIVE_LIMIT_REACHED');
      const now = new Date();
      const result = await manager.update(
        Announcement,
        { id, status: AnnouncementStatus.Closed },
        {
          status: AnnouncementStatus.Active,
          datePosted: now,
          expiresAt: new Date(now.getTime() + expiryDays * DAY_MS),
          closedAt: null,
          expiryReminderSentAt: null,
        },
      );
      if (!result.affected) throw new AppException('REPUBLISH_NOT_ALLOWED');
    });
    return this.getDetails(id, user, { countView: false });
  }

  // ---------------------------------------------------------------------------------------------
  // Photos (SRS 3.2.4.2: up to 5 files, JPEG/PNG/WebP, up to 10 MB each)
  // ---------------------------------------------------------------------------------------------

  async addPhoto(
    user: AuthUser,
    id: number,
    file: Pick<Express.Multer.File, 'buffer' | 'size'> | undefined,
  ): Promise<PhotoView> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status !== AnnouncementStatus.Active)
      throw new AppException('NOT_EDITABLE');
    if (!file?.buffer) throw new AppException('PHOTO_INVALID');

    const image = await this.sanitizer.sanitize(file.buffer);
    const key = `${randomUUID()}.${image.extension}`;
    await this.storage.put(key, image.data);

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        // lock the announcement row so that parallel uploads cannot exceed the limit
        await manager.query(
          'SELECT 1 FROM "announcements" WHERE "id" = $1 FOR UPDATE',
          [id],
        );
        const count = await manager.count(AnnouncementPhoto, {
          where: { announcementId: id },
        });
        if (count >= MAX_PHOTOS) throw new AppException('PHOTO_LIMIT');
        return manager.save(
          manager.create(AnnouncementPhoto, {
            announcementId: id,
            storageKey: key,
            contentType: image.contentType,
            sizeBytes: image.data.length,
            position: count,
          }),
        );
      });
      return { id: saved.id, url: this.signer.sign(key) };
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }
  }

  async removePhoto(
    user: AuthUser,
    id: number,
    photoId: number,
  ): Promise<void> {
    const entity = await this.loadForAuthor(user, id);
    if (entity.status !== AnnouncementStatus.Active)
      throw new AppException('NOT_EDITABLE');
    const photo = await this.photos.findOneBy({
      id: photoId,
      announcementId: id,
    });
    if (!photo) throw new AppException('PHOTO_NOT_FOUND');
    await this.photos.delete({ id: photo.id });
    await this.storage.delete(photo.storageKey).catch(() => undefined);
  }

  // ---------------------------------------------------------------------------------------------
  // Scheduled jobs (SRS 3.2.5.3 steps 5 and 6, STD)
  // ---------------------------------------------------------------------------------------------

  /** When the expiry date passes the status changes to Closed automatically. */
  async closeExpired(): Promise<number> {
    const result = await this.announcements
      .createQueryBuilder()
      .update()
      .set({
        status: AnnouncementStatus.Closed,
        closedAt: () => '"expires_at"',
      })
      .where('"status" = :status AND "expires_at" <= now()', {
        status: AnnouncementStatus.Active,
      })
      .execute();
    return result.affected ?? 0;
  }

  /** The 30-day republish period has expired: Closed -> Deleted. */
  async deleteStaleClosed(): Promise<number> {
    const result = await this.announcements
      .createQueryBuilder()
      .update()
      .set({ status: AnnouncementStatus.Deleted })
      .where('"status" = :status AND "closed_at" < :limit', {
        status: AnnouncementStatus.Closed,
        limit: new Date(Date.now() - REPUBLISH_WINDOW_DAYS * DAY_MS),
      })
      .execute();
    return result.affected ?? 0;
  }

  /** Sends the reminder with the "Extend" action 24 hours before the expiry date. */
  async sendExpiryReminders(): Promise<number> {
    const due = await this.announcements
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.user', 'user')
      .where('a.status = :status', { status: AnnouncementStatus.Active })
      .andWhere('a.expiryReminderSentAt IS NULL')
      .andWhere('a.expiresAt > now()')
      .andWhere(
        `a.expiresAt <= now() + interval '${REMINDER_BEFORE_EXPIRY_HOURS} hours'`,
      )
      // a short announcement (1 day) would be reminded at the very moment it is published
      .andWhere(
        `a.expiresAt - a.datePosted > interval '${REMINDER_BEFORE_EXPIRY_HOURS} hours'`,
      )
      .limit(100)
      .getMany();

    let sent = 0;
    for (const entity of due) {
      const outboxId = await this.dataSource.transaction(async (manager) => {
        const claimed = await manager.update(
          Announcement,
          { id: entity.id, expiryReminderSentAt: IsNull() },
          { expiryReminderSentAt: new Date() },
        );
        if (!claimed.affected) return null;
        const message = expiryReminderEmail(
          'uk',
          entity.user.firstName,
          entity.title ?? '',
          `${this.config.appUrl}/my-announcements`,
        );
        return (
          await this.mail.enqueue(
            manager,
            { to: entity.user.email, ...message },
            'expiry-reminder',
          )
        ).id;
      });
      if (outboxId) {
        await this.mail.deliver(outboxId);
        sent += 1;
      }
    }
    return sent;
  }

  // ---------------------------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------------------------

  /** SRS 3.2.4.3 step 5: only Persons in Need and Volunteers with a verified e-mail can publish. */
  private assertCanPublish(user: AuthUser): void {
    if (user.role !== Role.PersonInNeed && user.role !== Role.Volunteer)
      throw new AppException('ROLE_NOT_ALLOWED');
    if (!user.isConfirmedEmail)
      throw new AppException('EMAIL_NOT_VERIFIED_PUBLISH');
  }

  private async assertActiveLimit(userId: number): Promise<void> {
    const active = await this.announcements.count({
      where: { userId, status: AnnouncementStatus.Active },
    });
    if (active >= MAX_ACTIVE_ANNOUNCEMENTS)
      throw new AppException('ACTIVE_LIMIT_REACHED');
  }

  private async assertCategory(categoryId: number): Promise<void> {
    if (!(await this.categories.findById(categoryId))) {
      throw validationFailed({
        categoryId: {
          code: 'CATEGORY_INVALID',
          message: 'Choose a category from the list.',
        },
      });
    }
  }

  private urgentNotAllowed(): AppException {
    return validationFailed({
      isUrgent: {
        code: 'URGENT_NOT_ALLOWED',
        message: 'Only help requests can be marked as urgent.',
      },
    });
  }

  /**
   * Coordinates come from the current position or a point on the map; an address without coordinates is
   * converted by the geocoding service (SRS 3.2.4.3 step 6).
   */
  private async resolveLocation(
    dto: Pick<CreateAnnouncementDto, 'latitude' | 'longitude' | 'address'>,
  ): Promise<{ point: GeoPoint; address: string | null }> {
    const hasLatitude = dto.latitude !== undefined;
    const hasLongitude = dto.longitude !== undefined;
    const address = dto.address?.trim() ? dto.address.trim() : null;

    if (hasLatitude !== hasLongitude) throw this.locationRequired();
    if (hasLatitude && hasLongitude) {
      return {
        point: {
          latitude: dto.latitude as number,
          longitude: dto.longitude as number,
        },
        address,
      };
    }
    if (!address) throw this.locationRequired();

    const point = await this.geocoding.geocodeAddress(address);
    if (!point) throw new AppException('ADDRESS_NOT_FOUND');
    return { point, address };
  }

  private locationRequired(): AppException {
    return validationFailed({
      location: {
        code: 'LOCATION_REQUIRED',
        message:
          'Specify the location: use your current position, pick a point on the map or enter an address.',
      },
    });
  }

  /** Loads an announcement for its author: 404 when it is gone, 403 when someone else owns it. */
  private async loadForAuthor(
    user: AuthUser,
    id: number,
  ): Promise<Announcement> {
    const entity = await this.announcements.findOneBy({ id });
    if (!entity || entity.status === AnnouncementStatus.Deleted)
      throw new AppException('ANNOUNCEMENT_UNAVAILABLE');
    if (entity.userId !== user.id) throw new AppException('NOT_AUTHOR');
    await this.ensureCurrent(entity);
    return entity;
  }

  /** An active announcement whose expiry date has passed is closed immediately, not only by the scheduled job. */
  private async ensureCurrent(entity: Announcement): Promise<void> {
    if (
      entity.status === AnnouncementStatus.Active &&
      entity.expiresAt.getTime() <= Date.now()
    ) {
      await this.announcements.update(
        { id: entity.id, status: AnnouncementStatus.Active },
        { status: AnnouncementStatus.Closed, closedAt: entity.expiresAt },
      );
      entity.status = AnnouncementStatus.Closed;
      entity.closedAt = entity.expiresAt;
    }
  }

  /** Applies a change only while the announcement still has one of the expected statuses (no lost updates). */
  private async guardedUpdate(
    id: number,
    allowed: AnnouncementStatus[],
    values: QueryDeepPartialEntity<Announcement>,
  ): Promise<boolean> {
    const result = await this.announcements
      .createQueryBuilder()
      .update()
      .set(values)
      .where('"id" = :id AND "status" IN (:...allowed)', { id, allowed })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private async firstPhotos(
    ids: number[],
  ): Promise<Map<number, AnnouncementPhoto>> {
    const first = new Map<number, AnnouncementPhoto>();
    if (ids.length === 0) return first;
    const rows = await this.photos
      .createQueryBuilder('photo')
      .where('photo.announcementId IN (:...ids)', { ids })
      .orderBy('photo.position', 'ASC')
      .addOrderBy('photo.id', 'ASC')
      .getMany();
    for (const row of rows)
      if (!first.has(row.announcementId)) first.set(row.announcementId, row);
    return first;
  }

  private allowedActions(entity: Announcement): AnnouncementAction[] {
    switch (entity.status) {
      case AnnouncementStatus.Active:
        return ['edit', 'close', 'delete', 'extend'];
      case AnnouncementStatus.Closed:
        return this.republishUntil(entity) &&
          new Date(this.republishUntil(entity) as string).getTime() > Date.now()
          ? ['republish', 'delete']
          : ['delete'];
      default:
        return [];
    }
  }

  private republishUntil(entity: Announcement): string | null {
    if (entity.status !== AnnouncementStatus.Closed || !entity.closedAt)
      return null;
    return new Date(
      entity.closedAt.getTime() + REPUBLISH_WINDOW_DAYS * DAY_MS,
    ).toISOString();
  }

  private toListItem(
    entity: Announcement,
    thumbnail: AnnouncementPhoto | null,
    distanceKm: number | null,
  ): AnnouncementListItem {
    const description = entity.description;
    return {
      id: entity.id,
      type: entity.type,
      status: entity.status,
      title: entity.title ?? '',
      excerpt:
        description.length > 160
          ? `${description.slice(0, 157).trimEnd()}...`
          : description,
      category: { id: entity.category.id, name: entity.category.name },
      isUrgent: entity.isUrgent,
      datePosted: entity.datePosted.toISOString(),
      expiresAt: entity.expiresAt.toISOString(),
      distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
      author: {
        id: entity.user.id,
        name: displayName(entity.user),
        rating: entity.user.volunteer ? entity.user.volunteer.rating : null,
      },
      approxLocation: {
        latitude: entity.approxLatitude,
        longitude: entity.approxLongitude,
      },
      thumbnailUrl: thumbnail ? this.signer.sign(thumbnail.storageKey) : null,
    };
  }

  /** The exact location is only included for the author (SRS 3.2.7.3 step 2, 3.6 inverse requirements). */
  private toDetails(
    entity: Announcement,
    isOwner: boolean,
  ): AnnouncementDetails {
    return {
      id: entity.id,
      type: entity.type,
      status: entity.status,
      title: entity.title ?? '',
      description: entity.description,
      category: { id: entity.category.id, name: entity.category.name },
      isUrgent: entity.isUrgent,
      datePosted: entity.datePosted.toISOString(),
      expiresAt: entity.expiresAt.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      viewsCount: entity.viewsCount,
      responsesCount: entity.responsesCount,
      author: {
        id: entity.user.id,
        name: displayName(entity.user),
        rating: entity.user.volunteer ? entity.user.volunteer.rating : null,
      },
      photos: (entity.photos ?? []).map((photo) => ({
        id: photo.id,
        url: this.signer.sign(photo.storageKey),
      })),
      approxLocation: {
        latitude: entity.approxLatitude,
        longitude: entity.approxLongitude,
      },
      isOwner,
      exactLocation: isOwner
        ? {
            latitude: entity.latitude,
            longitude: entity.longitude,
            address: entity.currentLocation,
          }
        : null,
      allowedActions: isOwner ? this.allowedActions(entity) : [],
      republishUntil: isOwner ? this.republishUntil(entity) : null,
    };
  }
}

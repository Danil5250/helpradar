import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { AppException } from '../../common/errors';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AnnouncementStatus } from '../announcement/enums/announcement-status.enum';
import { AnnouncementType } from '../announcement/enums/announcement-type.enum';
import type { AuthUser } from '../auth/auth-user';
import { CommentsService } from '../comments/comments.service';
import { Comment } from '../comments/entities/comment.entity';
import { SignedUrlService } from '../storage/signed-url.service';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { Role } from '../users/enums/role.enum';
import { isBlocked } from '../users/users.service';
import { HelpAction, HelpConnectionDto, HelpOverviewDto } from './dto/help.dto';
import { HelpInitiator, HelpResponse } from './entities/help-response.entity';

@Injectable()
export class HelpService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Announcement)
    private readonly announcements: Repository<Announcement>,
    @InjectRepository(HelpResponse)
    private readonly responses: Repository<HelpResponse>,
    @InjectRepository(Volunteer)
    private readonly volunteers: Repository<Volunteer>,
    @InjectRepository(Comment) private readonly reviews: Repository<Comment>,
    private readonly comments: CommentsService,
    private readonly signer: SignedUrlService,
  ) {}

  async mine(user: AuthUser): Promise<{ items: HelpConnectionDto[] }> {
    const rows = await this.query()
      .where('response.requesterId = :userId OR volunteer.userId = :userId', {
        userId: user.id,
      })
      .andWhere('COALESCE(request.status, offer.status) != :deleted', {
        deleted: AnnouncementStatus.Deleted,
      })
      .take(100)
      .getMany();
    return {
      items: await Promise.all(rows.map((row) => this.toDto(row, user))),
    };
  }

  async overview(user: AuthUser, id: number): Promise<HelpOverviewDto> {
    const announcement = await this.announcements.findOneBy({ id });
    if (
      !announcement ||
      announcement.status === AnnouncementStatus.Deleted ||
      (announcement.status === AnnouncementStatus.Hidden &&
        announcement.userId !== user.id)
    ) {
      throw new AppException('ANNOUNCEMENT_UNAVAILABLE');
    }
    const qb = this.query();
    if (announcement.type === AnnouncementType.HelpRequest) {
      qb.where('response.announcementId = :id', { id });
      if (announcement.userId !== user.id)
        qb.andWhere('volunteer.userId = :userId', { userId: user.id });
    } else {
      qb.where('response.offerId = :id', { id });
      if (announcement.userId !== user.id)
        qb.andWhere('response.requesterId = :userId', { userId: user.id });
    }
    const rows = await qb.take(100).getMany();
    const requests =
      announcement.type === AnnouncementType.HelpOffer &&
      user.role === Role.PersonInNeed
        ? await this.announcements.find({
            where: {
              userId: user.id,
              type: AnnouncementType.HelpRequest,
              status: AnnouncementStatus.Active,
              expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
            take: 100,
          })
        : [];
    return {
      canRespond:
        user.role === Role.Volunteer &&
        announcement.type === AnnouncementType.HelpRequest &&
        announcement.userId !== user.id &&
        this.isActive(announcement) &&
        !rows.some(
          (row) => row.status === 'Pending' || row.status === 'Accepted',
        ),
      canReceiveOffer:
        user.role === Role.PersonInNeed &&
        announcement.type === AnnouncementType.HelpOffer &&
        announcement.userId !== user.id &&
        this.isActive(announcement) &&
        !rows.some(
          (row) =>
            row.announcementId === null &&
            row.requesterId === user.id &&
            (row.status === 'Pending' || row.status === 'Accepted'),
        ),
      requests: requests.map((request) => ({
        id: request.id,
        title: request.title ?? '',
      })),
      connections: await Promise.all(rows.map((row) => this.toDto(row, user))),
    };
  }

  async respond(user: AuthUser, requestId: number): Promise<HelpConnectionDto> {
    this.assertRole(user, Role.Volunteer);
    const volunteer = await this.volunteers.findOneBy({ userId: user.id });
    if (!volunteer) throw new AppException('HELP_NOT_ALLOWED');
    const id = await this.dataSource.transaction(async (manager) => {
      const request = await this.lockRequest(manager, requestId);
      this.assertActive(request);
      if (request.userId === user.id)
        throw new AppException('HELP_NOT_ALLOWED');
      return this.saveResponse(
        manager,
        request,
        volunteer.id,
        'volunteer',
        null,
      );
    });
    return this.getOne(id, user);
  }

  async requestHelp(
    user: AuthUser,
    offerId: number,
    requestId: number,
  ): Promise<HelpConnectionDto> {
    this.assertRole(user, Role.PersonInNeed);
    const id = await this.dataSource.transaction(async (manager) => {
      const request = await this.lockRequest(manager, requestId);
      if (request.userId !== user.id)
        throw new AppException('HELP_NOT_ALLOWED');
      this.assertActive(request);
      const offer = await manager.findOneBy(Announcement, { id: offerId });
      if (
        !offer ||
        offer.type !== AnnouncementType.HelpOffer ||
        !this.isActive(offer)
      ) {
        throw new AppException('HELP_REQUEST_UNAVAILABLE');
      }
      const volunteer = await manager.findOne(Volunteer, {
        where: { userId: offer.userId },
        relations: { user: true },
      });
      if (
        !volunteer ||
        isBlocked(volunteer.user) ||
        volunteer.userId === user.id
      )
        throw new AppException('HELP_NOT_ALLOWED');
      return this.saveResponse(
        manager,
        request,
        volunteer.id,
        'requester',
        offerId,
      );
    });
    return this.getOne(id, user);
  }

  async receiveOffer(
    user: AuthUser,
    offerId: number,
  ): Promise<HelpConnectionDto> {
    this.assertRole(user, Role.PersonInNeed);
    const id = await this.dataSource.transaction(async (manager) => {
      const offer = await this.lockOffer(manager, offerId);
      this.assertActive(offer);
      const volunteer = await manager.findOne(Volunteer, {
        where: { userId: offer.userId },
        relations: { user: true },
      });
      if (!volunteer || isBlocked(volunteer.user) || offer.userId === user.id)
        throw new AppException('HELP_NOT_ALLOWED');
      const existing = await manager.findOneBy(HelpResponse, {
        announcementId: IsNull(),
        offerId,
        requesterId: user.id,
      });
      if (existing && existing.status !== 'Rejected')
        throw new AppException('HELP_ALREADY_RESPONDED');
      const response = await manager.save(
        HelpResponse,
        manager.create(HelpResponse, {
          ...(existing ? { id: existing.id } : {}),
          announcementId: null,
          offerId,
          requesterId: user.id,
          volunteerId: volunteer.id,
          initiatedBy: 'requester',
          status: 'Pending',
          helpStatus: null,
          completedAt: null,
          dateCreated: new Date(),
        }),
      );
      await manager.increment(
        Announcement,
        { id: offerId },
        'responsesCount',
        1,
      );
      return response.id;
    });
    return this.getOne(id, user);
  }

  async act(
    user: AuthUser,
    id: number,
    action: HelpAction,
  ): Promise<HelpConnectionDto> {
    const existing = await this.responses.findOneBy({ id });
    if (!existing) throw new AppException('HELP_RESPONSE_NOT_FOUND');
    await this.dataSource.transaction(async (manager) => {
      // lock the announcement before its response to keep actions serialized.
      const isDirect = existing.announcementId === null;
      const announcement = isDirect
        ? await this.lockOffer(manager, existing.offerId!)
        : await this.lockRequest(manager, existing.announcementId!);
      const response = await manager.findOne(HelpResponse, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!response) throw new AppException('HELP_RESPONSE_NOT_FOUND');
      const volunteer = await manager.findOne(Volunteer, {
        where: { id: response.volunteerId },
        relations: { user: true },
      });
      if (
        !volunteer ||
        (response.requesterId !== user.id && volunteer.userId !== user.id)
      )
        throw new AppException('HELP_RESPONSE_NOT_FOUND');
      response.announcement = isDirect ? null : announcement;
      response.offer = isDirect ? announcement : null;
      response.volunteer = volunteer;
      if (!this.actions(response, user).includes(action))
        throw new AppException('HELP_ACTION_UNAVAILABLE');

      if (action === 'accept') {
        if (isBlocked(volunteer.user))
          throw new AppException('HELP_NOT_ALLOWED');
        response.status = 'Accepted';
        if (isDirect) {
          response.helpStatus = AnnouncementStatus.InProgress;
          response.completedAt = null;
        } else {
          announcement.status = AnnouncementStatus.InProgress;
          announcement.volunteerWhoCompleteId = volunteer.id;
          announcement.completedAt = null;
          await manager
            .createQueryBuilder()
            .update(HelpResponse)
            .set({ status: 'Rejected' })
            .where(
              'announcement_id = :requestId AND id != :id AND status = :status',
              { requestId: announcement.id, id, status: 'Pending' },
            )
            .execute();
        }
      } else if (action === 'complete') {
        if (isDirect) {
          response.helpStatus = AnnouncementStatus.Completed;
          response.completedAt = new Date();
        } else {
          announcement.status = AnnouncementStatus.Completed;
          announcement.completedAt = new Date();
        }
      } else if (action === 'cancel') {
        response.status = 'Rejected';
        if (isDirect) {
          response.helpStatus = null;
          response.completedAt = null;
        } else {
          announcement.status =
            announcement.expiresAt.getTime() > Date.now()
              ? AnnouncementStatus.Active
              : AnnouncementStatus.Closed;
          announcement.closedAt =
            announcement.status === AnnouncementStatus.Closed
              ? announcement.expiresAt
              : null;
          announcement.volunteerWhoCompleteId = null;
          announcement.completedAt = null;
        }
      } else {
        response.status = 'Rejected';
      }
      // update scalar fields without saving stale relations.
      await manager.update(HelpResponse, id, {
        status: response.status,
        helpStatus: response.helpStatus,
        completedAt: response.completedAt,
      });
      const source = isDirect
        ? { offerId: announcement.id }
        : { announcementId: announcement.id };
      announcement.responsesCount = await manager.count(HelpResponse, {
        where: [
          { ...source, status: 'Pending' },
          { ...source, status: 'Accepted' },
        ],
      });
      await manager.save(Announcement, announcement);
    });
    return this.getOne(id, user);
  }

  private query() {
    return this.responses
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.announcement', 'request')
      .leftJoinAndSelect('response.offer', 'offer')
      .innerJoinAndSelect('response.requester', 'requester')
      .innerJoinAndSelect('response.volunteer', 'volunteer')
      .innerJoinAndSelect('volunteer.user', 'helper')
      .orderBy('response.dateCreated', 'DESC')
      .addOrderBy('response.id', 'DESC');
  }

  private async getOne(id: number, user: AuthUser): Promise<HelpConnectionDto> {
    const row = await this.query().where('response.id = :id', { id }).getOne();
    if (!row) throw new AppException('HELP_RESPONSE_NOT_FOUND');
    return this.toDto(row, user);
  }

  private async saveResponse(
    manager: EntityManager,
    request: Announcement,
    volunteerId: number,
    initiatedBy: HelpInitiator,
    offerId: number | null,
  ): Promise<number> {
    let response = await manager.findOneBy(HelpResponse, {
      announcementId: request.id,
      requesterId: request.userId,
      volunteerId,
    });
    if (
      response &&
      (response.status === 'Pending' || response.status === 'Accepted')
    )
      throw new AppException('HELP_ALREADY_RESPONDED');
    response = manager.create(HelpResponse, {
      ...(response ? { id: response.id } : {}),
      announcementId: request.id,
      requesterId: request.userId,
      volunteerId,
      initiatedBy,
      offerId,
      status: 'Pending',
      dateCreated: new Date(),
    });
    const saved = await manager.save(response);
    await manager.increment(
      Announcement,
      { id: request.id },
      'responsesCount',
      1,
    );
    return saved.id;
  }

  private async lockRequest(
    manager: EntityManager,
    id: number,
  ): Promise<Announcement> {
    const request = await manager.findOne(Announcement, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      !request ||
      request.type !== AnnouncementType.HelpRequest ||
      request.status === AnnouncementStatus.Deleted
    )
      throw new AppException('HELP_REQUEST_UNAVAILABLE');
    return request;
  }

  private async lockOffer(
    manager: EntityManager,
    id: number,
  ): Promise<Announcement> {
    const offer = await manager.findOne(Announcement, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      !offer ||
      offer.type !== AnnouncementType.HelpOffer ||
      offer.status === AnnouncementStatus.Deleted
    )
      throw new AppException('HELP_REQUEST_UNAVAILABLE');
    return offer;
  }

  private isActive(request: Announcement): boolean {
    return (
      request.status === AnnouncementStatus.Active &&
      request.expiresAt.getTime() > Date.now()
    );
  }

  private assertActive(request: Announcement): void {
    if (!this.isActive(request))
      throw new AppException('HELP_REQUEST_UNAVAILABLE');
  }

  private assertRole(user: AuthUser, role: Role): void {
    if (user.role !== role) throw new AppException('HELP_NOT_ALLOWED');
    if (!user.isConfirmedEmail)
      throw new AppException('EMAIL_NOT_VERIFIED_PUBLISH');
  }

  private actions(response: HelpResponse, user: AuthUser): HelpAction[] {
    const request = response.announcement;
    const isRequester = response.requesterId === user.id;
    const isVolunteer = response.volunteer.userId === user.id;
    if (!isRequester && !isVolunteer) return [];
    if (
      response.status === 'Accepted' &&
      (request
        ? request.status === AnnouncementStatus.InProgress &&
          request.volunteerWhoCompleteId === response.volunteerId
        : response.helpStatus === 'InProgress')
    ) {
      return isRequester ? ['complete', 'cancel'] : ['cancel'];
    }
    const source = request ?? response.offer;
    if (response.status !== 'Pending' || !source || !this.isActive(source))
      return [];
    const isRecipient =
      response.initiatedBy === 'volunteer' ? isRequester : isVolunteer;
    return isRecipient ? ['accept', 'decline'] : ['withdraw'];
  }

  private async toDto(
    response: HelpResponse,
    user: AuthUser,
  ): Promise<HelpConnectionDto> {
    const request = response.announcement ?? response.offer!;
    const requester = response.requester;
    const progress = response.announcement
      ? request.status
      : (response.helpStatus ?? request.status);
    const volunteer = response.volunteer.user;
    const isParticipant = requester.id === user.id || volunteer.id === user.id;
    const canContact =
      isParticipant &&
      response.status === 'Accepted' &&
      (progress === AnnouncementStatus.InProgress ||
        progress === AnnouncementStatus.Completed);
    const person = (account: User) => ({
      id: account.id,
      name: `${account.firstName} ${account.lastName.charAt(0)}.`,
      avatarUrl: this.signer.resolve(account.avatarUrl),
    });
    return {
      id: response.id,
      status: response.status,
      initiatedBy: response.initiatedBy,
      isDirect: response.announcementId === null,
      dateCreated: response.dateCreated.toISOString(),
      request: {
        id: request.id,
        title: request.title ?? '',
        status: progress,
      },
      requester: person(requester),
      volunteer: person(volunteer),
      actions: this.actions(response, user),
      contactPhone: canContact
        ? user.id === requester.id
          ? volunteer.phoneNumber
          : requester.phoneNumber
        : null,
      canReview:
        response.status === 'Accepted' &&
        (await this.comments.canReview(request, user)),
      hasReview:
        response.status === 'Accepted' &&
        (await this.reviews.exists({
          where: { announcementId: request.id, authorId: requester.id },
        })),
    };
  }
}

import {
  AnnouncementSort,
  AnnouncementTypeFilter,
} from './dto/list-announcements.request.dto';
import { AnnouncementService } from './announcement.service';
import { AnnouncementStatus } from './enums/announcement-status.enum';
import { AnnouncementType } from './enums/announcement-type.enum';
import { Role } from '../users/enums/role.enum';
import { loadAppConfig } from '../../config/app.config';
import { distanceMeters } from '../../common/utils/geo';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let repo: any;
  let photos: any;
  let query: any;
  let manager: any;
  let categories: any;
  let geocoding: any;
  let moderation: any;
  let storage: any;
  let sanitizer: any;
  const actor: any = { id: 1, role: Role.PersonInNeed, isConfirmedEmail: true };
  const input = {
    title: 'Please help',
    description: 'Help is needed here.',
    categoryId: 1,
    latitude: 50.45,
    longitude: 30.52,
  };
  const entity = (overrides: object = {}): any => ({
    id: 7,
    userId: 1,
    title: input.title,
    description: input.description,
    type: AnnouncementType.HelpRequest,
    status: AnnouncementStatus.Active,
    latitude: 50.45,
    longitude: 30.52,
    approxLatitude: 50.451,
    approxLongitude: 30.521,
    currentLocation: 'Private address',
    expiresAt: new Date('2100-01-01'),
    datePosted: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    closedAt: null,
    category: { id: 1, name: 'Food' },
    user: { id: 1, firstName: 'Anna', lastName: 'Test', avatarUrl: '/avatar' },
    photos: [],
    viewsCount: 0,
    responsesCount: 0,
    isUrgent: false,
    ...overrides,
  });
  beforeEach(() => {
    query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(entity()),
      findOneBy: jest.fn().mockResolvedValue(entity()),
      increment: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => query),
    };
    photos = {
      findOneBy: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
    };
    manager = {
      query: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((_type, value) => value),
      save: jest.fn(async (value) => ({ id: 7, ...value })),
    };
    categories = {
      findById: jest.fn().mockResolvedValue({ id: 1, name: 'Food' }),
    };
    geocoding = {
      geocodeAddress: jest
        .fn()
        .mockResolvedValue({ latitude: 50.45, longitude: 30.52 }),
    };
    moderation = { containsStopWord: jest.fn().mockReturnValue(false) };
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    sanitizer = {
      sanitize: jest.fn().mockResolvedValue({
        data: Buffer.from('image'),
        extension: 'png',
        contentType: 'image/png',
      }),
    };
    service = new AnnouncementService(
      repo,
      photos,
      {
        transaction: async (work: (manager: any) => Promise<any>) =>
          work(manager),
      } as never,
      categories,
      geocoding,
      moderation,
      {
        resolve: (key: string) => key,
        sign: (key: string) => `/signed/${key}`,
      } as never,
      storage,
      sanitizer,
      {} as never,
      { canReview: jest.fn().mockResolvedValue(false) } as never,
      loadAppConfig({}),
    );
  });
  it('publishes with a protected public position and flags moderated text', async () => {
    moderation.containsStopWord.mockReturnValue(true);
    const result = await service.create(actor, input);
    expect(result.id).toBe(7);
    const saved = manager.save.mock.calls[0][0];
    expect(saved).toMatchObject({
      type: AnnouncementType.HelpRequest,
      userId: 1,
      status: AnnouncementStatus.Active,
      isFlaggedForModeration: true,
      latitude: 50.45,
      longitude: 30.52,
    });
    const shift = distanceMeters(input, {
      latitude: saved.approxLatitude,
      longitude: saved.approxLongitude,
    });
    expect(shift).toBeGreaterThan(49.8);
    expect(shift).toBeLessThan(300.2);
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1)',
      [1],
    );
  });
  it('geocodes an address when coordinates are absent', async () => {
    await service.create(
      { ...actor, role: Role.Volunteer },
      {
        title: input.title,
        description: input.description,
        categoryId: 1,
        address: ' Kyiv ',
      },
    );
    expect(geocoding.geocodeAddress).toHaveBeenCalledWith('Kyiv');
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnnouncementType.HelpOffer,
        currentLocation: 'Kyiv',
      }),
    );
  });
  it('rejects unauthorized roles, unverified users and publication limits', async () => {
    await expect(
      service.create({ ...actor, role: Role.Administrator }, input),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' });
    await expect(
      service.create({ ...actor, isConfirmedEmail: false }, input),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED_PUBLISH' });
    repo.count.mockResolvedValue(10);
    await expect(service.create(actor, input)).rejects.toMatchObject({
      code: 'ACTIVE_LIMIT_REACHED',
    });
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rechecks publication limits while holding the transaction lock', async () => {
    manager.count.mockResolvedValue(10);
    await expect(service.create(actor, input)).rejects.toMatchObject({
      code: 'ACTIVE_LIMIT_REACHED',
    });
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects invalid categories, offer urgency and incomplete locations', async () => {
    categories.findById.mockResolvedValueOnce(null);
    await expect(service.create(actor, input)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    await expect(
      service.create(
        { ...actor, role: Role.Volunteer },
        { ...input, isUrgent: true },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(
      service.create(actor, { ...input, longitude: undefined }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(
      service.create(actor, {
        ...input,
        longitude: undefined,
        latitude: undefined,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    geocoding.geocodeAddress.mockResolvedValue(null);
    await expect(
      service.create(actor, {
        ...input,
        longitude: undefined,
        latitude: undefined,
        address: 'unknown',
      }),
    ).rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND' });
  });
  it('exposes exact coordinates only to the author and counts only outside views', async () => {
    const own = await service.getDetails(7, actor);
    expect(own.exactLocation).toEqual({
      latitude: 50.45,
      longitude: 30.52,
      address: 'Private address',
    });
    expect(own.allowedActions).toEqual(['edit', 'close', 'delete', 'extend']);
    expect(repo.increment).not.toHaveBeenCalled();
    const publicView = await service.getDetails(7);
    expect(publicView.exactLocation).toBeNull();
    expect(publicView.allowedActions).toEqual([]);
    expect(publicView.author.name).toBe('Anna T.');
    expect(repo.increment).toHaveBeenCalledWith({ id: 7 }, 'viewsCount', 1);
  });
  it('hides deleted and moderated announcements from other users', async () => {
    repo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(entity({ status: AnnouncementStatus.Deleted }))
      .mockResolvedValueOnce(entity({ status: AnnouncementStatus.Hidden }));
    for (let i = 0; i < 3; i++)
      await expect(service.getDetails(7)).rejects.toMatchObject({
        code: 'ANNOUNCEMENT_UNAVAILABLE',
      });
    repo.findOne.mockResolvedValue(
      entity({ status: AnnouncementStatus.Hidden }),
    );
    expect((await service.getDetails(7, actor)).status).toBe(
      AnnouncementStatus.Hidden,
    );
  });
  it('keeps the public location stable when the exact location has barely moved', async () => {
    await service.update(actor, 7, {
      latitude: 50.45,
      longitude: 30.52,
      title: 'Changed title',
      description: 'Updated description',
      categoryId: 1,
      isUrgent: true,
      expiryDays: 7,
    });
    expect(query.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Changed title',
        isUrgent: true,
        latitude: 50.45,
        longitude: 30.52,
      }),
    );
    expect(query.set.mock.calls[0][0]).not.toHaveProperty('approxLatitude');
    await service.update(actor, 7, { latitude: 51, longitude: 31 });
    expect(query.set.mock.calls[1][0]).toHaveProperty('approxLatitude');
  });
  it('rejects another author and edits of in-progress or closed announcements', async () => {
    await expect(
      service.update({ ...actor, id: 2 }, 7, {}),
    ).rejects.toMatchObject({ code: 'NOT_AUTHOR' });
    repo.findOneBy
      .mockResolvedValueOnce(entity({ status: AnnouncementStatus.InProgress }))
      .mockResolvedValueOnce(entity({ status: AnnouncementStatus.Closed }));
    await expect(service.update(actor, 7, {})).rejects.toMatchObject({
      code: 'EDIT_IN_PROGRESS',
    });
    await expect(service.update(actor, 7, {})).rejects.toMatchObject({
      code: 'NOT_EDITABLE',
    });
  });
  it('closes expired announcements when reading their details', async () => {
    const expiresAt = new Date('2000-01-01');
    repo.findOne.mockResolvedValue(entity({ expiresAt }));
    expect((await service.getDetails(7, actor)).status).toBe(
      AnnouncementStatus.Closed,
    );
    expect(repo.update).toHaveBeenCalledWith(
      { id: 7, status: AnnouncementStatus.Active },
      { status: AnnouncementStatus.Closed, closedAt: expiresAt },
    );
  });
  it('rejects missing photos and cleans storage when the photo limit is reached', async () => {
    await expect(service.addPhoto(actor, 7, undefined)).rejects.toMatchObject({
      code: 'PHOTO_INVALID',
    });
    manager.count.mockResolvedValue(5);
    await expect(
      service.addPhoto(actor, 7, { buffer: Buffer.from('upload'), size: 6 }),
    ).rejects.toMatchObject({ code: 'PHOTO_LIMIT' });
    expect(storage.delete).toHaveBeenCalledWith(storage.put.mock.calls[0][0]);
    await expect(service.removePhoto(actor, 7, 999)).rejects.toMatchObject({
      code: 'PHOTO_NOT_FOUND',
    });
  });
  it('stores a sanitized photo and removes its row and file on deletion', async () => {
    const photo = await service.addPhoto(actor, 7, {
      buffer: Buffer.from('upload'),
      size: 6,
    });
    const key = storage.put.mock.calls[0][0];
    expect(photo).toEqual({ id: 7, url: `/signed/${key}` });
    photos.findOneBy.mockResolvedValue({ id: 7, storageKey: key });
    await service.removePhoto(actor, 7, 7);
    expect(photos.delete).toHaveBeenCalledWith({ id: 7 });
    expect(storage.delete).toHaveBeenCalledWith(key);
  });
  it('applies guarded closing, extension and soft deletion', async () => {
    await service.close(actor, 7);
    expect(query.set).toHaveBeenCalledWith({
      status: AnnouncementStatus.Closed,
      closedAt: expect.any(Date),
    });
    await service.extend(actor, 7, 3);
    expect(query.set).toHaveBeenCalledWith({
      expiresAt: new Date(new Date('2100-01-01').getTime() + 3 * 86400000),
      expiryReminderSentAt: null,
    });
    await service.remove(actor, 7);
    expect(query.set).toHaveBeenCalledWith({
      status: AnnouncementStatus.Deleted,
    });
    query.execute.mockResolvedValue({ affected: 0 });
    await expect(service.close(actor, 7)).rejects.toMatchObject({
      code: 'CLOSE_NOT_ALLOWED',
    });
  });
  describe('discovery and lifecycle', () => {
    let mail: any;
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-09T12:00:00Z'));
      for (const method of [
        'innerJoinAndSelect',
        'leftJoinAndSelect',
        'andWhere',
        'orderBy',
        'addOrderBy',
        'offset',
        'limit',
        'addSelect',
        'setParameters',
      ])
        query[method] = jest.fn().mockReturnThis();
      query.clone = jest.fn(() => ({
        getCount: jest.fn().mockResolvedValue(501),
      }));
      query.getRawAndEntities = jest
        .fn()
        .mockResolvedValue({ entities: [], raw: [] });
      query.getMany = jest.fn().mockResolvedValue([]);
      photos.createQueryBuilder = jest.fn(() => query);
      manager.update = jest.fn().mockResolvedValue({ affected: 1 });
      mail = {
        enqueue: jest.fn().mockResolvedValue({ id: 'outbox' }),
        deliver: jest.fn().mockResolvedValue(true),
      };
      // Replace only the external mail adapter, retaining the real service logic.
      Object.assign(service, { mail });
    });
    afterEach(() => jest.useRealTimers());
    it('returns an empty first page without fetching photos', async () => {
      expect(await service.findAll({})).toEqual({
        items: [],
        page: 1,
        pageSize: 20,
        hasMore: false,
      });
      expect(photos.createQueryBuilder).not.toHaveBeenCalled();
      expect(query.andWhere).toHaveBeenCalledWith('a.expiresAt > now()');
      expect(query.orderBy).toHaveBeenCalledWith('a.datePosted', 'DESC');
    });
    it('paginates, maps distances and thumbnails, and protects exact locations', async () => {
      const rows = Array.from({ length: 21 }, (_, i) =>
        entity({ id: i + 1, description: 'x'.repeat(170) }),
      );
      query.getRawAndEntities.mockResolvedValue({
        entities: rows,
        raw: [
          { a_id: 1, distance_km: '1.26' },
          { a_id: 2, distance_km: null },
        ],
      });
      query.getMany.mockResolvedValue([
        { announcementId: 1, storageKey: 'first' },
        { announcementId: 1, storageKey: 'second' },
      ]);
      const result = await service.findAll(
        {
          page: 2,
          sort: AnnouncementSort.Nearest,
          lat: 0,
          lng: 0,
          radius: 5,
          type: AnnouncementTypeFilter.HelpOffer,
        },
        actor,
      );
      expect(result).toMatchObject({ page: 2, hasMore: true });
      expect(result.items).toHaveLength(20);
      expect(result.items[0]).toMatchObject({
        distanceKm: 1.3,
        thumbnailUrl: '/signed/first',
        excerpt: 'x'.repeat(157) + '...',
      });
      expect(result.items[1]).toMatchObject({
        distanceKm: null,
        thumbnailUrl: null,
      });
      expect(result.items[0]).not.toHaveProperty('latitude');
      expect(result.items[0]).not.toHaveProperty('exactLocation');
      expect(query.offset).toHaveBeenCalledWith(20);
      expect(query.limit).toHaveBeenCalledWith(21);
      expect(query.andWhere).toHaveBeenCalledWith('a.userId != :viewerId', {
        viewerId: 1,
      });
      expect(query.andWhere).toHaveBeenCalledWith('a.type = :type', {
        type: AnnouncementType.HelpOffer,
      });
      expect(query.orderBy).toHaveBeenCalledWith('distance_km', 'ASC');
      expect(query.setParameters).toHaveBeenCalledWith({ lat: 0, lng: 0 });
      expect(query.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('<= :radius'),
        { radius: 5 },
      );
    });
    it.each([AnnouncementSort.Urgent, AnnouncementSort.Nearest])(
      'handles %s without a location',
      async (sort) => {
        query.getRawAndEntities.mockResolvedValue({
          entities: [entity()],
          raw: [],
        });
        const result = await service.findAll({ sort });
        expect(result.items[0]).toMatchObject({
          excerpt: input.description,
          distanceKm: null,
        });
        expect(query.orderBy).toHaveBeenCalledWith(
          sort === AnnouncementSort.Urgent ? 'a.isUrgent' : 'a.datePosted',
          'DESC',
        );
        expect(query.addSelect).not.toHaveBeenCalled();
      },
    );
    it('maps bounded public markers while retaining the uncapped total', async () => {
      query.getRawAndEntities.mockResolvedValue({
        entities: [entity()],
        raw: [{ a_id: 7, distance_km: '2.56' }],
      });
      expect(
        await service.findForMap({ lat: 50, lng: 30, radius: 10 }),
      ).toMatchObject({
        total: 501,
        radiusKm: 10,
        items: [
          {
            id: 7,
            distanceKm: 2.6,
            approxLocation: { latitude: 50.451, longitude: 30.521 },
          },
        ],
      });
      expect(query.limit).toHaveBeenCalledWith(500);
      expect(query.setParameters).toHaveBeenCalledWith({
        lat: 50,
        lng: 30,
        radius: 10,
      });
    });
    it('lists owned entries and closes expired items before calculating actions', async () => {
      query.getMany
        .mockResolvedValueOnce([entity({ expiresAt: new Date('2026-11-08') })])
        .mockResolvedValueOnce([]);
      const rows = await service.findMine(actor);
      expect(rows[0]).toMatchObject({
        status: AnnouncementStatus.Closed,
        allowedActions: ['republish', 'delete'],
        viewsCount: 0,
        responsesCount: 0,
      });
      expect(repo.update).toHaveBeenCalledWith(
        { id: 7, status: AnnouncementStatus.Active },
        expect.objectContaining({ status: AnnouncementStatus.Closed }),
      );
      expect(query.where).toHaveBeenCalledWith('a.userId = :userId', {
        userId: 1,
      });
      expect(query.andWhere).toHaveBeenCalledWith('a.status != :deleted', {
        deleted: AnnouncementStatus.Deleted,
      });
    });
    it('republishes a closed entry under the publication lock', async () => {
      repo.findOneBy.mockResolvedValue(
        entity({
          status: AnnouncementStatus.Closed,
          closedAt: new Date('2026-11-01'),
        }),
      );
      await service.republish(actor, 7, 3);
      expect(manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock($1)',
        [1],
      );
      expect(manager.update).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 7, status: AnnouncementStatus.Closed },
        {
          status: AnnouncementStatus.Active,
          datePosted: new Date(),
          expiresAt: new Date(Date.now() + 3 * 86400000),
          closedAt: null,
          expiryReminderSentAt: null,
        },
      );
    });
    it('rejects invalid republishing states and failed conditional updates', async () => {
      await expect(service.republish(actor, 7)).rejects.toMatchObject({
        code: 'REPUBLISH_NOT_ALLOWED',
      });
      repo.findOneBy.mockResolvedValue(
        entity({
          status: AnnouncementStatus.Closed,
          closedAt: new Date('2026-01-01'),
        }),
      );
      await expect(service.republish(actor, 7)).rejects.toMatchObject({
        code: 'REPUBLISH_EXPIRED',
      });
      repo.findOneBy.mockResolvedValue(
        entity({
          status: AnnouncementStatus.Closed,
          closedAt: new Date('2026-11-01'),
        }),
      );
      manager.count.mockResolvedValueOnce(10);
      await expect(service.republish(actor, 7)).rejects.toMatchObject({
        code: 'ACTIVE_LIMIT_REACHED',
      });
      manager.update.mockResolvedValue({ affected: 0 });
      await expect(service.republish(actor, 7)).rejects.toMatchObject({
        code: 'REPUBLISH_NOT_ALLOWED',
      });
    });
    it('closes expired entries and deletes only stale closed entries', async () => {
      expect(await service.closeExpired()).toBe(1);
      expect(query.where).toHaveBeenCalledWith(
        expect.stringContaining('"expires_at" <= now()'),
        { status: AnnouncementStatus.Active },
      );
      expect(query.set.mock.calls.at(-1)[0].closedAt()).toBe('"expires_at"');
      query.execute.mockResolvedValue({});
      expect(await service.deleteStaleClosed()).toBe(0);
      expect(query.where).toHaveBeenCalledWith(
        expect.stringContaining('"closed_at" < :limit'),
        {
          status: AnnouncementStatus.Closed,
          limit: new Date(Date.now() - 30 * 86400000),
        },
      );
    });
    it('claims reminders before enqueueing and skips claims won by another worker', async () => {
      query.getMany.mockResolvedValue([
        entity({ user: { firstName: 'Anna', email: 'a@example.test' } }),
        entity({ id: 8 }),
      ]);
      manager.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });
      expect(await service.sendExpiryReminders()).toBe(1);
      expect(mail.enqueue).toHaveBeenCalledTimes(1);
      expect(mail.enqueue).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ to: 'a@example.test' }),
        'expiry-reminder',
      );
      expect(mail.deliver).toHaveBeenCalledWith('outbox');
      expect(query.andWhere).toHaveBeenCalledWith(
        'a.expiryReminderSentAt IS NULL',
      );
      expect(query.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('a.expiresAt - a.datePosted'),
      );
    });
  });
});

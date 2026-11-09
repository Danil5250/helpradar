import { Announcement } from '../announcement/entities/announcement.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { HelpResponse } from './entities/help-response.entity';
import { HelpService } from './help.service';
import { AnnouncementStatus } from '../announcement/enums/announcement-status.enum';
import { AnnouncementType } from '../announcement/enums/announcement-type.enum';
import { Role } from '../users/enums/role.enum';

describe('HelpService', () => {
  let service: HelpService;
  let query: any;
  let manager: any;
  let announcements: any;
  let responses: any;
  let volunteers: any;
  let reviews: any;
  const requester: any = {
    id: 1,
    role: Role.PersonInNeed,
    isConfirmedEmail: true,
  };
  const helper: any = { id: 2, role: Role.Volunteer, isConfirmedEmail: true };
  const account = (id: number) => ({
    id,
    firstName: 'Anna',
    lastName: 'Test',
    avatarUrl: '/avatar',
    phoneNumber: `phone-${id}`,
    blockedUntil: null,
  });
  const announcement = (extra: object = {}): any => ({
    id: 7,
    userId: 1,
    type: AnnouncementType.HelpRequest,
    status: AnnouncementStatus.Active,
    expiresAt: new Date('2100-01-01'),
    title: 'Please help',
    ...extra,
  });
  const response = (extra: object = {}): any => ({
    id: 4,
    announcementId: 7,
    offerId: null,
    requesterId: 1,
    volunteerId: 3,
    status: 'Pending',
    initiatedBy: 'volunteer',
    dateCreated: new Date('2026-01-01'),
    announcement: announcement(),
    offer: null,
    requester: account(1),
    volunteer: { id: 3, userId: 2, user: account(2) },
    ...extra,
  });
  beforeEach(() => {
    query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(response()),
    };
    manager = {
      findOne: jest.fn().mockResolvedValue(announcement()),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((_type, value) => value),
      save: jest.fn().mockResolvedValue({ id: 4 }),
      increment: jest.fn(),
    };
    announcements = {
      findOneBy: jest.fn().mockResolvedValue(announcement()),
      find: jest.fn().mockResolvedValue([]),
    };
    responses = {
      createQueryBuilder: jest.fn(() => query),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    volunteers = {
      findOneBy: jest.fn().mockResolvedValue({ id: 3, userId: 2 }),
    };
    reviews = { exists: jest.fn().mockResolvedValue(false) };
    service = new HelpService(
      {
        transaction: async (work: (manager: any) => Promise<any>) =>
          work(manager),
      } as never,
      announcements,
      responses,
      volunteers,
      reviews,
      { canReview: jest.fn().mockResolvedValue(false) } as never,
      { resolve: (key: string) => key } as never,
    );
  });
  it('creates a pending volunteer response and increments the response counter', async () => {
    expect(await service.respond(helper, 7)).toMatchObject({
      id: 4,
      status: 'Pending',
      actions: ['withdraw'],
      contactPhone: null,
    });
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        announcementId: 7,
        requesterId: 1,
        volunteerId: 3,
        initiatedBy: 'volunteer',
        status: 'Pending',
      }),
    );
    expect(manager.increment).toHaveBeenCalledWith(
      expect.any(Function),
      { id: 7 },
      'responsesCount',
      1,
    );
  });
  it('rejects incorrect roles, unverified accounts and missing volunteer profiles', async () => {
    await expect(service.respond(requester, 7)).rejects.toMatchObject({
      code: 'HELP_NOT_ALLOWED',
    });
    await expect(
      service.respond({ ...helper, isConfirmedEmail: false }, 7),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED_PUBLISH' });
    volunteers.findOneBy.mockResolvedValue(null);
    await expect(service.respond(helper, 7)).rejects.toMatchObject({
      code: 'HELP_NOT_ALLOWED',
    });
    expect(manager.save).not.toHaveBeenCalled();
  });
  it.each([
    null,
    announcement({ type: AnnouncementType.HelpOffer }),
    announcement({ status: AnnouncementStatus.Deleted }),
    announcement({ expiresAt: new Date('2000-01-01') }),
  ])('rejects unavailable requests (%#)', async (value) => {
    manager.findOne.mockResolvedValue(value);
    await expect(service.respond(helper, 7)).rejects.toMatchObject({
      code: 'HELP_REQUEST_UNAVAILABLE',
    });
  });
  it.each(['Pending', 'Accepted'])(
    'does not duplicate a %s response',
    async (status) => {
      manager.findOneBy.mockResolvedValue({ id: 4, status });
      await expect(service.respond(helper, 7)).rejects.toMatchObject({
        code: 'HELP_ALREADY_RESPONDED',
      });
      expect(manager.save).not.toHaveBeenCalled();
    },
  );
  it('reuses a previously rejected response', async () => {
    manager.findOneBy.mockResolvedValue({ id: 4, status: 'Rejected' });
    await service.respond(helper, 7);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, status: 'Pending' }),
    );
  });
  it('exposes contact numbers only after acceptance and only to participants', async () => {
    const accepted = response({
      status: 'Accepted',
      announcement: announcement({
        status: AnnouncementStatus.InProgress,
        volunteerWhoCompleteId: 3,
      }),
    });
    query.getMany.mockResolvedValue([accepted]);
    expect((await service.mine(requester)).items[0]).toMatchObject({
      contactPhone: 'phone-2',
      actions: ['complete', 'cancel'],
    });
    expect((await service.mine(helper)).items[0]).toMatchObject({
      contactPhone: 'phone-1',
      actions: ['cancel'],
    });
    expect(
      (await service.mine({ ...requester, id: 99 })).items[0],
    ).toMatchObject({ contactPhone: null, actions: [] });
    query.getMany.mockResolvedValue([response()]);
    expect((await service.mine(requester)).items[0]).toMatchObject({
      contactPhone: null,
      actions: ['accept', 'decline'],
    });
  });
  it('offers the respond action only before a participant has a pending response', async () => {
    expect(await service.overview(helper, 7)).toMatchObject({
      canRespond: true,
      canReceiveOffer: false,
      connections: [],
    });
    query.getMany.mockResolvedValue([response()]);
    expect(await service.overview(helper, 7)).toMatchObject({
      canRespond: false,
    });
    announcements.findOneBy.mockResolvedValue(
      announcement({ status: AnnouncementStatus.Hidden }),
    );
    await expect(service.overview(helper, 7)).rejects.toMatchObject({
      code: 'ANNOUNCEMENT_UNAVAILABLE',
    });
  });
  it('lists a recipients active requests when viewing an offer', async () => {
    announcements.findOneBy.mockResolvedValue(
      announcement({ type: AnnouncementType.HelpOffer, userId: 2 }),
    );
    announcements.find.mockResolvedValue([announcement()]);
    expect(await service.overview(requester, 7)).toMatchObject({
      canReceiveOffer: true,
      requests: [{ id: 7, title: 'Please help' }],
    });
  });
  it('rejects missing responses and attempts to attach another recipients request', async () => {
    await expect(service.act(requester, 99, 'accept')).rejects.toMatchObject({
      code: 'HELP_RESPONSE_NOT_FOUND',
    });
    manager.findOne.mockResolvedValue(announcement({ userId: 99 }));
    await expect(service.requestHelp(requester, 8, 7)).rejects.toMatchObject({
      code: 'HELP_NOT_ALLOWED',
    });
  });
  describe('offer connections and state transitions', () => {
    let offer: any;
    let request: any;
    let connection: any;
    let volunteer: any;
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-09T12:00:00Z'));
      offer = announcement({
        id: 8,
        type: AnnouncementType.HelpOffer,
        userId: 2,
        responsesCount: 0,
      });
      request = announcement({
        responsesCount: 0,
        completedAt: null,
        volunteerWhoCompleteId: null,
      });
      volunteer = { id: 3, userId: 2, user: account(2) };
      connection = response({
        announcement: request,
        volunteer,
        helpStatus: null,
        completedAt: null,
      });
      manager.findOne.mockImplementation(async (type: any, options: any) =>
        type === Volunteer
          ? volunteer
          : type === HelpResponse
            ? connection
            : options.where.id === 8
              ? offer
              : request,
      );
      manager.findOneBy.mockImplementation(async (type: any) =>
        type === Announcement ? offer : null,
      );
      manager.save.mockImplementation(async (...args: any[]) => ({
        id: 4,
        ...args.at(-1),
      }));
      manager.update = jest.fn().mockResolvedValue({ affected: 1 });
      manager.count = jest.fn().mockResolvedValue(2);
      manager.createQueryBuilder = jest.fn(() => query);
      for (const method of ['update', 'set'])
        query[method] = jest.fn().mockReturnThis();
      query.execute = jest.fn().mockResolvedValue({ affected: 1 });
      responses.findOneBy.mockImplementation(async () => connection);
      query.getOne.mockImplementation(async () => connection);
    });
    afterEach(() => jest.useRealTimers());
    it('links an owned request to an active offer', async () => {
      await service.requestHelp(requester, 8, 7);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          announcementId: 7,
          offerId: 8,
          requesterId: 1,
          volunteerId: 3,
          initiatedBy: 'requester',
          status: 'Pending',
        }),
      );
      expect(manager.increment).toHaveBeenCalledWith(
        Announcement,
        { id: 7 },
        'responsesCount',
        1,
      );
    });
    it.each([
      'missing',
      'wrong-type',
      'expired',
      'blocked',
      'missing-volunteer',
      'self',
    ])('rejects an unavailable linked offer: %s', async (reason) => {
      if (reason === 'missing') manager.findOneBy.mockResolvedValue(null);
      if (reason === 'wrong-type') offer.type = AnnouncementType.HelpRequest;
      if (reason === 'expired') offer.expiresAt = new Date('2000-01-01');
      if (reason === 'blocked')
        volunteer.user.blockedUntil = new Date('2030-01-01');
      if (reason === 'missing-volunteer') volunteer = null;
      if (reason === 'self') volunteer.userId = requester.id;
      await expect(service.requestHelp(requester, 8, 7)).rejects.toMatchObject({
        code: ['blocked', 'missing-volunteer', 'self'].includes(reason)
          ? 'HELP_NOT_ALLOWED'
          : 'HELP_REQUEST_UNAVAILABLE',
      });
      expect(manager.save).not.toHaveBeenCalled();
    });
    it('creates a direct connection and reuses rejected connections', async () => {
      await service.receiveOffer(requester, 8);
      expect(manager.save).toHaveBeenCalledWith(
        HelpResponse,
        expect.objectContaining({
          announcementId: null,
          offerId: 8,
          status: 'Pending',
          helpStatus: null,
          completedAt: null,
        }),
      );
      expect(manager.increment).toHaveBeenCalledWith(
        Announcement,
        { id: 8 },
        'responsesCount',
        1,
      );
      manager.findOneBy.mockResolvedValue({ id: 10, status: 'Rejected' });
      await service.receiveOffer(requester, 8);
      expect(manager.save).toHaveBeenLastCalledWith(
        HelpResponse,
        expect.objectContaining({ id: 10, status: 'Pending' }),
      );
    });
    it.each(['Pending', 'Accepted'])(
      'rejects duplicate direct %s connections',
      async (status) => {
        manager.findOneBy.mockResolvedValue({ id: 4, status });
        await expect(service.receiveOffer(requester, 8)).rejects.toMatchObject({
          code: 'HELP_ALREADY_RESPONDED',
        });
        expect(manager.save).not.toHaveBeenCalled();
      },
    );
    it.each([
      'missing',
      'wrong-type',
      'deleted',
      'expired',
      'blocked',
      'self',
      'missing-volunteer',
    ])('rejects invalid direct offers: %s', async (reason) => {
      if (reason === 'missing') offer = null;
      if (reason === 'wrong-type') offer.type = AnnouncementType.HelpRequest;
      if (reason === 'deleted') offer.status = AnnouncementStatus.Deleted;
      if (reason === 'expired') offer.expiresAt = new Date('2000-01-01');
      if (reason === 'blocked')
        volunteer.user.blockedUntil = new Date('2030-01-01');
      if (reason === 'self') offer.userId = requester.id;
      if (reason === 'missing-volunteer') volunteer = null;
      // The lock lookup must preserve missing offers as null.
      if (reason === 'missing') manager.findOne.mockResolvedValue(null);
      await expect(service.receiveOffer(requester, 8)).rejects.toMatchObject({
        code: ['blocked', 'self', 'missing-volunteer'].includes(reason)
          ? 'HELP_NOT_ALLOWED'
          : 'HELP_REQUEST_UNAVAILABLE',
      });
      expect(manager.save).not.toHaveBeenCalled();
    });
    it('accepts request help, rejects competitors and recounts live responses', async () => {
      await service.act(requester, 4, 'accept');
      expect(request).toMatchObject({
        status: AnnouncementStatus.InProgress,
        volunteerWhoCompleteId: 3,
        responsesCount: 2,
      });
      expect(query.set).toHaveBeenCalledWith({ status: 'Rejected' });
      expect(query.where).toHaveBeenCalledWith(
        expect.stringContaining('id != :id'),
        { requestId: 7, id: 4, status: 'Pending' },
      );
      expect(manager.update).toHaveBeenCalledWith(
        HelpResponse,
        4,
        expect.objectContaining({ status: 'Accepted' }),
      );
      expect(manager.count).toHaveBeenCalledWith(HelpResponse, {
        where: [
          { announcementId: 7, status: 'Pending' },
          { announcementId: 7, status: 'Accepted' },
        ],
      });
    });
    it.each([false, true])(
      'completes accepted help (direct=%s) only as requester',
      async (direct) => {
        connection.status = 'Accepted';
        request.status = AnnouncementStatus.InProgress;
        request.volunteerWhoCompleteId = 3;
        if (direct)
          Object.assign(connection, {
            announcementId: null,
            offerId: 8,
            announcement: null,
            offer,
            helpStatus: AnnouncementStatus.InProgress,
          });
        await expect(service.act(helper, 4, 'complete')).rejects.toMatchObject({
          code: 'HELP_ACTION_UNAVAILABLE',
        });
        await service.act(requester, 4, 'complete');
        expect(direct ? connection : request).toMatchObject(
          direct
            ? {
                helpStatus: AnnouncementStatus.Completed,
                completedAt: new Date(),
              }
            : { status: AnnouncementStatus.Completed, completedAt: new Date() },
        );
        if (direct) expect(offer.status).toBe(AnnouncementStatus.Active);
      },
    );
    it('accepts a direct offer without rejecting other recipients', async () => {
      Object.assign(connection, {
        announcementId: null,
        offerId: 8,
        announcement: null,
        offer,
        initiatedBy: 'requester',
      });
      await service.act(helper, 4, 'accept');
      expect(connection).toMatchObject({
        status: 'Accepted',
        helpStatus: AnnouncementStatus.InProgress,
        completedAt: null,
      });
      expect(offer.status).toBe(AnnouncementStatus.Active);
      expect(query.execute).not.toHaveBeenCalled();
    });
    it.each([false, true])(
      'cancels request help (expired=%s) and clears assignment',
      async (expired) => {
        connection.status = 'Accepted';
        Object.assign(request, {
          status: AnnouncementStatus.InProgress,
          volunteerWhoCompleteId: 3,
          expiresAt: new Date(expired ? '2000-01-01' : '2100-01-01'),
        });
        await service.act(helper, 4, 'cancel');
        expect(request).toMatchObject({
          status: expired
            ? AnnouncementStatus.Closed
            : AnnouncementStatus.Active,
          closedAt: expired ? request.expiresAt : null,
          volunteerWhoCompleteId: null,
          completedAt: null,
        });
        expect(connection.status).toBe('Rejected');
      },
    );
    it('cancels direct help without closing the offer', async () => {
      Object.assign(connection, {
        announcementId: null,
        offerId: 8,
        announcement: null,
        offer,
        status: 'Accepted',
        helpStatus: AnnouncementStatus.InProgress,
      });
      await service.act(requester, 4, 'cancel');
      expect(connection).toMatchObject({
        status: 'Rejected',
        helpStatus: null,
        completedAt: null,
      });
      expect(offer.status).toBe(AnnouncementStatus.Active);
    });
    it.each(['decline', 'withdraw'] as const)(
      'rejects the connection on %s',
      async (action) => {
        await service.act(action === 'decline' ? requester : helper, 4, action);
        expect(manager.update).toHaveBeenCalledWith(
          HelpResponse,
          4,
          expect.objectContaining({ status: 'Rejected' }),
        );
      },
    );
    it('rejects outsiders, missing locked rows, blocked volunteers and invalid actions without writes', async () => {
      await expect(
        service.act({ ...requester, id: 99 }, 4, 'accept'),
      ).rejects.toMatchObject({ code: 'HELP_RESPONSE_NOT_FOUND' });
      await expect(service.act(helper, 4, 'accept')).rejects.toMatchObject({
        code: 'HELP_ACTION_UNAVAILABLE',
      });
      volunteer.user.blockedUntil = new Date('2030-01-01');
      await expect(service.act(requester, 4, 'accept')).rejects.toMatchObject({
        code: 'HELP_NOT_ALLOWED',
      });
      connection = null;
      responses.findOneBy.mockResolvedValue(response());
      await expect(service.act(requester, 4, 'accept')).rejects.toMatchObject({
        code: 'HELP_RESPONSE_NOT_FOUND',
      });
      expect(manager.update).not.toHaveBeenCalled();
    });
  });
});

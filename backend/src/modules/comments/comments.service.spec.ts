import {
  CommentsService,
  REVIEW_PERIOD_MS,
  REVIEW_EDIT_MS,
} from './comments.service';
import { AnnouncementStatus } from '../announcement/enums/announcement-status.enum';
import { AnnouncementType } from '../announcement/enums/announcement-type.enum';
import { Role } from '../users/enums/role.enum';
import { CommentSort } from './dto/list-comments.request.dto';

describe('CommentsService', () => {
  let manager: any;
  let comments: any;
  let users: any;
  let volunteers: any;
  let moderation: any;
  let service: CommentsService;
  const actor: any = { id: 1, role: Role.PersonInNeed };
  const completed: any = {
    id: 7,
    userId: 1,
    status: AnnouncementStatus.Completed,
    type: AnnouncementType.HelpRequest,
    volunteerWhoCompleteId: 4,
    completedAt: new Date(),
  };
  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((_type, value) => value),
      save: jest.fn(async (value) => ({ id: 3, ...value })),
      query: jest.fn(),
    };
    comments = {
      exists: jest.fn().mockResolvedValue(false),
      findOneOrFail: jest.fn().mockResolvedValue({
        id: 3,
        rating: 5,
        description: 'Thanks',
        dateCreated: new Date(),
        announcementId: 7,
        author: {
          id: 1,
          firstName: 'Anna',
          lastName: 'Test',
          avatarUrl: '/avatar',
        },
      }),
    };
    users = { exists: jest.fn().mockResolvedValue(true) };
    volunteers = { findOneBy: jest.fn().mockResolvedValue(null) };
    moderation = { containsStopWord: jest.fn().mockReturnValue(false) };
    service = new CommentsService(
      {
        manager,
        transaction: async (work: (manager: any) => Promise<any>) =>
          work(manager),
      } as never,
      comments,
      volunteers,
      users,
      moderation,
      { resolve: (key: string) => key } as never,
    );
  });
  it('allows one review for completed help during the review window', async () => {
    expect(await service.canReview(completed, actor)).toBe(true);
    comments.exists.mockResolvedValue(true);
    expect(await service.canReview(completed, actor)).toBe(false);
    expect(await service.canReview(completed, undefined)).toBe(false);
    expect(
      await service.canReview(
        {
          ...completed,
          completedAt: new Date(Date.now() - REVIEW_PERIOD_MS - 1000),
        },
        actor,
      ),
    ).toBe(false);
    expect(
      await service.canReview(
        { ...completed, status: AnnouncementStatus.Deleted },
        actor,
      ),
    ).toBe(false);
    expect(await service.canReview(completed, { ...actor, id: 2 })).toBe(false);
  });
  it('creates a review and recalculates its recipient rating in the same transaction', async () => {
    manager.findOne.mockResolvedValue(completed);
    const result = await service.create(actor, 7, {
      rating: 5,
      description: 'Thanks',
    });
    expect(result).toMatchObject({
      code: 'REVIEW_SAVED',
      comment: { id: 3, rating: 5, author: { name: 'Anna T.' } },
    });
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('AVG("rating")'),
      [4],
    );
  });
  it('rejects duplicate, late and forbidden reviews', async () => {
    await expect(
      service.create({ ...actor, role: Role.Volunteer }, 7, { rating: 5 }),
    ).rejects.toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
    moderation.containsStopWord.mockReturnValueOnce(true);
    await expect(
      service.create(actor, 7, { rating: 5, description: 'spam' }),
    ).rejects.toMatchObject({ code: 'REVIEW_TEXT_FORBIDDEN' });
    manager.findOne.mockResolvedValue(completed);
    manager.exists.mockResolvedValueOnce(true);
    await expect(service.create(actor, 7, { rating: 5 })).rejects.toMatchObject(
      { code: 'REVIEW_EXISTS' },
    );
    manager.findOne.mockResolvedValue({
      ...completed,
      completedAt: new Date(Date.now() - REVIEW_PERIOD_MS - 1000),
    });
    await expect(service.create(actor, 7, { rating: 5 })).rejects.toMatchObject(
      { code: 'REVIEW_PERIOD_ENDED' },
    );
  });
  it('allows the author to edit within one day and hides other authors reviews', async () => {
    const comment = {
      id: 3,
      authorId: 1,
      volunteerId: 4,
      rating: 5,
      description: 'Thanks',
      dateCreated: new Date(),
    };
    manager.findOne.mockResolvedValue(comment);
    expect(
      await service.update(actor, 3, { rating: 4, description: '' }),
    ).toMatchObject({ code: 'REVIEW_UPDATED' });
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4, description: '' }),
    );
    await expect(
      service.update({ ...actor, id: 2 }, 3, { rating: 1 }),
    ).rejects.toMatchObject({ code: 'REVIEW_NOT_FOUND' });
    manager.findOne.mockResolvedValue({
      ...comment,
      dateCreated: new Date(Date.now() - REVIEW_EDIT_MS - 1000),
    });
    await expect(service.update(actor, 3, { rating: 1 })).rejects.toMatchObject(
      { code: 'REVIEW_EDIT_EXPIRED' },
    );
  });
  it('returns an empty page for a recipient and rejects a nonexistent user', async () => {
    expect(await service.listForUser(1, {})).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    users.exists.mockResolvedValue(false);
    await expect(service.listForUser(99, {})).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
  });
  it('paginates volunteer reviews and reports whether more results exist', async () => {
    volunteers.findOneBy.mockResolvedValue({ id: 4 });
    const row = await comments.findOneOrFail();
    const query = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue(
          Array.from({ length: 11 }, (_, id) => ({ ...row, id })),
        ),
    };
    comments.createQueryBuilder = jest.fn(() => query);
    const result = await service.listForUser(1, {
      page: 2,
      sort: CommentSort.Rating,
    });
    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.orderBy).toHaveBeenCalledWith('c.rating', 'DESC');
  });
});

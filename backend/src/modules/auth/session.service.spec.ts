import type { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { UserSession } from './entities/user-session.entity';
import { SESSION_TTL_MS } from './auth.constants';
import { hashToken } from '../../common/utils/tokens';
import { Role } from '../users/enums/role.enum';

describe('SessionService', () => {
  let repository: any;
  let query: any;
  let service: SessionService;
  beforeEach(() => {
    query = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    repository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => query),
    };
    service = new SessionService(repository as Repository<UserSession>);
  });
  it('stores only a token hash and bounds client metadata', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    const session = await service.create(1, {
      ip: 'a'.repeat(100),
      userAgent: 'b'.repeat(300),
    });
    expect(session.expiresAt.getTime()).toBe(1000 + SESSION_TTL_MS);
    expect(repository.save).toHaveBeenCalledWith({
      userId: 1,
      tokenHash: hashToken(session.token),
      expiresAt: session.expiresAt,
      ip: 'a'.repeat(64),
      userAgent: 'b'.repeat(255),
    });
    await service.create(2);
    expect(repository.save.mock.calls[1][0]).toMatchObject({
      ip: null,
      userAgent: null,
    });
  });
  it('returns a session user without exposing credentials and applies database expiry/revocation predicates', async () => {
    query.getOne.mockResolvedValue({
      id: 'session-id',
      user: {
        id: 1,
        email: 'a@example.test',
        firstName: 'Anna',
        lastName: 'Test',
        role: Role.Volunteer,
        isConfirmedEmail: true,
        password: 'secret',
        blockedUntil: null,
      },
    });
    expect(await service.validate('token')).toEqual({
      id: 1,
      email: 'a@example.test',
      firstName: 'Anna',
      lastName: 'Test',
      role: Role.Volunteer,
      isConfirmedEmail: true,
      sessionId: 'session-id',
    });
    expect(query.where).toHaveBeenCalledWith('session.tokenHash = :hash', {
      hash: hashToken('token'),
    });
    expect(query.andWhere).toHaveBeenCalledWith('session.revokedAt IS NULL');
    expect(query.andWhere).toHaveBeenCalledWith('session.expiresAt > now()');
  });
  it('rejects missing, unverified and blocked users', async () => {
    query.getOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ user: { isConfirmedEmail: false } })
      .mockResolvedValueOnce({
        user: {
          isConfirmedEmail: true,
          blockedUntil: new Date('2100-01-01'),
          blockReason: 'spam',
        },
      });
    expect(await service.validate('missing')).toBeNull();
    expect(await service.validate('unverified')).toBeNull();
    await expect(service.validate('blocked')).rejects.toMatchObject({
      code: 'ACCOUNT_BLOCKED',
    });
  });
  it('revokes individual and all user sessions, and purges expired sessions', async () => {
    await service.revoke('session-id');
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'session-id' },
      { revokedAt: expect.any(Date) },
    );
    await service.revokeAllForUser(7);
    expect(query.where).toHaveBeenCalledWith(
      '"user_id" = :userId AND "revoked_at" IS NULL',
      { userId: 7 },
    );
    await service.purgeExpired();
    expect(repository.delete).toHaveBeenCalledTimes(1);
  });
});

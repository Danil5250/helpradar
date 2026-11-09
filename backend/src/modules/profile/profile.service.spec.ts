import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { PersonInNeed } from '../users/entities/person-in-need.entity';
import { EmailVerificationToken } from '../auth/entities/email-verification-token.entity';
import { hashToken } from '../../common/utils/tokens';
import { ProfileService } from './profile.service';
import { loadAppConfig } from '../../config/app.config';
import { Role } from '../users/enums/role.enum';

describe('ProfileService', () => {
  let users: any;
  let tokens: any;
  let comments: any;
  let storage: any;
  let sanitizer: any;
  let signer: any;
  let service: ProfileService;
  const actor: any = { id: 1, role: Role.PersonInNeed };
  const user: any = {
    id: 1,
    firstName: 'Anna',
    lastName: 'Test',
    email: 'private@example.test',
    phoneNumber: '+380501234567',
    avatarUrl: '/placeholder.svg',
    role: Role.PersonInNeed,
    blockedUntil: null,
    createdAt: new Date('2026-01-01'),
    personInNeed: {
      city: 'Kyiv',
      region: 'Kyiv',
      street: 'Private street',
      aboutMe: 'Hello',
    },
  };
  beforeEach(() => {
    users = {
      findOne: jest.fn().mockResolvedValue(user),
      findOneByOrFail: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    tokens = { findOne: jest.fn().mockResolvedValue(null) };
    comments = { count: jest.fn().mockResolvedValue(3) };
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    sanitizer = {
      sanitizeAvatar: jest
        .fn()
        .mockResolvedValue({ extension: 'png', data: Buffer.from('image') }),
    };
    signer = {
      resolve: jest.fn((key) => key),
      sign: jest.fn((key) => `/api/files/${key}?signed`),
    };
    service = new ProfileService(
      {} as never,
      users,
      tokens,
      comments,
      {} as never,
      storage,
      sanitizer,
      signer,
      loadAppConfig({}),
    );
  });
  it('returns private fields only in the own-profile representation', async () => {
    tokens.findOne.mockResolvedValue({ newEmail: 'pending@example.test' });
    expect(await service.getOwn(1)).toMatchObject({
      email: user.email,
      pendingEmail: 'pending@example.test',
      street: 'Private street',
      rating: null,
      reviewsCount: 0,
    });
    const publicProfile = await service.getPublic(1);
    expect(publicProfile).toMatchObject({
      id: 1,
      name: 'Anna T.',
      city: 'Kyiv',
    });
    for (const field of [
      'email',
      'phoneNumber',
      'street',
      'password',
      'pendingEmail',
    ])
      expect(publicProfile).not.toHaveProperty(field);
  });
  it('includes volunteer rating and review count', async () => {
    users.findOne.mockResolvedValue({
      ...user,
      role: Role.Volunteer,
      personInNeed: undefined,
      volunteer: {
        id: 4,
        city: 'Lviv',
        rating: 4.5,
        description: 'About',
        supports: ['humanitarian'],
      },
    });
    expect(await service.getOwn(1)).toMatchObject({
      city: 'Lviv',
      aboutMe: 'About',
      rating: 4.5,
      reviewsCount: 3,
      supports: ['humanitarian'],
    });
    expect(await service.getPublic(1)).toMatchObject({
      rating: 4.5,
      reviewsCount: 3,
    });
  });
  it('rejects missing profiles, roles without profiles and blocked profiles', async () => {
    users.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...user, role: Role.Administrator })
      .mockResolvedValueOnce({ ...user, blockedUntil: new Date('2100-01-01') });
    await expect(service.getOwn(1)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
    await expect(service.getPublic(1)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
    await expect(service.getPublic(1)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
    await expect(service.getPublic(1)).rejects.toMatchObject({
      code: 'PROFILE_BLOCKED',
    });
  });
  it('stores a sanitized avatar, replaces its previous file and returns a signed URL', async () => {
    const previous = '00000000-0000-4000-8000-000000000000.png';
    users.findOneByOrFail.mockResolvedValue({ ...user, avatarUrl: previous });
    const result = await service.uploadAvatar(actor, {
      buffer: Buffer.from('upload'),
    });
    const key = storage.put.mock.calls[0][0];
    expect(users.update).toHaveBeenCalledWith({ id: 1 }, { avatarUrl: key });
    expect(storage.delete).toHaveBeenCalledWith(previous);
    expect(result.avatarUrl).toBe(`/api/files/${key}?signed`);
  });
  it('cleans up a newly uploaded file if saving the profile fails', async () => {
    users.update.mockRejectedValue(new Error('write failed'));
    await expect(
      service.uploadAvatar(actor, { buffer: Buffer.from('upload') }),
    ).rejects.toThrow('write failed');
    expect(storage.delete).toHaveBeenCalledWith(storage.put.mock.calls[0][0]);
  });
  it('rejects a missing avatar without writing storage', async () => {
    await expect(service.uploadAvatar(actor, undefined)).rejects.toMatchObject({
      code: 'AVATAR_INVALID',
    });
    expect(storage.put).not.toHaveBeenCalled();
  });
  describe('profile persistence and email ownership', () => {
    let manager: any;
    let mail: any;
    let query: any;
    let current: any;
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-09T12:00:00Z'));
      current = { ...user, personInNeed: { ...user.personInNeed } };
      query = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      manager = {
        findOne: jest.fn().mockResolvedValue(current),
        findOneBy: jest.fn().mockResolvedValue(null),
        save: jest.fn(async (...args: any[]) => args.at(-1)),
        exists: jest.fn().mockResolvedValue(false),
        update: jest.fn(),
        createQueryBuilder: jest.fn(() => query),
        create: jest.fn((_type, value) => value),
      };
      mail = {
        enqueue: jest.fn().mockResolvedValue({ id: 'outbox' }),
        deliver: jest.fn().mockResolvedValue(true),
      };
      Object.assign(service, {
        dataSource: { transaction: async (work: any) => work(manager) },
        mail,
      });
      users.findOne.mockResolvedValue(current);
    });
    afterEach(() => jest.useRealTimers());
    it('updates recipient fields while preserving omitted values and clearing empty optional fields', async () => {
      expect(
        await service.update(actor, {
          firstName: 'Alice',
          city: 'Lviv',
          region: '',
          street: '',
          aboutMe: '',
        }),
      ).toMatchObject({ code: 'PROFILE_UPDATED', emailChange: null });
      expect(manager.save).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          firstName: 'Alice',
          lastName: 'Test',
          email: user.email,
        }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        PersonInNeed,
        expect.objectContaining({
          city: 'Lviv',
          region: null,
          street: null,
          aboutMe: '',
        }),
      );
      expect(mail.enqueue).not.toHaveBeenCalled();
    });
    it('updates volunteer supports and description without clearing omitted city', async () => {
      current.volunteer = {
        id: 3,
        city: 'Kyiv',
        region: 'Kyiv',
        description: 'old',
        supports: ['old'],
      };
      delete current.personInNeed;
      await service.update(actor, {
        lastName: 'Updated',
        phoneNumber: '+380501234567',
        aboutMe: 'new',
        supports: [],
      });
      expect(manager.save).toHaveBeenCalledWith(
        Volunteer,
        expect.objectContaining({
          city: 'Kyiv',
          description: 'new',
          supports: [],
        }),
      );
      await service.update(actor, { city: 'Lviv', region: 'Lviv' });
      expect(current.volunteer).toMatchObject({ city: 'Lviv', region: 'Lviv' });
    });
    it('normalizes an unchanged email without issuing a token', async () => {
      await service.update(actor, { email: ' PRIVATE@EXAMPLE.TEST ' });
      expect(manager.create).not.toHaveBeenCalled();
      expect(mail.deliver).not.toHaveBeenCalled();
    });
    it.each([true, false])(
      'keeps the active email while confirmation delivery=%s',
      async (delivered) => {
        mail.deliver.mockResolvedValue(delivered);
        const result = await service.update(actor, {
          email: ' NEW@EXAMPLE.TEST ',
          locale: 'en',
        });
        expect(current.email).toBe(user.email);
        expect(result.emailChange).toMatchObject({
          code: delivered ? 'CHECK_EMAIL' : 'EMAIL_QUEUED',
          emailQueued: !delivered,
        });
        const tokenData = manager.create.mock.calls.find(
          ([type]: any[]) => type === EmailVerificationToken,
        )[1];
        expect(tokenData).toMatchObject({
          userId: 1,
          newEmail: 'new@example.test',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        });
        const message = mail.enqueue.mock.calls[0][1];
        const match = (message.text as string).match(/token=([^\s]+)/);
        expect(match).not.toBeNull();
        expect(hashToken(decodeURIComponent(match![1]))).toBe(
          tokenData.tokenHash,
        );
        expect(query.where).toHaveBeenCalledWith(
          expect.stringContaining('"new_email" IS NOT NULL'),
          { userId: 1 },
        );
        expect(mail.enqueue).toHaveBeenCalledWith(
          manager,
          expect.objectContaining({ to: 'new@example.test' }),
          'email-change',
        );
        expect(mail.deliver).toHaveBeenCalledWith('outbox');
      },
    );
    it('rejects missing users, taken addresses and unique races, preserving unrelated errors', async () => {
      manager.findOne.mockResolvedValueOnce(null);
      await expect(service.update(actor, {})).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
      manager.exists.mockResolvedValue(true);
      await expect(
        service.update(actor, { email: 'taken@example.test' }),
      ).rejects.toMatchObject({ code: 'NEW_EMAIL_TAKEN' });
      manager.save
        .mockRejectedValueOnce({ code: '23505' })
        .mockRejectedValueOnce(new Error('database down'));
      await expect(service.update(actor, {})).rejects.toMatchObject({
        code: 'NEW_EMAIL_TAKEN',
      });
      await expect(service.update(actor, {})).rejects.toThrow('database down');
      expect(mail.enqueue).not.toHaveBeenCalled();
    });
    it('confirms a valid token once under a write lock', async () => {
      const token = {
        userId: 1,
        newEmail: 'new@example.test',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000),
      };
      manager.findOne.mockResolvedValue(token);
      expect(await service.confirmEmailChange('raw-token')).toMatchObject({
        code: 'EMAIL_CHANGED',
      });
      expect(manager.findOne).toHaveBeenCalledWith(
        EmailVerificationToken,
        expect.objectContaining({
          where: expect.objectContaining({ tokenHash: hashToken('raw-token') }),
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(
        User,
        { id: 1 },
        { email: 'new@example.test' },
      );
      await expect(
        service.confirmEmailChange('raw-token'),
      ).rejects.toMatchObject({ code: 'LINK_INVALID' });
      expect(manager.update).toHaveBeenCalledTimes(1);
    });
    it.each([
      null,
      { usedAt: new Date(), expiresAt: new Date('2030-01-01') },
      { usedAt: null, expiresAt: new Date('2026-11-09T12:00:00Z') },
    ])('rejects invalid confirmation tokens (%#)', async (row) => {
      manager.findOne.mockResolvedValue(row);
      await expect(service.confirmEmailChange('bad')).rejects.toMatchObject({
        code: 'LINK_INVALID',
      });
      expect(manager.update).not.toHaveBeenCalled();
    });
    it('handles conflicting owners, unique races and unrelated confirmation failures', async () => {
      manager.findOne.mockResolvedValue({
        userId: 1,
        newEmail: 'new@example.test',
        usedAt: null,
        expiresAt: new Date('2030-01-01'),
      });
      manager.findOneBy.mockResolvedValue({ id: 2 });
      await expect(service.confirmEmailChange('token')).rejects.toMatchObject({
        code: 'NEW_EMAIL_TAKEN',
      });
      manager.findOneBy.mockResolvedValue(null);
      manager.save
        .mockRejectedValueOnce({ code: '23505' })
        .mockRejectedValueOnce(new Error('failed'));
      await expect(service.confirmEmailChange('token')).rejects.toMatchObject({
        code: 'NEW_EMAIL_TAKEN',
      });
      manager.findOne.mockResolvedValue({
        userId: 1,
        newEmail: 'new@example.test',
        usedAt: null,
        expiresAt: new Date('2030-01-01'),
      });
      await expect(service.confirmEmailChange('token')).rejects.toThrow(
        'failed',
      );
    });
  });
});

import { hash, compare } from 'bcryptjs';
import { AuthService } from './auth.service';
import { loadAppConfig } from '../../config/app.config';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { PersonInNeed } from '../users/entities/person-in-need.entity';
import { Role } from '../users/enums/role.enum';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { hashToken } from '../../common/utils/tokens';

describe('AuthService', () => {
  let service: AuthService;
  let manager: any;
  let query: any;
  let users: any;
  let userService: any;
  let sessions: any;
  let mail: any;
  let attempts: any;
  let verification: any;
  let resets: any;
  const user = {
    id: 1,
    firstName: 'Anna',
    lastName: 'Test',
    email: 'anna@example.test',
    role: Role.PersonInNeed,
    isConfirmedEmail: true,
    blockedUntil: null,
  };
  beforeEach(() => {
    query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      getExists: jest.fn().mockResolvedValue(false),
    };
    manager = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((_type, value) => ({ ...value })),
      save: jest.fn(async (value) => ({ id: 1, ...value })),
      createQueryBuilder: jest.fn(() => query),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findOneByOrFail: jest.fn().mockResolvedValue(user),
      update: jest.fn(),
      query: jest.fn(),
      findOneOrFail: jest.fn().mockResolvedValue({
        userId: 1,
        failedCount: 0,
        windowStartedAt: null,
        lockedUntil: null,
      }),
    };
    const dataSource = {
      transaction: async (work: (manager: any) => Promise<any>) =>
        work(manager),
    };
    attempts = {
      findOneBy: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };
    verification = { createQueryBuilder: jest.fn(() => query) };
    resets = { findOneBy: jest.fn() };
    users = {
      findOneBy: jest.fn(),
      findOneByOrFail: jest.fn().mockResolvedValue(user),
    };
    userService = {
      findByEmailWithPassword: jest.fn(),
      toView: jest.fn().mockResolvedValue(user),
    };
    sessions = {
      create: jest.fn().mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date('2100-01-01'),
      }),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    mail = {
      enqueue: jest.fn().mockResolvedValue({ id: 'mail-id' }),
      deliver: jest.fn().mockResolvedValue(true),
    };
    service = new AuthService(
      dataSource as never,
      attempts,
      verification,
      resets,
      users,
      userService,
      sessions,
      mail,
      loadAppConfig({ BCRYPT_ROUNDS: '4' }),
    );
  });
  it.each([Role.PersonInNeed, Role.Volunteer] as const)(
    'registers %s with a hashed password and a role profile',
    async (role) => {
      const result = await service.register({
        firstName: 'Anna',
        lastName: 'Test',
        email: ' ANNA@example.test ',
        password: 'Secret123',
        passwordConfirm: 'Secret123',
        role,
        city: 'Kyiv',
        termsAccepted: true,
        ageConfirmed: true,
      });
      expect(result).toMatchObject({ code: 'CHECK_EMAIL', emailQueued: false });
      const savedUser = manager.create.mock.calls.find(
        ([entity]: any[]) => entity === User,
      )[1];
      expect(savedUser.email).toBe('anna@example.test');
      expect(savedUser.isConfirmedEmail).toBe(false);
      expect(await compare('Secret123', savedUser.password)).toBe(true);
      expect(manager.create).toHaveBeenCalledWith(
        role === Role.Volunteer ? Volunteer : PersonInNeed,
        expect.objectContaining({ userId: 1, city: 'Kyiv' }),
      );
      const tokenRow = manager.create.mock.calls.find(
        ([entity]: any[]) => entity === EmailVerificationToken,
      )[1];
      expect(tokenRow.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(mail.deliver).toHaveBeenCalledWith('mail-id');
    },
  );
  it('rejects existing addresses before sending mail', async () => {
    manager.exists.mockResolvedValue(true);
    await expect(
      service.register({
        firstName: 'Anna',
        lastName: 'Test',
        email: 'anna@example.test',
        password: 'Secret123',
        passwordConfirm: 'Secret123',
        role: Role.Volunteer,
        city: 'Kyiv',
        termsAccepted: true,
        ageConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    expect(mail.enqueue).not.toHaveBeenCalled();
    expect(mail.deliver).not.toHaveBeenCalled();
  });
  it('returns a queued result when activation delivery fails', async () => {
    mail.deliver.mockResolvedValue(false);
    expect(
      await service.register({
        firstName: 'Anna',
        lastName: 'Test',
        email: 'anna@example.test',
        password: 'Secret123',
        passwordConfirm: 'Secret123',
        role: Role.Volunteer,
        city: 'Kyiv',
        termsAccepted: true,
        ageConfirmed: true,
      }),
    ).toMatchObject({ code: 'EMAIL_QUEUED', emailQueued: true });
  });
  it.each([
    null,
    { usedAt: new Date(), expiresAt: new Date('2100-01-01') },
    { usedAt: null, expiresAt: new Date('2000-01-01') },
  ])('rejects missing, used or expired activation links (%#)', async (row) => {
    manager.findOne.mockResolvedValue(row);
    await expect(service.verifyEmail('token', {})).rejects.toMatchObject({
      code: 'LINK_INVALID',
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });
  it('marks an activation token used and starts a session', async () => {
    const row = { userId: 1, usedAt: null, expiresAt: new Date('2100-01-01') };
    manager.findOne.mockResolvedValue(row);
    expect(
      await service.verifyEmail('token', { ip: '127.0.0.1' }),
    ).toMatchObject({ token: 'session-token', user });
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
    expect(manager.update).toHaveBeenCalledWith(
      User,
      { id: 1 },
      { isConfirmedEmail: true },
    );
  });
  it('returns neutral resend responses for unknown, confirmed and recently contacted accounts', async () => {
    users.findOneBy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, isConfirmedEmail: false });
    query.getExists.mockResolvedValue(true);
    const a = await service.resendVerification('unknown@example.test');
    expect(await service.resendVerification(user.email)).toEqual(a);
    expect(await service.resendVerification(user.email)).toEqual(a);
    expect(mail.enqueue).not.toHaveBeenCalled();
  });
  it('resends activation after the cooldown', async () => {
    users.findOneBy.mockResolvedValue({ ...user, isConfirmedEmail: false });
    expect(await service.resendVerification(user.email, 'en')).toMatchObject({
      code: 'CHECK_EMAIL',
    });
    expect(mail.enqueue).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ to: user.email }),
      'activation',
    );
  });
  it('logs in with a correct password and resets failed attempts', async () => {
    userService.findByEmailWithPassword.mockResolvedValue({
      ...user,
      password: await hash('Secret123', 4),
    });
    expect(
      await service.login({ email: user.email, password: 'Secret123' }, {}),
    ).toMatchObject({ token: 'session-token', message: 'Welcome back, Anna!' });
    expect(attempts.update).toHaveBeenCalledWith(
      { userId: 1 },
      { failedCount: 0, windowStartedAt: null, lockedUntil: null },
    );
  });
  it('rejects unknown accounts, wrong passwords and active login locks', async () => {
    userService.findByEmailWithPassword.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: user.email, password: 'Secret123' }, {}),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    userService.findByEmailWithPassword.mockResolvedValue({
      ...user,
      password: await hash('Secret123', 4),
    });
    await expect(
      service.login({ email: user.email, password: 'Wrong123' }, {}),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    attempts.findOneBy.mockResolvedValue({
      lockedUntil: new Date('2100-01-01'),
    });
    await expect(
      service.login({ email: user.email, password: 'Secret123' }, {}),
    ).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
    expect(sessions.create).not.toHaveBeenCalled();
  });
  it('requires email confirmation and rejects a blocked account', async () => {
    const password = await hash('Secret123', 4);
    userService.findByEmailWithPassword
      .mockResolvedValueOnce({ ...user, password, isConfirmedEmail: false })
      .mockResolvedValueOnce({
        ...user,
        password,
        blockedUntil: new Date('2100-01-01'),
        blockReason: 'spam',
      });
    await expect(
      service.login({ email: user.email, password: 'Secret123' }, {}),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    await expect(
      service.login({ email: user.email, password: 'Secret123' }, {}),
    ).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' });
  });
  it('keeps recovery responses neutral and respects the resend cooldown', async () => {
    users.findOneBy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user);
    const neutral = await service.forgotPassword('missing@example.test');
    query.getExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await service.forgotPassword(user.email)).toEqual(neutral);
    expect(mail.enqueue).not.toHaveBeenCalled();
    expect(await service.forgotPassword(user.email, 'en')).toEqual(neutral);
    expect(manager.create).toHaveBeenCalledWith(
      PasswordResetToken,
      expect.objectContaining({ userId: 1, tokenHash: expect.any(String) }),
    );
    expect(mail.deliver).toHaveBeenCalledWith('mail-id');
  });
  it('validates reset links and revokes every session after changing the password', async () => {
    const row = { userId: 1, usedAt: null, expiresAt: new Date('2100-01-01') };
    resets.findOneBy.mockResolvedValue(row);
    manager.findOne.mockResolvedValue(row);
    expect(await service.checkResetToken('token')).toMatchObject({
      code: 'RESET_LINK_VALID',
    });
    expect(resets.findOneBy).toHaveBeenCalledWith({
      tokenHash: hashToken('token'),
    });
    expect(await service.resetPassword('token', 'NewSecret123')).toMatchObject({
      code: 'PASSWORD_CHANGED',
    });
    expect(
      await compare('NewSecret123', manager.update.mock.calls[0][2].password),
    ).toBe(true);
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(1);
    expect(row.usedAt).toBeInstanceOf(Date);
    await expect(service.checkResetToken('token')).rejects.toMatchObject({
      code: 'RESET_LINK_INVALID',
    });
  });
  it('rejects invalid reset links before changing credentials', async () => {
    resets.findOneBy.mockResolvedValue(null);
    manager.findOne.mockResolvedValue(null);
    await expect(service.checkResetToken('bad')).rejects.toMatchObject({
      code: 'RESET_LINK_INVALID',
    });
    await expect(
      service.resetPassword('bad', 'NewSecret123'),
    ).rejects.toMatchObject({ code: 'RESET_LINK_INVALID' });
    expect(manager.update).not.toHaveBeenCalled();
  });
});

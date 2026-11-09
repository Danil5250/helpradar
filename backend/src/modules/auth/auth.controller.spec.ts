import { AuthController } from './auth.controller';
import { SESSION_COOKIE } from './auth.constants';
import { loadAppConfig } from '../../config/app.config';

describe('AuthController session contract', () => {
  const result = {
    user: { id: 1 },
    token: 'secret',
    expiresAt: new Date('2030-01-01'),
    message: 'Welcome',
  };
  let auth: any;
  let res: any;
  let controller: AuthController;
  beforeEach(() => {
    auth = {
      login: jest.fn().mockResolvedValue(result),
      verifyEmail: jest.fn().mockResolvedValue(result),
      logout: jest.fn(),
      resetPassword: jest.fn().mockResolvedValue({ code: 'PASSWORD_CHANGED' }),
      me: jest.fn().mockResolvedValue(result.user),
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    controller = new AuthController(auth, loadAppConfig({}));
  });
  it.each([false, true])(
    'sets secure=%s with matching session expiry',
    async (isProduction) => {
      controller = new AuthController(auth, {
        ...loadAppConfig({}),
        isProduction,
      });
      const dto = { email: 'user@example.test', password: 'Secret123' };
      expect(
        await controller.login(
          dto,
          { ip: '127.0.0.1', get: () => 'agent' } as never,
          res,
        ),
      ).toEqual({ ...result, expiresAt: result.expiresAt.toISOString() });
      expect(auth.login).toHaveBeenCalledWith(dto, {
        ip: '127.0.0.1',
        userAgent: 'agent',
      });
      expect(res.cookie).toHaveBeenCalledWith(SESSION_COOKIE, 'secret', {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
        expires: result.expiresAt,
      });
    },
  );
  it('starts a session after verification with absent request metadata', async () => {
    expect(
      await controller.verifyEmail(
        { token: 'activation' },
        { get: () => undefined } as never,
        res,
      ),
    ).toEqual({
      user: result.user,
      token: 'secret',
      expiresAt: result.expiresAt.toISOString(),
    });
    expect(auth.verifyEmail).toHaveBeenCalledWith('activation', {
      ip: null,
      userAgent: null,
    });
    expect(res.cookie).toHaveBeenCalledTimes(1);
  });
  it.each(['login', 'verifyEmail'] as const)(
    'does not set cookies after failed %s',
    async (method) => {
      auth[method].mockRejectedValue(new Error('denied'));
      await expect(
        controller[method](
          { token: 'x', email: 'a', password: 'b' } as never,
          { get: () => undefined } as never,
          res,
        ),
      ).rejects.toThrow('denied');
      expect(res.cookie).not.toHaveBeenCalled();
    },
  );
  it('revokes the current session and clears its cookie', async () => {
    expect(
      await controller.logout({ sessionId: 'session-id' } as never, res),
    ).toMatchObject({ code: 'LOGGED_OUT' });
    expect(auth.logout).toHaveBeenCalledWith('session-id');
    expect(res.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  });
  it('clears the cookie only after a successful password reset', async () => {
    const dto = {
      token: 'reset',
      password: 'Secret123',
      passwordConfirm: 'Secret123',
    };
    expect(await controller.resetPassword(dto, res)).toEqual({
      code: 'PASSWORD_CHANGED',
    });
    expect(auth.resetPassword).toHaveBeenCalledWith('reset', 'Secret123');
    res.clearCookie.mockClear();
    auth.resetPassword.mockRejectedValue(new Error('expired'));
    await expect(controller.resetPassword(dto, res)).rejects.toThrow('expired');
    expect(res.clearCookie).not.toHaveBeenCalled();
  });
  it('returns null for guests and loads the authenticated account', async () => {
    expect(await controller.me({} as never)).toEqual({ user: null });
    expect(auth.me).not.toHaveBeenCalled();
    expect(await controller.me({ user: { id: 1 } } as never)).toEqual({
      user: result.user,
    });
    expect(auth.me).toHaveBeenCalledWith(1);
  });
});

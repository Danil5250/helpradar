import {
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppException } from './errors';
import { createOriginCheck } from './origin-check.middleware';
import { RateLimiterService } from './rate-limiter.service';
import { loadAppConfig } from '../config/app.config';
import {
  SessionAuthGuard,
  OptionalSessionGuard,
  extractToken,
} from '../modules/auth/guards/session-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { IpRateLimitGuard } from '../modules/auth/guards/ip-rate-limit.guard';
import { SessionService } from '../modules/auth/session.service';
import { Role } from '../modules/users/enums/role.enum';
import type { AuthenticatedRequest } from '../modules/auth/auth-user';

const context = (request: object, response: object = {}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => Object,
    getClass: () => Object,
  }) as unknown as ExecutionContext;

describe('Exception responses', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  it.each([
    [new AppException('UNAUTHORIZED'), 401, 'UNAUTHORIZED'],
    [new HttpException('private internal message', 400), 400, 'BAD_REQUEST'],
    [new HttpException('private internal message', 503), 503, 'INTERNAL_ERROR'],
    [{ status: 413 }, 413, 'PAYLOAD_TOO_LARGE'],
    [{ statusCode: 429 }, 429, 'RATE_LIMITED'],
    [new Error('secret connection string'), 500, 'INTERNAL_ERROR'],
    ['unexpected string', 500, 'INTERNAL_ERROR'],
    [null, 500, 'INTERNAL_ERROR'],
    [new AppException('GEOCODER_UNAVAILABLE'), 503, 'GEOCODER_UNAVAILABLE'],
  ])(
    'normalizes errors without leaking internals (%#)',
    (error, status, code) => {
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      new AllExceptionsFilter().catch(
        error,
        context(
          { method: 'GET', originalUrl: '/api/test' },
          res,
        ) as ArgumentsHost,
      );
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: status, code }),
      );
      expect(JSON.stringify(res.json.mock.calls)).not.toContain(
        'secret connection string',
      );
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    },
  );
  it('does not write after headers have been sent', () => {
    const res = { headersSent: true, status: jest.fn() };
    new AllExceptionsFilter().catch(new Error('late'), context({}, res));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('Origin middleware', () => {
  it.each([
    [{ method: 'GET', headers: {}, cookies: { hr_session: 'token' } }, true],
    [
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        cookies: {},
      },
      true,
    ],
    [{ method: 'POST', headers: {}, cookies: {} }, true],
    [
      {
        method: 'POST',
        headers: { origin: 'https://app.test' },
        cookies: { hr_session: 'token' },
      },
      true,
    ],
    [
      {
        method: 'POST',
        headers: { referer: 'https://app.test/path' },
        cookies: { hr_session: 'token' },
      },
      true,
    ],
    [
      {
        method: 'POST',
        headers: { referer: 'not a url' },
        cookies: { hr_session: 'token' },
      },
      false,
    ],
    [
      {
        method: 'POST',
        headers: { origin: 'https://evil.test' },
        cookies: { hr_session: 'token' },
      },
      false,
    ],
  ])(
    'checks origin or referer for cookie-authenticated mutations (%#)',
    (req, allowed) => {
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      createOriginCheck(['https://app.test/'])(
        req as Request,
        res as unknown as Response,
        next,
      );
      expect(next).toHaveBeenCalledTimes(allowed ? 1 : 0);
      expect(res.status).toHaveBeenCalledTimes(allowed ? 0 : 1);
    },
  );
});

describe('Authentication and authorization guards', () => {
  let limiter: RateLimiterService;
  const config = loadAppConfig({
    RATE_LIMIT_PER_MINUTE: '1',
    AUTH_RATE_LIMIT_PER_MINUTE: '1',
  });
  beforeEach(() => {
    limiter = new RateLimiterService();
  });
  afterEach(() => limiter.onModuleDestroy());
  it('prefers bearer tokens over cookies, ignores invalid token values', () => {
    expect(
      extractToken({
        headers: { authorization: 'bEaReR header' },
        cookies: { hr_session: 'cookie' },
      } as unknown as AuthenticatedRequest),
    ).toBe('header');
    expect(
      extractToken({
        headers: { authorization: 'Bearer ' },
        cookies: { hr_session: 'cookie' },
      } as unknown as AuthenticatedRequest),
    ).toBeNull();
    expect(
      extractToken({
        headers: {},
        cookies: { hr_session: 123 },
      } as unknown as AuthenticatedRequest),
    ).toBeNull();
  });
  it('assigns validated users and enforces per-account limits', async () => {
    const sessions = {
      validate: jest.fn().mockResolvedValue({ id: 1, role: Role.Volunteer }),
    };
    const guard = new SessionAuthGuard(
      sessions as unknown as SessionService,
      limiter,
      config,
    );
    const req: any = { headers: { authorization: 'Bearer valid' } };
    expect(await guard.canActivate(context(req))).toBe(true);
    expect(req.user.id).toBe(1);
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    sessions.validate.mockRejectedValue(new AppException('ACCOUNT_BLOCKED'));
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({
      code: 'ACCOUNT_BLOCKED',
    });
    const optional = new OptionalSessionGuard(
      sessions as unknown as SessionService,
      limiter,
      config,
    );
    expect(await optional.canActivate(context(req))).toBe(true);
    expect(await optional.canActivate(context({ headers: {} }))).toBe(true);
  });
  it('checks route roles and per-route IP quotas', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.Volunteer]),
    };
    const roles = new RolesGuard(reflector as unknown as Reflector);
    expect(() => roles.canActivate(context({}))).toThrow();
    expect(() =>
      roles.canActivate(context({ user: { role: Role.PersonInNeed } })),
    ).toThrow();
    expect(roles.canActivate(context({ user: { role: Role.Volunteer } }))).toBe(
      true,
    );
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(roles.canActivate(context({}))).toBe(true);
    const ip = new IpRateLimitGuard(
      limiter,
      reflector as unknown as Reflector,
      config,
    );
    const req = { method: 'POST', ip: '127.0.0.1', path: '/login' };
    expect(ip.canActivate(context(req))).toBe(true);
    expect(() => ip.canActivate(context(req))).toThrow();
    expect(
      ip.canActivate(context({ ...req, route: { path: '/register' } })),
    ).toBe(true);
  });
});

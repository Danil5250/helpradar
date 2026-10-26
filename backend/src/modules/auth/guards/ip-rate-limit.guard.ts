import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppException } from '../../../common/errors';
import { RateLimiterService } from '../../../common/rate-limiter.service';
import appConfig from '../../../config/app.config';

const IP_RATE_LIMIT_KEY = 'ip-rate-limit';

/** Overrides the per-minute limit of a route; without a value the "auth" limit (10 per minute per IP) applies. */
export const IpRateLimit = (limitPerMinute?: number) =>
  SetMetadata(IP_RATE_LIMIT_KEY, limitPerMinute ?? null);

/**
 * Limits requests per client IP address and route (SRS 3.5.4: no more than 10 login attempts per
 * minute from one IP address). Used for login, registration, activation and similar endpoints.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly reflector: Reflector,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const override = this.reflector.getAllAndOverride<number | null>(
      IP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    const limit = override ?? this.config.rateLimit.authIpPerMinute;
    const route = `${req.method}:${req.route?.path ?? req.path}`;
    const retryAfter = this.limiter.hit(`ip:${req.ip}:${route}`, limit);
    if (retryAfter > 0)
      throw new AppException('RATE_LIMITED', { retryAfterSeconds: retryAfter });
    return true;
  }
}

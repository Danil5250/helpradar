import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AppException } from '../../../common/errors';
import { RateLimiterService } from '../../../common/rate-limiter.service';
import appConfig from '../../../config/app.config';
import { AuthenticatedRequest } from '../auth-user';
import { SESSION_COOKIE } from '../auth.constants';
import { SessionService } from '../session.service';

export function extractToken(req: AuthenticatedRequest): string | null {
  const header = req.headers.authorization;
  if (header?.toLowerCase().startsWith('bearer '))
    return header.slice(7).trim() || null;
  const cookie = req.cookies?.[SESSION_COOKIE];
  return typeof cookie === 'string' && cookie ? cookie : null;
}

/**
 * Requires a valid session (cookie or `Authorization: Bearer`). Every authenticated request also
 * counts against the per-account limit of 100 requests per minute (SRS 3.5.4).
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  protected readonly optional: boolean = false;

  constructor(
    protected readonly sessions: SessionService,
    protected readonly limiter: RateLimiterService,
    @Inject(appConfig.KEY)
    protected readonly config: ConfigType<typeof appConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractToken(req);

    let user = null;
    if (token) {
      try {
        user = await this.sessions.validate(token);
      } catch (error) {
        if (!this.optional) throw error;
      }
    }
    if (!user) {
      if (this.optional) return true;
      throw new AppException('UNAUTHORIZED');
    }

    const retryAfter = this.limiter.hit(
      `account:${user.id}`,
      this.config.rateLimit.accountPerMinute,
    );
    if (retryAfter > 0)
      throw new AppException('RATE_LIMITED', { retryAfterSeconds: retryAfter });

    req.user = user;
    return true;
  }
}

/** Resolves the user when a valid session is present but never rejects anonymous visitors (guests). */
@Injectable()
export class OptionalSessionGuard extends SessionAuthGuard {
  protected readonly optional: boolean = true;
}

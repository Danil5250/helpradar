import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { generateToken, hashToken } from '../../common/utils/tokens';
import { blockedException, isBlocked } from '../users/users.service';
import { AuthUser } from './auth-user';
import { SESSION_TTL_MS } from './auth.constants';
import { UserSession } from './entities/user-session.entity';

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

/** Server side sessions: an opaque token valid for 24 hours that is invalidated on logout (SRS 3.2.2.3). */
@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private readonly sessions: Repository<UserSession>,
  ) {}

  async create(
    userId: number,
    meta: SessionMeta = {},
  ): Promise<CreatedSession> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.save(
      this.sessions.create({
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ip: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
      }),
    );
    return { token, expiresAt };
  }

  /**
   * Resolves the user of a valid session. Returns null for unknown, expired or revoked tokens and
   * throws ACCOUNT_BLOCKED when the administrator has blocked the account in the meantime.
   */
  async validate(token: string): Promise<AuthUser | null> {
    const session = await this.sessions
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.user', 'user')
      .where('session.tokenHash = :hash', { hash: hashToken(token) })
      .andWhere('session.revokedAt IS NULL')
      .andWhere('session.expiresAt > now()')
      .getOne();
    if (!session || !session.user.isConfirmedEmail) return null;
    const { user } = session;
    if (isBlocked(user)) throw blockedException(user);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isConfirmedEmail: user.isConfirmedEmail,
      sessionId: session.id,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessions.update({ id: sessionId }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('"user_id" = :userId AND "revoked_at" IS NULL', { userId })
      .execute();
  }

  async purgeExpired(): Promise<void> {
    await this.sessions.delete({
      expiresAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    });
  }
}

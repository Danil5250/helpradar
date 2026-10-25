import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppException } from '../../common/errors';
import { generateToken, hashToken } from '../../common/utils/tokens';
import appConfig from '../../config/app.config';
import { MailService } from '../email/mail.service';
import { activationEmail, MailLocale } from '../email/mail.templates';
import { PersonInNeed } from '../users/entities/person-in-need.entity';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { Role } from '../users/enums/role.enum';
import { UserView } from '../users/user.view';
import {
  blockedException,
  isBlocked,
  normalizeEmail,
  UsersService,
} from '../users/users.service';
import {
  LOGIN_LOCK_MS,
  LOGIN_WINDOW_MS,
  MAX_FAILED_LOGINS,
  RESEND_COOLDOWN_MS,
  UNVERIFIED_ACCOUNT_TTL_MS,
  VERIFICATION_TTL_MS,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { SessionMeta, SessionService } from './session.service';

export interface AuthResult {
  user: UserView;
  token: string;
  expiresAt: Date;
}

export interface EmailSentResult {
  /** CHECK_EMAIL: "Check your email – we have sent you an activation link."; EMAIL_QUEUED: delivery is delayed. */
  code: 'CHECK_EMAIL' | 'EMAIL_QUEUED';
  message: string;
  emailQueued: boolean;
}

const CHECK_EMAIL_MESSAGE =
  'Check your email – we have sent you an activation link.';
const EMAIL_QUEUED_MESSAGE = 'The email will arrive within a few minutes.';

const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string })?.code === '23505';

@Injectable()
export class AuthService {
  /** Used to spend the same time on unknown e-mail addresses, so response time does not reveal accounts. */
  private readonly dummyHash: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(LoginAttempt)
    private readonly loginAttempts: Repository<LoginAttempt>,
    @InjectRepository(EmailVerificationToken)
    private readonly verificationTokens: Repository<EmailVerificationToken>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly usersService: UsersService,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.dummyHash = bcrypt.hashSync(
      'not-a-real-password-1',
      this.config.bcryptRounds,
    );
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.1 Registration with role selection
  // ---------------------------------------------------------------------------------------------

  async register(dto: RegisterDto): Promise<EmailSentResult> {
    const email = normalizeEmail(dto.email);
    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.bcryptRounds,
    );
    const locale: MailLocale = dto.locale ?? 'uk';

    let outboxId: string;
    try {
      outboxId = await this.dataSource.transaction(async (manager) => {
        if (await manager.exists(User, { where: { email } }))
          throw new AppException('EMAIL_TAKEN');

        const user = await manager.save(
          manager.create(User, {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email,
            password: passwordHash,
            phoneNumber: dto.phoneNumber ?? null,
            role: dto.role,
            isConfirmedEmail: false,
          }),
        );
        if (dto.role === Role.Volunteer) {
          await manager.save(
            manager.create(Volunteer, {
              userId: user.id,
              city: dto.city,
              region: dto.region ?? null,
            }),
          );
        } else {
          await manager.save(
            manager.create(PersonInNeed, {
              userId: user.id,
              city: dto.city,
              region: dto.region ?? null,
            }),
          );
        }

        const token = await this.issueVerificationToken(manager, user.id);
        const message = activationEmail(
          locale,
          user.firstName,
          this.activationUrl(token),
        );
        const row = await this.mail.enqueue(
          manager,
          { to: email, ...message },
          'activation',
        );
        return row.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppException('EMAIL_TAKEN');
      throw error;
    }

    return this.emailResult(await this.mail.deliver(outboxId));
  }

  /** Opens the activation link: marks the account as Active and signs the user in (SRS 3.2.1.3 step 8). */
  async verifyEmail(token: string, meta: SessionMeta): Promise<AuthResult> {
    const user = await this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(EmailVerificationToken, {
        where: { tokenHash: hashToken(token) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now())
        throw new AppException('LINK_INVALID');
      row.usedAt = new Date();
      await manager.save(row);
      await manager.update(
        User,
        { id: row.userId },
        { isConfirmedEmail: true },
      );
      return manager.findOneByOrFail(User, { id: row.userId });
    });
    if (isBlocked(user)) throw blockedException(user);
    return this.startSession(user, meta);
  }

  /**
   * "Resend email". The answer is always the same, so the endpoint cannot be used to find out which
   * addresses are registered; messages are only sent for existing unverified accounts and not more
   * often than once per minute.
   */
  async resendVerification(
    rawEmail: string,
    locale: MailLocale = 'uk',
  ): Promise<EmailSentResult> {
    const email = normalizeEmail(rawEmail);
    const user = await this.users.findOneBy({ email });
    if (!user || user.isConfirmedEmail) return this.emailResult(true);

    const recent = await this.verificationTokens
      .createQueryBuilder('token')
      .where('token.userId = :userId AND token.createdAt > :since', {
        userId: user.id,
        since: new Date(Date.now() - RESEND_COOLDOWN_MS),
      })
      .getExists();
    if (recent) return this.emailResult(true);

    const outboxId = await this.dataSource.transaction(async (manager) => {
      const token = await this.issueVerificationToken(manager, user.id);
      const message = activationEmail(
        locale,
        user.firstName,
        this.activationUrl(token),
      );
      return (
        await this.mail.enqueue(
          manager,
          { to: email, ...message },
          'activation',
        )
      ).id;
    });
    return this.emailResult(await this.mail.deliver(outboxId));
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.2 Login and logout
  // ---------------------------------------------------------------------------------------------

  async login(
    dto: LoginDto,
    meta: SessionMeta,
  ): Promise<AuthResult & { message: string }> {
    const email = normalizeEmail(dto.email);
    // very long passwords cannot be valid (max 64) and would only waste CPU time in bcrypt
    const password = dto.password.length <= 64 ? dto.password : '';

    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      await bcrypt.compare(password, this.dummyHash);
      throw new AppException('INVALID_CREDENTIALS');
    }

    const lockedUntil = await this.currentLock(user.id);
    if (lockedUntil) throw this.tooManyAttempts(lockedUntil);

    if (!password || !(await bcrypt.compare(password, user.password))) {
      const newLock = await this.registerFailedAttempt(user.id);
      if (newLock) throw this.tooManyAttempts(newLock);
      throw new AppException('INVALID_CREDENTIALS');
    }
    await this.resetFailedAttempts(user.id);

    if (!user.isConfirmedEmail)
      throw new AppException('EMAIL_NOT_VERIFIED', { email: user.email });
    if (isBlocked(user)) throw blockedException(user);

    const result = await this.startSession(user, meta);
    return { ...result, message: `Welcome back, ${user.firstName}!` };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
  }

  async me(userId: number): Promise<UserView> {
    const user = await this.users.findOneByOrFail({ id: userId });
    return this.usersService.toView(user);
  }

  // ---------------------------------------------------------------------------------------------
  // Scheduled clean-up
  // ---------------------------------------------------------------------------------------------

  /** SRS 3.2.1.3 step 9: accounts that are not verified within 7 days are deleted automatically. */
  async purgeUnverifiedAccounts(now = new Date()): Promise<number> {
    const result = await this.users
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('"is_confirmed_email" = false AND "created_at" < :limit', {
        limit: new Date(now.getTime() - UNVERIFIED_ACCOUNT_TTL_MS),
      })
      .execute();
    return result.affected ?? 0;
  }

  async purgeExpiredTokens(): Promise<void> {
    await this.verificationTokens
      .createQueryBuilder()
      .delete()
      .where('"expires_at" < :limit', {
        limit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      })
      .execute();
    await this.sessions.purgeExpired();
  }

  // ---------------------------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------------------------

  private async startSession(
    user: User,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    const session = await this.sessions.create(user.id, meta);
    return {
      user: await this.usersService.toView(user),
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  private activationUrl(token: string): string {
    return `${this.config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  }

  private emailResult(delivered: boolean): EmailSentResult {
    return delivered
      ? {
          code: 'CHECK_EMAIL',
          message: CHECK_EMAIL_MESSAGE,
          emailQueued: false,
        }
      : {
          code: 'EMAIL_QUEUED',
          message: EMAIL_QUEUED_MESSAGE,
          emailQueued: true,
        };
  }

  /** Creates a new 24 hour token and invalidates older unused ones, so only the latest link works. */
  private async issueVerificationToken(
    manager: EntityManager,
    userId: number,
  ): Promise<string> {
    await manager
      .createQueryBuilder()
      .update(EmailVerificationToken)
      .set({ usedAt: new Date() })
      .where('"user_id" = :userId AND "used_at" IS NULL', { userId })
      .execute();
    const token = generateToken();
    await manager.save(
      manager.create(EmailVerificationToken, {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      }),
    );
    return token;
  }

  private async currentLock(userId: number): Promise<Date | null> {
    const state = await this.loginAttempts.findOneBy({ userId });
    return state?.lockedUntil && state.lockedUntil.getTime() > Date.now()
      ? state.lockedUntil
      : null;
  }

  /** Counts a failed attempt; returns the lock end when this attempt locked the account. */
  private async registerFailedAttempt(userId: number): Promise<Date | null> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO "login_attempts" ("user_id", "failed_count") VALUES ($1, 0) ON CONFLICT ("user_id") DO NOTHING`,
        [userId],
      );
      const state = await manager.findOneOrFail(LoginAttempt, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      const now = Date.now();
      if (state.lockedUntil && state.lockedUntil.getTime() > now)
        return state.lockedUntil;

      if (
        !state.windowStartedAt ||
        now - state.windowStartedAt.getTime() > LOGIN_WINDOW_MS
      ) {
        state.windowStartedAt = new Date(now);
        state.failedCount = 0;
      }
      state.failedCount += 1;

      let lockedUntil: Date | null = null;
      if (state.failedCount >= MAX_FAILED_LOGINS) {
        lockedUntil = new Date(now + LOGIN_LOCK_MS);
        state.lockedUntil = lockedUntil;
        state.failedCount = 0;
        state.windowStartedAt = null;
      }
      await manager.save(state);
      return lockedUntil;
    });
  }

  private async resetFailedAttempts(userId: number): Promise<void> {
    await this.loginAttempts.update(
      { userId },
      { failedCount: 0, windowStartedAt: null, lockedUntil: null },
    );
  }

  private tooManyAttempts(lockedUntil: Date): AppException {
    return new AppException('TOO_MANY_ATTEMPTS', {
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
      ),
    });
  }
}

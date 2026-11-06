import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { MessageResponseDto } from '../../common/dto/message.response.dto';
import { AppException } from '../../common/errors';
import { generateToken, hashToken } from '../../common/utils/tokens';
import appConfig from '../../config/app.config';
import type { AuthUser } from '../auth/auth-user';
import { VERIFICATION_TTL_MS } from '../auth/auth.constants';
import { EmailSentResponseDto } from '../auth/dto/email-sent.response.dto';
import { EmailVerificationToken } from '../auth/entities/email-verification-token.entity';
import { Comment } from '../comments/entities/comment.entity';
import { MailService } from '../email/mail.service';
import { emailChangeEmail, MailLocale } from '../email/mail.templates';
import { FileStorage, STORAGE_KEY_REGEX } from '../storage/file-storage';
import { ImageSanitizerService } from '../storage/image-sanitizer.service';
import { SignedUrlService } from '../storage/signed-url.service';
import { PersonInNeed } from '../users/entities/person-in-need.entity';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { Role } from '../users/enums/role.enum';
import { isBlocked, normalizeEmail } from '../users/users.service';
import { ProfileUpdatedResponseDto } from './dto/profile-updated.response.dto';
import { ProfileResponseDto } from './dto/profile.response.dto';
import { PublicProfileResponseDto } from './dto/public-profile.response.dto';
import { UpdateProfileRequestDto } from './dto/update-profile.request.dto';
import { UploadAvatarResponseDto } from './dto/upload-avatar.response.dto';

/** Roles that have a profile (guests and administrators have none). */
const PROFILE_ROLES: ReadonlyArray<Role> = [Role.Volunteer, Role.PersonInNeed];

const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string })?.code === '23505';

@Injectable()
export class ProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private readonly tokens: Repository<EmailVerificationToken>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    private readonly mail: MailService,
    private readonly storage: FileStorage,
    private readonly sanitizer: ImageSanitizerService,
    private readonly signer: SignedUrlService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // 3.2.12 Own profile
  // ---------------------------------------------------------------------------------------------

  async getOwn(userId: number): Promise<ProfileResponseDto> {
    const user = await this.loadUser(userId);
    if (!user) throw new AppException('USER_NOT_FOUND');

    const pending = await this.tokens.findOne({
      where: {
        userId,
        newEmail: Not(IsNull()),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
    const { volunteer, personInNeed } = user;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      pendingEmail: pending?.newEmail ?? null,
      role: user.role,
      phoneNumber: user.phoneNumber,
      avatarUrl: this.signer.resolve(user.avatarUrl),
      city: volunteer?.city ?? personInNeed?.city ?? null,
      region: volunteer?.region ?? personInNeed?.region ?? null,
      street: personInNeed?.street ?? null,
      aboutMe: volunteer?.description ?? personInNeed?.aboutMe ?? '',
      supports: volunteer?.supports ?? [],
      rating: volunteer ? volunteer.rating : null,
      reviewsCount: await this.reviewsCount(volunteer),
      createdAt: user.createdAt.toISOString(),
    };
  }

  /** SRS 3.2.12.3: saves the changed fields; a new e-mail only becomes active after confirmation. */
  async update(
    authUser: AuthUser,
    dto: UpdateProfileRequestDto,
  ): Promise<ProfileUpdatedResponseDto> {
    const newEmail =
      dto.email !== undefined ? normalizeEmail(dto.email) : undefined;
    const locale: MailLocale = dto.locale ?? 'uk';

    let outboxId: string | null = null;
    try {
      outboxId = await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(User, {
          where: { id: authUser.id },
          relations: { volunteer: true, personInNeed: true },
        });
        if (!user) throw new AppException('USER_NOT_FOUND');

        if (dto.firstName !== undefined) user.firstName = dto.firstName;
        if (dto.lastName !== undefined) user.lastName = dto.lastName;
        if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
        await manager.save(User, user);

        if (user.volunteer)
          await this.updateVolunteer(manager, user.volunteer, dto);
        if (user.personInNeed)
          await this.updatePersonInNeed(manager, user.personInNeed, dto);

        if (newEmail === undefined || newEmail === user.email) return null;
        if (await manager.exists(User, { where: { email: newEmail } }))
          throw new AppException('NEW_EMAIL_TAKEN');
        const token = await this.issueEmailChangeToken(
          manager,
          user.id,
          newEmail,
        );
        const message = emailChangeEmail(
          locale,
          user.firstName,
          `${this.config.appUrl}/confirm-email?token=${encodeURIComponent(token)}`,
        );
        const row = await this.mail.enqueue(
          manager,
          { to: newEmail, ...message },
          'email-change',
        );
        return row.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppException('NEW_EMAIL_TAKEN');
      throw error;
    }

    const emailChange = outboxId
      ? this.emailResult(await this.mail.deliver(outboxId))
      : null;
    return {
      code: 'PROFILE_UPDATED',
      message: 'Profile updated.',
      profile: await this.getOwn(authUser.id),
      emailChange,
    };
  }

  /** SRS 3.2.12.3 step 5: the new address becomes active once the link from the e-mail is opened. */
  async confirmEmailChange(token: string): Promise<MessageResponseDto> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const row = await manager.findOne(EmailVerificationToken, {
          where: { tokenHash: hashToken(token), newEmail: Not(IsNull()) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now())
          throw new AppException('LINK_INVALID');
        const email = row.newEmail as string;
        const owner = await manager.findOneBy(User, { email });
        if (owner && owner.id !== row.userId)
          throw new AppException('NEW_EMAIL_TAKEN');

        row.usedAt = new Date();
        await manager.save(row);
        await manager.update(User, { id: row.userId }, { email });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppException('NEW_EMAIL_TAKEN');
      throw error;
    }
    return { code: 'EMAIL_CHANGED', message: 'Your email has been changed.' };
  }

  /** SRS 3.2.12.3 step 4: the avatar is resized to 256×256 px and its EXIF metadata is removed. */
  async uploadAvatar(
    authUser: AuthUser,
    file: Pick<Express.Multer.File, 'buffer'> | undefined,
  ): Promise<UploadAvatarResponseDto> {
    if (!file?.buffer) throw new AppException('AVATAR_INVALID');
    const image = await this.sanitizer.sanitizeAvatar(file.buffer);
    const key = `${randomUUID()}.${image.extension}`;
    await this.storage.put(key, image.data);

    let previous: string;
    try {
      const user = await this.users.findOneByOrFail({ id: authUser.id });
      previous = user.avatarUrl;
      await this.users.update({ id: user.id }, { avatarUrl: key });
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }
    if (STORAGE_KEY_REGEX.test(previous))
      await this.storage.delete(previous).catch(() => undefined);

    return {
      code: 'PROFILE_UPDATED',
      message: 'Profile updated.',
      avatarUrl: this.signer.sign(key),
    };
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.15 Public profile
  // ---------------------------------------------------------------------------------------------

  async getPublic(id: number): Promise<PublicProfileResponseDto> {
    const user = await this.loadUser(id);
    if (!user || !PROFILE_ROLES.includes(user.role))
      throw new AppException('USER_NOT_FOUND');
    if (isBlocked(user)) throw new AppException('PROFILE_BLOCKED');

    const { volunteer, personInNeed } = user;
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName.charAt(0)}.`,
      avatarUrl: this.signer.resolve(user.avatarUrl),
      city: volunteer?.city ?? personInNeed?.city ?? null,
      role: user.role,
      rating: volunteer ? volunteer.rating : null,
      reviewsCount: await this.reviewsCount(volunteer),
      registeredAt: user.createdAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  private loadUser(id: number): Promise<User | null> {
    return this.users.findOne({
      where: { id },
      relations: { volunteer: true, personInNeed: true },
    });
  }

  private reviewsCount(volunteer: Volunteer | undefined): Promise<number> {
    return volunteer
      ? this.comments.count({ where: { volunteerId: volunteer.id } })
      : Promise.resolve(0);
  }

  private async updateVolunteer(
    manager: EntityManager,
    volunteer: Volunteer,
    dto: UpdateProfileRequestDto,
  ): Promise<void> {
    if (dto.city !== undefined) {
      volunteer.city = dto.city;
      volunteer.region = dto.region || null;
    }
    if (dto.aboutMe !== undefined) volunteer.description = dto.aboutMe;
    if (dto.supports !== undefined) volunteer.supports = dto.supports;
    await manager.save(Volunteer, volunteer);
  }

  private async updatePersonInNeed(
    manager: EntityManager,
    profile: PersonInNeed,
    dto: UpdateProfileRequestDto,
  ): Promise<void> {
    if (dto.city !== undefined) {
      profile.city = dto.city;
      profile.region = dto.region || null;
    }
    if (dto.street !== undefined) profile.street = dto.street || null;
    if (dto.aboutMe !== undefined) profile.aboutMe = dto.aboutMe;
    await manager.save(PersonInNeed, profile);
  }

  /** A new request replaces the previous unconfirmed one; activation tokens are not touched. */
  private async issueEmailChangeToken(
    manager: EntityManager,
    userId: number,
    newEmail: string,
  ): Promise<string> {
    await manager
      .createQueryBuilder()
      .update(EmailVerificationToken)
      .set({ usedAt: new Date() })
      .where(
        '"user_id" = :userId AND "used_at" IS NULL AND "new_email" IS NOT NULL',
        { userId },
      )
      .execute();
    const token = generateToken();
    await manager.save(
      manager.create(EmailVerificationToken, {
        userId,
        newEmail,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      }),
    );
    return token;
  }

  private emailResult(delivered: boolean): EmailSentResponseDto {
    return delivered
      ? {
          code: 'CHECK_EMAIL',
          message:
            'Check your new email – we have sent you a confirmation link.',
          emailQueued: false,
        }
      : {
          code: 'EMAIL_QUEUED',
          message: 'The email will arrive within a few minutes.',
          emailQueued: true,
        };
  }
}

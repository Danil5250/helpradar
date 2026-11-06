import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { AppException } from '../../common/errors';
import type { AuthUser } from '../auth/auth-user';
import { EmailVerificationToken } from '../auth/entities/email-verification-token.entity';
import { Comment } from '../comments/entities/comment.entity';
import { SignedUrlService } from '../storage/signed-url.service';
import { PersonInNeed } from '../users/entities/person-in-need.entity';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { Role } from '../users/enums/role.enum';
import { isBlocked } from '../users/users.service';
import { ProfileUpdatedResponseDto } from './dto/profile-updated.response.dto';
import { ProfileResponseDto } from './dto/profile.response.dto';
import { PublicProfileResponseDto } from './dto/public-profile.response.dto';
import { UpdateProfileRequestDto } from './dto/update-profile.request.dto';

/** Roles that have a profile (guests and administrators have none). */
const PROFILE_ROLES: ReadonlyArray<Role> = [Role.Volunteer, Role.PersonInNeed];

@Injectable()
export class ProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private readonly tokens: Repository<EmailVerificationToken>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    private readonly signer: SignedUrlService,
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

  /** Save the personal fields without changing the login address. */
  async update(
    authUser: AuthUser,
    dto: UpdateProfileRequestDto,
  ): Promise<ProfileUpdatedResponseDto> {
    await this.dataSource.transaction(async (manager) => {
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
    });
    return { code: 'PROFILE_UPDATED', message: 'Profile updated.', profile: await this.getOwn(authUser.id), emailChange: null };
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
}

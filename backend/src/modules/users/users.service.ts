import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors';
import { Role } from './enums/role.enum';
import { PersonInNeed } from './entities/person-in-need.entity';
import { User } from './entities/user.entity';
import { Volunteer } from './entities/volunteer.entity';
import { UserView } from './user.view';

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PersonInNeed)
    private readonly personsInNeed: Repository<PersonInNeed>,
    @InjectRepository(Volunteer)
    private readonly volunteers: Repository<Volunteer>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: normalizeEmail(email) });
  }

  /** The password hash is excluded from normal queries and must be requested explicitly. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async getCity(user: Pick<User, 'id' | 'role'>): Promise<string | null> {
    if (user.role === Role.Volunteer) {
      return (
        (await this.volunteers.findOneBy({ userId: user.id }))?.city ?? null
      );
    }
    if (user.role === Role.PersonInNeed) {
      return (
        (await this.personsInNeed.findOneBy({ userId: user.id }))?.city ?? null
      );
    }
    return null;
  }

  async toView(user: User): Promise<UserView> {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      city: await this.getCity(user),
      avatarUrl: user.avatarUrl,
    };
  }
}

export function isBlocked(
  user: Pick<User, 'blockedUntil'>,
  now = new Date(),
): boolean {
  return !!user.blockedUntil && user.blockedUntil.getTime() > now.getTime();
}

/** SRS 3.2.2.5: "Your account is blocked until [date]. Reason: [reason]." */
export function blockedException(
  user: Pick<User, 'blockedUntil' | 'blockReason'>,
): AppException {
  const until = user.blockedUntil as Date;
  const reason = user.blockReason?.trim() || 'not specified';
  return new AppException(
    'ACCOUNT_BLOCKED',
    { blockedUntil: until.toISOString(), reason: user.blockReason ?? null },
    `Your account is blocked until ${until.toISOString().slice(0, 10)}. Reason: ${reason}.`,
  );
}

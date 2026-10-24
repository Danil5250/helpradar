import { AnnouncementPhoto } from '../modules/announcement/entities/announcement-photo.entity';
import { Announcement } from '../modules/announcement/entities/announcement.entity';
import { EmailVerificationToken } from '../modules/auth/entities/email-verification-token.entity';
import { LoginAttempt } from '../modules/auth/entities/login-attempt.entity';
import { UserSession } from '../modules/auth/entities/user-session.entity';
import { Category } from '../modules/categories/category.entity';
import { EmailOutbox } from '../modules/email/entities/email-outbox.entity';
import { PersonInNeed } from '../modules/users/entities/person-in-need.entity';
import { User } from '../modules/users/entities/user.entity';
import { Volunteer } from '../modules/users/entities/volunteer.entity';

export const ALL_ENTITIES = [
  User,
  PersonInNeed,
  Volunteer,
  Category,
  Announcement,
  AnnouncementPhoto,
  UserSession,
  EmailVerificationToken,
  LoginAttempt,
  EmailOutbox,
];

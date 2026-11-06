import { Role } from '../../users/enums/role.enum';
import { SupportType } from '../../users/enums/support-type.enum';

/** The signed-in user's own profile (SRS 3.2.12). */
export class ProfileResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  /** New address waiting for confirmation; the old one stays active until then. */
  pendingEmail: string | null;
  role: Role;
  phoneNumber: string | null;
  avatarUrl: string;
  city: string | null;
  region: string | null;
  /** Persons in need only. */
  street: string | null;
  aboutMe: string;
  /** Volunteers only: types of help they are ready to provide. */
  supports: SupportType[];
  /** Volunteers only: average rating (0 while there are no reviews). */
  rating: number | null;
  reviewsCount: number;
  createdAt: string;
}

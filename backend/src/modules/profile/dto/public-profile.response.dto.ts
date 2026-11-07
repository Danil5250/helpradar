import { Role } from '../../users/enums/role.enum';

/**
 * SRS 3.2.15.3 step 2: only public data. E-mail is never shown; the phone is not shown either,
 * because there is no confirmed partner yet who could be allowed to see it.
 */
export class PublicProfileResponseDto {
  id: number;
  /** First name and the initial of the last name. */
  name: string;
  avatarUrl: string;
  city: string | null;
  role: Role;
  /** Volunteers only. */
  rating: number | null;
  reviewsCount: number;
  registeredAt: string;
}

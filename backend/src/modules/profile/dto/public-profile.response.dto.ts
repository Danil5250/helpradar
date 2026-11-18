import { Role } from '../../users/enums/role.enum';

/** Profile identity and current contact details (Sprint 2, profile AC6). */
export class PublicProfileResponseDto {
  id: number;
  /** Full display name. */
  name: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string;
  city: string | null;
  role: Role;
  /** Volunteers only. */
  rating: number | null;
  reviewsCount: number;
  registeredAt: string;
}

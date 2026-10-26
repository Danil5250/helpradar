import { Role } from './enums/role.enum';

/** Public representation of the signed-in user (never contains the password hash). */
export interface UserView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  phoneNumber: string | null;
  city: string | null;
  avatarUrl: string;
}

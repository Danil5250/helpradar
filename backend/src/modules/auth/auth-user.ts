import { Request } from 'express';
import { Role } from '../users/enums/role.enum';

/** The authenticated principal attached to the request by the session guard. */
export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isConfirmedEmail: boolean;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

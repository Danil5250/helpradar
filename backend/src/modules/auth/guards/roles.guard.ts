import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../../common/errors';
import { Role } from '../../users/enums/role.enum';
import { AuthenticatedRequest } from '../auth-user';

const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Role based access control; permissions are always checked on the server (SRS 3.5.4). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new AppException('UNAUTHORIZED');
    if (!roles.includes(user.role)) throw new AppException('FORBIDDEN');
    return true;
  }
}

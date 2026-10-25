import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, AuthUser } from './auth-user';

/** Injects the authenticated user (or undefined for guests on public endpoints). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);

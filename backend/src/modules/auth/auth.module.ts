import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../email/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTasks } from './auth.tasks';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { UserSession } from './entities/user-session.entity';
import { IpRateLimitGuard } from './guards/ip-rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  OptionalSessionGuard,
  SessionAuthGuard,
} from './guards/session-auth.guard';
import { SessionService } from './session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSession,
      EmailVerificationToken,
      LoginAttempt,
    ]),
    UsersModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTasks,
    SessionService,
    SessionAuthGuard,
    OptionalSessionGuard,
    RolesGuard,
    IpRateLimitGuard,
  ],
  exports: [
    SessionService,
    SessionAuthGuard,
    OptionalSessionGuard,
    RolesGuard,
    IpRateLimitGuard,
  ],
})
export class AuthModule {}

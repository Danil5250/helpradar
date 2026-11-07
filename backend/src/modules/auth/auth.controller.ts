import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { MessageResponseDto } from '../../common/dto/message.response.dto';
import appConfig from '../../config/app.config';
import type { AuthenticatedRequest, AuthUser } from './auth-user';
import { SESSION_COOKIE } from './auth.constants';
import { AuthResult, AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { CheckResetTokenRequestDto } from './dto/check-reset-token.request.dto';
import { CurrentUserResponseDto } from './dto/current-user.response.dto';
import { EmailSentResponseDto } from './dto/email-sent.response.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterRequestDto } from './dto/register.request.dto';
import { ResendVerificationRequestDto } from './dto/resend-verification.request.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.request.dto';
import { SessionResponseDto } from './dto/session.response.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.request.dto';
import { IpRateLimitGuard } from './guards/ip-rate-limit.guard';
import {
  OptionalSessionGuard,
  SessionAuthGuard,
} from './guards/session-auth.guard';
import { SessionMeta } from './session.service';

const sessionMeta = (req: Request): SessionMeta => ({
  ip: req.ip ?? null,
  userAgent: req.get('user-agent') ?? null,
});

@ApiTags('Authorization')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  @Post('register')
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({ summary: 'Register with role selection (SRS 3.2.1)' })
  register(@Body() dto: RegisterRequestDto): Promise<EmailSentResponseDto> {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({
    summary: 'Activate the account with the token from the e-mail and sign in',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const result = await this.auth.verifyEmail(dto.token, sessionMeta(req));
    this.setSessionCookie(res, result);
    return this.sessionBody(result);
  }

  @Post('resend-verification')
  @HttpCode(202)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({
    summary: 'Send the activation e-mail again ("Resend email")',
  })
  resendVerification(
    @Body() dto: ResendVerificationRequestDto,
  ): Promise<EmailSentResponseDto> {
    return this.auth.resendVerification(dto.email, dto.locale);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({ summary: 'Log in with e-mail and password (SRS 3.2.2)' })
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.auth.login(dto, sessionMeta(req));
    this.setSessionCookie(res, result);
    return Object.assign(this.sessionBody(result), { message: result.message });
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out: the session token becomes invalid' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    await this.auth.logout(user.sessionId);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return { code: 'LOGGED_OUT', message: 'You have logged out.' };
  }

  // 3.2.3 Password recovery
  @Post('forgot-password')
  @HttpCode(202)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({
    summary:
      'Send a password reset link; the answer is the same for unknown e-mails (SRS 3.2.3)',
  })
  forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
  ): Promise<MessageResponseDto> {
    return this.auth.forgotPassword(dto.email, dto.locale);
  }

  @Post('check-reset-token')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({ summary: 'Check that a password reset link is still valid' })
  checkResetToken(
    @Body() dto: CheckResetTokenRequestDto,
  ): Promise<MessageResponseDto> {
    return this.auth.checkResetToken(dto.token);
  }

  @Post('reset-password')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({
    summary:
      'Set a new password with the token from the e-mail; ends all sessions',
  })
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const result = await this.auth.resetPassword(dto.token, dto.password);
    // every session of the user has just been ended, so the cookie of this browser is useless too
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return result;
  }

  @Get('me')
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Current user, or `user: null` for a guest (the web client asks on every start, so a guest must not get an error)',
  })
  async me(@Req() req: AuthenticatedRequest): Promise<CurrentUserResponseDto> {
    return {
      user: req.user ? await this.auth.me(req.user.id) : null,
    };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.isProduction,
      path: '/',
    };
  }

  private setSessionCookie(res: Response, result: AuthResult): void {
    res.cookie(SESSION_COOKIE, result.token, {
      ...this.cookieOptions(),
      expires: result.expiresAt,
    });
  }

  private sessionBody(result: AuthResult): SessionResponseDto {
    return {
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
      token: result.token,
    };
  }
}

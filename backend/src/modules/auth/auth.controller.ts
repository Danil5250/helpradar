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
import appConfig from '../../config/app.config';
import type { AuthenticatedRequest, AuthUser } from './auth-user';
import { SESSION_COOKIE } from './auth.constants';
import { AuthResult, AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
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
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({
    summary: 'Activate the account with the token from the e-mail and sign in',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
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
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email, dto.locale);
  }
  
  @Post('login')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({ summary: 'Log in with e-mail and password (SRS 3.2.2)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, sessionMeta(req));
    this.setSessionCookie(res, result);
    return { ...this.sessionBody(result), message: result.message };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out: the session token becomes invalid' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sessionId);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return { code: 'LOGGED_OUT', message: 'You have logged out.' };
  }

  @Get('me')
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Current user, or `user: null` for a guest (the web client asks on every start, so a guest must not get an error)',
  })
  async me(@Req() req: AuthenticatedRequest) {
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

  /** The web client relies on the HttpOnly cookie; the token is also returned for API/mobile clients. */
  private sessionBody(result: AuthResult) {
    return {
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
      token: result.token,
    };
  }
}

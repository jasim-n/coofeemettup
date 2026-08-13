import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { toSelfUser } from '../users/user.serializer';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  csrfCookieOptions,
  sessionCookieOptions,
  type AuthUser,
} from './auth.types';
import type { Env } from '../config/env';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @SkipCsrf() // pre-session bootstrap; protected by the OTP secret + rate limiting
  @Post('request-otp')
  @HttpCode(200)
  async requestOtp(
    @Body() dto: RequestOtpDto,
  ): Promise<{ ok: true; isNewUser: boolean; devCode?: string }> {
    const email = dto.email.trim().toLowerCase();
    const { code, isNewUser } = await this.auth.requestOtp(
      email,
      dto.intent ?? 'login',
    );
    const isDev = this.config.get('NODE_ENV', { infer: true }) !== 'production';
    const exposeOtp =
      isDev || this.config.get('EXPOSE_DEV_OTP', { infer: true }) === 'true';
    return exposeOtp
      ? { ok: true, isNewUser, devCode: code }
      : { ok: true, isNewUser };
  }

  @Public()
  @SkipCsrf() // pre-session bootstrap; the OTP is the anti-abuse factor
  @Post('verify-otp')
  @HttpCode(200)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client') client?: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    const { user, token } = await this.auth.verifyOtp(email, dto.code, {
      phone: dto.phone,
      firstName: dto.firstName,
      lastName: dto.lastName,
      username: dto.username,
      referralCode: dto.referralCode,
      password: dto.password,
    });
    return this.finishLogin(res, client, user, token);
  }

  @Public()
  @SkipCsrf()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client') client?: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    const { user, token } = await this.auth.login(email, dto.password);
    return this.finishLogin(res, client, user, token);
  }

  @Public()
  @SkipCsrf()
  @Post('request-password-reset')
  @HttpCode(200)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ ok: true; devCode?: string }> {
    const email = dto.email.trim().toLowerCase();
    const { code } = await this.auth.requestPasswordReset(email);
    const isDev = this.config.get('NODE_ENV', { infer: true }) !== 'production';
    const exposeOtp =
      isDev || this.config.get('EXPOSE_DEV_OTP', { infer: true }) === 'true';
    return exposeOtp && code ? { ok: true, devCode: code } : { ok: true };
  }

  @Public()
  @SkipCsrf()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client') client?: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    const { user, token } = await this.auth.resetPassword(
      email,
      dto.code,
      dto.password,
    );
    return this.finishLogin(res, client, user, token);
  }

  private finishLogin(
    res: Response,
    client: string | undefined,
    user: Awaited<ReturnType<UsersService['findByEmail']>>,
    token: string,
  ) {
    if (!user) throw new UnauthorizedException();
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config));
    const csrfToken = this.issueCsrf(res);
    void this.audit.log({ actorId: user.id, action: 'auth.login' });
    const self = toSelfUser(user);
    // Native clients can't use httpOnly cookies → hand them the bearer token.
    // Web stays cookie-only (token omitted) to preserve the httpOnly benefit.
    return client === 'mobile'
      ? { user: self, csrfToken, token }
      : { user: self, csrfToken };
  }

  @Get('me')
  async me(
    @CurrentUser() current: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.users.findById(current.id);
    if (!user) throw new UnauthorizedException();
    const csrfToken = this.issueCsrf(res);
    return { user: toSelfUser(user), csrfToken };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(this.config));
    res.clearCookie(CSRF_COOKIE, csrfCookieOptions(this.config));
    return { ok: true };
  }

  private issueCsrf(res: Response): string {
    const csrfToken = randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions(this.config));
    return csrfToken;
  }
}

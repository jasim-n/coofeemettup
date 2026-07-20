import {
  BadRequestException,
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
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { normalizePhone } from './phone.util';
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
  ): Promise<{ ok: true; devCode?: string }> {
    const code = await this.auth.requestOtp(this.parsePhone(dto.phone));
    const isDev = this.config.get('NODE_ENV', { infer: true }) !== 'production';
    return isDev ? { ok: true, devCode: code } : { ok: true };
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
    const { user, token } = await this.auth.verifyOtp(
      this.parsePhone(dto.phone),
      dto.code,
      dto.referralCode,
    );
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config));
    const csrfToken = this.issueCsrf(res);
    void this.audit.log({ actorId: user.id, action: 'auth.login' });
    // Native clients can't use httpOnly cookies → hand them the bearer token.
    // Web stays cookie-only (token omitted) to preserve the httpOnly benefit.
    return client === 'mobile'
      ? { user, csrfToken, token }
      : { user, csrfToken };
  }

  @Get('me')
  async me(
    @CurrentUser() current: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.users.findById(current.id);
    if (!user) throw new UnauthorizedException();
    const csrfToken = this.issueCsrf(res);
    return { user, csrfToken };
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

  private parsePhone(raw: string): string {
    try {
      return normalizePhone(raw);
    } catch {
      throw new BadRequestException('Invalid Pakistani mobile number');
    }
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import type { SessionPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(phone: string): Promise<string> {
    return this.otp.request(phone);
  }

  async verifyOtp(phone: string, code: string, referralCode?: string) {
    const ok = await this.otp.verify(phone, code);
    if (!ok) throw new UnauthorizedException('Invalid or expired code');

    const user = await this.users.upsertByPhone(phone, referralCode);
    const payload: SessionPayload = { sub: user.id, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { user, token };
  }
}

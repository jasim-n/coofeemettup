import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { normalizePhone } from './phone.util';
import { validateUsername } from '../users/username.util';
import type { SessionPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(
    email: string,
  ): Promise<{ code: string; isNewUser: boolean }> {
    const isNewUser = !(await this.users.findByEmail(email));
    const code = await this.otp.request(email);
    return { code, isNewUser };
  }

  async verifyOtp(
    email: string,
    code: string,
    opts: {
      phone?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      referralCode?: string;
    },
  ) {
    const ok = await this.otp.verify(email, code);
    if (!ok) throw new UnauthorizedException('Invalid or expired code');

    const existing = await this.users.findByEmail(email);
    let user: Awaited<ReturnType<UsersService['findByEmail']>>;

    if (existing) {
      user = existing;
    } else {
      // New account: require a distinct phone + a public @handle + a real name.
      if (!opts.phone) {
        throw new BadRequestException('Phone number is required');
      }
      const firstName = opts.firstName?.trim();
      const lastName = opts.lastName?.trim();
      if (!firstName || !lastName) {
        throw new BadRequestException('First and last name are required');
      }
      if (!opts.username) {
        throw new BadRequestException('A handle is required');
      }
      let username: string;
      try {
        username = validateUsername(opts.username);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Invalid handle',
        );
      }

      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhone(opts.phone);
      } catch {
        throw new BadRequestException('Enter a valid Pakistani mobile number');
      }
      const phoneConflict = await this.users.findByPhone(normalizedPhone);
      if (phoneConflict) {
        throw new ConflictException('That phone number is already registered');
      }
      const handleConflict = await this.users.findByUsername(username);
      if (handleConflict) {
        throw new ConflictException('That handle is taken');
      }
      user = await this.users.createWithEmail(
        email,
        normalizedPhone,
        { firstName, lastName, username },
        opts.referralCode,
      );
    }

    const payload: SessionPayload = { sub: user.id, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { user: user, token };
  }
}

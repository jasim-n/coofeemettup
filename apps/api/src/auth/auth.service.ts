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
import {
  hashPassword,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from './password.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(
    email: string,
    intent: 'signup' | 'login' = 'login',
  ): Promise<{ code: string; isNewUser: boolean }> {
    const existing = await this.users.findByEmail(email);
    const isNewUser = !existing;

    // Create-account path must not silently switch into an existing account.
    if (intent === 'signup' && existing) {
      throw new BadRequestException(
        existing.passwordHash
          ? 'An account already exists for this email. Sign in with your password, or use Forgot password.'
          : 'An account already exists for this email. Sign in and leave the password blank to finish setup.',
      );
    }

    // Passworded accounts must use password login / forgot-password, not OTP login.
    if (intent === 'login' && existing?.passwordHash) {
      throw new BadRequestException(
        'This account uses password login. Use forgot password if you need to reset it.',
      );
    }

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
      password?: string;
    },
  ) {
    const ok = await this.otp.verify(email, code);
    if (!ok) throw new UnauthorizedException('Invalid or expired code');

    const existing = await this.users.findByEmail(email);
    if (existing?.passwordHash) {
      throw new BadRequestException(
        'This account uses password login. Use forgot password if you need to reset it.',
      );
    }
    let user: Awaited<ReturnType<UsersService['findByEmail']>>;

    if (existing) {
      user = existing;
    } else {
      // New account: require a distinct phone + a public @handle + a real name.
      if (!opts.phone) {
        throw new BadRequestException('Phone number is required');
      }
      this.assertPassword(opts.password);
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
        await hashPassword(opts.password),
      );
    }

    if (existing && opts.password) {
      this.assertPassword(opts.password);
      user = await this.users.setPassword(
        user.id,
        await hashPassword(opts.password),
      );
    }

    if (!user) throw new UnauthorizedException();

    return this.issueSession(user);
  }

  async login(email: string, password?: string) {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Password setup required. Use email verification.',
      );
    }
    if (!password) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return { code: null };
    const code = await this.otp.request(email);
    return { code };
  }

  async resetPassword(email: string, code: string, password: string) {
    this.assertPassword(password);
    const ok = await this.otp.verify(email, code);
    if (!ok) throw new UnauthorizedException('Invalid or expired code');
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid or expired code');
    const updated = await this.users.setPassword(
      user.id,
      await hashPassword(password),
    );
    return this.issueSession(updated);
  }

  private assertPassword(
    password: string | undefined,
  ): asserts password is string {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      );
    }
  }

  private async issueSession(
    user: NonNullable<Awaited<ReturnType<UsersService['findByEmail']>>>,
  ) {
    const payload: SessionPayload = { sub: user.id, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { user, token };
  }
}

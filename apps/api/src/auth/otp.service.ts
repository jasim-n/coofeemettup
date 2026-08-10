import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import type { Env } from '../config/env';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlSeconds = 300; // 5 min
  private readonly windowSeconds = 600; // 10 min
  private readonly maxPerWindow = 5;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  private codeKey(email: string): string {
    return `otp:code:${email}`;
  }

  private throttleKey(email: string): string {
    return `otp:throttle:${email}`;
  }

  async request(email: string): Promise<string> {
    const attempts = await this.redis.client.incr(this.throttleKey(email));
    if (attempts === 1) {
      await this.redis.client.expire(
        this.throttleKey(email),
        this.windowSeconds,
      );
    }
    if (attempts > this.maxPerWindow) {
      throw new HttpException(
        'Too many code requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.client.set(
      this.codeKey(email),
      code,
      'EX',
      this.ttlSeconds,
    );

    if (this.config.get('NODE_ENV', { infer: true }) !== 'production') {
      this.logger.log(`DEV OTP for ${email}: ${code}`);
    }

    // Fire-and-forget: the code is already persisted (Redis) and verifiable, so
    // never block the HTTP response on SMTP. sendOtp is best-effort (never
    // throws); awaiting it made request-otp hang when the SMTP host stalls
    // (common on cloud hosts). void it so the response returns immediately.
    void this.mail.sendOtp(email, code);

    return code;
  }

  async verify(email: string, code: string): Promise<boolean> {
    const stored = await this.redis.client.get(this.codeKey(email));
    if (!stored || stored !== code) return false;
    await this.redis.client.del(this.codeKey(email));
    return true;
  }
}

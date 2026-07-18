import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
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
  ) {}

  private codeKey(phone: string): string {
    return `otp:code:${phone}`;
  }

  private throttleKey(phone: string): string {
    return `otp:throttle:${phone}`;
  }

  async request(phone: string): Promise<string> {
    const attempts = await this.redis.client.incr(this.throttleKey(phone));
    if (attempts === 1) {
      await this.redis.client.expire(
        this.throttleKey(phone),
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
      this.codeKey(phone),
      code,
      'EX',
      this.ttlSeconds,
    );

    if (this.config.get('NODE_ENV', { infer: true }) !== 'production') {
      // Dev delivery only. Real SMS provider is Phase 2.
      this.logger.log(`DEV OTP for ${phone}: ${code}`);
    }
    return code;
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.client.get(this.codeKey(phone));
    if (!stored || stored !== code) return false;
    await this.redis.client.del(this.codeKey(phone));
    return true;
  }
}

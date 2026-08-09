import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Env } from '../config/env';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async uploadImage(buffer: Buffer, folder = 'coffee-avatars'): Promise<string> {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Image uploads are not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Params sorted alphabetically, joined as k=v&k=v, then secret appended
    const signStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signStr).digest('hex');

    const form = new FormData();
    form.append('file', new Blob([buffer as unknown as ArrayBuffer]));
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: form },
      );

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok || !data.secure_url) {
        this.logger.error('Cloudinary upload failed', data);
        throw new BadRequestException('Image upload failed');
      }

      return data.secure_url as string;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Cloudinary fetch error', err);
      throw new BadRequestException('Image upload failed');
    }
  }
}

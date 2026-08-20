import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Env } from '../config/env';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async uploadImage(
    buffer: Buffer,
    folder = 'coffee-avatars',
  ): Promise<string> {
    return this.uploadToCloudinary(buffer, folder, 'image');
  }

  /** Short-form reel / video for table gallery + Featured. */
  async uploadVideo(
    buffer: Buffer,
    folder = 'table-reels',
  ): Promise<{ url: string; durationMs: number | null; posterUrl: string | null }> {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const data = await this.uploadToCloudinaryRaw(buffer, folder, 'video');
    const url = data.secure_url as string;
    const durationSec =
      typeof data.duration === 'number' ? data.duration : null;
    const publicId = typeof data.public_id === 'string' ? data.public_id : null;
    const posterUrl =
      cloudName && publicId
        ? `https://res.cloudinary.com/${cloudName}/video/upload/so_0/${publicId}.jpg`
        : null;
    return {
      url,
      durationMs: durationSec != null ? Math.round(durationSec * 1000) : null,
      posterUrl,
    };
  }

  private async uploadToCloudinary(
    buffer: Buffer,
    folder: string,
    resource: 'image' | 'video',
  ): Promise<string> {
    const data = await this.uploadToCloudinaryRaw(buffer, folder, resource);
    if (!data.secure_url) {
      throw new BadRequestException(
        resource === 'video' ? 'Video upload failed' : 'Image upload failed',
      );
    }
    return data.secure_url as string;
  }

  private async uploadToCloudinaryRaw(
    buffer: Buffer,
    folder: string,
    resource: 'image' | 'video',
  ): Promise<Record<string, unknown>> {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        resource === 'video'
          ? 'Video uploads are not configured'
          : 'Image uploads are not configured',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
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
        `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`,
        { method: 'POST', body: form },
      );
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !data.secure_url) {
        this.logger.error(`Cloudinary ${resource} upload failed`, data);
        throw new BadRequestException(
          resource === 'video' ? 'Video upload failed' : 'Image upload failed',
        );
      }
      return data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Cloudinary ${resource} fetch error`, err);
      throw new BadRequestException(
        resource === 'video' ? 'Video upload failed' : 'Image upload failed',
      );
    }
  }
}

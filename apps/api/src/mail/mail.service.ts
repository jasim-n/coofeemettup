import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Env } from '../config/env';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transport: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  private getTransport(): Transporter | null {
    const host = this.config.get('MAIL_HOST', { infer: true });
    const user = this.config.get('MAIL_USER', { infer: true });
    const pass = this.config.get('MAIL_PASS', { infer: true });
    if (!host || !user || !pass) return null;

    if (!this.transport) {
      const port = this.config.get('MAIL_PORT', { infer: true }) ?? 587;
      this.transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    return this.transport;
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const from =
      this.config.get('MAIL_FROM', { infer: true }) ??
      'Coffee Meetups <no-reply@coffeemeetups.dev>';
    const transport = this.getTransport();

    if (!transport) {
      this.logger.log(`DEV OTP for ${email}: ${code}`);
      return;
    }

    try {
      await transport.sendMail({
        from,
        to: email,
        subject: 'Your Coffee Meetups code',
        text: `Your verification code is ${code}. It expires in 5 minutes.`,
        html: `<p>Your verification code is <strong>${code}</strong>. It expires in 5 minutes.</p>`,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${email}`, err);
    }
  }
}

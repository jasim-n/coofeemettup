import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env';

export type MailProvider = 'brevo' | 'gmail';
const PROVIDERS: MailProvider[] = ['brevo', 'gmail'];
const SETTING_KEY = 'mailProvider';
const DEFAULT_FROM = 'Coffee Meetups <no-reply@coffeemeetups.dev>';

type Creds = { host?: string; port: number; user?: string; pass?: string; from: string };

export interface MailProviderStatus {
  /** The provider that will actually be used for the next send (null = none configured). */
  active: MailProvider | null;
  /** The env-configured default (null when unset). */
  default: MailProvider | null;
  /** Providers that have complete SMTP credentials. */
  configured: MailProvider[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transports: Partial<Record<MailProvider, Transporter>> = {};

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  private creds(provider: MailProvider): Creds {
    const get = <K extends keyof Env>(k: K) => this.config.get(k, { infer: true });
    if (provider === 'brevo') {
      return {
        host: get('BREVO_HOST'),
        port: get('BREVO_PORT') ?? 587,
        user: get('BREVO_USER'),
        pass: get('BREVO_PASS'),
        from: get('BREVO_FROM') ?? get('MAIL_FROM') ?? DEFAULT_FROM,
      };
    }
    // gmail — prefer GMAIL_*, fall back to legacy MAIL_*
    return {
      host: get('GMAIL_HOST') ?? get('MAIL_HOST'),
      port: get('GMAIL_PORT') ?? get('MAIL_PORT') ?? 587,
      user: get('GMAIL_USER') ?? get('MAIL_USER'),
      pass: get('GMAIL_PASS') ?? get('MAIL_PASS'),
      from: get('GMAIL_FROM') ?? get('MAIL_FROM') ?? DEFAULT_FROM,
    };
  }

  private isConfigured(provider: MailProvider): boolean {
    const c = this.creds(provider);
    return Boolean(c.host && c.user && c.pass);
  }

  configuredProviders(): MailProvider[] {
    return PROVIDERS.filter((p) => this.isConfigured(p));
  }

  private transport(provider: MailProvider): Transporter | null {
    if (!this.isConfigured(provider)) return null;
    if (!this.transports[provider]) {
      const c = this.creds(provider);
      this.transports[provider] = nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.port === 465,
        auth: { user: c.user, pass: c.pass },
      });
    }
    return this.transports[provider] ?? null;
  }

  private envDefault(): MailProvider | null {
    return this.config.get('MAIL_PROVIDER', { infer: true }) ?? null;
  }

  /** Resolve the provider to use: DB setting → env default → first configured. */
  async activeProvider(): Promise<MailProvider | null> {
    const configured = this.configuredProviders();
    if (configured.length === 0) return null;
    let desired: MailProvider | null = null;
    try {
      const row = await this.prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
      if (row && PROVIDERS.includes(row.value as MailProvider)) {
        desired = row.value as MailProvider;
      }
    } catch (err) {
      this.logger.warn(`Could not read mail provider setting: ${String(err)}`);
    }
    desired = desired ?? this.envDefault();
    if (desired && configured.includes(desired)) return desired;
    return configured[0];
  }

  async status(): Promise<MailProviderStatus> {
    return {
      active: await this.activeProvider(),
      default: this.envDefault(),
      configured: this.configuredProviders(),
    };
  }

  /** Persist the active provider. Caller validates it is configured. */
  async setProvider(provider: MailProvider): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: provider },
      update: { value: provider },
    });
  }

  /**
   * Send a message via the active provider, falling back to any other
   * configured provider on failure. Best-effort — never throws.
   * @returns the provider that succeeded, or null if none did / none configured.
   */
  private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<MailProvider | null> {
    const active = await this.activeProvider();
    if (!active) {
      this.logger.log(`No mail provider configured — skipping send to ${to}`);
      return null;
    }
    // active first, then the remaining configured providers as fallback
    const order = [active, ...this.configuredProviders().filter((p) => p !== active)];
    for (const provider of order) {
      const transport = this.transport(provider);
      if (!transport) continue;
      try {
        await transport.sendMail({ from: this.creds(provider).from, to, subject, text, html });
        return provider;
      } catch (err) {
        this.logger.error(`Mail send via ${provider} failed for ${to}`, err as Error);
      }
    }
    return null;
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const sent = await this.send(
      email,
      'Your Coffee Meetups code',
      `Your verification code is ${code}. It expires in 5 minutes.`,
      `<p>Your verification code is <strong>${code}</strong>. It expires in 5 minutes.</p>`,
    );
    if (!sent) this.logger.log(`DEV OTP for ${email}: ${code}`);
  }

  /** Admin "send test" — throws on total failure so the portal can surface it. */
  async sendTest(email: string): Promise<MailProvider> {
    const sent = await this.send(
      email,
      'Coffee Meetups — test email',
      'This is a test email confirming your OTP sender is working.',
      '<p>This is a <strong>test email</strong> confirming your OTP sender is working.</p>',
    );
    if (!sent) {
      throw new Error('No configured mail provider could send — check SMTP credentials.');
    }
    return sent;
  }
}

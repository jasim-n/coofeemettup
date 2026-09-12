import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export type SubscribeNewsletterResult = {
  ok: true;
  alreadySubscribed: boolean;
  emailSent: boolean;
};

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async subscribe(rawEmail: string): Promise<SubscribeNewsletterResult> {
    const email = rawEmail.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      const emailSent =
        existing.welcomeSentAt == null
          ? await this.sendWelcomeAndMark(existing.id, email)
          : false;
      return { ok: true, alreadySubscribed: true, emailSent };
    }

    const row = await this.prisma.newsletterSubscriber.create({
      data: { email },
    });
    const emailSent = await this.sendWelcomeAndMark(row.id, email);
    return { ok: true, alreadySubscribed: false, emailSent };
  }

  async listSubscribers(limit: number, offset: number, q?: string) {
    const where = q?.trim()
      ? {
          email: {
            contains: q.trim().toLowerCase(),
            mode: 'insensitive' as const,
          },
        }
      : {};
    const [subscribers, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return {
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        welcomeSentAt: s.welcomeSentAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
    };
  }

  private async sendWelcomeAndMark(
    id: string,
    email: string,
  ): Promise<boolean> {
    const sent = await this.mail.sendNewsletterWelcome(email);
    if (!sent) return false;
    await this.prisma.newsletterSubscriber.update({
      where: { id },
      data: { welcomeSentAt: new Date() },
    });
    return true;
  }
}

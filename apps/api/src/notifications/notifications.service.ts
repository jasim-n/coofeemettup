import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist one notification. Awaits internally (Prisma promises are lazy — a
   * bare, un-awaited promise never runs) and never throws, so fire-and-forget
   * callers (`void create(...)`) still write and a delivery hiccup can't break
   * the surrounding request. Mirrors AuditService.log.
   */
  async create(
    userId: string,
    type: string,
    title: string,
    body?: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body: body ?? null,
          meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (err) {
      this.logger.warn(
        `notification "${type}" failed for ${userId}: ${String(err)}`,
      );
    }
  }

  async notifyMany(
    userIds: string[],
    type: string,
    title: string,
    body?: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.all(
      userIds.map((id) => this.create(id, type, title, body, meta)),
    );
  }

  list(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}

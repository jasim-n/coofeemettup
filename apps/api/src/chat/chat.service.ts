import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** The current user's matched group for an event (they must be a member). */
  private async resolveGroup(userId: string, eventId: string) {
    const groups = await this.prisma.groupAssignment.findMany({
      where: { eventId },
    });
    return groups.find((g) => g.userIds.includes(userId)) ?? null;
  }

  /** Group chat for an event: messages from the user's group, minus blocked senders. */
  async getForEvent(userId: string, eventId: string) {
    const group = await this.resolveGroup(userId, eventId);
    if (!group) return { groupId: null, messages: [] };

    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    const blocked = new Set(me?.blockedUserIds ?? []);

    const rows = await this.prisma.groupMessage.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const senderIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, firstName: true, lastInitial: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const messages = rows
      .filter((r) => !blocked.has(r.userId))
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        firstName: byId.get(r.userId)?.firstName ?? null,
        lastInitial: byId.get(r.userId)?.lastInitial ?? null,
      }));
    return { groupId: group.id, messages };
  }

  async postForEvent(userId: string, eventId: string, body: string) {
    const group = await this.resolveGroup(userId, eventId);
    if (!group) {
      throw new ForbiddenException('You are not in a group for this event yet');
    }
    const text = body.trim();
    if (!text) throw new BadRequestException('Message cannot be empty');
    await this.prisma.groupMessage.create({
      data: { groupId: group.id, userId, body: text.slice(0, 1000) },
    });
    return { ok: true as const };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/user.serializer';

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  async send(me: string, other: string, body: string) {
    if (me === other) throw new BadRequestException('Cannot message yourself');

    const otherUser = await this.prisma.user.findUnique({ where: { id: other } });
    if (!otherUser) throw new NotFoundException('User not found');

    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Body cannot be empty');

    return this.prisma.directMessage.create({
      data: { senderId: me, recipientId: other, body: trimmed },
    });
  }

  async thread(me: string, other: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me, recipientId: other },
          { senderId: other, recipientId: me },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.directMessage.updateMany({
      where: { senderId: other, recipientId: me, readAt: null },
      data: { readAt: new Date() },
    });

    return messages;
  }

  async threads(me: string) {
    const allMessages = await this.prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: me }, { recipientId: me }],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by the other party, keeping the first (latest) per other
    const seen = new Map<string, (typeof allMessages)[number]>();
    for (const msg of allMessages) {
      const otherId = msg.senderId === me ? msg.recipientId : msg.senderId;
      if (!seen.has(otherId)) {
        seen.set(otherId, msg);
      }
    }

    const otherIds = [...seen.keys()];
    const users = await this.prisma.user.findMany({
      where: { id: { in: otherIds } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const result = otherIds.map((otherId) => {
      const latest = seen.get(otherId)!;
      const unread = allMessages.filter(
        (m) => m.recipientId === me && m.senderId === otherId && m.readAt == null,
      ).length;
      const otherUser = byId.get(otherId);
      return {
        user: otherUser ? toPublicUser(otherUser) : null,
        lastMessage: latest.body,
        lastAt: latest.createdAt,
        unread,
      };
    });

    // Sort by lastAt descending
    result.sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );

    return result;
  }
}

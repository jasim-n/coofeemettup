import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageKind } from '../../generated/prisma/client';

export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async summarize(
    messageId: string,
    viewerId: string,
  ): Promise<ReactionSummary[]> {
    const rows = await this.prisma.messageReaction.findMany({
      where: { messageId },
    });
    return this.groupReactions(rows, viewerId);
  }

  async forMessages(
    messageIds: string[],
    viewerId: string,
  ): Promise<Map<string, ReactionSummary[]>> {
    if (messageIds.length === 0) return new Map();
    const rows = await this.prisma.messageReaction.findMany({
      where: { messageId: { in: messageIds } },
    });

    // Group by messageId first
    const byMessage = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) {
      const existing = byMessage.get(row.messageId) ?? [];
      existing.push(row);
      byMessage.set(row.messageId, existing);
    }

    const result = new Map<string, ReactionSummary[]>();
    for (const id of messageIds) {
      result.set(id, this.groupReactions(byMessage.get(id) ?? [], viewerId));
    }
    return result;
  }

  async toggle(
    viewerId: string,
    kind: 'dm' | 'group',
    messageId: string,
    emoji: string,
  ): Promise<ReactionSummary[]> {
    if (kind === 'dm') {
      const msg = await this.prisma.directMessage.findUnique({
        where: { id: messageId },
      });
      if (!msg) throw new NotFoundException('Message not found');
      if (msg.senderId !== viewerId && msg.recipientId !== viewerId) {
        throw new ForbiddenException('Not a participant of this conversation');
      }
    } else {
      const msg = await this.prisma.groupMessage.findUnique({
        where: { id: messageId },
      });
      if (!msg) throw new NotFoundException('Message not found');
      const tableId = msg.groupId;
      const table = await this.prisma.table.findUnique({
        where: { id: tableId },
      });
      if (!table) throw new NotFoundException('Table not found');
      const isHost = table.hostId === viewerId;
      if (!isHost) {
        const req = await this.prisma.tableJoinRequest.findUnique({
          where: { tableId_userId: { tableId, userId: viewerId } },
        });
        if (req?.status !== 'APPROVED') {
          throw new ForbiddenException(
            'Only the host and approved members can react',
          );
        }
      }
      const closedManual = table.chatClosedAt != null;
      const closedAuto =
        table.completedAt != null &&
        Date.now() >= table.completedAt.getTime() + 24 * 60 * 60 * 1000;
      if (closedManual || closedAuto) {
        throw new ForbiddenException('This group chat is closed');
      }
    }

    const dbKind: MessageKind =
      kind === 'dm' ? MessageKind.DM : MessageKind.GROUP;

    // One reaction per user per message: clicking the same emoji removes it
    // (toggle off); clicking a different emoji REPLACES the user's previous one.
    const mine = await this.prisma.messageReaction.findFirst({
      where: { messageId, userId: viewerId },
    });

    if (mine?.emoji === emoji) {
      await this.prisma.messageReaction.delete({ where: { id: mine.id } });
    } else {
      if (mine) {
        await this.prisma.messageReaction.delete({ where: { id: mine.id } });
      }
      await this.prisma.messageReaction.create({
        data: { messageId, userId: viewerId, emoji, kind: dbKind },
      });
    }

    return this.summarize(messageId, viewerId);
  }

  // ---- private helpers ----

  private groupReactions(
    rows: { emoji: string; userId: string }[],
    viewerId: string,
  ): ReactionSummary[] {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const row of rows) {
      const entry = map.get(row.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (row.userId === viewerId) entry.mine = true;
      map.set(row.emoji, entry);
    }
    return Array.from(map.entries())
      .map(([emoji, { count, mine }]) => ({ emoji, count, mine }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';

const NAME_SELECT = { id: true, username: true };
const round1 = (n: number | null) => (n == null ? 0 : Math.round(n * 10) / 10);

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Host + APPROVED guests (peer-review participant set). */
  private async participantIds(
    tableId: string,
    hostId: string,
  ): Promise<string[]> {
    const approved = await this.prisma.tableJoinRequest.findMany({
      where: { tableId, status: 'APPROVED' },
      select: { userId: true },
    });
    return [hostId, ...approved.map((r) => r.userId)];
  }

  /** Who the current user can review: every other participant after startAt. */
  async targets(userId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    const happened = table.startAt.getTime() < Date.now();
    const participants = await this.participantIds(tableId, table.hostId);
    if (!participants.includes(userId)) {
      return { eligible: false, happened, targets: [] };
    }

    const subjectIds = participants.filter((id) => id !== userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: subjectIds } },
      select: NAME_SELECT,
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const subjects = subjectIds.map((id) => {
      const u = byId.get(id);
      const isHost = id === table.hostId;
      return {
        subjectId: id,
        name: u?.username ? `@${u.username}` : isHost ? 'Host' : 'Guest',
        role: isHost ? 'HOST' : 'GUEST',
      };
    });

    const mine = await this.prisma.review.findMany({
      where: { tableId, reviewerId: userId },
      select: { subjectId: true },
    });
    const reviewed = new Set(mine.map((r) => r.subjectId));
    return {
      eligible: happened,
      happened,
      targets: subjects.map((s) => ({
        ...s,
        alreadyReviewed: reviewed.has(s.subjectId),
      })),
    };
  }

  async create(userId: string, tableId: string, dto: CreateReviewDto) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.startAt.getTime() >= Date.now()) {
      throw new BadRequestException(
        'You can review after the table has happened',
      );
    }
    if (userId === dto.subjectId) {
      throw new BadRequestException('You cannot review yourself');
    }

    const participants = await this.participantIds(tableId, table.hostId);
    if (!participants.includes(userId)) {
      throw new ForbiddenException(
        'Only the host and guests can review this table',
      );
    }
    if (!participants.includes(dto.subjectId)) {
      throw new BadRequestException('That person was not part of this table');
    }

    const role: 'HOST' | 'GUEST' =
      dto.subjectId === table.hostId ? 'HOST' : 'GUEST';

    const review = await this.prisma.review.upsert({
      where: {
        tableId_reviewerId_subjectId: {
          tableId,
          reviewerId: userId,
          subjectId: dto.subjectId,
        },
      },
      create: {
        tableId,
        reviewerId: userId,
        subjectId: dto.subjectId,
        role,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
      update: { rating: dto.rating, comment: dto.comment ?? null },
    });
    void this.notifications.create(
      dto.subjectId,
      'review.received',
      'Your rating was updated ⭐',
      'Someone rated you after a table. Your profile score has been updated.',
      { tableId },
    );
    return review;
  }

  /** Profile reputation: averages only (no individual review text). */
  async reputation(userId: string) {
    const [overallAgg, hostAgg, guestAgg] = await Promise.all([
      this.prisma.review.aggregate({
        where: { subjectId: userId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.aggregate({
        where: { subjectId: userId, role: 'HOST' },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.aggregate({
        where: { subjectId: userId, role: 'GUEST' },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    return {
      overallRating: {
        avg: round1(overallAgg._avg.rating),
        count: overallAgg._count._all,
      },
      hostRating: {
        avg: round1(hostAgg._avg.rating),
        count: hostAgg._count._all,
      },
      guestRating: {
        avg: round1(guestAgg._avg.rating),
        count: guestAgg._count._all,
      },
      // Individual review text is admin-only; keep field for contract compatibility.
      recent: [],
    };
  }
}

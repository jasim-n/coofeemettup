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

/** Guest review window length after the host closes the table. */
export const GUEST_REVIEW_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

type TableForReviews = {
  id: string;
  hostId: string;
  startAt: Date;
  status: string;
  completedAt: Date | null;
};

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

  /**
   * Review window:
   * - Opens after startAt (meetup has happened).
   * - Guests: close 2 days after host marks COMPLETED (`completedAt`).
   *   If not yet completed, guests can still rate after startAt (window open).
   * - Host: never closes once startAt has passed (host is required to review).
   */
  private reviewAccess(
    table: TableForReviews,
    userId: string,
    now = Date.now(),
  ) {
    const happened = table.startAt.getTime() < now;
    const isHost = userId === table.hostId;
    const closesAt =
      table.completedAt != null
        ? new Date(table.completedAt.getTime() + GUEST_REVIEW_WINDOW_MS)
        : null;
    const guestClosed =
      !isHost && closesAt != null && now >= closesAt.getTime();
    const eligible = happened && !guestClosed;
    return {
      happened,
      isHost,
      closed: guestClosed,
      closesAt,
      eligible,
    };
  }

  /** Who the current user can review: every other participant in the open window. */
  async targets(userId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    const access = this.reviewAccess(table, userId);
    const participants = await this.participantIds(tableId, table.hostId);
    if (!participants.includes(userId)) {
      return {
        eligible: false,
        happened: access.happened,
        closed: access.closed,
        closesAt: access.closesAt?.toISOString() ?? null,
        targets: [],
      };
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
      eligible: access.eligible,
      happened: access.happened,
      closed: access.closed,
      closesAt: access.closesAt?.toISOString() ?? null,
      targets: access.eligible
        ? subjects.map((s) => ({
            ...s,
            alreadyReviewed: reviewed.has(s.subjectId),
          }))
        : [],
    };
  }

  async create(userId: string, tableId: string, dto: CreateReviewDto) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    const access = this.reviewAccess(table, userId);
    if (!access.happened) {
      throw new BadRequestException(
        'You can review after the table has happened',
      );
    }
    if (access.closed) {
      throw new BadRequestException(
        'The guest review window has closed (2 days after the host ended the meetup)',
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

  /**
   * Profile reputation: averages only (no individual review text).
   * overallRating = 50% avg of reviews written by table hosts +
   *                 50% avg of reviews written by guests
   * Guest side averages **only submitted** ratings (e.g. 3 of 4 guests → /3).
   * (if only one side exists, that side is used at 100%).
   * hostRating / guestRating = subject-role breakdowns (as host vs as guest).
   */
  async reputation(userId: string) {
    const [rows, hostAgg, guestAgg] = await Promise.all([
      this.prisma.review.findMany({
        where: { subjectId: userId },
        select: { rating: true, reviewerId: true, tableId: true },
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

    const tableIds = [...new Set(rows.map((r) => r.tableId))];
    const tables =
      tableIds.length === 0
        ? []
        : await this.prisma.table.findMany({
            where: { id: { in: tableIds } },
            select: { id: true, hostId: true },
          });
    const hostByTable = new Map(tables.map((t) => [t.id, t.hostId]));

    const fromHost: number[] = [];
    const fromGuests: number[] = [];
    for (const r of rows) {
      const tableHostId = hostByTable.get(r.tableId);
      if (tableHostId != null && r.reviewerId === tableHostId) {
        fromHost.push(r.rating);
      } else {
        fromGuests.push(r.rating);
      }
    }
    // Average only over ratings that were actually submitted — never pad with
    // missing reviewers (4 possible guests, 3 submitted → divide by 3).
    const avgOf = (xs: number[]) =>
      xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

    const hostWrittenAvg = avgOf(fromHost);
    const guestWrittenAvg = avgOf(fromGuests);
    let overallAvg = 0;
    if (hostWrittenAvg != null && guestWrittenAvg != null) {
      overallAvg = 0.5 * hostWrittenAvg + 0.5 * guestWrittenAvg;
    } else if (hostWrittenAvg != null) {
      overallAvg = hostWrittenAvg;
    } else if (guestWrittenAvg != null) {
      overallAvg = guestWrittenAvg;
    }

    return {
      overallRating: {
        avg: round1(overallAvg),
        count: rows.length,
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

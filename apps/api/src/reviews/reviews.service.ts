import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';

const NAME_SELECT = { id: true, firstName: true, lastInitial: true };
const round1 = (n: number | null) => (n == null ? 0 : Math.round(n * 10) / 10);

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Who the current user can review for a table (host→guests, guest→host). */
  async targets(userId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');
    const happened = table.startAt.getTime() < Date.now();
    const isHost = table.hostId === userId;
    const myReq = await this.prisma.tableJoinRequest.findUnique({
      where: { tableId_userId: { tableId, userId } },
    });
    const isGuest = myReq?.status === 'APPROVED';
    if (!isHost && !isGuest) return { eligible: false, happened, targets: [] };

    let subjects: {
      subjectId: string;
      name: string;
      role: 'HOST' | 'GUEST';
    }[] = [];
    if (isHost) {
      const approved = await this.prisma.tableJoinRequest.findMany({
        where: { tableId, status: 'APPROVED' },
      });
      const users = await this.prisma.user.findMany({
        where: { id: { in: approved.map((r) => r.userId) } },
        select: NAME_SELECT,
      });
      subjects = users.map((u) => ({
        subjectId: u.id,
        name: `${u.firstName ?? 'Guest'} ${u.lastInitial ?? ''}`.trim(),
        role: 'GUEST',
      }));
    } else {
      const host = await this.prisma.user.findUnique({
        where: { id: table.hostId },
        select: NAME_SELECT,
      });
      subjects = [
        {
          subjectId: table.hostId,
          name: `${host?.firstName ?? 'Host'} ${host?.lastInitial ?? ''}`.trim(),
          role: 'HOST',
        },
      ];
    }

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
    const isHost = table.hostId === userId;
    const myReq = await this.prisma.tableJoinRequest.findUnique({
      where: { tableId_userId: { tableId, userId } },
    });
    const isGuest = myReq?.status === 'APPROVED';
    if (!isHost && !isGuest) {
      throw new ForbiddenException(
        'Only the host and guests can review this table',
      );
    }

    let role: 'HOST' | 'GUEST';
    if (isHost) {
      const sreq = await this.prisma.tableJoinRequest.findUnique({
        where: { tableId_userId: { tableId, userId: dto.subjectId } },
      });
      if (sreq?.status !== 'APPROVED') {
        throw new BadRequestException('That guest was not part of this table');
      }
      role = 'GUEST';
    } else {
      if (dto.subjectId !== table.hostId) {
        throw new BadRequestException('You can only review the host');
      }
      role = 'HOST';
    }

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
      'You got a new review ⭐',
      'Someone left you a review after a table.',
      { tableId },
    );
    return review;
  }

  /** Public reputation for a user: host + guest averages and recent reviews. */
  async reputation(userId: string) {
    const [hostAgg, guestAgg, recent] = await Promise.all([
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
      this.prisma.review.findMany({
        where: { subjectId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    const reviewers = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(recent.map((r) => r.reviewerId))] } },
      select: NAME_SELECT,
    });
    const byId = new Map(reviewers.map((u) => [u.id, u]));
    return {
      hostRating: {
        avg: round1(hostAgg._avg.rating),
        count: hostAgg._count._all,
      },
      guestRating: {
        avg: round1(guestAgg._avg.rating),
        count: guestAgg._count._all,
      },
      recent: recent.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        role: r.role,
        createdAt: r.createdAt.toISOString(),
        reviewer: {
          firstName: byId.get(r.reviewerId)?.firstName ?? null,
          lastInitial: byId.get(r.reviewerId)?.lastInitial ?? null,
        },
      })),
    };
  }
}

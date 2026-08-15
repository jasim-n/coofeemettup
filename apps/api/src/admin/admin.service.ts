import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService, type MailProvider } from '../mail/mail.service';
import { TablesService } from '../tables/tables.service';
import { CacheService } from '../redis/cache.service';
import { Prisma } from '../../generated/prisma/client';
import type {
  AttendanceStatus,
  UserStatus,
  Role,
  TableStatus,
} from '../../generated/prisma/client';

const SLIM_USER = {
  id: true,
  username: true,
  firstName: true,
  lastInitial: true,
  photoUrl: true,
} as const;

const NO_SHOW_PENALTY = 10;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly tables: TablesService,
    private readonly cache: CacheService,
  ) {}

  // ── Mail provider (OTP sender) ──────────────────────────────────────────────

  mailProviderStatus() {
    return this.mail.status();
  }

  async setMailProvider(provider: MailProvider) {
    if (!this.mail.configuredProviders().includes(provider)) {
      throw new BadRequestException(
        `Provider "${provider}" has no SMTP credentials configured.`,
      );
    }
    await this.mail.setProvider(provider);
    return this.mail.status();
  }

  async sendTestMail(email: string) {
    try {
      const provider = await this.mail.sendTest(email);
      return { ok: true, provider };
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Test email failed',
      );
    }
  }

  async listUsers({
    q,
    limit = 30,
    offset = 0,
  }: {
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    const where = q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' as const } },
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { lastInitial: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const select = {
      id: true,
      username: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      lastInitial: true,
      role: true,
      status: true,
      canHost: true,
      verificationStatus: true,
      reliabilityScore: true,
      city: true,
      photoUrl: true,
      createdAt: true,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async setUserStatus(actorId: string, targetId: string, status: UserStatus) {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot change your own status');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === 'ADMIN' && status !== 'ACTIVE') {
      const otherActiveAdmins = await this.prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE', id: { not: targetId } },
      });
      if (otherActiveAdmins < 1) {
        throw new BadRequestException(
          'Cannot suspend/ban the last active admin',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastInitial: true,
        role: true,
        status: true,
        canHost: true,
        verificationStatus: true,
        reliabilityScore: true,
        city: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    void this.audit.log({
      actorId,
      action: `user.status.${status}`,
      targetType: 'user',
      targetId,
    });

    return updated;
  }

  async setUserRole(actorId: string, targetId: string, role: Role) {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const otherActiveAdmins = await this.prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE', id: { not: targetId } },
      });
      if (otherActiveAdmins < 1) {
        throw new BadRequestException('Cannot demote the last admin');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastInitial: true,
        role: true,
        status: true,
        canHost: true,
        verificationStatus: true,
        reliabilityScore: true,
        city: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    void this.audit.log({
      actorId,
      action: `user.role.${role}`,
      targetType: 'user',
      targetId,
    });

    return updated;
  }

  async revokeVerification(actorId: string, targetId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { verificationStatus: 'PENDING' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastInitial: true,
        role: true,
        status: true,
        canHost: true,
        verificationStatus: true,
        reliabilityScore: true,
        city: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    void this.audit.log({
      actorId,
      action: 'verification.revoked',
      targetType: 'user',
      targetId,
    });

    return updated;
  }

  async resolveReport(
    actorId: string,
    reportId: string,
    status: 'RESOLVED' | 'ACTIONED',
    banSubject?: boolean,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        subjectId: true,
        subject: { select: { role: true } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (banSubject) {
      if (report.subject.role === 'ADMIN') {
        const otherActiveAdmins = await this.prisma.user.count({
          where: {
            role: 'ADMIN',
            status: 'ACTIVE',
            id: { not: report.subjectId },
          },
        });
        if (otherActiveAdmins < 1) {
          throw new BadRequestException(
            'Cannot suspend/ban the last active admin',
          );
        }
      }
      await this.prisma.user.update({
        where: { id: report.subjectId },
        data: { status: 'BANNED' },
      });
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status, resolvedAt: new Date() },
      include: {
        reporter: true,
        subject: true,
      },
    });

    void this.audit.log({
      actorId,
      action: `report.${status}`,
      targetType: 'report',
      targetId: reportId,
      meta: banSubject
        ? { banSubject: true, subjectId: report.subjectId }
        : undefined,
    });

    return updated;
  }

  async setHost(userId: string, canHost: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { canHost },
      select: { id: true, phone: true, canHost: true },
    });
  }

  async setHostByPhone(phone: string, canHost: boolean) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('No user with that phone number');
    return this.prisma.user.update({
      where: { id: user.id },
      data: { canHost },
      select: { id: true, phone: true, canHost: true },
    });
  }

  listEventBookings(eventId: string) {
    return this.prisma.booking.findMany({
      where: { eventId, paymentStatus: 'PAID' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createGroup(eventId: string, userIds: string[]) {
    const paid = await this.prisma.booking.findMany({
      where: { eventId, paymentStatus: 'PAID', userId: { in: userIds } },
      select: { userId: true },
    });
    if (paid.length !== userIds.length) {
      throw new BadRequestException(
        'Every member must have a paid booking for this event',
      );
    }
    return this.prisma.groupAssignment.create({
      data: { eventId, userIds, algoVersion: 'manual' },
    });
  }

  listGroups(eventId: string) {
    return this.prisma.groupAssignment.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAttendance(bookingId: string, status: AttendanceStatus) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { attendanceStatus: status },
    });

    if (status === 'NO_SHOW') {
      const user = await this.prisma.user.findUnique({
        where: { id: booking.userId },
      });
      const next = Math.max(
        0,
        (user?.reliabilityScore ?? 100) - NO_SHOW_PENALTY,
      );
      await this.prisma.user.update({
        where: { id: booking.userId },
        data: { reliabilityScore: next },
      });
    }
    return updated;
  }

  async listAllTables() {
    const rows = await this.prisma.table.findMany({
      include: {
        cafe: true,
        host: { select: { id: true, firstName: true, lastInitial: true } },
        _count: { select: { requests: { where: { status: 'PENDING' } } } },
      },
      orderBy: { startAt: 'desc' },
    });
    return rows.map(({ _count, ...t }) => ({
      ...t,
      pendingRequests: _count.requests,
    }));
  }

  async cancelTable(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Table not found');
    await this.prisma.table.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    const guests = await this.prisma.tableJoinRequest.findMany({
      where: { tableId: id },
      select: { userId: true },
    });
    void this.cache.invalidateTableMutation({
      hostId: table.hostId,
      userIds: guests.map((g) => g.userId),
    });
    return { ok: true as const };
  }

  // ── Table moderation ──────────────────────────────────────────────────────

  async listParticipants(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        seats: true,
        seatsLeft: true,
        hostId: true,
      },
    });
    if (!table) throw new NotFoundException('Table not found');

    const requests = await this.prisma.tableJoinRequest.findMany({
      where: { tableId, status: { in: ['APPROVED', 'PENDING'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    // Batch-fetch users (host + participants) — no N+1
    const userIds = Array.from(
      new Set([table.hostId, ...requests.map((r) => r.userId)]),
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: SLIM_USER,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      host: userMap.get(table.hostId) ?? null,
      seats: table.seats,
      seatsLeft: table.seatsLeft,
      participants: requests.map((r) => ({
        user: userMap.get(r.userId) ?? null,
        status: r.status,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt,
      })),
    };
  }

  async removeParticipant(actorId: string, tableId: string, userId: string) {
    return this.tables.removeParticipant(actorId, tableId, userId, true);
  }

  async closeTableChat(actorId: string, tableId: string) {
    return this.tables.closeChat(actorId, tableId, true);
  }

  async deleteTable(actorId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Table not found');

    const guests = await this.prisma.tableJoinRequest.findMany({
      where: { tableId },
      select: { userId: true },
    });

    await this.prisma.$transaction([
      this.prisma.tableJoinRequest.deleteMany({ where: { tableId } }),
      this.prisma.review.deleteMany({ where: { tableId } }),
      this.prisma.groupMessage.deleteMany({ where: { groupId: tableId } }),
      // TableInvite cascades via onDelete:Cascade on the Table FK
      this.prisma.table.delete({ where: { id: tableId } }),
    ]);

    void this.audit.log({
      actorId,
      action: 'table.deleted',
      targetType: 'table',
      targetId: tableId,
    });

    void this.cache.invalidateTableMutation({
      hostId: table.hostId,
      userIds: guests.map((g) => g.userId),
    });

    return { ok: true as const };
  }

  /** Manual Redis cache flush (admin). Mutations also invalidate automatically. */
  async invalidateCache(
    actorId: string,
    scope: 'all' | 'tables' | 'tables:browse' | 'tables:mine',
    userId?: string,
  ) {
    let removed = 0;
    if (scope === 'all' || scope === 'tables') {
      removed = await this.cache.invalidateAllTables();
    } else if (scope === 'tables:browse') {
      await this.cache.invalidateBrowse();
      removed = 1;
    } else if (scope === 'tables:mine') {
      if (userId) {
        await this.cache.invalidateUserLists(userId);
        removed = 3;
      } else {
        removed = await this.cache.delByPrefix(
          `${CacheService.TABLES_PREFIX}mine:`,
        );
      }
    }

    void this.audit.log({
      actorId,
      action: 'cache.invalidated',
      targetType: 'cache',
      targetId: scope,
      meta: { userId: userId ?? null, removed },
    });

    return { ok: true as const, scope, removed };
  }

  // ── Review moderation ─────────────────────────────────────────────────────

  async listReviews({
    limit = 30,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          rating: true,
          comment: true,
          role: true,
          createdAt: true,
          tableId: true,
          reviewerId: true,
          subjectId: true,
        },
      }),
      this.prisma.review.count(),
    ]);

    if (reviews.length === 0) return { reviews: [], total };

    // Batch-fetch users and tables — no N+1
    const userIds = Array.from(
      new Set([
        ...reviews.map((r) => r.reviewerId),
        ...reviews.map((r) => r.subjectId),
      ]),
    );
    const tableIds = Array.from(new Set(reviews.map((r) => r.tableId)));

    const [users, tables] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: SLIM_USER,
      }),
      this.prisma.table.findMany({
        where: { id: { in: tableIds } },
        select: { id: true, title: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const tableMap = new Map(tables.map((t) => [t.id, t.title ?? null]));

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        role: r.role,
        createdAt: r.createdAt,
        reviewer: userMap.get(r.reviewerId) ?? null,
        subject: userMap.get(r.subjectId) ?? null,
        tableTitle: tableMap.get(r.tableId) ?? null,
      })),
      total,
    };
  }

  async deleteReview(actorId: string, id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id } });

    void this.audit.log({
      actorId,
      action: 'review.deleted',
      targetType: 'review',
      targetId: id,
    });

    return { ok: true as const };
  }

  // ── Featured event photos (home "Featured" section) ────────────────────────

  /** Events (tables) for the featured picker, with filters. */
  async eventsForFeaturing(
    userId: string,
    opts: {
      q?: string;
      status?: string;
      from?: string;
      to?: string;
      hasPhotos?: boolean;
      bookmarked?: boolean;
    },
  ) {
    const where: Prisma.TableWhereInput = {};
    const q = opts.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { venueName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (opts.status) where.status = opts.status as TableStatus;
    if (opts.from || opts.to) {
      where.startAt = {
        ...(opts.from ? { gte: new Date(opts.from) } : {}),
        ...(opts.to ? { lte: new Date(opts.to) } : {}),
      };
    }
    if (opts.hasPhotos) where.images = { some: {} };
    if (opts.bookmarked) {
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { savedTableIds: true },
      });
      where.id = { in: me?.savedTableIds ?? [] };
    }

    const tables = await this.prisma.table.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        startAt: true,
        venueName: true,
        _count: { select: { images: true } },
      },
      orderBy: { startAt: 'desc' },
      take: 100,
    });

    const ids = tables.map((t) => t.id);
    const featured = ids.length
      ? await this.prisma.tableImage.groupBy({
          by: ['tableId'],
          where: { tableId: { in: ids }, featured: true },
          _count: { _all: true },
        })
      : [];
    const featuredBy = new Map(featured.map((f) => [f.tableId, f._count._all]));

    return tables.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      status: t.status,
      startAt: t.startAt.toISOString(),
      venueName: t.venueName,
      imageCount: t._count.images,
      featuredCount: featuredBy.get(t.id) ?? 0,
    }));
  }

  /** All photos of a table (admin view), including the featured flag. */
  listTableImages(tableId: string) {
    return this.prisma.tableImage.findMany({
      where: { tableId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setImageFeatured(actorId: string, imageId: string, featured: boolean) {
    const img = await this.prisma.tableImage.findUnique({
      where: { id: imageId },
    });
    if (!img) throw new NotFoundException('Image not found');
    await this.prisma.tableImage.update({
      where: { id: imageId },
      data: { featured },
    });
    void this.audit.log({
      actorId,
      action: featured ? 'image.featured' : 'image.unfeatured',
      targetType: 'tableImage',
      targetId: imageId,
    });
    return { ok: true as const };
  }

  /**
   * Operational dashboard + the §7 Go/No-Go gate:
   * ≥40% of first-timers book a second event, plus a referral signal,
   * across ≥5 held (completed) events.
   */
  async getMetrics() {
    const pct = (n: number, d: number) =>
      d === 0 ? 0 : Math.round((n / d) * 100);

    const [
      eventsByStatus,
      bookingsByStatus,
      attended,
      noShow,
      fb,
      comeAgainYes,
      inviteYes,
      meetAgainAllSome,
      feltUnsafe,
      paidByUser,
    ] = await Promise.all([
      this.prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.booking.count({ where: { attendanceStatus: 'ATTENDED' } }),
      this.prisma.booking.count({ where: { attendanceStatus: 'NO_SHOW' } }),
      this.prisma.feedback.aggregate({
        _count: { _all: true },
        _avg: { enjoyment: true, nps: true, cafeRating: true },
      }),
      this.prisma.feedback.count({ where: { comeAgain: 'YES' } }),
      this.prisma.feedback.count({ where: { inviteFriend: true } }),
      this.prisma.feedback.count({
        where: { meetAgain: { in: ['ALL', 'SOME'] } },
      }),
      this.prisma.feedback.count({ where: { feltUnsafe: true } }),
      // One paid+active booking per (user,event) → count = distinct events attended.
      this.prisma.booking.groupBy({
        by: ['userId'],
        where: { paymentStatus: 'PAID', status: 'ACTIVE' },
        _count: { _all: true },
      }),
    ]);

    const eventCount = (s: string) =>
      eventsByStatus.find((e) => e.status === s)?._count._all ?? 0;
    const bookingCount = (s: string) =>
      bookingsByStatus.find((b) => b.status === s)?._count._all ?? 0;

    const fbTotal = fb._count._all;
    const round1 = (n: number | null) =>
      n == null ? 0 : Math.round(n * 10) / 10;

    const eventsHeld = eventCount('COMPLETED');
    const firstTimers = paidByUser.length;
    const repeaters = paidByUser.filter((g) => g._count._all >= 2).length;
    const repeatRatePct = pct(repeaters, firstTimers);
    const referralSignal = inviteYes > 0;

    const REPEAT_THRESHOLD = 40;
    const MIN_EVENTS = 5;
    let verdict: 'GO' | 'NO_GO' | 'INSUFFICIENT_DATA';
    if (eventsHeld < MIN_EVENTS) verdict = 'INSUFFICIENT_DATA';
    else if (repeatRatePct >= REPEAT_THRESHOLD && referralSignal)
      verdict = 'GO';
    else verdict = 'NO_GO';

    return {
      events: {
        total: eventsByStatus.reduce((s, e) => s + e._count._all, 0),
        open: eventCount('OPEN'),
        full: eventCount('FULL'),
        completed: eventsHeld,
        cancelled: eventCount('CANCELLED'),
      },
      bookings: {
        active: bookingCount('ACTIVE'),
        waitlisted: bookingCount('WAITLISTED'),
        cancelled: bookingCount('CANCELLED'),
      },
      attendance: {
        attended,
        noShow,
        showRatePct: pct(attended, attended + noShow),
      },
      feedback: {
        count: fbTotal,
        avgEnjoyment: round1(fb._avg.enjoyment),
        avgNps: round1(fb._avg.nps),
        avgCafeRating: round1(fb._avg.cafeRating),
        pctComeAgainYes: pct(comeAgainYes, fbTotal),
        pctInviteFriendYes: pct(inviteYes, fbTotal),
        pctMeetAgainAllSome: pct(meetAgainAllSome, fbTotal),
        feltUnsafe,
      },
      goNoGo: {
        verdict,
        eventsHeld,
        firstTimers,
        repeaters,
        repeatRatePct,
        referralSignal,
        threshold: { repeatRatePct: REPEAT_THRESHOLD, minEvents: MIN_EVENTS },
      },
    };
  }
}

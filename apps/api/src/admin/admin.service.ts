import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AttendanceStatus } from '../../generated/prisma/client';

const NO_SHOW_PENALTY = 10;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

const REFUND_CUTOFF_MS = 24 * 60 * 60 * 1000; // full refund only if >24h before start

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async join(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    // OPEN → a real seat; FULL → waitlist. Anything else isn't joinable.
    if (event.status !== 'OPEN' && event.status !== 'FULL') {
      throw new BadRequestException('Event is not open for booking');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.codeOfConductAt) {
      throw new ForbiddenException(
        'Please accept the Community Code of Conduct in your profile before joining.',
      );
    }
    if (event.genderTrack === 'WOMEN_ONLY' && user.gender !== 'WOMAN') {
      throw new ForbiddenException('This is a women-only meetup.');
    }
    if (event.genderTrack === 'MEN_ONLY' && user.gender !== 'MAN') {
      throw new ForbiddenException('This is a men-only meetup.');
    }

    const waitlisted = event.status === 'FULL';
    const data = {
      status: waitlisted ? ('WAITLISTED' as const) : ('ACTIVE' as const),
      paymentStatus: 'PENDING' as const,
      attendanceStatus: 'BOOKED' as const,
      amountPKR: event.pricePKR,
      paymentRef: null,
      cancelledAt: null,
      waitlistedAt: waitlisted ? new Date() : null,
    };

    // A prior cancellation leaves a row (unique on userId+eventId); reactivate it.
    const existing = await this.prisma.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing && existing.status !== 'CANCELLED') {
      throw new ConflictException(
        existing.status === 'WAITLISTED'
          ? "You're already on the waitlist for this event"
          : 'You have already joined this event',
      );
    }

    try {
      return existing
        ? await this.prisma.booking.update({
            where: { id: existing.id },
            data,
          })
        : await this.prisma.booking.create({
            data: { userId, eventId, ...data },
          });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('You have already joined this event');
      }
      throw err;
    }
  }

  /** Cancel the current user's booking: refund per 24h cutoff, release seat, promote waitlist. */
  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true },
    });
    if (!booking || booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('This booking is already cancelled');
    }

    const event = booking.event;
    const seatHeld =
      booking.status === 'ACTIVE' && booking.paymentStatus === 'PAID';
    const refundEligible =
      booking.paymentStatus === 'PAID' &&
      Date.now() < event.startAt.getTime() - REFUND_CUTOFF_MS;

    // Reverse the charge with the gateway before flipping DB state (mock: no-op).
    if (refundEligible) {
      await this.payments.refund(booking.paymentRef, booking.amountPKR);
    }

    const promotedUserId = await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          ...(refundEligible ? { paymentStatus: 'REFUNDED' as const } : {}),
        },
      });

      if (!seatHeld) return null;

      // Release the claimed seat and reopen the event if it was full.
      await tx.event.update({
        where: { id: event.id },
        data: {
          seatsLeft: { increment: 1 },
          ...(event.status === 'FULL' ? { status: 'OPEN' as const } : {}),
        },
      });

      // Promote the earliest waitlister (seat is not held — they must pay).
      const next = await tx.booking.findFirst({
        where: { eventId: event.id, status: 'WAITLISTED' },
        orderBy: { waitlistedAt: 'asc' },
      });
      if (!next) return null;
      await tx.booking.update({
        where: { id: next.id },
        data: { status: 'ACTIVE', waitlistedAt: null },
      });
      return next.userId;
    });

    void this.audit.log({
      actorId: userId,
      action: 'booking.cancelled',
      targetType: 'booking',
      targetId: booking.id,
      meta: { eventId: event.id, refunded: refundEligible },
    });
    void this.notifications.create(
      userId,
      'booking.cancelled',
      'Booking cancelled',
      refundEligible
        ? 'Your booking is cancelled and a full refund is on its way.'
        : booking.paymentStatus === 'PAID'
          ? 'Your booking is cancelled. As it was within 24 hours of the event, no refund applies.'
          : 'Your booking is cancelled.',
      { eventId: event.id },
    );
    if (promotedUserId) {
      void this.notifications.create(
        promotedUserId,
        'waitlist.promoted',
        'A spot opened! ☕',
        'You moved off the waitlist — pay now to claim your seat before someone else does.',
        { eventId: event.id },
      );
    }

    return this.prisma.booking.findUnique({ where: { id: booking.id } });
  }

  listMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { event: { include: { cafe: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** The current user's group co-members for an event (privacy-safe: no contact info). */
  async myGroup(
    userId: string,
    eventId: string,
  ): Promise<{ members: unknown[] }> {
    const groups = await this.prisma.groupAssignment.findMany({
      where: { eventId },
    });
    const mine = groups.find((g) => g.userIds.includes(userId));
    if (!mine) return { members: [] };
    const others = mine.userIds.filter((id) => id !== userId);
    const members = await this.prisma.user.findMany({
      where: { id: { in: others } },
      select: { id: true, firstName: true, lastInitial: true, interests: true },
    });
    return { members };
  }
}

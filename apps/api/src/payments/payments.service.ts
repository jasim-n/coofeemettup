import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Checkout, PaymentProvider, WebhookResult } from './payment.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Start a hosted-checkout session for a pending booking. */
  async initiate(
    userId: string,
    bookingId: string,
    returnUrl: string,
  ): Promise<Checkout> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.userId !== userId)
      throw new NotFoundException('Booking not found');
    if (booking.paymentStatus === 'PAID')
      throw new BadRequestException('Already paid');

    const checkout = await this.provider.createCheckout({
      bookingId,
      amountPKR: booking.amountPKR,
      returnUrl,
    });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentRef: checkout.paymentRef },
    });
    return checkout;
  }

  /** Handle a gateway webhook: verify signature, confirm on PAID. */
  async handleWebhook(
    signature: string | undefined,
    paymentRef: string,
    status: string,
  ): Promise<{ ok: true }> {
    let result: WebhookResult;
    try {
      result = this.provider.verifyWebhook(signature, paymentRef, status);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (result.status === 'PAID') await this.confirmPaid(result.paymentRef);
    return { ok: true };
  }

  /** Atomically claim a seat and mark the booking paid; reject if the event is full. */
  private async confirmPaid(paymentRef: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { paymentRef },
    });
    if (!booking) throw new NotFoundException('Booking not found for payment');
    if (booking.paymentStatus === 'PAID') return;

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.event.updateMany({
        where: { id: booking.eventId, seatsLeft: { gt: 0 } },
        data: { seatsLeft: { decrement: 1 } },
      });
      if (claimed.count === 0) throw new ConflictException('Event is full');

      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'PAID' },
      });

      const event = await tx.event.findUnique({
        where: { id: booking.eventId },
      });
      if (event && event.seatsLeft <= 0) {
        await tx.event.update({
          where: { id: event.id },
          data: { status: 'FULL' },
        });
      }
    });

    void this.audit.log({
      actorId: booking.userId,
      action: 'booking.paid',
      targetType: 'booking',
      targetId: booking.id,
      meta: { eventId: booking.eventId, amountPKR: booking.amountPKR },
    });
    void this.notifications.create(
      booking.userId,
      'booking.paid',
      "You're in! 🎉",
      'Your spot for the meetup is confirmed. See you there!',
      { eventId: booking.eventId },
    );
  }
}

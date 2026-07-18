import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { InitiatePaymentDto } from '../payments/dto/initiate-payment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';

@Controller()
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  @Post('events/:eventId/join')
  @HttpCode(201)
  async join(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    const booking = await this.bookings.join(user.id, eventId);
    void this.audit.log({
      actorId: user.id,
      action: 'booking.join',
      targetType: 'event',
      targetId: eventId,
      meta: { bookingId: booking.id },
    });
    return booking;
  }

  /** Starts a hosted-checkout session; returns { checkoutUrl } for the client to redirect to. */
  @Post('bookings/:id/pay')
  @HttpCode(200)
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.payments.initiate(user.id, id, dto.returnUrl);
  }

  @Get('bookings/me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.bookings.listMine(user.id);
  }

  @Get('events/:eventId/my-group')
  myGroup(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.bookings.myGroup(user.id, eventId);
  }
}

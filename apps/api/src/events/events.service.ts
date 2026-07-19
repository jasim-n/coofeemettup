import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { GenderTrack } from '../../generated/prisma/client';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateEventDto) {
    const cafe = await this.prisma.cafe.findUnique({
      where: { id: dto.cafeId },
    });
    if (!cafe) throw new NotFoundException('Cafe not found');
    return this.prisma.event.create({
      data: {
        cafeId: dto.cafeId,
        title: dto.title,
        startAt: new Date(dto.startAt),
        genderTrack: dto.genderTrack,
        area: dto.area,
        capacity: dto.capacity,
        pricePKR: dto.pricePKR,
        seatsLeft: dto.capacity,
        status: 'OPEN',
        venueName: dto.venueName ?? null,
        venueAddress: dto.venueAddress ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
      },
    });
  }

  browse(filter: { area?: string; genderTrack?: GenderTrack }) {
    return this.prisma.event.findMany({
      where: {
        status: 'OPEN',
        ...(filter.area ? { area: filter.area } : {}),
        ...(filter.genderTrack ? { genderTrack: filter.genderTrack } : {}),
      },
      orderBy: { startAt: 'asc' },
      include: { cafe: true },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { cafe: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  listAll() {
    return this.prisma.event.findMany({
      orderBy: { startAt: 'desc' },
      include: { cafe: true, _count: { select: { bookings: true } } },
    });
  }

  /** Admin/organizer cancels an event: refund every paid booking, notify all, mark CANCELLED. */
  async cancelEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === 'CANCELLED') {
      throw new BadRequestException('Event is already cancelled');
    }
    if (event.status === 'COMPLETED') {
      throw new BadRequestException('A completed event cannot be cancelled');
    }

    // Every live booking (active or waitlisted) gets cancelled.
    const affected = await this.prisma.booking.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
    });

    // Org-initiated cancellation → always a full refund for anyone who paid.
    for (const b of affected) {
      if (b.paymentStatus === 'PAID') {
        await this.payments.refund(b.paymentRef, b.amountPKR);
      }
    }

    await this.prisma.$transaction([
      this.prisma.booking.updateMany({
        where: { eventId, status: { not: 'CANCELLED' }, paymentStatus: 'PAID' },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
          cancelledAt: new Date(),
        },
      }),
      this.prisma.booking.updateMany({
        where: {
          eventId,
          status: { not: 'CANCELLED' },
          paymentStatus: { not: 'PAID' },
        },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      }),
      this.prisma.event.update({
        where: { id: eventId },
        data: { status: 'CANCELLED' },
      }),
    ]);

    await this.notifications.notifyMany(
      affected.map((b) => b.userId),
      'event.cancelled',
      'Meetup cancelled',
      'Unfortunately this meetup has been cancelled. Any payment has been fully refunded.',
      { eventId },
    );

    return this.prisma.event.findUnique({ where: { id: eventId } });
  }
}

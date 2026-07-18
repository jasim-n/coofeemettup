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
}

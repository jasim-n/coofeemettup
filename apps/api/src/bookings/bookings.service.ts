import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async join(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'OPEN') {
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

    try {
      return await this.prisma.booking.create({
        data: {
          userId,
          eventId,
          amountPKR: event.pricePKR,
          paymentStatus: 'PENDING',
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('You have already joined this event');
      }
      throw err;
    }
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

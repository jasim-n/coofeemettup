import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, eventId: string, dto: SubmitFeedbackDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (!booking || booking.paymentStatus !== 'PAID') {
      throw new BadRequestException('You can only review an event you booked');
    }

    const data = { ...dto, feltUnsafe: dto.feltUnsafe ?? false };
    return this.prisma.feedback.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, ...data },
      update: data,
    });
  }

  getMine(userId: string, eventId: string) {
    return this.prisma.feedback.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
  }
}

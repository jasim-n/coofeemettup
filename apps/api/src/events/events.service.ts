import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GenderTrack } from '../../generated/prisma/client';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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
}

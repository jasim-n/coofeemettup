import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCafeDto } from './dto/create-cafe.dto';
import { UpdateCafeDto } from './dto/update-cafe.dto';

@Injectable()
export class CafesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.cafe.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { events: true } } },
    });
  }

  async get(id: string) {
    const cafe = await this.prisma.cafe.findUnique({ where: { id } });
    if (!cafe) throw new NotFoundException('Cafe not found');
    return cafe;
  }

  create(dto: CreateCafeDto) {
    return this.prisma.cafe.create({
      data: {
        name: dto.name,
        area: dto.area,
        address: dto.address ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        deadHourSlots: dto.deadHourSlots ?? [],
        compTerms: dto.compTerms ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateCafeDto) {
    await this.get(id); // 404 if missing
    return this.prisma.cafe.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
        ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
        ...(dto.deadHourSlots !== undefined
          ? { deadHourSlots: dto.deadHourSlots }
          : {}),
        ...(dto.compTerms !== undefined ? { compTerms: dto.compTerms } : {}),
      },
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.get(id); // 404 if missing
    // A cafe with events can't be deleted (FK + it would orphan bookings/history).
    const events = await this.prisma.event.count({ where: { cafeId: id } });
    if (events > 0) {
      throw new ConflictException(
        `Can't delete this cafe — it has ${events} event(s). Cancel or reassign them first.`,
      );
    }
    await this.prisma.cafe.delete({ where: { id } });
    return { ok: true };
  }
}

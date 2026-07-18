import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  upsertByPhone(phone: string) {
    return this.prisma.user.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    const { agreeCodeOfConduct, ...rest } = dto;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(agreeCodeOfConduct ? { codeOfConductAt: new Date() } : {}),
      },
    });
  }
}

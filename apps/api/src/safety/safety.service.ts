import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async report(
    reporterId: string,
    subjectId: string,
    reason: string,
    eventId?: string,
  ) {
    if (reporterId === subjectId) {
      throw new BadRequestException("You can't report yourself");
    }
    const subject = await this.prisma.user.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('User not found');
    return this.prisma.report.create({
      data: { reporterId, subjectId, reason, eventId: eventId ?? null },
    });
  }

  async block(userId: string, targetId: string): Promise<{ ok: true }> {
    if (userId === targetId)
      throw new BadRequestException("You can't block yourself");
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('User not found');
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (me && !me.blockedUserIds.includes(targetId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { blockedUserIds: { push: targetId } },
      });
    }
    return { ok: true };
  }

  async unblock(userId: string, targetId: string): Promise<{ ok: true }> {
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (me) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          blockedUserIds: {
            set: me.blockedUserIds.filter((id) => id !== targetId),
          },
        },
      });
    }
    return { ok: true };
  }

  async listBlocks(userId: string): Promise<{ blockedUserIds: string[] }> {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { blockedUserIds: true },
    });
    return { blockedUserIds: me?.blockedUserIds ?? [] };
  }

  listReports() {
    return this.prisma.report.findMany({
      include: { reporter: true, subject: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

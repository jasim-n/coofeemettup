import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record an uploaded CNIC image and put the user back into the review queue. */
  async submit(
    userId: string,
    relativePath: string,
  ): Promise<{ status: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { cnicImagePath: relativePath, verificationStatus: 'PENDING' },
    });
    return { status: 'PENDING' };
  }

  listPending() {
    return this.prisma.user.findMany({
      where: { cnicImagePath: { not: null }, verificationStatus: 'PENDING' },
      select: { id: true, phone: true, firstName: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async imageAbsPath(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cnicImagePath: true },
    });
    if (!user?.cnicImagePath) throw new NotFoundException('No CNIC on file');
    // cnicImagePath is a server-generated relative path (e.g. "cnic/<uuid>.jpg").
    return join(process.cwd(), 'uploads', user.cnicImagePath);
  }

  async verify(userId: string, approve: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.cnicImagePath)
      throw new BadRequestException('User has not submitted a CNIC');
    return this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: approve ? 'VERIFIED' : 'REJECTED' },
      select: { id: true, verificationStatus: true },
    });
  }
}

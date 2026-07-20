import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Unambiguous alphabet (no O/0/I/1) for shareable referral codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Find-or-create by phone; on first sign-up, capture a valid referral code. */
  async upsertByPhone(phone: string, referredByCode?: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) return existing;

    // Only honour a referral code that belongs to a real, different user.
    let referredBy: string | null = null;
    if (referredByCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: referredByCode },
      });
      if (referrer && referrer.phone !== phone) referredBy = referredByCode;
    }
    return this.prisma.user.create({
      data: { phone, referredByCode: referredBy },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** The user's shareable code (generated once) + how many signed up with it. */
  async getReferral(userId: string): Promise<{ code: string; count: number }> {
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    for (let attempt = 0; attempt < 5 && !user.referralCode; attempt++) {
      try {
        user = await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: randomCode() },
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    const count = await this.prisma.user.count({
      where: { referredByCode: user.referralCode },
    });
    return { code: user.referralCode!, count };
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

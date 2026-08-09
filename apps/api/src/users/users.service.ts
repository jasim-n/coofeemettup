import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { toPublicProfile } from './user.serializer';

type ConnectionState = 'none' | 'pending_sent' | 'pending_received' | 'connected';

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

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  /** Create a new user identified by email + phone (signup path). */
  async createWithEmail(email: string, phone: string, referredByCode?: string) {
    // Only honour a referral code that belongs to a real, different user.
    let referredBy: string | null = null;
    if (referredByCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: referredByCode },
      });
      if (referrer && referrer.email !== email) referredBy = referredByCode;
    }
    return this.prisma.user.create({
      data: { email, phone, referredByCode: referredBy },
    });
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

  async getPublicProfile(viewerId: string, targetId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!u) throw new NotFoundException('User not found');

    if (u.blockedUserIds.includes(viewerId)) throw new NotFoundException('User not found');

    const [hosted, joined, connections, pair] = await Promise.all([
      this.prisma.table.count({ where: { hostId: targetId } }),
      this.prisma.tableJoinRequest.count({ where: { userId: targetId, status: 'APPROVED' } }),
      this.prisma.connection.count({
        where: { status: 'ACCEPTED', OR: [{ requesterId: targetId }, { addresseeId: targetId }] },
      }),
      viewerId === targetId
        ? Promise.resolve(null)
        : this.prisma.connection.findFirst({
            where: {
              OR: [
                { requesterId: viewerId, addresseeId: targetId },
                { requesterId: targetId, addresseeId: viewerId },
              ],
            },
          }),
    ]);

    let connectionState: ConnectionState;
    if (!pair) {
      connectionState = 'none';
    } else if (pair.status === 'ACCEPTED') {
      connectionState = 'connected';
    } else if (pair.status === 'PENDING' && pair.addresseeId === viewerId) {
      connectionState = 'pending_received';
    } else if (pair.status === 'PENDING' && pair.requesterId === viewerId) {
      connectionState = 'pending_sent';
    } else {
      connectionState = 'none';
    }

    return {
      user: toPublicProfile(u),
      stats: { hosted, joined, connections },
      connectionState,
      isSelf: viewerId === targetId,
    };
  }

  async setPhoto(userId: string, photoUrl: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
    });
    return updated;
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

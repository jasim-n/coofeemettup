import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { toPublicProfile, toPublicUser } from './user.serializer';
import { validateUsername } from './username.util';

type ConnectionState =
  'none' | 'pending_sent' | 'pending_received' | 'connected';

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

  /**
   * Search active members by @username only (invite picker / people search).
   * Never matches email, phone, real name, or occupation. Excludes the viewer.
   * Requires a 2+ char handle query (optional leading @).
   */
  async searchUsers(viewerId: string, q: string, limit = 20) {
    const term = q.trim().replace(/^@/, '');
    if (term.length < 2) return [];
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: viewerId },
        status: 'ACTIVE',
        username: { contains: term, mode: 'insensitive' },
      },
      orderBy: { username: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return users.map(toPublicUser);
  }

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

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async setPassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /** True if no other user already holds this (normalized) handle. */
  async isUsernameAvailable(username: string) {
    return !(await this.prisma.user.findUnique({ where: { username } }));
  }

  /**
   * Create a new user identified by email + phone + a public @handle and their
   * (private) real name. `lastInitial` is derived from lastName for admin views.
   */
  async createWithEmail(
    email: string,
    phone: string,
    profile: { firstName: string; lastName: string; username: string },
    referredByCode?: string,
    passwordHash?: string,
  ) {
    // Only honour a referral code that belongs to a real, different user.
    let referredBy: string | null = null;
    if (referredByCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: referredByCode },
      });
      if (referrer && referrer.email !== email) referredBy = referredByCode;
    }
    return this.prisma.user.create({
      data: {
        email,
        passwordHash: passwordHash ?? null,
        phone,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        lastInitial: profile.lastName.charAt(0).toUpperCase() || null,
        referredByCode: referredBy,
      },
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

  async getPublicProfile(
    viewer: { id: string; role: Role },
    targetId: string,
  ) {
    const viewerId = viewer.id;
    if (
      viewerId !== targetId &&
      viewer.role !== 'ADMIN' &&
      viewer.role !== 'ORGANIZER'
    ) {
      throw new ForbiddenException('Only administrators can view member profiles');
    }

    const u = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!u) throw new NotFoundException('User not found');

    if (u.blockedUserIds.includes(viewerId))
      throw new NotFoundException('User not found');

    const [hosted, joined, connections, pair] = await Promise.all([
      this.prisma.table.count({ where: { hostId: targetId } }),
      this.prisma.tableJoinRequest.count({
        where: { userId: targetId, status: 'APPROVED' },
      }),
      this.prisma.connection.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: targetId }, { addresseeId: targetId }],
        },
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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { agreeCodeOfConduct, username, lastName, ...rest } = dto;

    // Handle change: validate format + enforce global uniqueness.
    let usernameData: { username: string } | Record<string, never> = {};
    if (username !== undefined) {
      let normalized: string;
      try {
        normalized = validateUsername(username);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Invalid handle',
        );
      }
      const holder = await this.prisma.user.findUnique({
        where: { username: normalized },
      });
      if (holder && holder.id !== userId) {
        throw new ConflictException('That handle is taken');
      }
      usernameData = { username: normalized };
    }

    // Keep the admin-facing lastInitial in sync with the private lastName.
    const lastNameData =
      lastName !== undefined
        ? { lastName, lastInitial: lastName.charAt(0).toUpperCase() || null }
        : {};

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...usernameData,
        ...lastNameData,
        ...(agreeCodeOfConduct ? { codeOfConductAt: new Date() } : {}),
      },
    });
  }
}

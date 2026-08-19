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

  /**
   * Private “how you show up” mix for Future labs (self only).
   * Combines table categories, declared interests, reliability, and peer ratings.
   */
  async getInterestMix(userId: string) {
    const [user, joins, hosted, reviewAggHost, reviewAggGuest, reviewRows] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            interests: true,
            reliabilityScore: true,
            intents: true,
            socialEnergy: true,
          },
        }),
        this.prisma.tableJoinRequest.findMany({
          where: { userId, status: 'APPROVED' },
          select: { table: { select: { id: true, category: true } } },
        }),
        this.prisma.table.findMany({
          where: { hostId: userId },
          select: { id: true, category: true },
        }),
        this.prisma.review.aggregate({
          where: { subjectId: userId, role: 'HOST' },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        this.prisma.review.aggregate({
          where: { subjectId: userId, role: 'GUEST' },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        this.prisma.review.findMany({
          where: { subjectId: userId },
          select: { rating: true },
        }),
      ]);

    if (!user) throw new NotFoundException('User not found');

    const seen = new Set<string>();
    const hostedIds = new Set(hosted.map((t) => t.id));
    const counts = new Map<string, number>();

    const add = (tableId: string, category: string) => {
      if (seen.has(tableId)) return;
      seen.add(tableId);
      for (const part of category
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)) {
        counts.set(part, (counts.get(part) ?? 0) + 1);
      }
    };

    for (const j of joins) add(j.table.id, j.table.category);
    for (const t of hosted) add(t.id, t.category);

    const totalTables = seen.size;
    const hostedCount = [...seen].filter((id) => hostedIds.has(id)).length;
    const joinedCount = totalTables - hostedCount;
    const totalHits = [...counts.values()].reduce((a, b) => a + b, 0);

    const activitySegments = [...counts.entries()]
      .map(([label, count]) => ({
        label,
        count,
        percent: totalHits === 0 ? 0 : Math.round((count / totalHits) * 100),
        source: 'activity' as const,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    // Declared interests fill gaps when activity is thin.
    const declaredSegments = user.interests
      .map((label) => label.trim())
      .filter(Boolean)
      .filter((label) => !counts.has(label))
      .map((label) => ({
        label,
        count: 0,
        percent: 0,
        source: 'declared' as const,
      }));

    const segments =
      activitySegments.length > 0
        ? [...activitySegments, ...declaredSegments.slice(0, 4)]
        : declaredSegments.map((s, i, arr) => ({
            ...s,
            count: 1,
            percent: arr.length === 0 ? 0 : Math.round(100 / arr.length),
          }));

    const vibeBuckets: Record<string, number> = {
      casual: 0,
      deep: 0,
      social: 0,
      focus: 0,
    };
    const bumpVibe = (label: string, weight: number) => {
      const l = label.toLowerCase();
      if (/coffee|casual|chai|hang/.test(l)) vibeBuckets.casual += weight;
      else if (/deep|book|mindful|writ/.test(l)) vibeBuckets.deep += weight;
      else if (/network|language|startup|business|social/.test(l))
        vibeBuckets.social += weight;
      else if (/focus|work|study|productivity/.test(l)) vibeBuckets.focus += weight;
      else vibeBuckets.casual += weight * 0.5;
    };
    for (const [label, count] of counts) bumpVibe(label, count);
    for (const label of user.interests) bumpVibe(label, totalTables === 0 ? 2 : 0.5);

    const vibeTotal =
      vibeBuckets.casual +
      vibeBuckets.deep +
      vibeBuckets.social +
      vibeBuckets.focus || 1;
    const vibePct = (n: number) => Math.round((n / vibeTotal) * 100);

    const overallCount = reviewRows.length;
    const overallAvg =
      overallCount === 0
        ? null
        : Math.round(
            (reviewRows.reduce((a, r) => a + r.rating, 0) / overallCount) * 10,
          ) / 10;
    const asHostAvg =
      reviewAggHost._count._all === 0
        ? null
        : Math.round((reviewAggHost._avg.rating ?? 0) * 10) / 10;
    const asGuestAvg =
      reviewAggGuest._count._all === 0
        ? null
        : Math.round((reviewAggGuest._avg.rating ?? 0) * 10) / 10;

    const ratingAxis =
      overallAvg == null ? 0 : Math.round((overallAvg / 5) * 100);
    const hostShare =
      totalTables === 0 ? 0 : Math.round((hostedCount / totalTables) * 100);

    // Soft boost from profile energy / intents when little history.
    let socialBoost = 0;
    if (user.socialEnergy === 'INITIATOR' || user.socialEnergy === 'MIX')
      socialBoost += 8;
    if (user.intents.includes('MAKE_FRIENDS')) socialBoost += 6;

    const axes = [
      {
        key: 'reliability',
        label: 'Reliability',
        value: Math.min(100, user.reliabilityScore),
      },
      {
        key: 'rated',
        label: 'Peer rating',
        value: ratingAxis,
      },
      {
        key: 'hosting',
        label: 'Hosting',
        value: hostShare,
      },
      {
        key: 'casual',
        label: 'Casual coffee',
        value: Math.min(100, vibePct(vibeBuckets.casual) + (totalTables === 0 ? 5 : 0)),
      },
      {
        key: 'deep',
        label: 'Deep talks',
        value: vibePct(vibeBuckets.deep),
      },
      {
        key: 'social',
        label: 'Social / network',
        value: Math.min(100, vibePct(vibeBuckets.social) + socialBoost),
      },
    ];

    return {
      totalTables,
      hostedCount,
      joinedCount,
      segments,
      axes,
      reviews: {
        overallAvg,
        overallCount,
        asHostAvg,
        asHostCount: reviewAggHost._count._all,
        asGuestAvg,
        asGuestCount: reviewAggGuest._count._all,
      },
      reliabilityScore: user.reliabilityScore,
    };
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

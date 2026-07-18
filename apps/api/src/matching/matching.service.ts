import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildGroups } from './matching.algorithm';
import type { Candidate, MatchResult } from './matching.types';

const ALGO_VERSION = 'greedy-v1';

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async loadCandidates(eventId: string): Promise<Candidate[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { eventId, paymentStatus: 'PAID' },
      include: { user: true },
    });
    return bookings.map(({ user }) => ({
      userId: user.id,
      interests: user.interests,
      lifeStage: user.lifeStage,
      socialEnergy: user.socialEnergy,
      isNewcomer:
        user.newcomerStatus !== null &&
        user.newcomerStatus.toLowerCase().startsWith('yes'),
      reliabilityScore: user.reliabilityScore,
      blockedUserIds: user.blockedUserIds,
    }));
  }

  /** Preview suggested groups without persisting. */
  async suggest(eventId: string): Promise<MatchResult> {
    return buildGroups(await this.loadCandidates(eventId));
  }

  /** Persist suggested groups (replaces prior auto-generated groups for the event). */
  async generate(eventId: string) {
    const result = await this.suggest(eventId);
    await this.prisma.groupAssignment.deleteMany({
      where: { eventId, algoVersion: ALGO_VERSION },
    });
    const created = await Promise.all(
      result.groups.map((g) =>
        this.prisma.groupAssignment.create({
          data: {
            eventId,
            userIds: g.userIds,
            algoVersion: ALGO_VERSION,
            matchScore: g.score,
          },
        }),
      ),
    );
    const grouped = result.groups.flatMap((g) => g.userIds);
    void this.notifications.notifyMany(
      grouped,
      'group.reveal',
      'Your group is ready! ☕',
      "We've matched you into a group — tap My Meetups to see who you'll meet.",
      { eventId },
    );

    return {
      created: created.length,
      unassigned: result.unassigned,
      groups: result.groups,
    };
  }
}

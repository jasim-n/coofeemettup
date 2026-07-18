import type { SocialEnergy } from '../../generated/prisma/client';

/** Minimal per-attendee shape the matcher needs. */
export interface Candidate {
  userId: string;
  interests: string[];
  lifeStage: string | null;
  socialEnergy: SocialEnergy | null;
  isNewcomer: boolean;
  reliabilityScore: number;
  blockedUserIds: string[];
}

export interface MatchOptions {
  minSize?: number;
  maxSize?: number;
  targetSize?: number;
}

export interface GroupSuggestion {
  userIds: string[];
  /** 0..1 — fraction of members sharing ≥1 anchor with another member (no-odd-one-out). */
  score: number;
  /** members who share no interest/life-stage anchor with anyone else in the group. */
  oddOneOut: string[];
  energyMix: Record<string, number>;
  newcomerCount: number;
}

export interface MatchResult {
  groups: GroupSuggestion[];
  /** could not be placed (e.g. blocklist saturation). */
  unassigned: string[];
}

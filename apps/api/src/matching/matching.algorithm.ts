import type {
  Candidate,
  GroupSuggestion,
  MatchOptions,
  MatchResult,
} from './matching.types';

const DEFAULTS = { minSize: 4, maxSize: 8, targetSize: 7 } as const;

/** Shared-anchor affinity: overlapping interests + same life stage. */
export function affinity(a: Candidate, b: Candidate): number {
  const shared = a.interests.filter((i) => b.interests.includes(i)).length;
  const sameStage = a.lifeStage !== null && a.lifeStage === b.lifeStage ? 1 : 0;
  return shared + sameStage;
}

export function isBlocked(a: Candidate, b: Candidate): boolean {
  return (
    a.blockedUserIds.includes(b.userId) || b.blockedUserIds.includes(a.userId)
  );
}

function groupCount(n: number, targetSize: number, maxSize: number): number {
  if (n <= maxSize) return 1;
  const t = Math.min(targetSize, maxSize);
  return Math.ceil(n / t);
}

/** Even split of n across k groups (sizes differ by at most 1). */
function distributeSizes(n: number, k: number): number[] {
  const base = Math.floor(n / k);
  const rem = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
}

/** How well candidate c fits an existing group: affinity, energy diversity, newcomer spread. */
function placementScore(c: Candidate, group: Candidate[]): number {
  if (group.length === 0) return 0;
  const aff = group.reduce((sum, m) => sum + affinity(c, m), 0) / group.length;
  const sameEnergy = c.socialEnergy
    ? group.filter((m) => m.socialEnergy === c.socialEnergy).length
    : 0;
  const energyPenalty = (-0.5 * sameEnergy) / group.length;
  const newcomers = group.filter((m) => m.isNewcomer).length;
  const newcomerPenalty = c.isNewcomer ? (-0.5 * newcomers) / group.length : 0;
  return aff + energyPenalty + newcomerPenalty;
}

function connectionsWithin(c: Candidate, group: Candidate[]): number {
  return group.filter((m) => m.userId !== c.userId && affinity(c, m) > 0)
    .length;
}

function summarize(group: Candidate[]): GroupSuggestion {
  const energyMix: Record<string, number> = {};
  for (const c of group) {
    const key = c.socialEnergy ?? 'UNKNOWN';
    energyMix[key] = (energyMix[key] ?? 0) + 1;
  }
  const oddOneOut = group
    .filter((c) => connectionsWithin(c, group) < 1)
    .map((c) => c.userId);
  const connectedFrac =
    group.length <= 1
      ? 1
      : group.filter((c) => connectionsWithin(c, group) >= 1).length /
        group.length;
  return {
    userIds: group.map((c) => c.userId),
    score: Math.round(connectedFrac * 100) / 100,
    oddOneOut,
    energyMix,
    newcomerCount: group.filter((c) => c.isNewcomer).length,
  };
}

/**
 * Greedy partition of paid attendees into groups (§10.4 rulebook v1).
 * Deterministic: newcomers seed first, ties broken by userId.
 */
export function buildGroups(
  candidates: Candidate[],
  opts: MatchOptions = {},
): MatchResult {
  const { maxSize, targetSize } = { ...DEFAULTS, ...opts };
  const n = candidates.length;
  if (n === 0) return { groups: [], unassigned: [] };

  const k = groupCount(n, targetSize, maxSize);
  const sizes = distributeSizes(n, k);

  // Deterministic order: newcomers first (to spread as seeds), then by userId.
  const order = [...candidates].sort((a, b) => {
    if (a.isNewcomer !== b.isNewcomer) return a.isNewcomer ? -1 : 1;
    return a.userId.localeCompare(b.userId);
  });

  const groups: Candidate[][] = Array.from({ length: k }, () => []);
  const unassigned: string[] = [];

  // Seed one candidate per group so anchors spread instead of piling into group 0.
  let idx = 0;
  for (let g = 0; g < k && idx < order.length; g++) {
    groups[g].push(order[idx]);
    idx++;
  }

  // Place the rest into the best eligible (non-blocked, under target size) group.
  for (; idx < order.length; idx++) {
    const c = order[idx];
    const best = pickGroup(c, groups, sizes, maxSize);
    if (best === -1) unassigned.push(c.userId);
    else groups[best].push(c);
  }

  return {
    groups: groups.filter((g) => g.length > 0).map(summarize),
    unassigned,
  };
}

function pickGroup(
  c: Candidate,
  groups: Candidate[][],
  sizes: number[],
  maxSize: number,
): number {
  const consider = (cap: (g: number) => number): number => {
    let best = -1;
    let bestScore = -Infinity;
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].length >= cap(g)) continue;
      if (groups[g].some((m) => isBlocked(m, c))) continue;
      const s = placementScore(c, groups[g]);
      if (s > bestScore) {
        bestScore = s;
        best = g;
      }
    }
    return best;
  };
  // Prefer respecting the target size; if none fit, relax up to maxSize.
  const withinTarget = consider((g) => sizes[g] ?? maxSize);
  return withinTarget !== -1 ? withinTarget : consider(() => maxSize);
}

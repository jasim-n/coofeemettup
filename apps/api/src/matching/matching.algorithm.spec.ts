import { affinity, buildGroups } from './matching.algorithm';
import type { Candidate } from './matching.types';

function cand(userId: string, over: Partial<Candidate> = {}): Candidate {
  return {
    userId,
    interests: [],
    lifeStage: null,
    socialEnergy: null,
    isNewcomer: false,
    reliabilityScore: 100,
    blockedUserIds: [],
    ...over,
  };
}

describe('affinity', () => {
  it('counts shared interests + same life stage', () => {
    const a = cand('a', { interests: ['books', 'film'], lifeStage: 'STUDENT' });
    const b = cand('b', {
      interests: ['film', 'sports'],
      lifeStage: 'STUDENT',
    });
    expect(affinity(a, b)).toBe(2); // 1 shared interest (film) + same stage
  });
});

describe('buildGroups', () => {
  it('returns nothing for an empty pool', () => {
    expect(buildGroups([])).toEqual({ groups: [], unassigned: [] });
  });

  it('keeps a small pool in one group', () => {
    const res = buildGroups([
      cand('a'),
      cand('b'),
      cand('c'),
      cand('d'),
      cand('e'),
    ]);
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].userIds).toHaveLength(5);
    expect(res.unassigned).toHaveLength(0);
  });

  it('splits a large pool into groups within size bounds', () => {
    const pool = Array.from({ length: 16 }, (_, i) => cand(`u${i}`));
    const res = buildGroups(pool);
    expect(res.groups.length).toBeGreaterThanOrEqual(2);
    const total = res.groups.reduce((n, g) => n + g.userIds.length, 0);
    expect(total + res.unassigned.length).toBe(16);
    for (const g of res.groups) expect(g.userIds.length).toBeLessThanOrEqual(8);
  });

  it('never co-locates a blocked pair', () => {
    const pool = [
      cand('a', { blockedUserIds: ['b'] }),
      cand('b'),
      cand('c'),
      cand('d'),
      cand('e'),
      cand('f'),
    ];
    const res = buildGroups(pool, { maxSize: 4, targetSize: 4 });
    for (const g of res.groups) {
      const has = new Set(g.userIds);
      expect(has.has('a') && has.has('b')).toBe(false);
    }
  });

  it('flags an odd-one-out who shares no anchor', () => {
    const pool = [
      cand('a', { interests: ['books'] }),
      cand('b', { interests: ['books'] }),
      cand('c', { interests: ['sports'] }),
    ];
    const res = buildGroups(pool);
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].oddOneOut).toEqual(['c']);
    expect(res.groups[0].score).toBeLessThan(1);
  });

  it('scores a fully-connected group 1 with no odd-one-out', () => {
    const pool = [
      cand('a', { interests: ['books'] }),
      cand('b', { interests: ['books'] }),
      cand('c', { interests: ['books'] }),
    ];
    const res = buildGroups(pool);
    expect(res.groups[0].score).toBe(1);
    expect(res.groups[0].oddOneOut).toHaveLength(0);
  });

  it('spreads newcomers across groups (seeds them first)', () => {
    const pool = [
      cand('n1', { isNewcomer: true }),
      cand('n2', { isNewcomer: true }),
      cand('x1'),
      cand('x2'),
    ];
    const res = buildGroups(pool, { maxSize: 2, targetSize: 2 });
    expect(res.groups).toHaveLength(2);
    for (const g of res.groups) expect(g.newcomerCount).toBe(1);
  });
});

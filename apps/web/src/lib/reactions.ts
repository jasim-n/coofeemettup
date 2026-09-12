import type { ReactionSummary } from '@jrst/api-client';

/**
 * Local mirror of the server's reaction toggle, used to update a message
 * instantly before the API responds. Server result replaces this afterwards.
 */
export function toggleReactionLocally(
  reactions: ReactionSummary[] | undefined,
  emoji: string,
): ReactionSummary[] {
  const list = reactions ?? [];
  const existing = list.find((r) => r.emoji === emoji);

  if (!existing) {
    return [...list, { emoji, count: 1, mine: true }];
  }

  if (existing.mine) {
    const count = existing.count - 1;
    return count <= 0
      ? list.filter((r) => r.emoji !== emoji)
      : list.map((r) => (r.emoji === emoji ? { ...r, count, mine: false } : r));
  }

  return list.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
}

export function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

/** Ported from apps/web/src/lib/format.ts `formatDateTime`. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** @deprecated Prefer formatDateTime — same output as web. */
export function formatWhen(iso: string): string {
  return formatDateTime(iso);
}

export function handleOf(u?: { username?: string | null } | null): string {
  return u?.username ? `@${u.username}` : '@member';
}

export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

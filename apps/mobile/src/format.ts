export function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function handleOf(u?: { username?: string | null } | null): string {
  return u?.username ? `@${u.username}` : '@member';
}

export function ago(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.round(diffHr / 24)}d`;
}

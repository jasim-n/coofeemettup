import type { TableDto } from '@jrst/api-client';

/**
 * Ported from apps/web/src/lib/table-cta.ts — keep in sync.
 */
export function tableCta(
  t: TableDto,
  viewerId?: string | null,
): { label: string; primary: boolean } {
  if (viewerId && t.hostId === viewerId) return { label: 'Hosting', primary: false };
  if (t.myRequestStatus === 'APPROVED') return { label: 'Joined', primary: false };
  if (t.myRequestStatus === 'PENDING') return { label: 'Requested', primary: false };
  if (t.myInvite) return { label: 'Invited', primary: true };
  if (t.seatsLeft <= 0) return { label: 'Full', primary: false };
  return { label: 'Join Table', primary: true };
}

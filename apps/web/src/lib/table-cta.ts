import type { TableDto } from '@jrst/api-client';

/**
 * The call-to-action label + emphasis for a table card, based on the viewer's
 * relationship to the table. Cards navigate to the detail page regardless — the
 * label just reflects state so a host doesn't see "Join Table" on their own
 * table and a member who's already in doesn't either.
 */
export function tableCta(
  t: TableDto,
  viewerId?: string | null,
): { label: string; primary: boolean } {
  if (viewerId && t.hostId === viewerId) return { label: 'Hosting', primary: false };
  if (t.myRequestStatus === 'APPROVED') return { label: 'Going', primary: false };
  if (t.myRequestStatus === 'PENDING') return { label: 'Requested', primary: false };
  if (t.myInvite) return { label: 'Invited', primary: true };
  if (t.seatsLeft <= 0) return { label: 'Full', primary: false };
  return { label: 'Join Table', primary: true };
}

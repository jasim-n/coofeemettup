import type { TableDto } from '@jrst/api-client';
import { isUpcomingTable } from '@/lib/table-time';

/**
 * The call-to-action label + emphasis for a table card, based on the viewer's
 * relationship to the table. Cards navigate to the detail page regardless — the
 * label just reflects state so a host doesn't see "Join meetup" on their own
 * meetup and a member who's already in doesn't either.
 */
export function tableCta(
  t: TableDto,
  viewerId?: string | null,
): { label: string; primary: boolean } {
  if (viewerId && t.hostId === viewerId) return { label: 'Hosting', primary: false };
  if (t.myRequestStatus === 'APPROVED') return { label: 'Joined', primary: false };
  if (t.myRequestStatus === 'PENDING') return { label: 'Requested', primary: false };
  if (!isUpcomingTable(t.startAt)) return { label: 'Ended', primary: false };
  if (t.myInvite) return { label: 'Invited', primary: true };
  if (t.seatsLeft <= 0 || t.status !== 'OPEN') return { label: 'Full', primary: false };
  return { label: 'Join meetup', primary: true };
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type BookingDto, type GroupMember } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MeetupsPage() {
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const b = await api.myBookings();
        if (active) setBookings(b);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load bookings');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">My meetups</h1>
        <Link href="/events" className="text-muted-foreground text-sm hover:underline">
          Browse
        </Link>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {bookings === null && !error && <p className="text-muted-foreground text-sm">Loading…</p>}
      {bookings?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          You haven&apos;t joined any meetups yet. <Link href="/events" className="underline">Browse</Link>.
        </p>
      )}

      <div className="space-y-3">
        {bookings?.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{b.event?.title ?? 'Coffee meetup'}</CardTitle>
                <Badge variant={b.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                  {b.paymentStatus.toLowerCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {b.event && (
                <p className="text-muted-foreground">
                  {formatDateTime(b.event.startAt)} · {b.event.cafe?.name ?? b.event.area} ·{' '}
                  {formatPKR(b.amountPKR)}
                </p>
              )}
              <GroupMembers eventId={b.eventId} />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

function GroupMembers({ eventId }: { eventId: string }) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await api.myGroup(eventId);
        if (active) setMembers(r.members);
      } catch {
        // group not available yet — leave empty
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  async function block(id: string) {
    try {
      await api.blockUser(id);
      setMsg("Blocked — you won't be grouped with them again.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Could not block');
    }
  }

  async function report(id: string) {
    const reason = window.prompt('What happened? (this is confidential)');
    if (!reason) return;
    try {
      await api.reportUser(id, reason, eventId);
      setMsg('Reported — our team will review it.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Could not report');
    }
  }

  if (!loaded) return <p className="text-muted-foreground mt-2 text-xs">Loading your group…</p>;
  if (members.length === 0)
    return <p className="text-muted-foreground mt-2 text-xs">Group not formed yet.</p>;

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-medium">Your group</p>
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2">
          <span className="text-sm">
            {m.firstName ?? 'Member'} {m.lastInitial ?? ''}
            {m.interests.length > 0 && (
              <span className="text-muted-foreground text-xs"> · {m.interests.slice(0, 3).join(', ')}</span>
            )}
          </span>
          <div className="flex gap-1">
            <Button size="xs" variant="outline" onClick={() => void block(m.id)}>
              Block
            </Button>
            <Button size="xs" variant="outline" onClick={() => void report(m.id)}>
              Report
            </Button>
          </div>
        </div>
      ))}
      {msg && <p className="mt-1 text-xs text-green-600">{msg}</p>}
    </div>
  );
}

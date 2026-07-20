'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type BookingDto, type GroupMember } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

  const [busy, setBusy] = useState<string | null>(null);

  async function cancel(b: BookingDto) {
    const within24h =
      !!b.event &&
      // eslint-disable-next-line react-hooks/purity -- runs on click, not during render
      new Date(b.event.startAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
    const message =
      b.paymentStatus === 'PAID'
        ? within24h
          ? 'Cancel this booking? It’s within 24 hours of the event, so no refund applies.'
          : 'Cancel this booking? You’ll receive a full refund.'
        : 'Cancel this booking?';
    if (!window.confirm(message)) return;
    setBusy(b.id);
    try {
      const updated = await api.cancelBooking(b.id);
      setBookings((prev) => prev?.map((x) => (x.id === b.id ? updated : x)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel booking');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Your bookings</p>
          <h1 className="display mt-1 text-3xl">My meetups</h1>
        </div>
        <Link href="/events" className="text-primary font-semibold text-sm hover:underline">
          Browse →
        </Link>
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}
      {bookings === null && !error && (
        <p className="text-muted-foreground text-sm">Loading…</p>
      )}
      {bookings?.length === 0 && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">🎟️</p>
          <p className="text-muted-foreground mt-2 text-sm">
            No meetups yet.{' '}
            <Link href="/events" className="text-primary font-semibold hover:underline">
              Browse events
            </Link>
            .
          </p>
        </div>
      )}

      <div className="space-y-4">
        {bookings?.map((b) => {
          const isCancelled = b.status === 'CANCELLED';
          const isWaitlisted = b.status === 'WAITLISTED';
          const isPaid = b.paymentStatus === 'PAID';
          const isRefunded = b.paymentStatus === 'REFUNDED';

          let badgeVariant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' =
            'secondary';
          let badgeLabel = b.paymentStatus.toLowerCase();
          if (isCancelled) {
            badgeVariant = isRefunded ? 'secondary' : 'destructive';
            badgeLabel = isRefunded ? 'refunded' : 'cancelled';
          } else if (isWaitlisted) {
            badgeVariant = 'warning';
            badgeLabel = 'waitlisted';
          } else if (isPaid) {
            badgeVariant = 'success';
            badgeLabel = 'paid';
          }

          return (
            <Card
              key={b.id}
              className={`rounded-3xl transition-all ${isCancelled ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-glow'}`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-lg font-bold tracking-tight">
                    {b.event?.title ?? 'Coffee meetup'}
                  </h2>
                  <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                </div>

                {b.event && (
                  <div className="text-muted-foreground text-sm space-y-1">
                    <p>🗓️ {formatDateTime(b.event.startAt)}</p>
                    <p>📍 {b.event.cafe?.name ?? b.event.area}</p>
                    <p className="font-heading text-primary font-extrabold text-base">
                      {formatPKR(b.amountPKR)}
                    </p>
                  </div>
                )}

                {isWaitlisted && (
                  <p className="text-muted-foreground text-xs bg-secondary/50 rounded-2xl px-3 py-2">
                    You’re on the waitlist — we’ll notify you the moment a spot opens.
                  </p>
                )}

                {!isCancelled && (
                  <div className="flex gap-2 items-center">
                    {b.status === 'ACTIVE' && b.paymentStatus === 'PENDING' && (
                      <Link
                        href={`/events/${b.eventId}`}
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        Complete payment →
                      </Link>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy === b.id}
                      onClick={() => void cancel(b)}
                    >
                      {busy === b.id ? 'Cancelling…' : 'Cancel booking'}
                    </Button>
                  </div>
                )}

                {(isPaid || isRefunded) && (
                  <Link
                    href={`/receipt/${b.id}`}
                    className="text-primary inline-block text-xs font-semibold hover:underline"
                  >
                    View receipt →
                  </Link>
                )}

                {b.status === 'ACTIVE' && <GroupMembers eventId={b.eventId} />}
              </CardContent>
            </Card>
          );
        })}
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
      <p className="eyebrow text-primary">Your group</p>
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {m.firstName ?? 'Member'} {m.lastInitial ?? ''}
            {m.interests.length > 0 && (
              <span className="text-muted-foreground text-xs font-normal"> · {m.interests.slice(0, 3).join(', ')}</span>
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

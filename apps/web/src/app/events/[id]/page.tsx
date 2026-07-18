'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError, type BookingDto, type EventDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDto | null>(null);
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [ev, mine] = await Promise.all([api.getEvent(id), api.myBookings()]);
    setEvent(ev);
    setBooking(mine.find((b) => b.eventId === id) ?? null);
  }, [id]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function startPayment() {
    if (!booking) return;
    setError(null);
    setBusy(true);
    try {
      const { checkoutUrl } = await api.initiatePayment(booking.id, window.location.href);
      window.location.href = checkoutUrl; // hosted checkout; returns here after paying
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  if (error && !event) return <main className="p-6 text-destructive text-sm">{error}</main>;
  if (!event) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;

  const paid = booking?.paymentStatus === 'PAID';
  const joined = Boolean(booking);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/events" className="text-muted-foreground text-sm hover:underline">
        ← All meetups
      </Link>
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{event.title ?? 'Coffee meetup'}</CardTitle>
            <Badge variant="secondary">{event.genderTrack.replace('_', ' ').toLowerCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="text-muted-foreground space-y-1">
            <p>{formatDateTime(event.startAt)}</p>
            <p>{event.cafe?.name ?? event.area} · {event.area}</p>
            <p className="text-foreground font-medium">{formatPKR(event.pricePKR)} · includes one coffee/chai</p>
            <p>{event.seatsLeft} of {event.capacity} seats left</p>
          </div>

          {error && <p className="text-destructive">{error}</p>}

          {!joined && (
            <Button
              className="w-full"
              disabled={busy || event.seatsLeft <= 0 || event.status !== 'OPEN'}
              onClick={() => void run(() => api.joinEvent(id))}
            >
              {event.seatsLeft <= 0 ? 'Full' : busy ? 'Joining…' : 'Join this meetup'}
            </Button>
          )}

          {joined && !paid && (
            <Button className="w-full" disabled={busy} onClick={() => void startPayment()}>
              {busy ? 'Redirecting…' : `Pay ${formatPKR(event.pricePKR)}`}
            </Button>
          )}

          {paid && (
            <div className="space-y-2">
              <p className="text-foreground font-medium">You&apos;re in! 🎉 See you there.</p>
              <Link
                href={`/events/${id}/feedback`}
                className={buttonVariants({ variant: 'outline', className: 'w-full' })}
              >
                Leave feedback after the meetup
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

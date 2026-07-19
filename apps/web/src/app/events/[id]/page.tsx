'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError, type BookingDto, type EventDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
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

  if (error && !event)
    return (
      <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">
        <p className="text-destructive text-sm font-medium">{error}</p>
      </main>
    );
  if (!event)
    return (
      <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );

  const cancelledEvent = event.status === 'CANCELLED';
  const paid = booking?.paymentStatus === 'PAID';
  const active = booking?.status === 'ACTIVE';
  const waitlisted = booking?.status === 'WAITLISTED';
  const joined = Boolean(booking && booking.status !== 'CANCELLED');
  const full = event.seatsLeft <= 0 || event.status === 'FULL';

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      {/* back nav */}
      <Link
        href="/events"
        className="text-primary text-sm font-semibold hover:underline"
      >
        ← All meetups
      </Link>

      {/* ticket card */}
      <div className="mt-5 overflow-hidden rounded-3xl shadow-glow">
        {/* hero band */}
        <div className="bg-ink relative px-6 py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-6 size-40 rounded-full bg-gradient-hero opacity-40 blur-2xl"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-white/60">Coffee meetup</p>
              <h1 className="font-heading mt-1 text-2xl font-extrabold tracking-tight text-white">
                {event.title ?? 'Coffee meetup'}
              </h1>
            </div>
            <Badge variant="brand" className="mt-1 shrink-0">
              {event.genderTrack.replace('_', ' ').toLowerCase()}
            </Badge>
          </div>
          <p className="font-heading mt-4 text-3xl font-extrabold text-primary">
            {formatPKR(event.pricePKR)}
          </p>
          <p className="mt-0.5 text-xs font-medium text-white/60">includes one coffee/chai</p>
        </div>

        {/* details */}
        <div className="bg-card px-6 py-5 space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="text-base">🗓️</span>
              <span>{formatDateTime(event.startAt)}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span>{event.cafe?.name ?? event.area} · {event.area}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-base">🪑</span>
              <span>
                <span className="font-semibold text-foreground">{event.seatsLeft}</span> of {event.capacity} seats left
              </span>
            </p>
          </div>

          {error && (
            <p className="text-destructive text-sm font-medium">{error}</p>
          )}

          {cancelledEvent ? (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3">
              <p className="text-destructive font-semibold text-sm">
                This meetup has been cancelled.{' '}
                {paid ? 'Your payment has been fully refunded.' : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {!joined && event.status === 'OPEN' && !full && (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void run(() => api.joinEvent(id))}
                >
                  {busy ? 'Joining…' : 'Join this meetup →'}
                </Button>
              )}

              {!joined && full && (event.status === 'OPEN' || event.status === 'FULL') && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void run(() => api.joinEvent(id))}
                >
                  {busy ? 'Joining waitlist…' : 'Join waitlist'}
                </Button>
              )}

              {waitlisted && (
                <div className="space-y-2">
                  <div className="rounded-2xl bg-secondary px-4 py-3">
                    <p className="text-secondary-foreground text-sm font-medium">
                      You’re on the waitlist ⏳ — we’ll notify you the moment a spot opens.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void run(() => api.cancelBooking(booking!.id))}
                  >
                    Leave waitlist
                  </Button>
                </div>
              )}

              {active && !paid && (
                <div className="space-y-2">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void startPayment()}
                  >
                    {busy ? 'Redirecting…' : `Pay ${formatPKR(event.pricePKR)} →`}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    disabled={busy}
                    onClick={() => void run(() => api.cancelBooking(booking!.id))}
                  >
                    Cancel booking
                  </Button>
                </div>
              )}

              {paid && (
                <div className="space-y-2">
                  <div className="rounded-2xl bg-gradient-ember px-4 py-3 text-center">
                    <p className="font-heading font-bold text-white">You&apos;re in! 🎉 See you there.</p>
                  </div>
                  <Link
                    href={`/events/${id}/feedback`}
                    className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
                  >
                    Rate your experience
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    disabled={busy}
                    onClick={() => void run(() => api.cancelBooking(booking!.id))}
                  >
                    Cancel booking
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

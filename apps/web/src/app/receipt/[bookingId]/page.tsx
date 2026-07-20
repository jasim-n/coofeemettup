'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError, type BookingDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';

export default function ReceiptPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, loading } = useAuth();
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const mine = await api.myBookings();
        const b = mine.find((x) => x.id === bookingId) ?? null;
        if (active) {
          setBooking(b);
          if (!b) setError('Receipt not found.');
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [user, bookingId]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  const paidOrRefunded =
    booking && (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'REFUNDED');

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/meetups" className="text-muted-foreground text-sm font-semibold hover:underline">
          ← My meetups
        </Link>
        {paidOrRefunded && (
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {booking && !paidOrRefunded && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">🧾</p>
          <p className="text-muted-foreground mt-2 text-sm">
            No receipt yet — this booking hasn’t been paid.
          </p>
        </div>
      )}

      {booking && paidOrRefunded && (
        <div className="overflow-hidden rounded-3xl shadow-soft ring-1 ring-border/70">
          <div className="bg-ink relative px-6 py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-8 -right-6 size-32 rounded-full bg-gradient-hero opacity-40 blur-2xl"
            />
            <Wordmark className="text-sm text-white" />
            <p className="eyebrow text-white/60 mt-4">Receipt</p>
            <p className="font-heading mt-1 text-3xl font-extrabold tracking-tight text-white">
              {formatPKR(booking.amountPKR)}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                booking.paymentStatus === 'REFUNDED'
                  ? 'bg-white/15 text-white'
                  : 'bg-emerald-500/20 text-emerald-100'
              }`}
            >
              {booking.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Paid'}
            </span>
          </div>

          <div className="bg-card space-y-3 px-6 py-5 text-sm">
            <Row label="Meetup" value={booking.event?.title ?? 'Coffee meetup'} />
            {booking.event && (
              <>
                <Row label="When" value={formatDateTime(booking.event.startAt)} />
                <Row
                  label="Where"
                  value={
                    booking.event.venueName ??
                    booking.event.cafe?.name ??
                    booking.event.area
                  }
                />
              </>
            )}
            <Row label="Amount" value={formatPKR(booking.amountPKR)} />
            <Row label="Payment ref" value={booking.paymentRef ?? '—'} mono />
            <Row label="Booked on" value={formatDateTime(booking.createdAt)} />
            <p className="text-muted-foreground border-t pt-3 text-xs">
              Ticket includes one coffee or chai at the venue. Thanks for joining ☕
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
      </span>
    </div>
  );
}

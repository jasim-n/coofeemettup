'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type DashboardMetrics } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const VERDICT: Record<
  DashboardMetrics['goNoGo']['verdict'],
  { label: string; cls: string; blurb: string }
> = {
  GO: {
    label: 'GO ✅',
    cls: 'bg-emerald-600 text-white',
    blurb: 'Retention + referral thresholds met — the product is working.',
  },
  NO_GO: {
    label: 'NO-GO ⛔',
    cls: 'bg-destructive text-white',
    blurb: 'Enough events held, but repeat/referral is below target.',
  },
  INSUFFICIENT_DATA: {
    label: 'Not enough data',
    cls: 'bg-muted text-foreground',
    blurb: 'Run more meetups before reading the gate.',
  },
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-heading text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const [m, setM] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  useEffect(() => {
    if (!isAdmin) return;
    api
      .adminMetrics()
      .then(setM)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load metrics'),
      );
  }, [isAdmin]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-4xl uppercase">Dashboard</h1>
        <Link
          href="/admin"
          className="text-muted-foreground mt-2 inline-block text-sm font-semibold hover:underline"
        >
          ← Admin
        </Link>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}
      {!m && !error && <p className="text-muted-foreground text-sm">Loading metrics…</p>}

      {m && (
        <div className="space-y-4">
          {/* Go / No-Go gate */}
          <Card className="overflow-hidden rounded-3xl shadow-soft">
            <CardHeader className="pb-2">
              <p className="eyebrow text-primary">Go / No-Go gate · §7</p>
              <CardTitle className="font-heading text-lg font-bold tracking-tight">
                Product health verdict
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={`rounded-2xl px-6 py-5 text-center ${VERDICT[m.goNoGo.verdict].cls}`}
              >
                <span className="display text-5xl uppercase">
                  {VERDICT[m.goNoGo.verdict].label}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {VERDICT[m.goNoGo.verdict].blurb} Target: ≥{m.goNoGo.threshold.repeatRatePct}% of
                first-timers rebook + a referral signal, across ≥
                {m.goNoGo.threshold.minEvents} held events.
              </p>
              <div className="space-y-1.5 border-t pt-3">
                <Stat
                  label="Second-event rate (first-timers)"
                  value={`${m.goNoGo.repeatRatePct}%  (${m.goNoGo.repeaters}/${m.goNoGo.firstTimers})`}
                />
                <Stat
                  label="Events held"
                  value={`${m.goNoGo.eventsHeld} / ${m.goNoGo.threshold.minEvents}`}
                />
                <Stat
                  label="Referral signal (any invite-a-friend)"
                  value={m.goNoGo.referralSignal ? 'yes' : 'no'}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="rounded-3xl shadow-soft">
              <CardHeader className="pb-2">
                <p className="eyebrow text-primary">Overview</p>
                <CardTitle className="font-heading font-bold tracking-tight">Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <Stat label="Total" value={m.events.total} />
                <Stat label="Open" value={m.events.open} />
                <Stat label="Full" value={m.events.full} />
                <Stat label="Completed" value={m.events.completed} />
                <Stat label="Cancelled" value={m.events.cancelled} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-soft">
              <CardHeader className="pb-2">
                <p className="eyebrow text-primary">Attendance</p>
                <CardTitle className="font-heading font-bold tracking-tight">
                  Bookings &amp; show rate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <Stat label="Active" value={m.bookings.active} />
                <Stat label="Waitlisted" value={m.bookings.waitlisted} />
                <Stat label="Cancelled" value={m.bookings.cancelled} />
                <Stat label="Show rate" value={`${m.attendance.showRatePct}%`} />
                <Stat
                  label="Attended / no-show"
                  value={`${m.attendance.attended} / ${m.attendance.noShow}`}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl shadow-soft">
            <CardHeader className="pb-2">
              <p className="eyebrow text-primary">Post-event surveys</p>
              <CardTitle className="font-heading font-bold tracking-tight">
                Feedback · {m.feedback.count} responses
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <Stat label="Avg enjoyment" value={`${m.feedback.avgEnjoyment} / 5`} />
              <Stat label="Avg NPS" value={`${m.feedback.avgNps} / 10`} />
              <Stat label="Avg cafe rating" value={`${m.feedback.avgCafeRating} / 5`} />
              <Stat label="Would meet again" value={`${m.feedback.pctMeetAgainAllSome}%`} />
              <Stat label="Come again = yes" value={`${m.feedback.pctComeAgainYes}%`} />
              <Stat label="Invite a friend = yes" value={`${m.feedback.pctInviteFriendYes}%`} />
              <Stat label="Felt unsafe reports" value={m.feedback.feltUnsafe} />
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

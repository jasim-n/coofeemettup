'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { type PublicUser, type TableDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CAT_EMOJI: Record<string, string> = {
  'Deep talks': '💬',
  'Coffee & chill': '☕',
  Networking: '🤝',
  Books: '📚',
  Startups: '🚀',
  'Language exchange': '🗣️',
  'Board games': '🎲',
};
const emojiFor = (c: string) => CAT_EMOJI[c] ?? '🪑';

/** Desktop-only content dashboard (rendered inside a `hidden md:block` wrapper). */
export function HomeDashboard({ user }: { user: PublicUser }) {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [joined, setJoined] = useState<TableDto[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [t, j] = await Promise.all([api.browseTables(), api.myJoinedTables()]);
        if (active) {
          setTables(t);
          setJoined(j);
        }
      } catch {
        /* non-fatal on the dashboard */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const upcoming = tables.slice(0, 4);
  const active = joined.filter(
    (t) => t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING',
  );
  const myActive = active.slice(0, 4);
  const verified = user.verificationStatus === 'VERIFIED';
  const vibes = [...new Set(tables.map((t) => t.category))].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* welcome band */}
      <section className="bg-ink relative overflow-hidden rounded-3xl px-8 py-7 shadow-glow">
        <div
          aria-hidden
          className="bg-gradient-hero pointer-events-none absolute -top-16 -right-10 size-64 rounded-full opacity-40 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="eyebrow text-white/60">Welcome back</p>
            <p className="font-heading mt-1 text-3xl font-extrabold tracking-tight text-white">
              {user.firstName ? `Hi, ${user.firstName}` : user.phone}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
                {user.role.toLowerCase()}
              </span>
              <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
                {verified ? '✓ verified' : 'unverified'}
              </span>
              <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
                ⭐ {user.reliabilityScore} reliability
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Link
              href="/tables/nearby"
              className={buttonVariants({ variant: 'hero', size: 'lg' })}
            >
              Find a table near you →
            </Link>
            {user.canHost && (
              <Link
                href="/tables/new"
                className="rounded-full py-2 text-center text-sm font-semibold text-white/80 ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                + Host a table
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* stats strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon="🪑" value={tables.length} label="Open tables near you" />
        <StatTile icon="🎟️" value={active.length} label="Your active meetups" />
        <StatTile icon="⭐" value={user.reliabilityScore} label="Reliability score" />
      </div>

      {/* popular vibes */}
      {vibes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground mr-1 text-sm font-semibold">Popular vibes</span>
          {vibes.map((c) => (
            <Link
              key={c}
              href="/discover"
              className="bg-card shadow-soft ring-border/60 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              {emojiFor(c)} {c}
            </Link>
          ))}
        </div>
      )}

      {/* content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* main: tables near you */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-xl font-bold tracking-tight">Tables near you</h2>
            <Link href="/tables" className="text-primary text-sm font-semibold hover:underline">
              See all →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-3xl border border-dashed py-12 text-center">
              <p className="text-3xl">🪑</p>
              <p className="text-muted-foreground mt-2 text-sm">
                No open tables right now — check the{' '}
                <Link href="/discover" className="text-primary font-semibold hover:underline">
                  Discover
                </Link>{' '}
                page.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((t) => (
                <Link key={t.id} href={`/tables/${t.id}`} className="block">
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-glow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading text-base font-bold tracking-tight">
                          {emojiFor(t.category)} {t.title ?? t.category}
                        </h3>
                        <Badge variant={t.pricePKR == null ? 'secondary' : 'brand'}>
                          {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                        <p>🗓️ {formatDateTime(t.startAt)}</p>
                        <p>📍 {t.venueName ?? t.cafe?.name ?? 'See map'}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <span className="bg-primary/10 text-primary grid size-6 place-items-center rounded-full text-[10px] font-bold">
                            {(t.host?.firstName ?? '?').charAt(0).toUpperCase()}
                          </span>
                          {t.host?.firstName ?? 'a host'} {t.host?.lastInitial ?? ''}
                        </span>
                        <Badge variant={t.seatsLeft <= 2 ? 'warning' : 'secondary'}>
                          {t.seatsLeft} left
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* aside */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading font-bold tracking-tight">Your meetups</h2>
                <Link href="/meetups" className="text-primary text-xs font-semibold hover:underline">
                  View all →
                </Link>
              </div>
              {myActive.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You haven’t joined a table yet.{' '}
                  <Link href="/tables" className="text-primary font-semibold hover:underline">
                    Browse tables →
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {myActive.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tables/${t.id}`}
                        className="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="truncate font-medium">
                          {emojiFor(t.category)} {t.title ?? t.category}
                        </span>
                        <Badge variant={t.myRequestStatus === 'APPROVED' ? 'success' : 'warning'}>
                          {t.myRequestStatus === 'APPROVED' ? 'in' : 'pending'}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {user.canHost ? (
            <Card className="bg-gradient-ember overflow-hidden text-white shadow-glow ring-0">
              <CardContent className="space-y-2 py-5">
                <p className="font-heading text-lg font-bold tracking-tight">Got a table in mind?</p>
                <p className="text-sm text-white/80">
                  Pick a spot, set the seats, and let people request to join.
                </p>
                <Link
                  href="/tables/new"
                  className="mt-1 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
                >
                  Host a table →
                </Link>
              </CardContent>
            </Card>
          ) : !verified ? (
            <Card>
              <CardContent className="space-y-2 py-5">
                <p className="font-heading font-bold tracking-tight">Verify your identity</p>
                <p className="text-muted-foreground text-sm">
                  Verified members build trust and get into tables faster.
                </p>
                <Link
                  href="/profile"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-1' })}
                >
                  Verify now
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="flex items-center justify-between gap-2 py-4">
              <div>
                <p className="font-heading text-sm font-bold tracking-tight">🎁 Invite friends</p>
                <p className="text-muted-foreground text-xs">Better tables with people you know.</p>
              </div>
              <Link href="/invite" className="text-primary text-sm font-semibold hover:underline">
                Invite →
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="bg-card shadow-soft relative overflow-hidden rounded-2xl border p-5">
      <div
        aria-hidden
        className="bg-gradient-hero pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-15 blur-2xl"
      />
      <div className="relative flex items-center gap-3">
        <span className="bg-primary/10 grid size-11 shrink-0 place-items-center rounded-2xl text-2xl">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-heading text-2xl font-extrabold tracking-tight">{value}</p>
          <p className="text-muted-foreground truncate text-xs font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

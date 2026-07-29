'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type TableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader, Spinner } from '@/components/spinner';

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

export default function MeetupsPage() {
  const { user, loading } = useAuth();
  const [joined, setJoined] = useState<TableDto[] | null>(null);
  const [hosted, setHosted] = useState<TableDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    const [j, h] = await Promise.all([
      api.myJoinedTables(),
      user.canHost ? api.myHostedTables() : Promise.resolve([] as TableDto[]),
    ]);
    setJoined(j);
    setHosted(h);
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [j, h] = await Promise.all([
          api.myJoinedTables(),
          user.canHost ? api.myHostedTables() : Promise.resolve([] as TableDto[]),
        ]);
        if (active) {
          setJoined(j);
          setHosted(h);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load your meetups');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  async function leave(t: TableDto) {
    const message =
      t.myRequestStatus === 'APPROVED'
        ? 'Leave this table? Your seat opens up for someone else.'
        : 'Cancel your request to join?';
    if (!window.confirm(message)) return;
    setBusy(t.id);
    try {
      await api.leaveTable(t.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update your request');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please{' '}
        <Link href="/login" className="underline">
          sign in
        </Link>{' '}
        first.
      </main>
    );

  const active = (joined ?? []).filter(
    (t) => t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING',
  );
  const showHosting = user.canHost && (hosted ?? []).length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">You’re part of</p>
          <h1 className="display mt-1 text-3xl">My meetups</h1>
        </div>
        <Link href="/tables" className="text-primary text-sm font-semibold hover:underline">
          Find a table →
        </Link>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}
      {joined === null && !error && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-6" />
        </div>
      )}

      {/* Tables you've joined */}
      {joined !== null && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h2 className="font-heading text-xl font-bold tracking-tight">Joined</h2>
            {active.length > 0 && <Badge variant="secondary">{active.length}</Badge>}
          </div>

          {active.length === 0 ? (
            <div className="rounded-3xl border border-dashed py-12 text-center">
              <p className="text-3xl">🎟️</p>
              <p className="text-muted-foreground mt-2 text-sm">
                You haven’t joined a table yet.{' '}
                <Link href="/tables" className="text-primary font-semibold hover:underline">
                  Browse tables →
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((t) => {
                const approved = t.myRequestStatus === 'APPROVED';
                return (
                  <Card key={t.id} className="flex-row gap-0 p-0">
                    <div
                      className={`w-2 shrink-0 ${approved ? 'bg-primary' : 'bg-gradient-ember'}`}
                    />
                    <CardContent className="flex-1 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/tables/${t.id}`}
                          className="font-heading text-lg font-bold tracking-tight hover:underline"
                        >
                          {emojiFor(t.category)} {t.title ?? t.category}
                        </Link>
                        <Badge variant={approved ? 'success' : 'warning'}>
                          {approved ? 'You’re in' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                        <p>🗓️ {formatDateTime(t.startAt)}</p>
                        <p>📍 {t.venueName ?? t.cafe?.name ?? 'Location on details'}</p>
                        <p>
                          🙋 Hosted by {t.host?.firstName ?? 'a host'} {t.host?.lastInitial ?? ''}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-heading text-primary text-base font-extrabold">
                          {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                        </span>
                        <div className="flex items-center gap-3">
                          {approved && (
                            <Link
                              href={`/tables/${t.id}/chat`}
                              className="text-primary text-xs font-semibold hover:underline"
                            >
                              Chat →
                            </Link>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busy === t.id}
                            onClick={() => void leave(t)}
                          >
                            {busy === t.id ? '…' : approved ? 'Leave' : 'Cancel request'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tables you host */}
      {showHosting && (
        <section className="mt-10 space-y-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="font-heading text-xl font-bold tracking-tight">Hosting</h2>
              <Badge variant="secondary">{hosted!.length}</Badge>
            </div>
            <Link href="/tables/new" className={buttonVariants({ size: 'sm' })}>
              + Host a table
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {hosted!.map((t) => {
              const filled = t.seats - t.seatsLeft;
              return (
                <Card key={t.id} className="flex-row gap-0 p-0">
                  <div className="bg-ink w-2 shrink-0" />
                  <CardContent className="flex-1 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/tables/${t.id}`}
                        className="font-heading text-lg font-bold tracking-tight hover:underline"
                      >
                        {emojiFor(t.category)} {t.title ?? t.category}
                      </Link>
                      <Badge variant="outline">{t.status.toLowerCase()}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                      <p>🗓️ {formatDateTime(t.startAt)}</p>
                      <p>📍 {t.venueName ?? t.cafe?.name ?? 'Location on details'}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        🪑 {filled} / {t.seats} seats filled
                      </span>
                      <Link
                        href={`/tables/${t.id}`}
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        Manage requests →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

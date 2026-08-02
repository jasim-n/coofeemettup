'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type AdminTableDto, type TableJoinRequestDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const STATUS_FILTERS = ['ALL', 'OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function accentClass(status: string) {
  if (status === 'OPEN') return 'bg-primary';
  if (status === 'FULL') return 'bg-gradient-ember';
  if (status === 'CANCELLED' || status === 'CLOSED') return 'bg-muted';
  if (status === 'COMPLETED') return 'bg-ink';
  return 'bg-muted';
}

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary';
function statusBadgeVariant(status: string): BadgeVariant {
  if (status === 'OPEN') return 'success';
  if (status === 'FULL') return 'warning';
  if (status === 'CANCELLED') return 'destructive';
  return 'secondary';
}

export default function AdminTablesPage() {
  const { user, loading } = useAuth();
  const [tables, setTables] = useState<AdminTableDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const [reqs, setReqs] = useState<Record<string, TableJoinRequestDto[] | null>>({});
  const [reqBusy, setReqBusy] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  async function refresh() {
    if (!user) return;
    setTables(await api.adminListTables());
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const list = await api.adminListTables();
        if (active) setTables(list);
      } catch (err) {
        if (active)
          setError(err instanceof ApiError ? err.message : 'Failed to load tables');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <PageLoader />;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only.{' '}
        <Link href="/" className="underline">
          Home
        </Link>
      </main>
    );

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active
        ? 'bg-primary text-primary-foreground border-transparent'
        : 'bg-card hover:bg-muted'
    }`;

  const visible = (tables ?? []).filter(
    (t) => filter === 'ALL' || t.status === filter,
  );

  async function toggleRequests(tableId: string) {
    if (openId === tableId) {
      setOpenId(null);
      return;
    }
    setOpenId(tableId);
    setReqs((m) => ({ ...m, [tableId]: null }));
    try {
      const list = await api.adminTableRequests(tableId);
      setReqs((m) => ({ ...m, [tableId]: list }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load requests');
      setReqs((m) => ({ ...m, [tableId]: [] }));
    }
  }

  async function handleRequest(
    tableId: string,
    reqId: string,
    action: 'approve' | 'decline',
  ) {
    setReqBusy(reqId);
    try {
      if (action === 'approve') {
        await api.adminApproveRequest(tableId, reqId);
      } else {
        await api.adminDeclineRequest(tableId, reqId);
      }
      await refresh();
      const updated = await api.adminTableRequests(tableId);
      setReqs((m) => ({ ...m, [tableId]: updated }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process request');
    } finally {
      setReqBusy(null);
    }
  }

  async function cancelTable(t: AdminTableDto) {
    if (!window.confirm('Cancel this table? Guests lose their seats.')) return;
    setBusy(t.id);
    try {
      await api.adminCancelTable(t.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel table');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Console</p>
          <h1 className="display mt-1 text-3xl">Tables</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/admin/cafes" className="text-primary hover:underline">
            Cafes
          </Link>
          <Link href="/admin/tables" className="text-primary hover:underline">
            Tables
          </Link>
          <Link href="/admin/activity" className="text-muted-foreground hover:underline">
            Activity
          </Link>
          <Link href="/admin/verifications" className="text-muted-foreground hover:underline">
            Verifications
          </Link>
          <Link href="/admin/reports" className="text-muted-foreground hover:underline">
            Reports
          </Link>
        </nav>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={chip(filter === s)}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        {tables !== null && (
          <Badge variant="secondary" className="ml-1">
            {visible.length}
          </Badge>
        )}
      </div>

      {/* Loading */}
      {tables === null && !error && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-6" />
        </div>
      )}

      {/* Empty state */}
      {tables !== null && visible.length === 0 && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">🪑</p>
          <p className="text-muted-foreground mt-2 text-sm">
            No tables match this filter.
          </p>
        </div>
      )}

      {/* Table cards */}
      {visible.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((t) => (
            <Card key={t.id} className="flex-row gap-0 p-0">
              <div className={`w-2 shrink-0 ${accentClass(t.status)}`} />
              <CardContent className="flex-1 py-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/tables/${t.id}`}
                    className="font-heading text-lg font-bold tracking-tight hover:underline"
                  >
                    {emojiFor(t.category)} {t.title ?? t.category}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {t.pendingRequests > 0 && (
                      <button
                        type="button"
                        onClick={() => void toggleRequests(t.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/20"
                      >
                        Requests ({t.pendingRequests})
                        <span className="text-[10px] leading-none">
                          {openId === t.id ? '▲' : '▼'}
                        </span>
                      </button>
                    )}
                    <Badge variant={statusBadgeVariant(t.status)}>
                      {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                </div>

                <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                  <p>🗓️ {formatDateTime(t.startAt)}</p>
                  <p>📍 {t.venueName ?? t.cafe?.name ?? '—'}</p>
                  <p>
                    🙋 {t.host?.firstName ?? 'host'} {t.host?.lastInitial ?? ''}
                  </p>
                  <p>
                    🪑 {t.seats - t.seatsLeft} / {t.seats} filled
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-heading text-primary text-base font-extrabold">
                    {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/tables/${t.id}`}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      View →
                    </Link>
                    {(t.status === 'OPEN' || t.status === 'FULL') && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={busy === t.id}
                        onClick={() => void cancelTable(t)}
                      >
                        {busy === t.id ? '…' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline join-request panel */}
                {openId === t.id && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-muted-foreground mb-2.5 text-xs font-semibold uppercase tracking-wider">
                      Join Requests
                    </p>

                    {reqs[t.id] === null ? (
                      <div className="flex items-center justify-center py-3">
                        <Spinner className="text-primary size-5" />
                      </div>
                    ) : reqs[t.id]!.length === 0 ? (
                      <p className="text-muted-foreground py-2 text-sm">
                        No pending requests.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {reqs[t.id]!.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                          >
                            <span className="text-sm font-medium">
                              {r.user?.firstName ?? 'Guest'}{' '}
                              {r.user?.lastInitial ?? ''}
                              {r.user?.reliabilityScore != null && (
                                <span className="text-muted-foreground ml-1.5 text-xs">
                                  ⭐ {r.user.reliabilityScore}
                                </span>
                              )}
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Button
                                size="xs"
                                disabled={reqBusy === r.id}
                                onClick={() => void handleRequest(t.id, r.id, 'approve')}
                              >
                                {reqBusy === r.id ? <Spinner className="size-3.5" /> : 'Approve'}
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={reqBusy === r.id}
                                onClick={() => void handleRequest(t.id, r.id, 'decline')}
                              >
                                Decline
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

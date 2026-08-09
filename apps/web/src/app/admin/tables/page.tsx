'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type AdminTableDto, type AdminTableParticipants } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader, Spinner } from '@/components/spinner';
import { categoryIcon } from '@/lib/category-icon';

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

function participantName(u: { firstName: string | null; lastInitial: string | null }) {
  if (u.firstName) return `${u.firstName}${u.lastInitial ? ` ${u.lastInitial}.` : ''}`;
  return 'Guest';
}

type TableBusy = { cancel?: boolean; delete?: boolean; manage?: boolean };
type TableErrors = { cancel?: string; delete?: string; manage?: string };

export default function AdminTablesPage() {
  const { user, loading } = useAuth();
  const [tables, setTables] = useState<AdminTableDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableBusy, setTableBusy] = useState<Record<string, TableBusy>>({});
  const [tableErrors, setTableErrors] = useState<Record<string, TableErrors>>({});
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  // expanded manage panel per table
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // participants cache per table id
  const [participants, setParticipants] = useState<Record<string, AdminTableParticipants>>({});
  // per-participant busy/error
  const [participantBusy, setParticipantBusy] = useState<Record<string, boolean>>({});
  const [participantError, setParticipantError] = useState<Record<string, string>>({});

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

  function setBusyFor(id: string, key: keyof TableBusy, value: boolean) {
    setTableBusy((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  function setErrorFor(id: string, key: keyof TableErrors, msg: string | null) {
    setTableErrors((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: msg ?? undefined },
    }));
  }

  async function cancelTable(t: AdminTableDto) {
    if (!window.confirm('Cancel this table? Guests lose their seats.')) return;
    setBusyFor(t.id, 'cancel', true);
    setErrorFor(t.id, 'cancel', null);
    try {
      await api.adminCancelTable(t.id);
      await refresh();
    } catch (err) {
      setErrorFor(t.id, 'cancel', err instanceof ApiError ? err.message : 'Could not cancel table');
    } finally {
      setBusyFor(t.id, 'cancel', false);
    }
  }

  async function deleteTable(t: AdminTableDto) {
    if (
      !window.confirm(
        'Delete this table permanently? This removes its join requests, chat and reviews.',
      )
    )
      return;
    setBusyFor(t.id, 'delete', true);
    setErrorFor(t.id, 'delete', null);
    try {
      await api.adminDeleteTable(t.id);
      setTables((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    } catch (err) {
      setErrorFor(t.id, 'delete', err instanceof ApiError ? err.message : 'Could not delete table');
      setBusyFor(t.id, 'delete', false);
    }
  }

  async function toggleManage(t: AdminTableDto) {
    const isOpen = expanded[t.id];
    setExpanded((prev) => ({ ...prev, [t.id]: !isOpen }));
    if (!isOpen && !participants[t.id]) {
      setBusyFor(t.id, 'manage', true);
      setErrorFor(t.id, 'manage', null);
      try {
        const data = await api.adminTableParticipants(t.id);
        setParticipants((prev) => ({ ...prev, [t.id]: data }));
      } catch (err) {
        setErrorFor(t.id, 'manage', err instanceof ApiError ? err.message : 'Failed to load participants');
      } finally {
        setBusyFor(t.id, 'manage', false);
      }
    }
  }

  async function refetchParticipants(tableId: string) {
    try {
      const data = await api.adminTableParticipants(tableId);
      setParticipants((prev) => ({ ...prev, [tableId]: data }));
    } catch {
      // best-effort
    }
  }

  async function removeParticipant(tableId: string, userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this table?`)) return;
    const key = `${tableId}:${userId}`;
    setParticipantBusy((prev) => ({ ...prev, [key]: true }));
    setParticipantError((prev) => { const n = { ...prev }; delete n[key]; return n; });
    try {
      await api.adminRemoveParticipant(tableId, userId);
      await refetchParticipants(tableId);
    } catch (err) {
      setParticipantError((prev) => ({
        ...prev,
        [key]: err instanceof ApiError ? err.message : 'Could not remove participant',
      }));
    } finally {
      setParticipantBusy((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
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
          <Link href="/admin/reviews" className="text-muted-foreground hover:underline">
            Reviews
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
          {visible.map((t) => {
            const busy = tableBusy[t.id] ?? {};
            const errs = tableErrors[t.id] ?? {};
            const isExpanded = !!expanded[t.id];
            const pdata = participants[t.id];
            const anyBusy = busy.cancel || busy.delete || busy.manage;

            return (
              <Card key={t.id} className="flex-row gap-0 p-0">
                <div className={`w-2 shrink-0 ${accentClass(t.status)}`} />
                <CardContent className="flex-1 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/tables/${t.id}`}
                      className="font-heading text-lg font-bold tracking-tight hover:underline"
                    >
                      <i className={`fa-solid ${categoryIcon(t.category)}`} /> {t.title ?? t.category}
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {t.pendingRequests > 0 && (
                        <Badge variant="warning">{t.pendingRequests} pending</Badge>
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

                  {/* Inline errors */}
                  {errs.cancel && (
                    <p className="text-destructive mt-2 text-xs font-medium">{errs.cancel}</p>
                  )}
                  {errs.delete && (
                    <p className="text-destructive mt-2 text-xs font-medium">{errs.delete}</p>
                  )}
                  {errs.manage && (
                    <p className="text-destructive mt-2 text-xs font-medium">{errs.manage}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-heading text-primary text-base font-extrabold">
                      {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tables/${t.id}`}
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        View →
                      </Link>

                      {/* Manage toggle */}
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!!anyBusy}
                        onClick={() => void toggleManage(t)}
                      >
                        {busy.manage ? (
                          <Spinner className="size-3 text-primary" />
                        ) : (
                          <>
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} mr-1 text-[10px]`} />
                            Manage
                          </>
                        )}
                      </Button>

                      {/* Cancel (soft) */}
                      {(t.status === 'OPEN' || t.status === 'FULL') && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!!anyBusy}
                          onClick={() => void cancelTable(t)}
                        >
                          {busy.cancel ? <Spinner className="size-3 text-primary" /> : 'Cancel'}
                        </Button>
                      )}

                      {/* Delete (hard) */}
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!!anyBusy}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => void deleteTable(t)}
                      >
                        {busy.delete ? (
                          <Spinner className="size-3 text-rose-600" />
                        ) : (
                          <>
                            <i className="fa-solid fa-trash mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Manage panel */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      {busy.manage && (
                        <div className="flex justify-center py-4">
                          <Spinner className="size-5 text-primary" />
                        </div>
                      )}

                      {!busy.manage && pdata && (
                        <>
                          {/* Host row */}
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={participantName(pdata.host)}
                              src={pdata.host.photoUrl}
                              size={32}
                            />
                            <span className="text-sm font-semibold">
                              {participantName(pdata.host)}
                            </span>
                            <Badge className="bg-primary/10 text-primary">Host</Badge>
                            <span className="text-muted-foreground ml-auto text-xs">
                              {pdata.seats - pdata.seatsLeft}/{pdata.seats} seats filled
                            </span>
                          </div>

                          {/* Participants */}
                          {pdata.participants.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-2 text-center">
                              No participants yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {pdata.participants.map((p) => {
                                const pname = participantName(p.user);
                                const pkey = `${t.id}:${p.user.id}`;
                                const pBusy = !!participantBusy[pkey];
                                const pErr = participantError[pkey];
                                return (
                                  <div key={p.user.id} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Avatar name={pname} src={p.user.photoUrl} size={28} />
                                      <span className="text-sm flex-1 min-w-0 truncate">{pname}</span>
                                      <Badge
                                        variant={p.status === 'APPROVED' ? 'success' : 'warning'}
                                      >
                                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                                      </Badge>
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={pBusy}
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                                        onClick={() => void removeParticipant(t.id, p.user.id, pname)}
                                      >
                                        {pBusy ? (
                                          <Spinner className="size-3 text-destructive" />
                                        ) : (
                                          'Remove'
                                        )}
                                      </Button>
                                    </div>
                                    {pErr && (
                                      <p className="text-destructive text-xs font-medium pl-9">{pErr}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

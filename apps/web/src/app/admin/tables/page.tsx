'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type AdminTableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
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

export default function AdminTablesPage() {
  const { user, loading } = useAuth();
  const [tables, setTables] = useState<AdminTableDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

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
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 py-8">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

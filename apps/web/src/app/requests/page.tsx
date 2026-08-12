'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type TableJoinRequestDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { useRequestsBadge } from '@/components/requests-badge';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { categoryIcon } from '@/lib/category-icon';
import { UserLink } from '@/components/user-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader, Spinner } from '@/components/spinner';

export default function RequestsPage() {
  const { user, loading } = useAuth();
  const { refresh: refreshBadge } = useRequestsBadge();
  const [reqs, setReqs] = useState<TableJoinRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    setReqs(await api.myTableRequests());
    // Keep the nav badge count in sync after an approve/decline.
    refreshBadge();
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const data = await api.myTableRequests();
        if (active) setReqs(data);
      } catch (err) {
        if (active)
          setError(err instanceof ApiError ? err.message : 'Failed to load requests');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  async function approve(r: TableJoinRequestDto) {
    setBusy(r.id);
    try {
      await api.approveTableRequest(r.tableId, r.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not approve request');
    } finally {
      setBusy(null);
    }
  }

  async function decline(r: TableJoinRequestDto) {
    setBusy(r.id);
    try {
      await api.declineTableRequest(r.tableId, r.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not decline request');
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

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Host inbox</p>
          <h1 className="display mt-1 text-3xl">Requests</h1>
        </div>
        <Link href="/meetups" className="text-primary text-sm font-semibold hover:underline">
          Your Tables →
        </Link>
      </div>

      {!user.canHost && (
        <Card className="mb-6 p-5">
          <CardContent className="p-0">
            <p className="font-heading font-bold">Only hosts manage join requests.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Become a host to start managing your own table requests.
            </p>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {reqs === null && !error && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-6" />
        </div>
      )}

      {reqs !== null && reqs.length === 0 && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <i className="fa-solid fa-inbox text-muted-foreground text-3xl" />
          <p className="text-muted-foreground mt-2 text-sm">
            No pending requests &mdash; you&apos;re all caught up.
          </p>
          {user.canHost && (
            <Link
              href="/tables/new"
              className="text-primary mt-2 inline-block text-sm font-semibold hover:underline"
            >
              Host a table →
            </Link>
          )}
        </div>
      )}

      {reqs !== null && reqs.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {reqs.map((r) => (
            <Card key={r.id} className="flex-row gap-0 p-0">
              <div className="bg-gradient-ember w-2 shrink-0" />
              <CardContent className="flex-1 py-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/tables/${r.tableId}`}
                    className="font-heading text-lg font-bold tracking-tight hover:underline"
                  >
                    <i className={`fa-solid ${categoryIcon(r.table?.category)} mr-1`} />
                    {r.table?.title ?? r.table?.category ?? 'Your table'}
                  </Link>
                  <Badge variant="warning">pending</Badge>
                </div>

                <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                  <p className="flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-day" />{r.table ? formatDateTime(r.table.startAt) : ''}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <i className="fa-solid fa-location-dot" />{r.table?.venueName ?? '—'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <i className="fa-solid fa-user" />
                    <UserLink userId={r.userId}>
                      @{r.user?.username ?? 'member'}
                    </UserLink>
                    {r.user?.reliabilityScore != null && (
                      <> · <i className="fa-solid fa-star" /> {r.user.reliabilityScore}</>
                    )}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy === r.id}
                    onClick={() => void approve(r)}
                  >
                    {busy === r.id ? '…' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={() => void decline(r)}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

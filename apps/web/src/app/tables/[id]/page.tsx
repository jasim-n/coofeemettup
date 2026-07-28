'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApiError,
  type TableDto,
  type TableJoinRequestDto,
  type UserReputation,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stars } from '@/components/stars';
import TableReviews from '@/components/table-reviews';
import { PageLoader } from '@/components/spinner';

export default function TableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [table, setTable] = useState<TableDto | null>(null);
  const [requests, setRequests] = useState<TableJoinRequestDto[]>([]);
  const [hostRep, setHostRep] = useState<UserReputation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isHost = !!table && !!user && table.hostId === user.id;

  const load = useCallback(async () => {
    const t = await api.getTable(id);
    setTable(t);
    api.userReviews(t.hostId).then(setHostRep).catch(() => undefined);
    if (user && t.hostId === user.id) {
      setRequests(await api.tableRequests(id));
    }
  }, [id, user]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load table');
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

  if (error && !table) return <main className="p-6 text-destructive text-sm">{error}</main>;
  if (!table) return <PageLoader />;

  const status = table.myRequestStatus;
  const full = table.seatsLeft <= 0 || table.status !== 'OPEN';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href="/tables" className="text-primary text-sm font-semibold hover:underline">
        ← All tables
      </Link>

      <div className="mt-5 overflow-hidden rounded-3xl shadow-glow">
        <div className="bg-ink relative px-6 py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-6 size-40 rounded-full bg-gradient-hero opacity-40 blur-2xl"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-white/60">{table.category}</p>
              <h1 className="font-heading mt-1 text-2xl font-extrabold tracking-tight text-white">
                {table.title ?? table.category}
              </h1>
            </div>
            <Badge variant="brand" className="mt-1 shrink-0">
              {table.pricePKR == null ? 'Free' : formatPKR(table.pricePKR)}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Hosted by {table.host?.firstName ?? 'a host'} {table.host?.lastInitial ?? ''}
          </p>
          {hostRep && hostRep.hostRating.count > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <Stars value={Math.round(hostRep.hostRating.avg)} size="text-sm" />
              <span className="text-xs text-white/70">
                {hostRep.hostRating.avg} · {hostRep.hostRating.count} review
                {hostRep.hostRating.count === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        <div className="bg-card space-y-5 px-6 py-5">
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>🗓️ {formatDateTime(table.startAt)}</p>
            <p>📍 {table.venueName ?? table.cafe?.name ?? table.venueAddress ?? 'See map'}</p>
            <p>
              🪑 <span className="text-foreground font-semibold">{table.seatsLeft}</span> of{' '}
              {table.seats} seats left
            </p>
          </div>

          {table.description && (
            <div>
              <p className="eyebrow text-primary mb-1">About</p>
              <p className="text-sm">{table.description}</p>
            </div>
          )}
          {table.rules && (
            <div>
              <p className="eyebrow text-primary mb-1">House rules</p>
              <p className="text-muted-foreground text-sm">{table.rules}</p>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          {/* ---- Guest actions ---- */}
          {!isHost && (
            <div className="space-y-2">
              {status === 'APPROVED' ? (
                <>
                  <p className="text-foreground font-medium">You’re in! 🎉</p>
                  <Link
                    href={`/tables/${id}/chat`}
                    className={buttonVariants({ variant: 'hero', size: 'lg', className: 'w-full' })}
                  >
                    💬 Open group chat
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void run(() => api.leaveTable(id))}
                  >
                    Leave table
                  </Button>
                </>
              ) : status === 'PENDING' ? (
                <>
                  <div className="rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">
                    ⏳ Request sent — waiting for the host to approve.
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void run(() => api.leaveTable(id))}
                  >
                    Cancel request
                  </Button>
                </>
              ) : full ? (
                <div className="rounded-2xl bg-muted px-4 py-3 text-sm font-medium">
                  This table is full.
                </div>
              ) : (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void run(() => api.requestJoinTable(id))}
                >
                  {busy ? 'Sending…' : 'Request to join →'}
                </Button>
              )}
            </div>
          )}

          {/* ---- Host controls ---- */}
          {isHost && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-primary">Join requests</p>
                <Link
                  href={`/tables/${id}/chat`}
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  💬 Group chat →
                </Link>
              </div>
              {requests.length === 0 && (
                <p className="text-muted-foreground text-sm">No pending requests.</p>
              )}
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border p-3"
                >
                  <span className="text-sm font-medium">
                    {r.user?.firstName ?? 'Guest'} {r.user?.lastInitial ?? ''}
                    {r.user ? (
                      <span className="text-muted-foreground text-xs font-normal">
                        {' '}
                        · ⭐ {r.user.reliabilityScore}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      disabled={busy}
                      onClick={() => void run(() => api.approveTableRequest(id, r.id))}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void run(() => api.declineTableRequest(id, r.id))}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(isHost || status === 'APPROVED') && <TableReviews tableId={id} />}
        </div>
      </div>
    </main>
  );
}

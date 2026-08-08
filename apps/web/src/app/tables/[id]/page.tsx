'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApiError,
  type PublicUser,
  type TableDto,
  type TableJoinRequestDto,
  type UserReputation,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stars } from '@/components/stars';
import TableReviews from '@/components/table-reviews';
import { PageLoader } from '@/components/spinner';
import { SaveButton } from '@/components/save-button';
import { UserLink } from '@/components/user-link';

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
const initial = (s?: string | null) => (s ?? '?').charAt(0).toUpperCase();

export default function TableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [table, setTable] = useState<TableDto | null>(null);
  const [requests, setRequests] = useState<TableJoinRequestDto[]>([]);
  const [hostRep, setHostRep] = useState<UserReputation | null>(null);
  const [connections, setConnections] = useState<PublicUser[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
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

  // Load connections for invite picker (host only)
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const data = await api.myConnections();
        if (active) setConnections(data);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

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

  async function sendInvite(connectionId: string) {
    if (!table) return;
    try {
      await api.inviteToTable(table.id, connectionId);
      setInvited((prev) => new Set(prev).add(connectionId));
    } catch {
      /* best-effort */
    }
  }

  const personName = (u: PublicUser) =>
    `${u.firstName ?? 'Member'} ${u.lastInitial ?? ''}`.trim();

  if (error && !table) return <main className="p-6 text-destructive text-sm">{error}</main>;
  if (!table) return <PageLoader />;

  const status = table.myRequestStatus;
  const full = table.seatsLeft <= 0 || table.status !== 'OPEN';
  const filled = table.seats - table.seatsLeft;
  const price = table.pricePKR == null ? 'Free' : formatPKR(table.pricePKR);
  const venue = table.venueName ?? table.cafe?.name ?? table.venueAddress ?? 'See map';

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <Link href="/tables" className="text-primary text-sm font-semibold hover:underline">
        ← Back to all tables
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* ---------- main ---------- */}
        <div className="space-y-6 lg:col-span-2">
          {/* cover */}
          <div className="shadow-soft relative h-64 overflow-hidden rounded-3xl">
            <Cover category={table.category} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="glass ring-border/40 absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ring-1">
              {table.seatsLeft > 0 ? `${table.seatsLeft} seats left` : 'Full'}
            </span>
            <SaveButton tableId={table.id} saved={table.saved} className="absolute right-4 top-4" />
          </div>

          {/* title block */}
          <div>
            <Badge variant="secondary">
              {emojiFor(table.category)} {table.category}
            </Badge>
            <h1 className="display mt-2 text-3xl">{table.title ?? table.category}</h1>
            <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>📍 {venue}</span>
              <span>🗓️ {formatDateTime(table.startAt)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <UserLink userId={table.hostId} className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-bold">
                  {initial(table.host?.firstName)}
                </span>
                <span className="text-sm">
                  Hosted by{' '}
                  <span className="font-semibold">
                    {table.host?.firstName ?? 'a host'} {table.host?.lastInitial ?? ''}
                  </span>
                </span>
              </UserLink>
              {hostRep && hostRep.hostRating.count > 0 && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Stars value={Math.round(hostRep.hostRating.avg)} size="text-xs" />
                  {hostRep.hostRating.avg} ({hostRep.hostRating.count})
                </span>
              )}
            </div>
          </div>

          {/* stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon="👥" value={`${filled} / ${table.seats}`} label="Seats filled" />
            <StatTile icon="🪑" value={String(table.seatsLeft)} label="Seats left" />
            <StatTile icon="🎟️" value={price} label="Per person" />
            <StatTile icon="✨" value={table.category} label="Vibe" />
          </div>

          {/* about */}
          {(table.description || table.rules) && (
            <section className="bg-card shadow-soft rounded-3xl border p-6">
              <h2 className="font-heading text-lg font-bold tracking-tight">About this table</h2>
              {table.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {table.description}
                </p>
              )}
              {table.rules && (
                <div className="bg-secondary/50 mt-4 rounded-2xl p-4">
                  <p className="eyebrow text-primary mb-1">House rules</p>
                  <p className="text-muted-foreground text-sm">{table.rules}</p>
                </div>
              )}
            </section>
          )}

          {/* host card */}
          <section className="bg-card shadow-soft rounded-3xl border p-6">
            <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">About the host</h2>
            <div className="flex items-center gap-3">
              <UserLink userId={table.hostId} className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary font-heading grid size-12 place-items-center rounded-full text-lg font-bold">
                  {initial(table.host?.firstName)}
                </span>
                <div>
                  <p className="font-heading font-bold">
                    {table.host?.firstName ?? 'a host'} {table.host?.lastInitial ?? ''}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {hostRep && hostRep.hostRating.count > 0
                      ? `⭐ ${hostRep.hostRating.avg} · ${hostRep.hostRating.count} review${hostRep.hostRating.count === 1 ? '' : 's'}`
                      : 'New host'}
                  </p>
                </div>
              </UserLink>
            </div>
          </section>

          {/* host controls */}
          {isHost && (
            <section className="bg-card shadow-soft rounded-3xl border p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold tracking-tight">Join requests</h2>
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
              <div className="space-y-2">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border p-3"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {(r.user?.id ?? r.userId) ? (
                        <UserLink userId={(r.user?.id ?? r.userId)!} className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-bold">
                            {initial(r.user?.firstName)}
                          </span>
                          {r.user?.firstName ?? 'Guest'} {r.user?.lastInitial ?? ''}
                        </UserLink>
                      ) : (
                        <>
                          <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-bold">
                            {initial(r.user?.firstName)}
                          </span>
                          {r.user?.firstName ?? 'Guest'} {r.user?.lastInitial ?? ''}
                        </>
                      )}
                      {r.user && (
                        <span className="text-muted-foreground text-xs font-normal">
                          · ⭐ {r.user.reliabilityScore}
                        </span>
                      )}
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
            </section>
          )}

          {/* invite people (host only) */}
          {isHost && (
            <section className="bg-card shadow-soft rounded-3xl border p-6">
              <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">Invite people</h2>
              {connections.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Connect with people to invite them.{' '}
                  <Link href="/connections" className="text-primary font-semibold hover:underline">
                    Find connections →
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => {
                    const alreadyInvited = invited.has(conn.id);
                    return (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                      >
                        <UserLink userId={conn.id} className="flex items-center gap-2 text-sm font-medium">
                          <Avatar name={personName(conn)} size={32} />
                          {personName(conn)}
                        </UserLink>
                        <Button
                          size="xs"
                          variant={alreadyInvited ? 'secondary' : 'default'}
                          disabled={alreadyInvited}
                          onClick={() => void sendInvite(conn.id)}
                        >
                          {alreadyInvited ? 'Invited ✓' : 'Invite'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* reviews */}
          {(isHost || status === 'APPROVED') && (
            <section className="bg-card shadow-soft rounded-3xl border p-6">
              <h2 className="font-heading mb-2 text-lg font-bold tracking-tight">
                What people are saying
              </h2>
              <TableReviews tableId={id} />
            </section>
          )}
        </div>

        {/* ---------- sticky rail ---------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* join card */}
          <div className="bg-card shadow-glow rounded-3xl border p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-heading font-bold tracking-tight">Join this table</p>
              <Badge variant="brand">{price}</Badge>
            </div>
            <div
              className={`mt-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                full ? 'bg-muted' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {table.seatsLeft > 0
                ? `🪑 ${table.seatsLeft} seat${table.seatsLeft === 1 ? '' : 's'} left${table.seatsLeft <= 2 ? ' — filling up fast!' : ''}`
                : 'This table is full.'}
            </div>

            {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

            {/* guest actions */}
            {!isHost ? (
              <div className="mt-4 space-y-2">
                {status === 'APPROVED' ? (
                  <>
                    <p className="text-foreground text-sm font-medium">You’re in! 🎉</p>
                    <Link
                      href={`/tables/${id}/chat`}
                      className={buttonVariants({
                        variant: 'hero',
                        size: 'lg',
                        className: 'w-full',
                      })}
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
                    <div className="bg-secondary rounded-2xl px-4 py-3 text-sm font-medium">
                      ⏳ Request sent — waiting for the host.
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
                  <Button variant="hero" size="lg" className="w-full" disabled>
                    Table full
                  </Button>
                ) : user && !user.codeOfConductAt ? (
                  <>
                    <p className="text-muted-foreground text-sm">
                      Accept the Community Code of Conduct in your profile before joining.
                    </p>
                    <Link
                      href="/profile#code-of-conduct"
                      className={buttonVariants({
                        variant: 'hero',
                        size: 'lg',
                        className: 'w-full',
                      })}
                    >
                      Accept in profile →
                    </Link>
                  </>
                ) : (
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void run(() => api.requestJoinTable(id))}
                  >
                    {busy ? 'Sending…' : 'Join Table'}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-sm">
                You’re hosting this table — manage requests below.
              </p>
            )}
          </div>

          {/* table details */}
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            <p className="font-heading mb-3 font-bold tracking-tight">Table details</p>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground">📍 {venue}</span>
                <Link href="/tables/nearby" className="text-primary shrink-0 font-semibold">
                  Map
                </Link>
              </li>
              <li className="text-muted-foreground">🗓️ {formatDateTime(table.startAt)}</li>
              <li className="text-muted-foreground">🎟️ {price} per person</li>
              <li className="text-muted-foreground">✓ Leave anytime before it starts</li>
            </ul>
          </div>

          {/* who's joining */}
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            <p className="font-heading mb-3 font-bold tracking-tight">Who’s joining</p>
            {filled > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(filled, 5) }).map((_, i) => (
                    <span
                      key={i}
                      className="bg-secondary ring-card grid size-8 place-items-center rounded-full text-xs ring-2"
                    >
                      👤
                    </span>
                  ))}
                </div>
                <span className="text-muted-foreground text-sm">
                  {filled} {filled === 1 ? 'person' : 'people'} going
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Be the first to join!</p>
            )}
          </div>

          {/* invite */}
          <div className="bg-secondary rounded-3xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-secondary-foreground font-bold tracking-tight">
                  Invite your friends
                </p>
                <p className="text-secondary-foreground/80 mt-1 text-sm">
                  Know someone who’d love this?
                </p>
                <Link
                  href="/invite"
                  className="text-primary mt-2 inline-block text-sm font-bold hover:underline"
                >
                  Invite friends →
                </Link>
              </div>
              <span className="text-2xl">🎉</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function StatTile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-card shadow-soft rounded-2xl border p-4 text-center">
      <span className="bg-primary/10 mx-auto grid size-9 place-items-center rounded-xl text-base">
        {icon}
      </span>
      <p className="font-heading mt-2 truncate text-sm font-extrabold tracking-tight">{value}</p>
      <p className="text-muted-foreground truncate text-xs">{label}</p>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApiError,
  type PublicUser,
  type TableDto,
  type TableImageDto,
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
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Stars } from '@/components/stars';
import TableReviews from '@/components/table-reviews';
import { PageLoader } from '@/components/spinner';
import { SaveButton } from '@/components/save-button';
import { UserLink } from '@/components/user-link';
import { CategoryPills } from '@/components/category-pills';
import { splitCategories } from '@/lib/category-icon';
import { haversineKm, formatDistance } from '@/lib/geo';
import { invalidateTablesClientCache } from '@/lib/data-cache';

const initial = (s?: string | null) => (s ?? '?').charAt(0).toUpperCase();

// Module-level timestamp: stable across re-renders, never called during render.
const NOW_MS = Date.now();

export default function TableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [table, setTable] = useState<TableDto | null>(null);
  const [requests, setRequests] = useState<TableJoinRequestDto[]>([]);
  const [participants, setParticipants] = useState<
    Array<{
      userId: string;
      status: string;
      createdAt: string;
      user: PublicUser | null;
    }>
  >([]);
  const [hostRep, setHostRep] = useState<UserReputation | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<PublicUser[]>([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<TableImageDto[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message?: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>(null);

  const isHost = !!table && !!user && table.hostId === user.id;

  // Ask for the viewer's location once so we can show distance to the table.
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}, // denied/unavailable → no distance shown
      { timeout: 8000 },
    );
  }, []);

  const load = useCallback(async () => {
    const t = await api.getTable(id);
    setTable(t);
    api.userReviews(t.hostId).then(setHostRep).catch(() => undefined);
    if (user && t.hostId === user.id) {
      const [reqs, members] = await Promise.all([
        api.tableRequests(id),
        api.tableParticipants(id),
      ]);
      setRequests(reqs);
      setParticipants(members);
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

  // Seed the "Invited ✓" state so it survives a refresh (host only).
  useEffect(() => {
    if (!user || !isHost) return;
    let active = true;
    void api
      .tableInvites(id)
      .then((invs) => {
        if (active) setInvited(new Set(invs.map((iv) => iv.inviteeId)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, isHost, id]);

  // Invite picker: empty until the host searches by @handle (debounced).
  // No pre-populated connections list; API matches username only.
  useEffect(() => {
    const q = inviteQuery.trim().replace(/^@/, '');
    let active = true;
    const t = setTimeout(() => {
      if (q.length < 2) {
        if (active) {
          setInviteResults([]);
          setInviteSearching(false);
        }
        return;
      }
      if (active) setInviteSearching(true);
      api
        .searchUsers(q)
        .then((rows) => {
          if (active) setInviteResults(rows);
        })
        .catch(() => {
          if (active) setInviteResults([]);
        })
        .finally(() => {
          if (active) setInviteSearching(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [inviteQuery]);

  // Load event photos — only for members (host or approved); endpoint 403s for others.
  useEffect(() => {
    if (!table?.id || !user) return;
    const isMember = isHost || table.myRequestStatus === 'APPROVED';
    if (!isMember) return;
    api.tableImages(table.id).then(setImages).catch(() => setImages([]));
  }, [table?.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      invalidateTablesClientCache();
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setImageError(null);
    setUploading(true);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const errors: string[] = [];
    // Upload each selected file; new photos appear as they finish.
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        errors.push(`${file.name}: only JPEG/PNG/WebP`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: over 5 MB`);
        continue;
      }
      try {
        const uploaded = await api.uploadTableImage(id, file);
        setImages((prev) => [uploaded, ...prev]);
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof ApiError ? err.message : 'failed'}`);
      }
    }
    setUploading(false);
    if (errors.length) setImageError(`Some photos weren't added — ${errors.join(' · ')}`);
  }

  async function handleImageDelete(imageId: string) {
    try {
      await api.deleteTableImage(id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      /* best-effort */
    }
  }

  const personName = (u: PublicUser) => `@${u.username ?? 'member'}`;

  // eventEnded uses module-level NOW_MS so Date.now() is never called during render.
  const eventEnded = table ? new Date(table.startAt).getTime() < NOW_MS : false;

  if (error && !table) return <main className="p-6 text-destructive text-sm">{error}</main>;
  if (!table) return <PageLoader />;

  const status = table.myRequestStatus;
  const full = table.seatsLeft <= 0 || table.status !== 'OPEN';
  const filled = table.seats - table.seatsLeft;
  const price = table.pricePKR == null ? 'Free' : formatPKR(table.pricePKR);
  const venue = table.venueName ?? table.cafe?.name ?? table.venueAddress ?? 'See map';
  // Google Maps deep-link for the pinned location — use exact coords when the
  // table (or its cafe) has them, otherwise fall back to the venue text.
  const mapLat = table.lat ?? table.cafe?.lat ?? null;
  const mapLng = table.lng ?? table.cafe?.lng ?? null;
  const mapQuery =
    mapLat != null && mapLng != null
      ? `${mapLat},${mapLng}`
      : [table.venueName, table.venueAddress, table.cafe?.name, table.cafe?.area]
          .filter(Boolean)
          .join(', ');
  const mapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;
  const distanceLabel =
    coords && mapLat != null && mapLng != null
      ? formatDistance(haversineKm(coords.lat, coords.lng, mapLat, mapLng))
      : null;
  const categories = splitCategories(table.category);

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      <Link href="/discover" className="text-primary text-sm font-semibold hover:underline">
        ← Back to all tables
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* ---------- main ---------- */}
        <div className="space-y-6 lg:col-span-2">
          {/* cover */}
          <div className="shadow-soft relative h-64 overflow-hidden rounded-3xl">
            <Cover src={table.imageUrl ?? undefined} category={table.category} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="glass ring-border/40 absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ring-1">
              {table.seatsLeft > 0 ? `${table.seatsLeft} seats left` : 'Full'}
            </span>
            <SaveButton tableId={table.id} saved={table.saved} className="absolute right-4 top-4" />
          </div>

          {/* title block */}
          <div>
            <CategoryPills category={table.category} variant="badge" />
            <h1 className="display mt-2 text-3xl">{table.title ?? table.category}</h1>
            <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  <i className="fa-solid fa-location-dot mr-1" />
                  {venue}
                </a>
              ) : (
                <span>
                  <i className="fa-solid fa-location-dot mr-1" />
                  {venue}
                </span>
              )}
              <span><i className="fa-solid fa-calendar-day mr-1" />{formatDateTime(table.startAt)}</span>
              {distanceLabel && (
                <span className="text-primary font-semibold">
                  <i className="fa-solid fa-route mr-1" />
                  {distanceLabel}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <UserLink userId={table.hostId} className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-bold">
                  {initial(table.host?.username)}
                </span>
                <span className="text-sm">
                  Hosted by{' '}
                  <span className="font-semibold">
                    @{table.host?.username ?? 'member'}
                  </span>
                </span>
              </UserLink>
              {hostRep &&
                (hostRep.overallRating?.count ?? hostRep.hostRating.count) > 0 && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Stars
                    value={Math.round(
                      hostRep.overallRating?.avg ?? hostRep.hostRating.avg,
                    )}
                    size="text-xs"
                  />
                  {hostRep.overallRating?.avg ?? hostRep.hostRating.avg} (
                  {hostRep.overallRating?.count ?? hostRep.hostRating.count})
                </span>
              )}
            </div>
          </div>

          {/* stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon="fa-users" value={`${filled} / ${table.seats}`} label="Seats filled" />
            <StatTile icon="fa-chair" value={String(table.seatsLeft)} label="Seats left" />
            <StatTile icon="fa-ticket" value={price} label="Per person" />
            <StatTile
              icon="fa-wand-magic-sparkles"
              value={categories[0] ?? '—'}
              label={categories.length > 1 ? `+${categories.length - 1} vibes` : 'Vibe'}
            />
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

          {/* event photos — members only */}
          {(isHost || status === 'APPROVED') && (
            <section className="bg-card shadow-soft rounded-3xl border p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-bold tracking-tight">
                  <i className="fa-solid fa-images text-primary mr-2" />Event photos
                </h2>
                {isHost && (
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent ${
                      uploading ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploading}
                      className="sr-only"
                      onChange={(e) => void handleImageUpload(e)}
                    />
                    <i className={`fa-solid ${uploading ? 'fa-spinner animate-spin' : 'fa-plus'} mr-1`} />
                    {uploading ? 'Uploading…' : 'Add photos'}
                  </label>
                )}
              </div>
              {imageError && (
                <p className="text-destructive mb-3 text-sm">{imageError}</p>
              )}
              {images.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {isHost
                    ? 'No photos yet — add some from the event.'
                    : "The host hasn't shared any photos yet."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="h-32 w-full rounded-2xl object-cover"
                      />
                      {isHost && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              title: 'Delete this photo?',
                              confirmLabel: 'Delete',
                              destructive: true,
                              onConfirm: () => void handleImageDelete(img.id),
                            })
                          }
                          className="bg-black/60 text-white hover:bg-black/80 absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full text-xs transition-colors"
                          aria-label="Delete photo"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  ))}
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
                  {initial(table.host?.username)}
                </span>
                <div>
                  <p className="font-heading font-bold">
                    @{table.host?.username ?? 'member'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {hostRep &&
                    (hostRep.overallRating?.count ?? hostRep.hostRating.count) > 0 ? (
                      <>
                        <i className="fa-solid fa-star mr-1 text-amber-400" />
                        {hostRep.overallRating?.avg ?? hostRep.hostRating.avg} ·{' '}
                        {hostRep.overallRating?.count ?? hostRep.hostRating.count} review
                        {(hostRep.overallRating?.count ?? hostRep.hostRating.count) === 1
                          ? ''
                          : 's'}
                      </>
                    ) : 'New host'}
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
                  <i className="fa-solid fa-comments mr-1" />Group chat →
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
                            {initial(r.user?.username)}
                          </span>
                          @{r.user?.username ?? 'member'}
                        </UserLink>
                      ) : (
                        <>
                          <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-bold">
                            {initial(r.user?.username)}
                          </span>
                          @{r.user?.username ?? 'member'}
                        </>
                      )}
                      {r.user && (
                        <span className="text-muted-foreground text-xs font-normal">
                          · <i className="fa-solid fa-star text-amber-400" /> {r.user.reliabilityScore}
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

              <div className="mt-6 border-t pt-4">
                <h3 className="font-heading mb-2 text-base font-bold tracking-tight">
                  Guests
                </h3>
                {participants.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No approved guests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between gap-2 rounded-2xl border p-3"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <UserLink userId={p.userId} className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-bold">
                              {initial(p.user?.username)}
                            </span>
                            @{p.user?.username ?? 'member'}
                          </UserLink>
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-rose-600 border-rose-300 hover:bg-rose-50"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title: 'Remove guest?',
                              message: `@${p.user?.username ?? 'member'} will lose their seat and chat access.`,
                              confirmLabel: 'Remove',
                              destructive: true,
                              onConfirm: () =>
                                void run(() => api.removeTableParticipant(id, p.userId)),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* invite people (host only) */}
          {isHost && (
            <section className="bg-card shadow-soft rounded-3xl border p-6">
              <h2 className="font-heading mb-1 text-lg font-bold tracking-tight">Invite people</h2>
              <p className="text-muted-foreground mb-3 text-xs">
                Search by @username only — phone, email, and names won’t match.
              </p>
              <div className="relative mb-3">
                <i className="fa-solid fa-magnifying-glass text-muted-foreground pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm" />
                <Input
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  placeholder="Search @username…"
                  autoComplete="off"
                  className="pl-10"
                />
              </div>
              {(() => {
                const q = inviteQuery.trim().replace(/^@/, '');
                const hasQuery = q.length >= 2;
                if (!hasQuery) {
                  return (
                    <div className="bg-muted/40 text-muted-foreground flex min-h-28 items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
                      Start typing a @username to find someone to invite.
                    </div>
                  );
                }
                if (inviteSearching) {
                  return (
                    <div className="bg-muted/40 text-muted-foreground flex min-h-28 items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
                      Searching…
                    </div>
                  );
                }
                if (inviteResults.length === 0) {
                  return (
                    <div className="bg-muted/40 text-muted-foreground flex min-h-28 items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
                      No @username matches “{q}”.
                    </div>
                  );
                }
                return (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {inviteResults.map((person) => {
                      const alreadyInvited = invited.has(person.id);
                      return (
                        <div
                          key={person.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                        >
                          <UserLink userId={person.id} className="flex items-center gap-2 text-sm font-medium">
                            <Avatar name={personName(person)} src={person.photoUrl} size={32} />
                            {personName(person)}
                          </UserLink>
                          <Button
                            size="xs"
                            variant={alreadyInvited ? 'secondary' : 'default'}
                            disabled={alreadyInvited}
                            onClick={() => void sendInvite(person.id)}
                          >
                            {alreadyInvited ? 'Invited ✓' : 'Invite'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          )}

          {/* reviews — only visible after the event has ended */}
          {eventEnded && (isHost || status === 'APPROVED') && (
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
              {table.seatsLeft > 0 ? (
                <><i className="fa-solid fa-chair mr-1" />{table.seatsLeft} seat{table.seatsLeft === 1 ? '' : 's'} left{table.seatsLeft <= 2 ? ' — filling up fast!' : ''}</>
              ) : 'This table is full.'}
            </div>

            {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

            {/* guest actions */}
            {!isHost ? (
              <div className="mt-4 space-y-2">
                {status === 'APPROVED' ? (
                  <>
                    <p className="text-foreground text-sm font-medium">
                      {"You're in!"} <i className="fa-solid fa-circle-check ml-1 text-primary" />
                    </p>
                    <Link
                      href={`/tables/${id}/chat`}
                      className={buttonVariants({
                        variant: 'hero',
                        size: 'lg',
                        className: 'w-full',
                      })}
                    >
                      <i className="fa-solid fa-comment mr-1.5" />Open group chat
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
                ) : table.myInvite ? (
                  <>
                    <div className="bg-secondary rounded-2xl px-4 py-3 text-sm font-medium">
                      <i className="fa-solid fa-envelope-open text-primary mr-1" />{' '}
                      {"You're invited to this table."}
                    </div>
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void run(() => api.acceptInvite(table.myInvite!.id))}
                    >
                      {busy ? '…' : 'Accept invite'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void run(() => api.declineInvite(table.myInvite!.id))}
                    >
                      Decline
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
              <div className="mt-4 space-y-3">
                <p className="text-muted-foreground text-sm">
                  {"You're"} hosting this table — manage requests below.
                </p>
                {!eventEnded &&
                  table.status !== 'COMPLETED' &&
                  table.status !== 'CANCELLED' && (
                    <Link
                      href={`/tables/${id}/edit`}
                      className={buttonVariants({
                        variant: 'outline',
                        className: 'w-full',
                      })}
                    >
                      <i className="fa-solid fa-pen mr-1.5" />Edit event
                    </Link>
                  )}
                {table.status !== 'COMPLETED' && table.status !== 'CANCELLED' ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        title: 'End this event?',
                        message: 'This marks it completed and unlocks reviews.',
                        confirmLabel: 'End event',
                        onConfirm: () => void run(() => api.completeTable(id)),
                      })
                    }
                  >
                    <i className="fa-solid fa-flag-checkered mr-1.5" />End event
                  </Button>
                ) : table.status === 'COMPLETED' ? (
                  <p className="text-muted-foreground text-center text-xs">
                    <i className="fa-solid fa-circle-check mr-1 text-primary" />Event ended
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* table details */}
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            <p className="font-heading mb-3 font-bold tracking-tight">Table details</p>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground"><i className="fa-solid fa-location-dot mr-1" />{venue}</span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary shrink-0 font-semibold hover:underline"
                  >
                    <i className="fa-solid fa-map-location-dot mr-1" />View on map
                  </a>
                )}
              </li>
              {distanceLabel && (
                <li className="text-primary font-semibold"><i className="fa-solid fa-route mr-1" />{distanceLabel}</li>
              )}
              <li className="text-muted-foreground"><i className="fa-solid fa-calendar-day mr-1" />{formatDateTime(table.startAt)}</li>
              <li className="text-muted-foreground"><i className="fa-solid fa-ticket mr-1" />{price} per person</li>
              <li className="text-muted-foreground">✓ Leave anytime before it starts</li>
            </ul>
          </div>

          {/* who's joining */}
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            <p className="font-heading mb-3 font-bold tracking-tight">{"Who's"} joining</p>
            {filled > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(filled, 5) }).map((_, i) => (
                    <span
                      key={i}
                      className="bg-secondary ring-card grid size-8 place-items-center rounded-full text-xs ring-2"
                    >
                      <i className="fa-solid fa-user" />
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
                  {"Know someone who'd love this?"}
                </p>
                <Link
                  href="/invite"
                  className="text-primary mt-2 inline-block text-sm font-bold hover:underline"
                >
                  Invite friends →
                </Link>
              </div>
              <i className="fa-solid fa-circle-check text-2xl text-primary" />
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        destructive={confirm?.destructive}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </main>
  );
}

function StatTile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-card shadow-soft rounded-2xl border p-4 text-center">
      <span className="bg-primary/10 text-primary mx-auto grid size-9 place-items-center rounded-xl text-base">
        <i className={`fa-solid ${icon}`} />
      </span>
      <p className="font-heading mt-2 truncate text-sm font-extrabold tracking-tight">{value}</p>
      <p className="text-muted-foreground truncate text-xs">{label}</p>
    </div>
  );
}

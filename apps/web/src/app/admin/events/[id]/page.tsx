'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApiError,
  type BookingWithUser,
  type GroupDto,
  type MatchResult,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminEventPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithUser[]>([]);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const [b, g] = await Promise.all([api.eventBookings(id), api.listGroups(id)]);
    setBookings(b);
    setGroups(g);
  }, [id, isAdmin]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

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

  async function doPreview() {
    setError(null);
    setBusy(true);
    try {
      setPreview(await api.suggestMatch(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not preview');
    } finally {
      setBusy(false);
    }
  }

  const nameOf = (userId: string) => {
    const b = bookings.find((x) => x.userId === userId);
    return b?.user.firstName ?? b?.user.phone ?? userId.slice(0, 6);
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-muted-foreground text-sm font-semibold hover:underline"
      >
        ← Admin
      </Link>

      <div className="mt-3 mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Event management</p>
          <h1 className="display mt-1 text-4xl uppercase">Bookings</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/admin/events/${id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Edit
          </Link>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  'Cancel this event? All bookings will be cancelled, paid attendees fully refunded, and everyone notified. This cannot be undone.',
                )
              ) {
                void run(() => api.cancelEvent(id));
              }
            }}
          >
            Cancel event
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      <Card className="rounded-3xl shadow-soft">
        <CardHeader className="pb-2">
          <p className="eyebrow text-primary">Attendance</p>
          <CardTitle className="font-heading font-bold tracking-tight">Paid attendees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.length === 0 && (
            <div className="rounded-3xl border border-dashed py-10 text-center">
              <p className="text-3xl">🎟️</p>
              <p className="text-muted-foreground mt-2 text-sm">No paid bookings yet.</p>
            </div>
          )}
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm"
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(b.userId)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, b.userId] : prev.filter((x) => x !== b.userId),
                    )
                  }
                />
                <span className="font-medium">{b.user.firstName ?? b.user.phone}</span>
                <Badge variant="secondary">{b.attendanceStatus}</Badge>
                <span className="text-muted-foreground text-xs">rel {b.user.reliabilityScore}</span>
              </label>
              <div className="flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => api.markAttendance(b.id, 'ATTENDED'))}
                >
                  Attended
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => api.markAttendance(b.id, 'NO_SHOW'))}
                >
                  No-show
                </Button>
              </div>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={busy || selected.length === 0}
              onClick={() =>
                void run(async () => {
                  await api.createGroup(id, selected);
                  setSelected([]);
                })
              }
            >
              Form group from {selected.length} selected
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void doPreview()}>
              Preview matches (v1)
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.generateMatch(id);
                  setPreview(null);
                })
              }
            >
              Auto-generate groups (v1)
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="eyebrow text-primary">Preview</p>
              <h2 className="font-heading font-bold tracking-tight">
                Suggested groups — not saved
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-muted-foreground text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
          {preview.groups.length === 0 && (
            <div className="rounded-3xl border border-dashed py-10 text-center">
              <p className="text-3xl">🤔</p>
              <p className="text-muted-foreground mt-2 text-sm">
                No suggestions — need paid attendees.
              </p>
            </div>
          )}
          <div className="space-y-2">
            {preview.groups.map((g, i) => (
              <Card
                key={i}
                className={`rounded-3xl shadow-soft ${g.oddOneOut.length > 0 ? 'border-destructive/50' : ''}`}
              >
                <CardContent className="space-y-1 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold tracking-tight">
                      Group {i + 1} · {g.userIds.length} members
                    </span>
                    <Badge variant="secondary">match {Math.round(g.score * 100)}%</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{g.userIds.map(nameOf).join(', ')}</p>
                  <p className="text-muted-foreground text-xs">
                    energy{' '}
                    {Object.entries(g.energyMix)
                      .map(([k, v]) => `${k.toLowerCase()}:${v}`)
                      .join(' · ')}{' '}
                    · {g.newcomerCount} newcomer(s)
                  </p>
                  {g.oddOneOut.length > 0 && (
                    <p className="text-destructive text-xs">
                      ⚠ odd-one-out: {g.oddOneOut.map(nameOf).join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {preview.unassigned.length > 0 && (
            <p className="text-muted-foreground mt-2 text-xs">
              Unassigned: {preview.unassigned.map(nameOf).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <p className="eyebrow text-primary">Formed groups</p>
        <h2 className="font-heading mb-3 font-bold tracking-tight">Groups</h2>
        <div className="space-y-2">
          {groups.length === 0 && (
            <div className="rounded-3xl border border-dashed py-10 text-center">
              <p className="text-3xl">👥</p>
              <p className="text-muted-foreground mt-2 text-sm">No groups yet.</p>
            </div>
          )}
          {groups.map((g) => (
            <Card key={g.id} className="rounded-3xl shadow-soft">
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="text-muted-foreground">{g.algoVersion} · </span>
                  <span className="font-medium">{g.userIds.length} members</span>
                </span>
                {g.matchScore !== null && (
                  <Badge variant="secondary">match {Math.round(g.matchScore * 100)}%</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

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
import { Button } from '@/components/ui/button';
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
      <Link href="/admin" className="text-muted-foreground text-sm hover:underline">
        ← Admin
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Event bookings</h1>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive/40"
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
      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Paid attendees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.length === 0 && (
            <p className="text-muted-foreground text-sm">No paid bookings yet.</p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
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
                <span>{b.user.firstName ?? b.user.phone}</span>
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
          <div className="mt-2 flex flex-wrap gap-2">
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
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Suggested groups (preview — not saved)</h2>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-muted-foreground text-xs hover:underline"
            >
              Dismiss
            </button>
          </div>
          {preview.groups.length === 0 && (
            <p className="text-muted-foreground text-sm">No suggestions — need paid attendees.</p>
          )}
          <div className="space-y-2">
            {preview.groups.map((g, i) => (
              <Card key={i} className={g.oddOneOut.length > 0 ? 'border-destructive/50' : undefined}>
                <CardContent className="space-y-1 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
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

      <h2 className="mt-6 mb-2 text-sm font-medium">Groups</h2>
      <div className="space-y-2">
        {groups.length === 0 && <p className="text-muted-foreground text-sm">No groups yet.</p>}
        {groups.map((g) => (
          <Card key={g.id}>
            <CardContent className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="text-muted-foreground">{g.algoVersion} · </span>
                {g.userIds.length} members
              </span>
              {g.matchScore !== null && (
                <Badge variant="secondary">match {Math.round(g.matchScore * 100)}%</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

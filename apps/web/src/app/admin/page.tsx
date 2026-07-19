'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type Cafe, type CreateEventInput, type EventDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<EventDto[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [form, setForm] = useState({
    cafeId: '',
    title: '',
    startAt: '',
    genderTrack: 'MIXED',
    area: 'F-7',
    capacity: '8',
    pricePKR: '900',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(() => {
    if (!isAdmin) return;
    api.listAllEvents().then(setEvents).catch(() => undefined);
    api
      .listCafes()
      .then((list) => {
        setCafes(list);
        // Default the picker + area to the first cafe if not chosen yet.
        setForm((f) =>
          f.cafeId || list.length === 0
            ? f
            : { ...f, cafeId: list[0]!.id, area: list[0]!.area },
        );
      })
      .catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const input: CreateEventInput = {
        cafeId: form.cafeId,
        title: form.title || undefined,
        startAt: new Date(form.startAt).toISOString(),
        genderTrack: form.genderTrack as CreateEventInput['genderTrack'],
        area: form.area,
        capacity: Number(form.capacity),
        pricePKR: Number(form.pricePKR),
      };
      await api.createEvent(input);
      setForm((f) => ({ ...f, title: '', startAt: '' }));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/admin/cafes" className="text-primary hover:underline">
            Cafes
          </Link>
          <Link href="/admin/activity" className="text-primary hover:underline">
            Activity
          </Link>
          <Link href="/admin/verifications" className="text-primary hover:underline">
            Verifications
          </Link>
          <Link href="/admin/reports" className="text-primary hover:underline">
            Reports
          </Link>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Create event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cafeId">Cafe</Label>
                {cafes.length === 0 ? (
                  <p className="text-muted-foreground py-1.5 text-xs">
                    No cafes yet —{' '}
                    <Link href="/admin/cafes" className="underline">
                      add one
                    </Link>
                    .
                  </p>
                ) : (
                  <select
                    id="cafeId"
                    className={selectClass}
                    value={form.cafeId}
                    onChange={(e) => {
                      const cafe = cafes.find((c) => c.id === e.target.value);
                      setForm((f) => ({
                        ...f,
                        cafeId: e.target.value,
                        area: cafe?.area ?? f.area,
                      }));
                    }}
                  >
                    {cafes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.area}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startAt">Starts at</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gender track</Label>
                <select
                  className={selectClass}
                  value={form.genderTrack}
                  onChange={(e) => setForm((f) => ({ ...f, genderTrack: e.target.value }))}
                >
                  <option value="MIXED">Mixed</option>
                  <option value="WOMEN_ONLY">Women only</option>
                  <option value="MEN_ONLY">Men only</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={2}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pricePKR">Price (PKR)</Label>
                <Input
                  id="pricePKR"
                  type="number"
                  min={0}
                  value={form.pricePKR}
                  onChange={(e) => setForm((f) => ({ ...f, pricePKR: e.target.value }))}
                />
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create event'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-8 mb-3 text-sm font-medium">All events</h2>
      <div className="space-y-2">
        {events.map((ev) => (
          <Link key={ev.id} href={`/admin/events/${ev.id}`} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium">{ev.title ?? 'Coffee meetup'}</span>
                <span className="text-muted-foreground">
                  {formatDateTime(ev.startAt)} · {formatPKR(ev.pricePKR)} · {ev.status} ·{' '}
                  {ev._count?.bookings ?? 0} bookings
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

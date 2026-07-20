'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, type EventDto, type UpdateEventInput } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
  ssr: false,
  loading: () => (
    <div className="bg-muted/50 grid h-56 place-items-center rounded-2xl border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

const selectClass =
  'h-10 rounded-full border border-input bg-card/60 px-4 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

/** ISO → value for <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<{
    title: string;
    startAt: string;
    genderTrack: string;
    area: string;
    capacity: string;
    pricePKR: string;
    venueName: string;
    lat: string;
    lng: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(async () => {
    const ev: EventDto = await api.getEvent(id);
    setForm({
      title: ev.title ?? '',
      startAt: toLocalInput(ev.startAt),
      genderTrack: ev.genderTrack,
      area: ev.area,
      capacity: String(ev.capacity),
      pricePKR: String(ev.pricePKR),
      venueName: ev.venueName ?? '',
      lat: ev.lat != null ? String(ev.lat) : '',
      lng: ev.lng != null ? String(ev.lng) : '',
    });
  }, [id]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load event');
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin, load]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setBusy(true);
    try {
      const hasPin = form.lat.trim() !== '' && form.lng.trim() !== '';
      const input: UpdateEventInput = {
        title: form.title || undefined,
        startAt: new Date(form.startAt).toISOString(),
        genderTrack: form.genderTrack as UpdateEventInput['genderTrack'],
        area: form.area,
        capacity: Number(form.capacity),
        pricePKR: Number(form.pricePKR),
        venueName: form.venueName.trim(),
        lat: hasPin ? Number(form.lat) : undefined,
        lng: hasPin ? Number(form.lng) : undefined,
      };
      await api.updateEvent(id, input);
      router.push(`/admin/events/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-3xl">Edit event</h1>
        <Link
          href={`/admin/events/${id}`}
          className="text-muted-foreground mt-2 inline-block text-sm font-semibold hover:underline"
        >
          ← Back to event
        </Link>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}
      {!form && !error && <p className="text-muted-foreground text-sm">Loading…</p>}

      {form && (
        <Card className="rounded-3xl shadow-soft">
          <CardHeader>
            <CardTitle>Event details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={set('title')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startAt">Starts at</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={form.startAt}
                    onChange={set('startAt')}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender track</Label>
                  <select
                    className={selectClass}
                    value={form.genderTrack}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, genderTrack: e.target.value } : f))
                    }
                  >
                    <option value="MIXED">Mixed</option>
                    <option value="WOMEN_ONLY">Women only</option>
                    <option value="MEN_ONLY">Men only</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="area">Area</Label>
                  <Input id="area" value={form.area} onChange={set('area')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={2}
                    value={form.capacity}
                    onChange={set('capacity')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pricePKR">Price</Label>
                  <Input
                    id="pricePKR"
                    type="number"
                    min={0}
                    value={form.pricePKR}
                    onChange={set('pricePKR')}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-3xl border border-dashed p-4">
                <p className="eyebrow text-primary">Custom location (optional)</p>
                <p className="text-muted-foreground text-xs">
                  Leave empty to use the cafe’s location. Drop a pin to override it on the map.
                </p>
                <Input
                  placeholder="Venue name"
                  value={form.venueName}
                  onChange={set('venueName')}
                />
                <LocationPicker
                  lat={form.lat.trim() ? Number(form.lat) : undefined}
                  lng={form.lng.trim() ? Number(form.lng) : undefined}
                  onChange={(la, ln) =>
                    setForm((f) => (f ? { ...f, lat: la.toFixed(6), lng: ln.toFixed(6) } : f))
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="lg" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </Button>
                <Link
                  href={`/admin/events/${id}`}
                  className="text-muted-foreground grid place-items-center px-4 text-sm font-semibold hover:underline"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  type Cafe,
  type CreateCafeInput,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type FormState = {
  name: string;
  area: string;
  address: string;
  lat: string;
  lng: string;
  deadHourSlots: string;
  compTerms: string;
};

const EMPTY: FormState = {
  name: '',
  area: '',
  address: '',
  lat: '',
  lng: '',
  deadHourSlots: '',
  compTerms: '',
};

function toInput(f: FormState): CreateCafeInput {
  return {
    name: f.name.trim(),
    area: f.area.trim(),
    address: f.address.trim() || undefined,
    lat: f.lat.trim() ? Number(f.lat) : undefined,
    lng: f.lng.trim() ? Number(f.lng) : undefined,
    deadHourSlots: f.deadHourSlots.trim()
      ? f.deadHourSlots.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    compTerms: f.compTerms.trim() || undefined,
  };
}

function fromCafe(c: Cafe): FormState {
  return {
    name: c.name,
    area: c.area,
    address: c.address ?? '',
    lat: c.lat?.toString() ?? '',
    lng: c.lng?.toString() ?? '',
    deadHourSlots: c.deadHourSlots.join(', '),
    compTerms: c.compTerms ?? '',
  };
}

export default function AdminCafesPage() {
  const { user, loading } = useAuth();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(() => {
    if (!isAdmin) return;
    api.listCafes().then(setCafes).catch(() => undefined);
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

  async function save(form: FormState, id?: string) {
    setError(null);
    setBusy(true);
    try {
      if (id) await api.updateCafe(id, toInput(form));
      else await api.createCafe(toInput(form));
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save cafe');
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Cafe) {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    setError(null);
    setBusy(true);
    try {
      await api.deleteCafe(c.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete cafe');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Cafes</h1>
        <Link href="/admin" className="text-muted-foreground text-sm hover:underline">
          ← Admin
        </Link>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      {editing === 'new' ? (
        <CafeForm
          initial={EMPTY}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(f) => void save(f)}
        />
      ) : (
        <Button className="mb-4" onClick={() => setEditing('new')}>
          + Add cafe
        </Button>
      )}

      <div className="space-y-3">
        {cafes.length === 0 && (
          <p className="text-muted-foreground text-sm">No cafes yet.</p>
        )}
        {cafes.map((c) =>
          editing === c.id ? (
            <CafeForm
              key={c.id}
              initial={fromCafe(c)}
              busy={busy}
              onCancel={() => setEditing(null)}
              onSave={(f) => void save(f, c.id)}
            />
          ) : (
            <Card key={c.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4 text-sm">
                <div className="space-y-0.5">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.area}
                    {c.address ? ` · ${c.address}` : ''}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {c.lat != null && c.lng != null
                      ? `📍 ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`
                      : 'no coordinates'}{' '}
                    · {c._count?.events ?? 0} event(s)
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="xs" variant="outline" onClick={() => setEditing(c.id)}>
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="text-destructive border-destructive/40"
                    disabled={busy}
                    onClick={() => void remove(c)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </main>
  );
}

function CafeForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: FormState;
  busy: boolean;
  onSave: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">
          {initial.name ? 'Edit cafe' : 'New cafe'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" required value={form.name} onChange={set('name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-area">Area</Label>
              <Input id="c-area" required value={form.area} onChange={set('area')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Address</Label>
            <Input id="c-address" value={form.address} onChange={set('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-lat">Latitude</Label>
              <Input id="c-lat" inputMode="decimal" value={form.lat} onChange={set('lat')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-lng">Longitude</Label>
              <Input id="c-lng" inputMode="decimal" value={form.lng} onChange={set('lng')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-slots">Dead-hour slots (comma-separated)</Label>
            <Input
              id="c-slots"
              placeholder="Sat 15:00, Sun 15:00"
              value={form.deadHourSlots}
              onChange={set('deadHourSlots')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-terms">Comp terms</Label>
            <Input id="c-terms" value={form.compTerms} onChange={set('compTerms')} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

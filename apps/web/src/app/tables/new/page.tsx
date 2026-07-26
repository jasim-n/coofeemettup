'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, type CreateTableInput } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
  ssr: false,
  loading: () => (
    <div className="bg-muted/50 grid h-56 place-items-center rounded-2xl border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

const CATEGORIES = [
  'Deep talks',
  'Coffee & chill',
  'Networking',
  'Books',
  'Startups',
  'Language exchange',
  'Board games',
];

export default function NewTablePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    venueName: '',
    venueAddress: '',
    lat: '',
    lng: '',
    startAt: '',
    seats: '6',
    category: '',
    description: '',
    rules: '',
    price: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );
  if (!user.canHost)
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="display mt-3 text-2xl">Hosting is invite-only</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your account isn’t enabled to host tables yet. Ask an admin to grant host access.
        </p>
        <Link href="/tables" className="text-primary mt-4 inline-block text-sm font-semibold hover:underline">
          ← Browse tables
        </Link>
      </main>
    );

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.lat || !form.lng) {
      setError('Drop a pin on the map to set the venue.');
      return;
    }
    if (!form.category.trim()) {
      setError('Pick or type a category.');
      return;
    }
    setBusy(true);
    try {
      const input: CreateTableInput = {
        venueName: form.venueName.trim() || undefined,
        venueAddress: form.venueAddress.trim() || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        title: undefined,
        startAt: new Date(form.startAt).toISOString(),
        seats: Number(form.seats),
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        rules: form.rules.trim() || undefined,
        pricePKR: form.price.trim() ? Number(form.price) : undefined,
      };
      const table = await api.createTable(input);
      router.push(`/tables/${table.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish the table');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <p className="eyebrow text-primary">Host a table</p>
        <h1 className="display mt-1 text-3xl">Create a table</h1>
        <Link
          href="/tables"
          className="text-muted-foreground mt-2 inline-block text-sm font-semibold hover:underline"
        >
          ← Tables
        </Link>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      <form onSubmit={publish} className="space-y-4">
        <Section step="1" title="Choose venue">
          <div className="space-y-1.5">
            <Label htmlFor="venueName">Venue name</Label>
            <Input
              id="venueName"
              placeholder="e.g. Kohsar Coffee Co."
              value={form.venueName}
              onChange={(e) => set('venueName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venueAddress">Address (optional)</Label>
            <Input
              id="venueAddress"
              value={form.venueAddress}
              onChange={(e) => set('venueAddress', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Drop a pin</Label>
            <LocationPicker
              lat={form.lat ? Number(form.lat) : undefined}
              lng={form.lng ? Number(form.lng) : undefined}
              onChange={(la, ln) =>
                setForm((f) => ({ ...f, lat: la.toFixed(6), lng: ln.toFixed(6) }))
              }
            />
          </div>
        </Section>

        <Section step="2" title="Date & time">
          <Input
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => set('startAt', e.target.value)}
            required
          />
        </Section>

        <Section step="3" title="Number of seats">
          <Input
            type="number"
            min={2}
            max={50}
            value={form.seats}
            onChange={(e) => set('seats', e.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">Between 2 and 50 (you don’t take a seat).</p>
        </Section>

        <Section step="4" title="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('category', c)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  form.category === c
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            placeholder="…or type your own"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          />
        </Section>

        <Section step="5" title="Description & rules">
          <div className="space-y-1.5">
            <Label htmlFor="description">What’s this table about?</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Set the vibe — what will you talk about?"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rules">House rules (optional)</Label>
            <Textarea
              id="rules"
              rows={2}
              placeholder="e.g. be on time, no phones at the table"
              value={form.rules}
              onChange={(e) => set('rules', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price per seat (PKR) — leave blank for free</Label>
            <Input
              id="price"
              type="number"
              min={0}
              placeholder="Free"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
            />
          </div>
        </Section>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish table →'}
        </Button>
      </form>
    </main>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl shadow-soft">
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs font-bold">
            {step}
          </span>
          <h2 className="font-heading text-base font-bold tracking-tight">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ApiError, type UpdateTableInput } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import VenueSearch from '@/components/venue-search';
import { BannerPicker } from '@/components/banner-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader, Spinner } from '@/components/spinner';
import type { TableDto } from '@jrst/api-client';

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
  ssr: false,
  loading: () => (
    <div className="bg-muted/50 grid h-56 place-items-center rounded-2xl border text-sm text-muted-foreground">
      <Spinner className="text-primary size-7" />
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

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  // Shift to local time, then format as YYYY-MM-DDTHH:mm
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function EditTablePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [table, setTable] = useState<TableDto | null>(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [now] = useState(() => Date.now());

  const [form, setForm] = useState({
    title: '',
    venueName: '',
    venueAddress: '',
    lat: '',
    lng: '',
    startAt: '',
    seats: '6',
    category: '', // free-text custom categories (comma-separated)
    description: '',
    rules: '',
    price: '',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getTable(id)
      .then((t) => {
        setTable(t);

        // Parse category: chips vs free-text
        const parts = t.category
          ? t.category.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const chipParts = parts.filter((p) => CATEGORIES.includes(p));
        const customParts = parts.filter((p) => !CATEGORIES.includes(p));

        setCategories(chipParts);
        setImageUrl(t.imageUrl ?? null);
        setForm({
          title: t.title ?? '',
          venueName: t.venueName ?? '',
          venueAddress: t.venueAddress ?? '',
          lat: t.lat != null ? String(t.lat) : '',
          lng: t.lng != null ? String(t.lng) : '',
          startAt: t.startAt ? isoToDatetimeLocal(t.startAt) : '',
          seats: String(t.seats),
          category: customParts.join(', '),
          description: t.description ?? '',
          rules: t.rules ?? '',
          price: t.pricePKR != null ? String(t.pricePKR) : '',
        });
      })
      .catch(() => {
        // leave table null — guard below will handle it
      })
      .finally(() => setTableLoading(false));
  }, [id]);

  if (authLoading || tableLoading) return <PageLoader />;

  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  // Guard: host-only + time-limited + status check
  if (
    !table ||
    table.hostId !== user.id ||
    new Date(table.startAt).getTime() <= now ||
    table.status === 'CANCELLED' ||
    table.status === 'COMPLETED'
  ) {
    return (
      <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-16 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="display mt-3 text-2xl">This event can&apos;t be edited.</h1>
        <Link
          href={`/tables/${id}`}
          className="text-primary mt-4 inline-block text-sm font-semibold hover:underline"
        >
          ← Back to table
        </Link>
      </main>
    );
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError('Give your event a name.');
      return;
    }
    if (!form.lat || !form.lng) {
      setError('Drop a pin on the map to set the venue.');
      return;
    }
    // Combine selected chips + any comma-separated custom ones (deduped).
    const custom = form.category
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allCategories = Array.from(new Set([...categories, ...custom]));
    if (allCategories.length === 0) {
      setError('Pick or type at least one category.');
      return;
    }
    setBusy(true);
    try {
      const input: UpdateTableInput = {
        venueName: form.venueName.trim() || undefined,
        venueAddress: form.venueAddress.trim() || undefined,
        lat: Number(form.lat),
        lng: Number(form.lng),
        title: form.title.trim(),
        // Empty string clears a previously set banner (service maps '' → null).
        imageUrl: imageUrl ?? '',
        startAt: new Date(form.startAt).toISOString(),
        seats: Number(form.seats),
        category: allCategories.join(', '),
        description: form.description.trim() || undefined,
        rules: form.rules.trim() || undefined,
        pricePKR: form.price.trim() ? Number(form.price) : undefined,
      };
      await api.updateTable(id, input);
      router.push(`/tables/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      <div className="mb-6">
        <p className="eyebrow text-primary">Edit event</p>
        <h1 className="display mt-1 text-3xl">Edit event</h1>
        <Link
          href={`/tables/${id}`}
          className="text-muted-foreground mt-2 inline-block text-sm font-semibold hover:underline"
        >
          ← Back to table
        </Link>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2"><Section step="1" title="Event name">
          <Input
            id="title"
            placeholder="e.g. Sunday Deep Talks"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">
            Shown as the title on cards and the event page.
          </p>
        </Section></div>

        <div className="lg:col-span-2"><Section step="2" title="Banner image">
          <BannerPicker value={imageUrl} onChange={setImageUrl} />
        </Section></div>

        <div className="lg:col-span-2"><Section step="3" title="Choose venue">
          <VenueSearch
            onSelect={(r) =>
              setForm((f) => ({
                ...f,
                venueName: r.name,
                venueAddress: r.label,
                lat: r.lat.toFixed(6),
                lng: r.lng.toFixed(6),
              }))
            }
          />
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
        </Section></div>

        <Section step="4" title="Date & time">
          <Input
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => set('startAt', e.target.value)}
            required
          />
        </Section>

        <Section step="5" title="Number of seats">
          <Input
            type="number"
            min={2}
            max={50}
            value={form.seats}
            onChange={(e) => set('seats', e.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">Between 2 and 50 (you don&apos;t take a seat).</p>
        </Section>

        <Section step="6" title="Category">
          <p className="text-muted-foreground text-xs">Pick one or more.</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setCategories((prev) =>
                      active ? prev.filter((x) => x !== c) : [...prev, c],
                    )
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  {active && <i className="fa-solid fa-check mr-1 text-xs" />}
                  {c}
                </button>
              );
            })}
          </div>
          <Input
            placeholder="…or add your own (comma-separated)"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          />
        </Section>

        <Section step="7" title="Description & rules">
          <div className="space-y-1.5">
            <Label htmlFor="description">What&apos;s this table about?</Label>
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
              placeholder="e.g. be on time, no phones at the table."
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

        <Button type="submit" variant="hero" size="lg" className="w-full lg:col-span-2" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
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

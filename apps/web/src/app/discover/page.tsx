'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, type TableDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatPKR } from '@/lib/format';
import { Cover } from '@/components/cover-image';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';

type PriceFilter = 'all' | 'free' | 'paid';

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

function TableCoverCard({ t }: { t: TableDto }) {
  const low = t.seatsLeft > 0 && t.seatsLeft <= 2;
  return (
    <Link
      href={`/tables/${t.id}`}
      className="bg-card shadow-soft ring-border/60 group block overflow-hidden rounded-3xl ring-1 transition-all hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="relative h-40">
        <Cover
          category={t.category}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="glass ring-border/40 absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ring-1">
          {emojiFor(t.category)} {t.category}
        </span>
        <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-sm shadow-sm">
          🤍
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-base font-bold tracking-tight">{t.title ?? t.category}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          📍 {t.venueName ?? t.cafe?.name ?? 'See map'}
        </p>
        <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <span className="bg-primary/10 text-primary grid size-6 place-items-center rounded-full text-[10px] font-bold">
            {initial(t.host?.firstName)}
          </span>
          Hosted by {t.host?.firstName ?? 'a host'} {t.host?.lastInitial ?? ''}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant={low ? 'warning' : 'secondary'}>
            {t.seatsLeft > 0 ? `${t.seatsLeft} seats left` : 'Full'}
          </Badge>
          <span className="font-heading text-primary font-extrabold">
            {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
          </span>
        </div>
        <div className="bg-primary text-primary-foreground mt-3 rounded-full py-2 text-center text-sm font-semibold transition-[filter] group-hover:brightness-110">
          Join Table
        </div>
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const [tables, setTables] = useState<TableDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [price, setPrice] = useState<PriceFilter>('all');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await api.browseTables();
        if (active) setTables(list);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load tables');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((tables ?? []).map((t) => t.category))].sort(),
    [tables],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (tables ?? []).filter((t) => {
      if (category && t.category !== category) return false;
      if (price === 'free' && t.pricePKR != null) return false;
      if (price === 'paid' && t.pricePKR == null) return false;
      if (needle) {
        const hay = `${t.title ?? ''} ${t.category} ${t.venueName ?? ''} ${
          t.cafe?.name ?? ''
        } ${t.description ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [tables, q, category, price]);

  const resetFilters = () => {
    setQ('');
    setCategory('');
    setPrice('all');
  };

  const priceBtn = (val: PriceFilter, label: string) => (
    <button
      key={val}
      type="button"
      onClick={() => setPrice(val)}
      className={`flex-1 rounded-full border py-1.5 text-sm font-semibold transition-colors ${
        price === val
          ? 'bg-primary text-primary-foreground border-transparent'
          : 'bg-card hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* ── LEFT FILTER RAIL ── */}
        <aside className="mb-6 lg:mb-0 lg:self-start lg:sticky lg:top-24">
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            {/* heading + reset */}
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading font-bold tracking-tight">Filters</p>
              <button
                type="button"
                onClick={resetFilters}
                className="text-primary text-xs font-semibold hover:underline"
              >
                Reset
              </button>
            </div>

            {/* search */}
            <div className="mb-5">
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-widest">
                Search
              </p>
              <Input
                placeholder="🔍 Tables, topics, venues…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* vibes / categories */}
            <div className="mb-5">
              <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-widest">
                Vibes / Topics
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      category === ''
                        ? 'bg-secondary text-secondary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span>✨</span> All Vibes
                  </button>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCategory(category === c ? '' : c)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        category === c
                          ? 'bg-secondary text-secondary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span>{emojiFor(c)}</span>
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* price */}
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-widest">
                Price
              </p>
              <div className="flex gap-2">
                {priceBtn('all', 'All')}
                {priceBtn('free', 'Free')}
                {priceBtn('paid', 'Paid')}
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="min-w-0">
          {/* hero banner */}
          <section className="bg-ink relative mb-6 overflow-hidden rounded-3xl p-6 shadow-glow">
            <div
              aria-hidden
              className="bg-gradient-hero pointer-events-none absolute -top-20 -right-16 size-72 rounded-full opacity-30 blur-3xl"
            />
            <div className="relative">
              <p className="eyebrow text-white/60">Explore</p>
              <h1 className="font-heading mt-1 text-3xl font-extrabold tracking-tight text-white">
                Discover conversations that matter
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
                Find like-minded people and join interesting tables.
              </p>
              {tables && (
                <p className="mt-4 text-sm font-semibold text-white/50">
                  {results.length} {results.length === 1 ? 'table' : 'tables'}
                </p>
              )}
            </div>
          </section>

          {/* states */}
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {!tables && !error && (
            <div className="flex justify-center py-16">
              <Spinner className="text-primary size-6" />
            </div>
          )}
          {tables && results.length === 0 && (
            <div className="rounded-3xl border border-dashed py-16 text-center">
              <p className="text-3xl">🔎</p>
              <p className="text-muted-foreground mt-2 text-sm">No tables match your search.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="text-primary mt-3 text-sm font-semibold hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* cover-card grid */}
          {results.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((t) => (
                <TableCoverCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

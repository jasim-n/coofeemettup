'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, type TableDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';

type PriceFilter = 'all' | 'free' | 'paid';

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

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card hover:bg-muted'
    }`;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Find your table</p>
          <h1 className="display mt-1 text-3xl">Discover</h1>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/tables/nearby" className="text-primary hover:underline">
            Map
          </Link>
          <Link href="/" className="text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
      </div>

      <Input
        placeholder="🔍 Search tables, topics, venues…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3"
      />

      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className={chip(price === 'all')} onClick={() => setPrice('all')}>
          All
        </button>
        <button type="button" className={chip(price === 'free')} onClick={() => setPrice('free')}>
          Free
        </button>
        <button type="button" className={chip(price === 'paid')} onClick={() => setPrice('paid')}>
          Paid
        </button>
      </div>

      {categories.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" className={chip(category === '')} onClick={() => setCategory('')}>
            Any topic
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(category === c)}
              onClick={() => setCategory(category === c ? '' : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!tables && !error && <div className="flex justify-center py-12"><Spinner className="text-primary size-6" /></div>}
      {tables && results.length === 0 && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">🔎</p>
          <p className="text-muted-foreground mt-2 text-sm">No tables match your search.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((t) => (
          <Link key={t.id} href={`/tables/${t.id}`} className="block">
            <Card className="rounded-3xl transition-all hover:-translate-y-0.5 hover:shadow-glow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-base font-bold tracking-tight">
                    {t.title ?? t.category}
                  </h2>
                  <Badge variant="secondary">{t.category}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {formatDateTime(t.startAt)} · {t.venueName ?? t.cafe?.name ?? 'See map'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-heading text-primary text-sm font-extrabold">
                    {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                  </span>
                  <span className="text-muted-foreground text-xs">{t.seatsLeft} seats left</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

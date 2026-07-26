'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type TableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export default function TablesPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState<TableDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Grab a seat</p>
          <h1 className="display mt-1 text-3xl">Tables</h1>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/tables/nearby" className="text-primary hover:underline">
            Map
          </Link>
          <Link href="/discover" className="text-primary hover:underline">
            Discover
          </Link>
          {user?.canHost && (
            <Link href="/tables/new" className={buttonVariants({ size: 'sm' })}>
              + Host
            </Link>
          )}
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!tables && !error && <p className="text-muted-foreground text-sm">Loading…</p>}
      {tables && tables.length === 0 && (
        <div className="rounded-3xl border border-dashed py-14 text-center">
          <p className="text-3xl">🪑</p>
          <p className="text-muted-foreground mt-2 text-sm">
            No open tables right now — check back soon.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {tables?.map((t) => {
          const low = t.seatsLeft > 0 && t.seatsLeft <= 2;
          return (
            <Link key={t.id} href={`/tables/${t.id}`} className="block">
              <Card className="flex-row gap-0 p-0 transition-all hover:-translate-y-0.5 hover:shadow-glow">
                <div className="bg-gradient-ember w-2 shrink-0" />
                <CardContent className="flex-1 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-heading text-lg font-bold tracking-tight">
                      {t.title ?? t.category}
                    </h2>
                    <Badge variant="secondary">{t.category}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                    <p>🗓️ {formatDateTime(t.startAt)}</p>
                    <p>📍 {t.venueName ?? t.cafe?.name ?? 'Location on details'}</p>
                    <p>
                      🙋 Hosted by {t.host?.firstName ?? 'a host'} {t.host?.lastInitial ?? ''}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-heading text-primary text-lg font-extrabold">
                      {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                    </span>
                    <Badge variant={low ? 'warning' : 'secondary'}>
                      {t.seatsLeft > 0 ? `${t.seatsLeft} seats left` : 'full'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

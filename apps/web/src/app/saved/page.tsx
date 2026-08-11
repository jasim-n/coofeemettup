'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { type TableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { categoryIcon } from '@/lib/category-icon';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/spinner';
import { SaveButton } from '@/components/save-button';
import { tableCta } from '@/lib/table-cta';

export default function SavedPage() {
  const { user, loading } = useAuth();
  const [tables, setTables] = useState<TableDto[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const list = await api.mySavedTables();
        if (active) setTables(list);
      } catch {
        if (active) setTables([]);
      }
    })();
    return () => { active = false; };
  }, [user]);

  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <main className="p-6 text-sm">
        Please{' '}
        <Link href="/login" className="text-primary underline">
          sign in
        </Link>{' '}
        to view your saved tables.
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      {/* header */}
      <p className="eyebrow text-muted-foreground text-xs font-semibold uppercase tracking-widest">
        Bookmarks
      </p>
      <h1 className="display text-3xl font-extrabold tracking-tight mt-1">Saved tables</h1>

      <div className="mt-8">
        {/* loading */}
        {tables === null && <PageLoader label="Loading saved tables…" />}

        {/* empty state */}
        {tables !== null && tables.length === 0 && (
          <div className="rounded-3xl border border-dashed py-20 text-center">
            <span className="text-4xl">
              <i className="fa-regular fa-bookmark text-muted-foreground" />
            </span>
            <p className="font-heading mt-4 font-bold">No saved tables yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Tap the heart on any table to bookmark it.
            </p>
            <Link
              href="/discover"
              className="bg-primary text-primary-foreground hover:brightness-110 mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-semibold transition-[filter]"
            >
              Explore tables
            </Link>
          </div>
        )}

        {/* grid */}
        {tables !== null && tables.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((t) => {
              const low = t.seatsLeft > 0 && t.seatsLeft <= 2;
              const cta = tableCta(t, user?.id);
              return (
                <Link
                  key={t.id}
                  href={`/tables/${t.id}`}
                  className="bg-card shadow-soft ring-border/60 group block overflow-hidden rounded-3xl ring-1 transition-all hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="relative h-40">
                    <Cover
                      src={t.imageUrl ?? undefined}
                      category={t.category}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span className="glass ring-border/40 absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ring-1">
                      <i className={`fa-solid ${categoryIcon(t.category)} mr-1`} />{t.category}
                    </span>
                    <SaveButton tableId={t.id} saved={t.saved} className="absolute right-3 top-3" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-base font-bold tracking-tight">
                      {t.title ?? t.category}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      <i className="fa-solid fa-location-dot mr-1" />{t.venueName ?? t.cafe?.name ?? 'See map'}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      <i className="fa-solid fa-calendar-day mr-1" />{formatDateTime(t.startAt)}
                    </p>
                    <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                      <Avatar name={t.host?.firstName ?? 'H'} size={22} />
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
                    <div className={`mt-3 rounded-full py-2 text-center text-sm font-semibold transition-[filter] group-hover:brightness-110 ${cta.primary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>
                      {cta.label}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

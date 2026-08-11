'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  type AdminFeaturedTable,
  type FeaturedFilters,
  type TableImageDto,
  type TableStatus,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/spinner';
import { formatDateTime } from '@/lib/format';
import { categoryIcon } from '@/lib/category-icon';

const selectCls =
  'h-11 rounded-2xl border border-input bg-card/60 px-4 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

const STATUSES: TableStatus[] = ['OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED'];
const STATUS_STYLE: Record<TableStatus, string> = {
  OPEN: 'bg-primary/15 text-primary',
  FULL: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

export default function AdminFeaturedPage() {
  const { user, loading } = useAuth();
  const [filters, setFilters] = useState<FeaturedFilters>({ hasPhotos: true });
  const [events, setEvents] = useState<AdminFeaturedTable[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<AdminFeaturedTable | null>(null);
  const [images, setImages] = useState<TableImageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  // Fetch the event list whenever a filter changes (debounced for the search box).
  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => {
      setListLoading(true);
      api
        .adminFeaturedTables(filters)
        .then(setEvents)
        .catch(() => setEvents([]))
        .finally(() => setListLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [isAdmin, filters]);

  // Load the selected event's photos.
  useEffect(() => {
    if (!selected) return;
    api.adminTableImages(selected.id).then(setImages).catch(() => setImages([]));
  }, [selected]);

  if (loading) return <PageLoader />;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only.{' '}
        <Link href="/" className="underline">
          Home
        </Link>
      </main>
    );

  const set = (patch: Partial<FeaturedFilters>) => setFilters((f) => ({ ...f, ...patch }));

  async function toggle(img: TableImageDto) {
    setError(null);
    setBusy(img.id);
    try {
      await api.adminSetImageFeatured(img.id, !img.featured);
      const nextFeatured = !img.featured;
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, featured: nextFeatured } : i)));
      // keep the list's featuredCount in sync
      setEvents((prev) =>
        prev.map((e) =>
          e.id === img.tableId
            ? { ...e, featuredCount: e.featuredCount + (nextFeatured ? 1 : -1) }
            : e,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  }

  const featuredInSelected = images.filter((i) => i.featured).length;

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-10">
      <div className="mb-8">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-4xl uppercase">Featured</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin" className="text-muted-foreground hover:underline">
            ← Admin
          </Link>
        </div>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      {/* Filters */}
      <Card className="mb-6 rounded-3xl shadow-soft">
        <CardHeader className="pb-2">
          <p className="eyebrow text-primary">Home page</p>
          <CardTitle className="font-heading font-bold tracking-tight">
            Featured event photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Find an event, then tap its photos to feature them on the home page.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Search events…"
              value={filters.q ?? ''}
              onChange={(e) => set({ q: e.target.value })}
            />
            <select
              className={selectCls}
              value={filters.status ?? ''}
              onChange={(e) => set({ status: e.target.value as TableStatus | '' })}
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className={`${selectCls} min-w-0 flex-1`}
                value={filters.from ?? ''}
                onChange={(e) => set({ from: e.target.value })}
                aria-label="From date"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                className={`${selectCls} min-w-0 flex-1`}
                value={filters.to ?? ''}
                onChange={(e) => set({ to: e.target.value })}
                aria-label="To date"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasPhotos ?? false}
                onChange={(e) => set({ hasPhotos: e.target.checked })}
              />
              Only events with photos
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filters.bookmarked ?? false}
                onChange={(e) => set({ bookmarked: e.target.checked })}
              />
              My bookmarked events
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Event list */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold">
            {listLoading ? 'Loading…' : `${events.length} event(s)`}
          </p>
          {events.length === 0 && !listLoading ? (
            <div className="rounded-3xl border border-dashed py-10 text-center">
              <p className="text-muted-foreground text-sm">
                No events match. Try turning off &ldquo;Only events with photos&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => {
                const active = selected?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelected(ev)}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading truncate font-bold tracking-tight">
                        <i className={`fa-solid ${categoryIcon(ev.category)} text-primary mr-1`} />
                        {ev.title ?? ev.category}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[ev.status]}`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDateTime(ev.startAt)}
                      {ev.venueName ? ` · ${ev.venueName}` : ''}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      <i className="fa-solid fa-images" /> {ev.imageCount} photo
                      {ev.imageCount === 1 ? '' : 's'}
                      {ev.featuredCount > 0 && (
                        <span className="text-primary font-semibold"> · ★ {ev.featuredCount} featured</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Photos of the selected event */}
        <div>
          {!selected ? (
            <div className="grid h-full min-h-40 place-items-center rounded-3xl border border-dashed text-center">
              <p className="text-muted-foreground text-sm">
                Select an event to feature its photos.
              </p>
            </div>
          ) : (
            <Card className="rounded-3xl shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading font-bold tracking-tight">
                  {selected.title ?? selected.category}
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {featuredInSelected} of {images.length} featured
                </p>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    This event has no photos yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        disabled={busy === img.id}
                        onClick={() => void toggle(img)}
                        className={`group relative overflow-hidden rounded-2xl ring-2 transition-all disabled:opacity-60 ${
                          img.featured ? 'ring-primary' : 'ring-transparent hover:ring-border'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URL */}
                        <img src={img.url} alt="" className="h-32 w-full object-cover" />
                        <span
                          className={`absolute right-2 top-2 grid size-6 place-items-center rounded-full text-xs font-bold ${
                            img.featured
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {img.featured ? '★' : '+'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

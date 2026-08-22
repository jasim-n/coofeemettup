'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  type AdminFeaturedTable,
  type FeaturedFilters,
  type MediaFit,
  type MediaLayout,
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
import { COLLAGE_PRESET_OPTIONS } from '@/lib/media-layout';

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

const POSITIONS = [
  { value: 'center center', label: 'Center' },
  { value: 'center top', label: 'Top' },
  { value: 'center bottom', label: 'Bottom' },
  { value: 'left center', label: 'Left' },
  { value: 'right center', label: 'Right' },
];

export default function AdminFeaturedPage() {
  const { user, loading } = useAuth();
  const [filters, setFilters] = useState<FeaturedFilters>({ hasPhotos: true });
  const [events, setEvents] = useState<AdminFeaturedTable[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<AdminFeaturedTable | null>(null);
  const [images, setImages] = useState<TableImageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [layoutImgId, setLayoutImgId] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');
  const layoutImg = images.find((i) => i.id === layoutImgId) ?? null;

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

  useEffect(() => {
    if (!selected) return;
    setLayoutImgId(null);
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

  async function saveLayout(img: TableImageDto, patch: MediaLayout) {
    setError(null);
    setBusy(img.id);
    try {
      const updated = await api.adminSetImageLayout(img.id, patch);
      setImages((prev) =>
        prev.map((i) =>
          i.id === img.id ? { ...i, ...updated, layout: updated.layout ?? patch } : i,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save layout');
    } finally {
      setBusy(null);
    }
  }

  const featuredInSelected = images.filter((i) => i.featured).length;
  const layout = layoutImg?.layout ?? {};

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-10">
      <div className="mb-8">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-2xl uppercase sm:text-4xl">Featured</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin" className="text-muted-foreground hover:underline">
            ← Admin
          </Link>
        </div>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Feature Moments on home, then open Layout on a reel or collage to set fit/scale and
          uneven collage columns (e.g. 70 / 30).
        </p>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      <Card className="mb-6 rounded-3xl shadow-soft">
        <CardHeader className="pb-2">
          <p className="eyebrow text-primary">Home page</p>
          <CardTitle className="font-heading font-bold tracking-tight">
            Featured event photos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            className="max-w-xs"
            placeholder="Search events…"
            value={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value || undefined })}
          />
          <select
            className={selectCls}
            value={filters.status ?? ''}
            onChange={(e) =>
              set({ status: (e.target.value || undefined) as TableStatus | undefined })
            }
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!filters.hasPhotos}
              onChange={(e) => set({ hasPhotos: e.target.checked || undefined })}
            />
            Has photos
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {listLoading ? (
            <PageLoader />
          ) : (
            <div className="space-y-2">
              {events.map((ev) => {
                const active = selected?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelected(ev)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading font-bold">
                          {categoryIcon(ev.category)} {ev.title ?? ev.category}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(ev.startAt)}
                          {ev.venueName ? ` · ${ev.venueName}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[ev.status]}`}
                        >
                          {ev.status}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          ★ {ev.featuredCount}/{ev.imageCount}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
              <CardContent className="space-y-4">
                {images.length === 0 ? (
                  <p className="text-muted-foreground text-sm">This event has no photos yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((img) => {
                      const kind = img.kind ?? 'IMAGE';
                      const thumb =
                        kind === 'VIDEO' ? (img.posterUrl ?? img.url) : img.url;
                      return (
                        <div key={img.id} className="space-y-1.5">
                          <button
                            type="button"
                            disabled={busy === img.id}
                            onClick={() => void toggle(img)}
                            className={`group relative w-full overflow-hidden rounded-2xl ring-2 transition-all disabled:opacity-60 ${
                              img.featured
                                ? 'ring-primary'
                                : 'ring-transparent hover:ring-border'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumb} alt="" className="h-28 w-full object-cover" />
                            {kind !== 'IMAGE' && (
                              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                {kind === 'VIDEO' ? 'Reel' : 'Collage'}
                              </span>
                            )}
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
                          {img.featured && (
                            <button
                              type="button"
                              className={`w-full rounded-xl px-2 py-1 text-[11px] font-semibold ${
                                layoutImgId === img.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                              onClick={() =>
                                setLayoutImgId((id) => (id === img.id ? null : img.id))
                              }
                            >
                              Layout
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {layoutImg && (
                  <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                    <p className="text-sm font-semibold">
                      Display layout —{' '}
                      {layoutImg.kind === 'VIDEO'
                        ? 'Reel'
                        : layoutImg.kind === 'COLLAGE'
                          ? 'Collage'
                          : 'Photo'}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs font-medium">
                        <span>Fit (cropping)</span>
                        <select
                          className={`${selectCls} w-full`}
                          value={layout.fit ?? 'cover'}
                          disabled={busy === layoutImg.id}
                          onChange={(e) =>
                            void saveLayout(layoutImg, {
                              ...layout,
                              fit: e.target.value as MediaFit,
                            })
                          }
                        >
                          <option value="cover">Cover — fill frame (may crop)</option>
                          <option value="contain">Contain — show full media</option>
                        </select>
                      </label>

                      <label className="space-y-1 text-xs font-medium">
                        <span>Focus</span>
                        <select
                          className={`${selectCls} w-full`}
                          value={layout.position ?? 'center center'}
                          disabled={busy === layoutImg.id}
                          onChange={(e) =>
                            void saveLayout(layoutImg, {
                              ...layout,
                              position: e.target.value,
                            })
                          }
                        >
                          {POSITIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-1 text-xs font-medium">
                      <span className="flex justify-between">
                        Scale
                        <span className="text-muted-foreground">
                          {Math.round((layout.scale ?? 1) * 100)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        step={5}
                        className="w-full"
                        value={Math.round((layout.scale ?? 1) * 100)}
                        disabled={busy === layoutImg.id}
                        onChange={(e) => {
                          const scale = Number(e.target.value) / 100;
                          setImages((prev) =>
                            prev.map((i) =>
                              i.id === layoutImg.id
                                ? { ...i, layout: { ...layout, scale } }
                                : i,
                            ),
                          );
                        }}
                        onMouseUp={(e) => {
                          const scale = Number((e.target as HTMLInputElement).value) / 100;
                          void saveLayout(layoutImg, { ...layout, scale });
                        }}
                        onTouchEnd={(e) => {
                          const scale = Number((e.target as HTMLInputElement).value) / 100;
                          void saveLayout(layoutImg, { ...layout, scale });
                        }}
                      />
                      <span className="text-muted-foreground">
                        Lower = zoom out. Higher = zoom in.
                      </span>
                    </label>

                    {layoutImg.kind === 'COLLAGE' && (
                      <label className="block space-y-1 text-xs font-medium">
                        <span>Collage grid</span>
                        <select
                          className={`${selectCls} w-full`}
                          value={layout.collage?.preset ?? 'equal'}
                          disabled={busy === layoutImg.id}
                          onChange={(e) =>
                            void saveLayout(layoutImg, {
                              ...layout,
                              collage: {
                                ...layout.collage,
                                preset: e.target.value as NonNullable<
                                  MediaLayout['collage']
                                >['preset'],
                              },
                            })
                          }
                        >
                          {COLLAGE_PRESET_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label} — {o.hint}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
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

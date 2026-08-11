'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  type AdminFeaturedTable,
  type TableImageDto,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/spinner';

const selectCls =
  'h-11 w-full rounded-2xl border border-input bg-card/60 px-4 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

export default function AdminFeaturedPage() {
  const { user, loading } = useAuth();
  const [tables, setTables] = useState<AdminFeaturedTable[]>([]);
  const [selected, setSelected] = useState('');
  const [images, setImages] = useState<TableImageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const loadTables = useCallback(() => {
    if (!isAdmin) return;
    api.adminFeaturedTables().then(setTables).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (!selected) return;
    api.adminTableImages(selected).then(setImages).catch(() => setImages([]));
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

  async function toggle(img: TableImageDto) {
    setError(null);
    setBusy(img.id);
    try {
      await api.adminSetImageFeatured(img.id, !img.featured);
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, featured: !i.featured } : i)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  }

  const featuredCount = images.filter((i) => i.featured).length;

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

      <Card className="rounded-3xl shadow-soft">
        <CardHeader className="pb-2">
          <p className="eyebrow text-primary">Home page</p>
          <CardTitle className="font-heading font-bold tracking-tight">
            Featured event photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Pick an event, then tap photos to feature them. Featured photos appear
            in the &ldquo;Featured&rdquo; section on the home page.
          </p>

          {tables.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No events have photos yet. Hosts can add photos from a table&apos;s page.
            </p>
          ) : (
            <>
              <div className="max-w-md">
                <select
                  className={selectCls}
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    if (!e.target.value) setImages([]);
                  }}
                >
                  <option value="">Select an event…</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.title ?? t.category)} — {t.imageCount} photo
                      {t.imageCount === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <>
                  <p className="text-muted-foreground text-xs">
                    {featuredCount} of {images.length} featured
                  </p>
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
                        <img
                          src={img.url}
                          alt=""
                          className="h-32 w-full object-cover"
                        />
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
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

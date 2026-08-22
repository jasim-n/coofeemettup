'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type AdminReviewDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader, Spinner } from '@/components/spinner';

const PAGE_SIZE = 30;

function reviewerName(r: { firstName: string | null; lastInitial: string | null }) {
  if (r.firstName) return `${r.firstName}${r.lastInitial ? ` ${r.lastInitial}.` : ''}`;
  return 'User';
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i
          key={i}
          className={`fa-star text-sm ${
            i < rating
              ? 'fa-solid text-amber-400'
              : 'fa-regular text-muted-foreground/40'
          }`}
        />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const { user, loading } = useAuth();
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const [reviews, setReviews] = useState<AdminReviewDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // per-review busy + error
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    let active = true;
    setFetching(true);
    setGlobalError(null);
    void (async () => {
      try {
        const res = await api.adminListReviews(PAGE_SIZE, 0);
        if (!active) return;
        setReviews(res.reviews);
        setTotal(res.total);
        setOffset(PAGE_SIZE);
      } catch (err) {
        if (active)
          setGlobalError(err instanceof ApiError ? err.message : 'Failed to load reviews');
      } finally {
        if (active) setFetching(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  async function loadMore() {
    setLoadingMore(true);
    setGlobalError(null);
    try {
      const res = await api.adminListReviews(PAGE_SIZE, offset);
      setReviews((prev) => [...prev, ...res.reviews]);
      setTotal(res.total);
      setOffset((prev) => prev + PAGE_SIZE);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Failed to load more reviews');
    } finally {
      setLoadingMore(false);
    }
  }

  async function deleteReview(r: AdminReviewDto) {
    if (!window.confirm('Delete this review permanently?')) return;
    setRowBusy((prev) => ({ ...prev, [r.id]: true }));
    setRowError((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
    try {
      await api.adminDeleteReview(r.id);
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setRowBusy((prev) => ({ ...prev, [r.id]: false }));
      setRowError((prev) => ({
        ...prev,
        [r.id]: err instanceof ApiError ? err.message : 'Could not delete review',
      }));
    }
  }

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

  const hasMore = reviews.length < total;

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow text-primary">Console</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Reviews</h1>
          {!fetching && (
            <p className="text-muted-foreground mt-1 text-sm">
              {total} {total === 1 ? 'review' : 'reviews'}
            </p>
          )}
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/admin/cafes" className="text-primary hover:underline">
            Cafes
          </Link>
          <Link href="/admin/tables" className="text-primary hover:underline">
            Tables
          </Link>
          <Link href="/admin/reviews" className="text-primary hover:underline">
            Reviews
          </Link>
          <Link href="/admin/users" className="text-muted-foreground hover:underline">
            Users
          </Link>
          <Link href="/admin/activity" className="text-muted-foreground hover:underline">
            Activity
          </Link>
          <Link href="/admin/verifications" className="text-muted-foreground hover:underline">
            Verifications
          </Link>
          <Link href="/admin/reports" className="text-muted-foreground hover:underline">
            Reports
          </Link>
        </nav>
      </div>

      {globalError && (
        <p className="text-destructive mb-4 text-sm">{globalError}</p>
      )}

      {/* Loading */}
      {fetching && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-6" />
        </div>
      )}

      {/* Empty state */}
      {!fetching && reviews.length === 0 && !globalError && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">
            <i className="fa-regular fa-star text-muted-foreground" />
          </p>
          <p className="text-muted-foreground mt-2 text-sm">No reviews yet.</p>
        </div>
      )}

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {reviews.map((r) => {
            const subjectName = reviewerName(r.subject);
            const revName = reviewerName(r.reviewer);
            const isBusy = !!rowBusy[r.id];
            const err = rowError[r.id];

            return (
              <Card key={r.id} className="rounded-3xl shadow-soft">
                <CardContent className="py-4">
                  {/* Subject row */}
                  <div className="flex items-start gap-3">
                    <Link href={`/u/${r.subject.id}`} className="shrink-0">
                      <Avatar name={subjectName} src={r.subject.photoUrl} size={40} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/u/${r.subject.id}`}
                          className="font-heading font-bold tracking-tight hover:underline truncate"
                        >
                          {subjectName}
                        </Link>
                        <Badge variant="secondary">
                          {r.role === 'HOST' ? 'as host' : 'as guest'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        reviewed by{' '}
                        <span className="font-medium text-foreground">{revName}</span>
                      </p>
                      {r.tableTitle && (
                        <p className="text-muted-foreground text-xs mt-0.5 truncate">
                          <i className="fa-solid fa-mug-hot mr-1" />
                          {r.tableTitle}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <StarRating rating={r.rating} />
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(r.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  {r.comment && (
                    <p className="mt-3 text-sm text-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-3 italic">
                      {r.comment}
                    </p>
                  )}

                  {/* Inline error */}
                  {err && (
                    <p className="text-destructive text-xs mt-2 font-medium">{err}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {isBusy && <Spinner className="text-primary size-3" />}
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isBusy}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => void deleteReview(r)}
                    >
                      <i className="fa-solid fa-trash mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !fetching && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? (
              <>
                <Spinner className="size-4 text-primary mr-2" />
                Loading…
              </>
            ) : (
              `Load more (${total - reviews.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </main>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, type NewsletterSubscriberDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AdminNewsletterPage() {
  const { user, loading } = useAuth();
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const [query, setQuery] = useState('');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberDto[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(q: string) {
    setFetching(true);
    setError(null);
    try {
      const res = await api.adminListNewsletterSubscribers(q);
      setSubscribers(res.subscribers);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load subscribers');
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Empty query (initial load / cleared search) loads immediately; typing is debounced.
    debounceRef.current = setTimeout(() => void load(query), query ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isAdmin]);

  if (!loading && !isAdmin) {
    return (
      <main className="p-6 text-sm">
        Admins only.{' '}
        <Link href="/" className="underline">
          Home
        </Link>
      </main>
    );
  }

  const emailedCount = subscribers.filter((s) => s.welcomeSentAt).length;

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-primary">Console</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Newsletter</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Footer sign-ups with welcome-email delivery status.
          </p>
        </div>
        <Link href="/admin" className="text-primary text-sm font-semibold hover:underline">
          ← Admin
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <p className="text-muted-foreground text-sm tabular-nums">
          {total} subscriber{total === 1 ? '' : 's'}
          {subscribers.length > 0 && (
            <>
              {' '}
              · {emailedCount} welcome email{emailedCount === 1 ? '' : 's'} sent on this page
            </>
          )}
        </p>
        {fetching && <Spinner className="text-primary size-4" />}
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <div className="bg-card overflow-hidden rounded-3xl border shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="text-muted-foreground px-4 py-3 font-semibold">Email</th>
                <th className="text-muted-foreground px-4 py-3 font-semibold">Subscribed</th>
                <th className="text-muted-foreground px-4 py-3 font-semibold">Welcome email</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 && !fetching ? (
                <tr>
                  <td colSpan={3} className="text-muted-foreground px-4 py-10 text-center">
                    No subscribers yet.
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{s.email}</td>
                    <td className="text-muted-foreground px-4 py-3">{formatWhen(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      {s.welcomeSentAt ? (
                        <Badge variant="success">Sent · {formatWhen(s.welcomeSentAt)}</Badge>
                      ) : (
                        <Badge variant="warning">Not sent</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

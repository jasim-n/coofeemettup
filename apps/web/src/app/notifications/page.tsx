'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type NotificationDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const res = await api.notifications();
        if (active) setItems(res.items);
        await api.markAllNotificationsRead(); // opening the page clears the badge
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Inbox</p>
          <h1 className="display mt-1 text-3xl">Notifications</h1>
        </div>
        <Link href="/" className="text-muted-foreground font-semibold text-sm hover:underline">
          Home
        </Link>
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}
      {items.length === 0 && !error && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">🔔</p>
          <p className="text-muted-foreground mt-2 text-sm">You’re all caught up.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((n) => (
          <Card
            key={n.id}
            className={`rounded-3xl transition-all ${
              n.readAt
                ? ''
                : 'bg-secondary/50 ring-1 ring-primary/20'
            }`}
          >
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm ${n.readAt ? 'font-medium' : 'font-bold'}`}>{n.title}</p>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {new Date(n.createdAt).toLocaleString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {n.body && (
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{n.body}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold tracking-tight">Notifications</h1>
        <Link href="/" className="text-muted-foreground text-sm hover:underline">
          Home
        </Link>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {items.length === 0 && !error && (
        <p className="text-muted-foreground text-sm">No notifications yet.</p>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <Card key={n.id} className={n.readAt ? undefined : 'border-primary/40 bg-secondary/40'}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {new Date(n.createdAt).toLocaleString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {n.body && <p className="text-muted-foreground mt-0.5 text-sm">{n.body}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

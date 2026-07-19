'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type AuditEntry } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminActivityPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      try {
        const a = await api.adminAudit();
        if (active) setEntries(a);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-muted-foreground text-sm font-semibold hover:underline"
      >
        ← Admin
      </Link>
      <div className="mt-3 mb-8">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-4xl uppercase">Activity log</h1>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <div className="space-y-2">
        {entries.length === 0 && (
          <div className="rounded-3xl border border-dashed py-10 text-center">
            <p className="text-3xl">📋</p>
            <p className="text-muted-foreground mt-2 text-sm">No activity yet.</p>
          </div>
        )}
        {entries.map((e) => (
          <Card key={e.id} className="rounded-3xl shadow-soft">
            <CardContent className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="brand">{e.action}</Badge>
                  {e.targetType && (
                    <span className="text-muted-foreground text-xs">
                      {e.targetType}:{e.targetId?.slice(0, 8)}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  actor {e.actorId?.slice(0, 8) ?? 'system'}
                  {e.meta ? ` · ${JSON.stringify(e.meta)}` : ''}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {new Date(e.createdAt).toLocaleString('en-PK')}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

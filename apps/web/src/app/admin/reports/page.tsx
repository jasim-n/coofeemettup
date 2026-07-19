'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type ReportDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminReportsPage() {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      try {
        const r = await api.adminReports();
        if (active) setReports(r);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load reports');
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

  const label = (u: ReportDto['reporter']) => u?.firstName ?? u?.phone ?? 'unknown';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-muted-foreground text-sm font-semibold hover:underline"
      >
        ← Admin
      </Link>
      <div className="mt-3 mb-8">
        <p className="eyebrow text-primary">Safety &amp; trust</p>
        <h1 className="display mt-1 text-4xl uppercase">Reports</h1>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <div className="space-y-2">
        {reports.length === 0 && (
          <div className="rounded-3xl border border-dashed py-10 text-center">
            <p className="text-3xl">🛡️</p>
            <p className="text-muted-foreground mt-2 text-sm">No reports — all clear.</p>
          </div>
        )}
        {reports.map((r) => (
          <Card key={r.id} className="rounded-3xl shadow-soft">
            <CardContent className="space-y-1.5 py-4 text-sm">
              <p className="font-heading font-bold tracking-tight">
                {label(r.reporter)}{' '}
                <span className="text-muted-foreground font-normal">reported</span>{' '}
                {label(r.subject)}
              </p>
              <p className="text-foreground">{r.reason}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(r.createdAt).toLocaleString('en-PK')}
                {r.eventId ? ` · event ${r.eventId}` : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

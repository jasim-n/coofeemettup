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
      <Link href="/admin" className="text-muted-foreground text-sm hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Reports</h1>
      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}

      <div className="mt-4 space-y-2">
        {reports.length === 0 && (
          <p className="text-muted-foreground text-sm">No reports — all clear.</p>
        )}
        {reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-1 py-3 text-sm">
              <p className="font-medium">
                {label(r.reporter)} <span className="text-muted-foreground">reported</span>{' '}
                {label(r.subject)}
              </p>
              <p>{r.reason}</p>
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

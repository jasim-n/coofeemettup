'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type ReportDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/spinner';

type ReportMap = Record<string, ReportDto>;

function statusBadge(status: ReportDto['status']) {
  if (status === 'OPEN') return <Badge variant="warning">Open</Badge>;
  if (status === 'RESOLVED') return <Badge variant="success">Resolved</Badge>;
  return <Badge variant="destructive">Actioned</Badge>;
}

function label(u: ReportDto['reporter']) {
  return u?.firstName ?? u?.phone ?? 'unknown';
}

export default function AdminReportsPage() {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<ReportMap>({});
  const [order, setOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      try {
        const list = await api.adminReports();
        if (!active) return;
        const map: ReportMap = {};
        const ids: string[] = [];
        for (const r of list) {
          map[r.id] = r;
          ids.push(r.id);
        }
        setReports(map);
        setOrder(ids);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load reports');
      }
    })();
    return () => { active = false; };
  }, [isAdmin]);

  function setBusyFor(id: string, val: boolean) {
    setBusy((prev) => ({ ...prev, [id]: val }));
  }

  function setRowErr(id: string, msg: string | null) {
    setRowError((prev) => {
      if (msg === null) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: msg };
    });
  }

  function updateReport(updated: ReportDto) {
    setReports((prev) => ({ ...prev, [updated.id]: updated }));
  }

  async function resolve(r: ReportDto, status: 'RESOLVED' | 'ACTIONED', banSubject = false) {
    if (banSubject && !window.confirm(`Ban ${label(r.subject)} and mark report actioned?`)) return;
    setBusyFor(r.id, true);
    setRowErr(r.id, null);
    try {
      const updated = await api.adminResolveReport(r.id, status, banSubject);
      updateReport(updated as ReportDto);
    } catch (err) {
      setRowErr(r.id, err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyFor(r.id, false);
    }
  }

  if (loading) return <PageLoader />;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-10">
      <div className="flex gap-3 text-sm font-semibold">
        <Link href="/admin" className="text-muted-foreground hover:underline">
          ← Admin
        </Link>
        <Link href="/admin/tables" className="text-primary hover:underline">
          Tables
        </Link>
        <Link href="/admin/users" className="text-primary hover:underline">
          Users
        </Link>
      </div>
      <div className="mt-3 mb-8">
        <p className="eyebrow text-primary">Safety &amp; trust</p>
        <h1 className="display mt-1 text-4xl uppercase">Reports</h1>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {order.length === 0 && !error && (
          <div className="rounded-3xl border border-dashed py-10 text-center">
            <p className="text-3xl">🛡️</p>
            <p className="text-muted-foreground mt-2 text-sm">No reports — all clear.</p>
          </div>
        )}
        {order.map((id) => {
          const r = reports[id];
          if (!r) return null;
          const isBusy = !!busy[id];
          const err = rowError[id];
          const isOpen = r.status === 'OPEN';

          return (
            <Card key={r.id} className="rounded-3xl shadow-soft">
              <CardContent className="space-y-2 py-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-heading font-bold tracking-tight">
                    {label(r.reporter)}{' '}
                    <span className="text-muted-foreground font-normal">reported</span>{' '}
                    {label(r.subject)}
                  </p>
                  {statusBadge(r.status)}
                </div>
                <p className="text-foreground">{r.reason}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(r.createdAt).toLocaleString('en-PK')}
                  {r.eventId ? ` · event ${r.eventId}` : ''}
                  {r.resolvedAt ? ` · resolved ${new Date(r.resolvedAt).toLocaleDateString('en-PK')}` : ''}
                </p>

                {err && <p className="text-destructive text-xs font-medium">{err}</p>}

                {isOpen && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => void resolve(r, 'RESOLVED')}
                    >
                      <i className="fa-solid fa-check mr-1" />
                      Resolve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => void resolve(r, 'ACTIONED')}
                    >
                      <i className="fa-solid fa-gavel mr-1" />
                      Mark actioned
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isBusy}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => void resolve(r, 'ACTIONED', true)}
                    >
                      <i className="fa-solid fa-ban mr-1" />
                      Ban subject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

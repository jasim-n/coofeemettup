'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type PendingVerification } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminVerificationsPage() {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(async () => {
    const p = await api.adminVerifications();
    setPending(p);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin, load]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only. <Link href="/" className="underline">Home</Link>
      </main>
    );

  async function decide(id: string, approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.verifyUser(id, approve);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-muted-foreground text-sm font-semibold hover:underline"
      >
        ← Admin
      </Link>
      <div className="mt-3 mb-8">
        <p className="eyebrow text-primary">Identity checks</p>
        <h1 className="display mt-1 text-4xl uppercase">Verifications</h1>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <div className="space-y-3">
        {pending.length === 0 && (
          <div className="rounded-3xl border border-dashed py-10 text-center">
            <p className="text-3xl">✅</p>
            <p className="text-muted-foreground mt-2 text-sm">
              All clear — no pending verifications.
            </p>
          </div>
        )}
        {pending.map((u) => (
          <Card key={u.id} className="rounded-3xl shadow-soft">
            <CardHeader className="pb-2">
              <p className="eyebrow text-primary">Pending review</p>
              <CardTitle className="font-heading font-bold tracking-tight">
                {u.firstName ?? u.phone}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={api.cnicImageUrl(u.id)}
                alt="CNIC"
                className="max-h-48 w-full rounded-2xl border bg-muted object-cover"
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => void decide(u.id, true)}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void decide(u.id, false)}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

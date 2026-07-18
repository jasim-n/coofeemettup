'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type PendingVerification } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
      <Link href="/admin" className="text-muted-foreground text-sm hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Verifications</h1>
      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}

      <div className="mt-4 space-y-3">
        {pending.length === 0 && (
          <p className="text-muted-foreground text-sm">No pending verifications.</p>
        )}
        {pending.map((u) => (
          <Card key={u.id}>
            <CardContent className="space-y-2 py-3 text-sm">
              <p className="font-medium">{u.firstName ?? u.phone}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={api.cnicImageUrl(u.id)}
                alt="CNIC"
                className="max-h-48 rounded border bg-muted"
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

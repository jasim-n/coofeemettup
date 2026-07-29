'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/spinner';

export default function AdminPage() {
  const { user, loading } = useAuth();

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Console</p>
          <h1 className="display mt-1 text-3xl">Admin</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/admin/cafes" className="text-primary hover:underline">
            Cafes
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

      {/* Host access */}
      <HostGrant />
    </main>
  );
}

function HostGrant() {
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function setHost(canHost: boolean) {
    if (!phone.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.adminSetHostByPhone(phone.trim(), canHost);
      setMsg(`${r.phone} — host ${r.canHost ? 'enabled ✅' : 'disabled'}`);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 rounded-3xl shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Host access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Enable a user to host Tables. Enter their phone number.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="03XX XXXXXXX"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button size="sm" disabled={busy} onClick={() => void setHost(true)}>
            Grant
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void setHost(false)}>
            Revoke
          </Button>
        </div>
        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
      </CardContent>
    </Card>
  );
}

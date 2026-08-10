'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  type MailProvider,
  type MailProviderStatus,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/spinner';

const PROVIDERS: { id: MailProvider; name: string; blurb: string }[] = [
  { id: 'brevo', name: 'Brevo', blurb: 'Transactional email — recommended' },
  { id: 'gmail', name: 'Gmail', blurb: 'Gmail SMTP — fallback' },
];

export default function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<MailProviderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(() => {
    if (!isAdmin) return;
    api.adminGetMailProvider().then(setStatus).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function choose(provider: MailProvider) {
    if (!status || status.active === provider) return;
    setError(null);
    setBusy(true);
    try {
      setStatus(await api.adminSetMailProvider(provider));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not switch provider');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!testEmail.trim()) return;
    setTestMsg(null);
    setTestBusy(true);
    try {
      const r = await api.adminSendTestMail(testEmail.trim());
      setTestMsg({ ok: true, text: `Sent via ${r.provider} to ${testEmail.trim()}.` });
    } catch (err) {
      setTestMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Test email failed',
      });
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-10">
      <div className="mb-8">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-4xl uppercase">Settings</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin" className="text-muted-foreground hover:underline">
            ← Admin
          </Link>
        </div>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      <Card className="max-w-2xl rounded-3xl shadow-soft">
        <CardHeader className="pb-2">
          <p className="eyebrow text-primary">Email delivery</p>
          <CardTitle className="font-heading font-bold tracking-tight">
            OTP sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Login codes are emailed to each account&apos;s own address. Choose which
            SMTP provider sends them. A provider must have credentials configured
            (server env) before it can be selected.
          </p>

          {!status ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {PROVIDERS.map((p) => {
                const configured = status.configured.includes(p.id);
                const active = status.active === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!configured || busy || active}
                    onClick={() => void choose(p.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/10'
                        : configured
                          ? 'bg-card hover:bg-muted'
                          : 'bg-muted/40 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold tracking-tight">
                        {p.name}
                      </span>
                      {active ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          Active
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            configured
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {configured ? 'Ready' : 'Not configured'}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{p.blurb}</p>
                  </button>
                );
              })}
            </div>
          )}

          {status?.default && (
            <p className="text-muted-foreground text-xs">
              Env default:{' '}
              <span className="font-semibold uppercase">{status.default}</span> (used
              until changed here).
            </p>
          )}

          <div className="border-t pt-4">
            <Label htmlFor="test-email">Send a test email</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="test-email"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                type="button"
                disabled={testBusy || !status?.active}
                onClick={() => void sendTest()}
              >
                {testBusy ? 'Sending…' : 'Send'}
              </Button>
            </div>
            {testMsg && (
              <p
                className={`mt-2 text-sm ${testMsg.ok ? 'text-primary' : 'text-destructive'}`}
              >
                {testMsg.text}
              </p>
            )}
            {!status?.active && (
              <p className="text-muted-foreground mt-2 text-xs">
                No provider configured — codes are shown on-screen (dev mode).
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

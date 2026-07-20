'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type ReferralInfo } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function InvitePage() {
  const { user, loading } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const r = await api.myReferral();
        if (active) setInfo(r);
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

  const link =
    info && typeof window !== 'undefined'
      ? `${window.location.origin}/login?ref=${info.code}`
      : '';

  async function copy(what: 'link' | 'code', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  async function share() {
    if (navigator.share && link) {
      try {
        await navigator.share({
          title: 'Coffee Meetups',
          text: 'Join me for a coffee meetup — meet interesting people over coffee ☕',
          url: link,
        });
      } catch {
        /* user dismissed */
      }
    } else {
      void copy('link', link);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Bring a friend</p>
          <h1 className="display mt-1 text-3xl">Invite</h1>
        </div>
        <Link href="/" className="text-muted-foreground text-sm font-semibold hover:underline">
          Home
        </Link>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!info && !error && <p className="text-muted-foreground text-sm">Loading…</p>}

      {info && (
        <div className="space-y-5">
          <section className="bg-ink relative overflow-hidden rounded-3xl p-6 text-center shadow-glow">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 left-1/2 size-40 -translate-x-1/2 rounded-full bg-gradient-hero opacity-40 blur-2xl"
            />
            <p className="eyebrow text-white/60">Your invite code</p>
            <p className="font-heading mt-2 text-4xl font-extrabold tracking-[0.1em] text-white">
              {info.code}
            </p>
            <p className="mt-3 text-sm text-white/70">
              {info.count === 0
                ? 'No friends joined yet — share your code!'
                : `${info.count} friend${info.count === 1 ? '' : 's'} joined with your code 🎉`}
            </p>
          </section>

          <div className="flex gap-2">
            <Button variant="hero" size="lg" className="flex-1" onClick={() => void share()}>
              Share invite
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => void copy('code', info.code)}
            >
              {copied === 'code' ? 'Copied!' : 'Copy code'}
            </Button>
          </div>

          <div className="bg-card rounded-2xl border p-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold">Your invite link</p>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 truncate rounded-xl px-3 py-2 text-xs">{link}</code>
              <Button size="sm" variant="secondary" onClick={() => void copy('link', link)}>
                {copied === 'link' ? '✓' : 'Copy'}
              </Button>
            </div>
          </div>

          <p className="text-muted-foreground text-center text-xs">
            Friends who sign up with your code are linked to you. Rewards are coming soon.
          </p>
        </div>
      )}
    </main>
  );
}

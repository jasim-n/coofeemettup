'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const res = await api.notifications();
        if (active) setUnread(res.unread);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // ---- signed-out: bold gradient hero ----
  if (!user && !loading) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-gradient-hero opacity-30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-20 size-72 rounded-full bg-gradient-sky opacity-20 blur-3xl"
        />

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 px-6 py-14">
          <Wordmark className="text-lg" />

          <div>
            <p className="eyebrow text-primary">Islamabad · Lahore</p>
            <h1 className="display mt-3 text-[clamp(1.9rem,9vw,2.5rem)] tracking-[-0.04em] uppercase">
              Meet
              <br />
              strangers
              <br />
              <span className="text-gradient-hero">over coffee</span>
            </h1>
          </div>

          <p className="text-muted-foreground max-w-sm text-base leading-relaxed">
            Small, curated groups of 6–8. Real conversations, zero small talk — and the first
            coffee is on us. ☕
          </p>

          <div className="flex flex-wrap gap-2">
            {['✦ curated groups', '☕ coffee included', '📍 near you'].map((t) => (
              <span
                key={t}
                className="glass rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-border/60"
              >
                {t}
              </span>
            ))}
          </div>

          <Link
            href="/login"
            className={buttonVariants({ variant: 'hero', size: 'xl', className: 'w-full' })}
          >
            Get started →
          </Link>
          <p className="text-muted-foreground -mt-3 text-center text-xs">
            Sign in with your phone in seconds. No password.
          </p>
          <div className="text-muted-foreground mt-2 flex justify-center gap-4 text-xs font-medium">
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- signed-in: app dashboard ----
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Wordmark className="text-base" />
        {user && (
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        )}
      </header>

      {loading ? (
        <p className="text-muted-foreground mt-10 text-center text-sm">Loading…</p>
      ) : user ? (
        <>
          <section className="bg-ink relative mt-5 overflow-hidden rounded-3xl p-6 shadow-glow">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-6 size-40 rounded-full bg-gradient-hero opacity-40 blur-2xl"
            />
            <p className="eyebrow text-white/60">Welcome back</p>
            <p className="font-heading mt-1 text-2xl font-extrabold tracking-tight">
              {user.phone}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
                {user.role.toLowerCase()}
              </span>
              <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
                {user.verificationStatus === 'VERIFIED' ? '✓ verified' : 'unverified'}
              </span>
              <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
                ⭐ {user.reliabilityScore} reliability
              </span>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Tile href="/events" icon="☕" label="Browse meetups" wide accent />
            <Tile href="/meetups" icon="🎟️" label="My meetups" />
            <Tile href="/notifications" icon="🔔" label="Notifications" badge={unread} />
            <Tile href="/profile" icon="👤" label="Edit profile" />
            <Tile href="/map" icon="🗺️" label="Map" />
            {(user.role === 'ADMIN' || user.role === 'ORGANIZER') && (
              <Tile href="/admin" icon="⚙️" label="Admin console" />
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}

function Tile({
  href,
  icon,
  label,
  badge,
  wide,
  accent,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  wide?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-4 ring-1 transition-all hover:-translate-y-0.5 ${
        wide ? 'col-span-2 h-28' : 'h-28'
      } ${
        accent
          ? 'bg-gradient-ember text-white shadow-glow ring-transparent'
          : 'bg-card ring-border/70 shadow-soft hover:ring-primary/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {badge !== undefined && badge > 0 && (
          <span className="bg-primary text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold">
            {badge}
          </span>
        )}
      </div>
      <span className="font-heading text-sm font-bold tracking-tight">{label}</span>
    </Link>
  );
}

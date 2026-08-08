'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';
import { HomeDashboard } from '@/components/home-dashboard';
import { PageLoader } from '@/components/spinner';

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

        <div className="mx-auto grid w-full max-w-md flex-1 items-center gap-8 px-6 py-14 md:max-w-6xl md:grid-cols-2 md:gap-16 md:py-20">
          <div className="flex flex-col gap-7">
            <Wordmark className="text-lg" />

            <div>
              <p className="eyebrow text-primary">Islamabad · Lahore</p>
              <h1 className="display mt-3 text-[clamp(1.9rem,9vw,2.5rem)] tracking-[-0.04em] uppercase md:text-6xl lg:text-7xl">
                Meet
                <br />
                strangers
                <br />
                <span className="text-gradient-hero">over coffee</span>
              </h1>
            </div>

            <p className="text-muted-foreground max-w-sm text-base leading-relaxed md:text-lg">
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
              className={buttonVariants({
                variant: 'hero',
                size: 'xl',
                className: 'w-full md:w-fit md:px-10',
              })}
            >
              Get started →
            </Link>
            <p className="text-muted-foreground -mt-3 text-center text-xs md:text-left">
              Sign in with your phone in seconds. No password.
            </p>
            <div className="text-muted-foreground mt-2 flex justify-center gap-4 text-xs font-medium md:justify-start">
              <Link href="/terms" className="hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
            </div>
          </div>

          {/* desktop visual */}
          <div className="hidden md:block">
            <div className="bg-gradient-hero shadow-glow relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2rem]">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-10 size-56 rounded-full bg-white/20 blur-2xl"
              />
              <div className="glass-dark rounded-3xl px-8 py-6 text-center">
                <i className="fa-solid fa-mug-hot text-7xl text-white" />
                <p className="mt-3 text-lg font-bold text-white">6–8 people · 1 table</p>
                <p className="text-sm text-white/80">real conversations over coffee</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---- signed-in ----
  if (loading) {
    return <PageLoader />;
  }

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      {/* Desktop: a real content dashboard (nav bar handles navigation) */}
      <div className="hidden md:block">
        <HomeDashboard user={user!} />
      </div>

      {/* Mobile: the tile launcher (mobile has no top nav) */}
      <div className="md:hidden">
        <header className="flex items-center justify-between">
          <Wordmark className="text-base" />
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </header>

        <section className="bg-ink relative mt-5 overflow-hidden rounded-3xl p-6 shadow-glow">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-6 size-40 rounded-full bg-gradient-hero opacity-40 blur-2xl"
          />
          <p className="eyebrow text-white/60">Welcome back</p>
          <p className="font-heading mt-1 text-2xl font-extrabold tracking-tight">{user!.phone}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
              {user!.role.toLowerCase()}
            </span>
            <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
              {user!.verificationStatus === 'VERIFIED' ? '✓ verified' : 'unverified'}
            </span>
            <span className="glass-dark rounded-full px-2.5 py-1 text-xs font-semibold">
              <i className="fa-solid fa-star text-amber-400" /> {user!.reliabilityScore} reliability
            </span>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Tile href="/tables/nearby" icon="fa-location-dot" label="Nearby tables" wide accent />
          <Tile href="/tables" icon="fa-chair" label="All tables" />
          <Tile href="/discover" icon="fa-magnifying-glass" label="Discover" />
          {user!.canHost && <Tile href="/tables/new" icon="fa-wand-magic-sparkles" label="Host a table" />}
          {user!.canHost && <Tile href="/requests" icon="fa-inbox" label="Requests" />}
          <Tile href="/meetups" icon="fa-calendar-day" label="My meetups" />
          <Tile href="/notifications" icon="fa-bell" label="Notifications" badge={unread} />
          <Tile href="/profile" icon="fa-user" label="Edit profile" />
          <Tile href="/invite" icon="fa-gift" label="Invite friends" />
          {(user!.role === 'ADMIN' || user!.role === 'ORGANIZER') && (
            <Tile href="/admin" icon="fa-gear" label="Admin console" />
          )}
        </div>
      </div>
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
        <i className={`fa-solid ${icon} text-2xl`} />
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

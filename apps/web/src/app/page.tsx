'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';
import { HomeDashboard } from '@/components/home-dashboard';
import { PageLoader } from '@/components/spinner';

export default function Home() {
  const { user, loading, logout } = useAuth();

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
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-6 md:py-8">
      {/* Mobile-only chrome (DesktopNav is md+) */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <Wordmark className="text-base" />
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>

      <HomeDashboard user={user!} />
    </main>
  );
}

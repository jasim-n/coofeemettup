'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ApiError } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { Wordmark } from '@/components/wordmark';
import { NEWSLETTER_STORAGE_KEY } from '@/lib/site-footer';
import { api } from '@/lib/api';

const DISCOVER_LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/tables/nearby', label: 'Nearby' },
  { href: '/search', label: 'Search' },
] as const;

const MEETUPS_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/meetups', label: 'Meetups' },
  { href: '/saved', label: 'Saved' },
  { href: '/calendar', label: 'Calendar' },
] as const;

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/community-guidelines', label: 'Community Guidelines' },
] as const;

const SOCIAL_LINKS = [
  {
    href: 'https://www.instagram.com/9circles.pk',
    icon: 'fa-brands fa-instagram',
    label: 'Instagram',
  },
  {
    href: 'https://x.com/9circlespk',
    icon: 'fa-brands fa-x-twitter',
    label: 'X',
  },
  {
    href: 'https://www.linkedin.com/company/9circlespk',
    icon: 'fa-brands fa-linkedin-in',
    label: 'LinkedIn',
  },
  {
    href: 'https://www.youtube.com/@9circlespk',
    icon: 'fa-brands fa-youtube',
    label: 'YouTube',
  },
] as const;

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div className="min-w-0">
      <p className="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">
        {title}
      </p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm text-white/75 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dark marketing footer — rendered once at app shell level. */
export function SiteFooter() {
  const pathname = usePathname();
  const { user } = useAuth();
  const padForMobileNav =
    !!user && !pathname.includes('/chat')
      ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
      : '';
  const [email, setEmail] = useState('');
  const [newsletterNote, setNewsletterNote] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setNoteSuccess(false);
      setNewsletterNote('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setNewsletterNote(null);
    try {
      const res = await api.subscribeNewsletter(value);
      window.localStorage.setItem(NEWSLETTER_STORAGE_KEY, value);
      setNoteSuccess(true);
      setEmail('');
      if (res.alreadySubscribed) {
        setNewsletterNote(
          res.emailSent
            ? "You're already subscribed — we sent the confirmation email again."
            : `You're already on the list (${value}).`,
        );
      } else if (res.emailSent) {
        setNewsletterNote("You're subscribed — check your inbox for a confirmation email.");
      } else {
        setNewsletterNote(
          "You're on the list. We couldn't send a confirmation email right now — our team still has your address.",
        );
      }
    } catch (err) {
      setNoteSuccess(false);
      setNewsletterNote(
        err instanceof ApiError ? err.message : 'Could not subscribe. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer
      className={`relative shrink-0 overflow-hidden bg-ink text-ink-foreground ${padForMobileNav}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-[1508px] px-4 py-12 sm:px-6 sm:py-14 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-8 xl:gap-x-10">
          {/* 1 — brand */}
          <div className="min-w-0 space-y-5 sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Nine Circles home">
              <Wordmark size="lg" variant="white" />
            </Link>
            <div>
              <p className="font-heading text-base font-bold tracking-tight text-white lg:text-lg">
                Meet. Connect.{' '}
                <span className="text-primary">Experience.</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                A new way to discover people and small-group meetups at cafes and
                public venues across Pakistan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-sm text-white/80 transition-colors hover:border-primary/40 hover:text-white"
                >
                  <i className={s.icon} aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {/* 2 — discover */}
          <FooterColumn title="Discover" links={DISCOVER_LINKS} />

          {/* 3 — meetups */}
          <FooterColumn title="Meetups" links={MEETUPS_LINKS} />

          {/* 4 — legal */}
          <FooterColumn title="Legal" links={LEGAL_LINKS} />

          {/* 5 — newsletter + mascot */}
          <div className="flex min-w-0 flex-col gap-6 sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">
                Stay in the loop
              </p>
              <p className="text-sm leading-relaxed text-white/65">
                Be the first to know about updates, features, and launch news.
              </p>
              <form onSubmit={onNewsletterSubmit} className="mt-5">
                <div className="flex items-center rounded-full border border-white/15 bg-white/5 p-1 pl-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40 disabled:opacity-60"
                    aria-label="Email for updates"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Subscribe"
                  >
                    <i
                      className={`fa-solid ${busy ? 'fa-spinner animate-spin' : 'fa-arrow-right'} text-sm`}
                    />
                  </button>
                </div>
                {newsletterNote && (
                  <p
                    className={`mt-2 text-xs ${noteSuccess ? 'text-primary' : 'text-white/60'}`}
                    role="status"
                  >
                    {newsletterNote}
                  </p>
                )}
              </form>
            </div>

            <div className="relative flex justify-center lg:justify-start">
              <div
                aria-hidden
                className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25"
              />
              <div
                aria-hidden
                className="absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15"
              />
              <Image
                src="/brand/mascot.png"
                alt=""
                width={160}
                height={160}
                className="relative size-28 object-contain drop-shadow-lg lg:size-32"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Nine Circles. All rights reserved.
          </p>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-white/40 uppercase">
            Better people. Better experiences.
          </p>
        </div>
      </div>
    </footer>
  );
}

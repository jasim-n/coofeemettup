'use client';

import Link from 'next/link';
import { Wordmark } from '@/components/wordmark';
import { FadeIn } from '@/components/fade-in';
import { StaggerIn } from '@/components/stagger-in';

export const LEGAL_EFFECTIVE_DATE = '11 September 2026';
export const LEGAL_LAST_UPDATED = '11 September 2026';

export const LEGAL_PAGES = [
  { href: '/terms', label: 'Terms of Service', key: 'terms' },
  { href: '/privacy', label: 'Privacy Policy', key: 'privacy' },
  {
    href: '/community-guidelines',
    label: 'Community Guidelines',
    key: 'community-guidelines',
  },
] as const;

export type LegalPageKey = (typeof LEGAL_PAGES)[number]['key'];

export function LegalPageShell({
  title,
  eyebrow,
  current,
  children,
}: {
  title: string;
  eyebrow: string;
  current: LegalPageKey;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 py-10 sm:px-6 lg:px-12">
      <FadeIn className="mb-8">
        <Link href="/" className="inline-flex cursor-pointer" aria-label="9 Circles home">
          <Wordmark size="sm" />
        </Link>
        <p className="eyebrow text-primary mt-6">{eyebrow}</p>
        <h1 className="display mt-1 text-2xl sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Effective date: {LEGAL_EFFECTIVE_DATE} · Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </FadeIn>

      <StaggerIn
        className="text-muted-foreground space-y-6 text-sm leading-relaxed"
        itemSelector="section, p"
      >
        {children}
      </StaggerIn>

      <FadeIn delay={0.1}>
        <LegalNav current={current} />
      </FadeIn>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-foreground mb-1 text-base font-bold tracking-tight">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function LegalNav({ current }: { current: LegalPageKey }) {
  return (
    <nav
      aria-label="Legal pages"
      className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm font-semibold"
    >
      {LEGAL_PAGES.map((page) => (
        <Link
          key={page.key}
          href={page.href}
          className={
            page.key === current
              ? 'text-foreground'
              : 'text-primary hover:underline'
          }
          aria-current={page.key === current ? 'page' : undefined}
        >
          {page.label}
        </Link>
      ))}
      <Link href="/" className="text-muted-foreground hover:underline">
        Home
      </Link>
    </nav>
  );
}

export function LegalReviewNotice() {
  return (
    <p className="text-muted-foreground/70 border-t pt-6 text-xs">
      Legal review required: this is a drafting template and should be reviewed by
      qualified counsel before publication.
    </p>
  );
}

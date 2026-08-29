'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useRequestsBadge } from '@/components/requests-badge';

/** Five tabs — six crowded labels on narrow phones. Nearby stays under Explore. */
const TABS = [
  { href: '/', label: 'Home', icon: 'fa-house', match: (p: string) => p === '/' },
  {
    href: '/discover',
    label: 'Explore',
    icon: 'fa-magnifying-glass',
    match: (p: string) =>
      p.startsWith('/discover') ||
      p.startsWith('/search') ||
      p.startsWith('/tables/nearby'),
  },
  {
    href: '/meetups',
    label: 'Meetups',
    icon: 'fa-calendar-days',
    match: (p: string) => p.startsWith('/meetups') || p.startsWith('/calendar'),
  },
  {
    href: '/messages',
    label: 'Chats',
    icon: 'fa-comment',
    match: (p: string) => p.startsWith('/messages'),
  },
  {
    href: '/profile',
    label: 'You',
    icon: 'fa-user',
    match: (p: string) => p.startsWith('/profile') || p.startsWith('/notifications'),
  },
] as const;

/**
 * Sticky bottom tabs for signed-in users below `md`.
 * DesktopNav remains the only chrome at `md+`.
 */
export function MobileNav() {
  const { user, loading } = useAuth();
  const { count: requestCount } = useRequestsBadge();
  const pathname = usePathname();

  if (loading || !user) return null;
  // Full-screen chat already has its own chrome
  if (pathname.includes('/chat')) return null;

  return (
    <nav
      className="border-border/70 bg-card/95 sticky bottom-0 z-40 w-full border-t backdrop-blur md:hidden"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 pt-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const showReq =
            tab.href === '/meetups' && user.canHost && requestCount > 0;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-base`} />
                <span className="truncate">{tab.label}</span>
                {showReq && (
                  <span className="bg-primary text-primary-foreground absolute right-0.5 top-0 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold">
                    {requestCount > 9 ? '9+' : requestCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';

const LINKS = [
  { href: '/tables', label: 'Tables' },
  { href: '/tables/nearby', label: 'Nearby' },
  { href: '/discover', label: 'Discover' },
  { href: '/meetups', label: 'My meetups' },
];

/**
 * Desktop-only top navigation (hidden on mobile, where each page keeps its own
 * header + the home tile menu). Renders nothing when signed out — the landing
 * and login are full-screen heroes.
 */
export function DesktopNav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  if (loading || !user) return null;
  const isAdmin = user.role === 'ADMIN' || user.role === 'ORGANIZER';

  return (
    <header className="glass ring-border/60 sticky top-0 z-40 hidden border-b ring-1 md:block">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-1 px-6 py-3">
        <Link href="/" className="mr-2 shrink-0">
          <Wordmark className="text-base" />
        </Link>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {l.label}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          {user.canHost && (
            <Link href="/tables/new" className={buttonVariants({ size: 'sm' })}>
              + Host a table
            </Link>
          )}
          <Link
            href="/notifications"
            className="text-muted-foreground hover:text-foreground grid size-9 place-items-center rounded-full text-lg hover:bg-muted"
            title="Notifications"
          >
            🔔
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              Admin
            </Link>
          )}
          <Link
            href="/profile"
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-muted"
          >
            Profile
          </Link>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </nav>
    </header>
  );
}

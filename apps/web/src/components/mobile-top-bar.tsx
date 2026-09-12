'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Wordmark } from '@/components/wordmark';
import { Avatar } from '@/components/avatar';
import { UnreadBadge } from '@/components/unread-badge';
import { SideDrawer } from '@/components/side-drawer';
import {
  accountDisplayName,
  AccountMenuHeader,
  AccountMenuLinks,
  AccountMenuLogout,
} from '@/components/account-menu';
import { api } from '@/lib/api';

/**
 * Sticky top chrome for signed-in users on small screens (A1).
 * Pairs with bottom MobileNav — does not replace primary destinations.
 */
export function MobileTopBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const res = await api.notifications();
        if (active) setUnread(res.unread);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      active = false;
    };
  }, [user, pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading || !user) return null;
  if (pathname.includes('/chat')) return null;

  const name = accountDisplayName(user);

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  }

  return (
    <>
      <header
        className="glass ring-border/60 fixed inset-x-0 top-0 z-50 border-b ring-1 md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex w-full max-w-[1508px] items-center gap-2 px-3 py-2.5">
          <Link href="/" className="shrink-0" aria-label="Nine Circles home">
            <Wordmark size="nav" />
          </Link>

          <form onSubmit={search} className="min-w-0 flex-1">
            <div className="bg-card/70 ring-border/70 focus-within:ring-ring/40 flex items-center gap-2 rounded-full px-3 py-2 ring-1 transition">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground text-xs" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="text-foreground placeholder:text-muted-foreground w-full min-w-0 bg-transparent text-sm outline-none"
                aria-label="Search"
              />
            </div>
          </form>

          <Link
            href="/notifications"
            className="hover:bg-muted relative grid size-10 shrink-0 place-items-center rounded-full transition-colors"
            aria-label="Notifications"
          >
            <i className="fa-regular fa-bell text-lg" />
            <UnreadBadge count={unread} />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="hover:bg-muted rounded-full p-1 transition-colors"
            aria-label="Account menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={name} src={user.photoUrl} size={32} online />
          </button>
        </div>
      </header>

      <SideDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="right"
        title="Account"
      >
        <div className="-mx-4 -mt-4 flex min-h-full flex-col">
          <AccountMenuHeader user={user} />
          <div className="bg-border h-px" />
          <AccountMenuLinks user={user} onNavigate={() => setMenuOpen(false)} />
          <div className="bg-border mt-auto h-px" />
          <AccountMenuLogout
            onLogout={async () => {
              setMenuOpen(false);
              await logout();
            }}
          />
        </div>
      </SideDrawer>
    </>
  );
}

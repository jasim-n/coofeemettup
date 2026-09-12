'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useRequestsBadge } from '@/components/requests-badge';
import { Wordmark } from '@/components/wordmark';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { UnreadBadge } from '@/components/unread-badge';
import {
  accountDisplayName,
  AccountMenuHeader,
  AccountMenuLinks,
  AccountMenuLogout,
} from '@/components/account-menu';

const NAV = [
  { href: '/', label: 'Home', icon: 'fa-house' },
  { href: '/discover', label: 'Explore', icon: 'fa-magnifying-glass' },
  { href: '/tables/nearby', label: 'Nearby', icon: 'fa-location-dot' },
  { href: '/meetups', label: 'Meetups', icon: 'fa-calendar-days' },
  { href: '/messages', label: 'Messages', icon: 'fa-comment' },
];

/**
 * Design System v2.0 top navigation: brand · Home/Explore/Nearby/Meetups/Messages ·
 * global search · notifications bell · avatar dropdown. Desktop only.
 */
export function DesktopNav() {
  const { user, loading, logout } = useAuth();
  const { count: requestCount } = useRequestsBadge();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // close the avatar menu on outside click (item clicks close it inline below)
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (loading || !user) return null;
  const name = accountDisplayName(user);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  }

  return (
    <header className="glass ring-border/60 fixed inset-x-0 top-0 z-50 hidden border-b ring-1 md:block">
      <nav className="mx-auto flex w-full max-w-[1508px] items-center gap-3 px-4 sm:px-6 lg:px-12 py-3">
        {/* brand */}
        <Link href="/" className="mr-1 flex shrink-0 items-center" aria-label="Nine Circles home">
          <Wordmark size="nav" />
        </Link>

        {/* nav items */}
        <div className="flex items-center gap-1">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-secondary text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <i className={`fa-solid ${n.icon} text-[0.95em]`} />
                <span className="hidden lg:inline">{n.label}</span>
              </Link>
            );
          })}
          {/* Host-only "Requests" — the join-request approve/decline inbox, with
              a pending-count badge. */}
          {user.canHost && (
            <Link
              href="/requests"
              className={`relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                isActive('/requests')
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <i className="fa-solid fa-inbox text-[0.95em]" />
              <span className="hidden lg:inline">Requests</span>
              {requestCount > 0 && (
                <span className="bg-primary text-primary-foreground grid min-w-[1.1rem] place-items-center rounded-full px-1 text-[0.65rem] font-bold leading-4">
                  {requestCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* search */}
        <form onSubmit={search} className="ml-auto hidden max-w-sm flex-1 xl:flex">
          <div className="bg-card/70 ring-border/70 focus-within:ring-ring/40 flex w-full items-center gap-2 rounded-full px-4 py-2 ring-1 transition">
            <i className="fa-solid fa-magnifying-glass text-muted-foreground text-sm" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search meetups, people, vibes…"
              className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
            <kbd className="text-muted-foreground bg-muted hidden rounded px-1.5 py-0.5 text-[10px] font-semibold lg:inline">
              ⌘K
            </kbd>
          </div>
        </form>

        {/* bell */}
        <Link
          href="/notifications"
          className="hover:bg-muted relative ml-auto grid size-10 shrink-0 place-items-center rounded-full transition-colors xl:ml-0"
          aria-label="Notifications"
        >
          <i className="fa-regular fa-bell text-lg" />
          <UnreadBadge count={unread} />
        </Link>

        {/* avatar dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="hover:bg-muted flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 transition-colors"
          >
            <Avatar name={name} src={user.photoUrl} size={34} online />
            <i className="fa-solid fa-chevron-down text-muted-foreground text-xs" />
          </button>

          {menuOpen && (
            <div className="bg-card ring-border/60 shadow-glow absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-3xl ring-1">
              <AccountMenuHeader user={user} />
              <div className="bg-border h-px" />
              <AccountMenuLinks user={user} onNavigate={() => setMenuOpen(false)} />
              <div className="bg-border h-px" />
              <AccountMenuLogout
                onLogout={async () => {
                  setMenuOpen(false);
                  await logout();
                }}
              />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

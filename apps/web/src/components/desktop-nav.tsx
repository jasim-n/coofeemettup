'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';

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
  const isAdmin = user.role === 'ADMIN' || user.role === 'ORGANIZER';
  const name = user.firstName ?? user.phone;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  }

  return (
    <header className="glass ring-border/60 sticky top-0 z-40 hidden border-b ring-1 md:block">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-3 px-6 py-3">
        {/* brand */}
        <Link href="/" className="mr-1 flex shrink-0 items-center gap-2">
          <span className="bg-gradient-hero grid size-8 place-items-center rounded-xl text-white shadow-soft">
            <i className="fa-solid fa-mug-hot text-sm" />
          </span>
          <span className="font-heading text-lg font-extrabold tracking-tight">
            Coffee <span className="text-primary">Meetups</span>
          </span>
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
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">
              {unread}
            </span>
          )}
        </Link>

        {/* avatar dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="hover:bg-muted flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 transition-colors"
          >
            <Avatar name={name} size={34} online />
            <i className="fa-solid fa-chevron-down text-muted-foreground text-xs" />
          </button>

          {menuOpen && (
            <div
              onClick={() => setMenuOpen(false)}
              className="bg-card ring-border/60 shadow-glow absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-3xl ring-1"
            >
              {/* header */}
              <div className="flex items-center gap-3 p-4">
                <Avatar name={name} size={48} online />
                <div className="min-w-0">
                  <p className="font-heading truncate font-bold tracking-tight">{name}</p>
                  <p className="text-muted-foreground truncate text-xs">@{user.phone}</p>
                  <span className="bg-secondary text-secondary-foreground mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    <i className="fa-solid fa-star text-[0.9em]" />
                    {user.verificationStatus === 'VERIFIED' ? 'Verified member' : 'Member'}
                  </span>
                </div>
              </div>
              <div className="bg-border h-px" />
              <div className="p-2">
                <MenuItem href="/profile" icon="fa-user" title="View Profile" sub="See your public profile" />
                <MenuItem href="/meetups" icon="fa-calendar-days" title="My Meetups" sub="Manage your meetups" />
                <MenuItem
                  href="/invites"
                  icon="fa-user-group"
                  title="Invitations"
                  sub="Requests & invites"
                />
                <MenuItem href="/saved" icon="fa-bookmark" title="Saved" sub="Browse & saved tables" />
                <MenuItem href="/profile" icon="fa-gear" title="Settings" sub="Account & preferences" />
                {isAdmin && (
                  <MenuItem href="/admin" icon="fa-shield-halved" title="Admin" sub="Console & moderation" />
                )}
                <MenuItem href="/terms" icon="fa-circle-question" title="Help & Support" sub="Get help and support" />
              </div>
              <div className="bg-border h-px" />
              <button
                type="button"
                onClick={() => void logout()}
                className="text-destructive hover:bg-destructive/5 flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                <span>
                  <span className="block text-sm font-semibold">Log Out</span>
                  <span className="block text-xs opacity-80">Sign out from your account</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuItem({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors"
    >
      <span className="bg-secondary text-primary grid size-9 shrink-0 place-items-center rounded-xl">
        <i className={`fa-solid ${icon} text-sm`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{sub}</span>
      </span>
      <i className="fa-solid fa-chevron-right text-muted-foreground text-xs" />
    </Link>
  );
}

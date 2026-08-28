'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Wordmark } from '@/components/wordmark';
import { Avatar } from '@/components/avatar';
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

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (loading || !user) return null;
  if (pathname.includes('/chat')) return null;

  const isAdmin = user.role === 'ADMIN' || user.role === 'ORGANIZER';
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    (user.username ? `@${user.username}` : 'Member');

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  }

  return (
    <header className="glass ring-border/60 sticky top-0 z-40 border-b ring-1 md:hidden">
      <div className="mx-auto flex w-full max-w-[1508px] items-center gap-2 px-3 py-2.5">
        <Link href="/" className="shrink-0" aria-label="Nine Circles home">
          <Wordmark size="sm" />
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
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">
              {unread}
            </span>
          )}
        </Link>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="hover:bg-muted rounded-full p-1 transition-colors"
            aria-label="Account menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={name} src={user.photoUrl} size={32} online />
          </button>

          {menuOpen && (
            <div
              onClick={() => setMenuOpen(false)}
              className="bg-card ring-border/60 shadow-glow absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-3xl ring-1"
            >
              <div className="flex items-center gap-3 p-4">
                <Avatar name={name} src={user.photoUrl} size={44} online />
                <div className="min-w-0">
                  <p className="font-heading truncate text-sm font-bold">{name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.username ? `@${user.username}` : 'Set your handle'}
                  </p>
                </div>
              </div>
              <div className="bg-border h-px" />
              <div className="p-2">
                <Link
                  href="/profile"
                  className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-semibold"
                >
                  <i className="fa-solid fa-user w-4 text-center text-xs" />
                  Profile
                </Link>
                <Link
                  href="/saved"
                  className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-semibold"
                >
                  <i className="fa-solid fa-bookmark w-4 text-center text-xs" />
                  Saved
                </Link>
                <Link
                  href="/invites"
                  className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-semibold"
                >
                  <i className="fa-solid fa-envelope-open w-4 text-center text-xs" />
                  Invitations
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-semibold"
                  >
                    <i className="fa-solid fa-shield-halved w-4 text-center text-xs" />
                    Admin
                  </Link>
                )}
              </div>
              <div className="bg-border h-px" />
              <button
                type="button"
                onClick={() => void logout()}
                className="text-destructive hover:bg-destructive/5 flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold"
              >
                <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

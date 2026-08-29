'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { MobileNav } from '@/components/mobile-nav';
import { MobileTopBar } from '@/components/mobile-top-bar';

/** Top + bottom mobile chrome; desktop uses DesktopNav only. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const isChat = pathname.includes('/chat');
  // Match MobileNav visibility — never reserve tab space when tabs aren't shown
  // (login / logged-out / chat), or the page background leaves a bottom band.
  const showMobileNav = !loading && !!user && !isChat;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isChat && <MobileTopBar />}
      <div
        className={
          showMobileNav
            ? 'flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
            : 'flex min-h-0 flex-1 flex-col'
        }
      >
        {children}
      </div>
      <MobileNav />
    </div>
  );
}

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
  const showMobileNav = !loading && !!user && !isChat;

  // Fixed mobile chrome is viewport-bound; reserve space so content/footer are not covered.
  const mobileChromePad = showMobileNav
    ? 'pt-[calc(5.625rem+env(safe-area-inset-top,0px))] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pt-0 md:pb-0'
    : '';

  return (
    <div className="flex flex-1 flex-col">
      {!isChat && <MobileTopBar />}
      <div className={`flex flex-1 flex-col ${mobileChromePad}`}>{children}</div>
      <MobileNav />
    </div>
  );
}

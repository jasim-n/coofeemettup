'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { PageTransitionProvider } from '@/components/page-transition-provider';

/** Content shell — fixed nav chrome lives in AuthGate so it stays viewport-bound over the footer. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const isChat = pathname.includes('/chat');
  const showMobileNav = !loading && !!user && !isChat;

  // Reserve space for fixed top/bottom chrome (mobile) and fixed DesktopNav (md+).
  const chromePad = showMobileNav
    ? 'pt-[calc(5.625rem+env(safe-area-inset-top,0px))] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pt-[4.25rem] md:pb-0'
    : 'md:pt-[4.25rem]';

  return (
    <PageTransitionProvider className={`flex flex-1 flex-col ${chromePad}`}>
      {children}
    </PageTransitionProvider>
  );
}

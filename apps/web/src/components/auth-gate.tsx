'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { LoadingGate } from '@/components/spinner';
import { hasStoredAuthToken } from '@/lib/auth-storage';
import { isPublicPath } from '@/lib/public-paths';
import { shouldShowSiteFooter } from '@/lib/site-footer';
import { RequestsBadgeProvider } from '@/components/requests-badge';
import { DesktopNav } from '@/components/desktop-nav';
import { MobileNav } from '@/components/mobile-nav';
import { MobileTopBar } from '@/components/mobile-top-bar';
import { AppShell } from '@/components/app-shell';
import { SiteFooter } from '@/components/site-footer';
import { PageTransitionProvider } from '@/components/page-transition-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const publicPath = isPublicPath(pathname);
  const showFooter = shouldShowSiteFooter(pathname);

  useEffect(() => {
    if (loading) return;
    const hasToken = typeof window !== 'undefined' && hasStoredAuthToken();

    if (!publicPath && (!user || !hasToken)) {
      router.replace('/login');
    }
  }, [publicPath, loading, router, user, pathname]);

  if (publicPath) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden">
        <PageTransitionProvider className="flex flex-1 flex-col">
          {children}
        </PageTransitionProvider>
        {showFooter && <SiteFooter />}
      </div>
    );
  }

  return (
    <LoadingGate loading={loading} variant="fullscreen">
      {user ? (
        <RequestsBadgeProvider>
          <div className="flex min-h-dvh flex-col">
            <DesktopNav />
            <MobileTopBar />
            <AppShell>{children}</AppShell>
            {showFooter && <SiteFooter />}
            <MobileNav />
          </div>
        </RequestsBadgeProvider>
      ) : (
        <div className="min-h-dvh" aria-hidden />
      )}
    </LoadingGate>
  );
}

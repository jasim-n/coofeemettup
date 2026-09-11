'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { PageLoader } from '@/components/spinner';
import { hasStoredAuthToken } from '@/lib/auth-storage';
import { isPublicPath } from '@/lib/public-paths';
import { shouldShowSiteFooter } from '@/lib/site-footer';
import { RequestsBadgeProvider } from '@/components/requests-badge';
import { DesktopNav } from '@/components/desktop-nav';
import { AppShell } from '@/components/app-shell';
import { SiteFooter } from '@/components/site-footer';

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
        <div className="flex-1">{children}</div>
        {showFooter && <SiteFooter />}
      </div>
    );
  }

  if (loading || !user) return <PageLoader />;

  return (
    <RequestsBadgeProvider>
      <div className="flex min-h-dvh flex-col">
        <DesktopNav />
        <AppShell>{children}</AppShell>
        {showFooter && <SiteFooter />}
      </div>
    </RequestsBadgeProvider>
  );
}

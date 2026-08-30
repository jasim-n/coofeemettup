'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { PageLoader } from '@/components/spinner';
import { TOKEN_KEY } from '@/lib/api';

const PUBLIC_PATHS = new Set(['/login', '/privacy', '/terms']);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (loading) return;
    const hasToken =
      typeof window !== 'undefined' && !!window.localStorage.getItem(TOKEN_KEY);

    // No user or no persisted token → protected routes must leave.
    if (!isPublicPath && (!user || !hasToken)) {
      router.replace('/login');
    }
  }, [isPublicPath, loading, router, user, pathname]);

  if (isPublicPath) return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  if (loading || !user) return <PageLoader />;

  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

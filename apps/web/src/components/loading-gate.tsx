'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { PageLoader } from '@/components/page-loader';

type LoadingGateProps = {
  loading: boolean;
  children: ReactNode;
  label?: string;
  variant?: 'fullscreen' | 'inline';
};

/**
 * Full-page counter loader — use ONLY for initial app/auth boot (see AuthGate).
 * For in-page data fetches, use ContentPlaceholder + skeleton components.
 *
 * Children mount only once the counter has settled at 100 (under the cover),
 * so the app shell's render cost never stalls the counting animation.
 */
export function LoadingGate({ loading, children, label, variant = 'inline' }: LoadingGateProps) {
  const [showLoader, setShowLoader] = useState(loading);
  const [revealContent, setRevealContent] = useState(!loading);

  useEffect(() => {
    if (!loading) return;
    setShowLoader(true);
    setRevealContent(false);
  }, [loading]);

  const handleLoaderReady = useCallback(() => {
    setRevealContent(true);
  }, []);

  const handleLoaderComplete = useCallback(() => {
    setRevealContent(true);
    setShowLoader(false);
  }, []);

  if (!showLoader) {
    return <>{children}</>;
  }

  return (
    <>
      {revealContent && children}
      <PageLoader
        label={label}
        variant={variant}
        active={loading}
        onReady={handleLoaderReady}
        onComplete={handleLoaderComplete}
      />
    </>
  );
}

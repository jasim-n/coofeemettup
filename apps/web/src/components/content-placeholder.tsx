import type { ReactNode } from 'react';

/** Inline content loading — skeleton only, never the page counter loader. */
export function ContentPlaceholder({
  loading,
  skeleton,
  children,
}: {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  if (loading) return <>{skeleton}</>;
  return <>{children}</>;
}

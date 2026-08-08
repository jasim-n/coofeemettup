'use client';

import Link from 'next/link';

/**
 * Wraps a user's identity block (avatar + name) so tapping it opens that
 * person's public profile at /u/[id]. Never wrap action buttons in this.
 */
export function UserLink({
  userId,
  className = '',
  children,
}: {
  userId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/u/${userId}`}
      className={`rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50 ${className}`}
    >
      {children}
    </Link>
  );
}

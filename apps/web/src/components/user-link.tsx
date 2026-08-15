'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { isAdminRole } from '@/lib/roles';

/**
 * Identity block (avatar + name). Links to /u/[id] for admins only;
 * everyone else sees a non-clickable label. Own identity links to /profile.
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
  const { user } = useAuth();
  const isSelf = Boolean(user && user.id === userId);
  const canOpen = isSelf || isAdminRole(user?.role);

  if (!canOpen) {
    return <span className={className}>{children}</span>;
  }

  const href = isSelf ? '/profile' : `/u/${userId}`;
  return (
    <Link
      href={href}
      className={`rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50 ${className}`}
    >
      {children}
    </Link>
  );
}

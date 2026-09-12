'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  if (!loading && !isAdmin) return null;

  return children;
}

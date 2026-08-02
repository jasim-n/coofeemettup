'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';

/**
 * Shared pending-join-request count for the host "Requests" nav badge. Kept in
 * one place so the badge stays in sync no matter where the count changes:
 * refetched on route change + tab focus, and on demand via refresh() (called by
 * the Requests page after an approve/decline).
 */
const RequestsBadgeContext = createContext<{ count: number; refresh: () => void }>({
  count: 0,
  refresh: () => {},
});

export function RequestsBadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user?.canHost) return;
    let active = true;
    const run = async () => {
      try {
        const data = await api.myTableRequests();
        if (active) setCount(data.length);
      } catch {
        /* badge is best-effort */
      }
    };
    void run();
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [user, pathname, tick]);

  return (
    <RequestsBadgeContext.Provider value={{ count, refresh }}>
      {children}
    </RequestsBadgeContext.Provider>
  );
}

export const useRequestsBadge = () => useContext(RequestsBadgeContext);

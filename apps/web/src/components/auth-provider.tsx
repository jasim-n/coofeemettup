'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, type PublicUser } from '@jrst/api-client';
import { api, TOKEN_KEY } from '@/lib/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  requestOtp: (email: string) => Promise<{ isNewUser: boolean; devCode?: string }>;
  verifyOtp: (email: string, code: string, opts?: { phone?: string; referralCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch (err) {
      // 401 = no active session. Anything else is a real error — surface it.
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await refresh();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const requestOtp = useCallback(async (email: string) => {
    const res = await api.requestOtp(email);
    return { isNewUser: res.isNewUser, devCode: res.devCode };
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string, opts?: { phone?: string; referralCode?: string }) => {
      const res = await api.verifyOtp(email, code, opts);
      // Persist the bearer token so the session survives reloads (no cookies).
      const token = api.getAuthToken();
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout();
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

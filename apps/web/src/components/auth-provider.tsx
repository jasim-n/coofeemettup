'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, type PublicUser } from '@jrst/api-client';
import { api, TOKEN_KEY } from '@/lib/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  requestOtp: (
    email: string,
    intent?: 'signup' | 'login',
  ) => Promise<{ isNewUser: boolean; devCode?: string }>;
  verifyOtp: (email: string, code: string, opts?: { phone?: string; firstName?: string; lastName?: string; username?: string; referralCode?: string; password?: string }) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ devCode?: string }>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
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
      // 401 = no active session (including suspended/banned). Clear token so
      // a locked account cannot keep using a stale JWT from localStorage.
      if (err instanceof ApiError && err.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY);
        api.setAuthToken(null);
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

  const requestOtp = useCallback(
    async (email: string, intent: 'signup' | 'login' = 'login') => {
      const res = await api.requestOtp(email, intent);
      return { isNewUser: res.isNewUser, devCode: res.devCode };
    },
    [],
  );

  const verifyOtp = useCallback(
    async (email: string, code: string, opts?: { phone?: string; firstName?: string; lastName?: string; username?: string; referralCode?: string; password?: string }) => {
      const res = await api.verifyOtp(email, code, opts);
      // Persist the bearer token so the session survives reloads (no cookies).
      const token = api.getAuthToken();
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      setUser(res.user);
    },
    [],
  );

  const login = useCallback(async (email: string, password?: string) => {
    const res = await api.login(email, password);
    const token = api.getAuthToken();
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    setUser(res.user);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const res = await api.requestPasswordReset(email);
    return { devCode: res.devCode };
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, password: string) => {
      const res = await api.resetPassword(email, code, password);
      const token = api.getAuthToken();
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    // Logging out locally must always succeed, even if the server call fails
    // (e.g. an expired session → CSRF 403). Clear client state regardless, then
    // hard-redirect to /login so no in-memory/route state lingers.
    try {
      await api.logout();
    } catch {
      /* ignore — proceed to clear + redirect */
    }
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, login, requestPasswordReset, resetPassword, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

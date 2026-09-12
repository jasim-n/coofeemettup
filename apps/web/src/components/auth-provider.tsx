'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, type PublicUser } from '@jrst/api-client';
import { api } from '@/lib/api';
import {
  clearAuthToken,
  hasStoredAuthToken,
  loadStoredAuthToken,
  persistAuthToken,
  saveLoginEmail,
} from '@/lib/auth-storage';
import { invalidateDataCache } from '@/lib/data-cache';
import { isPublicPath } from '@/lib/public-paths';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  requestOtp: (
    email: string,
    intent?: 'signup' | 'login',
  ) => Promise<{ isNewUser: boolean; devCode?: string }>;
  verifyOtp: (email: string, code: string, opts?: { phone?: string; firstName?: string; lastName?: string; username?: string; referralCode?: string; password?: string }) => Promise<void>;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ devCode?: string }>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearClientSession(): void {
  clearAuthToken();
  api.setAuthToken(null);
  invalidateDataCache();
}

function storeSessionToken(token: string, remember: boolean): void {
  persistAuthToken(token, remember);
  api.setAuthToken(token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = loadStoredAuthToken();
    if (!token) {
      setUser(null);
      return;
    }
    api.setAuthToken(token);

    try {
      // Fail fast on LAN/firewall hangs (Windows → Mac) instead of spinning forever.
      const res = await Promise.race([
        api.me(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ApiError(0, 'Auth request timed out')), 8_000),
        ),
      ]);
      setUser(res.user);
    } catch (err) {
      // 401 = no active session (including suspended/banned). Clear token so
      // a locked account cannot keep using a stale JWT from storage.
      if (err instanceof ApiError && err.status === 401) {
        clearClientSession();
        setUser(null);
      } else if (err instanceof ApiError && err.status === 0) {
        // Network timeout — keep the stored token; user may still be signed in.
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

  // Browser back/forward can restore cached pages with stale auth state.
  const clearSessionIfNoToken = useCallback(() => {
    if (hasStoredAuthToken()) return;
    clearClientSession();
    setUser(null);
  }, []);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      clearSessionIfNoToken();
      if (!hasStoredAuthToken()) {
        if (!isPublicPath(window.location.pathname)) {
          window.location.replace('/login');
        }
        return;
      }
      void refresh();
    };
    const onPopState = () => {
      clearSessionIfNoToken();
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, [clearSessionIfNoToken, refresh]);

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
      const token = api.getAuthToken();
      if (token) storeSessionToken(token, true);
      setUser(res.user);
    },
    [],
  );

  const login = useCallback(
    async (email: string, password?: string, rememberMe = true) => {
      const res = await api.login(email, password, rememberMe);
      const token = api.getAuthToken();
      if (token) storeSessionToken(token, rememberMe);
      if (rememberMe) saveLoginEmail(email);
      setUser(res.user);
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const res = await api.requestPasswordReset(email);
    return { devCode: res.devCode };
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, password: string) => {
      const res = await api.resetPassword(email, code, password);
      const token = api.getAuthToken();
      if (token) storeSessionToken(token, true);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    // Logging out locally must always succeed, even if the server call fails
    // (e.g. an expired session → CSRF 403). Clear client state regardless, then
    // replace history so Back cannot restore a cached authenticated page.
    try {
      await api.logout();
    } catch {
      /* ignore — proceed to clear + redirect */
    }
    clearClientSession();
    setUser(null);
    window.location.replace('/login');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, login, requestPasswordReset, resetPassword, logout, refresh }}>
      <div className="flex min-h-dvh flex-1 flex-col">{children}</div>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

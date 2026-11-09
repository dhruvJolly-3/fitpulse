import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from './api';
import { cache } from './cache';
import { tokenStore } from './storage';
import type { AuthResponse, User } from './types';

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Every change to the signed-in user is cached, so the next launch opens instantly
  const setUser = useCallback((next: User | null | ((prev: User | null) => User | null)) => {
    setUserState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (value) cache.write('user', value);
      return value;
    });
  }, []);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    await cache.clear();
    setUserState(null);
  }, []);

  // Restore the session on launch without waiting for the server: show the
  // cached user at once, then refresh the profile in the background. The
  // free-tier API can take a minute to wake up; nobody should watch a spinner
  // for that. Only a 401 signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    (async () => {
      const token = await tokenStore.get();
      if (!token) { setLoading(false); return; }
      const cached = await cache.read<User>('user');
      if (cached) { setUserState(cached); setLoading(false); }
      try {
        setUser(await api.get<User>('/user/profile', { timeoutMs: 60000 }));
      } catch {
        /* 401 → handler signs out; offline → keep the cached session */
      }
      setLoading(false);
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout, setUser]);

  const startSession = useCallback(async (data: AuthResponse) => {
    await tokenStore.set(data.token);
    setUser(data.user);
  }, [setUser]);

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    login: async (email, password) => startSession(await api.post<AuthResponse>('/auth/login', { email, password })),
    register: async (name, email, password) => startSession(await api.post<AuthResponse>('/auth/register', { name, email, password })),
    logout,
    refreshUser: async () => setUser(await api.get<User>('/user/profile')),
    updateUser: (patch) => setUser(prev => (prev ? { ...prev, ...patch } : prev)),
  }), [user, loading, logout, setUser, startSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

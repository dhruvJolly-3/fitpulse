import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from './api';
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
  }, []);

  // Restore the session on launch. Only a 401 signs the user out; a slow or
  // offline server keeps the token so the next launch can retry.
  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    (async () => {
      const token = await tokenStore.get();
      if (token) {
        try {
          setUser(await api.get<User>('/user/profile', { timeoutMs: 30000 }));
        } catch {
          /* handled by the 401 handler, or retried next launch */
        }
      }
      setLoading(false);
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const startSession = async (data: AuthResponse) => {
    await tokenStore.set(data.token);
    setUser(data.user);
  };

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    login: async (email, password) => startSession(await api.post<AuthResponse>('/auth/login', { email, password })),
    register: async (name, email, password) => startSession(await api.post<AuthResponse>('/auth/register', { name, email, password })),
    logout,
    refreshUser: async () => setUser(await api.get<User>('/user/profile')),
    updateUser: (patch) => setUser(prev => (prev ? { ...prev, ...patch } : prev)),
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

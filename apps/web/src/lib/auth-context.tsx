'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from './api';

export interface UserSession {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'RESIDENT' | 'GUARD' | 'ADMIN';
  societyId: string;
  societyName: string;
  societyTimezone: string;
  flatId?: string | null;
  flatNumber?: string | null;
  towerName?: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (identifier: string, password?: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const data = await fetchApi<{ user: UserSession }>('/api/v1/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('parkpass_auth_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password = 'password123') => {
    setIsLoading(true);
    try {
      const data = await fetchApi<{ token: string; user: UserSession }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('parkpass_auth_token', data.token);
      }
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('parkpass_auth_token');
      }
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

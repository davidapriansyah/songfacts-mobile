import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '../api/auth';
import { getStoredUser, setSession, clearSession } from '../api/client';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  googleSignIn: (googleId: string, email: string, profileImage?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedUser = await getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setToken('restored');
      }
      setIsLoading(false);
    })();
  }, []);

  const applySession = (data: { token: string; user: User }) => {
    setSession(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
  };

  const signIn = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    applySession(data);
  };

  const signUp = async (email: string, password: string) => {
    const { data } = await authApi.register(email, password);
    applySession(data);
  };

  const googleSignIn = async (googleId: string, email: string, profileImage?: string) => {
    const { data } = await authApi.loginGoogle(googleId, email, profileImage);
    applySession(data);
  };

  const signOut = async () => {
    await clearSession();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, signIn, signUp, googleSignIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

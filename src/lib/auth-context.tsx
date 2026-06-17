'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { NivelAcesso } from '@/types';

const TOKEN_EXPIRATION_MS = 8 * 60 * 60 * 1000; // 8 horas

interface AuthUser {
  email: string;
  tipo: NivelAcesso;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, tipo: NivelAcesso, email: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tipo');
    localStorage.removeItem('email');
    localStorage.removeItem('tokenExpiresAt');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  // Verifica se o token ainda é válido
  const isTokenValid = () => {
    const expiresAt = Number(localStorage.getItem('tokenExpiresAt'));
    return expiresAt && Date.now() < expiresAt;
  };

  useEffect(() => {
    const storedToken    = localStorage.getItem('token');
    const storedEmail    = localStorage.getItem('email');
    const storedTipo     = localStorage.getItem('tipo') as NivelAcesso | null;

    if (storedToken && storedEmail && storedTipo) {
      if (isTokenValid()) {
        setToken(storedToken);
        setUser({ email: storedEmail, tipo: storedTipo });
      } else {
        // Token expirado: limpa tudo e manda para login
        logout();
      }
    }

    setTimeout(() => setIsLoading(false), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Verifica expiração a cada minuto (enquanto a aba está aberta)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (!isTokenValid()) {
        logout();
      }
    }, 60 * 1000); // checa a cada 1 minuto

    return () => clearInterval(interval);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (token: string, tipo: NivelAcesso, email: string) => {
    const expiresAt = Date.now() + TOKEN_EXPIRATION_MS;

    localStorage.setItem('token', token);
    localStorage.setItem('tipo', tipo);
    localStorage.setItem('email', email);
    localStorage.setItem('tokenExpiresAt', String(expiresAt));

    setToken(token);
    setUser({ email, tipo });

    if (tipo === 'ADMIN') {
      router.push('/dashboard/admin');
    } else {
      router.push('/dashboard/usuario');
    }
  };

  return (
    <AuthContext.Provider value={{
      user, token,
      login, logout,
      isAdmin: user?.tipo === 'ADMIN',
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
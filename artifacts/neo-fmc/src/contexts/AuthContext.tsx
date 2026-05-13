import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, UserResponse, getGetMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: UserResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('neo_fmc_token'));
  const [sessionUser, setSessionUser] = useState<UserResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (token && token !== 'session') {
      setSessionLoading(false);
      return;
    }
    fetch('/api/auth/user', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          fetch('/api/auth/me', { credentials: 'include' })
            .then(res => res.ok ? res.json() : null)
            .then(userData => {
              if (userData && userData.id) {
                setSessionUser(userData);
                localStorage.removeItem('neo_fmc_token');
                setToken('session');
              }
              setSessionLoading(false);
            })
            .catch(() => setSessionLoading(false));
        } else {
          setSessionLoading(false);
        }
      })
      .catch(() => setSessionLoading(false));
  }, []);

  const { data: jwtUser, isLoading: isQueryLoading, error } = useGetMe({
    query: {
      enabled: !!token && token !== 'session',
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      localStorage.removeItem('neo_fmc_token');
      setToken(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
    }
  }, [error, queryClient]);

  const login = (newToken: string, userData: UserResponse) => {
    if (newToken === 'session') {
      localStorage.removeItem('neo_fmc_token');
      setSessionUser(userData);
      setToken('session');
    } else {
      localStorage.setItem('neo_fmc_token', newToken);
      setToken(newToken);
      setSessionUser(null);
      queryClient.setQueryData(getGetMeQueryKey(), userData);
    }
  };

  const logout = () => {
    const isSessionAuth = token === 'session';
    localStorage.removeItem('neo_fmc_token');
    setToken(null);
    setSessionUser(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    if (isSessionAuth) {
      window.location.href = '/api/logout';
    } else {
      window.location.href = '/login';
    }
  };

  const user = token === 'session' ? sessionUser : (jwtUser || null);
  const isLoading = sessionLoading || (!!token && token !== 'session' && isQueryLoading);

  return (
    <AuthContext.Provider value={{ 
      user: user || null, 
      isLoading, 
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

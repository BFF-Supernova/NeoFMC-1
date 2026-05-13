import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

export interface ImpersonationMeta {
  targetUser: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    tenantId: string;
  };
  superAdmin: {
    id: string;
    name: string;
    email: string;
  };
  reason: string;
  startedAt: number;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  meta: ImpersonationMeta | null;
  startImpersonation: (userId: string, tenantId: string, reason: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const IMPERSONATION_TOKEN_KEY = 'neo_fmc_impersonation_token';
const ORIGINAL_TOKEN_KEY = 'neo_fmc_original_token';
const IMPERSONATION_META_KEY = 'neo_fmc_impersonation_meta';

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<ImpersonationMeta | null>(() => {
    try {
      const stored = localStorage.getItem(IMPERSONATION_META_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem(IMPERSONATION_META_KEY);
    if (stored) {
      try {
        setMeta(JSON.parse(stored));
      } catch {
        setMeta(null);
      }
    }
  }, []);

  const startImpersonation = useCallback(async (userId: string, tenantId: string, reason: string) => {
    const currentToken = localStorage.getItem('neo_fmc_token');
    if (!currentToken) throw new Error('Not authenticated');

    const res = await fetch('/api/admin/impersonate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ userId, tenantId, reason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to start impersonation');
    }

    const data = await res.json();

    localStorage.setItem(ORIGINAL_TOKEN_KEY, currentToken);
    localStorage.setItem(IMPERSONATION_TOKEN_KEY, data.token);
    localStorage.setItem('neo_fmc_token', data.token);

    const newMeta: ImpersonationMeta = {
      targetUser: data.targetUser,
      superAdmin: data.superAdmin,
      reason: data.reason,
      startedAt: Date.now(),
    };
    localStorage.setItem(IMPERSONATION_META_KEY, JSON.stringify(newMeta));
    setMeta(newMeta);

    setLocation('/dashboard');
    window.location.reload();
  }, [setLocation]);

  const endImpersonation = useCallback(async () => {
    const impToken = localStorage.getItem(IMPERSONATION_TOKEN_KEY);
    if (impToken) {
      try {
        await fetch('/api/admin/impersonate/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${impToken}`,
          },
          credentials: 'include',
        });
      } catch {
      }
    }

    const originalToken = localStorage.getItem(ORIGINAL_TOKEN_KEY);
    if (originalToken) {
      localStorage.setItem('neo_fmc_token', originalToken);
    } else {
      localStorage.removeItem('neo_fmc_token');
    }

    localStorage.removeItem(IMPERSONATION_TOKEN_KEY);
    localStorage.removeItem(ORIGINAL_TOKEN_KEY);
    localStorage.removeItem(IMPERSONATION_META_KEY);
    setMeta(null);

    window.location.href = '/super-admin';
  }, []);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: !!meta,
      meta,
      startImpersonation,
      endImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
}

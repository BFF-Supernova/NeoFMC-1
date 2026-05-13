import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Tenant {
  id: string;
  companyName: string;
  companyNameAr: string;
  isActive: boolean;
}

interface TenantContextType {
  selectedTenantId: string | null;
  selectedTenant: Tenant | null;
  tenants: Tenant[];
  setSelectedTenantId: (id: string | null) => void;
  isSuperAdmin: boolean;
  hasTenantContext: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(() => {
    return localStorage.getItem('neo_fmc_sa_tenant') || null;
  });

  useEffect(() => {
    if (!isAuthenticated || !isSuperAdmin) {
      setTenants([]);
      return;
    }
    const token = localStorage.getItem('neo_fmc_token');
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    fetch(`${base}/api/tenants`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) setTenants(data.data);
        else if (Array.isArray(data)) setTenants(data);
      })
      .catch(() => {});
  }, [isAuthenticated, isSuperAdmin]);

  useEffect(() => {
    if (selectedTenantId) {
      localStorage.setItem('neo_fmc_sa_tenant', selectedTenantId);
    } else {
      localStorage.removeItem('neo_fmc_sa_tenant');
    }
  }, [selectedTenantId]);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId) || null;
  const hasTenantContext = isSuperAdmin ? !!selectedTenantId : true;

  return (
    <TenantContext.Provider value={{ selectedTenantId, selectedTenant, tenants, setSelectedTenantId, isSuperAdmin, hasTenantContext }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider');
  return ctx;
}

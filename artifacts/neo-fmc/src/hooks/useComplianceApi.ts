import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('neo_fmc_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useBlacklists(listType?: string) {
  return useQuery({
    queryKey: ['blacklists', listType],
    queryFn: () => apiFetch<{ data: any[] }>(`/blacklists${listType ? `?listType=${listType}` : ''}`),
  });
}

export function useAddBlacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nationalId: string; fullName: string; listType: string; reason?: string; source?: string }) =>
      apiFetch('/blacklists', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blacklists'] }),
  });
}

export function useRemoveBlacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/blacklists/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blacklists'] }),
  });
}

export function useCheckBlacklist(nationalId: string) {
  return useQuery({
    queryKey: ['blacklist-check', nationalId],
    queryFn: () => apiFetch<{ isBlacklisted: boolean; entries: any[] }>(`/blacklists/check/${nationalId}`),
    enabled: !!nationalId,
  });
}

export function useIScoreCheck() {
  return useMutation({
    mutationFn: (data: { clientId: string; loanRequestId?: string }) =>
      apiFetch(`/iscore/check/${data.clientId}`, { method: 'POST', body: JSON.stringify({ loanRequestId: data.loanRequestId }) }),
  });
}

export function useIScoreHistory(clientId: string) {
  return useQuery({
    queryKey: ['iscore-history', clientId],
    queryFn: () => apiFetch<{ data: any[] }>(`/iscore/history/${clientId}`),
    enabled: !!clientId,
  });
}

export function useIScoreGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanRequestId: string) =>
      apiFetch<{ canProceed: boolean; blacklistCheck: any; iscoreCheck: any }>(`/iscore/gate/${loanRequestId}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-requests'] }),
  });
}

export function useApprovalRequests(status?: string) {
  return useQuery({
    queryKey: ['approval-requests', status],
    queryFn: () => apiFetch<{ data: any[] }>(`/approval-requests${status ? `?status=${status}` : ''}`),
  });
}

export function useApprovalStats() {
  return useQuery({
    queryKey: ['approval-stats'],
    queryFn: () => apiFetch<{ pending: number; approved: number; rejected: number }>('/approval-requests/stats'),
  });
}

export function useCreateApprovalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestType: string; referenceId: string; referenceLabel?: string; data?: any }) =>
      apiFetch('/approval-requests', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-requests'] });
      qc.invalidateQueries({ queryKey: ['approval-stats'] });
    },
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/approval-requests/${id}/approve`, { method: 'PUT' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-requests'] });
      qc.invalidateQueries({ queryKey: ['approval-stats'] });
    },
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; rejectionReason?: string }) =>
      apiFetch(`/approval-requests/${data.id}/reject`, { method: 'PUT', body: JSON.stringify({ rejectionReason: data.rejectionReason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-requests'] });
      qc.invalidateQueries({ queryKey: ['approval-stats'] });
    },
  });
}

export function usePortfolioTransfers() {
  return useQuery({
    queryKey: ['portfolio-transfers'],
    queryFn: () => apiFetch<{ data: any[] }>('/portfolio-transfers'),
  });
}

export function useCreatePortfolioTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromOfficerId?: string; toOfficerId?: string; fromBranchId?: string; toBranchId?: string; loanIds?: string[]; reason?: string }) =>
      apiFetch('/portfolio-transfers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transfers'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useFraReport(month?: string) {
  return useQuery({
    queryKey: ['fra-report', month],
    queryFn: () => apiFetch<any>(`/reports/fra-monthly${month ? `?month=${month}` : ''}`),
  });
}

export function useUpdateTenantFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; updates: Record<string, boolean> }) =>
      apiFetch(`/tenants/${data.id}`, { method: 'PUT', body: JSON.stringify(data.updates) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/tenants'] }),
  });
}

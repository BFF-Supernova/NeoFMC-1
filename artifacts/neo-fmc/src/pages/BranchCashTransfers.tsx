import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Plus, X, Check, XCircle, PackageCheck } from 'lucide-react';

export default function BranchCashTransfers() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ fromBranchId: '', toBranchId: '', amount: 0, reason: '', notes: '' });

  const { data } = useQuery({ queryKey: ['/api/branch-cash-transfers', page, statusFilter], queryFn: () => api(`/api/branch-cash-transfers?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`) });
  const { data: branches } = useQuery({ queryKey: ['/api/branches'], queryFn: () => api('/api/branches') });

  const createMut = useMutation({ mutationFn: (d: any) => api('/api/branch-cash-transfers', { method: 'POST', body: JSON.stringify(d), headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/branch-cash-transfers'] }); setShowNew(false); toast({ title: t('تم إنشاء الطلب', 'Transfer request created') }); } });
  const approveMut = useMutation({ mutationFn: (id: string) => api(`/api/branch-cash-transfers/${id}/approve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/branch-cash-transfers'] }); toast({ title: t('تمت الموافقة', 'Approved') }); }, onError: (err: any) => toast({ title: t('خطأ', 'Error'), description: err?.message, variant: 'destructive' }) });
  const receiveMut = useMutation({ mutationFn: (id: string) => api(`/api/branch-cash-transfers/${id}/receive`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/branch-cash-transfers'] }); toast({ title: t('تم الاستلام', 'Received') }); } });
  const rejectMut = useMutation({ mutationFn: (id: string) => api(`/api/branch-cash-transfers/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason: 'Rejected' }), headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/branch-cash-transfers'] }); toast({ title: t('تم الرفض', 'Rejected') }); } });

  const formatCurrency = (v: any) => typeof v === 'number' ? `${v.toLocaleString()} ${t('ج.م', 'EGP')}` : v;

  const statusColors: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    Completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-7 w-7 text-primary" />
            {t('تحويلات النقدية بين الفروع', 'Branch Cash Transfers')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('إدارة تحويلات النقدية بين الفروع', 'Manage inter-branch cash movements')}</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ fromBranchId: '', toBranchId: '', amount: 0, reason: '', notes: '' }); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90"><Plus className="h-4 w-4" />{t('طلب تحويل', 'New Transfer')}</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {['', 'Pending', 'Approved', 'Completed', 'Rejected'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {s || t('الكل', 'All')}
          </button>
        ))}
      </div>

      <div className="premium-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground">
            <th className="text-start p-3">{t('المرجع', 'Reference')}</th>
            <th className="text-start p-3">{t('من', 'From')}</th>
            <th className="text-start p-3">{t('إلى', 'To')}</th>
            <th className="text-start p-3">{t('المبلغ', 'Amount')}</th>
            <th className="text-start p-3">{t('الحالة', 'Status')}</th>
            <th className="text-start p-3">{t('الطالب', 'Requested By')}</th>
            <th className="text-start p-3">{t('التاريخ', 'Date')}</th>
            <th className="text-start p-3">{t('إجراءات', 'Actions')}</th>
          </tr></thead>
          <tbody>
            {data?.data?.map((tr: any) => (
              <tr key={tr.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{tr.referenceNumber}</td>
                <td className="p-3">{tr.fromBranchName}</td>
                <td className="p-3">{tr.toBranchName}</td>
                <td className="p-3 font-semibold">{formatCurrency(tr.amount)}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[tr.status] || ''}`}>{tr.status}</span></td>
                <td className="p-3 text-xs">{tr.requestedByName}</td>
                <td className="p-3 text-xs">{new Date(tr.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {tr.status === 'Pending' && ['TenantAdmin', 'BranchManager', 'SuperAdmin'].includes(user?.role || '') && tr.requestedById !== user?.id && (
                      <>
                        <button onClick={() => approveMut.mutate(tr.id)} className="text-green-600 hover:text-green-800 p-1" title={t('موافقة', 'Approve')}><Check className="h-4 w-4" /></button>
                        <button onClick={() => rejectMut.mutate(tr.id)} className="text-red-600 hover:text-red-800 p-1" title={t('رفض', 'Reject')}><XCircle className="h-4 w-4" /></button>
                      </>
                    )}
                    {tr.status === 'Approved' && (
                      <button onClick={() => receiveMut.mutate(tr.id)} className="text-blue-600 hover:text-blue-800 p-1" title={t('تأكيد الاستلام', 'Confirm Receipt')}><PackageCheck className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t('لا توجد تحويلات', 'No transfers found')}</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('طلب تحويل نقدي', 'New Cash Transfer')}</h3>
              <button onClick={() => setShowNew(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground">{t('من فرع*', 'From Branch*')}</label>
                <select className="premium-input w-full mt-1" value={form.fromBranchId} onChange={e => setForm(f => ({ ...f, fromBranchId: e.target.value }))}>
                  <option value="">{t('اختر', 'Select')}</option>
                  {(Array.isArray(branches) ? branches : []).map((b: any) => <option key={b.id} value={b.id}>{isRtl ? (b.branchNameAr || b.branchNameEn) : (b.branchNameEn || b.branchNameAr)}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('إلى فرع*', 'To Branch*')}</label>
                <select className="premium-input w-full mt-1" value={form.toBranchId} onChange={e => setForm(f => ({ ...f, toBranchId: e.target.value }))}>
                  <option value="">{t('اختر', 'Select')}</option>
                  {(Array.isArray(branches) ? branches : []).filter((b: any) => b.id !== form.fromBranchId).map((b: any) => <option key={b.id} value={b.id}>{isRtl ? (b.branchNameAr || b.branchNameEn) : (b.branchNameEn || b.branchNameAr)}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('المبلغ*', 'Amount*')}</label><input type="number" className="premium-input w-full mt-1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('السبب', 'Reason')}</label><input className="premium-input w-full mt-1" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('ملاحظات', 'Notes')}</label><textarea className="premium-input w-full mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.fromBranchId || !form.toBranchId || form.amount <= 0} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium disabled:opacity-50 mt-2">{createMut.isPending ? '...' : t('إنشاء الطلب', 'Create Request')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

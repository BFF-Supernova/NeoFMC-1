import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, X, Edit, Trash2, TrendingUp } from 'lucide-react';

const COLLATERAL_TYPES = ['Property', 'Vehicle', 'Equipment', 'Inventory', 'Gold', 'Livestock', 'Machinery', 'Other'];

export default function Collaterals() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showValuation, setShowValuation] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: '', loanId: '', collateralType: 'Property', description: '', descriptionAr: '', estimatedValue: 0, registrationNumber: '', location: '', insurancePolicyNumber: '', insuranceExpiryDate: '', notes: '' });

  const { data } = useQuery({ queryKey: ['/api/collaterals', page], queryFn: () => apiFetch(`/collaterals?page=${page}&limit=20`) });
  const { data: clients, isLoading: clientsLoading } = useQuery({ queryKey: ['/api/clients-for-collateral'], queryFn: () => apiFetch<any>('/clients?limit=500'), staleTime: 30000 });
  const { data: loans } = useQuery({ queryKey: ['/api/loans'], queryFn: () => apiFetch<any>('/loans?limit=100') });

  const createMutation = useMutation({ mutationFn: (d: any) => apiFetch('/collaterals', { method: 'POST', body: JSON.stringify(d), headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/collaterals'] }); setShowForm(false); toast({ title: t('تم إضافة الضمان', 'Collateral added') }); } });
  const updateMutation = useMutation({ mutationFn: (d: any) => apiFetch(`/collaterals/${editId}`, { method: 'PUT', body: JSON.stringify(d), headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/collaterals'] }); setShowForm(false); setEditId(null); toast({ title: t('تم تحديث الضمان', 'Collateral updated') }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiFetch(`/collaterals/${id}`, { method: 'DELETE' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/collaterals'] }); toast({ title: t('تم حذف الضمان', 'Collateral deleted') }); } });

  const formatCurrency = (v: any) => typeof v === 'number' ? `${v.toLocaleString()} ${t('ج.م', 'EGP')}` : v;

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ clientId: item.clientId, loanId: item.loanId || '', collateralType: item.collateralType, description: item.description, descriptionAr: item.descriptionAr || '', estimatedValue: item.currentValue, registrationNumber: item.registrationNumber || '', location: item.location || '', insurancePolicyNumber: item.insurancePolicyNumber || '', insuranceExpiryDate: item.insuranceExpiryDate || '', notes: item.notes || '' });
    setShowForm(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ clientId: '', loanId: '', collateralType: 'Property', description: '', descriptionAr: '', estimatedValue: 0, registrationNumber: '', location: '', insurancePolicyNumber: '', insuranceExpiryDate: '', notes: '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            {t('الضمانات العينية', 'Collateral Management')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('تتبع وإدارة الأصول المرهونة كضمانات', 'Track and manage pledged assets')}</p>
        </div>
        <button onClick={openNew} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90"><Plus className="h-4 w-4" />{t('إضافة ضمان', 'Add Collateral')}</button>
      </div>

      <div className="premium-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground">
            <th className="text-start p-3">{t('النوع', 'Type')}</th>
            <th className="text-start p-3">{t('الوصف', 'Description')}</th>
            <th className="text-start p-3">{t('العميل', 'Client')}</th>
            <th className="text-start p-3">{t('القيمة المقدرة', 'Est. Value')}</th>
            <th className="text-start p-3">{t('القيمة الحالية', 'Current Value')}</th>
            <th className="text-start p-3">{t('الحالة', 'Status')}</th>
            <th className="text-start p-3">{t('آخر تقييم', 'Last Valuation')}</th>
            <th className="text-start p-3">{t('إجراءات', 'Actions')}</th>
          </tr></thead>
          <tbody>
            {data?.data?.map((item: any) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{item.collateralType}</span></td>
                <td className="p-3 max-w-[200px] truncate">{isRtl ? (item.descriptionAr || item.description) : item.description}</td>
                <td className="p-3">{isRtl ? item.clientNameAr : (item.clientNameEn || item.clientNameAr)}</td>
                <td className="p-3">{formatCurrency(item.estimatedValue)}</td>
                <td className="p-3 font-semibold">{formatCurrency(item.currentValue)}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${item.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : item.status === 'Released' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{item.status}</span></td>
                <td className="p-3 text-xs">{item.lastValuationDate || '-'}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 p-1"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setShowValuation(item.id)} className="text-purple-600 hover:text-purple-800 p-1" title={t('تحديث التقييم', 'Update Valuation')}><TrendingUp className="h-4 w-4" /></button>
                    {['TenantAdmin', 'SuperAdmin'].includes(user?.role || '') && (
                      <button onClick={() => { if (confirm(t('هل أنت متأكد؟', 'Are you sure?'))) deleteMutation.mutate(item.id); }} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t('لا توجد ضمانات', 'No collaterals found')}</td></tr>}
          </tbody>
        </table>
        {data?.total > 20 && (
          <div className="flex justify-center gap-2 p-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-muted text-sm disabled:opacity-50">{t('السابق', 'Prev')}</button>
            <span className="px-3 py-1 text-sm">{page} / {Math.ceil(data.total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total} className="px-3 py-1 rounded bg-muted text-sm disabled:opacity-50">{t('التالي', 'Next')}</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editId ? t('تعديل الضمان', 'Edit Collateral') : t('إضافة ضمان جديد', 'Add New Collateral')}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground">{t('العميل*', 'Client*')}</label>
                <select className="premium-input w-full mt-1" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} disabled={!!editId}>
                  <option value="">{clientsLoading ? t('جاري التحميل...', 'Loading...') : t('اختر عميل', 'Select Client')}</option>
                  {(clients?.data || []).map((c: any) => <option key={c.id} value={c.id}>{isRtl ? c.fullNameAr : (c.fullNameEn || c.fullNameAr)} {c.nationalId ? `(${c.nationalId})` : ''}</option>)}
                </select>
                {!clientsLoading && (!clients?.data || clients.data.length === 0) && <p className="text-xs text-amber-500 mt-1">{t('لا يوجد عملاء. أضف عملاء أولاً من صفحة العملاء.', 'No clients found. Add clients first from the Clients page.')}</p>}
              </div>
              <div><label className="text-sm text-muted-foreground">{t('القرض (اختياري)', 'Loan (optional)')}</label>
                <select className="premium-input w-full mt-1" value={form.loanId} onChange={e => setForm(f => ({ ...f, loanId: e.target.value }))}>
                  <option value="">{t('بدون ربط', 'No link')}</option>
                  {loans?.data?.filter((l: any) => l.status === 'Active').map((l: any) => <option key={l.id} value={l.id}>{l.id.slice(0, 8)} - {formatCurrency(Number(l.outstandingBalance))}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('النوع*', 'Type*')}</label>
                <select className="premium-input w-full mt-1" value={form.collateralType} onChange={e => setForm(f => ({ ...f, collateralType: e.target.value }))}>
                  {COLLATERAL_TYPES.map(t2 => <option key={t2} value={t2}>{t2}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('الوصف*', 'Description*')}</label><input className="premium-input w-full mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('الوصف بالعربي', 'Description (Arabic)')}</label><input className="premium-input w-full mt-1" value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-muted-foreground">{editId ? t('القيمة الحالية*', 'Current Value*') : t('القيمة المقدرة*', 'Estimated Value*')}</label><input type="number" className="premium-input w-full mt-1" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: Number(e.target.value) }))} /></div>
                <div><label className="text-sm text-muted-foreground">{t('رقم التسجيل', 'Registration #')}</label><input className="premium-input w-full mt-1" value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('الموقع', 'Location')}</label><input className="premium-input w-full mt-1" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-muted-foreground">{t('رقم بوليصة التأمين', 'Insurance Policy #')}</label><input className="premium-input w-full mt-1" value={form.insurancePolicyNumber} onChange={e => setForm(f => ({ ...f, insurancePolicyNumber: e.target.value }))} /></div>
                <div><label className="text-sm text-muted-foreground">{t('تاريخ انتهاء التأمين', 'Insurance Expiry')}</label><input type="date" className="premium-input w-full mt-1" value={form.insuranceExpiryDate} onChange={e => setForm(f => ({ ...f, insuranceExpiryDate: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('ملاحظات', 'Notes')}</label><textarea className="premium-input w-full mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <button onClick={() => editId ? updateMutation.mutate({ ...form, currentValue: form.estimatedValue }) : createMutation.mutate(form)} disabled={createMutation.isPending || updateMutation.isPending || !form.clientId || !form.description || !form.estimatedValue} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium disabled:opacity-50 mt-2">{(createMutation.isPending || updateMutation.isPending) ? '...' : editId ? t('تحديث', 'Update') : t('إضافة', 'Add')}</button>
            </div>
          </div>
        </div>
      )}

      {showValuation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('تحديث التقييم', 'Update Valuation')}</h3>
              <button onClick={() => setShowValuation(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground">{t('القيمة الجديدة', 'New Value')}</label><input type="number" className="premium-input w-full mt-1" id="newValuation" /></div>
              <button onClick={() => { const val = (document.getElementById('newValuation') as HTMLInputElement)?.value; if (val) updateMutation.mutate({ currentValue: Number(val) }); setEditId(showValuation); setShowValuation(null); }} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium">{t('تحديث', 'Update')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

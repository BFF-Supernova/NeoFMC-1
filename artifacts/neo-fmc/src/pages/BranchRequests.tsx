import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Shield, Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BranchRequests() {
  const { t, isRtl } = useLanguage();
  const [requests, setRequests] = useState<any>({ data: [], total: 0 });
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ branchId: '', requestType: '', description: '', referenceLabel: '' });
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => { loadData(); api.get<any[]>('/branches').then(setBranches).catch(() => {}); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, st] = await Promise.all([
        api.get<any>(`/branch-requests${filter ? `?status=${filter}` : ''}`),
        api.get<any>('/branch-requests/stats'),
      ]);
      setRequests(reqs);
      setStats(st);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleCreate = async () => {
    try {
      await api.post('/branch-requests', form);
      setShowForm(false);
      setForm({ branchId: '', requestType: '', description: '', referenceLabel: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    try { await api.put(`/branch-requests/${id}/review`, { action }); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('طلبات الفروع', 'Branch Requests')}</h2>
          <p className="text-muted-foreground mt-1">{t('بوابة الأمان للعمليات الحساسة', 'Safety gate for sensitive operations')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('طلب جديد', 'New Request')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="premium-card p-4 text-center cursor-pointer hover:bg-yellow-500/5" onClick={() => setFilter('Pending')}>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">{t('معلق', 'Pending')}</p>
        </div>
        <div className="premium-card p-4 text-center cursor-pointer hover:bg-green-500/5" onClick={() => setFilter('Approved')}>
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">{t('موافق', 'Approved')}</p>
        </div>
        <div className="premium-card p-4 text-center cursor-pointer hover:bg-red-500/5" onClick={() => setFilter('Rejected')}>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">{t('مرفوض', 'Rejected')}</p>
        </div>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('طلب فرع جديد', 'New Branch Request')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="">{t('اختر الفرع', 'Select Branch')}</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : b.branchNameEn || b.branchNameAr}</option>)}
            </select>
            <select value={form.requestType} onChange={e => setForm({ ...form, requestType: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="">{t('نوع الطلب', 'Request Type')}</option>
              <option value="EarlySettlement">{t('تسوية مبكرة', 'Early Settlement')}</option>
              <option value="Rescheduling">{t('إعادة جدولة', 'Rescheduling')}</option>
              <option value="PaymentReversal">{t('عكس دفعة', 'Payment Reversal')}</option>
              <option value="WriteOff">{t('شطب', 'Write Off')}</option>
              <option value="LoanCancellation">{t('إلغاء قرض', 'Loan Cancellation')}</option>
            </select>
            <input placeholder={t('المرجع', 'Reference')} value={form.referenceLabel} onChange={e => setForm({ ...form, referenceLabel: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('الوصف', 'Description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('إرسال', 'Submit')}</button>
            <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الوصف', 'Description')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('مقدم الطلب', 'Requested By')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : requests.data?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><Shield className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد طلبات', 'No requests')}</td></tr>
              ) : (
                requests.data?.map((req: any) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{req.requestType}</td>
                    <td className="px-6 py-4 text-muted-foreground">{req.description || req.referenceLabel || '-'}</td>
                    <td className="px-6 py-4">{req.requestedByName}</td>
                    <td className="px-6 py-4">{formatDate(req.createdAt)}</td>
                    <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", getStatusColor(req.status))}>{req.status}</span></td>
                    <td className="px-6 py-4">
                      {req.status === 'Pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(req.id, 'approve')} className="text-green-400 hover:text-green-300"><CheckCircle size={18} /></button>
                          <button onClick={() => handleReview(req.id, 'reject')} className="text-red-400 hover:text-red-300"><XCircle size={18} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

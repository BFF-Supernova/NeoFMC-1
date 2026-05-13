import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { ArrowLeftRight, Plus, Loader2, RefreshCw } from 'lucide-react';

export default function WireTransfers() {
  const { t, isRtl } = useLanguage();
  const [transfers, setTransfers] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ transferType: 'Incoming', senderBank: '', senderName: '', recipientBank: '', recipientName: '', amount: '', transferDate: '', referenceNumber: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const data = await api.get<any>('/wire-transfers'); setTransfers(data); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await api.post('/wire-transfers', { ...form, amount: Number(form.amount) });
      setShowForm(false);
      setForm({ transferType: 'Incoming', senderBank: '', senderName: '', recipientBank: '', recipientName: '', amount: '', transferDate: '', referenceNumber: '', notes: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleReconcile = async (id: string) => {
    try { await api.put(`/wire-transfers/${id}/reconcile`); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('التحويلات البنكية', 'Wire Transfers')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة وتسوية التحويلات البنكية', 'Manage and reconcile wire transfers')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('تحويل جديد', 'New Transfer')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('تحويل بنكي جديد', 'New Wire Transfer')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.transferType} onChange={e => setForm({ ...form, transferType: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="Incoming">{t('وارد', 'Incoming')}</option>
              <option value="Outgoing">{t('صادر', 'Outgoing')}</option>
            </select>
            <input placeholder={t('بنك المرسل', 'Sender Bank')} value={form.senderBank} onChange={e => setForm({ ...form, senderBank: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('اسم المرسل', 'Sender Name')} value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('بنك المستلم', 'Recipient Bank')} value={form.recipientBank} onChange={e => setForm({ ...form, recipientBank: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('اسم المستلم', 'Recipient Name')} value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input type="number" placeholder={t('المبلغ', 'Amount')} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input type="date" value={form.transferDate} onChange={e => setForm({ ...form, transferDate: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('رقم المرجع', 'Reference #')} value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('ملاحظات', 'Notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('حفظ', 'Save')}</button>
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
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المرسل', 'Sender')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المستلم', 'Recipient')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التسوية', 'Reconciliation')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : transfers.data?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><ArrowLeftRight className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد تحويلات', 'No transfers')}</td></tr>
              ) : (
                transfers.data?.map((wt: any) => (
                  <tr key={wt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", wt.transferType === 'Incoming' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400')}>{wt.transferType}</span></td>
                    <td className="px-6 py-4">{wt.senderName || wt.senderBank || '-'}</td>
                    <td className="px-6 py-4">{wt.recipientName || wt.recipientBank || '-'}</td>
                    <td className="px-6 py-4 font-bold text-primary">{formatCurrency(wt.amount)}</td>
                    <td className="px-6 py-4">{formatDate(wt.transferDate)}</td>
                    <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", wt.reconciliationStatus === 'Reconciled' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400')}>{wt.reconciliationStatus}</span></td>
                    <td className="px-6 py-4">
                      {wt.reconciliationStatus !== 'Reconciled' && (
                        <button onClick={() => handleReconcile(wt.id)} className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs"><RefreshCw size={14} /> {t('تسوية', 'Reconcile')}</button>
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

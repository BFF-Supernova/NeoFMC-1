import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { RefreshCw, Plus, Loader2, Play, Pause } from 'lucide-react';

export default function RecurringJournals() {
  const { t, isRtl } = useLanguage();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', description: '', frequency: 'Monthly', startDate: '', endDate: '', isAutoReverse: false });
  const [execResult, setExecResult] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const r = await api.get<any>('/recurring-journals'); setTemplates(r.data || []); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const createTemplate = async () => {
    try {
      await api.post('/recurring-journals', { ...form, lines: [{ accountId: '', debit: 0, credit: 0 }] });
      setShowForm(false); loadData();
    } catch (err) { handleApiError(err); }
  };

  const executeAll = async () => {
    try { const r = await api.post<any>('/recurring-journals/execute', {}); setExecResult(r); loadData(); } catch (err) { handleApiError(err); }
  };

  const toggleActive = async (id: string) => {
    try { await api.put(`/recurring-journals/${id}/toggle`, {}); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div><h2 className="text-2xl font-bold">{t('القيود المتكررة', 'Recurring Journals')}</h2><p className="text-muted-foreground mt-1">{t('إدارة القيود الآلية المتكررة', 'Manage automated recurring journal entries')}</p></div>
        <div className="flex gap-2">
          <button onClick={executeAll} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"><Play size={18} />{t('تنفيذ المستحقة', 'Execute Due')}</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"><Plus size={18} />{t('قالب جديد', 'New Template')}</button>
        </div>
      </div>

      {execResult && <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">{t(`تم تنفيذ ${execResult.executed} قيود`, `Executed ${execResult.executed} journal entries`)}</div>}

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('قالب قيد متكرر جديد', 'New Recurring Journal Template')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('الاسم', 'Name')} className="input-field" />
            <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} placeholder={t('الاسم (عربي)', 'Name (AR)')} className="input-field" />
            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="input-field">
              <option value="Weekly">{t('أسبوعي', 'Weekly')}</option><option value="Monthly">{t('شهري', 'Monthly')}</option>
              <option value="Quarterly">{t('ربع سنوي', 'Quarterly')}</option><option value="Annually">{t('سنوي', 'Annually')}</option>
            </select>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field" />
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-field" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isAutoReverse} onChange={e => setForm({ ...form, isAutoReverse: e.target.checked })} />{t('عكس تلقائي', 'Auto-Reverse')}</label>
          </div>
          <div className="flex gap-2"><button onClick={createTemplate} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('الاسم', 'Name')}</th><th className="p-3">{t('التكرار', 'Frequency')}</th><th className="p-3 text-end">{t('مدين', 'Debit')}</th><th className="p-3 text-end">{t('دائن', 'Credit')}</th><th className="p-3">{t('التالي', 'Next Run')}</th><th className="p-3">{t('عكس', 'Reverse')}</th><th className="p-3">{t('الحالة', 'Status')}</th><th className="p-3">{t('إجراء', 'Action')}</th></tr></thead>
            <tbody>{templates.map((t2: any) => (
              <tr key={t2.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{isRtl ? (t2.nameAr || t2.name) : t2.name}</td>
                <td className="p-3">{t2.frequency}</td>
                <td className="p-3 text-end">{formatCurrency(t2.totalDebit)}</td>
                <td className="p-3 text-end">{formatCurrency(t2.totalCredit)}</td>
                <td className="p-3">{t2.nextRunDate}</td>
                <td className="p-3">{t2.isAutoReverse ? <RefreshCw size={14} className="text-blue-500" /> : '-'}</td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", t2.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700')}>{t2.isActive ? t('نشط', 'Active') : t('معطل', 'Inactive')}</span></td>
                <td className="p-3"><button onClick={() => toggleActive(t2.id)} className="text-blue-500 hover:underline text-xs">{t2.isActive ? <Pause size={14} /> : <Play size={14} />}</button></td>
              </tr>
            ))}</tbody>
          </table>
          {templates.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا توجد قوالب', 'No templates found')}</div>}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { PieChart, Plus, Loader2, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

export default function Budgets() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'budgets' | 'comparison'>('budgets');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', fiscalYear: String(new Date().getFullYear()), period: 'Annual', branchId: '', notes: '' });
  const [branches, setBranches] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');

  useEffect(() => { loadData(); api.get<any[]>('/branches').then(setBranches).catch(() => {}); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const b = await api.get<any>('/budgets'); setBudgets(b.data || []); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const createBudget = async () => {
    try { await api.post('/budgets', { ...form, fiscalYear: Number(form.fiscalYear) }); setShowForm(false); loadData(); } catch (err) { handleApiError(err); }
  };

  const approveBudget = async (id: string) => {
    try { await api.put(`/budgets/${id}/approve`, {}); loadData(); } catch (err) { handleApiError(err); }
  };

  const loadComparison = async (budgetId: string) => {
    try {
      const data = await api.get<any>(`/budgets/${budgetId}/vs-actual`);
      setComparison(data); setSelectedBudgetId(budgetId); setTab('comparison');
    } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div><h2 className="text-2xl font-bold">{t('الموازنات', 'Budgets')}</h2><p className="text-muted-foreground mt-1">{t('إعداد الموازنات وتحليل الانحرافات', 'Budget preparation and variance analysis')}</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"><Plus size={18} />{t('موازنة جديدة', 'New Budget')}</button>
      </div>

      <div className="flex border-b border-border">
        <button className={cn("px-6 py-3 font-medium border-b-2 text-sm", tab === 'budgets' ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab('budgets')}>{t('الموازنات', 'Budgets')}</button>
        <button className={cn("px-6 py-3 font-medium border-b-2 text-sm", tab === 'comparison' ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab('comparison')}>{t('الموازنة مقابل الفعلي', 'Budget vs Actual')}</button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('موازنة جديدة', 'New Budget')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('اسم الموازنة (إنجليزي)', 'Budget Name (EN)')} className="input-field" />
            <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} placeholder={t('الاسم (عربي)', 'Name (AR)')} className="input-field" />
            <input type="number" value={form.fiscalYear} onChange={e => setForm({ ...form, fiscalYear: e.target.value })} placeholder={t('السنة المالية', 'Fiscal Year')} className="input-field" />
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="input-field"><option value="">{t('كل الفروع', 'All Branches')}</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</option>)}</select>
          </div>
          <div className="flex gap-2"><button onClick={createBudget} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : tab === 'budgets' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('الاسم', 'Name')}</th><th className="p-3">{t('السنة', 'Year')}</th><th className="p-3 text-end">{t('الإجمالي', 'Total')}</th><th className="p-3">{t('الحالة', 'Status')}</th><th className="p-3">{t('إجراء', 'Action')}</th></tr></thead>
            <tbody>{budgets.map((b: any) => (
              <tr key={b.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{isRtl ? (b.nameAr || b.name) : b.name}</td><td className="p-3">{b.fiscalYear}</td>
                <td className="p-3 text-end font-bold">{formatCurrency(b.totalAmount)}</td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", b.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>{b.status}</span></td>
                <td className="p-3 flex gap-2">
                  {b.status === 'Draft' && <button onClick={() => approveBudget(b.id)} className="text-green-500 hover:underline text-xs">{t('اعتماد', 'Approve')}</button>}
                  <button onClick={() => loadComparison(b.id)} className="text-blue-500 hover:underline text-xs">{t('مقارنة', 'Compare')}</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {budgets.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا توجد موازنات', 'No budgets found')}</div>}
        </div>
      ) : comparison ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('الموازنة', 'Budget')}</div><div className="text-xl font-bold">{formatCurrency(comparison.totalBudget)}</div></div>
            <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('الفعلي', 'Actual')}</div><div className="text-xl font-bold">{formatCurrency(comparison.totalActual)}</div></div>
            <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('الانحراف', 'Variance')}</div><div className={cn("text-xl font-bold", comparison.totalVariance >= 0 ? 'text-green-600' : 'text-red-600')}>{comparison.totalVariance >= 0 ? '+' : ''}{formatCurrency(comparison.totalVariance)}</div></div>
          </div>
          <div className="premium-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('كود', 'Code')}</th><th className="p-3 text-start">{t('الحساب', 'Account')}</th><th className="p-3 text-end">{t('الموازنة', 'Budget')}</th><th className="p-3 text-end">{t('الفعلي', 'Actual')}</th><th className="p-3 text-end">{t('الانحراف', 'Variance')}</th><th className="p-3 text-end">%</th><th className="p-3">{t('الحالة', 'Status')}</th></tr></thead>
              <tbody>{comparison.lines?.map((line: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono">{line.accountCode}</td><td className="p-3">{isRtl ? (line.accountNameAr || line.accountName) : line.accountName}</td>
                  <td className="p-3 text-end">{formatCurrency(line.budgetAmount)}</td><td className="p-3 text-end">{formatCurrency(line.actualAmount)}</td>
                  <td className={cn("p-3 text-end font-bold", line.variance >= 0 ? 'text-green-600' : 'text-red-600')}>{line.variance >= 0 ? '+' : ''}{formatCurrency(line.variance)}</td>
                  <td className="p-3 text-end">{line.variancePct}%</td>
                  <td className="p-3">{line.status === 'UnderBudget' ? <TrendingDown className="text-green-500 inline" size={16} /> : <TrendingUp className="text-red-500 inline" size={16} />}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : <div className="p-8 text-center text-muted-foreground">{t('اختر موازنة للمقارنة', 'Select a budget to compare')}</div>}
    </div>
  );
}

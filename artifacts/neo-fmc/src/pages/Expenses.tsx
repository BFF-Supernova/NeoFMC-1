import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Receipt, TrendingUp, Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Expenses() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'expenses' | 'revenues'>('expenses');
  const [expenses, setExpenses] = useState<any>({ data: [], total: 0 });
  const [revenues, setRevenues] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'revenue'>('expense');
  const [form, setForm] = useState({ branchId: '', category: '', description: '', amount: '', transactionDate: '', referenceNumber: '' });
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    api.get<any[]>('/branches').then(setBranches).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exp, rev] = await Promise.all([
        api.get<any>('/expenses'),
        api.get<any>('/expenses/revenues'),
      ]);
      setExpenses(exp);
      setRevenues(rev);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const endpoint = formType === 'expense' ? '/expenses' : '/expenses/revenues';
      await api.post(endpoint, { ...form, amount: Number(form.amount) });
      setShowForm(false);
      setForm({ branchId: '', category: '', description: '', amount: '', transactionDate: '', referenceNumber: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleVerify = async (id: string, type: 'expense' | 'revenue', action: 'approve' | 'reject') => {
    try {
      const endpoint = type === 'expense' ? `/expenses/${id}/verify` : `/expenses/revenues/${id}/verify`;
      await api.put(endpoint, { action });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const data = tab === 'expenses' ? expenses : revenues;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('المصروفات والإيرادات', 'Expenses & Revenues')}</h2>
          <p className="text-muted-foreground mt-1">{t('تتبع المصروفات والإيرادات التشغيلية', 'Track operational expenses and revenues')}</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormType(tab === 'expenses' ? 'expense' : 'revenue'); }} className="btn-primary flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('إضافة', 'Add')}
        </button>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'expenses' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('expenses')}>
          <Receipt className="inline mr-2" size={16} />{t('المصروفات', 'Expenses')}
        </button>
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'revenues' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('revenues')}>
          <TrendingUp className="inline mr-2" size={16} />{t('الإيرادات', 'Revenues')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{formType === 'expense' ? t('مصروف جديد', 'New Expense') : t('إيراد جديد', 'New Revenue')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="">{t('اختر الفرع', 'Select Branch')}</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : b.branchNameEn || b.branchNameAr}</option>)}
            </select>
            <input placeholder={t('الفئة', 'Category')} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('الوصف', 'Description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input type="number" placeholder={t('المبلغ', 'Amount')} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input type="date" value={form.transactionDate} onChange={e => setForm({ ...form, transactionDate: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('رقم المرجع', 'Reference #')} value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('حفظ', 'Save')}</button>
            <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الفئة', 'Category')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الوصف', 'Description')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : data.data?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('لا توجد بيانات', 'No data found')}</td></tr>
              ) : (
                data.data?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{formatDate(item.transactionDate)}</td>
                    <td className="px-6 py-4 font-medium">{item.category}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.description}</td>
                    <td className="px-6 py-4 font-bold text-primary">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", getStatusColor(item.status))}>{item.status}</span></td>
                    <td className="px-6 py-4">
                      {item.status === 'Pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleVerify(item.id, tab === 'expenses' ? 'expense' : 'revenue', 'approve')} className="text-green-400 hover:text-green-300" title={t('موافقة', 'Approve')}><CheckCircle size={18} /></button>
                          <button onClick={() => handleVerify(item.id, tab === 'expenses' ? 'expense' : 'revenue', 'reject')} className="text-red-400 hover:text-red-300" title={t('رفض', 'Reject')}><XCircle size={18} /></button>
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

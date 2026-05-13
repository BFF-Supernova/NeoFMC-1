import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Receipt, Plus, Loader2, Database } from 'lucide-react';

export default function TaxConfig() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'codes' | 'brackets'>('codes');
  const [codes, setCodes] = useState<any[]>([]);
  const [brackets, setBrackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', nameAr: '', type: 'VAT', rate: '', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([api.get<any>('/tax-config/codes'), api.get<any>('/tax-config/brackets')]);
      setCodes(c.data || []); setBrackets(b.data || []);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const createCode = async () => {
    try { await api.post('/tax-config/codes', { ...form, rate: Number(form.rate) }); setShowForm(false); loadData(); } catch (err) { handleApiError(err); }
  };

  const seedBrackets = async () => {
    try { await api.post('/tax-config/brackets/seed', { fiscalYear: new Date().getFullYear() }); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div><h2 className="text-2xl font-bold">{t('إعدادات الضرائب', 'Tax Configuration')}</h2><p className="text-muted-foreground mt-1">{t('إدارة أكواد الضرائب وشرائح ضريبة الدخل', 'Manage tax codes and income tax brackets')}</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"><Plus size={18} />{t('كود ضريبي', 'Tax Code')}</button>
      </div>

      <div className="flex border-b border-border">
        <button className={cn("px-6 py-3 font-medium border-b-2 text-sm", tab === 'codes' ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab('codes')}><Receipt className="inline mr-2" size={16} />{t('أكواد الضرائب', 'Tax Codes')}</button>
        <button className={cn("px-6 py-3 font-medium border-b-2 text-sm", tab === 'brackets' ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab('brackets')}><Database className="inline mr-2" size={16} />{t('شرائح ضريبة الدخل', 'Income Tax Brackets')}</button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('كود ضريبي جديد', 'New Tax Code')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder={t('الكود', 'Code')} className="input-field" />
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('الاسم', 'Name')} className="input-field" />
            <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} placeholder={t('الاسم (عربي)', 'Name (AR)')} className="input-field" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field"><option value="VAT">{t('ضريبة القيمة المضافة', 'VAT')}</option><option value="Withholding">{t('ضريبة خصم', 'Withholding')}</option><option value="StampDuty">{t('رسم دمغة', 'Stamp Duty')}</option><option value="IncomeTax">{t('ضريبة دخل', 'Income Tax')}</option></select>
            <input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder={t('النسبة %', 'Rate %')} className="input-field" />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('الوصف', 'Description')} className="input-field" />
          </div>
          <div className="flex gap-2"><button onClick={createCode} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : tab === 'codes' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('كود', 'Code')}</th><th className="p-3 text-start">{t('الاسم', 'Name')}</th><th className="p-3">{t('النوع', 'Type')}</th><th className="p-3 text-end">{t('النسبة', 'Rate')}</th><th className="p-3">{t('الحالة', 'Status')}</th></tr></thead>
            <tbody>{codes.map((c: any) => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono">{c.code}</td><td className="p-3">{c.name}</td><td className="p-3">{c.type}</td>
                <td className="p-3 text-end font-bold">{c.rate}%</td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", c.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700')}>{c.isActive ? t('نشط', 'Active') : t('معطل', 'Inactive')}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {codes.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا توجد أكواد ضريبية', 'No tax codes')}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={seedBrackets} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Database size={16} />{t('تحميل شرائح مصر', 'Seed Egyptian Brackets')}</button></div>
          <div className="premium-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="p-3 text-end">{t('من', 'From')}</th><th className="p-3 text-end">{t('إلى', 'To')}</th><th className="p-3 text-end">{t('النسبة', 'Rate')}</th></tr></thead>
              <tbody>{brackets.map((b: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-3 text-end font-mono">{Number(b.fromAmount).toLocaleString()}</td>
                  <td className="p-3 text-end font-mono">{Number(b.toAmount) > 999999999 ? '∞' : Number(b.toAmount).toLocaleString()}</td>
                  <td className="p-3 text-end font-bold">{b.rate}%</td>
                </tr>
              ))}</tbody>
            </table>
            {brackets.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا توجد شرائح', 'No brackets configured')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

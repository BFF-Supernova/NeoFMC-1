import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Package, Plus, Loader2, TrendingDown, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export default function FixedAssets() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'assets' | 'categories' | 'depreciation'>('assets');
  const [assets, setAssets] = useState<any>({ data: [], total: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ branchId: '', categoryId: '', assetCode: '', name: '', nameAr: '', description: '', serialNumber: '', purchaseDate: '', purchaseCost: '', salvageValue: '0', usefulLifeMonths: '60', depreciationMethod: 'StraightLine', location: '' });
  const [depPeriod, setDepPeriod] = useState('');
  const [depResult, setDepResult] = useState<any>(null);

  useEffect(() => { loadData(); api.get<any[]>('/branches').then(setBranches).catch(() => {}); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, c, s] = await Promise.all([
        api.get<any>('/fixed-assets'),
        api.get<any>('/fixed-assets/categories'),
        api.get<any>('/fixed-assets/summary'),
      ]);
      setAssets(a); setCategories(c.data || []); setSummary(s);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await api.post('/fixed-assets', { ...form, purchaseCost: Number(form.purchaseCost), salvageValue: Number(form.salvageValue), usefulLifeMonths: Number(form.usefulLifeMonths) });
      setShowForm(false); setForm({ branchId: '', categoryId: '', assetCode: '', name: '', nameAr: '', description: '', serialNumber: '', purchaseDate: '', purchaseCost: '', salvageValue: '0', usefulLifeMonths: '60', depreciationMethod: 'StraightLine', location: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const runDepreciation = async () => {
    if (!depPeriod) return;
    try {
      const result = await api.post<any>('/fixed-assets/run-depreciation', { periodDate: depPeriod });
      setDepResult(result); loadData();
    } catch (err) { handleApiError(err); }
  };

  const disposeAsset = async (id: string) => {
    const amount = prompt(t('أدخل مبلغ البيع', 'Enter disposal amount'));
    if (!amount) return;
    try {
      await api.post(`/fixed-assets/${id}/dispose`, { disposalDate: new Date().toISOString().split('T')[0], disposalAmount: Number(amount), disposalMethod: 'Sale' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('الأصول الثابتة', 'Fixed Assets')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة سجل الأصول والإهلاك', 'Manage asset register and depreciation')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('أصل جديد', 'New Asset')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card p-4"><Package className="text-primary mb-2" size={20} /><div className="text-2xl font-bold">{summary.totalAssets || 0}</div><div className="text-xs text-muted-foreground">{t('إجمالي الأصول', 'Total Assets')}</div></div>
        <div className="premium-card p-4"><div className="text-2xl font-bold">{formatCurrency(summary.totalCost || 0)}</div><div className="text-xs text-muted-foreground">{t('إجمالي التكلفة', 'Total Cost')}</div></div>
        <div className="premium-card p-4"><TrendingDown className="text-orange-500 mb-2" size={20} /><div className="text-2xl font-bold">{formatCurrency(summary.totalDepreciation || 0)}</div><div className="text-xs text-muted-foreground">{t('مجمع الإهلاك', 'Accumulated Depreciation')}</div></div>
        <div className="premium-card p-4"><div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNbv || 0)}</div><div className="text-xs text-muted-foreground">{t('صافي القيمة الدفترية', 'Net Book Value')}</div></div>
      </div>

      <div className="flex border-b border-border">
        {(['assets', 'categories', 'depreciation'] as const).map(t2 => (
          <button key={t2} className={cn("px-6 py-3 font-medium border-b-2 text-sm", tab === t2 ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab(t2)}>
            {t2 === 'assets' ? t('السجل', 'Register') : t2 === 'categories' ? t('الفئات', 'Categories') : t('الإهلاك', 'Depreciation')}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('أصل ثابت جديد', 'New Fixed Asset')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="input-field"><option value="">{t('الفرع', 'Branch')}</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</option>)}</select>
            <input value={form.assetCode} onChange={e => setForm({ ...form, assetCode: e.target.value })} placeholder={t('كود الأصل', 'Asset Code')} className="input-field" />
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('الاسم (إنجليزي)', 'Name (EN)')} className="input-field" />
            <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} placeholder={t('الاسم (عربي)', 'Name (AR)')} className="input-field" />
            <input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} className="input-field" />
            <input type="number" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: e.target.value })} placeholder={t('تكلفة الشراء', 'Purchase Cost')} className="input-field" />
            <input type="number" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: e.target.value })} placeholder={t('قيمة الخردة', 'Salvage Value')} className="input-field" />
            <input type="number" value={form.usefulLifeMonths} onChange={e => setForm({ ...form, usefulLifeMonths: e.target.value })} placeholder={t('العمر الإنتاجي (شهور)', 'Useful Life (months)')} className="input-field" />
            <select value={form.depreciationMethod} onChange={e => setForm({ ...form, depreciationMethod: e.target.value })} className="input-field"><option value="StraightLine">{t('القسط الثابت', 'Straight Line')}</option><option value="DecliningBalance">{t('القسط المتناقص', 'Declining Balance')}</option></select>
            <input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} placeholder={t('الرقم التسلسلي', 'Serial Number')} className="input-field" />
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={t('الموقع', 'Location')} className="input-field" />
          </div>
          <div className="flex gap-2"><button onClick={handleCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : tab === 'assets' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('كود', 'Code')}</th><th className="p-3 text-start">{t('الاسم', 'Name')}</th><th className="p-3 text-end">{t('التكلفة', 'Cost')}</th><th className="p-3 text-end">{t('مجمع الإهلاك', 'Acc. Dep.')}</th><th className="p-3 text-end">{t('صافي القيمة', 'NBV')}</th><th className="p-3">{t('الحالة', 'Status')}</th><th className="p-3">{t('إجراء', 'Action')}</th></tr></thead>
            <tbody>
              {assets.data?.map((a: any) => (
                <tr key={a.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono">{a.assetCode}</td>
                  <td className="p-3">{isRtl ? (a.nameAr || a.name) : a.name}</td>
                  <td className="p-3 text-end">{formatCurrency(a.purchaseCost)}</td>
                  <td className="p-3 text-end text-orange-600">{formatCurrency(a.accumulatedDepreciation)}</td>
                  <td className="p-3 text-end font-bold">{formatCurrency(a.netBookValue)}</td>
                  <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", a.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>{a.status}</span></td>
                  <td className="p-3">{a.status === 'Active' && <button onClick={() => disposeAsset(a.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!assets.data || assets.data.length === 0) && <div className="p-8 text-center text-muted-foreground">{t('لا توجد أصول', 'No assets found')}</div>}
        </div>
      ) : tab === 'depreciation' ? (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('تشغيل الإهلاك الشهري', 'Run Monthly Depreciation')}</h3>
          <div className="flex gap-4 items-end">
            <div><label className="text-sm text-muted-foreground">{t('تاريخ الفترة', 'Period Date')}</label><input type="date" value={depPeriod} onChange={e => setDepPeriod(e.target.value)} className="input-field mt-1" /></div>
            <button onClick={runDepreciation} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg">{t('تشغيل', 'Run')}</button>
          </div>
          {depResult && <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"><CheckCircle className="inline text-green-500 mr-2" size={18} />{t(`تم إهلاك ${depResult.assetsProcessed} أصل بإجمالي ${formatCurrency(depResult.totalDepreciation)}`, `Depreciated ${depResult.assetsProcessed} assets, total: ${formatCurrency(depResult.totalDepreciation)}`)}</div>}
        </div>
      ) : (
        <div className="premium-card p-6">
          <h3 className="text-lg font-bold mb-4">{t('فئات الأصول', 'Asset Categories')}</h3>
          {categories.length === 0 ? <p className="text-muted-foreground">{t('لا توجد فئات', 'No categories')}</p> : categories.map((c: any) => (
            <div key={c.id} className="flex justify-between p-3 border-b"><span>{isRtl ? (c.nameAr || c.name) : c.name}</span><span className="text-sm text-muted-foreground">{c.depreciationMethod} - {c.defaultUsefulLifeMonths} {t('شهر', 'months')}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

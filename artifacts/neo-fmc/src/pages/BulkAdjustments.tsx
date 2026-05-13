import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, handleApiError } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Settings, Loader2, Eye, Play, AlertTriangle } from 'lucide-react';

export default function BulkAdjustments() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState({
    adjustmentType: 'rate_change', scope: 'all', productId: '', newRate: '', rateChange: '', reason: ''
  });

  useEffect(() => {
    api.get<any>('/fund-products').then(res => setProducts(res?.data || res || [])).catch(() => {});
  }, []);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const data = await api.post<any>('/bulk-adjustments/preview', {
        adjustmentType: form.adjustmentType,
        scope: form.scope,
        productId: form.productId || undefined,
        newRate: form.newRate ? Number(form.newRate) : undefined,
        rateChange: form.rateChange ? Number(form.rateChange) : undefined,
      });
      setPreview(data);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!form.reason) {
      alert(t('يرجى إدخال السبب', 'Please enter a reason'));
      return;
    }
    if (!confirm(t('هل أنت متأكد من تطبيق التعديل؟', 'Are you sure you want to apply this adjustment?'))) return;
    try {
      await api.post('/bulk-adjustments/apply', {
        adjustmentType: form.adjustmentType,
        scope: form.scope,
        productId: form.productId || undefined,
        newRate: form.newRate ? Number(form.newRate) : undefined,
        rateChange: form.rateChange ? Number(form.rateChange) : undefined,
        reason: form.reason,
      });
      alert(t('تم التطبيق بنجاح', 'Applied successfully'));
      setPreview(null);
    } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Settings size={24} className="text-primary" /> {t('تعديل الأسعار والرسوم', 'Bulk Rate/Fee Adjustment')}</h2>
        <p className="text-muted-foreground mt-1">{t('تعديل جماعي للأسعار والرسوم على المنتجات', 'Bulk adjust rates and fees across products')}</p>
      </div>

      <div className="premium-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('نوع التعديل', 'Adjustment Type')}</label>
            <select value={form.adjustmentType} onChange={e => setForm({ ...form, adjustmentType: e.target.value })} className="premium-input">
              <option value="rate_change">{t('تغيير سعر الفائدة', 'Interest Rate Change')}</option>
              <option value="fee_change">{t('تغيير الرسوم', 'Fee Change')}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('النطاق', 'Scope')}</label>
            <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value, productId: '' })} className="premium-input">
              <option value="all">{t('كل المنتجات', 'All Products')}</option>
              <option value="product">{t('منتج محدد', 'Specific Product')}</option>
            </select>
          </div>
          {form.scope === 'product' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('المنتج', 'Product')}</label>
              <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className="premium-input">
                <option value="">{t('اختر', 'Select')}</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('السعر الجديد %', 'New Rate %')}</label>
            <input type="number" step="0.01" value={form.newRate} onChange={e => setForm({ ...form, newRate: e.target.value, rateChange: '' })} className="premium-input" placeholder="e.g. 18.5" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('أو التغيير بنسبة %', 'Or Change By %')}</label>
            <input type="number" step="0.01" value={form.rateChange} onChange={e => setForm({ ...form, rateChange: e.target.value, newRate: '' })} className="premium-input" placeholder="e.g. +2 or -1.5" />
          </div>
        </div>
        <button onClick={handlePreview} disabled={loading} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-2.5 rounded-xl hover:bg-secondary/80 font-medium disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
          {t('معاينة التأثير', 'Preview Impact')}
        </button>
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="premium-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-yellow-500" />
              <h3 className="font-bold">{t('معاينة التعديل', 'Adjustment Preview')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">{t('القروض المتأثرة', 'Affected Loans')}</p>
                <p className="text-2xl font-bold">{preview.affectedLoans}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">{t('إجمالي القائم', 'Total Outstanding')}</p>
                <p className="text-2xl font-bold">{formatCurrency(preview.totalOutstanding)}</p>
              </div>
            </div>

            {preview.loans && preview.loans.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs bg-secondary/30">
                    <tr>
                      <th className="px-3 py-2 text-left">{t('القرض', 'Loan')}</th>
                      <th className="px-3 py-2 text-left">{t('المنتج', 'Product')}</th>
                      <th className="px-3 py-2 text-left">{t('السعر الحالي', 'Current Rate')}</th>
                      <th className="px-3 py-2 text-left">{t('السعر الجديد', 'New Rate')}</th>
                      <th className="px-3 py-2 text-left">{t('التغيير', 'Change')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.loans.map((l: any) => (
                      <tr key={l.loanId}>
                        <td className="px-3 py-2 font-mono text-xs">{l.loanId?.slice(0, 8)}</td>
                        <td className="px-3 py-2">{l.productName || '-'}</td>
                        <td className="px-3 py-2">{l.currentRate}%</td>
                        <td className="px-3 py-2 font-bold">{l.newRate}%</td>
                        <td className={cn("px-3 py-2 font-bold", l.rateChange > 0 ? "text-red-500" : "text-green-600")}>
                          {l.rateChange > 0 ? '+' : ''}{l.rateChange}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('سبب التعديل', 'Reason')} *</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="premium-input h-20 resize-none" placeholder={t('سبب التعديل الجماعي...', 'Reason for bulk adjustment...')} />
              </div>
              <button onClick={handleApply} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-2.5 rounded-xl hover:bg-destructive/90 font-medium">
                <Play size={16} /> {t('تطبيق التعديل', 'Apply Adjustment')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

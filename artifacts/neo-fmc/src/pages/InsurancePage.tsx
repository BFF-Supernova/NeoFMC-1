import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Umbrella, Plus, FileText, Calculator, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('neo_fmc_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); }
  return res.json();
}

type Tab = 'products' | 'policies' | 'claims' | 'calculator';

export default function InsurancePage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', type: 'credit_life', premiumRate: '1.5', premiumCalculation: 'percentage_of_loan', coverageAmount: '', provider: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'products') setProducts(await apiFetch('/insurance/products'));
      else if (tab === 'policies') setPolicies(await apiFetch('/insurance/policies'));
      else if (tab === 'claims') setClaims(await apiFetch('/insurance/claims'));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [tab]);

  const createProduct = async () => {
    try {
      await apiFetch('/insurance/products', { method: 'POST', body: JSON.stringify({ ...form, premiumRate: Number(form.premiumRate), coverageAmount: form.coverageAmount ? Number(form.coverageAmount) : undefined }) });
      toast({ title: t('نجاح', 'Success'), description: t('تم إضافة منتج التأمين', 'Insurance product created') });
      setShowForm(false);
      setForm({ name: '', nameAr: '', type: 'credit_life', premiumRate: '1.5', premiumCalculation: 'percentage_of_loan', coverageAmount: '', provider: '' });
      loadData();
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  const tabs: { key: Tab; icon: any; ar: string; en: string }[] = [
    { key: 'products', icon: Umbrella, ar: 'المنتجات', en: 'Products' },
    { key: 'policies', icon: FileText, ar: 'الوثائق', en: 'Policies' },
    { key: 'claims', icon: AlertTriangle, ar: 'المطالبات', en: 'Claims' },
    { key: 'calculator', icon: Calculator, ar: 'حاسبة الأقساط', en: 'Premium Calculator' },
  ];

  const statusColor = (s: string) => s === 'active' ? 'text-green-400 bg-green-500/10' : s === 'approved' || s === 'settled' ? 'text-blue-400 bg-blue-500/10' : s === 'rejected' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10';

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Umbrella className="text-cyan-400" size={24} /> {t('التأمين على الائتمان', 'Credit Life Insurance')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('إدارة منتجات التأمين والوثائق والمطالبات', 'Manage insurance products, policies, and claims')}</p>
        </div>
        {tab === 'products' && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg transition-all font-medium text-sm">
            <Plus size={18} /> {t('منتج جديد', 'New Product')}
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === tb.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}>
            <tb.icon size={16} /> {t(tb.ar, tb.en)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('إضافة منتج تأمين', 'Add Insurance Product')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('الاسم (EN)', 'Name (EN)')}</label><input className="premium-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('الاسم (AR)', 'Name (AR)')}</label><input className="premium-input" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('النوع', 'Type')}</label>
              <select className="premium-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="credit_life">Credit Life</option><option value="disability">Disability</option><option value="property">Property</option>
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('نسبة القسط %', 'Premium Rate %')}</label><input type="number" step="0.01" className="premium-input" value={form.premiumRate} onChange={e => setForm({ ...form, premiumRate: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('طريقة الحساب', 'Calculation')}</label>
              <select className="premium-input" value={form.premiumCalculation} onChange={e => setForm({ ...form, premiumCalculation: e.target.value })}>
                <option value="percentage_of_loan">{t('نسبة من القرض', '% of Loan')}</option><option value="per_month">{t('شهرياً', 'Per Month')}</option><option value="flat">{t('مبلغ ثابت', 'Flat')}</option>
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('المزود', 'Provider')}</label><input className="premium-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={createProduct} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">{t('حفظ', 'Save')}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-secondary rounded-lg text-sm">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : tab === 'products' ? (
        <div className="grid gap-4">
          {products.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('لا توجد منتجات', 'No products yet')}</p> : products.map((p: any) => (
            <div key={p.id} className="p-4 bg-card rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="font-semibold">{isRtl ? (p.name_ar || p.name) : p.name}</p>
                <p className="text-sm text-muted-foreground">{t('نوع', 'Type')}: {p.type} · {t('نسبة', 'Rate')}: {p.premium_rate}% · {p.provider || '-'}</p>
              </div>
              <span className={cn("px-3 py-1 rounded-full text-xs font-medium", p.is_active ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10")}>
                {p.is_active ? t('نشط', 'Active') : t('معطل', 'Inactive')}
              </span>
            </div>
          ))}
        </div>
      ) : tab === 'policies' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-start px-4 py-3">{t('العميل', 'Client')}</th><th className="text-start px-4 py-3">{t('المنتج', 'Product')}</th>
              <th className="text-start px-4 py-3">{t('القسط', 'Premium')}</th><th className="text-start px-4 py-3">{t('الحالة', 'Status')}</th>
            </tr></thead>
            <tbody>{policies.map((p: any) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-4 py-3">{p.client_name || '-'}</td><td className="px-4 py-3">{p.product_name || '-'}</td>
                <td className="px-4 py-3">{Number(p.premium_amount).toLocaleString()} EGP</td>
                <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", statusColor(p.status))}>{p.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {policies.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد وثائق', 'No policies yet')}</p>}
        </div>
      ) : tab === 'claims' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-start px-4 py-3">{t('العميل', 'Client')}</th><th className="text-start px-4 py-3">{t('النوع', 'Type')}</th>
              <th className="text-start px-4 py-3">{t('المبلغ', 'Amount')}</th><th className="text-start px-4 py-3">{t('الحالة', 'Status')}</th>
            </tr></thead>
            <tbody>{claims.map((c: any) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-4 py-3">{c.client_name || '-'}</td><td className="px-4 py-3">{c.claim_type}</td>
                <td className="px-4 py-3">{c.claim_amount ? `${Number(c.claim_amount).toLocaleString()} EGP` : '-'}</td>
                <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", statusColor(c.status))}>{c.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {claims.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد مطالبات', 'No claims yet')}</p>}
        </div>
      ) : (
        <PremiumCalculator t={t} isRtl={isRtl} products={products} />
      )}
    </div>
  );
}

function PremiumCalculator({ t, isRtl, products }: { t: (ar: string, en: string) => string; isRtl: boolean; products: any[] }) {
  const [productId, setProductId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [termMonths, setTermMonths] = useState('12');
  const [result, setResult] = useState<any>(null);

  const calculate = async () => {
    if (!productId || !loanAmount) return;
    try {
      const data = await apiFetch(`/insurance/calculate-premium?productId=${productId}&loanAmount=${loanAmount}&termMonths=${termMonths}`);
      setResult(data);
    } catch {}
  };

  return (
    <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Calculator size={18} /> {t('حاسبة أقساط التأمين', 'Premium Calculator')}</h3>
      <div className="space-y-3">
        <select className="premium-input" value={productId} onChange={e => setProductId(e.target.value)}>
          <option value="">{t('اختر المنتج', 'Select Product')}</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{isRtl ? (p.name_ar || p.name) : p.name}</option>)}
        </select>
        <input type="number" className="premium-input" placeholder={t('مبلغ القرض', 'Loan Amount')} value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
        <input type="number" className="premium-input" placeholder={t('المدة بالأشهر', 'Term (months)')} value={termMonths} onChange={e => setTermMonths(e.target.value)} />
        <button onClick={calculate} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium">{t('احسب', 'Calculate')}</button>
      </div>
      {result && (
        <div className="p-4 bg-secondary/50 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('إجمالي القسط', 'Total Premium')}</span><span className="font-semibold">{result.totalPremium?.toLocaleString()} EGP</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('قسط شهري', 'Per Installment')}</span><span className="font-semibold">{result.perInstallment?.toLocaleString()} EGP</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('مبلغ التغطية', 'Coverage')}</span><span className="font-semibold">{Number(result.coverageAmount)?.toLocaleString()} EGP</span></div>
        </div>
      )}
    </div>
  );
}

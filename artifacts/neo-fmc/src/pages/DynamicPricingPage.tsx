import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Coins, Calculator, TrendingDown, TrendingUp, Shield } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function DynamicPricingPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [form, setForm] = useState({ creditScore: '65', baseRate: '22', loanAmount: '50000', termMonths: '12' });
  const [result, setResult] = useState<any>(null);

  const calculate = async () => {
    try {
      const data = await apiFetch('/dynamic-pricing/calculate', { method: 'POST', body: JSON.stringify({ creditScore: Number(form.creditScore), baseRate: Number(form.baseRate), loanAmount: Number(form.loanAmount), termMonths: Number(form.termMonths) }) });
      setResult(data);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Coins className="text-yellow-400" size={24} /> {t('التسعير الديناميكي', 'Dynamic Loan Pricing')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('أسعار فائدة ذكية حسب الجدارة الائتمانية ضمن حدود البنك المركزي', 'Risk-adjusted interest rates within CBE caps')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Calculator size={18} /> {t('حاسبة التسعير', 'Pricing Calculator')}</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('درجة الائتمان (0-100)', 'Credit Score (0-100)')}</label>
              <input type="range" min="0" max="100" value={form.creditScore} onChange={e => setForm({ ...form, creditScore: e.target.value })} className="w-full" />
              <p className="text-center font-bold text-lg">{form.creditScore}</p>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('سعر الفائدة الأساسي %', 'Base Rate %')}</label><input type="number" step="0.1" className="premium-input" value={form.baseRate} onChange={e => setForm({ ...form, baseRate: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('مبلغ القرض', 'Loan Amount')}</label><input type="number" className="premium-input" value={form.loanAmount} onChange={e => setForm({ ...form, loanAmount: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('المدة بالأشهر', 'Term Months')}</label><input type="number" className="premium-input" value={form.termMonths} onChange={e => setForm({ ...form, termMonths: e.target.value })} /></div>
            <button onClick={calculate} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium">{t('حساب السعر', 'Calculate Price')}</button>
          </div>
        </div>

        {result && (
          <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
            <h3 className="font-semibold">{t('نتيجة التسعير', 'Pricing Result')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-secondary/50 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('السعر الأساسي', 'Base Rate')}</p>
                <p className="text-2xl font-bold">{result.baseRate}%</p>
              </div>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('السعر النهائي', 'Final Rate')}</p>
                <p className="text-2xl font-bold text-primary">{result.finalRate}%</p>
              </div>
              {result.discount > 0 && (
                <div className="p-3 bg-green-500/10 rounded-xl flex items-center gap-2">
                  <TrendingDown className="text-green-400" size={18} />
                  <div><p className="text-xs text-muted-foreground">{t('الخصم', 'Discount')}</p><p className="font-semibold text-green-400">-{result.discount}%</p></div>
                </div>
              )}
              {result.riskPremium > 0 && (
                <div className="p-3 bg-red-500/10 rounded-xl flex items-center gap-2">
                  <TrendingUp className="text-red-400" size={18} />
                  <div><p className="text-xs text-muted-foreground">{t('علاوة المخاطر', 'Risk Premium')}</p><p className="font-semibold text-red-400">+{result.riskPremium}%</p></div>
                </div>
              )}
            </div>
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium flex items-center gap-2"><Shield size={14} /> {t('تفاصيل القرار', 'Decision Details')}</h4>
              {result.reasoning?.map((r: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">• {r}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

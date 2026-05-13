import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RefreshCw, Loader2, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function LoanRestructuringPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ loanId: '', restructureType: 'term_extension', graceMonths: '0', termExtensionMonths: '6', newRate: '', capitalizeArrears: false, reason: '' });

  const simulate = async () => {
    if (!form.loanId) { toast({ variant: 'destructive', title: 'Error', description: t('أدخل رقم القرض', 'Enter Loan ID') }); return; }
    setLoading(true);
    try {
      const data = await apiFetch('/loan-restructuring/simulate', { method: 'POST', body: JSON.stringify({ ...form, graceMonths: Number(form.graceMonths), termExtensionMonths: Number(form.termExtensionMonths), newRate: form.newRate ? Number(form.newRate) : undefined }) });
      setResult(data);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  const execute = async () => {
    if (!form.reason) { toast({ variant: 'destructive', title: 'Error', description: t('أدخل السبب', 'Enter reason') }); return; }
    try {
      await apiFetch('/loan-restructuring/execute', { method: 'POST', body: JSON.stringify({ ...form, graceMonths: Number(form.graceMonths), termExtensionMonths: Number(form.termExtensionMonths), newRate: form.newRate ? Number(form.newRate) : undefined }) });
      toast({ title: t('نجاح', 'Success'), description: t('تم إعادة هيكلة القرض بنجاح', 'Loan restructured successfully') });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><RefreshCw className="text-orange-400" size={24} /> {t('إعادة هيكلة القروض', 'Loan Restructuring')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('محاكاة وتنفيذ إعادة هيكلة القروض مع تتبع IFRS 9', 'Simulate and execute loan restructuring with IFRS 9 tracking')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('معايير إعادة الهيكلة', 'Restructuring Parameters')}</h3>
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('معرف القرض', 'Loan ID')}</label><input className="premium-input" value={form.loanId} onChange={e => setForm({ ...form, loanId: e.target.value })} placeholder="UUID" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('نوع إعادة الهيكلة', 'Restructure Type')}</label>
              <select className="premium-input" value={form.restructureType} onChange={e => setForm({ ...form, restructureType: e.target.value })}>
                <option value="term_extension">{t('تمديد المدة', 'Term Extension')}</option>
                <option value="rate_modification">{t('تعديل السعر', 'Rate Modification')}</option>
                <option value="grace_period">{t('فترة سماح', 'Grace Period')}</option>
                <option value="combined">{t('مجمع', 'Combined')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('فترة السماح (أشهر)', 'Grace Months')}</label><input type="number" className="premium-input" value={form.graceMonths} onChange={e => setForm({ ...form, graceMonths: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('تمديد المدة (أشهر)', 'Extension Months')}</label><input type="number" className="premium-input" value={form.termExtensionMonths} onChange={e => setForm({ ...form, termExtensionMonths: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('سعر الفائدة الجديد %', 'New Rate %')}</label><input type="number" step="0.01" className="premium-input" value={form.newRate} onChange={e => setForm({ ...form, newRate: e.target.value })} placeholder={t('اتركه فارغاً لعدم التغيير', 'Leave empty for no change')} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.capitalizeArrears} onChange={e => setForm({ ...form, capitalizeArrears: e.target.checked })} className="rounded" /><span className="text-sm">{t('رسملة المتأخرات', 'Capitalize Arrears')}</span></label>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('السبب', 'Reason')}</label><textarea className="premium-input" rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
            <div className="flex gap-2">
              <button onClick={simulate} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">{loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {t('محاكاة', 'Simulate')}</button>
              <button onClick={execute} disabled={!result} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium disabled:opacity-50"><CheckCircle2 size={16} /> {t('تنفيذ', 'Execute')}</button>
            </div>
          </div>
        </div>

        {result && (
          <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
            <h3 className="font-semibold">{t('نتائج المحاكاة', 'Simulation Results')}</h3>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-300">{result.simulation.ifrs9Impact.reason}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-secondary/50 rounded-lg"><span className="block text-xs text-muted-foreground">{t('الرصيد الأصلي', 'Original Balance')}</span><span className="font-semibold">{result.simulation.originalBalance?.toLocaleString()} EGP</span></div>
              <div className="p-3 bg-secondary/50 rounded-lg"><span className="block text-xs text-muted-foreground">{t('المتأخرات المرسملة', 'Capitalized Arrears')}</span><span className="font-semibold">{result.simulation.capitalizedArrears?.toLocaleString()} EGP</span></div>
              <div className="p-3 bg-secondary/50 rounded-lg"><span className="block text-xs text-muted-foreground">{t('الأصل الجديد', 'New Principal')}</span><span className="font-semibold">{result.simulation.newPrincipal?.toLocaleString()} EGP</span></div>
              <div className="p-3 bg-secondary/50 rounded-lg"><span className="block text-xs text-muted-foreground">{t('القسط الشهري', 'Monthly Payment')}</span><span className="font-semibold">{result.simulation.monthlyPayment?.toLocaleString()} EGP</span></div>
              <div className="p-3 bg-secondary/50 rounded-lg"><span className="block text-xs text-muted-foreground">{t('إجمالي المدفوعات', 'Total Payments')}</span><span className="font-semibold">{result.simulation.totalPayments?.toLocaleString()} EGP</span></div>
              <div className="p-3 bg-secondary/50 rounded-lg"><span className="block text-xs text-muted-foreground">{t('المدة الجديدة (أشهر)', 'New Term')}</span><span className="font-semibold">{result.simulation.newTotalMonths}</span></div>
            </div>
            {result.schedule && (
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground"><th className="px-2 py-1">#</th><th className="px-2 py-1">{t('أصل', 'Principal')}</th><th className="px-2 py-1">{t('فائدة', 'Interest')}</th><th className="px-2 py-1">{t('الإجمالي', 'Total')}</th></tr></thead>
                  <tbody>{result.schedule.slice(0, 24).map((s: any) => (
                    <tr key={s.installment} className={cn("border-b border-border/30", s.type === 'grace' && "bg-amber-500/5")}><td className="px-2 py-1">{s.installment}</td><td className="px-2 py-1">{s.principal?.toLocaleString()}</td><td className="px-2 py-1">{s.interest?.toLocaleString()}</td><td className="px-2 py-1">{s.total?.toLocaleString()}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

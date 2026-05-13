import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Zap, Loader2, Play, AlertTriangle, CheckCircle2, Shield, XCircle } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function StressTestingPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { apiFetch('/stress-testing/scenarios').then(setScenarios).catch(() => {}); }, []);

  const toggleScenario = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const runTest = async () => {
    if (selected.length === 0) { toast({ variant: 'destructive', title: 'Error', description: t('اختر سيناريو واحد على الأقل', 'Select at least one scenario') }); return; }
    setLoading(true);
    try {
      const data = await apiFetch('/stress-testing/run', { method: 'POST', body: JSON.stringify({ scenarios: selected }) });
      setResults(data);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  const riskColor = (level: string) => level === 'severe' ? 'text-red-400 bg-red-500/10 border-red-500/20' : level === 'high' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : level === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-green-400 bg-green-500/10 border-green-500/20';
  const riskIcon = (level: string) => level === 'severe' || level === 'high' ? XCircle : level === 'medium' ? AlertTriangle : CheckCircle2;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Zap className="text-pink-400" size={24} /> {t('اختبارات الضغط', 'AI Stress Testing')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('سيناريوهات اقتصادية وتحليل ماذا لو على المحفظة', 'Economic scenarios and what-if analysis on portfolio')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('اختر السيناريوهات', 'Select Scenarios')}</h3>
          <div className="grid gap-2">
            {scenarios.map((s: any) => (
              <button key={s.id} onClick={() => toggleScenario(s.id)} className={cn("p-3 rounded-xl border text-start text-sm transition-all", selected.includes(s.id) ? "border-primary bg-primary/10" : "border-border hover:bg-secondary")}>
                {isRtl ? s.nameAr : s.nameEn}
              </button>
            ))}
          </div>
          <button onClick={runTest} disabled={loading || selected.length === 0} className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {t('تشغيل الاختبار', 'Run Test')}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-xl border border-border">
              <h4 className="text-sm font-medium mb-2">{t('بيانات المحفظة', 'Portfolio Data')}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">{t('الرصيد القائم', 'Outstanding')}</span><p className="font-semibold">{results.portfolio?.totalOutstanding?.toLocaleString()} EGP</p></div>
                <div><span className="text-muted-foreground">PAR 30</span><p className="font-semibold">{results.portfolio?.par30?.toLocaleString()} EGP</p></div>
              </div>
            </div>

            {results.results?.map((r: any, i: number) => {
              const RiskIcon = riskIcon(r.riskLevel);
              return (
                <div key={i} className={cn("p-4 rounded-xl border", riskColor(r.riskLevel))}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{r.description}</h4>
                    <span className="flex items-center gap-1 text-xs font-medium"><RiskIcon size={14} /> {r.riskLevel.toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div><span className="opacity-70">{t('تأثير PAR', 'PAR Impact')}</span><p className="font-semibold">+{r.impactOnPAR?.toLocaleString()}</p></div>
                    <div><span className="opacity-70">{t('تأثير ECL', 'ECL Impact')}</span><p className="font-semibold">+{r.impactOnECL?.toLocaleString()}</p></div>
                    <div><span className="opacity-70">{t('خسارة', 'Loss Est.')}</span><p className="font-semibold">{r.portfolioLossEstimate?.toLocaleString()}</p></div>
                  </div>
                  <div className="space-y-1">
                    {r.recommendations?.slice(0, 3).map((rec: string, j: number) => (
                      <p key={j} className="text-xs opacity-80 flex items-start gap-1"><Shield size={10} className="mt-0.5 shrink-0" /> {rec}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

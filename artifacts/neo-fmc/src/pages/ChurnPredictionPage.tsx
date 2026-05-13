import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UserMinus, Loader2, TrendingUp, AlertTriangle, ShoppingBag } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function ChurnPredictionPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const result = await apiFetch('/churn-prediction/predict');
      setData(result);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPredictions(); }, []);

  const riskColor = (level: string) => level === 'high' ? 'text-red-400 bg-red-500/10' : level === 'medium' ? 'text-amber-400 bg-amber-500/10' : 'text-green-400 bg-green-500/10';

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><UserMinus className="text-zinc-400" size={24} /> {t('التنبؤ بالعملاء المهددين', 'Churn Prediction & Cross-Sell')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('توقع فقدان العملاء وتوصيات البيع المتقاطع', 'Client churn prediction with cross-sell recommendations')}</p>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-card rounded-xl border border-border text-center"><p className="text-xs text-muted-foreground mb-1">{t('تم التحليل', 'Analyzed')}</p><p className="text-xl font-bold">{data.summary?.totalAnalyzed}</p></div>
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-center"><p className="text-xs text-red-400 mb-1">{t('خطر عالي', 'High Risk')}</p><p className="text-xl font-bold text-red-400">{data.summary?.highRisk}</p></div>
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center"><p className="text-xs text-amber-400 mb-1">{t('خطر متوسط', 'Medium Risk')}</p><p className="text-xl font-bold text-amber-400">{data.summary?.mediumRisk}</p></div>
            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 text-center"><p className="text-xs text-green-400 mb-1">{t('خطر منخفض', 'Low Risk')}</p><p className="text-xl font-bold text-green-400">{data.summary?.lowRisk}</p></div>
          </div>

          <div className="space-y-3">
            {data.predictions?.map((p: any) => (
              <div key={p.clientId} className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{p.clientId.slice(0, 8)}...</p>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", riskColor(p.riskLevel))}>{(p.churnProbability * 100).toFixed(0)}% {t('احتمال فقدان', 'churn probability')}</span>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium", riskColor(p.riskLevel))}>{p.riskLevel}</span>
                </div>
                {p.factors?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1"><AlertTriangle size={12} /> {t('العوامل', 'Factors')}</p>
                    {p.factors.map((f: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {f}</p>)}
                  </div>
                )}
                <p className="text-xs mb-2"><span className="text-muted-foreground">{t('الإجراء الموصى', 'Recommended Action')}:</span> {p.recommendedAction}</p>
                {p.crossSellOpportunities?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-primary flex items-center gap-1 mb-1"><ShoppingBag size={12} /> {t('فرص البيع المتقاطع', 'Cross-Sell')}</p>
                    {p.crossSellOpportunities.map((c: string, i: number) => <p key={i} className="text-xs text-primary/70">• {c}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : <p className="text-center text-muted-foreground py-8">{t('لا توجد بيانات', 'No data')}</p>}
    </div>
  );
}

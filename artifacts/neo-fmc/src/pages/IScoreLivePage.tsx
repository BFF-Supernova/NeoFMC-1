import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Search, Loader2, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function IScoreLivePage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [result, setResult] = useState<any>(null);

  const checkScore = async () => {
    if (!nationalId || nationalId.length !== 14) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: t('أدخل رقم قومي صحيح (14 رقم)', 'Enter a valid National ID (14 digits)') });
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/iscore/check', { method: 'POST', body: JSON.stringify({ nationalId }) });
      setResult(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => score >= 700 ? 'text-green-400' : score >= 500 ? 'text-amber-400' : 'text-red-400';
  const riskLabel = (score: number) => score >= 700 ? t('مخاطر منخفضة', 'Low Risk') : score >= 500 ? t('مخاطر متوسطة', 'Medium Risk') : t('مخاطر عالية', 'High Risk');

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Search className="text-indigo-400" size={24} /> {t('I-Score استعلام مباشر', 'I-Score Live Check')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('استعلام فوري عن الجدارة الائتمانية من مكتب الائتمان المصري', 'Real-time credit bureau inquiry from Egyptian Credit Bureau')}</p>
      </div>

      <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
        <h3 className="font-semibold">{t('بحث بالرقم القومي', 'Search by National ID')}</h3>
        <div className="flex gap-2">
          <input className="premium-input flex-1" placeholder={t('الرقم القومي (14 رقم)', 'National ID (14 digits)')} value={nationalId} onChange={e => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))} maxLength={14} />
          <button onClick={checkScore} disabled={loading} className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {t('استعلام', 'Check')}
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('نتيجة الاستعلام', 'Credit Report')}</h3>
              {result.score ? <CheckCircle2 className="text-green-400" size={20} /> : <AlertTriangle className="text-amber-400" size={20} />}
            </div>
            {result.score ? (
              <>
                <div className="text-center p-6 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-2">{t('درجة الائتمان', 'Credit Score')}</p>
                  <p className={cn("text-5xl font-bold", scoreColor(result.score))}>{result.score}</p>
                  <p className={cn("text-sm mt-2 font-medium", scoreColor(result.score))}>{riskLabel(result.score)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-secondary/30 rounded-lg"><span className="block text-xs text-muted-foreground">{t('القروض النشطة', 'Active Loans')}</span><span className="font-semibold">{result.activeLoans || 0}</span></div>
                  <div className="p-3 bg-secondary/30 rounded-lg"><span className="block text-xs text-muted-foreground">{t('المتأخرات', 'Delinquencies')}</span><span className="font-semibold">{result.delinquencies || 0}</span></div>
                  <div className="p-3 bg-secondary/30 rounded-lg"><span className="block text-xs text-muted-foreground">{t('الاستعلامات', 'Inquiries')}</span><span className="font-semibold">{result.inquiries || 0}</span></div>
                  <div className="p-3 bg-secondary/30 rounded-lg"><span className="block text-xs text-muted-foreground">{t('الرصيد الكلي', 'Total Balance')}</span><span className="font-semibold">{result.totalBalance?.toLocaleString() || 0} EGP</span></div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-300">{result.message || t('لم يتم العثور على بيانات', 'No data found')}</p>
              </div>
            )}
          </div>
          {result.score && (
            <div className="p-6 bg-card rounded-2xl border border-border space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Shield size={16} /> {t('التوصيات', 'Recommendations')}</h3>
              {result.recommendations?.map((r: string, i: number) => (
                <p key={i} className="text-sm text-muted-foreground">• {r}</p>
              )) || <p className="text-sm text-muted-foreground">{t('لا توجد توصيات إضافية', 'No additional recommendations')}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

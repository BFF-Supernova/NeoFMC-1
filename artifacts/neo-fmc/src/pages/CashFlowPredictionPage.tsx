import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { LineChart as LineChartIcon, Loader2, TrendingUp, TrendingDown, Banknote } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function CashFlowPredictionPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(14);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const result = await apiFetch(`/cash-flow-prediction/predict?days=${days}`);
      setData(result);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPredictions(); }, [days]);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><LineChartIcon className="text-fuchsia-400" size={24} /> {t('التنبؤ بالتدفقات النقدية', 'Cash Flow Prediction')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('توقع التحصيل والصرف اليومي', 'Daily collection and disbursement forecasting')}</p>
        </div>
        <select className="premium-input w-auto" value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>7 {t('أيام', 'days')}</option><option value={14}>14 {t('أيام', 'days')}</option><option value={30}>30 {t('أيام', 'days')}</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="text-green-400" size={18} /><span className="text-xs text-muted-foreground">{t('التحصيل المتوقع', 'Expected Collections')}</span></div>
              <p className="text-xl font-bold">{data.summary?.totalExpectedCollections?.toLocaleString()} EGP</p>
            </div>
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="text-red-400" size={18} /><span className="text-xs text-muted-foreground">{t('الصرف المتوقع', 'Expected Disbursements')}</span></div>
              <p className="text-xl font-bold">{data.summary?.totalExpectedDisbursements?.toLocaleString()} EGP</p>
            </div>
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2"><Banknote className="text-primary" size={18} /><span className="text-xs text-muted-foreground">{t('صافي التدفق', 'Net Cash Flow')}</span></div>
              <p className="text-xl font-bold">{data.summary?.netCashFlow?.toLocaleString()} EGP</p>
            </div>
          </div>

          {data.predictions?.length > 0 && (
            <div className="p-4 bg-card rounded-2xl border border-border">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.predictions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="expectedCollections" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name={t('تحصيل', 'Collections')} />
                  <Area type="monotone" dataKey="expectedDisbursements" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name={t('صرف', 'Disbursements')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : <p className="text-center text-muted-foreground py-8">{t('لا توجد بيانات كافية', 'Not enough historical data')}</p>}
    </div>
  );
}

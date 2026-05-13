import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Target, Loader2, Phone, MessageSquare, MapPin, Mail, Scale } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

const channelIcons: Record<string, any> = { phone_call: Phone, whatsapp: MessageSquare, field_visit: MapPin, sms: Mail, legal_notice: Scale };
const channelColors: Record<string, string> = { phone_call: 'text-blue-400 bg-blue-500/10', whatsapp: 'text-green-400 bg-green-500/10', field_visit: 'text-orange-400 bg-orange-500/10', sms: 'text-cyan-400 bg-cyan-500/10', legal_notice: 'text-red-400 bg-red-500/10' };

export default function AICollectionPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/ai-collection/optimize');
      setStrategies(data.strategies || []);
      setTotal(data.totalClients || 0);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStrategies(); }, []);

  const priorityColor = (p: number) => p >= 70 ? 'text-red-400' : p >= 40 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Target className="text-red-400" size={24} /> {t('التحصيل الذكي', 'AI Collection Optimization')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('توجيه ذكي وتوصيات اتصال مثلى', 'Smart routing and optimal contact recommendations')}</p>
        </div>
        <div className="text-sm text-muted-foreground">{t('العملاء المتأخرون', 'Overdue Clients')}: <span className="font-semibold text-foreground">{total}</span></div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
        <div className="space-y-3">
          {strategies.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('لا يوجد عملاء متأخرون', 'No overdue clients')}</p> : strategies.map((s: any) => {
            const ChannelIcon = channelIcons[s.recommendedChannel] || Phone;
            return (
              <div key={s.clientId} className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{s.clientId.slice(0, 8)}...</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-xs font-bold", priorityColor(s.priority))}>{t('أولوية', 'Priority')}: {s.priority}/100</span>
                      <span className={cn("px-2 py-0.5 rounded text-xs flex items-center gap-1", channelColors[s.recommendedChannel])}>
                        <ChannelIcon size={12} /> {s.recommendedChannel.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold">{s.estimatedRecovery?.toLocaleString()} EGP</p>
                    <p className="text-xs text-muted-foreground">{t('الاسترداد المتوقع', 'Est. Recovery')}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {s.reasoning?.map((r: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('الوقت الأمثل', 'Best Time')}: {s.recommendedTime}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { BotMessageSquare, Loader2, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function NLPReportingPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState(isRtl ? 'ar' : 'en');

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/nlp-reporting/generate-summary', { method: 'POST', body: JSON.stringify({ lang }) });
      setReport(data);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BotMessageSquare className="text-stone-400" size={24} /> {t('التقارير السردية (NLP)', 'NLP Narrative Reports')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('توليد ملخصات أداء المحفظة بلغة طبيعية', 'Generate natural language portfolio summaries')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLang('ar')} className={cn("px-3 py-1.5 rounded-lg text-sm", lang === 'ar' ? "bg-primary text-white" : "bg-secondary")}>{t('عربي', 'Arabic')}</button>
          <button onClick={() => setLang('en')} className={cn("px-3 py-1.5 rounded-lg text-sm", lang === 'en' ? "bg-primary text-white" : "bg-secondary")}>{t('إنجليزي', 'English')}</button>
        </div>
      </div>

      <button onClick={generateReport} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg transition-all font-medium">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} {t('توليد التقرير', 'Generate Report')}
      </button>

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-card rounded-xl border border-border text-center"><p className="text-xs text-muted-foreground mb-1">{t('القروض النشطة', 'Active Loans')}</p><p className="text-lg font-bold">{report.data?.activeLoans?.toLocaleString()}</p></div>
            <div className="p-3 bg-card rounded-xl border border-border text-center"><p className="text-xs text-muted-foreground mb-1">{t('الرصيد القائم', 'Outstanding')}</p><p className="text-lg font-bold">{report.data?.totalOutstanding?.toLocaleString()}</p></div>
            <div className="p-3 bg-card rounded-xl border border-border text-center"><p className="text-xs text-muted-foreground mb-1">{t('المحصل', 'Collected')}</p><p className="text-lg font-bold">{report.data?.collectedAmount?.toLocaleString()}</p></div>
            <div className="p-3 bg-card rounded-xl border border-border text-center"><p className="text-xs text-muted-foreground mb-1">PAR %</p><p className="text-lg font-bold">{report.data?.parRatio}%</p></div>
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border prose prose-invert max-w-none" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div dangerouslySetInnerHTML={{ __html: report.narrative?.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^## (.*)/gm, '<h2>$1</h2>').replace(/^### (.*)/gm, '<h3>$1</h3>').replace(/^> (.*)/gm, '<blockquote>$1</blockquote>').replace(/^- (.*)/gm, '<li>$1</li>') }} />
          </div>
          <p className="text-xs text-muted-foreground text-center">{t('تم التوليد في', 'Generated at')}: {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

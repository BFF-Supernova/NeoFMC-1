import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScanLine, FileSearch, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function OCRDocumentsPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [tab, setTab] = useState<'extract' | 'classify' | 'expiring'>('extract');
  const [nidText, setNidText] = useState('');
  const [extractResult, setExtractResult] = useState<any>(null);
  const [classifyForm, setClassifyForm] = useState({ filename: '', textContent: '' });
  const [classifyResult, setClassifyResult] = useState<any>(null);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const extractNid = async () => {
    if (!nidText) return;
    try {
      const data = await apiFetch('/ocr/extract-nid', { method: 'POST', body: JSON.stringify({ rawText: nidText }) });
      setExtractResult(data);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  const classifyDoc = async () => {
    try {
      const data = await apiFetch('/ocr/classify-document', { method: 'POST', body: JSON.stringify(classifyForm) });
      setClassifyResult(data);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  useEffect(() => {
    if (tab === 'expiring') { setLoading(true); apiFetch('/ocr/expiring-documents?days=30').then(setExpiringDocs).catch(() => {}).finally(() => setLoading(false)); }
  }, [tab]);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><ScanLine className="text-slate-400" size={24} /> {t('معالجة المستندات', 'OCR Document Processing')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('استخراج البيانات وتصنيف المستندات تلقائياً', 'Automated data extraction and document classification')}</p>
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setTab('extract')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'extract' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><ScanLine size={16} /> {t('استخراج الرقم القومي', 'NID Extraction')}</button>
        <button onClick={() => setTab('classify')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'classify' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><FileSearch size={16} /> {t('تصنيف المستندات', 'Document Classification')}</button>
        <button onClick={() => setTab('expiring')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'expiring' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><AlertTriangle size={16} /> {t('مستندات منتهية', 'Expiring Documents')}</button>
      </div>

      {tab === 'extract' ? (
        <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('استخراج بيانات بطاقة الرقم القومي', 'National ID Data Extraction')}</h3>
          <textarea className="premium-input" rows={3} placeholder={t('أدخل نص الرقم القومي أو النص المستخرج من الصورة', 'Enter NID text or OCR-extracted text')} value={nidText} onChange={e => setNidText(e.target.value)} />
          <button onClick={extractNid} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium">{t('استخراج', 'Extract')}</button>
          {extractResult && (
            <div className={cn("p-4 rounded-xl", extractResult.success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20")}>
              {extractResult.success ? (
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400" /> {t('تم الاستخراج بنجاح', 'Extraction successful')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-xs text-muted-foreground">{t('الرقم القومي', 'National ID')}</span><p className="font-mono">{extractResult.extracted.nationalId}</p></div>
                    <div><span className="text-xs text-muted-foreground">{t('تاريخ الميلاد', 'Birth Date')}</span><p>{extractResult.extracted.birthDate}</p></div>
                    <div><span className="text-xs text-muted-foreground">{t('المحافظة', 'Governorate')}</span><p>{extractResult.extracted.governorate}</p></div>
                    <div><span className="text-xs text-muted-foreground">{t('النوع', 'Gender')}</span><p>{extractResult.extracted.gender === 'male' ? t('ذكر', 'Male') : t('أنثى', 'Female')}</p></div>
                  </div>
                </div>
              ) : <p className="text-red-400 text-sm">{extractResult.error}</p>}
            </div>
          )}
        </div>
      ) : tab === 'classify' ? (
        <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('تصنيف المستند', 'Document Classification')}</h3>
          <input className="premium-input" placeholder={t('اسم الملف', 'Filename')} value={classifyForm.filename} onChange={e => setClassifyForm({ ...classifyForm, filename: e.target.value })} />
          <textarea className="premium-input" rows={3} placeholder={t('محتوى النص (اختياري)', 'Text Content (optional)')} value={classifyForm.textContent} onChange={e => setClassifyForm({ ...classifyForm, textContent: e.target.value })} />
          <button onClick={classifyDoc} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium">{t('تصنيف', 'Classify')}</button>
          {classifyResult && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm space-y-1">
              <p>{t('النوع', 'Type')}: <strong>{isRtl ? classifyResult.documentTypeAr : classifyResult.documentType}</strong></p>
              <p>{t('الثقة', 'Confidence')}: <strong>{(classifyResult.confidence * 100).toFixed(0)}%</strong></p>
            </div>
          )}
        </div>
      ) : loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
        <div className="space-y-4">
          {expiringDocs.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('لا توجد مستندات منتهية', 'No expiring documents')}</p> : expiringDocs.map((d: any, i: number) => (
            <div key={i} className="p-4 bg-card rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div><p className="font-semibold">{d.client_name} ({d.client_code})</p><p className="text-sm text-muted-foreground">{d.document_type || d.file_name}</p></div>
              <div className="text-end"><p className="text-amber-400 text-sm font-medium">{t('ينتهي', 'Expires')}: {new Date(d.expiry_date).toLocaleDateString()}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

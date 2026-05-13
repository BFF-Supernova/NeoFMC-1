import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MessageSquare, Send, History, Loader2, Users } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function WhatsAppPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [tab, setTab] = useState<'send' | 'bulk' | 'history'>('send');
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: '', templateId: '', params: ['', '', ''] });
  const [bulkForm, setBulkForm] = useState({ daysBeforeDue: '3', templateId: 'payment_reminder' });

  useEffect(() => { apiFetch('/whatsapp/templates').then(setTemplates).catch(() => {}); }, []);
  useEffect(() => { if (tab === 'history') { setLoading(true); apiFetch('/whatsapp/history').then(setHistory).catch(() => {}).finally(() => setLoading(false)); } }, [tab]);

  const sendMessage = async () => {
    if (!form.phone || !form.templateId) { toast({ variant: 'destructive', title: 'Error', description: t('أكمل البيانات', 'Fill required fields') }); return; }
    try {
      const selectedTemplate = templates.find(t => t.id === form.templateId);
      const params = form.params.slice(0, selectedTemplate?.params?.length || 0).filter(Boolean);
      await apiFetch('/whatsapp/send', { method: 'POST', body: JSON.stringify({ phone: form.phone, templateId: form.templateId, params }) });
      toast({ title: t('نجاح', 'Success'), description: t('تم إرسال الرسالة', 'Message sent') });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  const sendBulk = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/whatsapp/send-bulk-reminders', { method: 'POST', body: JSON.stringify({ daysBeforeDue: Number(bulkForm.daysBeforeDue), templateId: bulkForm.templateId }) });
      toast({ title: t('نجاح', 'Success'), description: `${t('تم الإرسال', 'Sent')}: ${data.sent} / ${data.total}` });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  const statusColor = (s: string) => s === 'sent' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10';

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><MessageSquare className="text-green-400" size={24} /> {t('واتساب بيزنس', 'WhatsApp Business')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('إرسال تذكيرات وإشعارات عبر واتساب', 'Send reminders and notifications via WhatsApp')}</p>
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setTab('send')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'send' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><Send size={16} /> {t('إرسال رسالة', 'Send Message')}</button>
        <button onClick={() => setTab('bulk')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'bulk' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><Users size={16} /> {t('إرسال جماعي', 'Bulk Send')}</button>
        <button onClick={() => setTab('history')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'history' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><History size={16} /> {t('السجل', 'History')}</button>
      </div>

      {tab === 'send' ? (
        <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
          <div className="space-y-3">
            <input className="premium-input" placeholder={t('رقم الهاتف', 'Phone Number')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <select className="premium-input" value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}>
              <option value="">{t('اختر القالب', 'Select Template')}</option>
              {templates.map((tp: any) => <option key={tp.id} value={tp.id}>{isRtl ? tp.nameAr : tp.nameEn}</option>)}
            </select>
            {templates.find(tp => tp.id === form.templateId)?.params?.map((p: string, i: number) => (
              <input key={i} className="premium-input" placeholder={p} value={form.params[i] || ''} onChange={e => { const np = [...form.params]; np[i] = e.target.value; setForm({ ...form, params: np }); }} />
            ))}
            <button onClick={sendMessage} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Send size={16} /> {t('إرسال', 'Send')}</button>
          </div>
        </div>
      ) : tab === 'bulk' ? (
        <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('إرسال تذكيرات جماعية', 'Bulk Payment Reminders')}</h3>
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('أيام قبل الاستحقاق', 'Days Before Due')}</label><input type="number" className="premium-input" value={bulkForm.daysBeforeDue} onChange={e => setBulkForm({ ...bulkForm, daysBeforeDue: e.target.value })} /></div>
            <select className="premium-input" value={bulkForm.templateId} onChange={e => setBulkForm({ ...bulkForm, templateId: e.target.value })}>
              {templates.map((tp: any) => <option key={tp.id} value={tp.id}>{isRtl ? tp.nameAr : tp.nameEn}</option>)}
            </select>
            <button onClick={sendBulk} disabled={loading} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">{loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} {t('إرسال التذكيرات', 'Send Reminders')}</button>
          </div>
        </div>
      ) : loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="text-start px-4 py-3">{t('الهاتف', 'Phone')}</th><th className="text-start px-4 py-3">{t('القالب', 'Template')}</th><th className="text-start px-4 py-3">{t('الحالة', 'Status')}</th><th className="text-start px-4 py-3">{t('التاريخ', 'Date')}</th></tr></thead>
            <tbody>{history.map((m: any) => (<tr key={m.id} className="border-b border-border/50"><td className="px-4 py-3">{m.phone}</td><td className="px-4 py-3">{m.template_id}</td><td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", statusColor(m.status))}>{m.status}</span></td><td className="px-4 py-3">{new Date(m.created_at).toLocaleDateString()}</td></tr>))}</tbody>
          </table>
          {history.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد رسائل', 'No messages')}</p>}
        </div>
      )}
    </div>
  );
}

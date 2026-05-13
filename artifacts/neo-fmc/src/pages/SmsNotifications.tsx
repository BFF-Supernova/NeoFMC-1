import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, handleApiError } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { MessageSquare, Send, Loader2, Clock, CheckCircle, XCircle, Settings } from 'lucide-react';

export default function SmsNotifications() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'send' | 'history' | 'templates'>('send');
  const [status, setStatus] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ phone: '', message: '', templateKey: '', language: 'ar' });
  const [sending, setSending] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [st, tpls] = await Promise.all([
        api.get<any>('/sms-notifications/status'),
        api.get<any>('/sms-notifications/templates'),
      ]);
      setStatus(st);
      setTemplates(tpls?.templates || []);
      if (tab === 'history') {
        const h = await api.get<any>('/sms-notifications/history');
        setHistory(h);
      }
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!form.phone) return;
    setSending(true);
    try {
      const payload: any = { phone: form.phone };
      if (form.templateKey) {
        payload.templateKey = form.templateKey;
        payload.language = form.language;
      } else {
        payload.message = form.message;
      }
      const result = await api.post<any>('/sms-notifications/send', payload);
      alert(result.success ? t('تم الإرسال بنجاح', 'Sent successfully') : t(`فشل الإرسال: ${result.error}`, `Failed: ${result.error}`));
      setForm({ phone: '', message: '', templateKey: '', language: 'ar' });
    } catch (err) { handleApiError(err); }
    setSending(false);
  };

  const tabs = [
    { key: 'send' as const, labelAr: 'إرسال', labelEn: 'Send', icon: Send },
    { key: 'history' as const, labelAr: 'السجل', labelEn: 'History', icon: Clock },
    { key: 'templates' as const, labelAr: 'القوالب', labelEn: 'Templates', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><MessageSquare size={24} className="text-primary" /> {t('إشعارات SMS', 'SMS Notifications')}</h2>
        <p className="text-muted-foreground mt-1">
          {status?.configured
            ? t(`المزود: ${status.provider}`, `Provider: ${status.provider}`)
            : t('SMS غير مُعد - قم بتعيين متغيرات البيئة', 'SMS not configured - set SMS_PROVIDER env vars')}
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium", tab === tb.key ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80")}>
            <tb.icon size={16} /> {t(tb.labelAr, tb.labelEn)}
          </button>
        ))}
      </div>

      {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
        <>
          {tab === 'send' && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="font-bold">{t('إرسال رسالة', 'Send Message')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('رقم الهاتف', 'Phone')} *</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="premium-input" dir="ltr" placeholder="+20..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('قالب', 'Template')}</label>
                  <select value={form.templateKey} onChange={e => setForm({ ...form, templateKey: e.target.value })} className="premium-input">
                    <option value="">{t('رسالة مخصصة', 'Custom Message')}</option>
                    {templates.map(tpl => <option key={tpl.key} value={tpl.key}>{tpl.key}</option>)}
                  </select>
                </div>
                {!form.templateKey && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('الرسالة', 'Message')} *</label>
                    <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="premium-input h-24 resize-none" />
                  </div>
                )}
                {form.templateKey && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('اللغة', 'Language')}</label>
                    <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="premium-input">
                      <option value="ar">{t('عربي', 'Arabic')}</option>
                      <option value="en">{t('إنجليزي', 'English')}</option>
                    </select>
                  </div>
                )}
              </div>
              <button onClick={handleSend} disabled={sending || !form.phone} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center gap-2">
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {t('إرسال', 'Send')}
              </button>
            </div>
          )}

          {tab === 'history' && (
            <div className="premium-card overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                  <tr>
                    <th className="px-4 py-3">{t('الهاتف', 'Phone')}</th>
                    <th className="px-4 py-3">{t('الرسالة', 'Message')}</th>
                    <th className="px-4 py-3">{t('الحالة', 'Status')}</th>
                    <th className="px-4 py-3">{t('التاريخ', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(history.data || []).map((n: any) => (
                    <tr key={n.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{n.recipientPhone}</td>
                      <td className="px-4 py-3 max-w-[300px] truncate">{n.message}</td>
                      <td className="px-4 py-3">
                        {n.status === 'Sent' ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} />{t('مرسل', 'Sent')}</span> :
                          <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle size={12} />{t('فشل', 'Failed')}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(n.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(tpl => (
                <div key={tpl.key} className="premium-card p-5">
                  <h4 className="font-bold text-sm mb-2">{tpl.key}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{tpl.previewEn}</p>
                  <p className="text-xs" dir="rtl">{tpl.previewAr}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

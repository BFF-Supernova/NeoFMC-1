import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Bell, Plus, Loader2, Send, FileText } from 'lucide-react';

export default function Notifications() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [tab, setTab] = useState<'history' | 'templates'>('history');
  const [notifications, setNotifications] = useState<any>({ data: [], total: 0 });
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ templateName: '', templateType: 'PaymentReminder', channel: 'SMS', subject: '', bodyTemplate: '', bodyTemplateAr: '', triggerEvent: '' });
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifs, tmps] = await Promise.all([
        api.get<any>('/notifications'),
        api.get<any[]>('/notifications/templates'),
      ]);
      setNotifications(notifs);
      setTemplates(tmps);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreateTemplate = async () => {
    try {
      await api.post('/notifications/templates', templateForm);
      setShowTemplateForm(false);
      setTemplateForm({ templateName: '', templateType: 'PaymentReminder', channel: 'SMS', subject: '', bodyTemplate: '', bodyTemplateAr: '', triggerEvent: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const result = await api.post<any>('/notifications/send-reminders', { daysBeforeDue: 3, channel: 'SMS' });
      toast({ title: t('تم الإرسال', 'Sent'), description: `${result.remindersQueued} ${t('تذكيرات في الانتظار', 'reminders queued')}` });
      loadData();
    } catch (err) { handleApiError(err); }
    setSendingReminders(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('الإشعارات', 'Notifications')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة قوالب الإشعارات والرسائل', 'Manage notification templates and messages')}</p>
        </div>
        <button onClick={handleSendReminders} disabled={sendingReminders} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {sendingReminders ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {t('إرسال تذكيرات', 'Send Reminders')}
        </button>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('history')}>
          <Bell className="inline mr-2" size={16} />{t('سجل الإشعارات', 'History')}
        </button>
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'templates' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('templates')}>
          <FileText className="inline mr-2" size={16} />{t('القوالب', 'Templates')}
        </button>
      </div>

      {tab === 'history' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('القناة', 'Channel')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المستلم', 'Recipient')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الموضوع', 'Subject')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : notifications.data?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Bell className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد إشعارات', 'No notifications')}</td></tr>
                ) : (
                  notifications.data?.map((n: any) => (
                    <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", n.channel === 'SMS' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400')}>{n.channel}</span></td>
                      <td className="px-6 py-4">{n.recipientContact}</td>
                      <td className="px-6 py-4">{n.subject || '-'}</td>
                      <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", getStatusColor(n.status))}>{n.status}</span></td>
                      <td className="px-6 py-4">{formatDate(n.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-4">
          <button onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
            <Plus size={18} /> {t('قالب جديد', 'New Template')}
          </button>

          {showTemplateForm && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-lg font-bold">{t('قالب إشعار جديد', 'New Template')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder={t('اسم القالب', 'Template Name')} value={templateForm.templateName} onChange={e => setTemplateForm({ ...templateForm, templateName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
                <select value={templateForm.channel} onChange={e => setTemplateForm({ ...templateForm, channel: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                </select>
                <select value={templateForm.templateType} onChange={e => setTemplateForm({ ...templateForm, templateType: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
                  <option value="PaymentReminder">{t('تذكير دفع', 'Payment Reminder')}</option>
                  <option value="OverdueNotice">{t('إشعار تأخير', 'Overdue Notice')}</option>
                  <option value="DisbursementNotice">{t('إشعار صرف', 'Disbursement Notice')}</option>
                  <option value="General">{t('عام', 'General')}</option>
                </select>
                <input placeholder={t('الموضوع', 'Subject')} value={templateForm.subject} onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
              </div>
              <textarea placeholder={t('نص القالب (English)', 'Template Body')} value={templateForm.bodyTemplate} onChange={e => setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })} className="w-full bg-background border border-border rounded-lg px-4 py-2 h-20" />
              <textarea placeholder={t('نص القالب (عربي)', 'Template Body (Arabic)')} value={templateForm.bodyTemplateAr} onChange={e => setTemplateForm({ ...templateForm, bodyTemplateAr: e.target.value })} className="w-full bg-background border border-border rounded-lg px-4 py-2 h-20" />
              <div className="flex gap-2">
                <button onClick={handleCreateTemplate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('حفظ', 'Save')}</button>
                <button onClick={() => setShowTemplateForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl: any) => (
              <div key={tmpl.id} className="premium-card p-5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold">{tmpl.templateName}</h4>
                  <span className={cn("px-2 py-1 rounded text-xs", tmpl.channel === 'SMS' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400')}>{tmpl.channel}</span>
                </div>
                <p className="text-sm text-muted-foreground">{tmpl.templateType}</p>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tmpl.bodyTemplate}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

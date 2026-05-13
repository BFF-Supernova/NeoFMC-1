import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatCurrency, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Phone, Plus, Loader2, MapPin, Mail, MessageSquare, AlertTriangle, Scale, ChevronDown, ChevronUp, Filter } from 'lucide-react';

type Tab = 'activities' | 'follow-ups' | 'waiver';

export default function CollectionActivities() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const role = user?.role || '';
  const [tab, setTab] = useState<Tab>('activities');
  const [activities, setActivities] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [channelFilter, setChannelFilter] = useState('');
  const [form, setForm] = useState({ loanId: '', clientId: '', activityType: 'Phone', channel: 'Phone', notes: '', outcome: '', followUpDate: '', thirdPartyCompany: '' });

  const [waiverForm, setWaiverForm] = useState({ installmentId: '', waiverAmount: '', reason: '' });
  const [waiverSubmitting, setWaiverSubmitting] = useState(false);

  useEffect(() => { if (tab === 'activities' || tab === 'follow-ups') loadData(); }, [channelFilter, tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = '/collection-activities';
      const params: string[] = [];
      if (channelFilter) params.push(`channel=${channelFilter}`);
      if (params.length) url += '?' + params.join('&');
      const data = await api.get<any>(url);
      setActivities(data);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await api.post('/collection-activities', { ...form, nextFollowUpDate: form.followUpDate || undefined, thirdPartyCompany: form.thirdPartyCompany || undefined });
      setShowForm(false);
      setForm({ loanId: '', clientId: '', activityType: 'Phone', channel: 'Phone', notes: '', outcome: '', followUpDate: '', thirdPartyCompany: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleWaiverRequest = async () => {
    if (!waiverForm.installmentId || !waiverForm.reason) return;
    setWaiverSubmitting(true);
    try {
      await api.post('/approval-requests', {
        requestType: 'PenaltyWaiver',
        referenceId: waiverForm.installmentId,
        data: {
          installmentId: waiverForm.installmentId,
          waiverAmount: waiverForm.waiverAmount || undefined,
          reason: waiverForm.reason,
        },
      });
      setWaiverForm({ installmentId: '', waiverAmount: '', reason: '' });
      alert(t('تم إرسال طلب الإعفاء للموافقة', 'Waiver request submitted for approval'));
    } catch (err) { handleApiError(err); }
    setWaiverSubmitting(false);
  };

  const channelIcons: Record<string, any> = { Phone: Phone, Visit: MapPin, SMS: MessageSquare, Email: Mail };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

  const followUps = activities.data?.filter((a: any) => a.followUpDate || a.nextFollowUpDate) || [];

  const tabs: { key: Tab; ar: string; en: string; icon: any }[] = [
    { key: 'activities', ar: 'سجل الأنشطة', en: 'Activity Log', icon: Phone },
    { key: 'follow-ups', ar: 'المتابعات', en: 'Follow-ups', icon: AlertTriangle },
    { key: 'waiver', ar: 'إعفاء غرامة', en: 'Penalty Waiver', icon: Scale },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('أنشطة التحصيل', 'Collection Activities')}</h2>
          <p className="text-muted-foreground mt-1">{t('تتبع مكالمات وزيارات التحصيل وطلبات الإعفاء', 'Track collection calls, visits, and waiver requests')}</p>
        </div>
        {tab === 'activities' && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
            <Plus size={18} /> {t('نشاط جديد', 'New Activity')}
          </button>
        )}
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm flex items-center gap-2", tab === tb.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tb.icon size={16} /> {t(tb.ar, tb.en)}
            {tb.key === 'follow-ups' && followUps.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">{followUps.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'activities' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['', 'Phone', 'Visit', 'SMS', 'Email'].map(ch => (
              <button key={ch || 'all'} onClick={() => setChannelFilter(ch)} className={cn("px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2", channelFilter === ch ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
                {ch ? (channelIcons[ch] ? (() => { const Icon = channelIcons[ch]; return <Icon size={14} />; })() : null) : null}
                {ch || t('الكل', 'All')}
              </button>
            ))}
          </div>

          {showForm && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-lg font-bold">{t('نشاط تحصيل جديد', 'New Collection Activity')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input placeholder={t('معرف القرض', 'Loan ID')} value={form.loanId} onChange={e => setForm({ ...form, loanId: e.target.value })} className={inputCls} />
                <input placeholder={t('معرف العميل', 'Client ID')} value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className={inputCls} />
                <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value, activityType: e.target.value })} className={inputCls}>
                  <option value="Phone">{t('هاتف', 'Phone')}</option>
                  <option value="Visit">{t('زيارة', 'Visit')}</option>
                  <option value="SMS">{t('رسالة', 'SMS')}</option>
                  <option value="Email">{t('بريد', 'Email')}</option>
                </select>
                <select value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} className={inputCls}>
                  <option value="">{t('النتيجة', 'Outcome')}</option>
                  <option value="Promised">{t('وعد بالسداد', 'Promised to Pay')}</option>
                  <option value="NoAnswer">{t('لم يرد', 'No Answer')}</option>
                  <option value="Refused">{t('رفض', 'Refused')}</option>
                  <option value="Paid">{t('سدد', 'Paid')}</option>
                  <option value="FollowUp">{t('متابعة', 'Follow Up')}</option>
                  <option value="Escalated">{t('تصعيد', 'Escalated')}</option>
                  <option value="Legal">{t('إجراء قانوني', 'Legal Action')}</option>
                </select>
                <input type="date" placeholder={t('تاريخ المتابعة', 'Follow-up Date')} value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} className={inputCls} />
                <input placeholder={t('شركة الطرف الثالث', 'Third Party Company')} value={form.thirdPartyCompany} onChange={e => setForm({ ...form, thirdPartyCompany: e.target.value })} className={inputCls} />
                <textarea placeholder={t('ملاحظات', 'Notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={cn(inputCls, "h-20 md:col-span-3")} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('حفظ', 'Save')}</button>
                <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
              </div>
            </div>
          )}

          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                  <tr>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('القناة', 'Channel')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النتيجة', 'Outcome')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الملاحظات', 'Notes')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المتابعة', 'Follow-up')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الشركة', 'Company')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : activities.data?.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><Phone className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد أنشطة', 'No activities')}</td></tr>
                  ) : (
                    activities.data?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", a.channel === 'Phone' ? 'bg-blue-500/10 text-blue-400' : a.channel === 'Visit' ? 'bg-green-500/10 text-green-400' : a.channel === 'SMS' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400')}>{a.channel}</span></td>
                        <td className="px-6 py-4 font-medium">
                          <span className={cn("px-2 py-0.5 rounded text-xs", a.outcome === 'Escalated' ? 'bg-red-500/10 text-red-400' : a.outcome === 'Legal' ? 'bg-red-500/20 text-red-300' : a.outcome === 'Promised' ? 'bg-green-500/10 text-green-400' : a.outcome === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary')}>
                            {a.outcome || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground max-w-48 truncate">{a.notes || '-'}</td>
                        <td className="px-6 py-4">{a.followUpDate || a.nextFollowUpDate ? formatDate(a.followUpDate || a.nextFollowUpDate) : '-'}</td>
                        <td className="px-6 py-4">{a.thirdPartyCompany || '-'}</td>
                        <td className="px-6 py-4">{formatDate(a.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'follow-ups' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('تاريخ المتابعة', 'Follow-up Date')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('القناة', 'Channel')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النتيجة', 'Outcome')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الملاحظات', 'Notes')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : followUps.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">{t('لا توجد متابعات مجدولة', 'No scheduled follow-ups')}</td></tr>
                ) : followUps.map((a: any) => {
                  const fDate = a.followUpDate || a.nextFollowUpDate;
                  const isPast = new Date(fDate) < new Date();
                  return (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className={cn("px-6 py-4 font-mono text-sm", isPast ? "text-red-400" : "text-foreground")}>{formatDate(fDate)}</td>
                      <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", a.channel === 'Phone' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400')}>{a.channel}</span></td>
                      <td className="px-6 py-4">{a.outcome || '-'}</td>
                      <td className="px-6 py-4 text-muted-foreground max-w-60 truncate">{a.notes || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-0.5 rounded text-xs", isPast ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>
                          {isPast ? t('متأخر', 'Overdue') : t('مجدول', 'Scheduled')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'waiver' && (
        <div className="premium-card p-6 max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Scale size={20} className="text-primary" /> {t('طلب إعفاء غرامة', 'Penalty Waiver Request')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('سيتم إرسال الطلب للموافقة من المدير', 'Request will be sent for manager approval')}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t('معرف القسط', 'Installment ID')} <span className="text-destructive">*</span></label>
              <input value={waiverForm.installmentId} onChange={e => setWaiverForm(p => ({ ...p, installmentId: e.target.value }))} placeholder={t('أدخل معرف القسط المتأخر', 'Enter overdue installment ID')} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t('مبلغ الإعفاء', 'Waiver Amount')}</label>
              <input type="number" value={waiverForm.waiverAmount} onChange={e => setWaiverForm(p => ({ ...p, waiverAmount: e.target.value }))} placeholder={t('اتركه فارغاً لإعفاء كامل الغرامة', 'Leave empty for full penalty waiver')} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t('سبب الإعفاء', 'Waiver Reason')} <span className="text-destructive">*</span></label>
              <textarea value={waiverForm.reason} onChange={e => setWaiverForm(p => ({ ...p, reason: e.target.value }))} placeholder={t('اذكر سبب طلب الإعفاء', 'Explain the reason for waiver request')} className={cn(inputCls, "h-24")} />
            </div>
            <button onClick={handleWaiverRequest} disabled={waiverSubmitting || !waiverForm.installmentId || !waiverForm.reason} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
              {waiverSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
              {t('إرسال طلب الإعفاء', 'Submit Waiver Request')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, handleApiError } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Webhook, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, Eye, CheckCircle, XCircle } from 'lucide-react';

export default function Webhooks() {
  const { t, isRtl } = useLanguage();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [form, setForm] = useState({ url: '', events: [] as string[], description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wh, ev] = await Promise.all([
        api.get<any>('/webhooks'),
        api.get<any>('/webhooks/events'),
      ]);
      setWebhooks(wh?.data || []);
      setEvents(ev?.events || []);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.url || form.events.length === 0) return;
    try {
      await api.post('/webhooks', form);
      setShowForm(false);
      setForm({ url: '', events: [], description: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/webhooks/${id}`, { isActive: !isActive });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('هل أنت متأكد؟', 'Are you sure?'))) return;
    try {
      await api.delete(`/webhooks/${id}`);
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const loadDeliveries = async (id: string) => {
    try {
      const data = await api.get<any>(`/webhooks/${id}/deliveries`);
      setDeliveries(data?.data || []);
      setShowDeliveries(id);
    } catch (err) { handleApiError(err); }
  };

  const toggleEvent = (event: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Webhook size={24} className="text-primary" /> {t('إدارة Webhooks', 'Webhook Management')}</h2>
          <p className="text-muted-foreground mt-1">{t('إرسال إشعارات تلقائية للأنظمة الخارجية', 'Send automatic notifications to external systems')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 font-medium">
          <Plus size={18} /> {t('إضافة Webhook', 'Add Webhook')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('Webhook جديد', 'New Webhook')}</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">URL *</label>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="premium-input" dir="ltr" placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('الوصف', 'Description')}</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('الأحداث', 'Events')} *</label>
              <div className="flex flex-wrap gap-2">
                {events.map(ev => (
                  <button key={ev} onClick={() => toggleEvent(ev)} className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", form.events.includes(ev) ? "bg-primary text-white border-primary" : "border-border hover:bg-secondary")}>
                    {ev}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 font-medium">{t('حفظ', 'Save')}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl hover:bg-secondary font-medium">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {webhooks.map(wh => (
          <div key={wh.id} className="premium-card p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", wh.isActive ? "bg-green-500" : "bg-gray-400")} />
                  <code className="text-sm font-mono">{wh.url}</code>
                </div>
                {wh.description && <p className="text-sm text-muted-foreground mt-1">{wh.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {((wh.events as string[]) || []).map((ev: string) => (
                    <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{ev}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => loadDeliveries(wh.id)} className="p-2 rounded-lg hover:bg-secondary" title={t('السجل', 'Log')}><Eye size={16} /></button>
                <button onClick={() => handleToggle(wh.id, wh.isActive)} className="p-2 rounded-lg hover:bg-secondary">
                  {wh.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} className="text-gray-400" />}
                </button>
                <button onClick={() => handleDelete(wh.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && (
          <div className="premium-card p-12 text-center text-muted-foreground">
            <Webhook size={32} className="mx-auto mb-3 opacity-20" />
            {t('لا توجد Webhooks', 'No webhooks configured')}
          </div>
        )}
      </div>

      {showDeliveries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold">{t('سجل التسليم', 'Delivery Log')}</h3>
              <button onClick={() => setShowDeliveries(null)} className="p-2 rounded-lg hover:bg-muted text-sm">{t('إغلاق', 'Close')}</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {deliveries.map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono text-xs">{d.event}</span>
                    <span className="flex items-center gap-1">
                      {d.status === 'Delivered' ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(d.createdAt)} | HTTP {d.responseStatus || '-'} | Attempts: {d.attempts}
                  </div>
                </div>
              ))}
              {deliveries.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد عمليات تسليم', 'No deliveries yet')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

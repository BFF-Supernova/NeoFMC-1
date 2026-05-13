import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { CreditCard, Plus, Loader2, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CreditLimits() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [limits, setLimits] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState<any>(null);
  const [draws, setDraws] = useState<any[]>([]);
  const [form, setForm] = useState({ clientId: '', creditLimit: '', interestRate: '', gracePeriodDays: 0, maxConcurrentLoans: 1, isRevolving: true });
  const [drawForm, setDrawForm] = useState({ drawAmount: '', dueDate: '', notes: '' });
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    loadData();
    setClientsLoading(true);
    api.get<any>('/clients?limit=100').then(d => {
      setClients(d.data || []);
      setClientsLoading(false);
    }).catch(() => { setClientsLoading(false); });
  }, []);

  const loadData = async () => {
    setLoading(true);
    try { const data = await api.get<any>('/credit-limits'); setLimits(data); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.clientId) {
      toast({ title: t('خطأ', 'Error'), description: t('يرجى اختيار العميل', 'Please select a client'), variant: 'destructive' });
      return;
    }
    if (!form.creditLimit || Number(form.creditLimit) <= 0) {
      toast({ title: t('خطأ', 'Error'), description: t('يرجى إدخال حد ائتماني صحيح', 'Please enter a valid credit limit'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/credit-limits', {
        clientId: form.clientId,
        creditLimit: Number(form.creditLimit),
        interestRate: form.interestRate ? Number(form.interestRate) : undefined,
        gracePeriodDays: form.gracePeriodDays,
        maxConcurrentLoans: form.maxConcurrentLoans,
        isRevolving: form.isRevolving,
      });
      toast({ title: t('تم بنجاح', 'Success'), description: t('تم إنشاء حد الائتمان بنجاح', 'Credit limit created successfully') });
      setShowForm(false);
      setForm({ clientId: '', creditLimit: '', interestRate: '', gracePeriodDays: 0, maxConcurrentLoans: 1, isRevolving: true });
      loadData();
    } catch (err) { handleApiError(err); }
    setSubmitting(false);
  };

  const handleDraw = async () => {
    if (!selectedLimit) return;
    if (!drawForm.drawAmount || Number(drawForm.drawAmount) <= 0) {
      toast({ title: t('خطأ', 'Error'), description: t('يرجى إدخال مبلغ سحب صحيح', 'Please enter a valid draw amount'), variant: 'destructive' });
      return;
    }
    try {
      await api.post(`/credit-limits/${selectedLimit.id}/draw`, { drawAmount: Number(drawForm.drawAmount), dueDate: drawForm.dueDate || undefined, notes: drawForm.notes || undefined });
      toast({ title: t('تم بنجاح', 'Success'), description: t('تم السحب بنجاح', 'Draw completed successfully') });
      setDrawForm({ drawAmount: '', dueDate: '', notes: '' });
      loadDraws(selectedLimit.id);
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const loadDraws = async (id: string) => {
    try { const data = await api.get<any[]>(`/credit-limits/${id}/draws`); setDraws(data); } catch (err) { handleApiError(err); }
  };

  const selectLimit = (lim: any) => {
    setSelectedLimit(lim);
    loadDraws(lim.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('حدود الائتمان', 'Credit Limits')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة الائتمان المتجدد وحدود العملاء', 'Manage revolving credit and customer limits')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('إضافة حد ائتمان', 'Add Credit Limit')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('حد ائتمان جديد', 'New Credit Limit')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{t('العميل', 'Client')} <span className="text-red-400">*</span></label>
              <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2 w-full">
                <option value="">{clientsLoading ? t('جاري التحميل...', 'Loading...') : t('اختر العميل', 'Select Client')}</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.fullNameAr} - {c.nationalId}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{t('الحد الائتماني', 'Credit Limit')} <span className="text-red-400">*</span></label>
              <input type="number" placeholder={t('مثال: 50000', 'e.g. 50000')} value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{t('معدل الفائدة %', 'Interest Rate %')}</label>
              <input type="number" step="0.01" placeholder={t('مثال: 18', 'e.g. 18')} value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{t('أيام السماح', 'Grace Period Days')}</label>
              <input type="number" placeholder="0" value={form.gracePeriodDays} onChange={e => setForm({ ...form, gracePeriodDays: Number(e.target.value) })} className="input bg-background border border-border rounded-lg px-4 py-2 w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{t('الحد الأقصى للقروض المتزامنة', 'Max Concurrent Loans')}</label>
              <input type="number" placeholder="1" value={form.maxConcurrentLoans} onChange={e => setForm({ ...form, maxConcurrentLoans: Number(e.target.value) })} className="input bg-background border border-border rounded-lg px-4 py-2 w-full" />
            </div>
            <label className="flex items-center gap-2 px-4 py-2">
              <input type="checkbox" checked={form.isRevolving} onChange={e => setForm({ ...form, isRevolving: e.target.checked })} />
              {t('ائتمان متجدد', 'Revolving Credit')}
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={submitting} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {t('إنشاء', 'Create')}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-bold">{t('حدود الائتمان', 'Credit Limits')}</h3>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></div>
          ) : limits.data?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><CreditCard className="mx-auto mb-3 opacity-20" size={32} /><p>{t('لا توجد حدود', 'No credit limits')}</p></div>
          ) : (
            limits.data?.map((lim: any) => (
              <div key={lim.id} className={cn("premium-card p-4 cursor-pointer transition-colors", selectedLimit?.id === lim.id ? "border-primary" : "")} onClick={() => selectLimit(lim)}>
                <div className="flex justify-between items-center mb-2">
                  <span className={cn("px-2 py-1 rounded text-xs", getStatusColor(lim.status))}>{lim.status}</span>
                  {lim.isRevolving && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{t('متجدد', 'Revolving')}</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">{t('الحد', 'Limit')}</p><p className="font-bold text-primary">{formatCurrency(lim.creditLimit)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t('مستخدم', 'Used')}</p><p className="font-bold text-orange-400">{formatCurrency(lim.usedAmount)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t('متاح', 'Available')}</p><p className="font-bold text-green-400">{formatCurrency(lim.availableBalance)}</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('قروض نشطة', 'Active loans')}: {lim.activeLoanCount}/{lim.maxConcurrentLoans}</p>
              </div>
            ))
          )}
        </div>

        {selectedLimit && (
          <div className="space-y-4">
            <h3 className="font-bold">{t('السحوبات', 'Draws')}</h3>
            <div className="premium-card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="number" placeholder={t('مبلغ السحب', 'Draw Amount')} value={drawForm.drawAmount} onChange={e => setDrawForm({ ...drawForm, drawAmount: e.target.value })} className="input bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={drawForm.dueDate} onChange={e => setDrawForm({ ...drawForm, dueDate: e.target.value })} className="input bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={handleDraw} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
                <ArrowDownCircle size={16} /> {t('سحب', 'Draw')}
              </button>
            </div>

            {draws.map((d: any) => (
              <div key={d.id} className="premium-card p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{formatCurrency(d.drawAmount)}</p>
                    <p className="text-xs text-muted-foreground">{t('متبقي', 'Outstanding')}: {formatCurrency(d.outstandingAmount)}</p>
                  </div>
                  <span className={cn("px-2 py-1 rounded text-xs", getStatusColor(d.status))}>{d.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(d.drawDate)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

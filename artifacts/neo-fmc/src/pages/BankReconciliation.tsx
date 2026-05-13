import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, Loader2, CheckCircle2, AlertTriangle, X, FileText, ArrowDown, ArrowUp } from 'lucide-react';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

export default function BankReconciliation() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['/api/bank-reconciliation'],
    queryFn: () => api.get<any[]>('/bank-reconciliation'),
  });

  const { data: detail } = useQuery({
    queryKey: ['/api/bank-reconciliation', selectedId],
    queryFn: () => api.get<any>(`/bank-reconciliation/${selectedId}`),
    enabled: !!selectedId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark size={24} className="text-primary" />
            {t('مطابقة البنك', 'Bank Reconciliation')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('مطابقة كشوف البنك مع السجلات الداخلية', 'Reconcile bank statements against internal records')}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90">
          <Plus size={16} /> {t('مطابقة جديدة', 'New Reconciliation')}
        </button>
      </div>

      {showForm && <ReconciliationForm onClose={() => setShowForm(false)} />}

      {selectedId && detail && (
        <ReconciliationDetail data={detail} onClose={() => setSelectedId(null)} />
      )}

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
      ) : (
        <div className="premium-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('التاريخ', 'Date')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('حساب البنك', 'Bank Account')}</th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">{t('رصيد الكشف', 'Statement Balance')}</th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">{t('رصيد النظام', 'System Balance')}</th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">{t('الفرق', 'Discrepancy')}</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t('الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {(reconciliations || []).map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{r.reconciliationDate}</td>
                  <td className="px-4 py-3">{r.bankAccountName}</td>
                  <td className="px-4 py-3 text-end font-mono">{formatCurrency(Number(r.statementBalance))}</td>
                  <td className="px-4 py-3 text-end font-mono">{formatCurrency(Number(r.systemBalance))}</td>
                  <td className={cn("px-4 py-3 text-end font-mono font-bold", Number(r.discrepancy) === 0 ? "text-green-400" : "text-red-400")}>
                    {formatCurrency(Number(r.discrepancy))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                      r.status === 'Finalized' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                    )}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {(!reconciliations || reconciliations.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('لا توجد مطابقات', 'No reconciliations found')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReconciliationForm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccount, setBankAccount] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ transactionDate: string; description: string; amount: string; type: string }[]>([]);

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/bank-reconciliation', data),
    onSuccess: () => {
      toast({ title: t('تم إنشاء المطابقة', 'Reconciliation Created') });
      qc.invalidateQueries({ queryKey: ['/api/bank-reconciliation'] });
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const addItem = () => setItems([...items, { transactionDate: date, description: '', amount: '', type: 'Debit' }]);

  return (
    <div className="premium-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{t('مطابقة بنكية جديدة', 'New Bank Reconciliation')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{t('التاريخ', 'Date')} *</label>
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{t('اسم حساب البنك', 'Bank Account Name')} *</label>
          <input className={inputCls} value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder={t('مثال: البنك الأهلي', 'e.g., National Bank')} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{t('رصيد الكشف', 'Statement Balance')} *</label>
          <input type="number" className={inputCls} value={statementBalance} onChange={e => setStatementBalance(e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">{t('بنود كشف البنك', 'Bank Statement Items')}</label>
          <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={14} /> {t('إضافة بند', 'Add Item')}</button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
            <input type="date" className={inputCls} value={item.transactionDate} onChange={e => { const n = [...items]; n[idx].transactionDate = e.target.value; setItems(n); }} />
            <input className={inputCls} value={item.description} onChange={e => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} placeholder={t('الوصف', 'Description')} />
            <input type="number" className={inputCls} value={item.amount} onChange={e => { const n = [...items]; n[idx].amount = e.target.value; setItems(n); }} placeholder="0.00" />
            <select className={inputCls} value={item.type} onChange={e => { const n = [...items]; n[idx].type = e.target.value; setItems(n); }}>
              <option value="Debit">{t('مدين', 'Debit')}</option>
              <option value="Credit">{t('دائن', 'Credit')}</option>
            </select>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
        <textarea className={inputCls + " h-16 resize-none"} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button
        onClick={() => createMut.mutate({
          reconciliationDate: date, bankAccountName: bankAccount, statementBalance: Number(statementBalance), notes,
          items: items.filter(i => i.description && i.amount).map(i => ({ ...i, amount: Number(i.amount) })),
        })}
        disabled={!date || !bankAccount || !statementBalance || createMut.isPending}
        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
      >
        {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
        {t('إنشاء المطابقة', 'Create Reconciliation')}
      </button>
    </div>
  );
}

function ReconciliationDetail({ data, onClose }: { data: any; onClose: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const finalizeMut = useMutation({
    mutationFn: () => api.put(`/bank-reconciliation/${data.id}/finalize`),
    onSuccess: () => {
      toast({ title: t('تم إنهاء المطابقة', 'Reconciliation Finalized') });
      qc.invalidateQueries();
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  return (
    <div className="premium-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{t('تفاصيل المطابقة', 'Reconciliation Details')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card p-4 border-blue-500/20 bg-blue-500/5">
          <p className="text-xs text-muted-foreground">{t('رصيد الكشف', 'Statement')}</p>
          <p className="text-lg font-bold font-mono text-blue-400">{formatCurrency(Number(data.statementBalance))}</p>
        </div>
        <div className="premium-card p-4 border-green-500/20 bg-green-500/5">
          <p className="text-xs text-muted-foreground">{t('رصيد النظام', 'System')}</p>
          <p className="text-lg font-bold font-mono text-green-400">{formatCurrency(Number(data.systemBalance))}</p>
        </div>
        <div className={cn("premium-card p-4", Number(data.discrepancy) === 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5")}>
          <p className="text-xs text-muted-foreground">{t('الفرق', 'Discrepancy')}</p>
          <p className={cn("text-lg font-bold font-mono", Number(data.discrepancy) === 0 ? "text-green-400" : "text-red-400")}>{formatCurrency(Number(data.discrepancy))}</p>
        </div>
        <div className="premium-card p-4 border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground">{t('الحالة', 'Status')}</p>
          <p className="text-lg font-bold text-primary">{data.status}</p>
        </div>
      </div>

      {data.items?.length > 0 && (
        <div>
          <h4 className="text-sm font-bold mb-2">{t('بنود الكشف', 'Statement Items')} ({data.items.length})</h4>
          <div className="space-y-1">
            {data.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                <div className="flex items-center gap-3">
                  {item.type === 'Debit' ? <ArrowUp size={14} className="text-red-400" /> : <ArrowDown size={14} className="text-green-400" />}
                  <span className="font-mono text-xs">{item.transactionDate}</span>
                  <span>{item.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">{formatCurrency(Number(item.amount))}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs", item.matchStatus === 'Matched' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400")}>{item.matchStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.status === 'Draft' && (
        <button
          onClick={() => finalizeMut.mutate()}
          disabled={finalizeMut.isPending}
          className="px-6 py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm flex items-center gap-2 hover:bg-green-700"
        >
          {finalizeMut.isPending && <Loader2 size={14} className="animate-spin" />}
          <CheckCircle2 size={16} /> {t('إنهاء المطابقة', 'Finalize Reconciliation')}
        </button>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Wallet, Loader2, Send, ArrowRightLeft } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

export default function MobileWalletPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [tab, setTab] = useState<'payment' | 'transactions'>('payment');
  const [providers, setProviders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ provider: '', walletNumber: '', amount: '', clientId: '', loanId: '' });

  useEffect(() => { apiFetch('/mobile-wallet/providers').then(setProviders).catch(() => {}); }, []);
  useEffect(() => { if (tab === 'transactions') { setLoading(true); apiFetch('/mobile-wallet/transactions').then(setTransactions).catch(() => {}).finally(() => setLoading(false)); } }, [tab]);

  const initPayment = async () => {
    if (!form.provider || !form.walletNumber || !form.amount) { toast({ variant: 'destructive', title: 'Error', description: t('أكمل البيانات المطلوبة', 'Fill required fields') }); return; }
    try {
      const data = await apiFetch('/mobile-wallet/initiate-payment', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      toast({ title: t('نجاح', 'Success'), description: `${t('تم بدء الدفع', 'Payment initiated')} — Ref: ${data.transaction?.transaction_ref}` });
      setForm({ ...form, walletNumber: '', amount: '' });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  const statusColor = (s: string) => s === 'completed' ? 'text-green-400 bg-green-500/10' : s === 'failed' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10';

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Wallet className="text-lime-400" size={24} /> {t('المحافظ الإلكترونية', 'Mobile Wallet Integration')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('فودافون كاش، اورنج موني، انستاباي، ميزة', 'Vodafone Cash, Orange Money, InstaPay, Meeza')}</p>
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setTab('payment')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'payment' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><Send size={16} /> {t('دفعة جديدة', 'New Payment')}</button>
        <button onClick={() => setTab('transactions')} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium", tab === 'transactions' ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><ArrowRightLeft size={16} /> {t('المعاملات', 'Transactions')}</button>
      </div>

      {tab === 'payment' ? (
        <div className="max-w-lg p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('بدء دفعة عبر المحفظة', 'Initiate Wallet Payment')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((p: any) => (
              <button key={p.id} onClick={() => setForm({ ...form, provider: p.id })} className={cn("p-3 rounded-xl border text-sm text-center transition-all", form.provider === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary")}>
                {isRtl ? p.nameAr : p.name}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <input className="premium-input" placeholder={t('رقم المحفظة', 'Wallet Number')} value={form.walletNumber} onChange={e => setForm({ ...form, walletNumber: e.target.value })} />
            <input type="number" className="premium-input" placeholder={t('المبلغ (جنيه)', 'Amount (EGP)')} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <button onClick={initPayment} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Send size={16} /> {t('إرسال', 'Send')}</button>
          </div>
        </div>
      ) : loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-start px-4 py-3">{t('المزود', 'Provider')}</th><th className="text-start px-4 py-3">{t('الرقم', 'Number')}</th>
              <th className="text-start px-4 py-3">{t('المبلغ', 'Amount')}</th><th className="text-start px-4 py-3">{t('المرجع', 'Reference')}</th>
              <th className="text-start px-4 py-3">{t('الحالة', 'Status')}</th><th className="text-start px-4 py-3">{t('التاريخ', 'Date')}</th>
            </tr></thead>
            <tbody>{transactions.map((tx: any) => (
              <tr key={tx.id} className="border-b border-border/50"><td className="px-4 py-3">{tx.provider}</td><td className="px-4 py-3">{tx.wallet_number}</td><td className="px-4 py-3">{Number(tx.amount).toLocaleString()} EGP</td><td className="px-4 py-3 font-mono text-xs">{tx.transaction_ref}</td><td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded text-xs", statusColor(tx.status))}>{tx.status}</span></td><td className="px-4 py-3">{new Date(tx.created_at).toLocaleDateString()}</td></tr>
            ))}</tbody>
          </table>
          {transactions.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد معاملات', 'No transactions')}</p>}
        </div>
      )}
    </div>
  );
}

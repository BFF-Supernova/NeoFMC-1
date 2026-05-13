import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Building, Plus, Loader2, Users, ArrowRightLeft, BarChart3 } from 'lucide-react';

const API_BASE = '/api';
function getAuthHeaders(): Record<string, string> { const token = localStorage.getItem('neo_fmc_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; return h; }
async function apiFetch(path: string, options?: RequestInit) { const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) }, credentials: 'include' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || `Request failed: ${res.status}`); } return res.json(); }

type Tab = 'agents' | 'transactions' | 'reconciliation';

export default function AgentBankingPage() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('agents');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', phone: '', address: '', agentType: 'individual', commissionRate: '2', floatLimit: '50000' });

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'agents') setData(await apiFetch('/agent-banking/agents'));
      else if (tab === 'transactions') setData(await apiFetch('/agent-banking/transactions'));
      else setData(await apiFetch('/agent-banking/reconciliation'));
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [tab]);

  const createAgent = async () => {
    try {
      await apiFetch('/agent-banking/agents', { method: 'POST', body: JSON.stringify({ ...form, commissionRate: Number(form.commissionRate), floatLimit: Number(form.floatLimit) }) });
      toast({ title: t('نجاح', 'Success'), description: t('تم إضافة الوكيل', 'Agent created') });
      setShowForm(false); loadData();
    } catch (err: any) { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
  };

  const tabs: { key: Tab; icon: any; ar: string; en: string }[] = [
    { key: 'agents', icon: Users, ar: 'الوكلاء', en: 'Agents' },
    { key: 'transactions', icon: ArrowRightLeft, ar: 'المعاملات', en: 'Transactions' },
    { key: 'reconciliation', icon: BarChart3, ar: 'التسوية', en: 'Reconciliation' },
  ];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Building className="text-indigo-400" size={24} /> {t('الوكلاء المصرفيون', 'Agent Banking')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('إدارة الوكلاء والسيولة والعمولات', 'Manage agents, float, and commissions')}</p>
        </div>
        {tab === 'agents' && <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg transition-all font-medium text-sm"><Plus size={18} /> {t('وكيل جديد', 'New Agent')}</button>}
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map(tb => <button key={tb.key} onClick={() => setTab(tb.key)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === tb.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}><tb.icon size={16} /> {t(tb.ar, tb.en)}</button>)}
      </div>

      {showForm && (
        <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
          <h3 className="font-semibold">{t('إضافة وكيل', 'Add Agent')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('الاسم (EN)', 'Name')}</label><input className="premium-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('الاسم (AR)', 'Name (AR)')}</label><input className="premium-input" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('الهاتف', 'Phone')}</label><input className="premium-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('النوع', 'Type')}</label>
              <select className="premium-input" value={form.agentType} onChange={e => setForm({ ...form, agentType: e.target.value })}>
                <option value="individual">{t('فردي', 'Individual')}</option><option value="merchant">{t('تاجر', 'Merchant')}</option><option value="corporate">{t('شركة', 'Corporate')}</option>
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('العمولة %', 'Commission %')}</label><input type="number" step="0.01" className="premium-input" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{t('حد السيولة', 'Float Limit')}</label><input type="number" className="premium-input" value={form.floatLimit} onChange={e => setForm({ ...form, floatLimit: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={createAgent} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">{t('حفظ', 'Save')}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-secondary rounded-lg text-sm">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : tab === 'agents' ? (
        <div className="grid gap-4">
          {data.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('لا يوجد وكلاء', 'No agents yet')}</p> : data.map((a: any) => (
            <div key={a.id} className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{isRtl ? (a.name_ar || a.name) : a.name}</p>
                <span className={cn("px-3 py-1 rounded-full text-xs font-medium", a.status === 'active' ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10")}>{a.status}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                <div><span className="block text-xs">{t('النوع', 'Type')}</span>{a.agent_type}</div>
                <div><span className="block text-xs">{t('السيولة', 'Float')}</span>{Number(a.float_balance).toLocaleString()} / {Number(a.float_limit).toLocaleString()}</div>
                <div><span className="block text-xs">{t('العمولة', 'Commission')}</span>{a.commission_rate}%</div>
                <div><span className="block text-xs">{t('الهاتف', 'Phone')}</span>{a.phone}</div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'transactions' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-start px-4 py-3">{t('الوكيل', 'Agent')}</th><th className="text-start px-4 py-3">{t('النوع', 'Type')}</th>
              <th className="text-start px-4 py-3">{t('المبلغ', 'Amount')}</th><th className="text-start px-4 py-3">{t('التاريخ', 'Date')}</th>
            </tr></thead>
            <tbody>{data.map((tx: any) => (
              <tr key={tx.id} className="border-b border-border/50"><td className="px-4 py-3">{tx.agent_name || '-'}</td><td className="px-4 py-3">{tx.type}</td><td className="px-4 py-3">{Number(tx.amount).toLocaleString()} EGP</td><td className="px-4 py-3">{new Date(tx.created_at).toLocaleDateString()}</td></tr>
            ))}</tbody>
          </table>
          {data.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد معاملات', 'No transactions')}</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {data.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('لا توجد بيانات', 'No data')}</p> : data.map((r: any) => (
            <div key={r.id} className="p-4 bg-card rounded-xl border border-border">
              <p className="font-semibold mb-2">{r.name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="block text-xs text-muted-foreground">{t('المعاملات', 'Transactions')}</span>{r.transaction_count}</div>
                <div><span className="block text-xs text-muted-foreground">{t('المحصل', 'Collected')}</span>{Number(r.total_collected).toLocaleString()}</div>
                <div><span className="block text-xs text-muted-foreground">{t('المصروف', 'Disbursed')}</span>{Number(r.total_disbursed).toLocaleString()}</div>
                <div><span className="block text-xs text-muted-foreground">{t('العمولة', 'Commission')}</span>{Number(r.total_commission).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

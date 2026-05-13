import { useState } from 'react';
import {
  useListSalesAgents, useCreateSalesAgent, useUpdateSalesAgent, getListSalesAgentsQueryKey,
  useListCommissions, usePayCommission, getListCommissionsQueryKey,
  useListProductCommissions, useSetProductCommission, getListProductCommissionsQueryKey,
  useListFundProducts,
} from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, cn } from '@/lib/utils';
import { Users, Loader2, DollarSign, Plus, X, Edit2, CheckCircle, Package } from 'lucide-react';

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground block">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";
const selectCls = inputCls + " cursor-pointer";

export default function SalesAgents() {
  const { t, isRtl } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'agents' | 'commissions' | 'product-rates'>('agents');

  const { data: agents, isLoading: agentsLoading } = useListSalesAgents();
  const { data: commissions, isLoading: commLoading } = useListCommissions({ request: { query: { limit: 100 } } as any });
  const { data: productCommissions, isLoading: pcLoading } = useListProductCommissions();
  const { data: products } = useListFundProducts();

  const [agentModal, setAgentModal] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [agentForm, setAgentForm] = useState({
    agentName: '', agentNameAr: '', agentType: 'Individual',
    phone: '', email: '', nationalId: '', defaultCommissionPct: '',
    companyName: '',
  });
  const [agentError, setAgentError] = useState('');

  const [pcModal, setPcModal] = useState(false);
  const [pcForm, setPcForm] = useState({ agentId: '', productId: '', commissionPct: '' });

  const createAgent = useCreateSalesAgent({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListSalesAgentsQueryKey() }); setAgentModal(false); setEditAgent(null); setAgentError(''); },
    onError: (e: any) => setAgentError(e?.data?.message || 'Error creating agent'),
  }});
  const updateAgent = useUpdateSalesAgent({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListSalesAgentsQueryKey() }); setAgentModal(false); setEditAgent(null); setAgentError(''); },
    onError: (e: any) => setAgentError(e?.data?.message || 'Error updating agent'),
  }});
  const payCommission = usePayCommission({ mutation: {
    onSuccess: () => qc.invalidateQueries({ queryKey: getListCommissionsQueryKey() }),
  }});
  const setProductCommission = useSetProductCommission({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductCommissionsQueryKey() }); setPcModal(false); },
  }});

  function openNewAgent() {
    setEditAgent(null);
    setAgentForm({ agentName: '', agentNameAr: '', agentType: 'Individual', phone: '', email: '', nationalId: '', defaultCommissionPct: '', companyName: '' });
    setAgentError('');
    setAgentModal(true);
  }

  function openEditAgent(a: any) {
    setEditAgent(a);
    setAgentForm({
      agentName: a.agentName || '', agentNameAr: a.agentNameAr || '',
      agentType: a.agentType || 'Individual', phone: a.phone || '',
      email: a.email || '', nationalId: a.nationalId || '',
      defaultCommissionPct: a.defaultCommissionPct?.toString() || '',
      companyName: a.companyName || '',
    });
    setAgentError('');
    setAgentModal(true);
  }

  function submitAgent() {
    if (!agentForm.agentName || !agentForm.defaultCommissionPct) {
      setAgentError(t('يرجى ملء الحقول الإلزامية', 'Please fill required fields'));
      return;
    }
    const data = {
      agentName: agentForm.agentName,
      agentNameAr: agentForm.agentNameAr || undefined,
      agentType: agentForm.agentType,
      companyName: agentForm.companyName || undefined,
      phone: agentForm.phone || undefined,
      email: agentForm.email || undefined,
      nationalId: agentForm.nationalId || undefined,
      defaultCommissionPct: parseFloat(agentForm.defaultCommissionPct),
    };
    if (editAgent) {
      updateAgent.mutate({ id: editAgent.id, data } as any);
    } else {
      createAgent.mutate({ data } as any);
    }
  }

  const af = agentForm;
  const sa = (key: string, val: string) => setAgentForm(prev => ({ ...prev, [key]: val }));

  const pendingComm = commissions?.data.filter(c => c.status === 'Pending') || [];
  const paidComm = commissions?.data.filter(c => c.status === 'Paid') || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('وكلاء المبيعات والعمولات', 'Sales Agents & Commissions')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة مسوقي التمويل وعمولاتهم', 'Manage originators and their commissions')}</p>
        </div>
        {tab === 'agents' && (
          <button onClick={openNewAgent}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shrink-0">
            <Plus size={16} /> {t('وكيل جديد', 'New Agent')}
          </button>
        )}
        {tab === 'product-rates' && (
          <button onClick={() => { setPcForm({ agentId: '', productId: '', commissionPct: '' }); setPcModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shrink-0">
            <Plus size={16} /> {t('نسبة عمولة جديدة', 'Set Commission Rate')}
          </button>
        )}
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {[
          { key: 'agents', icon: Users, ar: 'الوكلاء', en: 'Agents' },
          { key: 'commissions', icon: DollarSign, ar: 'العمولات', en: 'Commissions' },
          { key: 'product-rates', icon: Package, ar: 'نسب المنتجات', en: 'Product Rates' },
        ].map(({ key, icon: Icon, ar, en }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={cn("px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap text-sm",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={16} /> {t(ar, en)}
          </button>
        ))}
      </div>

      {tab === 'agents' && (
        <div className="premium-card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم', 'Name')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاتصال', 'Contact')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العمولة الافتراضية', 'Default %')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجمالي المكتسب', 'Total Earned')}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agentsLoading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : agents?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('لا يوجد وكلاء — أضف وكيلاً جديداً', 'No agents yet — add your first agent')}</td></tr>
                ) : agents?.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">{isRtl ? agent.agentNameAr || agent.agentName : agent.agentName}</div>
                      {agent.agentNameAr && !isRtl && <div className="text-xs text-muted-foreground">{agent.agentNameAr}</div>}
                    </td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-secondary rounded text-xs">{agent.agentType === 'Individual' ? t('فرد', 'Individual') : t('شركة', 'Company')}</span></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground" dir="ltr">{(agent as any).phone || (agent as any).email || '-'}</td>
                    <td className="px-6 py-4 font-mono font-bold text-accent">{agent.defaultCommissionPct}%</td>
                    <td className="px-6 py-4 font-mono text-green-400">{formatCurrency(agent.totalEarned)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEditAgent(agent)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="space-y-4">
          {commissions && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="premium-card p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('إجمالي المعلقة', 'Total Pending')}</div>
                <div className="text-xl font-bold text-yellow-400">{formatCurrency(commissions.totalPending)}</div>
              </div>
              <div className="premium-card p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('إجمالي المدفوعة', 'Total Paid')}</div>
                <div className="text-xl font-bold text-green-400">{formatCurrency(commissions.totalPaid)}</div>
              </div>
              <div className="premium-card p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('معلقة', 'Pending Count')}</div>
                <div className="text-xl font-bold">{pendingComm.length}</div>
              </div>
              <div className="premium-card p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('مدفوعة', 'Paid Count')}</div>
                <div className="text-xl font-bold">{paidComm.length}</div>
              </div>
            </div>
          )}
          <div className="premium-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                  <tr>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الوكيل', 'Agent')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('مبلغ القرض', 'Loan Amount')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النسبة %', 'Rate %')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('قيمة العمولة', 'Commission')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commLoading ? (
                    <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : commissions?.data.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('لا توجد عمولات بعد', 'No commissions yet')}</td></tr>
                  ) : commissions?.data.map((comm) => (
                    <tr key={comm.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{comm.agentName}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{formatCurrency(comm.disbursedAmount)}</td>
                      <td className="px-6 py-4 font-mono text-accent">{comm.commissionPct}%</td>
                      <td className="px-6 py-4 font-mono font-bold text-primary">{formatCurrency(comm.commissionAmount)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded text-xs font-bold", comm.status === 'Paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400')}>
                          {comm.status === 'Paid' ? t('مدفوعة', 'Paid') : t('معلقة', 'Pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {comm.status === 'Pending' && (
                          <button
                            onClick={() => payCommission.mutate({ id: comm.id } as any)}
                            disabled={payCommission.isPending}
                            title={t('تسجيل كمدفوعة', 'Mark as Paid')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {payCommission.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            {t('دفع', 'Pay')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'product-rates' && (
        <div className="premium-card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الوكيل', 'Agent')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المنتج', 'Product')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('نسبة العمولة %', 'Commission %')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pcLoading ? (
                  <tr><td colSpan={3} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : (productCommissions as any[])?.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">{t('لا توجد نسب عمولات خاصة بالمنتجات', 'No product-specific rates set')}</td></tr>
                ) : (productCommissions as any[])?.map((pc: any) => (
                  <tr key={pc.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{pc.agentName}</td>
                    <td className="px-6 py-4">{products?.find(p => p.id === pc.productId)?.productName || pc.productId}</td>
                    <td className="px-6 py-4 font-mono font-bold text-accent">{pc.commissionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent Modal */}
      <Modal open={agentModal} onClose={() => { setAgentModal(false); setEditAgent(null); }} title={t(editAgent ? 'تعديل الوكيل' : 'وكيل مبيعات جديد', editAgent ? 'Edit Agent' : 'New Sales Agent')}>
        <div className="space-y-4">
          {agentError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{agentError}</div>}
          <Field label={t('الاسم (إنجليزي)', 'Name (English)')} required>
            <input className={inputCls} value={af.agentName} onChange={e => sa('agentName', e.target.value)} placeholder="Ahmed Mohamed" dir="ltr" />
          </Field>
          <Field label={t('الاسم (عربي)', 'Name (Arabic)')}>
            <input className={inputCls} value={af.agentNameAr} onChange={e => sa('agentNameAr', e.target.value)} placeholder="أحمد محمد" dir="rtl" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('نوع الوكيل', 'Agent Type')} required>
              <select className={selectCls} value={af.agentType} onChange={e => sa('agentType', e.target.value)}>
                <option value="Individual">{t('فرد', 'Individual')}</option>
                <option value="Company">{t('شركة', 'Company')}</option>
              </select>
            </Field>
            <Field label={t('العمولة الافتراضية %', 'Default Commission %')} required>
              <input className={inputCls} type="number" step="0.01" value={af.defaultCommissionPct} onChange={e => sa('defaultCommissionPct', e.target.value)} placeholder="3.5" />
            </Field>
          </div>
          {af.agentType === 'Company' && (
            <Field label={t('اسم الشركة', 'Company Name')}>
              <input className={inputCls} value={af.companyName} onChange={e => sa('companyName', e.target.value)} placeholder={t('اسم الشركة', 'Company name')} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('رقم الهاتف', 'Phone')}>
              <input className={inputCls} value={af.phone} onChange={e => sa('phone', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
            </Field>
            <Field label={t('البريد الإلكتروني', 'Email')}>
              <input className={inputCls} type="email" value={af.email} onChange={e => sa('email', e.target.value)} placeholder="agent@email.com" dir="ltr" />
            </Field>
          </div>
          <Field label={t('الرقم القومي', 'National ID')}>
            <input className={inputCls} value={af.nationalId} onChange={e => sa('nationalId', e.target.value)} placeholder="2XXXXXXXXXXXXXXXXX" dir="ltr" maxLength={14} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={submitAgent} disabled={createAgent.isPending || updateAgent.isPending}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {(createAgent.isPending || updateAgent.isPending) ? <Loader2 className="animate-spin" size={18} /> : (editAgent ? t('حفظ', 'Save') : t('إنشاء الوكيل', 'Create Agent'))}
            </button>
            <button onClick={() => { setAgentModal(false); setEditAgent(null); }} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Product Commission Rate Modal */}
      <Modal open={pcModal} onClose={() => setPcModal(false)} title={t('تحديد نسبة عمولة للمنتج', 'Set Product Commission Rate')}>
        <div className="space-y-4">
          <Field label={t('الوكيل', 'Agent')} required>
            <select className={selectCls} value={pcForm.agentId} onChange={e => setPcForm(p => ({ ...p, agentId: e.target.value }))}>
              <option value="">{t('اختر وكيلاً...', 'Select agent...')}</option>
              {agents?.map(a => <option key={a.id} value={a.id}>{isRtl ? a.agentNameAr || a.agentName : a.agentName}</option>)}
            </select>
          </Field>
          <Field label={t('المنتج التمويلي', 'Fund Product')} required>
            <select className={selectCls} value={pcForm.productId} onChange={e => setPcForm(p => ({ ...p, productId: e.target.value }))}>
              <option value="">{t('اختر منتجاً...', 'Select product...')}</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
            </select>
          </Field>
          <Field label={t('نسبة العمولة %', 'Commission Rate %')} required>
            <input className={inputCls} type="number" step="0.01" value={pcForm.commissionPct} onChange={e => setPcForm(p => ({ ...p, commissionPct: e.target.value }))} placeholder="5" />
          </Field>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setProductCommission.mutate({ data: { agentId: pcForm.agentId, productId: pcForm.productId, commissionPct: parseFloat(pcForm.commissionPct) } } as any)}
              disabled={setProductCommission.isPending || !pcForm.agentId || !pcForm.productId || !pcForm.commissionPct}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {setProductCommission.isPending ? <Loader2 className="animate-spin" size={18} /> : t('حفظ النسبة', 'Save Rate')}
            </button>
            <button onClick={() => setPcModal(false)} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { CreditCard, Settings, Loader2, Plus, RefreshCw, Lock, Eye } from 'lucide-react';

export default function Epayments() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const [tab, setTab] = useState<'transactions' | 'configs'>('transactions');
  const [transactions, setTransactions] = useState<any>({ data: [], total: 0 });
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configForm, setConfigForm] = useState({ gateway: '', displayName: '', merchantId: '', apiKey: '', secretKey: '', callbackUrl: '', environment: 'sandbox' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txns, cfgs] = await Promise.all([
        api.get<any>('/epayments/transactions'),
        api.get<any[]>('/epayments/configs'),
      ]);
      setTransactions(txns);
      setConfigs(cfgs);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleSaveConfig = async () => {
    try {
      await api.post('/epayments/configs', configForm);
      setShowConfigForm(false);
      setConfigForm({ gateway: '', displayName: '', merchantId: '', apiKey: '', secretKey: '', callbackUrl: '', environment: 'sandbox' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleReconcile = async (id: string) => {
    try { await api.post(`/epayments/transactions/${id}/reconcile`); loadData(); } catch (err) { handleApiError(err); }
  };

  const handleToggleConfig = async (id: string, isActive: boolean) => {
    try { await api.put(`/epayments/configs/${id}`, { isActive: !isActive }); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('المدفوعات الإلكترونية', 'E-Payments')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة بوابات الدفع والمعاملات', 'Manage payment gateways and transactions')}</p>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button className={cn("px-6 py-3 font-medium transition-colors border-b-2", tab === 'transactions' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('transactions')}>
          <CreditCard className="inline mr-2" size={16} />{t('المعاملات', 'Transactions')}
        </button>
        <button className={cn("px-6 py-3 font-medium transition-colors border-b-2", tab === 'configs' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('configs')}>
          <Settings className="inline mr-2" size={16} />{t('إعدادات البوابات', 'Gateway Configs')}
        </button>
      </div>

      {tab === 'transactions' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('البوابة', 'Gateway')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العميل', 'Customer')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('تسوية', 'Reconcile')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : transactions.data?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('لا توجد معاملات', 'No transactions')}</td></tr>
                ) : (
                  transactions.data?.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium capitalize">{txn.gateway}</td>
                      <td className="px-6 py-4 font-bold text-primary">{formatCurrency(txn.amount)}</td>
                      <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", getStatusColor(txn.status))}>{txn.status}</span></td>
                      <td className="px-6 py-4 text-muted-foreground">{txn.customerName || txn.customerPhone || '-'}</td>
                      <td className="px-6 py-4">{formatDate(txn.createdAt)}</td>
                      <td className="px-6 py-4">
                        {!txn.glReconciled && txn.status === 'Completed' && (
                          <button onClick={() => handleReconcile(txn.id)} className="text-primary hover:text-primary/80"><RefreshCw size={16} /></button>
                        )}
                        {txn.glReconciled && <span className="text-green-400 text-xs">{t('تمت', 'Done')}</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'configs' && (
        <div className="space-y-4">
          {!isSuperAdmin && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Eye size={16} className="text-blue-400" />
              <span className="text-sm text-blue-300">{t('عرض فقط — التكوين متاح لمسؤول النظام فقط', 'View only — configuration is managed by Super Admin')}</span>
            </div>
          )}

          {isSuperAdmin && (
            <button onClick={() => setShowConfigForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
              <Plus size={18} /> {t('إضافة بوابة', 'Add Gateway')}
            </button>
          )}

          {isSuperAdmin && showConfigForm && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-lg font-bold">{t('إعداد بوابة دفع', 'Configure Payment Gateway')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={configForm.gateway} onChange={e => setConfigForm({ ...configForm, gateway: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
                  <option value="">{t('اختر البوابة', 'Select Gateway')}</option>
                  <option value="Fawry">Fawry</option>
                  <option value="Paymob">Paymob</option>
                </select>
                <input placeholder={t('اسم العرض', 'Display Name')} value={configForm.displayName} onChange={e => setConfigForm({ ...configForm, displayName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
                <input placeholder={t('معرف التاجر', 'Merchant ID')} value={configForm.merchantId} onChange={e => setConfigForm({ ...configForm, merchantId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
                <input placeholder={t('مفتاح API', 'API Key')} value={configForm.apiKey} onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
                <input placeholder={t('المفتاح السري', 'Secret Key')} value={configForm.secretKey} onChange={e => setConfigForm({ ...configForm, secretKey: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" type="password" />
                <input placeholder={t('رابط الاسترجاع', 'Callback URL')} value={configForm.callbackUrl} onChange={e => setConfigForm({ ...configForm, callbackUrl: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
                <select value={configForm.environment} onChange={e => setConfigForm({ ...configForm, environment: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveConfig} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('حفظ', 'Save')}</button>
                <button onClick={() => setShowConfigForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configs.length === 0 && !loading && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                {t('لا توجد بوابات دفع مكونة', 'No payment gateways configured')}
              </div>
            )}
            {configs.map((cfg: any) => (
              <div key={cfg.id} className="premium-card p-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold capitalize">{cfg.gateway}</h4>
                  {isSuperAdmin ? (
                    <button onClick={() => handleToggleConfig(cfg.id, cfg.isActive)} className={cn("px-3 py-1 rounded text-xs", cfg.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                      {cfg.isActive ? t('مفعل', 'Active') : t('معطل', 'Inactive')}
                    </button>
                  ) : (
                    <span className={cn("px-3 py-1 rounded text-xs", cfg.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                      {cfg.isActive ? t('مفعل', 'Active') : t('معطل', 'Inactive')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{cfg.displayName || cfg.gateway}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('البيئة', 'Environment')}: {cfg.environment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

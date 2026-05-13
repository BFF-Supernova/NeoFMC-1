import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PiggyBank, Plus, ArrowDownCircle, ArrowUpCircle, Eye, X, DollarSign, Users, Package } from 'lucide-react';

export default function Savings() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'accounts' | 'products'>('accounts');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showTxn, setShowTxn] = useState<{ accountId: string; type: 'Deposit' | 'Withdrawal' } | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [productForm, setProductForm] = useState({ nameAr: '', nameEn: '', productType: 'Voluntary', annualInterestRate: 0, compoundingFrequency: 'Monthly', minimumBalance: 0, minimumOpeningAmount: 0, maximumBalance: '', withdrawalLimitPerMonth: '', lockInPeriodDays: 0, dormancyPeriodDays: 365, description: '', descriptionAr: '' });
  const [accountForm, setAccountForm] = useState({ clientId: '', productId: '', branchId: '', initialDeposit: 0 });
  const [txnForm, setTxnForm] = useState({ amount: 0, paymentMethod: 'Cash', referenceNumber: '', description: '' });

  const { data: products } = useQuery({ queryKey: ['/api/savings/products'], queryFn: () => api('/api/savings/products') });
  const { data: accounts } = useQuery({ queryKey: ['/api/savings/accounts', page], queryFn: () => api(`/api/savings/accounts?page=${page}&limit=20`) });
  const { data: dashboard } = useQuery({ queryKey: ['/api/savings/dashboard'], queryFn: () => api('/api/savings/dashboard') });
  const { data: clients } = useQuery({ queryKey: ['/api/clients'], queryFn: () => api('/api/clients?limit=100') });
  const { data: branches } = useQuery({ queryKey: ['/api/branches'], queryFn: () => api('/api/branches') });
  const { data: txnHistory } = useQuery({ queryKey: ['/api/savings/transactions', showHistory], queryFn: () => api(`/api/savings/accounts/${showHistory}/transactions`), enabled: !!showHistory });

  const createProduct = useMutation({ mutationFn: (data: any) => api('/api/savings/products', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/savings/products'] }); setShowNewProduct(false); toast({ title: t('تم إنشاء المنتج', 'Product created') }); } });
  const createAccount = useMutation({ mutationFn: (data: any) => api('/api/savings/accounts', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/savings/accounts'] }); qc.invalidateQueries({ queryKey: ['/api/savings/dashboard'] }); setShowNewAccount(false); toast({ title: t('تم فتح الحساب', 'Account opened') }); } });
  const doTransaction = useMutation({
    mutationFn: (data: { accountId: string; type: string; payload: any }) => api(`/api/savings/accounts/${data.accountId}/${data.type === 'Deposit' ? 'deposit' : 'withdraw'}`, { method: 'POST', body: JSON.stringify(data.payload), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/savings'] }); setShowTxn(null); toast({ title: t('تمت العملية بنجاح', 'Transaction completed') }); },
    onError: (err: any) => { toast({ title: t('خطأ', 'Error'), description: err?.message || 'Failed', variant: 'destructive' }); },
  });

  const formatCurrency = (v: any) => typeof v === 'number' ? `${v.toLocaleString()} ${t('ج.م', 'EGP')}` : v;

  const tabs = [
    { key: 'accounts' as const, label: t('الحسابات', 'Accounts'), icon: Users },
    { key: 'products' as const, label: t('المنتجات', 'Products'), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PiggyBank className="h-7 w-7 text-primary" />
            {t('الادخار', 'Savings')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('إدارة حسابات ومنتجات الادخار', 'Manage savings accounts and products')}</p>
        </div>
        <div className="flex gap-2">
          {tab === 'products' && ['TenantAdmin', 'BranchManager', 'SuperAdmin'].includes(user?.role || '') && (
            <button onClick={() => setShowNewProduct(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90"><Plus className="h-4 w-4" />{t('منتج جديد', 'New Product')}</button>
          )}
          {tab === 'accounts' && (
            <button onClick={() => setShowNewAccount(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90"><Plus className="h-4 w-4" />{t('فتح حساب', 'Open Account')}</button>
          )}
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('الحسابات النشطة', 'Active Accounts')}</div><div className="text-2xl font-bold mt-1">{dashboard.activeAccounts}</div></div>
          <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('إجمالي الأرصدة', 'Total Balance')}</div><div className="text-2xl font-bold mt-1">{formatCurrency(dashboard.totalBalance)}</div></div>
          <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('المنتجات النشطة', 'Active Products')}</div><div className="text-2xl font-bold mt-1">{dashboard.activeProducts}</div></div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(t2 => (
          <button key={t2.key} onClick={() => setTab(t2.key)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t2.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t2.icon className="h-4 w-4 inline mr-1" />{t2.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-start p-3">{t('رقم الحساب', 'Account #')}</th>
              <th className="text-start p-3">{t('العميل', 'Client')}</th>
              <th className="text-start p-3">{t('المنتج', 'Product')}</th>
              <th className="text-start p-3">{t('الرصيد', 'Balance')}</th>
              <th className="text-start p-3">{t('الحالة', 'Status')}</th>
              <th className="text-start p-3">{t('إجراءات', 'Actions')}</th>
            </tr></thead>
            <tbody>
              {accounts?.data?.map((acc: any) => (
                <tr key={acc.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3 font-mono text-xs">{acc.accountNumber}</td>
                  <td className="p-3">{isRtl ? acc.clientNameAr : (acc.clientNameEn || acc.clientNameAr)}</td>
                  <td className="p-3">{isRtl ? acc.productNameAr : (acc.productNameEn || acc.productNameAr)}</td>
                  <td className="p-3 font-semibold">{formatCurrency(acc.balance)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${acc.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>{acc.status}</span></td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {acc.status === 'Active' && (<>
                        <button onClick={() => { setShowTxn({ accountId: acc.id, type: 'Deposit' }); setTxnForm({ amount: 0, paymentMethod: 'Cash', referenceNumber: '', description: '' }); }} className="text-green-600 hover:text-green-800 p-1" title={t('إيداع', 'Deposit')}><ArrowDownCircle className="h-4 w-4" /></button>
                        <button onClick={() => { setShowTxn({ accountId: acc.id, type: 'Withdrawal' }); setTxnForm({ amount: 0, paymentMethod: 'Cash', referenceNumber: '', description: '' }); }} className="text-red-600 hover:text-red-800 p-1" title={t('سحب', 'Withdraw')}><ArrowUpCircle className="h-4 w-4" /></button>
                      </>)}
                      <button onClick={() => setShowHistory(acc.id)} className="text-blue-600 hover:text-blue-800 p-1" title={t('السجل', 'History')}><Eye className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!accounts?.data || accounts.data.length === 0) && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('لا توجد حسابات', 'No accounts found')}</td></tr>}
            </tbody>
          </table>
          {accounts?.total > 20 && (
            <div className="flex justify-center gap-2 p-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-muted text-sm disabled:opacity-50">{t('السابق', 'Previous')}</button>
              <span className="px-3 py-1 text-sm">{page} / {Math.ceil(accounts.total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= accounts.total} className="px-3 py-1 rounded bg-muted text-sm disabled:opacity-50">{t('التالي', 'Next')}</button>
            </div>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.data?.map((prod: any) => (
            <div key={prod.id} className="premium-card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{isRtl ? prod.nameAr : (prod.nameEn || prod.nameAr)}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${prod.productType === 'Voluntary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : prod.productType === 'Mandatory' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : prod.productType === 'FixedDeposit' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>{prod.productType}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${prod.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800'}`}>{prod.isActive ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('معدل الفائدة', 'Interest Rate')}</span><span className="font-medium">{prod.annualInterestRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('الحد الأدنى للرصيد', 'Min Balance')}</span><span>{formatCurrency(prod.minimumBalance)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('الحد الأدنى للفتح', 'Min Opening')}</span><span>{formatCurrency(prod.minimumOpeningAmount)}</span></div>
                {prod.compoundingFrequency && <div className="flex justify-between"><span className="text-muted-foreground">{t('فترة التجميع', 'Compounding')}</span><span>{prod.compoundingFrequency}</span></div>}
                {prod.lockInPeriodDays > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t('فترة الحجز', 'Lock-in')}</span><span>{prod.lockInPeriodDays} {t('يوم', 'days')}</span></div>}
              </div>
            </div>
          ))}
          {(!products?.data || products.data.length === 0) && <div className="col-span-full text-center text-muted-foreground py-12">{t('لا توجد منتجات', 'No products found')}</div>}
        </div>
      )}

      {showNewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('منتج ادخار جديد', 'New Savings Product')}</h3>
              <button onClick={() => setShowNewProduct(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground">{t('الاسم (عربي)*', 'Name (Arabic)*')}</label><input className="premium-input w-full mt-1" value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('الاسم (انجليزي)', 'Name (English)')}</label><input className="premium-input w-full mt-1" value={productForm.nameEn} onChange={e => setProductForm(f => ({ ...f, nameEn: e.target.value }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('النوع', 'Type')}</label>
                <select className="premium-input w-full mt-1" value={productForm.productType} onChange={e => setProductForm(f => ({ ...f, productType: e.target.value }))}>
                  <option value="Voluntary">{t('اختياري', 'Voluntary')}</option>
                  <option value="Mandatory">{t('إلزامي', 'Mandatory')}</option>
                  <option value="FixedDeposit">{t('وديعة ثابتة', 'Fixed Deposit')}</option>
                  <option value="GroupSavings">{t('ادخار جماعي', 'Group Savings')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-muted-foreground">{t('معدل الفائدة %', 'Interest Rate %')}</label><input type="number" step="0.01" className="premium-input w-full mt-1" value={productForm.annualInterestRate} onChange={e => setProductForm(f => ({ ...f, annualInterestRate: Number(e.target.value) }))} /></div>
                <div><label className="text-sm text-muted-foreground">{t('فترة التجميع', 'Compounding')}</label>
                  <select className="premium-input w-full mt-1" value={productForm.compoundingFrequency} onChange={e => setProductForm(f => ({ ...f, compoundingFrequency: e.target.value }))}>
                    <option value="Daily">{t('يومي', 'Daily')}</option><option value="Monthly">{t('شهري', 'Monthly')}</option><option value="Quarterly">{t('ربع سنوي', 'Quarterly')}</option><option value="Annually">{t('سنوي', 'Annually')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-muted-foreground">{t('الحد الأدنى للرصيد', 'Min Balance')}</label><input type="number" className="premium-input w-full mt-1" value={productForm.minimumBalance} onChange={e => setProductForm(f => ({ ...f, minimumBalance: Number(e.target.value) }))} /></div>
                <div><label className="text-sm text-muted-foreground">{t('الحد الأدنى للفتح', 'Min Opening')}</label><input type="number" className="premium-input w-full mt-1" value={productForm.minimumOpeningAmount} onChange={e => setProductForm(f => ({ ...f, minimumOpeningAmount: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-muted-foreground">{t('فترة الحجز (أيام)', 'Lock-in (days)')}</label><input type="number" className="premium-input w-full mt-1" value={productForm.lockInPeriodDays} onChange={e => setProductForm(f => ({ ...f, lockInPeriodDays: Number(e.target.value) }))} /></div>
                <div><label className="text-sm text-muted-foreground">{t('حد السحب/شهر', 'Withdrawals/month')}</label><input type="number" className="premium-input w-full mt-1" value={productForm.withdrawalLimitPerMonth} onChange={e => setProductForm(f => ({ ...f, withdrawalLimitPerMonth: e.target.value }))} /></div>
              </div>
              <button onClick={() => createProduct.mutate(productForm)} disabled={createProduct.isPending || !productForm.nameAr} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium disabled:opacity-50 mt-2">{createProduct.isPending ? '...' : t('إنشاء المنتج', 'Create Product')}</button>
            </div>
          </div>
        </div>
      )}

      {showNewAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('فتح حساب ادخار', 'Open Savings Account')}</h3>
              <button onClick={() => setShowNewAccount(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground">{t('العميل*', 'Client*')}</label>
                <select className="premium-input w-full mt-1" value={accountForm.clientId} onChange={e => setAccountForm(f => ({ ...f, clientId: e.target.value }))}>
                  <option value="">{t('اختر العميل', 'Select client')}</option>
                  {clients?.data?.map((c: any) => <option key={c.id} value={c.id}>{isRtl ? c.fullNameAr : (c.fullNameEn || c.fullNameAr)} - {c.nationalId}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('المنتج*', 'Product*')}</label>
                <select className="premium-input w-full mt-1" value={accountForm.productId} onChange={e => setAccountForm(f => ({ ...f, productId: e.target.value }))}>
                  <option value="">{t('اختر المنتج', 'Select product')}</option>
                  {products?.data?.filter((p: any) => p.isActive).map((p: any) => <option key={p.id} value={p.id}>{isRtl ? p.nameAr : (p.nameEn || p.nameAr)}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('الفرع', 'Branch')}</label>
                <select className="premium-input w-full mt-1" value={accountForm.branchId} onChange={e => setAccountForm(f => ({ ...f, branchId: e.target.value }))}>
                  <option value="">{t('اختر الفرع', 'Select branch')}</option>
                  {(Array.isArray(branches) ? branches : []).map((b: any) => <option key={b.id} value={b.id}>{isRtl ? (b.branchNameAr || b.branchNameEn) : (b.branchNameEn || b.branchNameAr)}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('الإيداع الأولي', 'Initial Deposit')}</label><input type="number" className="premium-input w-full mt-1" value={accountForm.initialDeposit} onChange={e => setAccountForm(f => ({ ...f, initialDeposit: Number(e.target.value) }))} /></div>
              <button onClick={() => createAccount.mutate(accountForm)} disabled={createAccount.isPending || !accountForm.clientId || !accountForm.productId} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium disabled:opacity-50 mt-2">{createAccount.isPending ? '...' : t('فتح الحساب', 'Open Account')}</button>
            </div>
          </div>
        </div>
      )}

      {showTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{showTxn.type === 'Deposit' ? t('إيداع', 'Deposit') : t('سحب', 'Withdrawal')}</h3>
              <button onClick={() => setShowTxn(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground">{t('المبلغ*', 'Amount*')}</label><input type="number" className="premium-input w-full mt-1" value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('طريقة الدفع', 'Payment Method')}</label>
                <select className="premium-input w-full mt-1" value={txnForm.paymentMethod} onChange={e => setTxnForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="Cash">{t('نقدي', 'Cash')}</option><option value="BankTransfer">{t('تحويل بنكي', 'Bank Transfer')}</option><option value="E-Payment">{t('دفع إلكتروني', 'E-Payment')}</option>
                </select>
              </div>
              <div><label className="text-sm text-muted-foreground">{t('رقم المرجع', 'Reference')}</label><input className="premium-input w-full mt-1" value={txnForm.referenceNumber} onChange={e => setTxnForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
              <div><label className="text-sm text-muted-foreground">{t('ملاحظات', 'Notes')}</label><input className="premium-input w-full mt-1" value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} /></div>
              <button onClick={() => doTransaction.mutate({ accountId: showTxn.accountId, type: showTxn.type, payload: txnForm })} disabled={doTransaction.isPending || txnForm.amount <= 0} className={`w-full py-2.5 rounded-lg font-medium disabled:opacity-50 mt-2 text-white ${showTxn.type === 'Deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>{doTransaction.isPending ? '...' : showTxn.type === 'Deposit' ? t('تأكيد الإيداع', 'Confirm Deposit') : t('تأكيد السحب', 'Confirm Withdrawal')}</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('سجل المعاملات', 'Transaction History')}</h3>
              <button onClick={() => setShowHistory(null)}><X className="h-5 w-5" /></button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="text-start p-2">{t('التاريخ', 'Date')}</th>
                <th className="text-start p-2">{t('النوع', 'Type')}</th>
                <th className="text-start p-2">{t('المبلغ', 'Amount')}</th>
                <th className="text-start p-2">{t('الرصيد بعد', 'Balance After')}</th>
                <th className="text-start p-2">{t('بواسطة', 'By')}</th>
              </tr></thead>
              <tbody>
                {txnHistory?.data?.map((txn: any) => (
                  <tr key={txn.id} className="border-b border-border/50">
                    <td className="p-2 text-xs">{new Date(txn.createdAt).toLocaleDateString()}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${txn.transactionType === 'Deposit' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : txn.transactionType === 'Withdrawal' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-800'}`}>{txn.transactionType}</span></td>
                    <td className="p-2 font-semibold">{formatCurrency(txn.amount)}</td>
                    <td className="p-2">{formatCurrency(txn.balanceAfter)}</td>
                    <td className="p-2 text-xs text-muted-foreground">{txn.performedByName}</td>
                  </tr>
                ))}
                {(!txnHistory?.data || txnHistory.data.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('لا توجد معاملات', 'No transactions')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

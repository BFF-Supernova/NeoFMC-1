import { useState } from 'react';
import { useSimulateLoan, useListClients, useListFundProducts, useCreateLoanRequest } from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, cn } from '@/lib/utils';
import { Calculator as CalcIcon, Loader2, FileSpreadsheet, FileText, XCircle, Plus, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function Calculator() {
  const { t, isRtl } = useLanguage();
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [formData, setFormData] = useState({
    amount: 10000,
    termMonths: 12,
    interestRate: 15,
    amortizationMethod: 'Monthly',
    adminFeePct: 2,
    insuranceFeePct: 1,
  });

  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const simulateMutation = useSimulateLoan();
  const { data: clients } = useListClients({ request: { query: { limit: 100 } } as any });
  const { data: products } = useListFundProducts();

  const [createFormData, setCreateFormData] = useState({
    clientId: '', productId: '', notes: ''
  });

  const createMutation = useCreateLoanRequest({
    mutation: {
      onSuccess: () => {
        toast({ title: t('تم بنجاح', 'Success'), description: t('تم إنشاء طلب التمويل', 'Loan request created successfully') });
        setShowCreateDialog(false);
        navigate('/loan-requests');
      }
    }
  });

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) return;
    const product = products?.find((p: any) => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        interestRate: Number(product.interestRate) || prev.interestRate,
        amortizationMethod: product.amortizationMethod || prev.amortizationMethod,
        adminFeePct: Number(product.adminFeePct) || 0,
        insuranceFeePct: Number(product.insuranceFeePct) || 0,
      }));
    }
  };

  const selectedProduct = products?.find((p: any) => p.id === selectedProductId) as any;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    simulateMutation.mutate({ data: formData });
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: {
      clientId: createFormData.clientId,
      productId: createFormData.productId || selectedProductId,
      requestedAmount: formData.amount,
      termMonths: formData.termMonths,
      notes: createFormData.notes || `Loan calculator simulation: ${formatCurrency(formData.amount)} over ${formData.termMonths} months at ${formData.interestRate}% interest`,
    } as any });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <CalcIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('حاسبة التمويل', 'Loan Calculator')}</h2>
          <p className="text-muted-foreground">{t('محاكاة جدول السداد والرسوم', 'Simulate repayment schedule and fees')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleSimulate} className="premium-card p-6 space-y-5">
            <h3 className="text-lg font-bold border-b border-border pb-3 mb-4">{t('محددات القرض', 'Loan Parameters')}</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Package size={14} className="text-primary" />
                {t('منتج التمويل', 'Fund Product')}
              </label>
              <select
                className="premium-input"
                value={selectedProductId}
                onChange={e => handleProductChange(e.target.value)}
              >
                <option value="">{t('-- اختر المنتج --', '-- Select Product --')}</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.productName} ({Number(p.interestRate)}%)</option>
                ))}
              </select>
              {selectedProduct && (
                <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg space-y-0.5">
                  <p>{t('الحد الأدنى', 'Min')}: {formatCurrency(selectedProduct.minAmount)} — {t('الأقصى', 'Max')}: {formatCurrency(selectedProduct.maxAmount)}</p>
                  <p>{t('المدة', 'Term')}: {selectedProduct.minTermMonths}-{selectedProduct.maxTermMonths} {t('شهر', 'months')}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('المبلغ المطلوب (ج.م)', 'Requested Amount (EGP)')}</label>
              <input type="number" className="premium-input text-lg font-mono" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('المدة (أشهر)', 'Term (Months)')}</label>
                <input type="number" className="premium-input font-mono" value={formData.termMonths} onChange={e => setFormData({...formData, termMonths: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('الفائدة (%)', 'Interest Rate (%)')}</label>
                <input type="number" step="0.1" className="premium-input font-mono bg-secondary/50" value={formData.interestRate} readOnly={!!selectedProductId} onChange={e => { if (!selectedProductId) setFormData({...formData, interestRate: Number(e.target.value)}); }} />
                {selectedProductId && <p className="text-[10px] text-muted-foreground">{t('محدد من المنتج', 'Set by product')}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('طريقة السداد', 'Amortization')}</label>
              <select className="premium-input" value={formData.amortizationMethod} disabled={!!selectedProductId} onChange={e => setFormData({...formData, amortizationMethod: e.target.value})}>
                <option value="Monthly">{t('شهري', 'Monthly')}</option>
                <option value="Daily">{t('يومي', 'Daily')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('رسوم إدارية (%)', 'Admin Fee (%)')}</label>
                <input type="number" step="0.1" className="premium-input font-mono bg-secondary/50" value={formData.adminFeePct} readOnly={!!selectedProductId} onChange={e => { if (!selectedProductId) setFormData({...formData, adminFeePct: Number(e.target.value)}); }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('تأمين (%)', 'Insurance (%)')}</label>
                <input type="number" step="0.1" className="premium-input font-mono bg-secondary/50" value={formData.insuranceFeePct} readOnly={!!selectedProductId} onChange={e => { if (!selectedProductId) setFormData({...formData, insuranceFeePct: Number(e.target.value)}); }} />
              </div>
            </div>

            <button type="submit" disabled={simulateMutation.isPending} className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-bold mt-4">
              {simulateMutation.isPending ? <Loader2 className="animate-spin" /> : <>{t('احسب', 'Calculate')} <CalcIcon size={18}/></>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {simulateMutation.data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="premium-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('القسط الشهري', 'Monthly Installment')}</p>
                  <p className="text-2xl font-display font-bold text-primary mt-1">{formatCurrency(simulateMutation.data.monthlyInstallment)}</p>
                </div>
                <div className="premium-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('إجمالي الفوائد', 'Total Interest')}</p>
                  <p className="text-2xl font-display font-bold text-orange-400 mt-1">{formatCurrency(simulateMutation.data.totalInterest)}</p>
                </div>
                <div className="premium-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('إجمالي السداد', 'Total Repayment')}</p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">{formatCurrency(simulateMutation.data.totalRepayment)}</p>
                </div>
                <div className="premium-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('صافي المنصرف', 'Net Disbursement')}</p>
                  <p className="text-2xl font-display font-bold text-green-400 mt-1">{formatCurrency(simulateMutation.data.netDisbursement)}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-through">{formatCurrency(formData.amount)}</p>
                </div>
                <div className="premium-card p-4 text-center sm:col-span-2 flex items-center justify-between px-6">
                   <div className="text-left">
                     <p className="text-sm text-muted-foreground">{t('الرسوم الإدارية', 'Admin Fee')}: <span className="font-mono text-foreground">{formatCurrency(simulateMutation.data.adminFee)}</span></p>
                     <p className="text-sm text-muted-foreground mt-1">{t('التأمين', 'Insurance')}: <span className="font-mono text-foreground">{formatCurrency(simulateMutation.data.insuranceFee)}</span></p>
                   </div>
                   <FileSpreadsheet className="text-muted-foreground opacity-20" size={48} />
                </div>
              </div>

              <button
                onClick={() => {
                  setCreateFormData(prev => ({ ...prev, productId: selectedProductId }));
                  setShowCreateDialog(true);
                }}
                className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl shadow-lg shadow-primary/20 font-bold text-base transition-all"
              >
                <FileText size={20} />
                {t('إنشاء طلب تمويل بهذه البيانات', 'Create Loan Request with These Parameters')}
                <Plus size={18} />
              </button>

              <div className="premium-card overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/30 font-bold">
                  {t('جدول السداد', 'Amortization Schedule')}
                </div>
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-sm text-center">
                    <thead className="text-xs text-muted-foreground uppercase sticky top-0 bg-card border-b border-border shadow-sm">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">{t('أصل المبلغ', 'Principal')}</th>
                        <th className="px-4 py-3">{t('الفائدة', 'Interest')}</th>
                        <th className="px-4 py-3">{t('القسط', 'Installment')}</th>
                        <th className="px-4 py-3">{t('الرصيد المتبقي', 'Balance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {simulateMutation.data.schedule.map((row) => (
                        <tr key={row.month} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-muted-foreground">{row.month}</td>
                          <td className="px-4 py-2.5 text-blue-400/80">{formatCurrency(row.principal)}</td>
                          <td className="px-4 py-2.5 text-orange-400/80">{formatCurrency(row.interest)}</td>
                          <td className="px-4 py-2.5 font-bold">{formatCurrency(row.total)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(row.remainingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center premium-card border-dashed bg-transparent p-12 text-muted-foreground">
              <CalcIcon size={48} className="opacity-20 mb-4" />
              <p className="text-lg">{t('أدخل البيانات واضغط احسب لإنشاء الجدول', 'Enter parameters and calculate to see schedule')}</p>
            </div>
          )}
        </div>
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30">
              <h3 className="text-xl font-bold">{t('إنشاء طلب تمويل', 'Create Loan Request')}</h3>
              <button onClick={() => setShowCreateDialog(false)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div className="bg-secondary/20 p-4 rounded-xl space-y-2">
                <p className="text-sm font-bold text-muted-foreground">{t('بيانات من الحاسبة', 'From Calculator')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('المبلغ', 'Amount')}: </span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(formData.amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('المدة', 'Term')}: </span>
                    <span className="font-bold">{formData.termMonths} {t('شهر', 'months')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('الفائدة', 'Interest')}: </span>
                    <span className="font-bold">{formData.interestRate}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('القسط', 'Installment')}: </span>
                    <span className="font-mono font-bold">{formatCurrency(simulateMutation.data?.monthlyInstallment)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('العميل', 'Client')}</label>
                <select required className="premium-input" value={createFormData.clientId} onChange={e => setCreateFormData({...createFormData, clientId: e.target.value})}>
                  <option value="">{t('اختر العميل...', 'Select Client...')}</option>
                  {clients?.data.map(c => <option key={c.id} value={c.id}>{c.fullNameAr} - {c.nationalId}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('المنتج', 'Product')}</label>
                <select required className="premium-input" value={createFormData.productId} onChange={e => setCreateFormData({...createFormData, productId: e.target.value})}>
                  <option value="">{t('اختر المنتج...', 'Select Product...')}</option>
                  {products?.map((p: any) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('ملاحظات', 'Notes')}</label>
                <textarea className="premium-input min-h-[60px]" value={createFormData.notes} onChange={e => setCreateFormData({...createFormData, notes: e.target.value})} placeholder={t('اختياري...', 'Optional...')} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateDialog(false)} className="px-4 py-2 rounded-xl font-medium hover:bg-secondary">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium flex items-center gap-2">
                  {createMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <>{t('إنشاء الطلب', 'Create Request')} <FileText size={16} /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

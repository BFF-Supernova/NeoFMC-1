import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Store, Plus, Loader2, FileText, CreditCard, AlertTriangle } from 'lucide-react';

export default function Vendors() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'vendors' | 'invoices' | 'aging'>('vendors');
  const [vendors, setVendors] = useState<any>({ data: [], total: 0 });
  const [invoices, setInvoices] = useState<any>({ data: [], total: 0 });
  const [aging, setAging] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'vendor' | 'invoice'>('vendor');
  const [branches, setBranches] = useState<any[]>([]);
  const [vendorForm, setVendorForm] = useState({ vendorCode: '', name: '', nameAr: '', taxId: '', phone: '', email: '', address: '', bankName: '', bankAccountNo: '', paymentTermsDays: '30', category: '' });
  const [invoiceForm, setInvoiceForm] = useState({ branchId: '', vendorId: '', invoiceNumber: '', invoiceDate: '', dueDate: '', subtotal: '', vatAmount: '0', withholdingTax: '0', description: '', category: '' });

  useEffect(() => { loadData(); api.get<any[]>('/branches').then(setBranches).catch(() => {}); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [v, inv, ag] = await Promise.all([api.get<any>('/vendors'), api.get<any>('/vendors/invoices'), api.get<any>('/vendors/ap-aging')]);
      setVendors(v); setInvoices(inv); setAging(ag);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const createVendor = async () => { try { await api.post('/vendors', vendorForm); setShowForm(false); loadData(); } catch (err) { handleApiError(err); } };
  const createInvoice = async () => { try { await api.post('/vendors/invoices', { ...invoiceForm, subtotal: Number(invoiceForm.subtotal), vatAmount: Number(invoiceForm.vatAmount), withholdingTax: Number(invoiceForm.withholdingTax) }); setShowForm(false); loadData(); } catch (err) { handleApiError(err); } };
  const approveInvoice = async (id: string) => { try { await api.put(`/vendors/invoices/${id}/approve`, {}); loadData(); } catch (err) { handleApiError(err); } };
  const payInvoice = async (id: string) => {
    const amount = prompt(t('أدخل مبلغ الدفع', 'Enter payment amount'));
    if (!amount) return;
    try { await api.post(`/vendors/invoices/${id}/pay`, { amount: Number(amount), paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'BankTransfer' }); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div><h2 className="text-2xl font-bold">{t('الموردون وحسابات الدفع', 'Vendors & Accounts Payable')}</h2><p className="text-muted-foreground mt-1">{t('إدارة الموردين وفواتير المشتريات', 'Manage vendors and purchase invoices')}</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setFormMode('vendor'); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"><Plus size={18} />{t('مورد', 'Vendor')}</button>
          <button onClick={() => { setFormMode('invoice'); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><FileText size={18} />{t('فاتورة', 'Invoice')}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="premium-card p-4"><div className="text-sm text-muted-foreground">{t('جاري', 'Current')}</div><div className="text-lg font-bold text-green-600">{formatCurrency(aging.current || 0)}</div></div>
        <div className="premium-card p-4"><div className="text-sm text-muted-foreground">1-30</div><div className="text-lg font-bold text-yellow-600">{formatCurrency(aging.days1_30 || 0)}</div></div>
        <div className="premium-card p-4"><div className="text-sm text-muted-foreground">31-60</div><div className="text-lg font-bold text-orange-600">{formatCurrency(aging.days31_60 || 0)}</div></div>
        <div className="premium-card p-4"><div className="text-sm text-muted-foreground">61-90</div><div className="text-lg font-bold text-red-500">{formatCurrency(aging.days61_90 || 0)}</div></div>
        <div className="premium-card p-4"><div className="text-sm text-muted-foreground">90+</div><div className="text-lg font-bold text-red-700">{formatCurrency(aging.days90plus || 0)}</div></div>
      </div>

      <div className="flex border-b border-border">
        {(['vendors', 'invoices', 'aging'] as const).map(t2 => (
          <button key={t2} className={cn("px-6 py-3 font-medium border-b-2 text-sm", tab === t2 ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab(t2)}>
            {t2 === 'vendors' ? t('الموردون', 'Vendors') : t2 === 'invoices' ? t('الفواتير', 'Invoices') : t('أعمار الديون', 'AP Aging')}
          </button>
        ))}
      </div>

      {showForm && formMode === 'vendor' && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('مورد جديد', 'New Vendor')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={vendorForm.vendorCode} onChange={e => setVendorForm({ ...vendorForm, vendorCode: e.target.value })} placeholder={t('كود المورد', 'Vendor Code')} className="input-field" />
            <input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder={t('الاسم (إنجليزي)', 'Name (EN)')} className="input-field" />
            <input value={vendorForm.nameAr} onChange={e => setVendorForm({ ...vendorForm, nameAr: e.target.value })} placeholder={t('الاسم (عربي)', 'Name (AR)')} className="input-field" />
            <input value={vendorForm.taxId} onChange={e => setVendorForm({ ...vendorForm, taxId: e.target.value })} placeholder={t('الرقم الضريبي', 'Tax ID')} className="input-field" />
            <input value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} placeholder={t('الهاتف', 'Phone')} className="input-field" />
            <input value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} placeholder={t('البريد', 'Email')} className="input-field" />
            <input value={vendorForm.bankName} onChange={e => setVendorForm({ ...vendorForm, bankName: e.target.value })} placeholder={t('البنك', 'Bank Name')} className="input-field" />
            <input value={vendorForm.bankAccountNo} onChange={e => setVendorForm({ ...vendorForm, bankAccountNo: e.target.value })} placeholder={t('رقم الحساب', 'Account No.')} className="input-field" />
            <input value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })} placeholder={t('الفئة', 'Category')} className="input-field" />
          </div>
          <div className="flex gap-2"><button onClick={createVendor} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {showForm && formMode === 'invoice' && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('فاتورة مشتريات جديدة', 'New Purchase Invoice')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={invoiceForm.branchId} onChange={e => setInvoiceForm({ ...invoiceForm, branchId: e.target.value })} className="input-field"><option value="">{t('الفرع', 'Branch')}</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</option>)}</select>
            <select value={invoiceForm.vendorId} onChange={e => setInvoiceForm({ ...invoiceForm, vendorId: e.target.value })} className="input-field"><option value="">{t('المورد', 'Vendor')}</option>{vendors.data?.map((v: any) => <option key={v.id} value={v.id}>{isRtl ? (v.nameAr || v.name) : v.name}</option>)}</select>
            <input value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} placeholder={t('رقم الفاتورة', 'Invoice No.')} className="input-field" />
            <input type="date" value={invoiceForm.invoiceDate} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} className="input-field" />
            <input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className="input-field" />
            <input type="number" value={invoiceForm.subtotal} onChange={e => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} placeholder={t('المبلغ الفرعي', 'Subtotal')} className="input-field" />
            <input type="number" value={invoiceForm.vatAmount} onChange={e => setInvoiceForm({ ...invoiceForm, vatAmount: e.target.value })} placeholder={t('ضريبة القيمة المضافة', 'VAT Amount')} className="input-field" />
            <input type="number" value={invoiceForm.withholdingTax} onChange={e => setInvoiceForm({ ...invoiceForm, withholdingTax: e.target.value })} placeholder={t('ضريبة الخصم', 'Withholding Tax')} className="input-field" />
            <input value={invoiceForm.description} onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })} placeholder={t('الوصف', 'Description')} className="input-field" />
          </div>
          <div className="flex gap-2"><button onClick={createInvoice} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : tab === 'vendors' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('كود', 'Code')}</th><th className="p-3 text-start">{t('الاسم', 'Name')}</th><th className="p-3">{t('الهاتف', 'Phone')}</th><th className="p-3 text-end">{t('المشتريات', 'Purchases')}</th><th className="p-3 text-end">{t('الرصيد', 'Balance')}</th><th className="p-3">{t('الحالة', 'Status')}</th></tr></thead>
            <tbody>{vendors.data?.map((v: any) => (
              <tr key={v.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono">{v.vendorCode}</td><td className="p-3">{isRtl ? (v.nameAr || v.name) : v.name}</td>
                <td className="p-3">{v.phone}</td><td className="p-3 text-end">{formatCurrency(v.totalPurchases)}</td>
                <td className="p-3 text-end font-bold">{formatCurrency(v.outstandingBalance)}</td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", v.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700')}>{v.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {(!vendors.data || vendors.data.length === 0) && <div className="p-8 text-center text-muted-foreground">{t('لا يوجد موردون', 'No vendors found')}</div>}
        </div>
      ) : tab === 'invoices' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('رقم', 'No.')}</th><th className="p-3 text-start">{t('التاريخ', 'Date')}</th><th className="p-3 text-end">{t('المبلغ', 'Amount')}</th><th className="p-3 text-end">{t('المدفوع', 'Paid')}</th><th className="p-3">{t('الحالة', 'Status')}</th><th className="p-3">{t('إجراء', 'Action')}</th></tr></thead>
            <tbody>{invoices.data?.map((inv: any) => (
              <tr key={inv.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono">{inv.invoiceNumber}</td><td className="p-3">{inv.invoiceDate}</td>
                <td className="p-3 text-end">{formatCurrency(inv.totalAmount)}</td><td className="p-3 text-end">{formatCurrency(inv.paidAmount)}</td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", inv.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : inv.status === 'Approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>{inv.status}</span></td>
                <td className="p-3 flex gap-2">{inv.status === 'Pending' && <button onClick={() => approveInvoice(inv.id)} className="text-blue-500 hover:underline text-xs">{t('اعتماد', 'Approve')}</button>}{(inv.status === 'Approved' || inv.status === 'PartiallyPaid') && <button onClick={() => payInvoice(inv.id)} className="text-green-500 hover:underline text-xs">{t('دفع', 'Pay')}</button>}</td>
              </tr>
            ))}</tbody>
          </table>
          {(!invoices.data || invoices.data.length === 0) && <div className="p-8 text-center text-muted-foreground">{t('لا توجد فواتير', 'No invoices found')}</div>}
        </div>
      ) : (
        <div className="premium-card p-6">
          <h3 className="text-lg font-bold mb-4">{t('تقرير أعمار الديون', 'Accounts Payable Aging Report')}</h3>
          <div className="text-3xl font-bold mb-4">{t('الإجمالي', 'Total')}: {formatCurrency(aging.total || 0)}</div>
          <div className="space-y-3">
            {[{ label: t('جاري (غير مستحق)', 'Current (Not Due)'), value: aging.current, color: 'bg-green-500' },
              { label: '1-30 ' + t('يوم', 'days'), value: aging.days1_30, color: 'bg-yellow-500' },
              { label: '31-60 ' + t('يوم', 'days'), value: aging.days31_60, color: 'bg-orange-500' },
              { label: '61-90 ' + t('يوم', 'days'), value: aging.days61_90, color: 'bg-red-500' },
              { label: '90+ ' + t('يوم', 'days'), value: aging.days90plus, color: 'bg-red-700' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-4">
                <span className="w-32 text-sm">{b.label}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", b.color)} style={{ width: `${aging.total ? ((b.value || 0) / aging.total * 100) : 0}%` }} /></div>
                <span className="w-28 text-end font-mono text-sm">{formatCurrency(b.value || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Upload, FileSpreadsheet, Loader2, Users, CreditCard, Download, CheckCircle2, ArrowRight, Info, AlertTriangle, X, Scale, Briefcase } from 'lucide-react';

const SAMPLE_TEMPLATES: Record<string, { headers: string[]; rows: string[][]; descAr: string; descEn: string; notesAr: string[]; notesEn: string[] }> = {
  GLOpeningBalance: {
    headers: ['accountCode', 'accountName', 'accountType', 'debit', 'credit'],
    rows: [
      ['1101', 'Cash on Hand', 'Asset', '50000', '0'],
      ['1201', 'Loan Portfolio', 'Asset', '200000', '0'],
      ['2101', 'Accounts Payable', 'Liability', '0', '30000'],
      ['3101', 'Retained Earnings', 'Equity', '0', '220000'],
    ],
    descAr: 'قم بإدخال أرصدة الافتتاح لحسابات دليل الحسابات. يجب أن يتساوى إجمالي المدين مع إجمالي الدائن.',
    descEn: 'Enter opening balances for GL accounts. Total debit must equal total credit.',
    notesAr: [
      'accountCode: كود الحساب من دليل الحسابات (إلزامي)',
      'accountName: اسم الحساب (مرجعي — اختياري)',
      'accountType: نوع الحساب — Asset, Liability, Equity, Revenue, Expense (مرجعي — اختياري)',
      'debit: الرصيد المدين بالجنيه المصري (أو 0)',
      'credit: الرصيد الدائن بالجنيه المصري (أو 0)',
      'يجب أن يتساوى إجمالي المدين مع إجمالي الدائن',
    ],
    notesEn: [
      'accountCode: GL account code (required)',
      'accountName: Account name (reference — optional)',
      'accountType: Account type — Asset, Liability, Equity, Revenue, Expense (reference — optional)',
      'debit: Debit balance in EGP (or 0)',
      'credit: Credit balance in EGP (or 0)',
      'Total debit must equal total credit (balanced entry)',
    ],
  },
  LoanPortfolioImport: {
    headers: ['clientNationalId', 'productId', 'disbursedAmount', 'outstandingBalance', 'totalPaid', 'termMonths', 'interestRate', 'disbursedAt', 'status'],
    rows: [
      ['29001011234567', 'product-uuid', '25000', '18000', '7000', '12', '18', '2025-01-15', 'Active'],
      ['29505152345678', 'product-uuid', '15000', '0', '15000', '6', '15', '2024-06-01', 'Closed'],
    ],
    descAr: 'استيراد محفظة القروض الحالية من النظام القديم. يجب أن يكون العملاء مسجلين مسبقاً.',
    descEn: 'Import existing loan portfolio from legacy system. Clients must be registered first.',
    notesAr: [
      'clientNationalId: الرقم القومي للعميل المسجل (إلزامي)',
      'productId: معرف المنتج التمويلي (إلزامي)',
      'disbursedAmount: المبلغ المصروف (إلزامي)',
      'outstandingBalance: الرصيد المتبقي (إلزامي)',
      'totalPaid: إجمالي المسدد (اختياري)',
      'status: الحالة - Active أو Closed (اختياري)',
    ],
    notesEn: [
      'clientNationalId: National ID of registered client (required)',
      'productId: Fund product ID (required)',
      'disbursedAmount: Original disbursed amount (required)',
      'outstandingBalance: Current outstanding balance (required)',
      'totalPaid: Total amount paid (optional)',
      'status: Active or Closed (optional, defaults to Active)',
    ],
  },
  BulkLoanRequest: {
    headers: ['clientId', 'productId', 'requestedAmount', 'termMonths', 'notes'],
    rows: [
      ['e.g. a1b2c3d4-...', 'e.g. f5g6h7i8-...', '15000', '12', 'First loan request'],
      ['e.g. j9k0l1m2-...', 'e.g. f5g6h7i8-...', '25000', '18', 'Business expansion'],
      ['e.g. n3o4p5q6-...', 'e.g. r7s8t9u0-...', '8000', '6', ''],
    ],
    descAr: 'قم بإدخال معرف العميل (clientId) ومعرف المنتج (productId) من النظام. يمكن الحصول عليهما من صفحات العملاء والمنتجات.',
    descEn: 'Enter the client ID and product ID from the system. You can find these on the Clients and Products pages.',
    notesAr: [
      'clientId: معرف العميل الموجود في النظام (إلزامي)',
      'productId: معرف المنتج التمويلي (إلزامي)',
      'requestedAmount: المبلغ المطلوب بالجنيه المصري (إلزامي)',
      'termMonths: مدة التمويل بالأشهر (اختياري - يستخدم الحد الأقصى للمنتج)',
      'notes: ملاحظات إضافية (اختياري)',
    ],
    notesEn: [
      'clientId: Existing client ID in the system (required)',
      'productId: Fund product ID (required)',
      'requestedAmount: Requested amount in EGP (required)',
      'termMonths: Loan term in months (optional - defaults to product max)',
      'notes: Additional notes (optional)',
    ],
  },
  BulkPayment: {
    headers: ['loanId', 'amount', 'paymentMethod', 'referenceNumber', 'notes'],
    rows: [
      ['e.g. a1b2c3d4-...', '1500', 'Cash', '', 'Monthly installment'],
      ['e.g. j9k0l1m2-...', '2000', 'BankTransfer', 'TRX-2024-001', 'Bank transfer payment'],
      ['e.g. n3o4p5q6-...', '800', 'Fawry', 'FWR-12345', ''],
    ],
    descAr: 'قم بإدخال معرف القرض (loanId) من النظام. سيتم تطبيق المدفوعات تلقائياً على الأقساط المستحقة بالترتيب.',
    descEn: 'Enter the loan ID from the system. Payments will be automatically applied to pending installments in order.',
    notesAr: [
      'loanId: معرف القرض النشط في النظام (إلزامي)',
      'amount: مبلغ الدفعة بالجنيه المصري (إلزامي)',
      'paymentMethod: طريقة الدفع - Cash, BankTransfer, Fawry, Paymob (إلزامي)',
      'referenceNumber: رقم المرجع للتحويلات البنكية (اختياري)',
      'notes: ملاحظات (اختياري)',
    ],
    notesEn: [
      'loanId: Active loan ID in the system (required)',
      'amount: Payment amount in EGP (required)',
      'paymentMethod: Payment method - Cash, BankTransfer, Fawry, Paymob (required)',
      'referenceNumber: Bank transfer reference number (optional)',
      'notes: Additional notes (optional)',
    ],
  },
  BulkClientUpload: {
    headers: ['nationalId', 'fullNameAr', 'fullNameEn', 'phone', 'address'],
    rows: [
      ['29001011234567', 'أحمد محمد علي', 'Ahmed Mohamed Ali', '01012345678', 'القاهرة - المعادي'],
      ['29505152345678', 'فاطمة حسن إبراهيم', 'Fatma Hassan Ibrahim', '01123456789', 'الجيزة - الهرم'],
      ['28803033456789', 'محمود سعيد عبدالله', '', '01234567890', 'الإسكندرية'],
    ],
    descAr: 'قم بإدخال بيانات العملاء الجدد. الرقم القومي والاسم بالعربي إلزاميان. تأكد من عدم تكرار الرقم القومي.',
    descEn: 'Enter new client data. National ID and Arabic name are required. Ensure national IDs are not duplicated.',
    notesAr: [
      'nationalId: الرقم القومي (14 رقم - إلزامي - غير مكرر)',
      'fullNameAr: الاسم الكامل بالعربية (إلزامي)',
      'fullNameEn: الاسم الكامل بالإنجليزية (اختياري)',
      'phone: رقم الهاتف (اختياري)',
      'address: العنوان (اختياري)',
    ],
    notesEn: [
      'nationalId: National ID (14 digits - required - must be unique)',
      'fullNameAr: Full name in Arabic (required)',
      'fullNameEn: Full name in English (optional)',
      'phone: Phone number (optional)',
      'address: Address (optional)',
    ],
  },
};

function downloadSampleCSV(operationType: string) {
  const template = SAMPLE_TEMPLATES[operationType];
  if (!template) return;
  const bom = '\uFEFF';
  const csvRows = [template.headers.join(',')];
  for (const row of template.rows) {
    csvRows.push(row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || /[\u0600-\u06FF]/.test(cell)) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','));
  }
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sample_${operationType}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkOperations() {
  const { t, isRtl } = useLanguage();
  const [operations, setOperations] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'upload'>('upload');
  const [operationType, setOperationType] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const data = await api.get<any>('/bulk-operations'); setOperations(data); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExcel, setIsExcel] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const excelFile = ext === 'xlsx' || ext === 'xls';
    setIsExcel(excelFile);
    setUploadedFile(file);
    setParsedData(null);
    setResult(null);

    if (excelFile) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setCsvContent(base64);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCsvContent(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleParseCSV = async () => {
    if (!operationType) return;
    try {
      let parsed;
      if (isExcel) {
        parsed = await api.post<any>('/bulk-operations/upload-excel', { fileData: csvContent, operationType });
      } else {
        parsed = await api.post<any>('/bulk-operations/upload-csv', { csvContent, operationType });
      }
      setParsedData(parsed);
    } catch (err) { handleApiError(err); }
  };

  const handleProcessBulk = async () => {
    if (!parsedData || !operationType) return;
    setProcessing(true);
    setResult(null);
    try {
      const rows = csvContent.trim().split('\n');
      const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const data = rows.slice(1).filter(r => r.trim()).map(row => {
        const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
      });

      let endpoint = '';
      let payload: any = {};

      switch (operationType) {
        case 'GLOpeningBalance':
          endpoint = '/bulk-operations/gl-opening-balances';
          payload = { balances: data.map(d => ({ accountCode: d.accountCode, debit: Number(d.debit) || 0, credit: Number(d.credit) || 0 })), dryRun: false };
          break;
        case 'LoanPortfolioImport':
          endpoint = '/bulk-operations/loan-portfolio-import';
          payload = { loans: data.map(d => ({ clientNationalId: d.clientNationalId, productId: d.productId, disbursedAmount: Number(d.disbursedAmount), outstandingBalance: Number(d.outstandingBalance), totalPaid: Number(d.totalPaid) || 0, termMonths: Number(d.termMonths) || 12, interestRate: Number(d.interestRate) || 0, disbursedAt: d.disbursedAt, status: d.status || 'Active' })), dryRun: false };
          break;
        case 'BulkLoanRequest':
          endpoint = '/bulk-operations/loan-requests';
          payload = { requests: data.map(d => ({ clientId: d.clientId, productId: d.productId, requestedAmount: Number(d.requestedAmount || d.amount), termMonths: Number(d.termMonths) || undefined, notes: d.notes })) };
          break;
        case 'BulkPayment':
          endpoint = '/bulk-operations/payments';
          payload = { payments: data.map(d => ({ loanId: d.loanId, amount: Number(d.amount), paymentMethod: d.paymentMethod || 'Cash', referenceNumber: d.referenceNumber, notes: d.notes })) };
          break;
        case 'BulkClientUpload':
          endpoint = '/bulk-operations/clients';
          payload = { clients: data.map(d => ({ nationalId: d.nationalId, fullNameAr: d.fullNameAr, fullNameEn: d.fullNameEn, phone: d.phone, address: d.address })) };
          break;
      }

      const res = await api.post<any>(endpoint, payload);
      setResult(res);
      setCsvContent('');
      setParsedData(null);
      loadData();
    } catch (err) { handleApiError(err); }
    setProcessing(false);
  };

  const resetUpload = () => {
    setOperationType(null);
    setCsvContent('');
    setParsedData(null);
    setResult(null);
  };

  const operationTypes = [
    { key: 'GLOpeningBalance', icon: Scale, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
      titleAr: 'أرصدة افتتاحية', titleEn: 'GL Opening Balances',
      descAr: 'استيراد أرصدة الافتتاح لدليل الحسابات', descEn: 'Import opening balances for chart of accounts',
      columnsAr: 'accountCode, accountName, accountType, debit, credit',
      columnsEn: 'accountCode, accountName, accountType, debit, credit',
    },
    { key: 'LoanPortfolioImport', icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30',
      titleAr: 'استيراد محفظة قروض', titleEn: 'Loan Portfolio Import',
      descAr: 'استيراد محفظة القروض الحالية من النظام القديم', descEn: 'Import existing loan portfolio from legacy system',
      columnsAr: 'clientNationalId, productId, disbursedAmount, outstandingBalance, ...',
      columnsEn: 'clientNationalId, productId, disbursedAmount, outstandingBalance, ...',
    },
    { key: 'BulkLoanRequest', icon: FileSpreadsheet, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
      titleAr: 'طلبات تمويل مجمعة', titleEn: 'Bulk Loan Requests',
      descAr: 'إنشاء عدة طلبات تمويل دفعة واحدة', descEn: 'Create multiple loan requests at once',
      columnsAr: 'clientId, productId, requestedAmount, termMonths, notes',
      columnsEn: 'clientId, productId, requestedAmount, termMonths, notes',
    },
    { key: 'BulkPayment', icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
      titleAr: 'مدفوعات مجمعة', titleEn: 'Bulk Payments',
      descAr: 'تسجيل عدة مدفوعات دفعة واحدة', descEn: 'Record multiple payments at once',
      columnsAr: 'loanId, amount, paymentMethod, referenceNumber, notes',
      columnsEn: 'loanId, amount, paymentMethod, referenceNumber, notes',
    },
    { key: 'BulkClientUpload', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30',
      titleAr: 'رفع عملاء جدد', titleEn: 'Bulk Client Upload',
      descAr: 'إضافة عدة عملاء جدد دفعة واحدة', descEn: 'Add multiple new clients at once',
      columnsAr: 'nationalId, fullNameAr, fullNameEn, phone, address',
      columnsEn: 'nationalId, fullNameAr, fullNameEn, phone, address',
    },
  ];

  const selectedOp = operationTypes.find(o => o.key === operationType);
  const template = operationType ? SAMPLE_TEMPLATES[operationType] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('العمليات المجمعة', 'Bulk Operations')}</h2>
        <p className="text-muted-foreground mt-1">{t('إنشاء عمليات مجمعة عبر ملف CSV أو Excel — طلبات، مدفوعات، عملاء، أرصدة افتتاحية', 'Bulk operations via CSV or Excel — loan requests, payments, clients, opening balances')}</p>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", activeTab === 'upload' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setActiveTab('upload')}>
          <Upload className="inline mr-2" size={16} />{t('عملية جديدة', 'New Operation')}
        </button>
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setActiveTab('history')}>
          {t('السجل', 'History')}
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-6">
          {!operationType ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                {t('اختر نوع العملية المجمعة', 'Choose the type of bulk operation')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {operationTypes.map(op => (
                  <div key={op.key} className="premium-card p-6 hover:-translate-y-1 transition-all duration-200 group">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", op.bg, op.color)}>
                      <op.icon size={28} />
                    </div>
                    <h4 className="font-bold text-lg mb-1">{t(op.titleAr, op.titleEn)}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{t(op.descAr, op.descEn)}</p>
                    <p className="text-xs text-muted-foreground mb-4 font-mono bg-secondary/50 p-2 rounded-lg overflow-x-auto">
                      {t(op.columnsAr, op.columnsEn)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOperationType(op.key)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors"
                      >
                        {t('اختيار', 'Select')} <ArrowRight size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadSampleCSV(op.key); }}
                        className={cn("flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border", op.bg, op.color, op.border, "hover:opacity-80")}
                        title={t('تحميل نموذج', 'Download Sample')}
                      >
                        <Download size={16} /> {t('نموذج', 'Sample')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedOp && (
                    <>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedOp.bg, selectedOp.color)}>
                        <selectedOp.icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold">{t(selectedOp.titleAr, selectedOp.titleEn)}</h3>
                        <p className="text-xs text-muted-foreground">{t(selectedOp.descAr, selectedOp.descEn)}</p>
                      </div>
                    </>
                  )}
                </div>
                <button onClick={resetUpload} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors">
                  <X size={16} /> {t('تغيير النوع', 'Change Type')}
                </button>
              </div>

              {template && (
                <div className="premium-card p-5 border-l-4 border-primary/50">
                  <div className="flex items-start gap-3">
                    <Info size={18} className="text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">{t('تعليمات إعداد الملف', 'File Preparation Instructions')}</p>
                      <p className="text-sm text-muted-foreground mb-3">{t(template.descAr, template.descEn)}</p>
                      <div className="space-y-1">
                        {(isRtl ? template.notesAr : template.notesEn).map((note, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {note}
                          </p>
                        ))}
                      </div>
                      <button
                        onClick={() => downloadSampleCSV(operationType)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold transition-colors border border-primary/20"
                      >
                        <Download size={16} /> {t('تحميل نموذج CSV', 'Download Sample CSV')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {template && (
                <div className="premium-card overflow-hidden">
                  <div className="px-5 py-3 bg-secondary/30 border-b border-border flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('معاينة النموذج', 'Sample Preview')}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/10">
                          {template.headers.map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-bold text-primary">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {template.rows.map((row, i) => (
                          <tr key={i} className="border-b border-border/50">
                            {row.map((cell, j) => (
                              <td key={j} className="px-4 py-2 text-muted-foreground font-mono">{cell || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                {t('ارفع ملف CSV الخاص بك', 'Upload your CSV file')}
              </div>

              <div className="premium-card p-6">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <Upload className="mx-auto mb-3 text-muted-foreground" size={36} />
                  <p className="text-sm font-medium mb-1">{t('اسحب ملف CSV أو Excel أو اضغط لاختيار', 'Drag CSV or Excel file, or click to select')}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t('صيغ مدعومة: CSV, XLSX — يجب اتباع النموذج أعلاه', 'Supported: CSV, XLSX — must follow the template above')}</p>
                  <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl cursor-pointer text-sm font-medium transition-colors">
                    <Upload size={16} /> {t('اختر ملف', 'Choose File')}
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {csvContent && !parsedData && !result && (
                <div className="premium-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('تم تحميل الملف بنجاح', 'File uploaded successfully')}</p>
                      <p className="text-xs text-muted-foreground">{csvContent.trim().split('\n').length - 1} {t('سجل', 'records')}</p>
                    </div>
                    <button onClick={handleParseCSV} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors">
                      {t('تحليل الملف', 'Validate & Parse')} <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {parsedData && !result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                    {t('راجع البيانات ونفذ العملية', 'Review data and execute')}
                  </div>
                  <div className="premium-card p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <CheckCircle2 size={20} className="text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-400">{t('تم تحليل الملف بنجاح', 'File parsed successfully')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('عدد السجلات', 'Records')}: <strong className="text-foreground">{parsedData.parsedRows}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('الأعمدة المكتشفة', 'Detected columns')}: <span className="font-mono text-foreground">{parsedData.headers?.join(', ')}</span>
                        </p>
                      </div>
                    </div>

                    {parsedData.sampleRow && (
                      <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t('معاينة أول سجل', 'First record preview')}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(parsedData.sampleRow).map(([k, v]) => (
                            <div key={k} className="text-xs">
                              <span className="text-muted-foreground">{k}: </span>
                              <span className="font-mono text-foreground">{String(v) || '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={handleProcessBulk} disabled={processing} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                        {processing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        {processing ? t('جاري التنفيذ...', 'Processing...') : t('تنفيذ العملية', 'Execute Operation')}
                      </button>
                      <button onClick={() => { setCsvContent(''); setParsedData(null); }} className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors">
                        {t('إلغاء', 'Cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className={cn("premium-card p-5 border-l-4", result.failed > 0 ? "border-yellow-500" : "border-green-500")}>
                  <div className="flex items-start gap-3">
                    {result.failed > 0 ? <AlertTriangle size={20} className="text-yellow-400 mt-0.5" /> : <CheckCircle2 size={20} className="text-green-400 mt-0.5" />}
                    <div className="flex-1">
                      <p className={cn("text-sm font-bold", result.failed > 0 ? "text-yellow-400" : "text-green-400")}>
                        {result.failed > 0
                          ? t('تم التنفيذ مع بعض الأخطاء', 'Completed with some errors')
                          : t('تم التنفيذ بنجاح', 'Operation completed successfully')}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="text-center p-3 rounded-lg bg-secondary/30">
                          <p className="text-2xl font-bold">{result.totalRecords}</p>
                          <p className="text-xs text-muted-foreground">{t('إجمالي', 'Total')}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-500/10">
                          <p className="text-2xl font-bold text-green-400">{result.success}</p>
                          <p className="text-xs text-muted-foreground">{t('نجح', 'Success')}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-red-500/10">
                          <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                          <p className="text-xs text-muted-foreground">{t('فشل', 'Failed')}</p>
                        </div>
                      </div>
                      {result.errors?.length > 0 && (
                        <div className="mt-3 bg-red-500/5 rounded-lg p-3">
                          <p className="text-xs font-semibold text-red-400 mb-2">{t('تفاصيل الأخطاء', 'Error Details')}</p>
                          {result.errors.slice(0, 5).map((err: any, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              {t('سطر', 'Row')} {err.row}: {err.error}
                            </p>
                          ))}
                          {result.errors.length > 5 && (
                            <p className="text-xs text-muted-foreground mt-1">...{t('و', 'and')} {result.errors.length - 5} {t('أخطاء أخرى', 'more errors')}</p>
                          )}
                        </div>
                      )}
                      <button onClick={resetUpload} className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors">
                        {t('عملية جديدة', 'New Operation')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الإجمالي', 'Total')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('نجح', 'Success')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('فشل', 'Failed')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المنفذ', 'Created By')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : operations.data?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">{t('لا توجد عمليات سابقة', 'No previous operations')}</td></tr>
                ) : (
                  operations.data?.map((op: any) => {
                    const typeLabels: Record<string, { ar: string; en: string }> = {
                      BulkLoanRequest: { ar: 'طلبات تمويل', en: 'Loan Requests' },
                      BulkPayment: { ar: 'مدفوعات', en: 'Payments' },
                      BulkClientUpload: { ar: 'رفع عملاء', en: 'Client Upload' },
                    };
                    const label = typeLabels[op.operationType] || { ar: op.operationType, en: op.operationType };
                    return (
                      <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{t(label.ar, label.en)}</td>
                        <td className="px-6 py-4 font-mono">{op.totalRecords}</td>
                        <td className="px-6 py-4 text-green-400 font-mono">{op.successRecords}</td>
                        <td className="px-6 py-4 text-red-400 font-mono">{op.failedRecords}</td>
                        <td className="px-6 py-4"><span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(op.status))}>{op.status}</span></td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{op.createdByName || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(op.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useListLoans, useGetLoan } from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, getStatusColor, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import {
  Briefcase, Search, Loader2, XCircle, CheckCircle2, ChevronRight,
  AlertTriangle, Clock, FileText, ArrowDownUp, X, Banknote, CreditCard, Receipt, Download, ExternalLink,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { generatePaymentReceiptPDF, generateStatementPDF, generateLoanContractPDF, generateDisbursementVoucherPDF, type ReportLang } from '@/lib/pdfGenerator';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useSuperAdminDelete } from '@/hooks/useSuperAdminDelete';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('neo_fmc_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/api${url}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function PaymentReceipt({ payment, loan, onClose, lang = 'en' as ReportLang }: { payment: any; loan: any; onClose: () => void; lang?: ReportLang }) {
  const handleDownloadPDF = () => {
    generatePaymentReceiptPDF(payment, loan, lang);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2"><Receipt size={18} className="text-green-500" /> إيصال سداد</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <div className="text-center border-b-2 border-foreground pb-3 mb-3">
            <h2 className="text-lg font-bold">Neo FMC</h2>
            <p className="text-xs text-muted-foreground">إيصال سداد قسط</p>
            <p className="text-xs text-muted-foreground">Payment Receipt</p>
          </div>
          <div className="flex justify-between py-1 border-b border-dashed border-border">
            <span className="text-muted-foreground">التاريخ:</span>
            <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-dashed border-border">
            <span className="text-muted-foreground">العميل:</span>
            <span className="font-medium">{loan?.clientName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-dashed border-border">
            <span className="text-muted-foreground">المبلغ:</span>
            <span className="font-bold text-green-500">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-dashed border-border">
            <span className="text-muted-foreground">طريقة السداد:</span>
            <span>{payment.paymentMethod}</span>
          </div>
          {payment.referenceNumber && (
            <div className="flex justify-between py-1 border-b border-dashed border-border">
              <span className="text-muted-foreground">رقم المرجع:</span>
              <span className="font-mono">{payment.referenceNumber}</span>
            </div>
          )}
          <div className="text-center border-t-2 border-foreground pt-3 mt-3">
            <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4">
            <p>شكراً لسدادكم - Thank you for your payment</p>
          </div>
        </div>
        <div className="p-4 border-t border-border flex gap-3">
          <button onClick={handleDownloadPDF} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90">
            <Download size={16} /> تحميل الإيصال PDF
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

export default function Loans() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { isSuperAdmin, deleteRecord } = useSuperAdminDelete();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useListLoans(
    { status: filter || undefined, limit: 50 } as any,
    { query: { queryKey: ['/api/loans', { status: filter }] } },
  );

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const { data: loanDetail, isLoading: detailLoading } = useGetLoan(selectedLoanId || '', { query: { enabled: !!selectedLoanId }});

  const [actionDialog, setActionDialog] = useState<{ type: 'writeoff' | 'reschedule' | 'settlement' | 'payment'; loanId: string } | null>(null);
  const [actionForm, setActionForm] = useState<Record<string, string>>({});
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [showStatement, setShowStatement] = useState(false);

  const { data: statementData, isLoading: stmtLoading } = useQuery({
    queryKey: ['/api/clients/statement', loanDetail?.loan?.clientId],
    queryFn: () => api.get<any>(`/clients/${loanDetail?.loan?.clientId}/statement`),
    enabled: showStatement && !!loanDetail?.loan?.clientId,
  });

  const requestWriteOff = useMutation({
    mutationFn: (data: { loanId: string; reason: string; notes?: string }) =>
      apiFetch(`/loans/${data.loanId}/request-writeoff`, { method: 'POST', body: JSON.stringify({ reason: data.reason, notes: data.notes }) }),
    onSuccess: () => {
      toast({ title: t('تم إرسال الطلب', 'Request Submitted'), description: t('تم إرسال طلب الإسقاط للموافقة', 'Write-off request sent for approval') });
      setActionDialog(null); setActionForm({});
      qc.invalidateQueries({ queryKey: ['/api/loans'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const requestReschedule = useMutation({
    mutationFn: (data: { loanId: string; newTermMonths: number; reason: string }) =>
      apiFetch(`/loans/${data.loanId}/request-reschedule`, { method: 'POST', body: JSON.stringify({ newTermMonths: data.newTermMonths, reason: data.reason }) }),
    onSuccess: () => {
      toast({ title: t('تم إرسال الطلب', 'Request Submitted'), description: t('تم إرسال طلب إعادة الجدولة للموافقة', 'Reschedule request sent for approval') });
      setActionDialog(null); setActionForm({});
      qc.invalidateQueries({ queryKey: ['/api/loans'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const requestSettlement = useMutation({
    mutationFn: (data: { loanId: string; totalDue: number; outstandingPrincipal: number }) =>
      apiFetch(`/loans/${data.loanId}/request-settlement`, { method: 'POST', body: JSON.stringify({ totalDue: data.totalDue, outstandingPrincipal: data.outstandingPrincipal }) }),
    onSuccess: () => {
      toast({ title: t('تم إرسال الطلب', 'Request Submitted'), description: t('تم إرسال طلب التسوية المبكرة للموافقة', 'Settlement request sent for approval') });
      setActionDialog(null); setActionForm({});
      qc.invalidateQueries({ queryKey: ['/api/loans'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const recordPayment = useMutation({
    mutationFn: (data: { loanId: string; amount: number; paymentMethod: string; referenceNumber?: string; installmentId?: string; notes?: string }) =>
      apiFetch<any>('/payments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (result) => {
      toast({ title: t('تم تسجيل السداد', 'Payment Recorded'), description: t('تم تسجيل السداد بنجاح', 'Payment recorded successfully') });
      setLastPayment(result);
      setActionDialog(null); setActionForm({});
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const handleSubmitAction = () => {
    if (!actionDialog) return;
    const { type, loanId } = actionDialog;
    if (type === 'writeoff') {
      if (!actionForm.reason) return;
      requestWriteOff.mutate({ loanId, reason: actionForm.reason, notes: actionForm.notes });
    } else if (type === 'reschedule') {
      if (!actionForm.reason || !actionForm.newTermMonths) return;
      requestReschedule.mutate({ loanId, newTermMonths: Number(actionForm.newTermMonths), reason: actionForm.reason });
    } else if (type === 'settlement') {
      requestSettlement.mutate({
        loanId,
        totalDue: Number(actionForm.totalDue || 0),
        outstandingPrincipal: Number(actionForm.outstandingPrincipal || 0),
      });
    } else if (type === 'payment') {
      if (!actionForm.amount || Number(actionForm.amount) <= 0) return;
      recordPayment.mutate({
        loanId,
        amount: Number(actionForm.amount),
        paymentMethod: actionForm.paymentMethod || 'Cash',
        referenceNumber: actionForm.referenceNumber || undefined,
        installmentId: actionForm.installmentId || undefined,
        notes: actionForm.notes || undefined,
      });
    }
  };

  const [reversalDialog, setReversalDialog] = useState<{ type: 'reversePayment' | 'rollbackLoan' | 'reopenClosing' | 'withdrawApproval'; id: string; label?: string } | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const reversePayment = useMutation({
    mutationFn: (data: { paymentId: string; reason: string }) =>
      apiFetch(`/payments/${data.paymentId}/reverse`, { method: 'POST', body: JSON.stringify({ reason: data.reason }) }),
    onSuccess: () => {
      toast({ title: t('تم عكس السداد', 'Payment Reversed'), description: t('تم عكس السداد بنجاح وتحديث الأرصدة', 'Payment reversed and balances updated') });
      setReversalDialog(null); setReversalReason('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const rollbackLoan = useMutation({
    mutationFn: (data: { loanId: string; reason: string }) =>
      apiFetch(`/loans/${data.loanId}/rollback-status`, { method: 'POST', body: JSON.stringify({ reason: data.reason }) }),
    onSuccess: (result: any) => {
      toast({ title: t('تم التراجع', 'Status Rolled Back'), description: result.message || t('تم تراجع حالة القرض بنجاح', 'Loan status rolled back successfully') });
      setReversalDialog(null); setReversalReason('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const handleReversalSubmit = () => {
    if (!reversalDialog || !reversalReason.trim()) return;
    if (reversalDialog.type === 'reversePayment') {
      reversePayment.mutate({ paymentId: reversalDialog.id, reason: reversalReason });
    } else if (reversalDialog.type === 'rollbackLoan') {
      rollbackLoan.mutate({ loanId: reversalDialog.id, reason: reversalReason });
    }
  };

  const isSubmitting = requestWriteOff.isPending || requestReschedule.isPending || requestSettlement.isPending || recordPayment.isPending;
  const isReversing = reversePayment.isPending || rollbackLoan.isPending;
  const canReverse = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

  const pendingApprovals = (loanDetail as any)?.pendingApprovals || [];
  const isActive = loanDetail?.loan?.status === 'Active';
  const pendingInstallments = loanDetail?.installments?.filter(i => i.status === 'Pending') || [];

  const stmtRef = useRef<HTMLDivElement>(null);
  const [pdfLang, setPdfLang] = useState<ReportLang>('en');
  const printStatement = () => {
    if (!loanDetail) return;
    generateStatementPDF(
      loanDetail.loan,
      loanDetail.installments || [],
      loanDetail.payments || [],
      statementData || {},
      pdfLang
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('المحفظة النشطة', 'Active Portfolio')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة ومتابعة القروض القائمة', 'Manage and monitor existing loans')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="premium-card p-5 bg-gradient-to-br from-primary/20 to-transparent border-primary/20">
          <p className="text-sm font-medium text-primary mb-1">{t('إجمالي المحفظة القائمة', 'Total Outstanding Portfolio')}</p>
          <h3 className="text-3xl font-display font-bold">{formatCurrency(data?.data.reduce((acc, curr) => acc + curr.outstandingBalance, 0))}</h3>
        </div>
        <div className="premium-card p-5">
           <p className="text-sm font-medium text-muted-foreground mb-1">{t('إجمالي القروض', 'Total Loans Count')}</p>
           <h3 className="text-3xl font-display font-bold">{data?.total || 0}</h3>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {['', 'Active', 'Closed', 'Rescheduled', 'WrittenOff'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border",
              filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
            )}
          >{s === '' ? t('الكل', 'All') : s}</button>
        ))}
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('رقم القرض', 'Loan #')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العميل', 'Client')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المنصرف', 'Disbursed')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الرصيد المتبقي', 'Outstanding')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المدفوع', 'Paid')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><Briefcase size={32} className="mx-auto mb-3 opacity-20"/> {t('لا توجد قروض', 'No loans found')}</td></tr>
              ) : (
                data?.data.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{(loan as any).loanNumber || '-'}</td>
                    <td className="px-4 py-4">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/clients?clientId=${(loan as any).clientId}`); }} className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                        {loan.clientName}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={(e) => { e.stopPropagation(); navigate('/loan-requests'); }} className="font-mono text-muted-foreground hover:text-primary hover:underline underline-offset-2 transition-colors">
                        {formatCurrency(loan.disbursedAmount)}
                      </button>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-primary">{formatCurrency(loan.outstandingBalance)}</td>
                    <td className="px-4 py-4 font-mono text-green-400/80">{formatCurrency(loan.totalPaid)}</td>
                    <td className="px-4 py-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold border", getStatusColor(loan.status))}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                       <button onClick={() => setSelectedLoanId(loan.id)} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                         {t('التفاصيل', 'Details')} <ChevronRight size={14} className={isRtl?"rotate-180":""}/>
                       </button>
                       {isSuperAdmin && (
                         deleteConfirmId === loan.id ? (
                           <div className="flex items-center gap-1">
                             <button onClick={async () => { const ok = await deleteRecord('loan', loan.id, loan.id, ['/api/loans']); if (ok) setDeleteConfirmId(null); }} className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg">{t('تأكيد', 'Confirm')}</button>
                             <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded-lg">{t('إلغاء', 'Cancel')}</button>
                           </div>
                         ) : (
                           <button onClick={() => setDeleteConfirmId(loan.id)} className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded-lg" title={t('حذف', 'Delete')}>
                             <X size={14} />
                           </button>
                         )
                       )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLoanId && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in flex flex-col">
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => { setSelectedLoanId(null); setShowStatement(false); }} className="p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                <ChevronRight size={20} className={cn(!isRtl && "rotate-180")} />
              </button>
              <h2 className="text-xl font-bold">{t('تفاصيل القرض', 'Loan Details')}</h2>
            </div>
            {loanDetail && (
              <div className="flex items-center gap-3">
                <span className={cn("px-3 py-1 rounded-md text-sm font-bold border", getStatusColor(loanDetail.loan.status))}>
                  {loanDetail.loan.status}
                </span>
                {canReverse && (loanDetail.loan.status === 'WrittenOff' || loanDetail.loan.status === 'Closed') && (
                  <button onClick={() => setReversalDialog({ type: 'rollbackLoan', id: loanDetail.loan.id, label: loanDetail.loan.status })}
                    className="text-xs font-medium px-3 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-colors">
                    {t('تراجع عن الحالة', 'Rollback Status')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            {detailLoading ? (
               <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : loanDetail ? (
              <div className="max-w-5xl mx-auto space-y-6">

                <div className="premium-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6 bg-gradient-to-r from-secondary/50 to-transparent">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('العميل', 'Client')}</p>
                    <button onClick={() => navigate(`/clients?clientId=${loanDetail.loan.clientId}`)} className="text-lg font-bold mt-1 hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                      {loanDetail.loan.clientName}
                    </button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('الرصيد المتبقي', 'Outstanding')}</p>
                    <p className="text-2xl font-display font-bold text-primary mt-1">{formatCurrency(loanDetail.loan.outstandingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('تاريخ الصرف', 'Disbursed At')}</p>
                    <p className="text-lg font-medium mt-1">{formatDate(loanDetail.loan.disbursedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('إجمالي المدفوع', 'Total Paid')}</p>
                    <p className="text-lg font-mono text-green-400 mt-1">{formatCurrency(loanDetail.loan.totalPaid)}</p>
                  </div>
                </div>

                {pendingApprovals.length > 0 && (
                  <div className="premium-card p-4 border-yellow-500/30 bg-yellow-500/5">
                    <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2 mb-3">
                      <Clock size={16} /> {t('طلبات بانتظار الموافقة', 'Pending Approval Requests')}
                    </h4>
                    <div className="space-y-2">
                      {pendingApprovals.map((pa: any) => (
                        <div key={pa.id} className="flex items-center justify-between bg-yellow-500/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-yellow-500/20 text-yellow-400 border-yellow-500/30 uppercase">{pa.requestType}</span>
                            <span className="text-xs text-muted-foreground">{t('بواسطة', 'by')} {pa.requestedByName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(pa.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isActive && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => { setActionDialog({ type: 'payment', loanId: selectedLoanId! }); setActionForm({ paymentMethod: 'Cash' }); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/20 transition-colors flex items-center gap-2"
                    >
                      <CreditCard size={16} /> {t('تسجيل سداد', 'Record Payment')}
                    </button>
                    <button
                      onClick={() => setActionDialog({ type: 'settlement', loanId: selectedLoanId! })}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 transition-colors flex items-center gap-2"
                    >
                      <Banknote size={16} /> {t('تسوية مبكرة', 'Early Settlement')}
                    </button>
                    <button
                      onClick={() => setActionDialog({ type: 'reschedule', loanId: selectedLoanId! })}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/20 transition-colors flex items-center gap-2"
                    >
                      <ArrowDownUp size={16} /> {t('إعادة جدولة', 'Reschedule')}
                    </button>
                    <button
                      onClick={() => setActionDialog({ type: 'writeoff', loanId: selectedLoanId! })}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 transition-colors flex items-center gap-2"
                    >
                      <XCircle size={16} /> {t('إسقاط', 'Write-Off')}
                    </button>
                    <select value={pdfLang} onChange={e => setPdfLang(e.target.value as ReportLang)} className="h-10 px-2 rounded-xl text-sm bg-secondary border border-border text-foreground">
                      <option value="en">EN</option>
                      <option value="ar">AR</option>
                    </select>
                    <button
                      onClick={() => setShowStatement(!showStatement)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 transition-colors flex items-center gap-2"
                    >
                      <FileText size={16} /> {t('كشف حساب', 'Statement')}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const contractData = await api.get<any>(`/loans/${selectedLoanId}/contract-data`);
                          generateLoanContractPDF(contractData, pdfLang);
                        } catch (err) { handleApiError(err); }
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} /> {t('عقد التمويل', 'Loan Contract')}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const contractData = await api.get<any>(`/loans/${selectedLoanId}/contract-data`);
                          generateDisbursementVoucherPDF(contractData, pdfLang);
                        } catch (err) { handleApiError(err); }
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-500/20 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} /> {t('إذن صرف', 'Voucher')}
                    </button>
                  </div>
                )}

                {showStatement && (
                  <div className="premium-card p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold flex items-center gap-2"><FileText size={20} className="text-violet-400" /> {t('كشف حساب العميل', 'Client Account Statement')}</h3>
                      <button onClick={printStatement} className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-sm font-medium flex items-center gap-2 hover:bg-violet-600/30">
                        <Download size={14} /> {t('تحميل PDF', 'Download PDF')}
                      </button>
                    </div>
                    {stmtLoading ? <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : statementData ? (
                      <div ref={stmtRef} className="space-y-4">
                        <div className="text-center border-b border-border pb-3">
                          <h2 className="text-lg font-bold">Neo FMC - {t('كشف حساب', 'Account Statement')}</h2>
                          <p className="text-sm text-muted-foreground">{t('العميل', 'Client')}: {statementData.client?.fullNameAr}</p>
                          <p className="text-xs text-muted-foreground">{t('تاريخ الإصدار', 'Generated')}: {new Date().toLocaleDateString('ar-EG')}</p>
                        </div>
                        {statementData.loans?.map((loanStmt: any, idx: number) => (
                          <div key={idx} className="space-y-3">
                            <div className="flex gap-4 text-sm bg-secondary/30 rounded-lg p-3">
                              <div><span className="text-muted-foreground">{t('المنصرف', 'Disbursed')}:</span> <span className="font-bold">{formatCurrency(loanStmt.loan.disbursedAmount)}</span></div>
                              <div><span className="text-muted-foreground">{t('المتبقي', 'Balance')}:</span> <span className="font-bold text-primary">{formatCurrency(loanStmt.loan.outstandingBalance)}</span></div>
                              <div><span className="text-muted-foreground">{t('الحالة', 'Status')}:</span> <span className="font-bold">{loanStmt.loan.status}</span></div>
                            </div>
                            <table className="w-full text-xs">
                              <thead className="bg-secondary/50"><tr>
                                <th className="px-2 py-2 text-right">#</th>
                                <th className="px-2 py-2 text-right">{t('التاريخ', 'Date')}</th>
                                <th className="px-2 py-2 text-right">{t('القسط', 'Amount')}</th>
                                <th className="px-2 py-2 text-right">{t('مدفوع', 'Paid')}</th>
                                <th className="px-2 py-2 text-right">{t('غرامة', 'Penalty')}</th>
                                <th className="px-2 py-2 text-right">{t('الحالة', 'Status')}</th>
                              </tr></thead>
                              <tbody className="divide-y divide-border">
                                {loanStmt.installments?.map((inst: any) => (
                                  <tr key={inst.installmentNumber} className={inst.status === 'Completed' ? 'opacity-50' : ''}>
                                    <td className="px-2 py-1.5">{inst.installmentNumber}</td>
                                    <td className="px-2 py-1.5 font-mono">{inst.dueDate}</td>
                                    <td className="px-2 py-1.5 font-mono">{formatCurrency(inst.totalAmount)}</td>
                                    <td className="px-2 py-1.5 font-mono text-green-400">{formatCurrency(inst.paidAmount)}</td>
                                    <td className="px-2 py-1.5 font-mono text-red-400">{inst.penaltyAmount > 0 ? formatCurrency(inst.penaltyAmount) : '-'}</td>
                                    <td className="px-2 py-1.5">{inst.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Briefcase size={20} className="text-primary"/> {t('جدول الأقساط', 'Installment Schedule')}
                    </h3>
                    <div className="premium-card overflow-hidden">
                       <table className="w-full text-sm text-center">
                         <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                           <tr>
                             <th className="px-3 py-3">#</th>
                             <th className="px-3 py-3">{t('التاريخ', 'Date')}</th>
                             <th className="px-3 py-3">{t('القسط', 'Amount')}</th>
                             <th className="px-3 py-3">{t('مدفوع', 'Paid')}</th>
                             <th className="px-3 py-3">{t('غرامة', 'Penalty')}</th>
                             <th className="px-3 py-3">{t('الحالة', 'Status')}</th>
                             {isActive && <th className="px-3 py-3"></th>}
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-border">
                           {loanDetail.installments.map(inst => (
                             <tr key={inst.id} className={cn("hover:bg-muted/30", inst.status === 'Completed' ? "opacity-60" : "")}>
                               <td className="px-3 py-3">{inst.installmentNumber}</td>
                               <td className="px-3 py-3 font-mono text-xs">{formatDate(inst.dueDate)}</td>
                               <td className="px-3 py-3 font-mono font-bold">{formatCurrency(inst.totalAmount)}</td>
                               <td className="px-3 py-3 font-mono text-green-400">{formatCurrency(inst.paidAmount)}</td>
                               <td className="px-3 py-3 font-mono text-red-400">{Number(inst.penaltyAmount) > 0 ? formatCurrency(inst.penaltyAmount) : '-'}</td>
                               <td className="px-3 py-3">
                                 {inst.status === 'Completed' ? <CheckCircle2 size={16} className="text-green-500 mx-auto"/> :
                                  <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold", getStatusColor(inst.status))}>{inst.status}</span>}
                               </td>
                               {isActive && (
                                 <td className="px-3 py-3">
                                   {inst.status === 'Pending' && (
                                     <button
                                       onClick={() => { setActionDialog({ type: 'payment', loanId: selectedLoanId! }); setActionForm({ paymentMethod: 'Cash', installmentId: inst.id, amount: String(Number(inst.totalAmount) - Number(inst.paidAmount)) }); }}
                                       className="text-xs text-green-400 hover:underline"
                                     >{t('سداد', 'Pay')}</button>
                                   )}
                                 </td>
                               )}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-muted-foreground">{t('المدفوعات', 'Payments')}</h3>
                    <div className="space-y-3">
                      {loanDetail.payments.length === 0 ? (
                        <div className="premium-card p-6 text-center text-muted-foreground text-sm border-dashed">
                           {t('لا توجد مدفوعات', 'No payments recorded')}
                        </div>
                      ) : (
                        loanDetail.payments.map(pay => (
                          <div key={pay.id} className="premium-card p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className={cn("font-bold", pay.status === 'Reversed' ? 'text-red-400 line-through' : 'text-green-400')}>{formatCurrency(pay.amount)}</span>
                              <div className="flex items-center gap-2">
                                {pay.status === 'Reversed' && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-md">{t('ملغي', 'Reversed')}</span>}
                                <span className="text-xs px-2 py-0.5 bg-secondary rounded-md">{pay.paymentMethod}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                              <span>{formatDate(pay.createdAt)}</span>
                              <div className="flex items-center gap-2">
                                {pay.referenceNumber && <span className="font-mono">Ref: {pay.referenceNumber}</span>}
                                {canReverse && pay.status !== 'Reversed' && (
                                  <button onClick={() => setReversalDialog({ type: 'reversePayment', id: pay.id, label: formatCurrency(pay.amount) })}
                                    className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors">
                                    {t('عكس', 'Reverse')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}

      {actionDialog && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {actionDialog.type === 'writeoff' && <><AlertTriangle size={18} className="text-red-400" /> {t('طلب إسقاط', 'Request Write-Off')}</>}
                {actionDialog.type === 'reschedule' && <><ArrowDownUp size={18} className="text-orange-400" /> {t('طلب إعادة جدولة', 'Request Reschedule')}</>}
                {actionDialog.type === 'settlement' && <><Banknote size={18} className="text-blue-400" /> {t('طلب تسوية مبكرة', 'Request Early Settlement')}</>}
                {actionDialog.type === 'payment' && <><CreditCard size={18} className="text-green-400" /> {t('تسجيل سداد', 'Record Payment')}</>}
              </h3>
              <button onClick={() => { setActionDialog(null); setActionForm({}); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {actionDialog.type !== 'payment' && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400 flex items-center gap-2">
                  <Clock size={16} />
                  {t('سيتم إرسال هذا الطلب للمراجعة والموافقة من قبل الإدارة', 'This request will be sent for management review and approval')}
                </div>
              )}

              {actionDialog.type === 'payment' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('المبلغ', 'Amount')} (EGP) *</label>
                    <input type="number" className={inputCls} value={actionForm.amount || ''} onChange={e => setActionForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" min={0} step={0.01} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('طريقة السداد', 'Payment Method')} *</label>
                    <select className={inputCls} value={actionForm.paymentMethod || 'Cash'} onChange={e => setActionForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                      <option value="Cash">{t('نقدي', 'Cash')}</option>
                      <option value="E-Payment">{t('دفع إلكتروني', 'E-Payment')}</option>
                      <option value="Cheque">{t('شيك', 'Cheque')}</option>
                      <option value="Bank Transfer">{t('تحويل بنكي', 'Bank Transfer')}</option>
                    </select>
                  </div>
                  {actionForm.paymentMethod && actionForm.paymentMethod !== 'Cash' && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t('رقم المرجع', 'Reference Number')}</label>
                      <input type="text" className={inputCls} value={actionForm.referenceNumber || ''} onChange={e => setActionForm(f => ({ ...f, referenceNumber: e.target.value }))} />
                    </div>
                  )}
                  {pendingInstallments.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t('تطبيق على قسط', 'Apply to Installment')}</label>
                      <select className={inputCls} value={actionForm.installmentId || ''} onChange={e => setActionForm(f => ({ ...f, installmentId: e.target.value }))}>
                        <option value="">{t('تلقائي (القسط الأقدم)', 'Auto (oldest pending)')}</option>
                        {pendingInstallments.map(inst => (
                          <option key={inst.id} value={inst.id}>#{inst.installmentNumber} - {formatDate(inst.dueDate)} - {formatCurrency(Number(inst.totalAmount) - Number(inst.paidAmount))}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
                    <input type="text" className={inputCls} value={actionForm.notes || ''} onChange={e => setActionForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </>
              )}

              {actionDialog.type === 'writeoff' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('سبب الإسقاط', 'Write-Off Reason')} *</label>
                    <textarea className={inputCls + " h-24 resize-none"} value={actionForm.reason || ''} onChange={e => setActionForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('اكتب سبب الإسقاط...', 'Enter write-off reason...')} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('ملاحظات إضافية', 'Additional Notes')}</label>
                    <textarea className={inputCls + " h-16 resize-none"} value={actionForm.notes || ''} onChange={e => setActionForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('ملاحظات اختيارية...', 'Optional notes...')} />
                  </div>
                </>
              )}

              {actionDialog.type === 'reschedule' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('المدة الجديدة (شهور)', 'New Term (months)')} *</label>
                    <input type="number" className={inputCls} value={actionForm.newTermMonths || ''} onChange={e => setActionForm(f => ({ ...f, newTermMonths: e.target.value }))} placeholder="12" min={1} max={120} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('سبب إعادة الجدولة', 'Reschedule Reason')} *</label>
                    <textarea className={inputCls + " h-24 resize-none"} value={actionForm.reason || ''} onChange={e => setActionForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('اكتب سبب إعادة الجدولة...', 'Enter reschedule reason...')} />
                  </div>
                </>
              )}

              {actionDialog.type === 'settlement' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('سيتم حساب مبلغ التسوية تلقائياً وعرضه للمراجع', 'Settlement amount will be calculated automatically and shown to the reviewer')}
                  </p>
                  <div className="p-3 rounded-lg bg-secondary/50 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('الرصيد المتبقي', 'Outstanding Balance')}</span>
                      <span className="font-bold font-mono">{formatCurrency(loanDetail?.loan?.outstandingBalance || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setActionDialog(null); setActionForm({}); }} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors">
                  {t('إلغاء', 'Cancel')}
                </button>
                <button onClick={handleSubmitAction} disabled={isSubmitting}
                  className={cn("px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                    actionDialog.type === 'payment' ? "bg-green-600 hover:bg-green-700 text-white" :
                    actionDialog.type === 'writeoff' ? "bg-red-600 hover:bg-red-700 text-white" :
                    actionDialog.type === 'reschedule' ? "bg-orange-600 hover:bg-orange-700 text-white" :
                    "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {actionDialog.type === 'payment' ? t('تأكيد السداد', 'Confirm Payment') : t('إرسال الطلب', 'Submit Request')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lastPayment && (
        <PaymentReceipt
          payment={lastPayment}
          loan={loanDetail?.loan}
          onClose={() => setLastPayment(null)}
          lang={pdfLang}
        />
      )}

      {reversalDialog && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                {reversalDialog.type === 'reversePayment' && t('عكس السداد', 'Reverse Payment')}
                {reversalDialog.type === 'rollbackLoan' && t('تراجع عن حالة القرض', 'Rollback Loan Status')}
              </h3>
              <button onClick={() => { setReversalDialog(null); setReversalReason(''); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                {reversalDialog.type === 'reversePayment'
                  ? t('سيتم عكس السداد وتحديث أرصدة القرض والأقساط. هذا الإجراء لا يمكن التراجع عنه.', 'This will reverse the payment and update loan/installment balances. This action cannot be undone.')
                  : t('سيتم إعادة حالة القرض إلى "نشط". هذا الإجراء لا يمكن التراجع عنه.', 'This will revert the loan status back to "Active". This action cannot be undone.')
                }
              </div>
              {reversalDialog.label && (
                <div className="p-3 rounded-lg bg-secondary text-sm">
                  {reversalDialog.type === 'reversePayment' && <><span className="text-muted-foreground">{t('مبلغ السداد:', 'Payment amount:')}</span> <span className="font-bold">{reversalDialog.label}</span></>}
                  {reversalDialog.type === 'rollbackLoan' && <><span className="text-muted-foreground">{t('الحالة الحالية:', 'Current status:')}</span> <span className="font-bold">{reversalDialog.label}</span> → <span className="font-bold text-green-400">Active</span></>}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('سبب العكس / التراجع', 'Reversal Reason')} *</label>
                <textarea
                  className={inputCls + " h-24 resize-none"}
                  value={reversalReason}
                  onChange={e => setReversalReason(e.target.value)}
                  placeholder={t('اكتب سبب العكس بالتفصيل...', 'Enter detailed reason for reversal...')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setReversalDialog(null); setReversalReason(''); }} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors">
                  {t('إلغاء', 'Cancel')}
                </button>
                <button onClick={handleReversalSubmit} disabled={isReversing || !reversalReason.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isReversing && <Loader2 size={14} className="animate-spin" />}
                  {t('تأكيد العكس', 'Confirm Reversal')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

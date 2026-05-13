import { useState } from 'react';
import { useListLoanRequests, useCreateLoanRequest, useUpdateLoanRequestStatus, useListClients, useListFundProducts } from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor, cn } from '@/lib/utils';
import { FileText, Plus, Search, Loader2, XCircle, ChevronRight, Check, ShieldCheck, AlertCircle, Briefcase, ExternalLink, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdminDelete } from '@/hooks/useSuperAdminDelete';

const STATUS_STAGES = ['Draft', 'CreditReview', 'FieldVisit', 'Approved', 'Disbursed'];

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  Draft: { ar: 'مسودة', en: 'Draft' },
  CreditReview: { ar: 'مراجعة ائتمانية', en: 'Credit Review' },
  FieldVisit: { ar: 'زيارة ميدانية', en: 'Field Visit' },
  Approved: { ar: 'موافق عليه', en: 'Approved' },
  Disbursed: { ar: 'تم الصرف', en: 'Disbursed' },
  Rejected: { ar: 'مرفوض', en: 'Rejected' },
};

const STAGE_ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  CreditReview: { ar: 'مسؤول الائتمان / مدير الفرع', en: 'Loan Officer / Branch Manager' },
  FieldVisit: { ar: 'مدير الفرع', en: 'Branch Manager' },
  Approved: { ar: 'مدير الفرع', en: 'Branch Manager' },
  Disbursed: { ar: 'مدير النظام', en: 'Tenant Admin' },
};

const WORKFLOW_ROLE_MAP: Record<string, string[]> = {
  CreditReview: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'DataEntry'],
  FieldVisit: ['TenantAdmin', 'BranchManager'],
  Approved: ['TenantAdmin', 'BranchManager'],
  Disbursed: ['TenantAdmin'],
  Rejected: ['TenantAdmin', 'BranchManager', 'LoanOfficer'],
};

export default function LoanRequests() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { isSuperAdmin, deleteRecord } = useSuperAdminDelete();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  const { data, isLoading, refetch } = useListLoanRequests({ query: { queryKey: ['/api/loan-requests', { status: filter }] }, request: { query: { status: filter, limit: 50 } } as any });
  const { data: clients } = useListClients({ request: { query: { limit: 100 } } as any });
  const { data: products } = useListFundProducts();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  const [formData, setFormData] = useState({
    clientId: '', productId: '', requestedAmount: 0, termMonths: 12, notes: ''
  });

  const createMutation = useCreateLoanRequest({
    mutation: {
      onSuccess: () => {
        toast({ title: t('تم بنجاح', 'Success') });
        setIsDialogOpen(false);
        refetch();
      }
    }
  });

  const updateStatusMutation = useUpdateLoanRequestStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: t('تم تحديث الحالة', 'Status Updated') });
        setSelectedReq(null);
        refetch();
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.message || error?.message || t('فشل التحديث', 'Update failed');
        toast({ title: t('خطأ', 'Error'), description: msg, variant: 'destructive' });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData as any });
  };

  const getNextStatus = (currentStatus: string) => {
    const idx = STATUS_STAGES.indexOf(currentStatus);
    if (idx < STATUS_STAGES.length - 1) return STATUS_STAGES[idx + 1];
    return null;
  };

  const canAdvance = (nextStatus: string | null) => {
    if (!nextStatus || !user) return false;
    const allowedRoles = WORKFLOW_ROLE_MAP[nextStatus];
    if (!allowedRoles) return true;
    return allowedRoles.includes(user.role);
  };

  const canReject = () => {
    if (!user) return false;
    const allowedRoles = WORKFLOW_ROLE_MAP['Rejected'];
    return allowedRoles.includes(user.role);
  };

  const advanceStatus = (currentStatus: string, id: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      updateStatusMutation.mutate({ id, data: { workflowStatus: nextStatus } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('طلبات التمويل', 'Loan Requests')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة سير عمل الطلبات', 'Origination pipeline workflow')}</p>
        </div>
        <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-medium">
          <Plus size={18} />
          {t('طلب جديد', 'New Request')}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {['', ...STATUS_STAGES, 'Rejected'].map(s => (
          <button 
            key={s} 
            onClick={() => setFilter(s)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border", 
              filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
            )}
          >
            {s === '' ? t('الكل', 'All') : t(STAGE_LABELS[s]?.ar || s, STAGE_LABELS[s]?.en || s)}
          </button>
        ))}
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('رقم الطلب', 'Ref #')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العميل', 'Client')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المنتج', 'Product')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                {isSuperAdmin && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><FileText size={32} className="mx-auto mb-3 opacity-20"/> {t('لا توجد طلبات', 'No requests found')}</td></tr>
              ) : (
                data?.data.map((req) => (
                  <tr key={req.id} onClick={() => setSelectedReq(req)} className="hover:bg-muted/30 cursor-pointer transition-colors group">
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{(req as any).requestNumber || '-'}</td>
                    <td className="px-4 py-4">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/clients?clientId=${(req as any).clientId}`); }} className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                        {req.clientName}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{req.productName}</td>
                    <td className="px-4 py-4">
                      <button onClick={(e) => { e.stopPropagation(); if (req.workflowStatus === 'Disbursed') navigate('/loans'); else setSelectedReq(req); }} className="font-mono font-bold text-primary hover:underline underline-offset-2 transition-colors">
                        {formatCurrency(req.requestedAmount)}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold border", getStatusColor(req.workflowStatus))}>
                        {t(STAGE_LABELS[req.workflowStatus]?.ar || req.workflowStatus, STAGE_LABELS[req.workflowStatus]?.en || req.workflowStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground text-xs">{formatDate(req.createdAt)}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {deleteConfirmId === req.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={async () => { const ok = await deleteRecord('loan_request', req.id, req.clientName, ['/api/loan-requests']); if (ok) setDeleteConfirmId(null); }} className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg">{t('تأكيد', 'Confirm')}</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded-lg">{t('إلغاء', 'Cancel')}</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(req.id)} className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded-lg" title={t('حذف', 'Delete')}>
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30">
              <h3 className="text-lg sm:text-xl font-bold">{t('تفاصيل الطلب', 'Request Details')}</h3>
              <button onClick={() => setSelectedReq(null)} className="text-muted-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">{t('العميل', 'Client')}</p>
                  <button onClick={() => { setSelectedReq(null); navigate(`/clients?clientId=${(selectedReq as any).clientId}`); }} className="text-lg font-bold hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                    {selectedReq.clientName}
                  </button>
                </div>
                <span className={cn("px-3 py-1 rounded-md text-sm font-bold border", getStatusColor(selectedReq.workflowStatus))}>
                  {t(STAGE_LABELS[selectedReq.workflowStatus]?.ar || selectedReq.workflowStatus, STAGE_LABELS[selectedReq.workflowStatus]?.en || selectedReq.workflowStatus)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-secondary/20 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-muted-foreground">{t('المبلغ', 'Amount')}</p>
                  <p className="font-mono font-bold text-primary">{formatCurrency(selectedReq.requestedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('المنتج', 'Product')}</p>
                  <p className="font-medium">{selectedReq.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('المدة', 'Term')}</p>
                  <p className="font-medium">{selectedReq.termMonths} {t('شهر', 'Months')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('تاريخ الطلب', 'Date')}</p>
                  <p className="font-medium">{formatDate(selectedReq.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">{t('مراحل سير العمل', 'Workflow Stages')}</p>
                <div className="flex items-center gap-1">
                  {STATUS_STAGES.map((stage, idx) => {
                    const currentIdx = STATUS_STAGES.indexOf(selectedReq.workflowStatus);
                    const isPast = idx < currentIdx || selectedReq.workflowStatus === 'Disbursed';
                    const isCurrent = idx === currentIdx && selectedReq.workflowStatus !== 'Rejected';
                    const isNext = idx === currentIdx + 1 && selectedReq.workflowStatus !== 'Disbursed' && selectedReq.workflowStatus !== 'Rejected';
                    return (
                      <div key={stage} className="flex items-center gap-1 flex-1">
                        <div className={cn(
                          "flex flex-col items-center flex-1 min-w-0",
                        )}>
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                            isPast ? "bg-green-500 border-green-500 text-white" :
                            isCurrent ? "bg-primary border-primary text-white animate-pulse" :
                            "bg-secondary border-border text-muted-foreground"
                          )}>
                            {isPast ? <Check size={14} /> : idx + 1}
                          </div>
                          <p className={cn("text-[10px] mt-1 text-center leading-tight truncate w-full", isCurrent ? "font-bold text-primary" : "text-muted-foreground")}>
                            {t(STAGE_LABELS[stage]?.ar || stage, STAGE_LABELS[stage]?.en || stage)}
                          </p>
                          {isNext && STAGE_ROLE_LABELS[stage] && (
                            <p className="text-[9px] text-muted-foreground text-center mt-0.5 leading-tight">
                              {t(STAGE_ROLE_LABELS[stage].ar, STAGE_ROLE_LABELS[stage].en)}
                            </p>
                          )}
                        </div>
                        {idx < STATUS_STAGES.length - 1 && (
                          <div className={cn("h-0.5 w-2 flex-shrink-0", isPast ? "bg-green-500" : "bg-border")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedReq.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('ملاحظات', 'Notes')}</p>
                  <p className="text-sm bg-background p-3 rounded-lg border border-border">{selectedReq.notes}</p>
                </div>
              )}

              {selectedReq.workflowStatus === 'Disbursed' && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                  <Briefcase size={20} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-400">{t('تم صرف القرض', 'Loan Disbursed')}</p>
                    <p className="text-xs text-muted-foreground">{t('تم إنشاء القرض وجدول الأقساط. اذهب لصفحة المحفظة النشطة لعرض التفاصيل والأقساط.', 'Loan and installment schedule created. Go to Active Portfolio page to view details and installments.')}</p>
                  </div>
                  <button onClick={() => { setSelectedReq(null); navigate('/loans'); }} className="text-xs font-medium text-primary hover:underline whitespace-nowrap flex items-center gap-1">
                    {t('عرض القرض', 'View Loan')} <ChevronRight size={14} className={isRtl ? "rotate-180" : ""} />
                  </button>
                </div>
              )}

              {selectedReq.workflowStatus !== 'Disbursed' && selectedReq.workflowStatus !== 'Rejected' && (() => {
                const nextStatus = getNextStatus(selectedReq.workflowStatus);
                const userCanAdvance = canAdvance(nextStatus);
                const userCanReject = canReject();
                const nextRoleLabel = nextStatus && STAGE_ROLE_LABELS[nextStatus];

                return (
                  <div className="space-y-3 pt-4 border-t border-border">
                    {!userCanAdvance && nextStatus && nextRoleLabel && (
                      <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                        <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-orange-300">
                          {t(
                            `لا يمكنك ترقية الحالة إلى "${STAGE_LABELS[nextStatus]?.ar}". هذه المرحلة مخصصة لـ: ${nextRoleLabel.ar}`,
                            `You cannot advance to "${STAGE_LABELS[nextStatus]?.en}". This stage requires: ${nextRoleLabel.en}`
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button 
                        disabled={updateStatusMutation.isPending || !userCanReject}
                        onClick={() => updateStatusMutation.mutate({ id: selectedReq.id, data: { workflowStatus: 'Rejected' }})}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-medium flex-1 transition-colors",
                          userCanReject
                            ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                            : "text-muted-foreground bg-secondary/50 cursor-not-allowed opacity-50"
                        )}
                      >
                        {t('رفض', 'Reject')}
                      </button>
                      <button 
                        disabled={updateStatusMutation.isPending || !userCanAdvance}
                        onClick={() => advanceStatus(selectedReq.workflowStatus, selectedReq.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-bold flex-[2] flex items-center justify-center gap-2 transition-all",
                          userCanAdvance
                            ? "text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            : "text-muted-foreground bg-secondary/50 cursor-not-allowed opacity-50"
                        )}
                      >
                        {updateStatusMutation.isPending ? (
                          <Loader2 className="animate-spin" size={18}/>
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            {nextStatus ? t(
                              `ترقية إلى: ${STAGE_LABELS[nextStatus]?.ar}`,
                              `Advance to: ${STAGE_LABELS[nextStatus]?.en}`
                            ) : t('ترقية الحالة', 'Advance Status')}
                            <ChevronRight size={18} className={isRtl ? "rotate-180" : ""}/>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isDialogOpen && (() => {
        const selectedProduct = products?.find((p: any) => p.id === formData.productId) as any;
        return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold">{t('طلب تمويل جديد', 'New Loan Request')}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('العميل', 'Client')}</label>
                <select required className="premium-input" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                  <option value="">{t('اختر العميل...', 'Select Client...')}</option>
                  {clients?.data.map(c => <option key={c.id} value={c.id}>{c.fullNameAr} - {c.nationalId}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('منتج التمويل', 'Fund Product')}</label>
                <select required className="premium-input" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                  <option value="">{t('اختر المنتج...', 'Select Product...')}</option>
                  {products?.map((p: any) => <option key={p.id} value={p.id}>{p.productName} ({Number(p.interestRate)}%)</option>)}
                </select>
                {selectedProduct && (
                  <div className="text-xs bg-secondary/30 p-3 rounded-lg space-y-1 border border-border/50">
                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-muted-foreground">{t('الفائدة', 'Interest')}:</span> <span className="font-bold text-primary">{Number(selectedProduct.interestRate)}%</span></p>
                      <p><span className="text-muted-foreground">{t('السداد', 'Amortization')}:</span> <span className="font-medium">{selectedProduct.amortizationMethod}</span></p>
                      <p><span className="text-muted-foreground">{t('رسوم إدارية', 'Admin Fee')}:</span> <span className="font-medium">{Number(selectedProduct.adminFeePct)}%</span></p>
                      <p><span className="text-muted-foreground">{t('تأمين', 'Insurance')}:</span> <span className="font-medium">{Number(selectedProduct.insuranceFeePct)}%</span></p>
                    </div>
                    <p className="text-muted-foreground pt-1 border-t border-border/50">
                      {t('المبلغ', 'Amount')}: {formatCurrency(selectedProduct.minAmount)} - {formatCurrency(selectedProduct.maxAmount)} | {t('المدة', 'Term')}: {selectedProduct.minTermMonths}-{selectedProduct.maxTermMonths} {t('شهر', 'mo')}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('المبلغ', 'Amount')}</label>
                  <input required type="number" className="premium-input" value={formData.requestedAmount || ''} onChange={e => setFormData({...formData, requestedAmount: Number(e.target.value)})} placeholder={selectedProduct ? `${formatCurrency(selectedProduct.minAmount)} - ${formatCurrency(selectedProduct.maxAmount)}` : ''} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('المدة (أشهر)', 'Term')}</label>
                  <input required type="number" className="premium-input" value={formData.termMonths || ''} onChange={e => setFormData({...formData, termMonths: Number(e.target.value)})} placeholder={selectedProduct ? `${selectedProduct.minTermMonths}-${selectedProduct.maxTermMonths}` : ''} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('ملاحظات', 'Notes')}</label>
                <textarea className="premium-input min-h-[80px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded-xl font-medium hover:bg-secondary">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium">
                  {createMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : t('حفظ', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalRequests, useApprovalStats, useApproveRequest, useRejectRequest } from '@/hooks/useComplianceApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDate } from '@/lib/utils';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Loader2, X,
  AlertTriangle, FileText, RotateCcw,
} from 'lucide-react';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

const typeColors: Record<string, string> = {
  Settlement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Reschedule: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  WriteOff: "bg-red-500/10 text-red-400 border-red-500/20",
  LoanModification: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  FeeWaiver: "bg-green-500/10 text-green-400 border-green-500/20",
  Disbursement: "bg-accent/10 text-accent border-accent/20",
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  Settlement: { ar: "تسوية", en: "Settlement" },
  Reschedule: { ar: "إعادة جدولة", en: "Reschedule" },
  WriteOff: { ar: "إسقاط", en: "Write-Off" },
  LoanModification: { ar: "تعديل قرض", en: "Loan Modification" },
  FeeWaiver: { ar: "إعفاء رسوم", en: "Fee Waiver" },
  Disbursement: { ar: "صرف", en: "Disbursement" },
};

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Approved: "bg-green-500/10 text-green-400 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Approvals() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [withdrawDialog, setWithdrawDialog] = useState<{ id: string; type: string } | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useApprovalStats();
  const { data: requests, isLoading } = useApprovalRequests(statusFilter || undefined);
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const withdrawMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) => api.post(`/approval-requests/${data.id}/withdraw`, { reason: data.reason }),
    onSuccess: () => {
      toast({ title: t('تم سحب الموافقة', 'Approval Withdrawn'), description: t('تم سحب الموافقة وإرجاع الحالة بنجاح', 'Approval withdrawn and status reverted') });
      setWithdrawDialog(null); setWithdrawReason('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const canApprove = user?.role === 'CompanyAdmin' || user?.role === 'BranchManager' || user?.role === 'TenantAdmin' || user?.role === 'FinancialController' || user?.role === 'CFO';
  const canWithdraw = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin' || user?.role === 'FinancialController' || user?.role === 'CFO';

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast({ title: t('تمت الموافقة', 'Approved'), description: t('تمت الموافقة على الطلب', 'Request approved successfully') }),
      onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
    });
  };

  const handleReject = () => {
    if (!rejectId) return;
    rejectMutation.mutate({ id: rejectId, rejectionReason }, {
      onSuccess: () => {
        toast({ title: t('تم الرفض', 'Rejected'), description: t('تم رفض الطلب', 'Request rejected') });
        setRejectId(null);
        setRejectionReason('');
      },
      onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
    });
  };

  if (isLoading || statsLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const statCards = [
    { label: t('بانتظار الموافقة', 'Pending'), value: stats?.pending || 0, icon: Clock, color: 'text-yellow-400' },
    { label: t('موافق عليها', 'Approved'), value: stats?.approved || 0, icon: CheckCircle2, color: 'text-green-400' },
    { label: t('مرفوضة', 'Rejected'), value: stats?.rejected || 0, icon: XCircle, color: 'text-red-400' },
  ];

  const statusTabs = [
    { key: '', label: t('الكل', 'All') },
    { key: 'Pending', label: t('بانتظار', 'Pending') },
    { key: 'Approved', label: t('موافق', 'Approved') },
    { key: 'Rejected', label: t('مرفوض', 'Rejected') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('طلبات الموافقة', 'Approval Requests')}</h2>
        <p className="text-muted-foreground mt-1">{t('نظام المراجعة الثنائية (صانع-مراجع)', 'Maker-Checker Review System')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="premium-card p-5 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">{s.label}</p>
              <h3 className="text-3xl font-display font-bold mt-1">{s.value}</h3>
            </div>
            <div className={cn("w-12 h-12 rounded-xl bg-secondary flex items-center justify-center", s.color)}>
              <s.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              statusFilter === tab.key ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المرجع', 'Reference')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('مقدم الطلب', 'Requested By')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                {(canApprove || canWithdraw) && <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests?.data?.map((req: any) => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", typeColors[req.requestType] || "bg-secondary")}>
                      {t(typeLabels[req.requestType]?.ar || req.requestType, typeLabels[req.requestType]?.en || req.requestType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm">{req.referenceLabel || req.referenceId?.substring(0, 8) + '...'}</p>
                    {req.data && (
                      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {req.data.reason && <p>{t('السبب:', 'Reason:')} {req.data.reason}</p>}
                        {req.data.newTermMonths && <p>{t('المدة الجديدة:', 'New term:')} {req.data.newTermMonths} {t('شهور', 'months')}</p>}
                        {req.data.outstandingBalance && <p>{t('الرصيد:', 'Balance:')} {Number(req.data.outstandingBalance).toLocaleString()} {t('ج.م', 'EGP')}</p>}
                        {req.data.totalDue && <p>{t('المبلغ المستحق:', 'Total due:')} {Number(req.data.totalDue).toLocaleString()} {t('ج.م', 'EGP')}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{req.requestedByName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", statusColors[req.status] || "bg-secondary")}>
                      {req.status}
                    </span>
                    {req.rejectionReason && (
                      <p className="text-xs text-red-400 mt-1">{req.rejectionReason}</p>
                    )}
                    {req.approvedByName && req.status !== 'Pending' && (
                      <p className="text-xs text-muted-foreground mt-1">{t('بواسطة', 'by')} {req.approvedByName}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(req.createdAt)}</td>
                  {(canApprove || canWithdraw) && (
                    <td className="px-6 py-4">
                      {req.status === 'Pending' && canApprove && req.requestedById !== user?.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={approveMutation.isPending}
                            className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
                          >
                            {t('موافقة', 'Approve')}
                          </button>
                          <button
                            onClick={() => setRejectId(req.id)}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
                          >
                            {t('رفض', 'Reject')}
                          </button>
                        </div>
                      )}
                      {req.status === 'Approved' && canWithdraw && (
                        <button
                          onClick={() => setWithdrawDialog({ id: req.id, type: req.requestType })}
                          className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> {t('سحب الموافقة', 'Withdraw')}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(!requests?.data || requests.data.length === 0) && (
                <tr>
                  <td colSpan={(canApprove || canWithdraw) ? 6 : 5} className="px-6 py-12 text-center text-muted-foreground">
                    <FileText size={32} className="mx-auto mb-3 opacity-20" />
                    {t('لا توجد طلبات', 'No approval requests found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2"><AlertTriangle size={18} className="text-red-400" /> {t('رفض الطلب', 'Reject Request')}</h3>
              <button onClick={() => setRejectId(null)} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('سبب الرفض', 'Rejection Reason')}</label>
                <textarea
                  className={inputCls + " h-24 resize-none"}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder={t('اكتب سبب الرفض...', 'Enter rejection reason...')}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setRejectId(null)} className="px-4 py-2 rounded-xl hover:bg-secondary transition-colors">{t('إلغاء', 'Cancel')}</button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {rejectMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : t('تأكيد الرفض', 'Confirm Reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {withdrawDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <RotateCcw size={18} className="text-orange-400" /> {t('سحب الموافقة', 'Withdraw Approval')}
              </h3>
              <button onClick={() => { setWithdrawDialog(null); setWithdrawReason(''); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                {t('سيتم سحب الموافقة وإرجاع حالة الكيان المرتبط. هذا الإجراء يتم تسجيله في سجل المراجعة.', 'This will withdraw the approval and revert the associated entity status. This action is logged in the audit trail.')}
              </div>
              <div className="p-3 rounded-lg bg-secondary text-sm">
                <span className="text-muted-foreground">{t('نوع الطلب:', 'Request type:')}</span>{' '}
                <span className="font-bold">{t(typeLabels[withdrawDialog.type]?.ar || withdrawDialog.type, typeLabels[withdrawDialog.type]?.en || withdrawDialog.type)}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('سبب سحب الموافقة', 'Withdrawal Reason')} *</label>
                <textarea
                  className={inputCls + " h-24 resize-none"}
                  value={withdrawReason}
                  onChange={e => setWithdrawReason(e.target.value)}
                  placeholder={t('اكتب سبب سحب الموافقة بالتفصيل...', 'Enter detailed reason for withdrawal...')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setWithdrawDialog(null); setWithdrawReason(''); }} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors">
                  {t('إلغاء', 'Cancel')}
                </button>
                <button onClick={() => { if (withdrawReason.trim()) withdrawMutation.mutate({ id: withdrawDialog.id, reason: withdrawReason }); }}
                  disabled={withdrawMutation.isPending || !withdrawReason.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50">
                  {withdrawMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {t('تأكيد السحب', 'Confirm Withdrawal')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

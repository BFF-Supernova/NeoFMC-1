import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useListUsers, useListBranches } from '@workspace/api-client-react';
import { usePortfolioTransfers, useCreatePortfolioTransfer } from '@/hooks/useComplianceApi';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDate } from '@/lib/utils';
import { ArrowRightLeft, Loader2, X, Send, History, Users, Building2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

const TRANSFER_TYPES = [
  { value: 'officer_to_officer', labelAr: 'ضابط ← ضابط (نفس الفرع)', labelEn: 'Officer → Officer (Same Branch)' },
  { value: 'branch_to_branch', labelAr: 'فرع ← فرع', labelEn: 'Branch → Branch' },
  { value: 'cross_branch_officer', labelAr: 'ضابط ← ضابط (فروع مختلفة)', labelEn: 'Officer → Officer (Cross-Branch)' },
];

export default function PortfolioTransfer() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    transferType: 'officer_to_officer',
    fromOfficerId: '', toOfficerId: '', fromBranchId: '', toBranchId: '', reason: ''
  });

  const { data: users } = useListUsers();
  const { data: branches } = useListBranches();
  const { data: transfers, isLoading, refetch } = usePortfolioTransfers();
  const transferMutation = useCreatePortfolioTransfer();

  const officers = (users as any)?.data?.filter((u: any) => ['LoanOfficer', 'CollectionOfficer'].includes(u.role)) || users?.filter?.((u: any) => ['LoanOfficer', 'CollectionOfficer'].includes(u.role)) || [];
  const branchList = (branches as any)?.data || branches || [];

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.transferType === 'officer_to_officer' && (!form.fromOfficerId || !form.toOfficerId)) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: t('اختر ضابط المصدر والهدف', 'Select source and target officers') });
      return;
    }
    if (form.transferType === 'branch_to_branch' && (!form.fromBranchId || !form.toBranchId)) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: t('اختر الفرع المصدر والهدف', 'Select source and target branches') });
      return;
    }
    if (form.transferType === 'cross_branch_officer' && (!form.fromOfficerId || !form.toOfficerId)) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: t('اختر ضابط المصدر والهدف', 'Select source and target officers') });
      return;
    }

    transferMutation.mutate({
      transferType: form.transferType,
      fromOfficerId: form.fromOfficerId || undefined,
      toOfficerId: form.toOfficerId || undefined,
      fromBranchId: form.fromBranchId || undefined,
      toBranchId: form.toBranchId || undefined,
      reason: form.reason || undefined,
    } as any, {
      onSuccess: (data: any) => {
        const status = data.status === 'PendingApproval'
          ? t('بانتظار الموافقة', 'Pending approval')
          : t('تم التحويل', 'Transfer completed');
        toast({ title: status, description: t(`${data.loanCount || 0} قرض`, `${data.loanCount || 0} loans`) });
        setShowModal(false);
        setForm({ transferType: 'officer_to_officer', fromOfficerId: '', toOfficerId: '', fromBranchId: '', toBranchId: '', reason: '' });
        refetch();
      },
      onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
    });
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/portfolio-transfers/${id}/approve`, {});
      toast({ title: t('تمت الموافقة', 'Approved') });
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/portfolio-transfers/${id}/reject`, {});
      toast({ title: t('تم الرفض', 'Rejected') });
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message });
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const transferHistory = transfers?.data || [];

  const statusBadge = (status: string) => {
    if (status === 'Completed') return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600"><CheckCircle size={12} />{t('مكتمل', 'Completed')}</span>;
    if (status === 'PendingApproval') return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600"><Clock size={12} />{t('بانتظار الموافقة', 'Pending')}</span>;
    if (status === 'Rejected') return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-600"><XCircle size={12} />{t('مرفوض', 'Rejected')}</span>;
    return <span className="text-xs text-muted-foreground">{status || '-'}</span>;
  };

  const transferTypeLabel = (type: string) => {
    const tt = TRANSFER_TYPES.find(t => t.value === type);
    return tt ? t(tt.labelAr, tt.labelEn) : type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ArrowRightLeft size={24} className="text-primary" />{t('تحويل المحفظة', 'Portfolio Transfer')}</h2>
          <p className="text-muted-foreground mt-1">{t('تحويل القروض بين الضباط والفروع', 'Transfer loans between officers and branches')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium transition-all">
          <Send size={18} />
          {t('تحويل جديد', 'New Transfer')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('إجمالي التحويلات', 'Total Transfers')}</p>
            <h3 className="text-3xl font-display font-bold mt-1">{transferHistory.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><History size={24} /></div>
        </div>
        <div className="premium-card p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('إجمالي القروض المحولة', 'Total Loans Transferred')}</p>
            <h3 className="text-3xl font-display font-bold mt-1">{transferHistory.reduce((s: number, t: any) => s + (t.loanCount || 0), 0)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent"><ArrowRightLeft size={24} /></div>
        </div>
        <div className="premium-card p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('بانتظار الموافقة', 'Pending Approval')}</p>
            <h3 className="text-3xl font-display font-bold mt-1">{transferHistory.filter((t: any) => t.status === 'PendingApproval').length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600"><Clock size={24} /></div>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold flex items-center gap-2"><History size={18} /> {t('سجل التحويلات', 'Transfer History')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('من', 'From')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إلى', 'To')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('القروض', 'Loans')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراء', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transferHistory.map((tr: any) => (
                <tr key={tr.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs">{transferTypeLabel(tr.transferType)}</td>
                  <td className="px-4 py-3">
                    {tr.fromOfficerName && <div className="flex items-center gap-1"><Users size={14} className="text-muted-foreground" />{tr.fromOfficerName}</div>}
                    {tr.fromBranchName && <div className="flex items-center gap-1"><Building2 size={14} className="text-muted-foreground" />{tr.fromBranchName}</div>}
                    {!tr.fromOfficerName && !tr.fromBranchName && <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {tr.toOfficerName && <div className="flex items-center gap-1 text-primary"><Users size={14} />{tr.toOfficerName}</div>}
                    {tr.toBranchName && <div className="flex items-center gap-1 text-primary"><Building2 size={14} />{tr.toBranchName}</div>}
                  </td>
                  <td className="px-4 py-3 font-bold text-accent">{tr.loanCount}</td>
                  <td className="px-4 py-3">{statusBadge(tr.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(tr.createdAt)}</td>
                  <td className="px-4 py-3">
                    {tr.status === 'PendingApproval' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(tr.id)} className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20">{t('موافقة', 'Approve')}</button>
                        <button onClick={() => handleReject(tr.id)} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20">{t('رفض', 'Reject')}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {transferHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <ArrowRightLeft size={32} className="mx-auto mb-3 opacity-20" />
                    {t('لا توجد تحويلات', 'No transfers yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold">{t('تحويل محفظة', 'Portfolio Transfer')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('نوع التحويل', 'Transfer Type')}</label>
                <select className={inputCls} value={form.transferType} onChange={e => setForm({ ...form, transferType: e.target.value, fromOfficerId: '', toOfficerId: '', fromBranchId: '', toBranchId: '' })}>
                  {TRANSFER_TYPES.map(tt => (
                    <option key={tt.value} value={tt.value}>{t(tt.labelAr, tt.labelEn)}</option>
                  ))}
                </select>
              </div>

              {(form.transferType === 'officer_to_officer' || form.transferType === 'cross_branch_officer') && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('من ضابط', 'From Officer')} <span className="text-destructive">*</span></label>
                    <select className={inputCls} value={form.fromOfficerId} onChange={e => setForm({ ...form, fromOfficerId: e.target.value })}>
                      <option value="">{t('اختر ضابط', 'Select Officer')}</option>
                      {officers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} {u.branchName ? `(${u.branchName})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('إلى ضابط', 'To Officer')} <span className="text-destructive">*</span></label>
                    <select className={inputCls} value={form.toOfficerId} onChange={e => setForm({ ...form, toOfficerId: e.target.value })}>
                      <option value="">{t('اختر ضابط', 'Select Officer')}</option>
                      {officers.filter((u: any) => u.id !== form.fromOfficerId).map((u: any) => <option key={u.id} value={u.id}>{u.fullName} {u.branchName ? `(${u.branchName})` : ''}</option>)}
                    </select>
                  </div>
                </>
              )}

              {form.transferType === 'branch_to_branch' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('من فرع', 'From Branch')} <span className="text-destructive">*</span></label>
                    <select className={inputCls} value={form.fromBranchId} onChange={e => setForm({ ...form, fromBranchId: e.target.value })}>
                      <option value="">{t('اختر فرع', 'Select Branch')}</option>
                      {branchList.map((b: any) => <option key={b.id} value={b.id}>{b.nameAr || b.branchNameAr || b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t('إلى فرع', 'To Branch')} <span className="text-destructive">*</span></label>
                    <select className={inputCls} value={form.toBranchId} onChange={e => setForm({ ...form, toBranchId: e.target.value })}>
                      <option value="">{t('اختر فرع', 'Select Branch')}</option>
                      {branchList.filter((b: any) => b.id !== form.fromBranchId).map((b: any) => <option key={b.id} value={b.id}>{b.nameAr || b.branchNameAr || b.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {form.transferType === 'cross_branch_officer' && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700">
                  {t('تحويلات بين فروع مختلفة تتطلب موافقة المدير', 'Cross-branch transfers require admin approval')}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('السبب', 'Reason')}</label>
                <textarea className={inputCls + " h-20 resize-none"} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder={t('سبب التحويل...', 'Transfer reason...')} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl hover:bg-secondary transition-colors">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={transferMutation.isPending} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium disabled:opacity-50">
                  {transferMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : t('تحويل', 'Transfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

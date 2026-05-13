import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Wallet, AlertOctagon, CheckCircle2, Loader2, Calendar, CreditCard, X, ClipboardList, Phone, MapPin, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

export default function Collection() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'my-tasks'>('upcoming');
  const [payDialog, setPayDialog] = useState<{ loanId: string; installmentId: string; amount: number; clientName: string } | null>(null);
  const [payForm, setPayForm] = useState<Record<string, string>>({ paymentMethod: 'Cash' });

  const { data: upcoming, isLoading: upLoading } = useQuery({
    queryKey: ['/api/installments/upcoming'],
    queryFn: () => api.get<any>('/installments/upcoming?days=7&limit=50'),
  });

  const { data: overdue, isLoading: overLoading } = useQuery({
    queryKey: ['/api/installments/overdue'],
    queryFn: () => api.get<any>('/installments/overdue?limit=50'),
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/installments/my-tasks'],
    queryFn: () => api.get<any>('/installments/my-tasks'),
    enabled: tab === 'my-tasks',
  });

  const recordPayment = useMutation({
    mutationFn: (data: any) => api.post('/payments', data),
    onSuccess: () => {
      toast({ title: t('تم تسجيل السداد', 'Payment Recorded'), description: t('تم تسجيل السداد بنجاح', 'Payment recorded successfully') });
      setPayDialog(null); setPayForm({ paymentMethod: 'Cash' });
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const handlePay = () => {
    if (!payDialog || !payForm.amount || Number(payForm.amount) <= 0) return;
    recordPayment.mutate({
      loanId: payDialog.loanId,
      installmentId: payDialog.installmentId,
      amount: Number(payForm.amount),
      paymentMethod: payForm.paymentMethod || 'Cash',
      referenceNumber: payForm.referenceNumber || undefined,
      notes: payForm.notes || undefined,
    });
  };

  const isOfficer = user?.role === 'LoanOfficer';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('التحصيل والمتابعة', 'Collection')}</h2>
          <p className="text-muted-foreground mt-1">{t('متابعة الأقساط المستحقة والمتأخرة', 'Track upcoming and overdue installments')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         <div className="premium-card p-5 border-yellow-500/20 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors" onClick={() => setTab('upcoming')}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-yellow-500 mb-1">{t('مستحق خلال 7 أيام', 'Due within 7 days')}</p>
                <h3 className="text-3xl font-display font-bold text-foreground">{upcoming?.total || 0}</h3>
              </div>
              <Calendar size={32} className="text-yellow-500/40" />
            </div>
         </div>
         <div className="premium-card p-5 border-red-500/20 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => setTab('overdue')}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-red-500 mb-1">{t('أقساط متأخرة', 'Overdue Installments')}</p>
                <h3 className="text-3xl font-display font-bold text-foreground">{overdue?.total || 0}</h3>
              </div>
              <AlertOctagon size={32} className="text-red-500/40" />
            </div>
         </div>
         <div className="premium-card p-5 border-blue-500/20 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors" onClick={() => setTab('my-tasks')}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-500 mb-1">{t('مهامي اليوم', 'My Tasks Today')}</p>
                <h3 className="text-3xl font-display font-bold text-foreground"><ClipboardList size={28} className="inline" /></h3>
              </div>
              <ClipboardList size={32} className="text-blue-500/40" />
            </div>
         </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'upcoming' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('upcoming')}>
          {t('القادمة', 'Upcoming')}
        </button>
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap text-sm", tab === 'overdue' ? "border-red-500 text-red-500" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('overdue')}>
          {t('المتأخرة', 'Overdue')}
          {overdue && overdue.total > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{overdue.total}</span>}
        </button>
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap text-sm", tab === 'my-tasks' ? "border-blue-500 text-blue-500" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('my-tasks')}>
          {t('مهامي', 'My Tasks')}
        </button>
      </div>

      {tab === 'my-tasks' ? (
        <div className="space-y-4">
          {tasksLoading ? (
            <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
          ) : myTasks?.data?.length === 0 ? (
            <div className="premium-card p-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 text-green-500 opacity-50" size={32}/>
              {t('لا توجد مهام اليوم', 'No tasks for today')}
            </div>
          ) : (
            myTasks?.data?.map((task: any, i: number) => (
              <div key={i} className={cn("premium-card p-5 transition-all hover:shadow-lg", task.isOverdue ? "border-red-500/30 bg-red-500/5" : "")}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigate(`/clients?clientId=${task.clientId}`)} className="font-bold text-lg hover:text-primary hover:underline underline-offset-2 transition-colors text-left">{task.clientName}</button>
                      {task.isOverdue && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">{t('متأخر', 'OVERDUE')}</span>}
                      {!task.isOverdue && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold">{t('مستحق', 'DUE')}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={13} /> {t('القسط', 'Inst.')} #{task.installment.installmentNumber} - {formatDate(task.installment.dueDate)}</span>
                      {task.phone && <span className="flex items-center gap-1"><Phone size={13} /> {task.phone}</span>}
                      {task.address && <span className="flex items-center gap-1"><MapPin size={13} /> {task.address}</span>}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>{t('المستحق', 'Due')}: <strong className="text-primary">{formatCurrency(task.installment.totalAmount)}</strong></span>
                      <span>{t('مدفوع', 'Paid')}: <strong className="text-green-400">{formatCurrency(task.installment.paidAmount)}</strong></span>
                      {task.installment.calculatedPenalty > 0 && <span>{t('غرامة', 'Penalty')}: <strong className="text-red-400">{formatCurrency(task.installment.calculatedPenalty)}</strong></span>}
                      {task.isOverdue && <span>{t('أيام التأخير', 'Days Late')}: <strong className="text-red-400">{task.installment.daysOverdue}</strong></span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const remaining = Number(task.installment.totalAmount) - Number(task.installment.paidAmount) + Number(task.installment.calculatedPenalty || 0);
                      setPayDialog({ loanId: task.loanId, installmentId: task.installment.id, amount: remaining, clientName: task.clientName });
                      setPayForm({ paymentMethod: 'Cash', amount: String(remaining) });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm flex items-center gap-2 shrink-0 transition-colors"
                  >
                    <CreditCard size={16} /> {t('تسجيل سداد', 'Record Payment')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="premium-card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العميل', 'Client')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('رقم القسط', 'Inst. #')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('تاريخ الاستحقاق', 'Due Date')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                  {tab === 'overdue' && <th className={cn("px-6 py-4 font-semibold text-red-400", isRtl ? "text-right" : "text-left")}>{t('أيام التأخير', 'Days Late')}</th>}
                  {tab === 'overdue' && <th className={cn("px-6 py-4 font-semibold text-red-400", isRtl ? "text-right" : "text-left")}>{t('غرامة', 'Penalty')}</th>}
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tab === 'upcoming' && (
                  upLoading ? (
                    <tr><td colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : upcoming?.data?.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">{t('لا توجد أقساط قادمة', 'No upcoming installments')}</td></tr>
                  ) : (
                    upcoming?.data?.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <button onClick={() => navigate(`/clients?clientId=${item.clientId}`)} className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                            {item.clientName}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{item.installment.installmentNumber}</td>
                        <td className="px-6 py-4 font-mono">{formatDate(item.installment.dueDate)}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => navigate('/loans')} className="font-mono font-bold text-primary hover:underline underline-offset-2 transition-colors">
                            {formatCurrency(item.installment.totalAmount)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              const rem = Number(item.installment.totalAmount) - Number(item.installment.paidAmount);
                              setPayDialog({ loanId: item.loanId, installmentId: item.installment.id, amount: rem, clientName: item.clientName });
                              setPayForm({ paymentMethod: 'Cash', amount: String(rem) });
                            }}
                            className="text-xs font-medium text-green-400 hover:underline flex items-center gap-1"
                          >
                            <CreditCard size={13} /> {t('سداد', 'Pay')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                )}

                {tab === 'overdue' && (
                  overLoading ? (
                    <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : overdue?.data?.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 text-green-500 opacity-50" size={32}/>{t('المحفظة ممتازة! لا يوجد تأخير', 'Perfect portfolio! No overdue')}</td></tr>
                  ) : (
                    overdue?.data?.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <button onClick={() => navigate(`/clients?clientId=${item.clientId}`)} className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                            {item.clientName}
                          </button>
                          <div className="text-xs text-muted-foreground font-mono mt-1">{item.nationalId}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{item.installment.installmentNumber}</td>
                        <td className="px-6 py-4 font-mono text-red-400">{formatDate(item.installment.dueDate)}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => navigate('/loans')} className="font-mono font-bold hover:text-primary hover:underline underline-offset-2 transition-colors">
                            {formatCurrency(item.installment.totalAmount)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-bold">{item.installment.daysOverdue}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-red-400">{item.installment.calculatedPenalty > 0 ? formatCurrency(item.installment.calculatedPenalty) : '-'}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              const rem = Number(item.installment.totalAmount) - Number(item.installment.paidAmount) + Number(item.installment.calculatedPenalty || 0);
                              setPayDialog({ loanId: item.loanId, installmentId: item.installment.id, amount: rem, clientName: item.clientName });
                              setPayForm({ paymentMethod: 'Cash', amount: String(rem) });
                            }}
                            className="text-xs font-medium text-green-400 hover:underline flex items-center gap-1"
                          >
                            <CreditCard size={13} /> {t('سداد', 'Pay')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payDialog && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2"><CreditCard size={18} className="text-green-400" /> {t('تسجيل سداد', 'Record Payment')}</h3>
              <button onClick={() => { setPayDialog(null); setPayForm({ paymentMethod: 'Cash' }); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                <span className="text-muted-foreground">{t('العميل', 'Client')}:</span> <span className="font-bold">{payDialog.clientName}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('المبلغ', 'Amount')} (EGP) *</label>
                <input type="number" className={inputCls} value={payForm.amount || ''} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" min={0} step={0.01} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('طريقة السداد', 'Payment Method')} *</label>
                <select className={inputCls} value={payForm.paymentMethod || 'Cash'} onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="Cash">{t('نقدي', 'Cash')}</option>
                  <option value="E-Payment">{t('دفع إلكتروني', 'E-Payment')}</option>
                  <option value="Cheque">{t('شيك', 'Cheque')}</option>
                  <option value="Bank Transfer">{t('تحويل بنكي', 'Bank Transfer')}</option>
                </select>
              </div>
              {payForm.paymentMethod !== 'Cash' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t('رقم المرجع', 'Reference Number')}</label>
                  <input type="text" className={inputCls} value={payForm.referenceNumber || ''} onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))} />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setPayDialog(null); setPayForm({ paymentMethod: 'Cash' }); }} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
                <button onClick={handlePay} disabled={recordPayment.isPending} className="px-6 py-2.5 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                  {recordPayment.isPending && <Loader2 size={14} className="animate-spin" />}
                  {t('تأكيد السداد', 'Confirm Payment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

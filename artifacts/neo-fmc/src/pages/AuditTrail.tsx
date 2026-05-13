import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Shield, Loader2, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

const actionColors: Record<string, string> = {
  CREATE: "bg-green-500/20 text-green-400 border-green-500/30",
  UPDATE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  RECORD_PAYMENT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  APPROVE: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  REJECT: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DAILY_CLOSE: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  ADD_MEMBER: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  PERIODIC_CLOSE: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  REOPEN_PERIODIC_CLOSING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  REOPEN_DAILY_CLOSING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const entityLabels: Record<string, { ar: string; en: string }> = {
  Payment: { ar: 'الدفعة', en: 'Payment' },
  Loan: { ar: 'القرض', en: 'Loan' },
  Client: { ar: 'العميل', en: 'Client' },
  LoanRequest: { ar: 'طلب القرض', en: 'Loan Request' },
  Approval: { ar: 'الموافقة', en: 'Approval' },
  ClientGroup: { ar: 'مجموعة العملاء', en: 'Client Group' },
  DailyClosing: { ar: 'الإقفال اليومي', en: 'Daily Closing' },
  PeriodicClosing: { ar: 'الإقفال الدوري', en: 'Periodic Closing' },
  Expense: { ar: 'المصروف', en: 'Expense' },
  Revenue: { ar: 'الإيراد', en: 'Revenue' },
  User: { ar: 'المستخدم', en: 'User' },
  Branch: { ar: 'الفرع', en: 'Branch' },
  JournalEntry: { ar: 'القيد المحاسبي', en: 'Journal Entry' },
  CreditLimit: { ar: 'حد الائتمان', en: 'Credit Limit' },
  Guarantee: { ar: 'الضمان', en: 'Guarantee' },
  Cheque: { ar: 'الشيك', en: 'Cheque' },
  WireTransfer: { ar: 'الحوالة البنكية', en: 'Wire Transfer' },
  CashSettlement: { ar: 'التسوية النقدية', en: 'Cash Settlement' },
};

const actionLabels: Record<string, { ar: string; en: string }> = {
  CREATE: { ar: 'إنشاء', en: 'CREATE' },
  UPDATE: { ar: 'تعديل', en: 'UPDATE' },
  DELETE: { ar: 'حذف', en: 'DELETE' },
  RECORD_PAYMENT: { ar: 'تسجيل دفعة', en: 'RECORD PAYMENT' },
  APPROVE: { ar: 'موافقة', en: 'APPROVE' },
  REJECT: { ar: 'رفض', en: 'REJECT' },
  DAILY_CLOSE: { ar: 'إقفال يومي', en: 'DAILY CLOSE' },
  ADD_MEMBER: { ar: 'إضافة عضو', en: 'ADD MEMBER' },
  REVERSE: { ar: 'عكس', en: 'REVERSE' },
  WITHDRAW: { ar: 'سحب', en: 'WITHDRAW' },
  ROLLBACK: { ar: 'تراجع', en: 'ROLLBACK' },
  REOPEN: { ar: 'إعادة فتح', en: 'REOPEN' },
  PERIODIC_CLOSE: { ar: 'إقفال دوري', en: 'PERIODIC CLOSE' },
  REOPEN_PERIODIC_CLOSING: { ar: 'إعادة فتح إقفال دوري', en: 'REOPEN PERIODIC CLOSING' },
  REOPEN_DAILY_CLOSING: { ar: 'إعادة فتح إقفال يومي', en: 'REOPEN DAILY CLOSING' },
};

export default function AuditTrail() {
  const { t, isRtl } = useLanguage();
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/audit-logs', page, entityFilter, actionFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (entityFilter) params.set('entity', entityFilter);
      if (actionFilter) params.set('action', actionFilter);
      return api.get<any>(`/audit-logs?${params}`);
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Shield size={24} className="text-primary" /> {t('سجل التدقيق', 'Audit Trail')}</h2>
          <p className="text-muted-foreground mt-1">{t('تتبع جميع العمليات والتغييرات في النظام', 'Track all system operations and changes')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={inputCls + " w-auto min-w-[150px]"} value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}>
          <option value="">{t('كل الكيانات', 'All Entities')}</option>
          {Object.entries(entityLabels).map(([key, label]) => (
            <option key={key} value={key}>{t(label.ar, label.en)}</option>
          ))}
        </select>
        <select className={inputCls + " w-auto min-w-[150px]"} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">{t('كل الإجراءات', 'All Actions')}</option>
          {Object.entries(actionLabels).map(([key, label]) => (
            <option key={key} value={key}>{t(label.ar, label.en)}</option>
          ))}
        </select>
      </div>

      <div className="premium-card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
        ) : data?.data?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Shield size={40} className="mx-auto mb-4 opacity-20" />
            {t('لا توجد سجلات', 'No audit records')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                  <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المستخدم', 'User')}</th>
                  <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الإجراء', 'Action')}</th>
                  <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الكيان', 'Entity')}</th>
                  <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التفاصيل', 'Details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}</td>
                    <td className="px-4 py-3 font-medium">{log.userName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", actionColors[log.action] || "bg-muted text-muted-foreground")}>
                        {actionLabels[log.action] ? t(actionLabels[log.action].ar, actionLabels[log.action].en) : log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entityLabels[log.entity] ? t(entityLabels[log.entity].ar, entityLabels[log.entity].en) : log.entity}
                      {log.entityId && <span className={cn("text-[10px] font-mono opacity-50", isRtl ? "mr-1" : "ml-1")}>({log.entityId.slice(0, 8)})</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-secondary text-sm disabled:opacity-30">{t('السابق', 'Prev')}</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-secondary text-sm disabled:opacity-30">{t('التالي', 'Next')}</button>
        </div>
      )}
    </div>
  );
}

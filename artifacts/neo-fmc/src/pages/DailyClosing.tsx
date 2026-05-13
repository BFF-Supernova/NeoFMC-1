import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Lock, Loader2, DollarSign, ArrowDown, ArrowUp, AlertTriangle, CheckCircle2,
  Building2, RotateCcw, X, Calendar, CalendarDays, CalendarRange, CalendarClock,
  TrendingUp, PieChart, FileText, BarChart3, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

type TabType = 'daily' | 'monthly' | 'quarterly' | 'annual';

export default function DailyClosing() {
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('daily');

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'daily', label: t('يومي', 'Daily'), icon: Calendar },
    { key: 'monthly', label: t('شهري', 'Monthly'), icon: CalendarDays },
    { key: 'quarterly', label: t('ربع سنوي', 'Quarterly'), icon: CalendarRange },
    { key: 'annual', label: t('سنوي', 'Annual'), icon: CalendarClock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lock size={24} className="text-primary" />
          {t('الإقفال المالي', 'Financial Closing')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('إدارة الإقفالات اليومية والشهرية والربع سنوية والسنوية', 'Manage daily, monthly, quarterly, and annual closings')}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto whitespace-nowrap bg-secondary/50 rounded-xl p-1 border border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'daily' && <DailyTab />}
      {activeTab === 'monthly' && <PeriodicTab periodType="Monthly" />}
      {activeTab === 'quarterly' && <PeriodicTab periodType="Quarterly" />}
      {activeTab === 'annual' && <PeriodicTab periodType="Annual" />}
    </div>
  );
}

function branchLabel(b: any, isRtl: boolean) {
  return isRtl ? (b.branchNameAr || b.branchNameEn) : (b.branchNameEn || b.branchNameAr);
}

function DailyTab() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [reopenDialog, setReopenDialog] = useState<{ id: string; date: string } | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const canReopen = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

  const { data: branches } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: () => api.get<any>('/branches'),
  });

  const { data: preparation, isLoading: prepLoading } = useQuery({
    queryKey: ['/api/daily-closing/prepare', selectedBranch],
    queryFn: () => api.post<any>('/daily-closing/prepare', { branchId: selectedBranch }),
    enabled: !!selectedBranch,
  });

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['/api/daily-closing', selectedBranch],
    queryFn: () => api.get<any>(`/daily-closing?branchId=${selectedBranch}&limit=10`),
    enabled: !!selectedBranch,
  });

  const closeDay = useMutation({
    mutationFn: (data: any) => api.post('/daily-closing/close', data),
    onSuccess: () => {
      toast({ title: t('تم إقفال اليوم', 'Day Closed'), description: t('تم إقفال اليوم بنجاح', 'Day closed successfully') });
      setActualCash(''); setNotes('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const reopenDay = useMutation({
    mutationFn: (data: { id: string; reason: string }) => api.post(`/daily-closing/${data.id}/reopen`, { reason: data.reason }),
    onSuccess: () => {
      toast({ title: t('تم إعادة فتح اليوم', 'Day Reopened') });
      setReopenDialog(null); setReopenReason('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const handleClose = () => {
    if (!selectedBranch || !actualCash || !preparation) return;
    closeDay.mutate({
      branchId: selectedBranch,
      actualCash: Number(actualCash),
      totalCollected: preparation.totalCollected,
      totalDisbursed: preparation.totalDisbursed,
      totalExpenses: preparation.totalExpenses,
      expectedCash: preparation.expectedCash,
      notes,
    });
  };

  return (
    <>
      <div className="flex gap-4 items-end">
        <div className="space-y-1.5 w-64">
          <label className="text-sm font-medium text-muted-foreground">{t('الفرع', 'Branch')} *</label>
          <select className={inputCls} value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
            <option value="">{t('اختر الفرع', 'Select Branch')}</option>
            {(Array.isArray(branches) ? branches : []).map((b: any) => (
              <option key={b.id} value={b.id}>{branchLabel(b, isRtl)}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedBranch && (
        <>
          {prepLoading ? (
            <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
          ) : preparation ? (
            <>
              {preparation.status === 'Closed' ? (
                <div className="premium-card p-6 border-green-500/20 bg-green-500/5 text-center">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
                  <h3 className="text-lg font-bold text-green-400">{t('تم إقفال اليوم بالفعل', 'Day Already Closed')}</h3>
                </div>
              ) : (
                <div className="space-y-6">
                  <CashSummaryCards
                    totalCollected={preparation.totalCollected}
                    totalDisbursed={preparation.totalDisbursed}
                    totalExpenses={preparation.totalExpenses}
                    expectedCash={preparation.expectedCash}
                  />
                  <DenominationSheet onTotalChange={(total) => setActualCash(String(total))} />

                  <div className="premium-card p-6 max-w-lg space-y-4">
                    <h3 className="text-lg font-bold">{t('إقفال اليوم', 'Close Day')}</h3>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t('النقدي الفعلي في الصندوق', 'Actual Cash in Box')} (EGP) *</label>
                      <input type="number" className={inputCls} value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="0.00" min={0} step={0.01} />
                    </div>
                    {actualCash && (
                      <DiscrepancyBadge actual={Number(actualCash)} expected={preparation.expectedCash} />
                    )}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
                      <textarea className={inputCls + " h-16 resize-none"} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <button onClick={handleClose} disabled={!actualCash || closeDay.isPending} className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90">
                      {closeDay.isPending && <Loader2 size={14} className="animate-spin" />}
                      <Lock size={16} /> {t('تأكيد الإقفال', 'Confirm Close')}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}

          <ClosingHistory
            data={history?.data}
            isLoading={histLoading}
            canReopen={canReopen}
            onReopen={(id, date) => setReopenDialog({ id, date })}
            type="daily"
          />
        </>
      )}

      {reopenDialog && (
        <ReopenDialog
          title={t('إعادة فتح يوم الإقفال', 'Reopen Daily Closing')}
          date={reopenDialog.date}
          reason={reopenReason}
          setReason={setReopenReason}
          isPending={reopenDay.isPending}
          onConfirm={() => { if (reopenReason.trim()) reopenDay.mutate({ id: reopenDialog.id, reason: reopenReason }); }}
          onClose={() => { setReopenDialog(null); setReopenReason(''); }}
        />
      )}
    </>
  );
}

function PeriodicTab({ periodType }: { periodType: 'Monthly' | 'Quarterly' | 'Annual' }) {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [notes, setNotes] = useState('');
  const [showPrep, setShowPrep] = useState(false);
  const [reopenDialog, setReopenDialog] = useState<{ id: string; label: string } | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const canReopen = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';
  const canClose = user?.role === 'TenantAdmin' || user?.role === 'FinancialController' || user?.role === 'CFO' || user?.role === 'SuperAdmin';

  const prepBody = periodType === 'Monthly'
    ? { periodType, year: selectedYear, month: selectedMonth }
    : periodType === 'Quarterly'
    ? { periodType, year: selectedYear, quarter: selectedQuarter }
    : { periodType, year: selectedYear };

  const { data: preparation, isLoading: prepLoading, refetch: doPrepare } = useQuery({
    queryKey: ['/api/periodic-closing/prepare', periodType, selectedYear, selectedMonth, selectedQuarter],
    queryFn: () => api.post<any>('/periodic-closing/prepare', prepBody),
    enabled: showPrep,
  });

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['/api/periodic-closing', periodType],
    queryFn: () => api.get<any>(`/periodic-closing?type=${periodType}&limit=20`),
  });

  const closePeriod = useMutation({
    mutationFn: (data: any) => api.post('/periodic-closing/close', data),
    onSuccess: () => {
      toast({ title: t('تم الإقفال', 'Period Closed'), description: t('تم إقفال الفترة بنجاح', 'Period closed successfully') });
      setNotes(''); setShowPrep(false);
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const reopenPeriod = useMutation({
    mutationFn: (data: { id: string; reason: string }) => api.post(`/periodic-closing/${data.id}/reopen`, { reason: data.reason }),
    onSuccess: () => {
      toast({ title: t('تم إعادة الفتح', 'Period Reopened') });
      setReopenDialog(null); setReopenReason('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const handleClose = () => {
    if (!preparation) return;
    closePeriod.mutate({ periodType, year: selectedYear, month: selectedMonth, quarter: selectedQuarter, notes });
  };

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const months = [
    { v: 1, ar: 'يناير', en: 'January' }, { v: 2, ar: 'فبراير', en: 'February' },
    { v: 3, ar: 'مارس', en: 'March' }, { v: 4, ar: 'أبريل', en: 'April' },
    { v: 5, ar: 'مايو', en: 'May' }, { v: 6, ar: 'يونيو', en: 'June' },
    { v: 7, ar: 'يوليو', en: 'July' }, { v: 8, ar: 'أغسطس', en: 'August' },
    { v: 9, ar: 'سبتمبر', en: 'September' }, { v: 10, ar: 'أكتوبر', en: 'October' },
    { v: 11, ar: 'نوفمبر', en: 'November' }, { v: 12, ar: 'ديسمبر', en: 'December' },
  ];
  const quarters = [
    { v: 1, ar: 'الربع الأول', en: 'Q1 (Jan-Mar)' },
    { v: 2, ar: 'الربع الثاني', en: 'Q2 (Apr-Jun)' },
    { v: 3, ar: 'الربع الثالث', en: 'Q3 (Jul-Sep)' },
    { v: 4, ar: 'الربع الرابع', en: 'Q4 (Oct-Dec)' },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{t('السنة', 'Year')}</label>
          <select className={inputCls + " w-32"} value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setShowPrep(false); }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {periodType === 'Monthly' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t('الشهر', 'Month')}</label>
            <select className={inputCls + " w-48"} value={selectedMonth} onChange={e => { setSelectedMonth(Number(e.target.value)); setShowPrep(false); }}>
              {months.map(m => <option key={m.v} value={m.v}>{t(m.ar, m.en)}</option>)}
            </select>
          </div>
        )}
        {periodType === 'Quarterly' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t('الربع', 'Quarter')}</label>
            <select className={inputCls + " w-48"} value={selectedQuarter} onChange={e => { setSelectedQuarter(Number(e.target.value)); setShowPrep(false); }}>
              {quarters.map(q => <option key={q.v} value={q.v}>{t(q.ar, q.en)}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={() => { setShowPrep(true); doPrepare(); }}
          className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90"
        >
          <FileText size={16} />
          {t('تحضير الإقفال', 'Prepare Closing')}
        </button>
      </div>

      {showPrep && (
        <>
          {prepLoading ? (
            <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
          ) : preparation ? (
            preparation.alreadyClosed ? (
              <div className="premium-card p-6 border-green-500/20 bg-green-500/5 text-center">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
                <h3 className="text-lg font-bold text-green-400">
                  {t('تم إقفال هذه الفترة بالفعل', 'This Period is Already Closed')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{preparation.periodLabel}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="premium-card p-4 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={20} className="text-primary" />
                    <div>
                      <p className="font-bold">{preparation.periodLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {preparation.periodStart} → {preparation.periodEnd}
                        {preparation.dailyClosingsCount > 0 && (
                          <span className="mx-2">|</span>
                        )}
                        {preparation.dailyClosingsCount > 0 && t(
                          `${preparation.dailyClosingsCount} إقفال يومي`,
                          `${preparation.dailyClosingsCount} daily closings`
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <CashSummaryCards
                  totalCollected={preparation.totalCollected}
                  totalDisbursed={preparation.totalDisbursed}
                  totalExpenses={preparation.totalExpenses}
                  expectedCash={preparation.expectedCash}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="premium-card p-5 border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={18} className="text-blue-400" />
                      <span className="text-sm text-muted-foreground">{t('الفوائد المستحقة', 'Accrued Interest')}</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-blue-400">{formatCurrency(preparation.accruedInterest)}</p>
                  </div>
                  <div className="premium-card p-5 border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={18} className="text-amber-400" />
                      <span className="text-sm text-muted-foreground">{t('الغرامات المستحقة', 'Accrued Penalties')}</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-amber-400">{formatCurrency(preparation.accruedPenalties)}</p>
                  </div>
                  {(periodType === 'Quarterly' || periodType === 'Annual') && (
                    <div className="premium-card p-5 border-red-500/20 bg-red-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={18} className="text-red-400" />
                        <span className="text-sm text-muted-foreground">{t('مخصص خسائر القروض', 'Provision for Losses')}</span>
                      </div>
                      <p className="text-2xl font-bold font-mono text-red-400">{formatCurrency(preparation.provisionForLosses)}</p>
                    </div>
                  )}
                </div>

                {preparation.trialBalance?.length > 0 && (
                  <TrialBalanceSection trialBalance={preparation.trialBalance} />
                )}

                {preparation.parBreakdown && (periodType === 'Quarterly' || periodType === 'Annual') && (
                  <PARBreakdownSection parBreakdown={preparation.parBreakdown} />
                )}

                {preparation.incomeStatement && periodType === 'Annual' && (
                  <IncomeStatementSection incomeStatement={preparation.incomeStatement} retainedEarnings={preparation.retainedEarningsTransfer} />
                )}

                {canClose && (
                  <div className="premium-card p-6 max-w-lg space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Lock size={18} />
                      {t('تأكيد إقفال الفترة', 'Confirm Period Closing')}
                    </h3>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
                      <textarea className={inputCls + " h-20 resize-none"} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <button onClick={handleClose} disabled={closePeriod.isPending} className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90">
                      {closePeriod.isPending && <Loader2 size={14} className="animate-spin" />}
                      <Lock size={16} /> {t('تأكيد الإقفال', 'Confirm Close')}
                    </button>
                  </div>
                )}
              </div>
            )
          ) : null}
        </>
      )}

      <PeriodicHistory
        data={history?.data}
        isLoading={histLoading}
        canReopen={canReopen}
        periodType={periodType}
        onReopen={(id, label) => setReopenDialog({ id, label })}
      />

      {reopenDialog && (
        <ReopenDialog
          title={t('إعادة فتح فترة الإقفال', 'Reopen Closing Period')}
          date={reopenDialog.label}
          reason={reopenReason}
          setReason={setReopenReason}
          isPending={reopenPeriod.isPending}
          onConfirm={() => { if (reopenReason.trim()) reopenPeriod.mutate({ id: reopenDialog.id, reason: reopenReason }); }}
          onClose={() => { setReopenDialog(null); setReopenReason(''); }}
        />
      )}
    </>
  );
}

function CashSummaryCards({ totalCollected, totalDisbursed, totalExpenses, expectedCash }: {
  totalCollected: number; totalDisbursed: number; totalExpenses: number; expectedCash: number;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="premium-card p-5 border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-2 mb-2"><ArrowDown size={18} className="text-green-400" /><span className="text-sm text-muted-foreground">{t('إجمالي التحصيل', 'Total Collected')}</span></div>
        <p className="text-xl font-bold font-mono text-green-400">{formatCurrency(totalCollected)}</p>
      </div>
      <div className="premium-card p-5 border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-2 mb-2"><ArrowUp size={18} className="text-red-400" /><span className="text-sm text-muted-foreground">{t('إجمالي المنصرف', 'Total Disbursed')}</span></div>
        <p className="text-xl font-bold font-mono text-red-400">{formatCurrency(totalDisbursed)}</p>
      </div>
      <div className="premium-card p-5 border-orange-500/20 bg-orange-500/5">
        <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className="text-orange-400" /><span className="text-sm text-muted-foreground">{t('المصروفات', 'Expenses')}</span></div>
        <p className="text-xl font-bold font-mono text-orange-400">{formatCurrency(totalExpenses)}</p>
      </div>
      <div className="premium-card p-5 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className="text-primary" /><span className="text-sm text-muted-foreground">{t('النقدي المتوقع', 'Expected Cash')}</span></div>
        <p className="text-xl font-bold font-mono text-primary">{formatCurrency(expectedCash)}</p>
      </div>
    </div>
  );
}

function DiscrepancyBadge({ actual, expected }: { actual: number; expected: number }) {
  const { t } = useLanguage();
  const diff = actual - expected;
  const match = diff === 0;
  return (
    <div className={cn("p-3 rounded-lg text-sm flex items-center gap-2",
      match ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
    )}>
      {match ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {t('الفرق', 'Discrepancy')}: <span className="font-bold font-mono">{formatCurrency(diff)}</span>
    </div>
  );
}

function TrialBalanceSection({ trialBalance }: { trialBalance: any[] }) {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="premium-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="font-bold">{t('ميزان المراجعة', 'Trial Balance')}</h3>
        </div>
        <button
          onClick={() => setLocation('/financial-statements')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {t('عرض القوائم المالية', 'View Financial Statements')} <ExternalLink size={12} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
            <tr>
              <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('كود الحساب', 'Code')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('اسم الحساب', 'Account')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('مدين', 'Debit')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('دائن', 'Credit')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('الرصيد', 'Balance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trialBalance.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-muted/30 cursor-pointer group"
                onClick={() => setLocation(`/finance?account=${encodeURIComponent(row.accountCode)}`)}
                title={t('انقر لعرض حركات الحساب', 'Click to view account transactions')}
              >
                <td className="px-4 py-2.5 font-mono text-xs group-hover:text-primary transition-colors">{row.accountCode}</td>
                <td className="px-4 py-2.5 group-hover:text-primary transition-colors">{isRtl ? (row.accountNameAr || row.accountName) : row.accountName}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.accountType}</td>
                <td className={cn("px-4 py-2.5 font-mono", isRtl ? "text-left" : "text-right")}>{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                <td className={cn("px-4 py-2.5 font-mono", isRtl ? "text-left" : "text-right")}>{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                <td className={cn("px-4 py-2.5 font-mono font-bold", isRtl ? "text-left" : "text-right", row.balance > 0 ? "text-green-400" : row.balance < 0 ? "text-red-400" : "")}>
                  {formatCurrency(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-secondary/20">
            <tr className="font-bold">
              <td colSpan={3} className="px-4 py-3">{t('الإجمالي', 'Total')}</td>
              <td className={cn("px-4 py-3 font-mono", isRtl ? "text-left" : "text-right")}>{formatCurrency(totalDebit)}</td>
              <td className={cn("px-4 py-3 font-mono", isRtl ? "text-left" : "text-right")}>{formatCurrency(totalCredit)}</td>
              <td className={cn("px-4 py-3 font-mono", isRtl ? "text-left" : "text-right", totalDebit === totalCredit ? "text-green-400" : "text-red-400")}>
                {formatCurrency(totalDebit - totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function PARBreakdownSection({ parBreakdown }: { parBreakdown: Record<string, any> }) {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const bucketLabels: Record<string, { ar: string; en: string }> = {
    CURRENT: { ar: 'سارية', en: 'Current' },
    PAR1_30: { ar: '1-30 يوم', en: '1-30 Days' },
    PAR31_60: { ar: '31-60 يوم', en: '31-60 Days' },
    PAR61_90: { ar: '61-90 يوم', en: '61-90 Days' },
    PAR91_180: { ar: '91-180 يوم', en: '91-180 Days' },
    PAR180_PLUS: { ar: '+180 يوم', en: '180+ Days' },
  };

  const bucketOrder = ['CURRENT', 'PAR1_30', 'PAR31_60', 'PAR61_90', 'PAR91_180', 'PAR180_PLUS'];
  const totalProvision = bucketOrder.reduce((s, k) => s + (parBreakdown[k]?.provision || 0), 0);

  return (
    <div className="premium-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart size={18} className="text-primary" />
          <h3 className="font-bold">{t('تحليل المحفظة المعرضة للمخاطر (PAR)', 'Portfolio at Risk (PAR) Analysis')}</h3>
        </div>
        <button
          onClick={() => setLocation('/loan-aging')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {t('عرض تقادم القروض', 'View Loan Aging')} <ExternalLink size={12} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
            <tr>
              <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('الفئة', 'Bucket')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('الرصيد القائم', 'Outstanding')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('العدد', 'Count')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('نسبة المخصص', 'Rate')}</th>
              <th className={cn("px-4 py-3", isRtl ? "text-left" : "text-right")}>{t('المخصص', 'Provision')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bucketOrder.map(key => {
              const data = parBreakdown[key];
              if (!data) return null;
              const label = bucketLabels[key];
              return (
                <tr
                  key={key}
                  className="hover:bg-muted/30 cursor-pointer group"
                  onClick={() => setLocation(`/loan-aging?bucket=${key}`)}
                  title={t('انقر لعرض القروض في هذه الفئة', 'Click to view loans in this bucket')}
                >
                  <td className="px-4 py-2.5 font-medium group-hover:text-primary transition-colors">{t(label.ar, label.en)}</td>
                  <td className={cn("px-4 py-2.5 font-mono", isRtl ? "text-left" : "text-right")}>{formatCurrency(data.outstanding)}</td>
                  <td className={cn("px-4 py-2.5 font-mono", isRtl ? "text-left" : "text-right")}>{data.count}</td>
                  <td className={cn("px-4 py-2.5 font-mono", isRtl ? "text-left" : "text-right")}>{(data.rate * 100).toFixed(0)}%</td>
                  <td className={cn("px-4 py-2.5 font-mono text-red-400", isRtl ? "text-left" : "text-right")}>{formatCurrency(data.provision)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-border bg-secondary/20">
            <tr className="font-bold">
              <td colSpan={4} className="px-4 py-3">{t('إجمالي المخصص', 'Total Provision')}</td>
              <td className={cn("px-4 py-3 font-mono text-red-400", isRtl ? "text-left" : "text-right")}>{formatCurrency(totalProvision)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function IncomeStatementSection({ incomeStatement, retainedEarnings }: { incomeStatement: any; retainedEarnings: number }) {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  return (
    <div className="premium-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <h3 className="font-bold">{t('قائمة الدخل', 'Income Statement')}</h3>
        </div>
        <button
          onClick={() => setLocation('/financial-statements')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {t('عرض التقرير الكامل', 'View Full Report')} <ExternalLink size={12} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 cursor-pointer hover:bg-green-500/10 transition-colors group"
            onClick={() => setLocation('/finance?type=Income')}
            title={t('انقر لعرض حسابات الإيرادات', 'Click to view income accounts')}
          >
            <p className="text-sm text-muted-foreground mb-1 group-hover:text-green-400 transition-colors">{t('إجمالي الإيرادات', 'Total Income')}</p>
            <p className="text-2xl font-bold font-mono text-green-400">{formatCurrency(incomeStatement.totalIncome)}</p>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><ExternalLink size={10} /> {t('عرض التفاصيل', 'View details')}</p>
          </div>
          <div
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 cursor-pointer hover:bg-red-500/10 transition-colors group"
            onClick={() => setLocation('/finance?type=Expense')}
            title={t('انقر لعرض حسابات المصروفات', 'Click to view expense accounts')}
          >
            <p className="text-sm text-muted-foreground mb-1 group-hover:text-red-400 transition-colors">{t('إجمالي المصروفات', 'Total Expenses')}</p>
            <p className="text-2xl font-bold font-mono text-red-400">{formatCurrency(incomeStatement.totalExpenses)}</p>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><ExternalLink size={10} /> {t('عرض التفاصيل', 'View details')}</p>
          </div>
        </div>
        <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{t('صافي الدخل', 'Net Income')}</span>
            <span className={cn("font-bold font-mono text-lg", incomeStatement.netIncome >= 0 ? "text-green-400" : "text-red-400")}>
              {formatCurrency(incomeStatement.netIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{t('مخصص خسائر القروض', 'Provision for Losses')}</span>
            <span className="font-mono text-red-400">- {formatCurrency(incomeStatement.provisionForLosses)}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-bold">{t('صافي الدخل بعد المخصصات', 'Net Income After Provisions')}</span>
            <span className={cn("font-bold font-mono text-lg", incomeStatement.netIncomeAfterProvision >= 0 ? "text-green-400" : "text-red-400")}>
              {formatCurrency(incomeStatement.netIncomeAfterProvision)}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <span className="font-bold">{t('التحويل للأرباح المحتجزة', 'Retained Earnings Transfer')}</span>
            </div>
            <span className={cn("font-bold font-mono text-xl", retainedEarnings >= 0 ? "text-primary" : "text-red-400")}>
              {formatCurrency(retainedEarnings)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosingHistory({ data, isLoading, canReopen, onReopen, type }: {
  data: any[]; isLoading: boolean; canReopen: boolean; onReopen: (id: string, date: string) => void; type: string;
}) {
  const { t, isRtl } = useLanguage();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-muted-foreground">{t('سجل الإقفالات', 'Closing History')}</h3>
      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">{t('لا يوجد سجل إقفالات سابقة', 'No previous closings')}</p>
      ) : (
        <div className="premium-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('التحصيل', 'Collected')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('المتوقع', 'Expected')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('الفعلي', 'Actual')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('الفرق', 'Discrepancy')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('بواسطة', 'By')}</th>
                {canReopen && <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono">{c.closingDate}</td>
                  <td className="px-4 py-3 font-mono text-green-400">{formatCurrency(c.totalCollected)}</td>
                  <td className="px-4 py-3 font-mono">{formatCurrency(c.expectedCash)}</td>
                  <td className="px-4 py-3 font-mono">{formatCurrency(c.actualCash)}</td>
                  <td className="px-4 py-3 font-mono">
                    <span className={c.discrepancy === 0 ? "text-green-400" : "text-red-400"}>{formatCurrency(c.discrepancy)}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.closedByName}</td>
                  {canReopen && (
                    <td className="px-4 py-3">
                      {c.status !== 'Reopened' && (
                        <button onClick={() => onReopen(c.id, c.closingDate)}
                          className="text-xs font-medium px-3 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors flex items-center gap-1">
                          <RotateCcw size={12} /> {t('إعادة فتح', 'Reopen')}
                        </button>
                      )}
                      {c.status === 'Reopened' && (
                        <span className="text-xs text-orange-400">{t('تم إعادة الفتح', 'Reopened')}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PeriodicHistory({ data, isLoading, canReopen, periodType, onReopen }: {
  data: any[]; isLoading: boolean; canReopen: boolean; periodType: string; onReopen: (id: string, label: string) => void;
}) {
  const { t, isRtl } = useLanguage();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-muted-foreground">{t('سجل الإقفالات', 'Closing History')}</h3>
      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">{t('لا يوجد سجل إقفالات سابقة', 'No previous closings')}</p>
      ) : (
        <div className="premium-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('الفترة', 'Period')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('التحصيل', 'Collected')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('المصروفات', 'Expenses')}</th>
                {(periodType === 'Quarterly' || periodType === 'Annual') && (
                  <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('المخصص', 'Provision')}</th>
                )}
                {periodType === 'Annual' && (
                  <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('صافي الدخل', 'Net Income')}</th>
                )}
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('بواسطة', 'By')}</th>
                {canReopen && <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-bold">{c.periodLabel}</td>
                  <td className="px-4 py-3 font-mono text-green-400">{formatCurrency(c.totalCollected)}</td>
                  <td className="px-4 py-3 font-mono text-orange-400">{formatCurrency(c.totalExpenses)}</td>
                  {(periodType === 'Quarterly' || periodType === 'Annual') && (
                    <td className="px-4 py-3 font-mono text-red-400">{formatCurrency(c.provisionForLosses)}</td>
                  )}
                  {periodType === 'Annual' && (
                    <td className="px-4 py-3 font-mono">
                      <span className={c.incomeStatement?.netIncome >= 0 ? "text-green-400" : "text-red-400"}>
                        {formatCurrency(c.incomeStatement?.netIncome || 0)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase",
                      c.status === 'Closed' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      c.status === 'Reopened' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {c.status === 'Closed' ? t('مقفل', 'Closed') : c.status === 'Reopened' ? t('مفتوح', 'Reopened') : c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.closedByName || '-'}</td>
                  {canReopen && (
                    <td className="px-4 py-3">
                      {c.status === 'Closed' && (
                        <button onClick={() => onReopen(c.id, c.periodLabel)}
                          className="text-xs font-medium px-3 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors flex items-center gap-1">
                          <RotateCcw size={12} /> {t('إعادة فتح', 'Reopen')}
                        </button>
                      )}
                      {c.status === 'Reopened' && (
                        <span className="text-xs text-orange-400">{t('تم إعادة الفتح', 'Reopened')}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const EGP_DENOMINATIONS = [
  { value: 200, labelAr: '200 جنيه', labelEn: '200 EGP' },
  { value: 100, labelAr: '100 جنيه', labelEn: '100 EGP' },
  { value: 50, labelAr: '50 جنيه', labelEn: '50 EGP' },
  { value: 20, labelAr: '20 جنيه', labelEn: '20 EGP' },
  { value: 10, labelAr: '10 جنيه', labelEn: '10 EGP' },
  { value: 5, labelAr: '5 جنيه', labelEn: '5 EGP' },
  { value: 1, labelAr: '1 جنيه', labelEn: '1 EGP' },
  { value: 0.5, labelAr: '50 قرش', labelEn: '0.50 EGP' },
  { value: 0.25, labelAr: '25 قرش', labelEn: '0.25 EGP' },
];

function DenominationSheet({ onTotalChange }: { onTotalChange: (total: number) => void }) {
  const { t } = useLanguage();
  const [counts, setCounts] = useState<Record<number, number>>({});

  const updateCount = (denomination: number, count: number) => {
    const newCounts = { ...counts, [denomination]: Math.max(0, count) };
    setCounts(newCounts);
    const total = EGP_DENOMINATIONS.reduce((sum, d) => sum + (newCounts[d.value] || 0) * d.value, 0);
    onTotalChange(Math.round(total * 100) / 100);
  };

  const total = EGP_DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);

  return (
    <div className="premium-card p-6 space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <DollarSign size={18} className="text-primary" />
        {t('كشف فئات العملة', 'Cash Denomination Sheet')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EGP_DENOMINATIONS.map(d => (
          <div key={d.value} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="w-20 text-sm font-bold text-primary">{t(d.labelAr, d.labelEn)}</div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">x</span>
              <input
                type="number"
                min={0}
                className="w-20 h-8 px-2 rounded bg-background border border-border text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={counts[d.value] || ''}
                onChange={e => updateCount(d.value, parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <span className="text-xs text-muted-foreground">=</span>
            <span className="font-mono text-sm font-bold flex-1 text-end">{formatCurrency((counts[d.value] || 0) * d.value)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
        <span className="font-bold text-lg">{t('الإجمالي', 'Total')}</span>
        <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(Math.round(total * 100) / 100)}</span>
      </div>
    </div>
  );
}

function ReopenDialog({ title, date, reason, setReason, isPending, onConfirm, onClose }: {
  title: string; date: string; reason: string; setReason: (r: string) => void;
  isPending: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <RotateCcw size={18} className="text-orange-400" /> {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            {t('سيتم إعادة فتح فترة الإقفال. هذا الإجراء يتم تسجيله في سجل المراجعة.', 'This will reopen the closing period. This action is logged in the audit trail.')}
          </div>
          <div className="p-3 rounded-lg bg-secondary text-sm">
            <span className="text-muted-foreground">{t('الفترة:', 'Period:')}</span> <span className="font-bold font-mono">{date}</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t('سبب إعادة الفتح', 'Reason for Reopening')} *</label>
            <textarea
              className={inputCls + " h-24 resize-none"}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('اكتب سبب إعادة الفتح...', 'Enter reason for reopening...')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors">
              {t('إلغاء', 'Cancel')}
            </button>
            <button onClick={onConfirm} disabled={isPending || !reason.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {t('تأكيد إعادة الفتح', 'Confirm Reopen')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

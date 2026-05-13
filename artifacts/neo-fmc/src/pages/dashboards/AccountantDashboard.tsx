import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, StatusPill } from './shared';
import {
  BookOpen, FileText, Receipt, Clock, CheckCircle, AlertTriangle,
  ChevronRight, Calculator, DollarSign,
} from 'lucide-react';

export default function AccountantDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });

  if (isLoading) return <LoadingDash />;
  const d = roleDash || {};

  const lastClosingStatus = d.lastClosingStatus ?? 'None';
  const closingStatusColor = lastClosingStatus === 'Closed' ? 'text-emerald-400' : lastClosingStatus === 'In Progress' ? 'text-yellow-400' : 'text-muted-foreground';

  const kpis = [
    { title: t('قيود غير مرحّلة', 'Unposted Journals'), value: d.unpostedJournals ?? 0, icon: BookOpen, color: d.unpostedJournals > 0 ? 'text-orange-400' : 'text-muted-foreground', bg: d.unpostedJournals > 0 ? 'bg-orange-500/10' : 'bg-secondary', link: '/finance' },
    { title: t('قيود هذا الشهر', 'Journals This Month'), value: d.journalsThisMonth ?? 0, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/finance' },
    { title: t('مصروفات هذا الشهر', 'Expenses This Month'), value: formatCurrency(d.expensesThisMonth), icon: Receipt, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/expenses' },
    { title: t('مصروفات معلقة', 'Pending Expenses'), value: d.pendingExpenses ?? 0, icon: Clock, color: d.pendingExpenses > 0 ? 'text-orange-400' : 'text-muted-foreground', bg: d.pendingExpenses > 0 ? 'bg-orange-500/10' : 'bg-secondary', link: '/expenses' },
  ];

  const recentJournals: any[] = d.recentJournals || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator size={22} className="text-primary" />
          {t('لوحة المحاسب', 'Accountant Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('ملخص القيود المحاسبية والمصروفات والإقفال الشهري', 'Journal entries, expenses and monthly closing summary')}</p>
      </div>

      {(d.unpostedJournals ?? 0) > 0 && (
        <div onClick={() => setLocation('/finance')} className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 cursor-pointer hover:bg-orange-500/15 transition-colors">
          <AlertTriangle size={20} className="text-orange-400 shrink-0" />
          <p className="text-sm font-medium text-orange-300">
            {t(`${d.unpostedJournals} قيد غير مرحّل بانتظار المراجعة`, `${d.unpostedJournals} unposted journal entries awaiting review`)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2">
          <SectionHeader title={t('آخر القيود المحاسبية', 'Recent Journal Entries')} linkLabel={t('فتح الأستاذ العام', 'Open GL')} onLink={() => setLocation('/finance')} icon={BookOpen} />
          {recentJournals.length === 0
            ? <EmptyState icon={BookOpen} label={t('لا توجد قيود محاسبية', 'No journal entries found')} />
            : (
              <div className="space-y-3">
                {recentJournals.map((j: any, i: number) => (
                  <div key={i} onClick={() => setLocation('/finance')} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-colors cursor-pointer group">
                    <div>
                      <p className="font-semibold text-sm">{j.description || j.referenceNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{j.referenceNumber} · {new Date(j.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-sm">{formatCurrency(j.totalDebit ?? j.amount)}</span>
                      <StatusPill status={j.status} />
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardShell>

        <CardShell>
          <SectionHeader title={t('الإقفال الشهري', 'Monthly Closing')} icon={CheckCircle} />
          <div className="space-y-4">
            <div onClick={() => setLocation('/daily-closing')} className={cn('p-4 rounded-xl border cursor-pointer transition-all hover:opacity-80', lastClosingStatus === 'Closed' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20')}>
              <p className="text-xs text-muted-foreground mb-1">{t('آخر إقفال', 'Last Closing')}</p>
              <p className={cn('text-lg font-bold', closingStatusColor)}>{lastClosingStatus}</p>
              {d.lastClosingDate && <p className="text-xs text-muted-foreground mt-1">{new Date(d.lastClosingDate).toLocaleDateString()}</p>}
            </div>
            <div className="space-y-2">
              {[
                { label: t('القيود المحاسبية', 'Journal Entries'), link: '/finance' },
                { label: t('المصروفات', 'Expenses'), link: '/expenses' },
                { label: t('التسوية البنكية', 'Bank Reconciliation'), link: '/bank-reconciliation' },
                { label: t('القوائم المالية', 'Financial Statements'), link: '/financial-statements' },
              ].map((item, i) => (
                <button key={i} onClick={() => setLocation(item.link)} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground group">
                  <DollarSign size={14} className="text-primary shrink-0" />
                  {item.label}
                  <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </CardShell>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState } from './shared';
import {
  AlertTriangle, Wallet, Clock, TrendingUp, Target, Activity,
  PhoneCall, CheckCircle,
} from 'lucide-react';

export default function CollectionOfficerDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });

  if (isLoading) return <LoadingDash />;
  const d = roleDash || {};

  const kpis = [
    { title: t('أقساط متأخرة', 'Overdue Installments'), value: d.myOverdueCount ?? 0, icon: AlertTriangle, color: (d.myOverdueCount ?? 0) > 0 ? 'text-red-400' : 'text-muted-foreground', bg: (d.myOverdueCount ?? 0) > 0 ? 'bg-red-500/10' : 'bg-secondary', link: '/loan-aging' },
    { title: t('مبلغ المتأخرات', 'Overdue Amount'), value: formatCurrency(d.myOverdueAmount), icon: Wallet, color: (d.myOverdueAmount ?? 0) > 0 ? 'text-red-400' : 'text-muted-foreground', bg: (d.myOverdueAmount ?? 0) > 0 ? 'bg-red-500/10' : 'bg-secondary', link: '/loan-aging' },
    { title: t('مستحقة هذا الأسبوع', 'Due This Week'), value: d.myUpcomingCount ?? 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', link: '/collection' },
    { title: t('تحصيلي هذا الشهر', 'My Collections This Month'), value: formatCurrency(d.myCollectedMonth), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/collection' },
    { title: t('مدفوعات اليوم', 'Payments Today'), value: d.myPaymentsToday ?? 0, icon: CheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/10', link: '/collection' },
  ];

  const overdueCount = d.myOverdueCount ?? 0;
  const upcomingCount = d.myUpcomingCount ?? 0;
  const collectedMonth = d.myCollectedMonth ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PhoneCall size={22} className="text-primary" />
          {t('لوحة موظف التحصيل', 'Collection Officer Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('متابعة مهام التحصيل اليومية والمتأخرات', 'Track your daily collection tasks and overdue accounts')}</p>
      </div>

      {overdueCount > 0 && (
        <div onClick={() => setLocation('/loan-aging')} className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/15 transition-colors">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <p className="text-sm font-medium text-red-300">
            {t(`${overdueCount} قسط متأخر بقيمة ${formatCurrency(d.myOverdueAmount)}`, `${overdueCount} overdue installments totaling ${formatCurrency(d.myOverdueAmount)}`)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell>
          <SectionHeader title={t('أدائي هذا الشهر', 'My Monthly Performance')} icon={Target} />
          <div className="space-y-5 pt-1">
            <ProgressStat
              label={t('تحصيلي هذا الشهر', 'Collected This Month')}
              value={formatCurrency(collectedMonth)}
              sub={t(`${d.myPaymentsToday ?? 0} معاملات اليوم`, `${d.myPaymentsToday ?? 0} transactions today`)}
              color="text-emerald-400"
              onClick={() => setLocation('/collection')}
            />
            <ProgressStat
              label={t('إجمالي المتأخرات', 'Total Overdue Amount')}
              value={formatCurrency(d.myOverdueAmount)}
              sub={t(`${overdueCount} قسط متأخر`, `${overdueCount} overdue installments`)}
              color="text-red-400"
              onClick={() => setLocation('/loan-aging')}
            />
            <ProgressStat
              label={t('مستحقة هذا الأسبوع', 'Due This Week')}
              value={`${upcomingCount}`}
              sub={t('أقساط مستحقة', 'upcoming installments')}
              color="text-yellow-400"
              onClick={() => setLocation('/collection')}
            />
          </div>
        </CardShell>

        <CardShell>
          <SectionHeader title={t('روابط سريعة', 'Quick Actions')} />
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: t('سجل دفعة', 'Record Payment'), icon: CheckCircle, link: '/collection' },
              { label: t('المتأخرات', 'Overdue Loans'), icon: AlertTriangle, link: '/loan-aging' },
              { label: t('أنشطة التحصيل', 'Collection Activities'), icon: Activity, link: '/collection-activities' },
              { label: t('طلبات الفرع', 'Branch Requests'), icon: Clock, link: '/loan-requests' },
            ].map((action, i) => (
              <button key={i} onClick={() => setLocation(action.link)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/70 transition-all cursor-pointer group">
                <action.icon size={22} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

function ProgressStat({ label, value, sub, color, onClick }: { label: string; value: string; sub: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('p-4 rounded-xl bg-secondary/30 border border-border/50 transition-all', onClick && 'cursor-pointer hover:border-primary/30 hover:bg-secondary/50')}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-display font-bold', color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

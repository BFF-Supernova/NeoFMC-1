import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, StatusPill } from './shared';
import {
  Users, Wallet, Briefcase, Clock, TrendingUp, Target,
  FileText, ChevronRight, UserCheck,
} from 'lucide-react';

export default function LoanOfficerDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });

  if (isLoading) return <LoadingDash />;
  const d = roleDash || {};

  const kpis = [
    { title: t('عملائي الإجمالي', 'My Total Clients'), value: d.myTotalClients ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/clients' },
    { title: t('قروضي النشطة', 'My Active Loans'), value: d.myActiveLoans ?? 0, icon: Briefcase, color: 'text-sky-400', bg: 'bg-sky-500/10', link: '/loans' },
    { title: t('طلباتي المعلقة', 'My Pending Requests'), value: d.myPendingRequests ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', link: '/loan-requests' },
    { title: t('صرفت هذا الشهر', 'Disbursed This Month'), value: formatCurrency(d.myDisbursedMonth), icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/loans' },
    { title: t('عدد القروض المصروفة', 'Loans Disbursed Count'), value: d.myDisbursedCountMonth ?? 0, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10', link: '/loans' },
  ];

  const requests: any[] = d.myRecentRequests || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck size={22} className="text-primary" />
          {t('لوحة موظف التمويل', 'Loan Officer Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('متابعة أداءك وطلباتك وعملائك', 'Track your performance, requests and clients')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell>
          <SectionHeader title={t('طلباتي النشطة', 'My Active Requests')} icon={Target} linkLabel={t('عرض الكل', 'View All')} onLink={() => setLocation('/loan-requests')} />
          {requests.length === 0
            ? <EmptyState icon={FileText} label={t('لا توجد طلبات نشطة', 'No active requests')} />
            : (
              <div className="space-y-3">
                {requests.map((r: any) => (
                  <div key={r.id} onClick={() => setLocation('/loan-requests')} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-colors cursor-pointer group">
                    <div>
                      <p className="font-semibold text-sm">{r.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.requestNumber} · {formatCurrency(r.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={r.status} />
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardShell>

        <CardShell>
          <SectionHeader title={t('أدائي هذا الشهر', 'My Performance This Month')} icon={Target} />
          <div className="space-y-4">
            <PerformanceBar label={t('نسبة الإنجاز في الصرف', 'Disbursement Progress')} value={d.myDisbursedCountMonth ?? 0} max={10} unit={t('قروض', 'loans')} color="bg-emerald-500" />
            <PerformanceBar label={t('العملاء المضافون', 'Clients Added')} value={d.myTotalClients ?? 0} max={50} unit={t('عميل', 'clients')} color="bg-blue-500" />
            <div className="pt-3 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-1">{t('إجمالي المصروف', 'Total Disbursed')}</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(d.myDisbursedMonth)}</p>
            </div>
          </div>
        </CardShell>
      </div>

      <CardShell>
        <SectionHeader title={t('روابط سريعة', 'Quick Actions')} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('عميل جديد', 'New Client'), icon: Users, link: '/clients' },
            { label: t('طلب تمويل جديد', 'New Loan Request'), icon: FileText, link: '/loan-requests' },
            { label: t('قروضي', 'My Loans'), icon: Briefcase, link: '/loans' },
            { label: t('سجل التحصيل', 'Collection Log'), icon: TrendingUp, link: '/collection' },
          ].map((action, i) => (
            <button key={i} onClick={() => setLocation(action.link)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/70 transition-all cursor-pointer group">
              <action.icon size={22} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </CardShell>
    </div>
  );
}

function PerformanceBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} {unit}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

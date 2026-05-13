import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useGetParAging, useListLoanRequests } from '@workspace/api-client-react';
import { formatCurrency, cn, getStatusColor } from '@/lib/utils';
import { useState } from 'react';
import {
  KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, StatusPill, MiniKpi,
} from './shared';
import { HijriDateDisplay } from '@/components/HijriDateDisplay';
import {
  Users, Wallet, Briefcase, AlertTriangle, TrendingUp, Activity,
  FileText, Clock, BarChart3, Award, Calendar, ArrowRight, Shield,
  CheckCircle2, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LineChart, Line,
} from 'recharts';

type Period = 'monthly' | 'quarterly' | 'annual';
const periodLabels: Record<Period, { ar: string; en: string }> = {
  monthly: { ar: 'هذا الشهر', en: 'This Month' },
  quarterly: { ar: 'هذا الربع', en: 'This Quarter' },
  annual: { ar: 'هذا العام', en: 'This Year' },
};

export default function TenantAdminDashboard() {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>('monthly');

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['/api/dashboard/kpis', period],
    queryFn: () => api.get<any>(`/dashboard/kpis?period=${period}`),
  });
  const { data: parAging, isLoading: parLoading } = useGetParAging();
  const { data: recentRequests, isLoading: reqsLoading } = useListLoanRequests({ limit: 6 });
  const { data: officerPerf, isLoading: officerPerfLoading } = useQuery({
    queryKey: ['/api/dashboard/officer-performance'],
    queryFn: () => api.get<any>('/dashboard/officer-performance'),
  });
  const { data: financialRatios, isLoading: ratiosLoading } = useQuery({
    queryKey: ['/api/dashboard/financial-ratios'],
    queryFn: () => api.get<any>('/dashboard/financial-ratios'),
  });
  const { data: roleDash } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });

  if (kpisLoading || parLoading || reqsLoading || ratiosLoading) return <LoadingDash />;

  const pl = periodLabels[period];

  const topKpis = [
    { title: t('إجمالي المحفظة', 'Total Portfolio'), value: formatCurrency(kpis?.totalOutstandingBalance), icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/loans' },
    { title: t(`المنصرف ${pl.ar}`, `Disbursed ${pl.en}`), value: formatCurrency(kpis?.disbursedPeriod), icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/portfolio-analytics' },
    { title: t(`المحصل ${pl.ar}`, `Collected ${pl.en}`), value: formatCurrency(kpis?.collectedPeriod), icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10', link: '/portfolio-analytics' },
    { title: t('نسبة PAR', 'PAR Ratio'), value: `${kpis?.parRatio ?? 0}%`, icon: AlertTriangle, color: (kpis?.parRatio ?? 0) > 5 ? 'text-red-400' : 'text-yellow-400', bg: (kpis?.parRatio ?? 0) > 5 ? 'bg-red-500/10' : 'bg-yellow-500/10', link: '/loan-aging' },
    { title: t('نسبة التحصيل', 'Collection Rate'), value: `${kpis?.collectionRate ?? 0}%`, icon: Activity, color: 'text-primary', bg: 'bg-primary/10', link: '/collection' },
    { title: t('إجمالي العملاء', 'Total Clients'), value: kpis?.totalClients ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/clients' },
    { title: t('قروض نشطة', 'Active Loans'), value: kpis?.totalActiveLoans ?? 0, icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10', link: '/loans' },
    { title: t('طلبات معلقة', 'Pending Requests'), value: kpis?.pendingLoanRequests ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', link: '/loan-requests' },
  ];

  const parChartData = parAging ? [
    { name: t('جاري', 'Current'), value: parAging.current, color: '#10b981' },
    { name: '1-30', value: parAging.days1to30, color: '#eab308' },
    { name: '31-60', value: parAging.days31to60, color: '#f97316' },
    { name: '61-90', value: parAging.days61to90, color: '#ef4444' },
    { name: '91-180', value: parAging.days91to180, color: '#b91c1c' },
    { name: '180+', value: parAging.days180plus, color: '#7f1d1d' },
  ] : [];

  const officers = Array.isArray(officerPerf) ? officerPerf : officerPerf?.officers || [];
  const ratios = financialRatios?.ratios || {};
  const trends = financialRatios?.trends || [];
  const pendingApprovals = roleDash?.pendingApprovals ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={22} className="text-primary" />
            {t('لوحة مدير النظام', 'Tenant Admin Dashboard')}
          </h2>
          <p className="text-muted-foreground mt-1">{t('نظرة شاملة على أداء المنظمة', 'Full organizational performance overview')}</p>
          <div className="mt-1"><HijriDateDisplay className="text-sm" /></div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/50">
          {(['monthly', 'quarterly', 'annual'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
              period === p ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}>
              {p === 'monthly' && <Calendar size={13} />}
              {t(periodLabels[p].ar, periodLabels[p].en)}
            </button>
          ))}
        </div>
      </div>

      {pendingApprovals > 0 && (
        <div
          onClick={() => setLocation('/approvals')}
          className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 cursor-pointer hover:bg-orange-500/15 transition-colors"
        >
          <CheckCircle2 size={20} className="text-orange-400 shrink-0" />
          <p className="text-sm font-medium text-orange-300">
            {t(`${pendingApprovals} طلبات تنتظر موافقتك`, `${pendingApprovals} requests awaiting your approval`)}
          </p>
          <ArrowRight size={16} className="text-orange-400 ml-auto shrink-0" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topKpis.map((item, i) => (
          <KpiCard key={i} icon={item.icon} label={item.title} value={item.value} color={item.color} bg={item.bg} onClick={() => setLocation(item.link)} />
        ))}
      </div>

      {ratios.operationalSelfSufficiency !== undefined && (
        <CardShell>
          <SectionHeader title={t('النسب المالية الرئيسية', 'Key Financial Ratios')} icon={BarChart3} linkLabel={t('التقارير المالية', 'Financial Reports')} onLink={() => setLocation('/financial-statements')} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MiniKpi label={t('الاستدامة التشغيلية (OSS)', 'OSS')} value={`${ratios.operationalSelfSufficiency}%`} onClick={() => setLocation('/finance')} />
            <MiniKpi label={t('عائد المحفظة', 'Portfolio Yield')} value={`${ratios.portfolioYield}%`} onClick={() => setLocation('/finance')} />
            <MiniKpi label={t('نسبة المتأخرات', 'PAR Ratio')} value={`${ratios.parRatio}%`} onClick={() => setLocation('/loan-aging')} />
            <MiniKpi label={t('تكلفة لكل مقترض', 'Cost/Borrower')} value={formatCurrency(ratios.costPerBorrower)} onClick={() => setLocation('/expenses')} />
            <MiniKpi label={t('معدل السداد', 'Repayment Rate')} value={`${ratios.repaymentRate}%`} onClick={() => setLocation('/collection')} />
          </div>
        </CardShell>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2 flex flex-col">
          <SectionHeader title={t('تحليل المحفظة المتأخرة (PAR)', 'PAR Aging Analysis')} linkLabel={t('عرض التفاصيل', 'View Details')} onLink={() => setLocation('/loan-aging')} />
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), t('القيمة', 'Value')]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={() => setLocation('/loan-aging')}>
                  {parChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell className="flex flex-col">
          <SectionHeader title={t('أحدث الطلبات', 'Recent Requests')} linkLabel={t('عرض الكل', 'View All')} onLink={() => setLocation('/loan-requests')} />
          <div className="space-y-3 flex-1">
            {!recentRequests?.data?.length
              ? <EmptyState icon={FileText} label={t('لا توجد طلبات', 'No requests')} />
              : recentRequests.data.map((req: any) => (
                <div key={req.id} onClick={() => setLocation('/loan-requests')} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group">
                  <div>
                    <p className="font-semibold text-sm">{req.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(req.requestedAmount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={req.workflowStatus} />
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
          </div>
        </CardShell>
      </div>

      {trends.length > 0 && (
        <CardShell>
          <SectionHeader title={t('اتجاه التحصيل (12 شهر)', 'Collection Trend (12 months)')} linkLabel={t('تحليلات متقدمة', 'Advanced Analytics')} onLink={() => setLocation('/portfolio-analytics')} />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), t('المحصل', 'Collected')]} />
                <Line type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      )}

      {!officerPerfLoading && officers.length > 0 && (
        <CardShell>
          <SectionHeader title={t('أداء الموظفين', 'Officer Performance')} icon={Award} linkLabel={t('إدارة الموظفين', 'Manage Staff')} onLink={() => setLocation('/settings')} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn('px-4 py-3 font-semibold', isRtl ? 'text-right' : 'text-left')}>{t('الموظف', 'Officer')}</th>
                  <th className={cn('px-4 py-3 font-semibold', isRtl ? 'text-right' : 'text-left')}>{t('الدور', 'Role')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('قروض صرفت', 'Disbursed')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('المنصرف', 'Amount')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('المحصل', 'Collected')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('العملاء', 'Clients')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('المتأخر', 'Overdue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {officers.map((o: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{o.officerName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-secondary">{o.officerRole}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{o.loansDisbursedCount}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(o.loansDisbursedAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(o.collectedAmount)}</td>
                    <td className="px-4 py-3 text-right">{o.clientsRegistered}</td>
                    <td className="px-4 py-3 text-right"><span className={cn('font-mono', Number(o.overdueAmount) > 0 ? 'text-red-400' : 'text-muted-foreground')}>{formatCurrency(o.overdueAmount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardShell>
      )}
    </div>
  );
}

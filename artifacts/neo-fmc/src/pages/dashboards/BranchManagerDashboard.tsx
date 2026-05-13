import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useGetParAging } from '@workspace/api-client-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, StatusPill, MiniKpi,
} from './shared';
import {
  Briefcase, Wallet, TrendingUp, AlertTriangle, Users, Clock,
  Award, CheckCircle2, ArrowRight, Building2, ChevronRight, FileText,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function BranchManagerDashboard() {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading: roleLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });
  const { data: parAging, isLoading: parLoading } = useGetParAging();
  const { data: officerPerf, isLoading: officerPerfLoading } = useQuery({
    queryKey: ['/api/dashboard/officer-performance'],
    queryFn: () => api.get<any>('/dashboard/officer-performance'),
  });

  if (roleLoading || parLoading) return <LoadingDash />;

  const d = roleDash || {};
  const pendingApprovals = d.pendingApprovals ?? 0;

  const kpis = [
    { title: t('قروض نشطة بالفرع', 'Branch Active Loans'), value: d.branchActiveLoans ?? 0, icon: Briefcase, color: 'text-sky-400', bg: 'bg-sky-500/10', link: '/loans' },
    { title: t('رصيد الفرع المستحق', 'Branch Outstanding'), value: formatCurrency(d.branchOutstanding), icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/loans' },
    { title: t('المنصرف هذا الشهر', 'Disbursed This Month'), value: formatCurrency(d.branchDisbursedMonth), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/portfolio-analytics' },
    { title: t('عملاء الفرع', 'Branch Clients'), value: d.branchClients ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/clients' },
    { title: t('طلبات معلقة', 'Pending Requests'), value: d.branchPendingRequests ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', link: '/loan-requests' },
    { title: t('متأخرات الفرع', 'Branch Overdue'), value: formatCurrency(d.branchOverdueAmount), icon: AlertTriangle, color: d.branchOverdueAmount > 0 ? 'text-red-400' : 'text-muted-foreground', bg: d.branchOverdueAmount > 0 ? 'bg-red-500/10' : 'bg-secondary', link: '/loan-aging' },
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 size={22} className="text-primary" />
          {t('لوحة مدير الفرع', 'Branch Manager Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('أداء الفرع ومؤشراته الرئيسية', 'Branch performance and key indicators')}</p>
      </div>

      {pendingApprovals > 0 && (
        <div onClick={() => setLocation('/approvals')} className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 cursor-pointer hover:bg-orange-500/15 transition-colors">
          <CheckCircle2 size={20} className="text-orange-400 shrink-0" />
          <p className="text-sm font-medium text-orange-300">
            {t(`${pendingApprovals} طلبات تنتظر موافقتك`, `${pendingApprovals} requests awaiting your approval`)}
          </p>
          <ArrowRight size={16} className="text-orange-400 ml-auto shrink-0" />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell className="flex flex-col">
          <SectionHeader title={t('تحليل PAR للفرع', 'Branch PAR Aging')} linkLabel={t('عرض التفاصيل', 'View Details')} onLink={() => setLocation('/loan-aging')} />
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), t('القيمة', 'Value')]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={() => setLocation('/loan-aging')}>
                  {parChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell>
          <SectionHeader title={t('ملخص الفرع', 'Branch Summary')} />
          <div className="grid grid-cols-2 gap-3">
            <MiniKpi label={t('إجمالي المحفظة النشطة', 'Active Portfolio')} value={formatCurrency(d.branchOutstanding)} onClick={() => setLocation('/loans')} />
            <MiniKpi label={t('معدل الاسترداد', 'PAR Ratio')} value={`${parAging?.parRatio ?? 0}%`} onClick={() => setLocation('/loan-aging')} />
            <MiniKpi label={t('طلبات قيد المراجعة', 'In Review')} value={d.branchPendingRequests ?? 0} onClick={() => setLocation('/loan-requests')} />
            <MiniKpi label={t('موافقات معلقة', 'Pending Approvals')} value={pendingApprovals} onClick={() => setLocation('/approvals')} />
          </div>
        </CardShell>
      </div>

      {!officerPerfLoading && officers.length > 0 && (
        <CardShell>
          <SectionHeader title={t('أداء موظفي الفرع', 'Branch Officer Performance')} icon={Award} linkLabel={t('إدارة الموظفين', 'Manage Staff')} onLink={() => setLocation('/settings')} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn('px-4 py-3 font-semibold', isRtl ? 'text-right' : 'text-left')}>{t('الموظف', 'Officer')}</th>
                  <th className={cn('px-4 py-3 font-semibold', isRtl ? 'text-right' : 'text-left')}>{t('الدور', 'Role')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('قروض صرفت', 'Disbursed')}</th>
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

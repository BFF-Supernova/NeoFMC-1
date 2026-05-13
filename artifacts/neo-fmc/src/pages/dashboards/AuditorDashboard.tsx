import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useGetParAging } from '@workspace/api-client-react';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, MiniKpi } from './shared';
import {
  Shield, FileSearch, AlertTriangle, Activity, BarChart3,
  FileX, CheckSquare, ChevronRight, Eye, ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function AuditorDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading: roleLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });
  const { data: parAging, isLoading: parLoading } = useGetParAging();
  const { data: financialRatios, isLoading: ratiosLoading } = useQuery({
    queryKey: ['/api/dashboard/financial-ratios'],
    queryFn: () => api.get<any>('/dashboard/financial-ratios'),
  });

  if (roleLoading || parLoading || ratiosLoading) return <LoadingDash />;
  const d = roleDash || {};
  const ratios = financialRatios?.ratios || {};

  const kpis = [
    { title: t('نشاط سجل المراجعة اليوم', 'Audit Entries Today'), value: d.auditEntriesToday ?? 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/audit-trail' },
    { title: t('موافقات معلقة', 'Pending Approvals'), value: d.pendingApprovals ?? 0, icon: CheckSquare, color: d.pendingApprovals > 0 ? 'text-orange-400' : 'text-muted-foreground', bg: d.pendingApprovals > 0 ? 'bg-orange-500/10' : 'bg-secondary', link: '/approvals' },
    { title: t('قروض مشطوبة', 'Written Off Loans'), value: d.writeOffs ?? 0, icon: FileX, color: d.writeOffs > 0 ? 'text-red-400' : 'text-muted-foreground', bg: d.writeOffs > 0 ? 'bg-red-500/10' : 'bg-secondary', link: '/loans' },
    { title: t('قروض نشطة', 'Active Loans'), value: d.activeLoans ?? 0, icon: FileSearch, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/loans' },
  ];

  const parChartData = parAging ? [
    { name: t('جاري', 'Current'), value: parAging.current, color: '#10b981' },
    { name: '1-30', value: parAging.days1to30, color: '#eab308' },
    { name: '31-60', value: parAging.days31to60, color: '#f97316' },
    { name: '61-90', value: parAging.days61to90, color: '#ef4444' },
    { name: '91-180', value: parAging.days91to180, color: '#b91c1c' },
    { name: '180+', value: parAging.days180plus, color: '#7f1d1d' },
  ] : [];

  const auditLogs: any[] = d.recentAuditLogs || [];

  const actionColor: Record<string, string> = {
    create: 'text-emerald-400',
    update: 'text-blue-400',
    delete: 'text-red-400',
    approve: 'text-teal-400',
    reject: 'text-orange-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield size={22} className="text-primary" />
          {t('لوحة المراجع', 'Auditor Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('مراقبة الامتثال وصحة المحفظة', 'Compliance monitoring and portfolio health')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      {ratios.operationalSelfSufficiency !== undefined && (
        <CardShell>
          <SectionHeader title={t('مؤشرات صحة المحفظة', 'Portfolio Health Indicators')} icon={BarChart3} linkLabel={t('التقارير المالية', 'Financial Reports')} onLink={() => setLocation('/financial-statements')} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MiniKpi label={t('الاستدامة التشغيلية (OSS)', 'OSS')} value={`${ratios.operationalSelfSufficiency}%`} onClick={() => setLocation('/finance')} />
            <MiniKpi label={t('عائد المحفظة', 'Portfolio Yield')} value={`${ratios.portfolioYield}%`} onClick={() => setLocation('/finance')} />
            <MiniKpi label={t('نسبة PAR', 'PAR Ratio')} value={`${ratios.parRatio}%`} onClick={() => setLocation('/loan-aging')} />
            <MiniKpi label={t('تكلفة لكل مقترض', 'Cost/Borrower')} value={formatCurrency(ratios.costPerBorrower)} onClick={() => setLocation('/expenses')} />
            <MiniKpi label={t('معدل السداد', 'Repayment Rate')} value={`${ratios.repaymentRate}%`} onClick={() => setLocation('/collection')} />
          </div>
        </CardShell>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2 flex flex-col">
          <SectionHeader title={t('تحليل PAR (المحفظة في خطر)', 'PAR Aging Analysis')} linkLabel={t('عرض التفاصيل', 'View Details')} onLink={() => setLocation('/loan-aging')} />
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

        <CardShell className="flex flex-col">
          <SectionHeader title={t('سجل نشاط الامتثال', 'Compliance Activity Log')} icon={Eye} linkLabel={t('السجل الكامل', 'Full Log')} onLink={() => setLocation('/audit-trail')} />
          {auditLogs.length === 0
            ? <EmptyState icon={Activity} label={t('لا توجد أنشطة مسجلة', 'No recorded activity')} />
            : (
              <div className="space-y-2.5 flex-1 overflow-auto">
                {auditLogs.map((log: any) => (
                  <div key={log.id} onClick={() => setLocation('/audit-trail')} className="flex gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className="shrink-0 mt-0.5">
                      <span className={cn('text-xs font-bold uppercase', actionColor[log.action?.toLowerCase()] ?? 'text-muted-foreground')}>{log.action}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.entityType} #{log.entityId?.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.userName} · {new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
                  </div>
                ))}
              </div>
            )}
        </CardShell>
      </div>
    </div>
  );
}

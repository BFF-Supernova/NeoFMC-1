import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useGetParAging } from '@workspace/api-client-react';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, MiniKpi } from './shared';
import {
  TrendingUp, AlertTriangle, BarChart3, Wallet, CheckCircle2,
  ArrowRight, DollarSign, Activity, Settings2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';

export default function FinancialControllerDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading: roleLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });
  const { data: financialRatios, isLoading: ratiosLoading } = useQuery({
    queryKey: ['/api/dashboard/financial-ratios'],
    queryFn: () => api.get<any>('/dashboard/financial-ratios'),
  });
  const { data: parAging, isLoading: parLoading } = useGetParAging();

  if (roleLoading || ratiosLoading || parLoading) return <LoadingDash />;

  const d = roleDash || {};
  const ratios = financialRatios?.ratios || {};
  const trends = financialRatios?.trends || [];
  const pendingApprovals = d.pendingApprovals ?? 0;
  const expensesThisMonth = d.expensesThisMonth ?? 0;
  const incomeThisMonth = d.incomeThisMonth ?? 0;

  const kpis = [
    { title: t('الاستدامة التشغيلية (OSS)', 'Operational Self-Sufficiency'), value: `${ratios.operationalSelfSufficiency ?? 0}%`, icon: TrendingUp, color: (ratios.operationalSelfSufficiency ?? 0) >= 100 ? 'text-emerald-400' : 'text-orange-400', bg: (ratios.operationalSelfSufficiency ?? 0) >= 100 ? 'bg-emerald-500/10' : 'bg-orange-500/10', link: '/finance' },
    { title: t('عائد المحفظة', 'Portfolio Yield'), value: `${ratios.portfolioYield ?? 0}%`, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/finance' },
    { title: t('نسبة PAR', 'PAR Ratio'), value: `${ratios.parRatio ?? 0}%`, icon: AlertTriangle, color: (ratios.parRatio ?? 0) > 5 ? 'text-red-400' : 'text-yellow-400', bg: (ratios.parRatio ?? 0) > 5 ? 'bg-red-500/10' : 'bg-yellow-500/10', link: '/loan-aging' },
    { title: t('موافقات معلقة', 'Pending Approvals'), value: pendingApprovals, icon: CheckCircle2, color: pendingApprovals > 0 ? 'text-orange-400' : 'text-muted-foreground', bg: pendingApprovals > 0 ? 'bg-orange-500/10' : 'bg-secondary', link: '/approvals' },
  ];

  const parChartData = parAging ? [
    { name: t('جاري', 'Current'), value: parAging.current, color: '#10b981' },
    { name: '1-30', value: parAging.days1to30, color: '#eab308' },
    { name: '31-60', value: parAging.days31to60, color: '#f97316' },
    { name: '61-90', value: parAging.days61to90, color: '#ef4444' },
    { name: '91-180', value: parAging.days91to180, color: '#b91c1c' },
    { name: '180+', value: parAging.days180plus, color: '#7f1d1d' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 size={22} className="text-primary" />
          {t('لوحة المراقب المالي', 'Financial Controller Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('النسب المالية الاستراتيجية وتحليل المحفظة', 'Strategic financial ratios and portfolio analysis')}</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <CardShell>
        <SectionHeader title={t('ملخص النسب المالية', 'Financial Ratios Summary')} icon={BarChart3} linkLabel={t('القوائم المالية', 'Financial Statements')} onLink={() => setLocation('/financial-statements')} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MiniKpi label={t('إجمالي المحفظة', 'Total Portfolio')} value={formatCurrency(ratios.totalOutstanding)} onClick={() => setLocation('/loans')} />
          <MiniKpi label={t('إجمالي المصروف', 'Total Disbursed')} value={formatCurrency(ratios.totalDisbursed)} onClick={() => setLocation('/loans')} />
          <MiniKpi label={t('إجمالي المحصل', 'Total Collected')} value={formatCurrency(ratios.totalCollected)} onClick={() => setLocation('/collection')} />
          <MiniKpi label={t('تكلفة لكل مقترض', 'Cost/Borrower')} value={formatCurrency(ratios.costPerBorrower)} onClick={() => setLocation('/expenses')} />
          <MiniKpi label={t('معدل السداد', 'Repayment Rate')} value={`${ratios.repaymentRate ?? 0}%`} onClick={() => setLocation('/collection')} />
        </div>
      </CardShell>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell className="flex flex-col">
          <SectionHeader title={t('تحليل المحفظة المتأخرة (PAR)', 'PAR Aging Analysis')} linkLabel={t('عرض التفاصيل', 'View Details')} onLink={() => setLocation('/loan-aging')} />
          <div className="flex-1 min-h-[240px]">
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
          <SectionHeader title={t('اتجاه التحصيل', 'Collection Trend')} linkLabel={t('تحليلات متقدمة', 'Advanced Analytics')} onLink={() => setLocation('/portfolio-analytics')} />
          <div className="flex-1 min-h-[240px]">
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
      </div>

      <CardShell>
        <SectionHeader title={t('روابط الإدارة المالية', 'Financial Management Links')} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('قبول التمويل', 'Approve Requests'), icon: CheckCircle2, link: '/approvals' },
            { label: t('تحليل المصروفات', 'Expense Analysis'), icon: DollarSign, link: '/expenses' },
            { label: t('تحليل المحفظة', 'Portfolio Analytics'), icon: Activity, link: '/portfolio-analytics' },
            { label: t('التقارير المالية', 'FRA Reports'), icon: BarChart3, link: '/fra-reports' },
          ].map((a, i) => (
            <button key={i} onClick={() => setLocation(a.link)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/70 transition-all cursor-pointer group">
              <a.icon size={22} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </CardShell>
    </div>
  );
}

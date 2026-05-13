import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useGetParAging } from '@workspace/api-client-react';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, MiniKpi } from './shared';
import {
  TrendingUp, AlertTriangle, BarChart3, Wallet, Users,
  DollarSign, Activity, Briefcase, Crown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

export default function CFODashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['/api/dashboard/kpis', 'monthly'],
    queryFn: () => api.get<any>('/dashboard/kpis?period=monthly'),
  });
  const { data: financialRatios, isLoading: ratiosLoading } = useQuery({
    queryKey: ['/api/dashboard/financial-ratios'],
    queryFn: () => api.get<any>('/dashboard/financial-ratios'),
  });
  const { data: parAging, isLoading: parLoading } = useGetParAging();

  if (kpisLoading || ratiosLoading || parLoading) return <LoadingDash />;

  const ratios = financialRatios?.ratios || {};
  const trends = financialRatios?.trends || [];

  const topMetrics = [
    { title: t('الاستدامة التشغيلية (OSS)', 'Operational Self-Sufficiency'), value: `${ratios.operationalSelfSufficiency ?? 0}%`, icon: TrendingUp, color: (ratios.operationalSelfSufficiency ?? 0) >= 100 ? 'text-emerald-400' : 'text-orange-400', bg: (ratios.operationalSelfSufficiency ?? 0) >= 100 ? 'bg-emerald-500/10' : 'bg-orange-500/10', link: '/finance' },
    { title: t('عائد المحفظة', 'Portfolio Yield'), value: `${ratios.portfolioYield ?? 0}%`, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/finance' },
    { title: t('نسبة PAR', 'PAR Ratio'), value: `${ratios.parRatio ?? 0}%`, icon: AlertTriangle, color: (ratios.parRatio ?? 0) > 5 ? 'text-red-400' : 'text-yellow-400', bg: (ratios.parRatio ?? 0) > 5 ? 'bg-red-500/10' : 'bg-yellow-500/10', link: '/loan-aging' },
    { title: t('إجمالي المحفظة', 'Total Portfolio'), value: formatCurrency(ratios.totalOutstanding), icon: Briefcase, color: 'text-sky-400', bg: 'bg-sky-500/10', link: '/loans' },
    { title: t('تكلفة لكل مقترض', 'Cost per Borrower'), value: formatCurrency(ratios.costPerBorrower), icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/expenses' },
    { title: t('معدل السداد', 'Repayment Rate'), value: `${ratios.repaymentRate ?? 0}%`, icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10', link: '/collection' },
    { title: t('إجمالي العملاء', 'Total Clients'), value: kpis?.totalClients ?? 0, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', link: '/clients' },
    { title: t('قروض نشطة', 'Active Loans'), value: kpis?.totalActiveLoans ?? 0, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/loans' },
  ];

  const parChartData = parAging ? [
    { name: t('جاري', 'Current'), value: parAging.current, color: '#10b981' },
    { name: '1-30', value: parAging.days1to30, color: '#eab308' },
    { name: '31-60', value: parAging.days31to60, color: '#f97316' },
    { name: '61-90', value: parAging.days61to90, color: '#ef4444' },
    { name: '91-180', value: parAging.days91to180, color: '#b91c1c' },
    { name: '180+', value: parAging.days180plus, color: '#7f1d1d' },
  ] : [];

  const ossStatus = (ratios.operationalSelfSufficiency ?? 0) >= 100;
  const parStatus = (ratios.parRatio ?? 0) <= 5;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Crown size={22} className="text-primary" />
          {t('لوحة المدير المالي التنفيذي', 'CFO Executive Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('نظرة استراتيجية شاملة على الأداء المالي', 'Comprehensive strategic overview of financial performance')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusHighlight
          label={t('صحة الاستدامة', 'Sustainability Health')}
          good={ossStatus}
          value={`${ratios.operationalSelfSufficiency ?? 0}%`}
          goodLabel={t('مستدام', 'Sustainable')}
          badLabel={t('دون الهدف', 'Below Target')}
          onClick={() => setLocation('/finance')}
        />
        <StatusHighlight
          label={t('مستوى المخاطر (PAR)', 'Risk Level (PAR)')}
          good={parStatus}
          value={`${ratios.parRatio ?? 0}%`}
          goodLabel={t('منخفض المخاطر', 'Low Risk')}
          badLabel={t('مرتفع المخاطر', 'High Risk')}
          onClick={() => setLocation('/loan-aging')}
        />
        <div onClick={() => setLocation('/loans')} className="premium-card p-5 cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
          <p className="text-xs text-muted-foreground mb-1">{t('إجمالي المصروف', 'Total Disbursed')}</p>
          <p className="text-2xl font-display font-bold">{formatCurrency(ratios.totalDisbursed)}</p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><ArrowUp size={12} /> {t('إجمالي', 'All time')}</p>
        </div>
        <div onClick={() => setLocation('/collection')} className="premium-card p-5 cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
          <p className="text-xs text-muted-foreground mb-1">{t('إجمالي المحصل', 'Total Collected')}</p>
          <p className="text-2xl font-display font-bold">{formatCurrency(ratios.totalCollected)}</p>
          <p className="text-xs text-teal-400 mt-1 flex items-center gap-1"><TrendingUp size={12} /> {t('إجمالي', 'All time')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topMetrics.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2 flex flex-col">
          <SectionHeader title={t('اتجاه التحصيل (12 شهر)', 'Collection Trend (12 months)')} linkLabel={t('تحليلات متقدمة', 'Advanced Analytics')} onLink={() => setLocation('/portfolio-analytics')} />
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), t('المحصل', 'Collected')]} />
                <Area type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#collectionGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell className="flex flex-col">
          <SectionHeader title={t('توزيع PAR التفصيلي', 'PAR Breakdown')} linkLabel={t('تحليل التأخر', 'Aging Analysis')} onLink={() => setLocation('/loan-aging')} />
          <div className="space-y-3 flex-1">
            {parChartData.map((item, i) => {
              const total = parChartData.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={i} onClick={() => setLocation('/loan-aging')} className="cursor-pointer group p-1.5 rounded-lg hover:bg-muted/30 transition-colors -mx-1.5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium group-hover:text-foreground transition-colors">{item.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.value)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardShell>
      </div>

      <CardShell>
        <SectionHeader title={t('مراجعة المحفظة الاستراتيجية', 'Strategic Portfolio Review')} icon={BarChart3} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MiniKpi label={t('إجمالي المحفظة', 'Total Portfolio')} value={formatCurrency(ratios.totalOutstanding)} onClick={() => setLocation('/loans')} />
          <MiniKpi label={t('إجمالي المصروف', 'Total Disbursed')} value={formatCurrency(ratios.totalDisbursed)} onClick={() => setLocation('/loans')} />
          <MiniKpi label={t('إجمالي المحصل', 'Total Collected')} value={formatCurrency(ratios.totalCollected)} onClick={() => setLocation('/collection')} />
          <MiniKpi label={t('إجمالي المقترضين', 'Total Borrowers')} value={ratios.totalBorrowers ?? 0} onClick={() => setLocation('/clients')} />
          <MiniKpi label={t('تكلفة لكل مقترض', 'Cost/Borrower')} value={formatCurrency(ratios.costPerBorrower)} onClick={() => setLocation('/expenses')} />
          <MiniKpi label={t('القروض النشطة', 'Active Loans')} value={ratios.activeLoans ?? 0} onClick={() => setLocation('/loans')} />
        </div>
      </CardShell>
    </div>
  );
}

function StatusHighlight({ label, good, value, goodLabel, badLabel, onClick }: {
  label: string; good: boolean; value: string; goodLabel: string; badLabel: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'premium-card p-5 transition-all',
        good ? 'border-emerald-500/20' : 'border-red-500/20',
        onClick && 'cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30',
      )}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className={cn('text-xs mt-1 flex items-center gap-1 font-medium', good ? 'text-emerald-400' : 'text-red-400')}>
        {good ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {good ? goodLabel : badLabel}
      </p>
    </div>
  );
}

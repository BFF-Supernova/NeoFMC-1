import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFraReport } from '@/hooks/useComplianceApi';
import { cn } from '@/lib/utils';
import { FileText, Download, FileSpreadsheet, PieChart, Activity, Loader2, BarChart3, AlertTriangle, X, TrendingUp, Users, Wallet, DollarSign, ExternalLink, Globe } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  PieChart as RechartsPie, Pie, Legend, RadialBarChart, RadialBar,
} from 'recharts';

function ReportModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-3xl bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close" role="button" className="p-2 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function Reports() {
  const { t, isRtl } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<'overview' | 'fra'>('overview');
  const [fraMonth, setFraMonth] = useState(new Date().toISOString().substring(0, 7));
  const { data: fraData, isLoading: fraLoading } = useFraReport(fraMonth);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [exportLang, setExportLang] = useState<'en' | 'ar'>('en');

  const handleExport = async (type: string) => {
    toast({
      title: t('جاري التصدير', 'Exporting...'),
      description: t('سيتم تحميل الملف قريباً', 'Your file will download shortly.'),
    });

    try {
      const token = localStorage.getItem('neo_fmc_token');
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      let url = '';
      if (type === 'portfolio') url = `${base}/api/reports/export/portfolio?lang=${exportLang}`;
      else if (type === 'collection') url = `${base}/api/reports/export/collection?lang=${exportLang}`;
      else if (type === 'installments') url = `${base}/api/reports/export/installments?lang=${exportLang}`;
      else return;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${type}_report.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: t('فشل التصدير', 'Export failed') });
    }
  };

  const reports = [
    {
      titleAr: 'تقرير المحفظة الشهري', titleEn: 'Monthly Portfolio Report',
      descAr: 'تحليل شامل للمحفظة القائمة والمنصرف حسب الفروع والمنتجات',
      descEn: 'Comprehensive analysis of outstanding and disbursed portfolio by branch and product',
      icon: PieChart, color: 'text-blue-400', bg: 'bg-blue-500/10'
    },
    {
      titleAr: 'تقرير الرقابة المالية (FRA)', titleEn: 'FRA Regulatory Report',
      descAr: 'التقرير الشهري المجمع المطلوب من الهيئة العامة للرقابة المالية',
      descEn: 'Mandatory consolidated monthly report for Financial Regulatory Authority',
      icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10'
    },
    {
      titleAr: 'تقرير التحصيل والتدفقات', titleEn: 'Collection & Cashflow',
      descAr: 'تحليل المتحصلات النقدية والإلكترونية بشكل يومي',
      descEn: 'Analysis of daily cash and e-payment collections',
      icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10'
    },
    {
      titleAr: 'تحليل المخاطر والمتأخرات', titleEn: 'PAR & Risk Analysis',
      descAr: 'تصنيف الأقساط المتأخرة حسب شرائح التأخير (30/60/90 يوم)',
      descEn: 'Aging buckets classification for overdue installments (30/60/90 days)',
      icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10'
    }
  ];

  const tabs = [
    { key: 'overview' as const, label: t('نظرة عامة', 'Overview') },
    { key: 'fra' as const, label: t('تقرير FRA التفصيلي', 'FRA Detailed Report') },
  ];

  const fmt = (n: number) => new Intl.NumberFormat('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

  const fraKpis = fraData ? [
    { key: 'activeLoans', label: t('القروض النشطة', 'Active Loans'), value: fraData.totalActiveLoans, sub: `${fraData.totalNewLoans || 0} ${t('جديدة', 'new')}`, color: 'text-blue-400', icon: FileText, navTo: '/loans' },
    { key: 'disbursed', label: t('إجمالي المنصرف', 'Total Disbursed'), value: `${fmt(fraData.totalDisbursed)} EGP`, sub: `${fmt(fraData.disbursedInMonth || 0)} ${t('هذا الشهر', 'this month')}`, color: 'text-green-400', icon: Wallet, navTo: '/loans' },
    { key: 'outstanding', label: t('الرصيد القائم', 'Outstanding'), value: `${fmt(fraData.totalOutstanding)} EGP`, color: 'text-orange-400', icon: DollarSign, navTo: '/loans' },
    { key: 'collected', label: t('إجمالي المحصل', 'Collected'), value: `${fmt(fraData.totalCollected)} EGP`, sub: `${fmt(fraData.collectedInMonth || 0)} ${t('هذا الشهر', 'this month')}`, color: 'text-emerald-400', icon: TrendingUp, navTo: '/collection' },
    { key: 'overdue', label: t('المتأخرات', 'Overdue'), value: `${fmt(fraData.totalOverdue)} EGP`, color: 'text-red-400', icon: AlertTriangle, navTo: '/collection' },
    { key: 'parRatio', label: t('نسبة PAR', 'PAR Ratio'), value: `${fraData.parRatio}%`, color: 'text-yellow-400', icon: BarChart3, navTo: '/collection' },
    { key: 'clients', label: t('إجمالي العملاء', 'Total Clients'), value: fraData.totalClients, sub: `${fraData.newClients || 0} ${t('جديد', 'new')}`, color: 'text-purple-400', icon: Users, navTo: '/clients' },
    { key: 'writeOffs', label: t('الإسقاطات', 'Write-Offs'), value: fraData.writeOffs, color: 'text-red-500', icon: AlertTriangle, navTo: '/loans' },
  ] : [];

  function getPopupContent(key: string) {
    if (!fraData) return null;

    switch (key) {
      case 'activeLoans':
      case 'clients': {
        const data = [
          { name: t('قروض نشطة', 'Active Loans'), value: Number(fraData.totalActiveLoans) || 0 },
          { name: t('عملاء', 'Clients'), value: Number(fraData.totalClients) || 0 },
          { name: t('إسقاطات', 'Write-Offs'), value: Number(fraData.writeOffs) || 0 },
        ];
        return (
          <div>
            <p className="text-sm text-muted-foreground mb-4">{t('توزيع المحفظة حسب الأعداد', 'Portfolio distribution by count')}</p>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={data} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {data.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'disbursed':
      case 'collected':
      case 'outstanding': {
        const data = [
          { name: t('المنصرف', 'Disbursed'), value: Number(fraData.totalDisbursed) || 0, fill: '#10b981' },
          { name: t('المحصل', 'Collected'), value: Number(fraData.totalCollected) || 0, fill: '#3b82f6' },
          { name: t('القائم', 'Outstanding'), value: Number(fraData.totalOutstanding) || 0, fill: '#f59e0b' },
          { name: t('المتأخرات', 'Overdue'), value: Number(fraData.totalOverdue) || 0, fill: '#ef4444' },
        ];
        return (
          <div>
            <p className="text-sm text-muted-foreground mb-4">{t('مقارنة القيم المالية', 'Financial values comparison')}</p>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(v: number) => [`${fmt(v)} EGP`, t('القيمة', 'Value')]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {data.map((d, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-sm">{d.name}</span>
                  <span className="text-sm font-bold ml-auto font-mono">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'overdue':
      case 'parRatio': {
        const buckets = fraData.delinquencyBuckets || {};
        const data = [
          { name: t('جاري', 'Current'), value: Number(buckets.current?.amount || 0), fill: '#10b981' },
          { name: '1-30', value: Number(buckets['1-30']?.amount || 0), fill: '#eab308' },
          { name: '31-60', value: Number(buckets['31-60']?.amount || 0), fill: '#f97316' },
          { name: '61-90', value: Number(buckets['61-90']?.amount || 0), fill: '#ef4444' },
          { name: '90+', value: Number(buckets['90+']?.amount || 0), fill: '#7f1d1d' },
        ];
        return (
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t('تحليل شرائح التأخير التفصيلي', 'Detailed delinquency bucket analysis')}</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-xs text-muted-foreground">{t('نسبة PAR', 'PAR Ratio')}</span>
                <p className="text-2xl font-bold text-yellow-400">{fraData.parRatio}%</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-xs text-muted-foreground">{t('إجمالي المتأخرات', 'Total Overdue')}</span>
                <p className="text-2xl font-bold text-red-400">{fmt(fraData.totalOverdue)} EGP</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(v: number) => [`${fmt(v)} EGP`, t('المبلغ', 'Amount')]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className={cn("py-2 px-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الشريحة', 'Bucket')}</th>
                    <th className={cn("py-2 px-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العدد', 'Count')}</th>
                    <th className={cn("py-2 px-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {['current', '1-30', '31-60', '61-90', '90+'].map(b => {
                    const d = buckets[b] || { count: 0, amount: 0 };
                    return (
                      <tr key={b} className="border-b border-border/50">
                        <td className="py-2 px-3 font-medium">{b === 'current' ? t('جاري', 'Current') : `${b} ${t('يوم', 'Days')}`}</td>
                        <td className="py-2 px-3">{d.count}</td>
                        <td className="py-2 px-3 font-mono">{fmt(d.amount)} EGP</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'writeOffs': {
        const woData = (fraData.writeOffsByType || []).map((wo: any, i: number) => {
          const labels: Record<string, string> = { death: t('وفاة', 'Death'), disability: t('إعاقة', 'Disability'), delinquency: t('تعثر', 'Delinquency'), unspecified: t('غير محدد', 'Unspecified') };
          return { name: labels[wo.type] || wo.type, value: Number(wo.count) || 0, amount: Number(wo.amount) || 0, fill: COLORS[i % COLORS.length] };
        });
        if (woData.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <AlertTriangle size={32} className="mb-2 opacity-50" />
              <p>{t('لا توجد إسقاطات', 'No write-offs recorded')}</p>
            </div>
          );
        }
        return (
          <div>
            <p className="text-sm text-muted-foreground mb-4">{t('توزيع الإسقاطات حسب النوع', 'Write-offs distribution by type')}</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={woData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {woData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {woData.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                  <div>
                    <span className="text-sm font-medium">{d.name}</span>
                    <p className="text-xs text-muted-foreground">{d.value} {t('حالة', 'cases')} - {fmt(d.amount)} EGP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  function getPopupTitle(key: string): string {
    const titles: Record<string, string> = {
      activeLoans: t('تحليل القروض والعملاء', 'Loans & Clients Analysis'),
      clients: t('تحليل القروض والعملاء', 'Loans & Clients Analysis'),
      disbursed: t('تحليل القيم المالية', 'Financial Values Analysis'),
      collected: t('تحليل القيم المالية', 'Financial Values Analysis'),
      outstanding: t('تحليل القيم المالية', 'Financial Values Analysis'),
      overdue: t('تحليل شرائح التأخير', 'Delinquency Analysis'),
      parRatio: t('تحليل شرائح التأخير', 'Delinquency Analysis'),
      writeOffs: t('تحليل الإسقاطات', 'Write-Offs Analysis'),
    };
    return titles[key] || '';
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('التقارير والإحصائيات', 'Reports & Analytics')}</h2>
        <p className="text-muted-foreground mt-1">{t('تصدير التقارير الإدارية والتنظيمية', 'Export management and regulatory reports')}</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === tb.key ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-muted-foreground" />
            <label className="text-sm font-medium text-muted-foreground">{t('لغة التصدير', 'Export Language')}:</label>
            <select value={exportLang} onChange={e => setExportLang(e.target.value as 'en' | 'ar')} className="h-9 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground">
              <option value="en">English</option>
              <option value="ar">العربية / Arabic</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report, i) => (
              <div key={i} className="premium-card p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${report.bg} ${report.color}`}>
                    <report.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">{t(report.titleAr, report.titleEn)}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t(report.descAr, report.descEn)}</p>
                  </div>
                </div>
                <div className="mt-auto pt-6 flex gap-3">
                  <button onClick={() => handleExport(i === 0 ? 'portfolio' : i === 2 ? 'collection' : 'installments')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 font-medium rounded-xl transition-colors border border-green-500/20">
                    <FileSpreadsheet size={18} /><span>Excel</span>
                  </button>
                  <button onClick={() => handleExport(i === 0 ? 'portfolio' : i === 2 ? 'collection' : 'installments')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium rounded-xl transition-colors border border-red-500/20">
                    <Download size={18} /><span>CSV</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'fra' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground">{t('الشهر', 'Month')}:</label>
            <input
              type="month"
              className="h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={fraMonth}
              onChange={e => setFraMonth(e.target.value)}
            />
          </div>

          {fraLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
          ) : fraData ? (
            <>
              <p className="text-xs text-muted-foreground">{t('اضغط على أي مؤشر لعرض الرسم البياني التفصيلي', 'Click any indicator to view the detailed chart')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fraKpis.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => setActivePopup(item.key)}
                    className="premium-card p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-200 group border-2 border-transparent hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                      <item.icon size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", item.color)} />
                    </div>
                    <p className={cn("text-xl font-bold mt-1", item.color)}>{item.value}</p>
                    {(item as any).sub && <p className="text-[10px] text-muted-foreground mt-0.5">{(item as any).sub}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('اضغط للتفاصيل', 'Click for details')}
                      </p>
                      <button onClick={(e) => { e.stopPropagation(); navigate(item.navTo); }} className="p-1 rounded hover:bg-primary/20 transition-colors" title={t('انتقل للصفحة', 'Go to page')}>
                        <ExternalLink size={11} className="text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {fraData.delinquencyBuckets && (
                <div
                  className="premium-card p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-primary/30"
                  onClick={() => setActivePopup('parRatio')}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />
                    {t('شرائح التأخير (Delinquency Buckets)', 'Delinquency Buckets')}
                    <span className="text-xs text-muted-foreground font-normal ml-auto">{t('اضغط للرسم البياني', 'Click for chart')}</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className={cn("py-3 px-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الشريحة', 'Bucket')}</th>
                          <th className={cn("py-3 px-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('عدد الأقساط', 'Count')}</th>
                          <th className={cn("py-3 px-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ (ج.م)', 'Amount (EGP)')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['current', '1-30', '31-60', '61-90', '90+'].map(bucket => {
                          const data = fraData.delinquencyBuckets[bucket] || { count: 0, amount: 0 };
                          const bucketLabels: Record<string, { ar: string; en: string }> = {
                            current: { ar: 'جاري', en: 'Current' },
                            '1-30': { ar: '1-30 يوم', en: '1-30 Days' },
                            '31-60': { ar: '31-60 يوم', en: '31-60 Days' },
                            '61-90': { ar: '61-90 يوم', en: '61-90 Days' },
                            '90+': { ar: '90+ يوم', en: '90+ Days' },
                          };
                          const colors: Record<string, string> = {
                            current: 'text-green-400',
                            '1-30': 'text-yellow-400',
                            '31-60': 'text-orange-400',
                            '61-90': 'text-red-400',
                            '90+': 'text-red-600',
                          };
                          return (
                            <tr key={bucket} className="border-b border-border/50 hover:bg-muted/30">
                              <td className={cn("py-3 px-4 font-medium", colors[bucket])}>
                                {bucket === '90+' && <AlertTriangle size={14} className="inline mr-1" />}
                                {t(bucketLabels[bucket].ar, bucketLabels[bucket].en)}
                              </td>
                              <td className="py-3 px-4">{data.count}</td>
                              <td className="py-3 px-4 font-mono">{fmt(data.amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {fraData.writeOffsByType && fraData.writeOffsByType.length > 0 && (
                <div
                  className="premium-card p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-primary/30"
                  onClick={() => setActivePopup('writeOffs')}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-400" />
                    {t('الإسقاطات حسب النوع', 'Write-Offs by Type')}
                    <span className="text-xs text-muted-foreground font-normal ml-auto">{t('اضغط للرسم البياني', 'Click for chart')}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {fraData.writeOffsByType.map((wo: any, i: number) => {
                      const typeLabels: Record<string, { ar: string; en: string }> = {
                        death: { ar: 'وفاة', en: 'Death' },
                        disability: { ar: 'إعاقة', en: 'Disability' },
                        delinquency: { ar: 'تعثر', en: 'Delinquency' },
                        unspecified: { ar: 'غير محدد', en: 'Unspecified' },
                      };
                      return (
                        <div key={i} className="bg-secondary/50 rounded-xl p-4">
                          <p className="text-sm text-muted-foreground">{t(typeLabels[wo.type]?.ar || wo.type, typeLabels[wo.type]?.en || wo.type)}</p>
                          <p className="text-xl font-bold text-red-400 mt-1">{wo.count}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{fmt(wo.amount)} EGP</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      <ReportModal
        open={!!activePopup}
        onClose={() => setActivePopup(null)}
        title={activePopup ? getPopupTitle(activePopup) : ''}
      >
        {activePopup && getPopupContent(activePopup)}
      </ReportModal>
    </div>
  );
}

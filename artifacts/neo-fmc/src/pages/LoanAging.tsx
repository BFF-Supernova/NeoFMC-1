import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingDown, Building2, Users, Package, AlertTriangle, ArrowRight, ChevronRight, ExternalLink, Filter, X } from 'lucide-react';
import { useLocation } from 'wouter';

const BUCKET_KEY_TO_LABEL: Record<string, string> = {
  CURRENT: 'Current',
  PAR1_30: '1-30 Days',
  PAR31_60: '31-60 Days',
  PAR61_90: '61-90 Days',
  PAR91_180: '91-180 Days',
  PAR180_PLUS: '180+ Days',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(amount);
}

function BarSegment({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-mono w-16 text-right">{formatCurrency(value)}</span>
    </div>
  );
}

export default function LoanAging() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [drilldown, setDrilldown] = useState<'branch' | 'officer' | 'product'>('branch');

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const bucketParam = params.get('bucket') || '';
  const [highlightBucket, setHighlightBucket] = useState(bucketParam);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  const { data: agingSummary, isLoading } = useQuery({
    queryKey: ['/api/loan-aging/summary'],
    queryFn: () => api.get<any>('/loan-aging/summary'),
  });

  const { data: branchData } = useQuery({
    queryKey: ['/api/loan-aging/by-branch'],
    queryFn: () => api.get<any[]>('/loan-aging/by-branch'),
    enabled: drilldown === 'branch',
  });

  const { data: officerData } = useQuery({
    queryKey: ['/api/loan-aging/by-officer'],
    queryFn: () => api.get<any[]>('/loan-aging/by-officer'),
    enabled: drilldown === 'officer',
  });

  const { data: productData } = useQuery({
    queryKey: ['/api/loan-aging/by-product'],
    queryFn: () => api.get<any[]>('/loan-aging/by-product'),
    enabled: drilldown === 'product',
  });

  const { data: trendData } = useQuery({
    queryKey: ['/api/loan-aging/trend'],
    queryFn: () => api.get<any[]>('/loan-aging/trend'),
  });

  const buckets = agingSummary?.buckets || [];
  const summary = agingSummary?.summary || {};
  const maxBucketAmount = Math.max(...buckets.map((b: any) => b.overdueAmount || 0), 1);

  const BUCKET_COLORS = [
    'bg-green-500',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-orange-500',
    'bg-red-400',
    'bg-red-500',
    'bg-red-700',
  ];

  const drilldownData = drilldown === 'branch' ? branchData : drilldown === 'officer' ? officerData : productData;
  const maxDrilldownAmount = Math.max(...(drilldownData || []).map((d: any) => d.overdueAmount || 0), 1);

  const summaryCards = [
    { label: t('إجمالي المحفظة', 'Total Portfolio'), value: formatCurrency(summary.totalOutstanding || 0), link: '/loans' },
    { label: t('قروض نشطة', 'Active Loans'), value: summary.activeLoans || 0, link: '/loans' },
    { label: t('إجمالي المتأخرات', 'Total Overdue'), value: formatCurrency(summary.totalOverdue || 0), color: 'text-red-600', link: '/collection' },
    { label: 'PAR 30', value: `${summary.par30Ratio || 0}%`, color: 'text-orange-600', warn: summary.par30Ratio > 5, link: '/reports' },
    { label: 'PAR 90', value: `${summary.par90Ratio || 0}%`, color: 'text-red-600', warn: summary.par90Ratio > 3, link: '/reports' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {t('تحليل أعمار المحفظة', 'Loan Portfolio Aging Analysis')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('تحليل تفصيلي لأعمار المتأخرات مع الحفر بالتفاصيل', 'Detailed PAR aging analysis with drill-down')}</p>
        </div>
        <button onClick={() => setLocation('/dashboard')} className="text-xs text-primary hover:underline flex items-center gap-1">
          {t('العودة للوحة', 'Back to Dashboard')} <ArrowRight size={12} />
        </button>
      </div>

      {highlightBucket && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm">
          <Filter size={14} className="text-primary" />
          <span className="text-muted-foreground">{t('تمييز فئة:', 'Highlighted bucket:')}</span>
          <span className="font-bold text-primary">{BUCKET_KEY_TO_LABEL[highlightBucket] || highlightBucket}</span>
          <button
            onClick={() => { setHighlightBucket(''); setLocation('/loan-aging'); }}
            className="ml-auto p-1 rounded hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card, i) => (
          <Card
            key={i}
            onClick={() => setLocation(card.link)}
            className="cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200 group"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-xl font-bold", card.color)}>{card.value}</div>
                  {card.warn && <AlertTriangle className="h-4 w-4 text-orange-500 inline ml-1" />}
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('توزيع الأعمار', 'Aging Distribution')}</CardTitle>
              <CardDescription>{t('توزيع المتأخرات حسب فترات التأخير', 'Overdue distribution by aging buckets')}</CardDescription>
            </div>
            <button onClick={() => setLocation('/reports')} className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('تقرير كامل', 'Full Report')} <ExternalLink size={12} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <div className="space-y-4">
              {buckets.map((bucket: any, idx: number) => {
                const bucketKeys = Object.keys(BUCKET_KEY_TO_LABEL);
                const isHighlighted = highlightBucket && (
                  bucket.label === BUCKET_KEY_TO_LABEL[highlightBucket] ||
                  bucket.key === highlightBucket ||
                  bucketKeys[idx] === highlightBucket
                );
                return (
                  <div
                    key={bucket.label}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={cn(
                      "space-y-1 cursor-pointer hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors",
                      isHighlighted && "bg-primary/10 ring-2 ring-primary/30 rounded-xl"
                    )}
                    onClick={() => setLocation('/collection')}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${BUCKET_COLORS[idx]}`} />
                        <span className={cn("font-medium", isHighlighted && "text-primary font-bold")}>{bucket.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{bucket.count} {t('قروض', 'loans')}</span>
                        <span>{bucket.installmentCount} {t('أقساط', 'installments')}</span>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                    <BarSegment value={bucket.overdueAmount} max={maxBucketAmount} color={BUCKET_COLORS[idx]} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('الحفر بالتفاصيل', 'Drill-Down Analysis')}</CardTitle>
              <CardDescription>{t('تحليل المتأخرات حسب', 'Analyze overdue by dimension')}</CardDescription>
            </div>
            <Select value={drilldown} onValueChange={(v) => setDrilldown(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branch"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{t('الفرع', 'Branch')}</div></SelectItem>
                <SelectItem value="officer"><div className="flex items-center gap-2"><Users className="h-4 w-4" />{t('الموظف', 'Officer')}</div></SelectItem>
                <SelectItem value="product"><div className="flex items-center gap-2"><Package className="h-4 w-4" />{t('المنتج', 'Product')}</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!drilldownData?.length ? (
            <p className="text-center text-muted-foreground py-8">{t('لا توجد بيانات', 'No data available')}</p>
          ) : (
            <div className="space-y-3">
              {drilldownData.sort((a: any, b: any) => b.parRatio - a.parRatio).map((item: any) => (
                <div
                  key={item.branchId || item.officerId || item.productId}
                  onClick={() => {
                    if (drilldown === 'branch') setLocation('/settings');
                    else if (drilldown === 'officer') setLocation('/settings');
                    else setLocation('/settings');
                  }}
                  className="p-3 rounded-lg border bg-card cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{item.branchName || item.officerName || item.productName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.parRatio > 10 ? 'destructive' : item.parRatio > 5 ? 'secondary' : 'outline'}>
                        PAR {item.parRatio}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.activeLoans} {t('قروض', 'loans')}</span>
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>{t('المحفظة', 'Portfolio')}: {formatCurrency(item.totalOutstanding)}</div>
                    <div className="text-red-600">{t('متأخرات', 'Overdue')}: {formatCurrency(item.overdueAmount)}</div>
                  </div>
                  <BarSegment
                    value={item.overdueAmount}
                    max={maxDrilldownAmount}
                    color={item.parRatio > 10 ? 'bg-red-500' : item.parRatio > 5 ? 'bg-orange-500' : 'bg-yellow-400'}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {trendData && trendData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  {t('اتجاه التحصيل', 'Collection Trend')}
                </CardTitle>
                <CardDescription>{t('معدل التحصيل الشهري', 'Monthly collection rate trend')}</CardDescription>
              </div>
              <button onClick={() => setLocation('/portfolio-analytics')} className="text-xs text-primary hover:underline flex items-center gap-1">
                {t('تحليلات متقدمة', 'Advanced Analytics')} <ArrowRight size={12} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendData.map((row: any) => (
                <div
                  key={row.month}
                  onClick={() => setLocation('/collection')}
                  className="flex items-center gap-4 cursor-pointer hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors group"
                >
                  <span className="text-sm font-mono w-20">{row.month}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${row.collectionRate}%` }} />
                      </div>
                      <span className="text-sm font-medium w-14 text-right">{row.collectionRate}%</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{t('مستحق', 'Due')}: {formatCurrency(row.totalDue)}</span>
                      <span>{t('محصل', 'Collected')}: {formatCurrency(row.totalPaid)}</span>
                      <span className="text-red-500">{t('متأخر', 'Overdue')}: {row.overdueCount}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

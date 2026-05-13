import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, handleApiError } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { BarChart3, Loader2, TrendingUp, PieChart, Users, ArrowRight, ChevronRight, ExternalLink } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts';
import { useLocation } from 'wouter';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export default function PortfolioAnalytics() {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'vintage' | 'concentration' | 'trends'>('vintage');
  const [vintage, setVintage] = useState<any>(null);
  const [concentration, setConcentration] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'vintage') {
        const data = await api.get<any>('/portfolio-analytics/vintage');
        setVintage(data);
      } else if (tab === 'concentration') {
        const data = await api.get<any>('/portfolio-analytics/concentration');
        setConcentration(data);
      } else {
        const data = await api.get<any>('/portfolio-analytics/trends');
        setTrends(data);
      }
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const tabs = [
    { key: 'vintage' as const, icon: BarChart3, labelAr: 'تحليل الدفعات', labelEn: 'Vintage Analysis' },
    { key: 'concentration' as const, icon: PieChart, labelAr: 'تحليل التركز', labelEn: 'Concentration' },
    { key: 'trends' as const, icon: TrendingUp, labelAr: 'الاتجاهات', labelEn: 'Trends' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={24} className="text-primary" /> {t('تحليلات المحفظة المتقدمة', 'Advanced Portfolio Analytics')}</h2>
          <p className="text-muted-foreground mt-1">{t('تحليل الأداء والتركز والاتجاهات', 'Performance, concentration, and trends analysis')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLocation('/dashboard')} className="text-xs text-primary hover:underline flex items-center gap-1">
            {t('العودة للوحة', 'Back to Dashboard')} <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors", tab === tb.key ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
            <tb.icon size={16} /> {t(tb.labelAr, tb.labelEn)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <>
          {tab === 'vintage' && vintage && (
            <div className="space-y-6">
              <div className="premium-card p-6">
                <h3 className="font-bold mb-4">{t('أداء الدفعات الشهرية', 'Monthly Cohort Performance')}</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={vintage.data || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Legend />
                    <Bar dataKey="totalDisbursed" name={t('المصروف', 'Disbursed')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalOutstanding" name={t('القائم', 'Outstanding')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalPaid" name={t('المسدد', 'Paid')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/30 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('الدفعة', 'Cohort')}</th>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('عدد', 'Count')}</th>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('المصروف', 'Disbursed')}</th>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('القائم', 'Outstanding')}</th>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('معدل السداد', 'Repay Rate')}</th>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('نشط', 'Active')}</th>
                      <th className={cn("px-4 py-3", isRtl ? "text-right" : "text-left")}>{t('مغلق', 'Closed')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(vintage.data || []).map((v: any) => (
                      <tr key={v.cohort} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setLocation('/loans')}>
                        <td className="px-4 py-3 font-medium">{v.cohort}</td>
                        <td className="px-4 py-3">{v.loanCount}</td>
                        <td className="px-4 py-3">{formatCurrency(v.totalDisbursed)}</td>
                        <td className="px-4 py-3">{formatCurrency(v.totalOutstanding)}</td>
                        <td className="px-4 py-3 font-bold text-primary">{v.repaymentRate}%</td>
                        <td className="px-4 py-3">{v.activeCount}</td>
                        <td className="px-4 py-3">{v.closedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'concentration' && concentration && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="premium-card p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} /> {t('أكبر المقترضين', 'Top Borrowers')}</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(concentration.topBorrowers || []).slice(0, 10).map((b: any, i: number) => (
                      <div
                        key={b.clientId}
                        onClick={() => setLocation('/clients')}
                        className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/70 hover:border-primary/20 border border-transparent transition-all group"
                      >
                        <div>
                          <span className="text-xs text-muted-foreground">#{i + 1}</span>
                          <p className="font-medium">{b.clientName}</p>
                          <p className="text-xs text-muted-foreground">{b.loanCount} {t('قروض', 'loans')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(b.totalOutstanding)}</p>
                            <p className="text-xs text-primary font-bold">{b.concentrationPct}%</p>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-card p-6">
                  <h3 className="font-bold mb-4">{t('التوزيع حسب الفرع', 'Distribution by Branch')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RPieChart>
                      <Pie data={concentration.byBranch || []} dataKey="totalOutstanding" nameKey="branchName" cx="50%" cy="50%" outerRadius={100} label={({ name, concentrationPct }: any) => `${name || 'N/A'} ${concentrationPct}%`}>
                        {(concentration.byBranch || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="premium-card p-6">
                <h3 className="font-bold mb-4">{t('التركز حسب المنتج', 'Concentration by Product')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={concentration.byProduct || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="productName" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="totalOutstanding" fill="#6366f1" radius={[0, 4, 4, 0]} className="cursor-pointer" onClick={() => setLocation('/loans')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'trends' && trends && (
            <div className="space-y-6">
              <div className="premium-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">{t('اتجاه الصرف', 'Disbursement Trend')}</h3>
                  <button onClick={() => setLocation('/loans')} className="text-xs text-primary hover:underline flex items-center gap-1">
                    {t('عرض القروض', 'View Loans')} <ArrowRight size={12} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.disbursement || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalDisbursed" name={t('المصروف', 'Disbursed')} stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="loanCount" name={t('عدد القروض', 'Loan Count')} stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">{t('اتجاه التحصيل', 'Collection Trend')}</h3>
                  <button onClick={() => setLocation('/collection')} className="text-xs text-primary hover:underline flex items-center gap-1">
                    {t('عرض التحصيلات', 'View Collections')} <ArrowRight size={12} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.collection || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalCollected" name={t('المحصل', 'Collected')} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="paymentCount" name={t('عدد المدفوعات', 'Payment Count')} stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

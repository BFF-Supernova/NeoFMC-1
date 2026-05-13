import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download, TrendingUp, Users, AlertTriangle, Building2, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FRAReports() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'quarterly' | 'concentration' | 'distribution'>('quarterly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const { data: quarterly } = useQuery({ queryKey: ['/api/fra-reports/quarterly-performance', year, quarter], queryFn: () => api(`/api/fra-reports/quarterly-performance?year=${year}&quarter=${quarter}`), enabled: tab === 'quarterly' });
  const { data: concentration } = useQuery({ queryKey: ['/api/fra-reports/borrower-concentration'], queryFn: () => api('/api/fra-reports/borrower-concentration'), enabled: tab === 'concentration' });
  const { data: distribution } = useQuery({ queryKey: ['/api/fra-reports/gender-distribution'], queryFn: () => api('/api/fra-reports/gender-distribution'), enabled: tab === 'distribution' });

  const formatCurrency = (v: any) => typeof v === 'number' ? `${v.toLocaleString()} ${t('ج.م', 'EGP')}` : v;

  const tabs = [
    { key: 'quarterly' as const, label: t('الأداء الربع سنوي', 'Quarterly Performance'), icon: TrendingUp },
    { key: 'concentration' as const, label: t('تركز المقترضين', 'Borrower Concentration'), icon: Users },
    { key: 'distribution' as const, label: t('التوزيع الجغرافي والمنتجات', 'Geographic & Product Distribution'), icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="h-7 w-7 text-primary" />
            {t('تقارير الهيئة العامة للرقابة المالية', 'FRA Regulatory Reports')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('التقارير التنظيمية المطلوبة من هيئة الرقابة المالية', 'Reports required by the Financial Regulatory Authority')}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(t2 => (
          <button key={t2.key} onClick={() => setTab(t2.key)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${tab === t2.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t2.icon className="h-4 w-4" />{t2.label}
          </button>
        ))}
      </div>

      {tab === 'quarterly' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select className="premium-input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="premium-input" value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
          </div>
          {quarterly && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('القروض النشطة', 'Active Loans')}</div><div className="text-2xl font-bold mt-1">{quarterly.portfolio?.activeLoanCount}</div></div>
                <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('إجمالي المحفظة', 'Total Outstanding')}</div><div className="text-xl font-bold mt-1">{formatCurrency(quarterly.portfolio?.totalOutstanding)}</div></div>
                <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('المنصرف هذا الربع', 'Quarter Disbursements')}</div><div className="text-xl font-bold mt-1">{formatCurrency(quarterly.quarterActivity?.newDisbursements?.total)}</div><div className="text-xs text-muted-foreground">{quarterly.quarterActivity?.newDisbursements?.count} {t('قرض', 'loans')}</div></div>
                <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('التحصيل هذا الربع', 'Quarter Collections')}</div><div className="text-xl font-bold mt-1">{formatCurrency(quarterly.quarterActivity?.collections?.total)}</div><div className="text-xs text-muted-foreground">{quarterly.quarterActivity?.collections?.count} {t('دفعة', 'payments')}</div></div>
              </div>

              <div className="premium-card p-4">
                <h3 className="font-semibold mb-3">{t('تحليل المحفظة المعرضة للخطر (PAR)', 'Portfolio at Risk Analysis')}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterly.parAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Bar dataKey="totalAmount" fill="#3b82f6" name={t('المبلغ', 'Amount')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="w-full text-sm mt-4">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-start p-2">{t('الفئة', 'Bucket')}</th><th className="text-start p-2">{t('العدد', 'Count')}</th><th className="text-start p-2">{t('المبلغ', 'Amount')}</th></tr></thead>
                  <tbody>{quarterly.parAnalysis?.map((b: any, i: number) => (<tr key={i} className="border-b border-border/50"><td className="p-2">{b.bucket}</td><td className="p-2">{b.count}</td><td className="p-2">{formatCurrency(b.totalAmount)}</td></tr>))}</tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('إجمالي العملاء', 'Total Clients')}</div><div className="text-2xl font-bold mt-1">{quarterly.clientMetrics?.totalRegistered}</div></div>
                <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('المقترضون النشطون', 'Active Borrowers')}</div><div className="text-2xl font-bold mt-1">{quarterly.clientMetrics?.activeborrowrs}</div></div>
              </div>

              {quarterly.writeOffs?.count > 0 && (
                <div className="premium-card p-4 border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" /><span className="font-semibold">{t('القروض المشطوبة', 'Write-Offs')}</span></div>
                  <div className="mt-2 text-sm">{quarterly.writeOffs.count} {t('قروض بإجمالي', 'loans totaling')} {formatCurrency(quarterly.writeOffs.totalAmount)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'concentration' && concentration && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('إجمالي المحفظة', 'Portfolio Total')}</div><div className="text-xl font-bold mt-1">{formatCurrency(concentration.portfolioTotal)}</div></div>
            <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('تركز أكبر 10', 'Top 10 Concentration')}</div><div className="text-xl font-bold mt-1">{concentration.top10Concentration}%</div></div>
            <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('تركز أكبر 20', 'Top 20 Concentration')}</div><div className="text-xl font-bold mt-1">{concentration.top20Concentration}%</div></div>
          </div>
          <div className="premium-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="text-start p-3">#</th>
                <th className="text-start p-3">{t('المقترض', 'Borrower')}</th>
                <th className="text-start p-3">{t('الرقم القومي', 'National ID')}</th>
                <th className="text-start p-3">{t('المديونية', 'Outstanding')}</th>
                <th className="text-start p-3">{t('عدد القروض', 'Loans')}</th>
                <th className="text-start p-3">{t('% من المحفظة', '% of Portfolio')}</th>
              </tr></thead>
              <tbody>{concentration.topBorrowers?.map((b: any, i: number) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{isRtl ? b.clientNameAr : (b.clientNameEn || b.clientNameAr)}</td>
                  <td className="p-3 font-mono text-xs">{b.nationalId}</td>
                  <td className="p-3 font-semibold">{formatCurrency(b.totalOutstanding)}</td>
                  <td className="p-3">{b.loanCount}</td>
                  <td className="p-3"><span className={`font-medium ${b.percentOfPortfolio > 5 ? 'text-red-600' : b.percentOfPortfolio > 2 ? 'text-amber-600' : 'text-green-600'}`}>{b.percentOfPortfolio}%</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'distribution' && distribution && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('إجمالي العملاء', 'Total Clients')}</div><div className="text-2xl font-bold mt-1">{distribution.totalClients}</div></div>
            <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('المقترضون النشطون', 'Active Borrowers')}</div><div className="text-2xl font-bold mt-1">{distribution.activeBorrowers}</div></div>
            <div className="premium-card p-4"><div className="text-xs text-muted-foreground">{t('إجمالي المنصرف', 'Total Disbursed')}</div><div className="text-xl font-bold mt-1">{formatCurrency(distribution.totalActiveDisbursed)}</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="premium-card p-4">
              <h3 className="font-semibold mb-3">{t('التوزيع حسب الفرع', 'Distribution by Branch')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution.distributionByBranch} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="branchName" width={100} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="totalOutstanding" fill="#3b82f6" name={t('المديونية', 'Outstanding')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="premium-card p-4">
              <h3 className="font-semibold mb-3">{t('التوزيع حسب المنتج', 'Distribution by Product')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={distribution.distributionByProduct} dataKey="totalDisbursed" nameKey={isRtl ? "productName" : "productNameEn"} cx="50%" cy="50%" outerRadius={80} label>
                      {distribution.distributionByProduct?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="premium-card overflow-x-auto">
            <h3 className="font-semibold p-4 pb-2">{t('تفاصيل الفروع', 'Branch Details')}</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="text-start p-3">{t('الفرع', 'Branch')}</th>
                <th className="text-start p-3">{t('عدد القروض', 'Loans')}</th>
                <th className="text-start p-3">{t('عدد العملاء', 'Clients')}</th>
                <th className="text-start p-3">{t('المديونية', 'Outstanding')}</th>
              </tr></thead>
              <tbody>{distribution.distributionByBranch?.map((b: any, i: number) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-3 font-medium">{b.branchName || t('غير محدد', 'Unassigned')}</td>
                  <td className="p-3">{b.loanCount}</td>
                  <td className="p-3">{b.clientCount}</td>
                  <td className="p-3 font-semibold">{formatCurrency(b.totalOutstanding)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

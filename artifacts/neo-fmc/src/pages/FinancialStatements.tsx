import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { FileText, TrendingUp, TrendingDown, Scale, Download, Loader2, ArrowUpRight, ArrowDownRight, DollarSign, Building2, Printer, Globe } from 'lucide-react';
import { generateTrialBalancePDF, generateIncomeStatementPDF, generateBalanceSheetPDF, generateCashFlowPDF, generateBranchPnlPDF, type ReportLang } from '@/lib/pdfGenerator';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

export default function FinancialStatements() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'trial-balance' | 'income-statement' | 'balance-sheet' | 'cash-flow' | 'branch-pnl'>('trial-balance');
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [asOfDate, setAsOfDate] = useState(today);
  const [exportLang, setExportLang] = useState<ReportLang>('en');

  const { data: trialBalance, isLoading: tbLoading } = useQuery({
    queryKey: ['/api/financial-statements/trial-balance', dateFrom, dateTo],
    queryFn: () => api.get<any>(`/financial-statements/trial-balance?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: tab === 'trial-balance',
  });

  const { data: incomeStatement, isLoading: isLoading } = useQuery({
    queryKey: ['/api/financial-statements/income-statement', dateFrom, dateTo],
    queryFn: () => api.get<any>(`/financial-statements/income-statement?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: tab === 'income-statement',
  });

  const { data: balanceSheet, isLoading: bsLoading } = useQuery({
    queryKey: ['/api/financial-statements/balance-sheet', asOfDate],
    queryFn: () => api.get<any>(`/financial-statements/balance-sheet?asOfDate=${asOfDate}`),
    enabled: tab === 'balance-sheet',
  });

  const { data: cashFlow, isLoading: cfLoading } = useQuery({
    queryKey: ['/api/financial-statements/cash-flow', dateFrom, dateTo],
    queryFn: () => api.get<any>(`/financial-statements/cash-flow?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: tab === 'cash-flow',
  });

  const { data: branchPnl, isLoading: bpLoading } = useQuery({
    queryKey: ['/api/financial-statements/branch-pnl', dateFrom, dateTo],
    queryFn: () => api.get<any>(`/financial-statements/branch-pnl?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: tab === 'branch-pnl',
  });

  const tabs = [
    { key: 'trial-balance' as const, ar: 'ميزان المراجعة', en: 'Trial Balance', icon: Scale },
    { key: 'income-statement' as const, ar: 'قائمة الدخل', en: 'Income Statement', icon: TrendingUp },
    { key: 'balance-sheet' as const, ar: 'الميزانية العمومية', en: 'Balance Sheet', icon: FileText },
    { key: 'cash-flow' as const, ar: 'قائمة التدفقات النقدية', en: 'Cash Flow Statement', icon: DollarSign },
    { key: 'branch-pnl' as const, ar: 'ربحية الفروع', en: 'Branch P&L', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('القوائم المالية', 'Financial Statements')}</h2>
        <p className="text-muted-foreground mt-1">{t('ميزان المراجعة، قائمة الدخل، والميزانية العمومية', 'Trial Balance, Income Statement, and Balance Sheet')}</p>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm flex items-center gap-2", tab === tb.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tb.icon size={16} /> {t(tb.ar, tb.en)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {tab !== 'balance-sheet' ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('من تاريخ', 'From Date')}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={cn(inputCls, "w-44")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('إلى تاريخ', 'To Date')}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={cn(inputCls, "w-44")} />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('كما في تاريخ', 'As of Date')}</label>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className={cn(inputCls, "w-44")} />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Globe size={12} />{t('لغة التقرير', 'Report Language')}</label>
          <select value={exportLang} onChange={e => setExportLang(e.target.value as ReportLang)} className={cn(inputCls, "w-36")}>
            <option value="en">English</option>
            <option value="ar">العربية / Arabic</option>
          </select>
        </div>
        <button
          onClick={() => {
            if (tab === 'trial-balance' && trialBalance) generateTrialBalancePDF(trialBalance, dateFrom, dateTo, exportLang);
            else if (tab === 'income-statement' && incomeStatement) generateIncomeStatementPDF(incomeStatement, dateFrom, dateTo, exportLang);
            else if (tab === 'balance-sheet' && balanceSheet) generateBalanceSheetPDF(balanceSheet, asOfDate, exportLang);
            else if (tab === 'cash-flow' && cashFlow) generateCashFlowPDF(cashFlow, dateFrom, dateTo, exportLang);
            else if (tab === 'branch-pnl' && branchPnl) generateBranchPnlPDF(branchPnl, dateFrom, dateTo, exportLang);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors"
        >
          <Printer size={16} /> {t('تصدير PDF', 'Export PDF')}
        </button>
      </div>

      {tab === 'trial-balance' && (
        tbLoading ? <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="premium-card p-4 flex-1 min-w-[200px]">
                <p className="text-xs text-muted-foreground mb-1">{t('إجمالي مدين', 'Total Debit')}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(trialBalance?.totalDebit)}</p>
              </div>
              <div className="premium-card p-4 flex-1 min-w-[200px]">
                <p className="text-xs text-muted-foreground mb-1">{t('إجمالي دائن', 'Total Credit')}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(trialBalance?.totalCredit)}</p>
              </div>
              <div className={cn("premium-card p-4 flex-1 min-w-[200px]", trialBalance?.isBalanced ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
                <p className="text-xs text-muted-foreground mb-1">{t('الحالة', 'Status')}</p>
                <p className={cn("text-lg font-bold", trialBalance?.isBalanced ? "text-green-400" : "text-red-400")}>
                  {trialBalance?.isBalanced ? t('متوازن ✓', 'Balanced ✓') : t('غير متوازن ✗', 'Unbalanced ✗')}
                </p>
              </div>
            </div>

            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                    <tr>
                      <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('كود الحساب', 'Account Code')}</th>
                      <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('اسم الحساب', 'Account Name')}</th>
                      <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('مدين', 'Debit')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('دائن', 'Credit')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t('الرصيد', 'Balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trialBalance?.accounts?.map((a: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{a.accountCode}</td>
                        <td className="px-4 py-3 font-medium">{isRtl ? (a.accountNameAr || a.accountName) : a.accountName}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-secondary">{a.accountType}</span></td>
                        <td className="px-4 py-3 text-right font-mono">{a.debit > 0 ? formatCurrency(a.debit) : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono">{a.credit > 0 ? formatCurrency(a.credit) : '-'}</td>
                        <td className={cn("px-4 py-3 text-right font-mono font-bold", a.balance > 0 ? "text-blue-400" : a.balance < 0 ? "text-red-400" : "")}>{formatCurrency(Math.abs(a.balance))} {a.balance > 0 ? t('مدين', 'Dr') : a.balance < 0 ? t('دائن', 'Cr') : ''}</td>
                      </tr>
                    ))}
                    {(!trialBalance?.accounts || trialBalance.accounts.length === 0) && (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('لا توجد حركات في هذه الفترة', 'No transactions in this period')}</td></tr>
                    )}
                  </tbody>
                  {trialBalance?.accounts?.length > 0 && (
                    <tfoot className="bg-secondary/50 font-bold border-t-2 border-border">
                      <tr>
                        <td colSpan={3} className="px-4 py-3">{t('الإجمالي', 'Total')}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance?.totalDebit)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance?.totalCredit)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(Math.abs(trialBalance?.totalDebit - trialBalance?.totalCredit))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {tab === 'income-statement' && (
        isLoading ? <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="premium-card p-5 border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-3 mb-2"><ArrowUpRight size={20} className="text-green-400" /><span className="text-sm text-muted-foreground">{t('إجمالي الإيرادات', 'Total Revenue')}</span></div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(incomeStatement?.totalIncome)}</p>
              </div>
              <div className="premium-card p-5 border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3 mb-2"><ArrowDownRight size={20} className="text-red-400" /><span className="text-sm text-muted-foreground">{t('إجمالي المصروفات', 'Total Expenses')}</span></div>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(incomeStatement?.totalExpenses)}</p>
              </div>
              <div className={cn("premium-card p-5", (incomeStatement?.netIncome || 0) >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5")}>
                <div className="flex items-center gap-3 mb-2"><TrendingUp size={20} className={(incomeStatement?.netIncome || 0) >= 0 ? "text-emerald-400" : "text-red-400"} /><span className="text-sm text-muted-foreground">{t('صافي الدخل', 'Net Income')}</span></div>
                <p className={cn("text-2xl font-bold", (incomeStatement?.netIncome || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>{formatCurrency(incomeStatement?.netIncome)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="premium-card p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2"><ArrowUpRight size={18} /> {t('الإيرادات', 'Revenue')}</h3>
                <div className="space-y-3">
                  {incomeStatement?.incomeAccounts?.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm">{isRtl ? (a.accountNameAr || a.accountName) : a.accountName}</span>
                      <span className="font-mono font-bold text-green-400">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                  {(!incomeStatement?.incomeAccounts || incomeStatement.incomeAccounts.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('لا توجد إيرادات', 'No revenue')}</p>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-border font-bold">
                    <span>{t('الإجمالي', 'Total')}</span>
                    <span className="font-mono text-green-400">{formatCurrency(incomeStatement?.totalIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="premium-card p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><ArrowDownRight size={18} /> {t('المصروفات', 'Expenses')}</h3>
                <div className="space-y-3">
                  {incomeStatement?.expenseAccounts?.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm">{isRtl ? (a.accountNameAr || a.accountName) : a.accountName}</span>
                      <span className="font-mono font-bold text-red-400">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                  {(!incomeStatement?.expenseAccounts || incomeStatement.expenseAccounts.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('لا توجد مصروفات', 'No expenses')}</p>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-border font-bold">
                    <span>{t('الإجمالي', 'Total')}</span>
                    <span className="font-mono text-red-400">{formatCurrency(incomeStatement?.totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {tab === 'balance-sheet' && (
        bsLoading ? <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : (
          <div className="space-y-6">
            <div className={cn("premium-card p-4 text-center", balanceSheet?.isBalanced ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
              <span className={cn("font-bold", balanceSheet?.isBalanced ? "text-green-400" : "text-red-400")}>
                {balanceSheet?.isBalanced ? t('الميزانية متوازنة ✓', 'Balance Sheet is Balanced ✓') : t('الميزانية غير متوازنة ✗', 'Balance Sheet is Unbalanced ✗')}
              </span>
              <span className="text-muted-foreground mx-2">|</span>
              <span className="text-sm text-muted-foreground">
                {t('الأصول', 'Assets')}: {formatCurrency(balanceSheet?.totalAssets)} = {t('الالتزامات', 'Liabilities')}: {formatCurrency(balanceSheet?.totalLiabilities)} + {t('حقوق الملكية', 'Equity')}: {formatCurrency(balanceSheet?.totalEquity)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="premium-card p-6">
                  <h3 className="text-lg font-bold text-blue-400 mb-4">{t('الأصول', 'Assets')}</h3>
                  <div className="space-y-3">
                    {balanceSheet?.assets?.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <div>
                          <span className="text-sm">{isRtl ? (a.accountNameAr || a.accountName) : a.accountName}</span>
                          <span className="text-xs text-muted-foreground ml-2 font-mono">{a.accountCode}</span>
                        </div>
                        <span className="font-mono font-bold text-blue-400">{formatCurrency(a.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-blue-500/30 font-bold text-blue-400">
                      <span>{t('إجمالي الأصول', 'Total Assets')}</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalAssets)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="premium-card p-6">
                  <h3 className="text-lg font-bold text-orange-400 mb-4">{t('الالتزامات', 'Liabilities')}</h3>
                  <div className="space-y-3">
                    {balanceSheet?.liabilities?.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <div>
                          <span className="text-sm">{isRtl ? (a.accountNameAr || a.accountName) : a.accountName}</span>
                          <span className="text-xs text-muted-foreground ml-2 font-mono">{a.accountCode}</span>
                        </div>
                        <span className="font-mono font-bold text-orange-400">{formatCurrency(a.balance)}</span>
                      </div>
                    ))}
                    {(!balanceSheet?.liabilities || balanceSheet.liabilities.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-2">{t('لا توجد التزامات', 'No liabilities')}</p>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-orange-500/30 font-bold text-orange-400">
                      <span>{t('إجمالي الالتزامات', 'Total Liabilities')}</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalLiabilities)}</span>
                    </div>
                  </div>
                </div>

                <div className="premium-card p-6">
                  <h3 className="text-lg font-bold text-purple-400 mb-4">{t('حقوق الملكية', 'Equity')}</h3>
                  <div className="space-y-3">
                    {balanceSheet?.equity?.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <div>
                          <span className="text-sm">{isRtl ? (a.accountNameAr || a.accountName) : a.accountName}</span>
                          <span className="text-xs text-muted-foreground ml-2 font-mono">{a.accountCode}</span>
                        </div>
                        <span className="font-mono font-bold text-purple-400">{formatCurrency(a.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-purple-500/30 font-bold text-purple-400">
                      <span>{t('إجمالي حقوق الملكية', 'Total Equity')}</span>
                      <span className="font-mono">{formatCurrency(balanceSheet?.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {tab === 'cash-flow' && (
        cfLoading ? <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : cashFlow ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="premium-card p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4">{t('أنشطة تشغيلية', 'Operating Activities')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>{t('إيرادات الفوائد', 'Interest Income')}</span><span className="font-mono">{formatCurrency(cashFlow.operating?.interestIncome)}</span></div>
                  <div className="flex justify-between"><span>{t('إيرادات الرسوم', 'Fee Income')}</span><span className="font-mono">{formatCurrency(cashFlow.operating?.feeIncome)}</span></div>
                  <div className="flex justify-between"><span>{t('إيرادات الغرامات', 'Penalty Income')}</span><span className="font-mono">{formatCurrency(cashFlow.operating?.penaltyIncome)}</span></div>
                  <div className="flex justify-between"><span>{t('مصروفات تشغيلية', 'Operating Expenses')}</span><span className="font-mono text-red-400">{formatCurrency(cashFlow.operating?.operatingExpenses)}</span></div>
                  <div className="flex justify-between"><span>{t('رواتب', 'Payroll')}</span><span className="font-mono text-red-400">{formatCurrency(cashFlow.operating?.payroll)}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-green-400"><span>{t('صافي التشغيل', 'Net Operating')}</span><span className="font-mono">{formatCurrency(cashFlow.operating?.netOperating)}</span></div>
                </div>
              </div>
              <div className="premium-card p-6">
                <h3 className="text-lg font-bold text-blue-400 mb-4">{t('أنشطة استثمارية', 'Investing Activities')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>{t('صرف قروض', 'Loan Disbursements')}</span><span className="font-mono text-red-400">{formatCurrency(cashFlow.investing?.loanDisbursements)}</span></div>
                  <div className="flex justify-between"><span>{t('تحصيل قروض', 'Loan Collections')}</span><span className="font-mono">{formatCurrency(cashFlow.investing?.loanCollections)}</span></div>
                  <div className="flex justify-between"><span>{t('شراء أصول', 'Asset Purchases')}</span><span className="font-mono text-red-400">{formatCurrency(cashFlow.investing?.assetPurchases)}</span></div>
                  <div className="flex justify-between"><span>{t('بيع أصول', 'Asset Disposals')}</span><span className="font-mono">{formatCurrency(cashFlow.investing?.assetDisposals)}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-blue-400"><span>{t('صافي الاستثمار', 'Net Investing')}</span><span className="font-mono">{formatCurrency(cashFlow.investing?.netInvesting)}</span></div>
                </div>
              </div>
              <div className="premium-card p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">{t('أنشطة تمويلية', 'Financing Activities')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>{t('سحب تسهيلات', 'Facility Drawdowns')}</span><span className="font-mono">{formatCurrency(cashFlow.financing?.facilityDrawdowns)}</span></div>
                  <div className="flex justify-between"><span>{t('سداد تسهيلات', 'Facility Repayments')}</span><span className="font-mono text-red-400">{formatCurrency(cashFlow.financing?.facilityRepayments)}</span></div>
                  <div className="flex justify-between"><span>{t('ضخ رأس مال', 'Equity Injection')}</span><span className="font-mono">{formatCurrency(cashFlow.financing?.equityInjection)}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-purple-400"><span>{t('صافي التمويل', 'Net Financing')}</span><span className="font-mono">{formatCurrency(cashFlow.financing?.netFinancing)}</span></div>
                </div>
              </div>
            </div>
            <div className="premium-card p-6">
              <div className={cn("flex justify-between items-center text-xl font-bold", cashFlow.netCashChange >= 0 ? 'text-green-400' : 'text-red-400')}>
                <span>{t('صافي التغير في النقدية', 'Net Change in Cash')}</span>
                <span className="font-mono">{formatCurrency(cashFlow.netCashChange)}</span>
              </div>
            </div>
          </div>
        ) : null
      )}

      {tab === 'branch-pnl' && (
        bpLoading ? <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : branchPnl?.branchPnl ? (
          <div className="premium-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('الفرع', 'Branch')}</th><th className="p-3 text-end">{t('الإيرادات', 'Income')}</th><th className="p-3 text-end">{t('المصروفات', 'Expenses')}</th><th className="p-3 text-end">{t('صافي الربح', 'Net Income')}</th></tr></thead>
              <tbody>{Object.entries(branchPnl.branchPnl).map(([key, val]: [string, any]) => (
                <tr key={key} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{key}</td>
                  <td className="p-3 text-end font-mono text-green-500">{formatCurrency(val.income)}</td>
                  <td className="p-3 text-end font-mono text-red-500">{formatCurrency(val.expenses)}</td>
                  <td className={cn("p-3 text-end font-mono font-bold", val.netIncome >= 0 ? 'text-green-400' : 'text-red-400')}>{formatCurrency(val.netIncome)}</td>
                </tr>
              ))}</tbody>
            </table>
            {Object.keys(branchPnl.branchPnl).length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا توجد بيانات', 'No data found')}</div>}
          </div>
        ) : null
      )}
    </div>
  );
}

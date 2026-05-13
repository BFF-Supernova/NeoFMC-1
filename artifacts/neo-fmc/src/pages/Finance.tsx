import { useState, useEffect, useMemo, useRef } from 'react';
import { useListGlAccounts, useListJournalEntries, getListGlAccountsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Landmark, ArrowDownUp, Receipt, Loader2, Plus, Database, ArrowRight, ChevronRight, ExternalLink, X, Filter } from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function Finance() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'gl' | 'journal'>('gl');
  const [seeding, setSeeding] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const filterAccount = params.get('account') || '';
  const filterType = params.get('type') || '';
  const [activeFilter, setActiveFilter] = useState(filterAccount || filterType);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (filterAccount || filterType) setActiveFilter(filterAccount || filterType);
  }, [filterAccount, filterType]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  
  const { data: accounts, isLoading: glLoading } = useListGlAccounts();
  const { data: journals, isLoading: jeLoading } = useListJournalEntries({ request: { query: { limit: 50 } } as any });

  const handleSeedAccounts = async () => {
    setSeeding(true);
    try {
      const result = await api.post<{ message: string; seeded: number }>('/gl-accounts/seed');
      if (result.seeded > 0) {
        toast({ title: t('تم بنجاح', 'Success'), description: t(`تم إنشاء ${result.seeded} حساب`, `${result.seeded} accounts created`) });
      } else {
        toast({ title: t('معلومة', 'Info'), description: t('الحسابات موجودة بالفعل', 'Accounts already exist') });
      }
      queryClient.invalidateQueries({ queryKey: getListGlAccountsQueryKey() });
    } catch (err) { handleApiError(err); }
    setSeeding(false);
  };

  const showEmpty = !glLoading && (!accounts || accounts.length === 0);

  const typeColors: Record<string, string> = {
    Asset: 'bg-blue-500/10 text-blue-400',
    Liability: 'bg-red-500/10 text-red-400',
    Income: 'bg-green-500/10 text-green-400',
    Expense: 'bg-orange-500/10 text-orange-400',
  };

  const accountsByType = accounts?.reduce((acc: Record<string, any[]>, a) => {
    const type = a.accountType || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(a);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const typeSummary = Object.entries(accountsByType).map(([type, accs]) => ({
    type,
    count: accs.length,
    total: accs.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('المالية والحسابات', 'Finance & GL')}</h2>
          <p className="text-muted-foreground mt-1">{t('الدليل المحاسبي وقيود اليومية', 'Chart of accounts and journal entries')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/financial-statements')} className="text-xs text-primary hover:underline flex items-center gap-1">
            {t('القوائم المالية', 'Financial Statements')} <ExternalLink size={12} />
          </button>
          {showEmpty && (
            <button 
              onClick={handleSeedAccounts} 
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-medium disabled:opacity-50"
            >
              {seeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
              {t('تحميل الدليل المحاسبي', 'Load Default Chart of Accounts')}
            </button>
          )}
        </div>
      </div>

      {!glLoading && accounts && accounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {typeSummary.map((ts) => (
            <div
              key={ts.type}
              onClick={() => setTab('gl')}
              className="premium-card p-4 cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", typeColors[ts.type] || 'bg-purple-500/10 text-purple-400')}>{ts.type}</span>
                <span className="text-xs text-muted-foreground">{ts.count} {t('حساب', 'accounts')}</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(ts.total)}</p>
            </div>
          ))}
        </div>
      )}

      {activeFilter && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm">
          <Filter size={14} className="text-primary" />
          <span className="text-muted-foreground">{t('تصفية حسب:', 'Filtered by:')}</span>
          <span className="font-bold text-primary">{activeFilter}</span>
          <button
            onClick={() => { setActiveFilter(''); setLocation('/finance'); }}
            className="ml-auto p-1 rounded hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button 
          className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'gl' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          onClick={() => setTab('gl')}
        >
          {t('دليل الحسابات', 'Chart of Accounts')}
        </button>
        <button 
          className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'journal' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          onClick={() => setTab('journal')}
        >
          {t('قيود اليومية', 'Journal Entries')}
        </button>
      </div>

      {tab === 'gl' && (
        <div className="premium-card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('رقم الحساب', 'Account Code')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم', 'Account Name')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الرصيد', 'Balance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-sm">
                {glLoading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : accounts?.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Landmark className="mx-auto mb-3 opacity-20" size={32}/>
                    <p className="mb-2">{t('لا توجد حسابات', 'No accounts found')}</p>
                    <p className="text-xs">{t('اضغط على "تحميل الدليل المحاسبي" لإضافة الحسابات الأساسية', 'Click "Load Default Chart of Accounts" above to add standard accounts')}</p>
                  </td></tr>
                ) : (
                  accounts
                    ?.filter((acc) => {
                      if (!activeFilter) return true;
                      if (filterAccount && acc.accountCode === filterAccount) return true;
                      if (filterType && acc.accountType === filterType) return true;
                      if (!filterAccount && !filterType) return true;
                      return !activeFilter;
                    })
                    .map((acc) => {
                      const isHighlighted = filterAccount && acc.accountCode === filterAccount;
                      return (
                        <tr
                          key={acc.id}
                          ref={isHighlighted ? highlightRef : undefined}
                          className={cn(
                            "hover:bg-muted/30 transition-colors cursor-pointer group",
                            isHighlighted && "bg-primary/10 border-l-2 border-l-primary"
                          )}
                          onClick={() => setTab('journal')}
                        >
                          <td className="px-6 py-4 text-muted-foreground">{acc.accountCode}</td>
                          <td className="px-6 py-4 font-sans font-medium text-foreground">{isRtl ? acc.accountNameAr || acc.accountName : acc.accountName}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-1 rounded text-xs", typeColors[acc.accountType || ''] || 'bg-purple-500/10 text-purple-400')}>
                              {acc.accountType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">{formatCurrency(acc.balance)}</span>
                              <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'journal' && (
        <div className="premium-card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('البيان', 'Description')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المرجع', 'Ref')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('مدين', 'Debit')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('دائن', 'Credit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jeLoading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : journals?.data.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Receipt className="mx-auto mb-3 opacity-20" size={32}/>{t('لا توجد قيود', 'No entries found')}</td></tr>
                ) : (
                  journals?.data.map((je) => (
                    <tr key={je.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{formatDate(je.transactionDate)}</td>
                      <td className="px-6 py-4 font-medium max-w-xs truncate" title={je.description}>{je.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-secondary rounded text-xs text-secondary-foreground">{je.referenceType}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-red-400/90">{formatCurrency(je.totalDebit)}</td>
                      <td className="px-6 py-4 font-mono font-bold text-green-400/90">{formatCurrency(je.totalCredit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

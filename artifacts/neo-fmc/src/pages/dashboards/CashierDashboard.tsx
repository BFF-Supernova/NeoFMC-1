import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, StatusPill } from './shared';
import {
  Wallet, Receipt, CheckCircle, Clock, TrendingUp, DollarSign,
  ChevronRight, CreditCard,
} from 'lucide-react';

export default function CashierDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });

  if (isLoading) return <LoadingDash />;
  const d = roleDash || {};

  const closingStatus = d.dailyClosingStatus ?? 'Not Started';
  const closingColor = closingStatus === 'Closed' ? 'text-emerald-400' : closingStatus === 'In Progress' ? 'text-yellow-400' : 'text-orange-400';
  const closingBg = closingStatus === 'Closed' ? 'bg-emerald-500/10' : closingStatus === 'In Progress' ? 'bg-yellow-500/10' : 'bg-orange-500/10';

  const kpis = [
    { title: t('إيصالات اليوم', 'Today\'s Receipts'), value: formatCurrency(d.todayReceipts), icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/collection' },
    { title: t('معاملات اليوم', 'Today\'s Transactions'), value: d.todayReceiptCount ?? 0, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10', link: '/collection' },
    { title: t('إيصالات الشهر', 'Month Receipts'), value: formatCurrency(d.monthReceipts), icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/collection' },
    { title: t('معاملات الشهر', 'Month Transactions'), value: d.monthReceiptCount ?? 0, icon: CreditCard, color: 'text-sky-400', bg: 'bg-sky-500/10', link: '/collection' },
    { title: t('حالة الإقفال اليومي', 'Daily Closing Status'), value: closingStatus, icon: closingStatus === 'Closed' ? CheckCircle : Clock, color: closingColor, bg: closingBg, link: '/daily-closing' },
  ];

  const recentPayments: any[] = d.recentPayments || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign size={22} className="text-primary" />
          {t('لوحة الصراف', 'Cashier Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('ملخص النقدية اليومي وسجل المدفوعات', 'Daily cash summary and payment log')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2">
          <SectionHeader title={t('آخر المدفوعات', 'Recent Payments')} linkLabel={t('عرض الكل', 'View All')} onLink={() => setLocation('/collection')} />
          {recentPayments.length === 0
            ? <EmptyState icon={Receipt} label={t('لا توجد مدفوعات اليوم', 'No payments today')} />
            : (
              <div className="space-y-3">
                {recentPayments.map((p: any, i: number) => (
                  <div key={i} onClick={() => setLocation('/collection')} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-colors cursor-pointer group">
                    <div>
                      <p className="font-semibold text-sm">{p.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.method} · {new Date(p.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-emerald-400">{formatCurrency(p.amount)}</span>
                      <StatusPill status={p.status} />
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardShell>

        <CardShell>
          <SectionHeader title={t('ملخص النقدية', 'Cash Summary')} icon={Wallet} />
          <div className="space-y-4">
            <div onClick={() => setLocation('/collection')} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors">
              <p className="text-xs text-emerald-400 font-medium mb-1">{t('إجمالي اليوم', 'Today\'s Total')}</p>
              <p className="text-2xl font-display font-bold text-emerald-400">{formatCurrency(d.todayReceipts)}</p>
              <p className="text-xs text-muted-foreground mt-1">{d.todayReceiptCount ?? 0} {t('معاملات', 'transactions')}</p>
            </div>
            <div onClick={() => setLocation('/collection')} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/15 transition-colors">
              <p className="text-xs text-blue-400 font-medium mb-1">{t('إجمالي الشهر', 'Month Total')}</p>
              <p className="text-2xl font-display font-bold text-blue-400">{formatCurrency(d.monthReceipts)}</p>
              <p className="text-xs text-muted-foreground mt-1">{d.monthReceiptCount ?? 0} {t('معاملات', 'transactions')}</p>
            </div>
            <button onClick={() => setLocation('/daily-closing')} className="w-full p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-secondary/50 transition-all text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-primary" />
              {t('الإقفال اليومي', 'Daily Closing')}
            </button>
          </div>
        </CardShell>
      </div>
    </div>
  );
}

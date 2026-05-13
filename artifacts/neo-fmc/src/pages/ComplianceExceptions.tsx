import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Loader2, AlertTriangle, Users, Clock, FileText, Activity, Copy } from 'lucide-react';

export default function ComplianceExceptions() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/compliance/exceptions'],
    queryFn: () => api.get<any>('/compliance/exceptions'),
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const sections = [
    {
      title: t('قروض تتجاوز الحدود', 'Loans Exceeding Product Limits'),
      icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
      data: data?.loansExceedingLimits || [],
      render: (item: any) => (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{item.client_name}</span>
            <span className="text-xs text-muted-foreground mx-2">|</span>
            <span className="text-xs">{item.product_name}</span>
          </div>
          <div className="text-end">
            <span className="font-mono text-red-400 font-bold">{formatCurrency(Number(item.amount))}</span>
            <span className="text-xs text-muted-foreground mx-1">/</span>
            <span className="font-mono text-muted-foreground">{formatCurrency(Number(item.max_allowed))}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('متأخرات بدون متابعة', 'Overdue Without Follow-Up'),
      icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
      data: data?.overdueWithoutFollowUp || [],
      render: (item: any) => (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{item.client_name || t('عميل', 'Client')}</span>
            <span className="text-xs text-muted-foreground mx-2">|</span>
            <span className="text-xs font-mono">{item.due_date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400">{formatCurrency(Number(item.amount))}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{Math.round(Number(item.days_overdue))} {t('يوم', 'days')}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('قروض خاملة', 'Dormant Active Loans'),
      icon: Activity, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20',
      data: data?.dormantActiveLoans || [],
      render: (item: any) => (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{item.client_name || t('عميل', 'Client')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatCurrency(Number(item.balance))}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{Math.round(Number(item.days_inactive))} {t('يوم خامل', 'days idle')}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('عملاء مكررون', 'Duplicate Clients'),
      icon: Copy, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
      data: data?.duplicateClients || [],
      render: (item: any) => (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-xs">{t('رقم قومي', 'NID')}: {item.national_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{(item.names || []).join(', ')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{item.count} {t('سجل', 'records')}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('تركز محفظة عالي', 'High Concentration Clients'),
      icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
      data: data?.highConcentrationClients || [],
      render: (item: any) => (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{item.full_name_ar}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono">{formatCurrency(Number(item.total_exposure))}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{item.loan_count} {t('قرض', 'loans')}</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert size={24} className="text-primary" />
          {t('تقارير الاستثناءات والمطابقة', 'Compliance Exception Reports')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('مراقبة الاستثناءات والمخالفات التلقائية', 'Automated exception monitoring and compliance flags')}
        </p>
      </div>

      {data?.stalePendingApprovals > 0 && (
        <div className="premium-card p-4 border-yellow-500/20 bg-yellow-500/5 flex items-center gap-3">
          <AlertTriangle className="text-yellow-400" size={20} />
          <span className="text-sm">
            <strong className="text-yellow-400">{data.stalePendingApprovals}</strong> {t('طلبات موافقة معلقة لأكثر من 7 أيام', 'pending approvals older than 7 days')}
          </span>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.title} className={cn("premium-card overflow-hidden", section.border)}>
          <div className={cn("px-4 py-3 flex items-center gap-2 border-b border-border", section.bg)}>
            <section.icon size={18} className={section.color} />
            <span className="font-bold text-sm">{section.title}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-mono", section.bg, section.color)}>{section.data.length}</span>
          </div>
          <div className="divide-y divide-border/50">
            {section.data.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('لا توجد استثناءات', 'No exceptions found')}</div>
            ) : (
              section.data.map((item: any, idx: number) => (
                <div key={idx} className="px-4 py-3 text-sm hover:bg-muted/20">{section.render(item)}</div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

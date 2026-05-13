import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { KpiCard, CardShell, SectionHeader, LoadingDash, EmptyState, StatusPill } from './shared';
import {
  Users, FileText, Plus, UserPlus, ChevronRight, ClipboardList, Calendar,
} from 'lucide-react';

export default function DataEntryDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: roleDash, isLoading } = useQuery({
    queryKey: ['/api/dashboard/role-dashboard'],
    queryFn: () => api.get<any>('/dashboard/role-dashboard'),
  });

  if (isLoading) return <LoadingDash />;
  const d = roleDash || {};

  const kpis = [
    { title: t('عملاء أضفتهم اليوم', 'Clients Added Today'), value: d.clientsAddedToday ?? 0, icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/clients' },
    { title: t('عملاء هذا الشهر', 'Clients This Month'), value: d.clientsAddedMonth ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/clients' },
    { title: t('طلباتي المعلقة', 'My Pending Requests'), value: d.myPendingRequests ?? 0, icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10', link: '/loan-requests' },
    { title: t('طلبات أنشأتها هذا الشهر', 'Requests Created This Month'), value: d.requestsCreatedMonth ?? 0, icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/loan-requests' },
  ];

  const recentClients: any[] = d.recentClients || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList size={22} className="text-primary" />
          {t('لوحة مدخل البيانات', 'Data Entry Dashboard')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('متابعة البيانات المدخلة والطلبات المنشأة', 'Track your data entries and created requests')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} icon={k.icon} label={k.title} value={k.value} color={k.color} bg={k.bg} onClick={() => setLocation(k.link)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2">
          <SectionHeader title={t('آخر العملاء المضافين', 'Recently Added Clients')} linkLabel={t('عرض الكل', 'View All')} onLink={() => setLocation('/clients')} />
          {recentClients.length === 0
            ? <EmptyState icon={Users} label={t('لم تضف عملاء بعد', 'No clients added yet')} />
            : (
              <div className="space-y-3">
                {recentClients.map((c: any) => (
                  <div key={c.id} onClick={() => setLocation('/clients')} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-colors cursor-pointer group">
                    <div>
                      <p className="font-semibold text-sm">{c.nameAr || c.nameEn}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.code} · {c.nationalId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString()}</span>
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardShell>

        <CardShell>
          <SectionHeader title={t('إجراءات سريعة', 'Quick Actions')} />
          <div className="space-y-3">
            {[
              { label: t('إضافة عميل جديد', 'Add New Client'), icon: UserPlus, link: '/clients' },
              { label: t('طلب تمويل جديد', 'New Loan Request'), icon: FileText, link: '/loan-requests' },
              { label: t('عرض جميع العملاء', 'View All Clients'), icon: Users, link: '/clients' },
              { label: t('طلباتي', 'My Requests'), icon: ClipboardList, link: '/loan-requests' },
            ].map((action, i) => (
              <button key={i} onClick={() => setLocation(action.link)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary/70 transition-all text-sm font-medium group">
                <action.icon size={18} className="text-primary shrink-0 group-hover:scale-110 transition-transform" />
                {action.label}
                <ChevronRight size={14} className="text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Search, LayoutDashboard, Users, Calculator, FileText, Briefcase,
  Wallet, Receipt, Landmark, FileBarChart, Settings, Building2,
  ShieldCheck, ShieldAlert, ArrowRightLeft, CreditCard, GitBranch,
  Shield, FileCheck, ArrowLeftRight, Banknote, Upload, Bell, Truck,
  Phone, TrendingUp, Lock, ClipboardList, Command, CornerDownLeft,
  ArrowUp, ArrowDown, X,
} from 'lucide-react';

const SearchOpenContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });
export function useSearchOpen() { return useContext(SearchOpenContext); }
export function SearchOpenProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SearchOpenContext.Provider value={{ open, setOpen }}>{children}</SearchOpenContext.Provider>;
}

interface SearchItem {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  path: string;
  icon: React.ElementType;
  section?: string;
  sectionAr?: string;
  sectionEn?: string;
  keywords: string[];
  tab?: string;
  roles?: string[];
}

const searchIndex: SearchItem[] = [
  { id: 'dashboard', titleAr: 'لوحة التحكم', titleEn: 'Dashboard', descAr: 'نظرة عامة على الأداء والمؤشرات', descEn: 'Overview of performance and KPIs', path: '/dashboard', icon: LayoutDashboard, sectionAr: 'الرئيسية', sectionEn: 'Main', keywords: ['home', 'kpi', 'overview', 'main', 'رئيسية', 'مؤشرات'] },
  { id: 'clients', titleAr: 'العملاء', titleEn: 'Clients', descAr: 'إدارة بيانات العملاء', descEn: 'Manage client records', path: '/clients', icon: Users, sectionAr: 'الرئيسية', sectionEn: 'Main', keywords: ['customer', 'عميل', 'بيانات', 'client list', 'add client'] },
  { id: 'calculator', titleAr: 'حاسبة التمويل', titleEn: 'Loan Calculator', descAr: 'حساب الأقساط والفوائد', descEn: 'Calculate installments and interest', path: '/calculator', icon: Calculator, sectionAr: 'الرئيسية', sectionEn: 'Main', keywords: ['calculate', 'emi', 'installment', 'interest', 'حساب', 'قسط', 'فائدة'] },
  { id: 'loan-requests', titleAr: 'طلبات التمويل', titleEn: 'Loan Requests', descAr: 'إدارة طلبات التمويل الجديدة', descEn: 'Manage new loan applications', path: '/loan-requests', icon: FileText, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['application', 'new loan', 'request', 'طلب', 'تمويل جديد', 'draft', 'approved', 'disbursed'] },
  { id: 'loans', titleAr: 'المحفظة', titleEn: 'Portfolio', descAr: 'عرض وإدارة القروض النشطة', descEn: 'View and manage active loans', path: '/loans', icon: Briefcase, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['portfolio', 'active', 'loan', 'محفظة', 'قروض', 'settlement', 'reschedule', 'write-off'] },
  { id: 'loans-payment', titleAr: 'تسجيل سداد', titleEn: 'Record Payment', descAr: 'تسجيل دفعة على قرض من صفحة المحفظة', descEn: 'Record a payment on a loan from portfolio', path: '/loans', icon: Briefcase, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['payment', 'pay', 'receipt', 'سداد', 'دفع', 'إيصال', 'record payment'] },
  { id: 'loans-statement', titleAr: 'كشف حساب عميل', titleEn: 'Client Statement', descAr: 'عرض كشف حساب العميل وطباعته', descEn: 'View and print client account statement', path: '/loans', icon: Briefcase, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['statement', 'account', 'كشف حساب', 'طباعة', 'print'] },
  { id: 'credit-limits', titleAr: 'حدود الائتمان', titleEn: 'Credit Limits', descAr: 'إدارة حدود ائتمان العملاء', descEn: 'Manage client credit limits', path: '/credit-limits', icon: TrendingUp, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['credit', 'limit', 'revolving', 'ائتمان', 'حد'] },
  { id: 'guarantees', titleAr: 'الضمانات', titleEn: 'Guarantees', descAr: 'إدارة الضمانات والكفلاء', descEn: 'Manage guarantees and guarantors', path: '/guarantees', icon: Shield, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['guarantee', 'guarantor', 'ضامن', 'ضمان', 'كفيل'] },
  { id: 'bulk-operations', titleAr: 'عمليات مجمعة', titleEn: 'Bulk Operations', descAr: 'رفع بيانات CSV مجمعة', descEn: 'Upload bulk CSV data', path: '/bulk-operations', icon: Upload, sectionAr: 'الإقراض', sectionEn: 'Lending', keywords: ['bulk', 'csv', 'upload', 'import', 'مجمعة', 'رفع', 'استيراد'], roles: ['TenantAdmin', 'BranchManager'] },
  { id: 'finance', titleAr: 'الدليل المحاسبي', titleEn: 'Finance / GL', descAr: 'شجرة الحسابات وقيود اليومية', descEn: 'Chart of accounts and journal entries', path: '/finance', icon: Landmark, sectionAr: 'المالية', sectionEn: 'Finance', keywords: ['gl', 'accounting', 'journal', 'chart of accounts', 'محاسبة', 'قيود', 'دليل'] },
  { id: 'expenses', titleAr: 'المصروفات', titleEn: 'Expenses', descAr: 'إدارة المصروفات والموافقات', descEn: 'Manage expenses and approvals', path: '/expenses', icon: Receipt, sectionAr: 'المالية', sectionEn: 'Finance', keywords: ['expense', 'spending', 'مصروف', 'إنفاق'] },
  { id: 'epayments', titleAr: 'المدفوعات الإلكترونية', titleEn: 'E-Payments', descAr: 'بوابات الدفع الإلكتروني', descEn: 'Electronic payment gateways', path: '/epayments', icon: CreditCard, sectionAr: 'المالية', sectionEn: 'Finance', keywords: ['fawry', 'paymob', 'gateway', 'electronic', 'إلكتروني', 'فوري'] },
  { id: 'cheques', titleAr: 'الشيكات', titleEn: 'Cheques', descAr: 'إدارة الشيكات المؤجلة وشيكات الضمان', descEn: 'Manage post-dated and guarantee cheques', path: '/cheques', icon: FileCheck, sectionAr: 'التسويات', sectionEn: 'Settlements', keywords: ['cheque', 'check', 'pdc', 'شيك', 'مؤجل'] },
  { id: 'wire-transfers', titleAr: 'التحويلات البنكية', titleEn: 'Wire Transfers', descAr: 'إدارة التحويلات البنكية', descEn: 'Manage wire transfers', path: '/wire-transfers', icon: ArrowLeftRight, sectionAr: 'التسويات', sectionEn: 'Settlements', keywords: ['wire', 'transfer', 'bank', 'تحويل', 'بنك'] },
  { id: 'cash-settlements', titleAr: 'التسويات النقدية', titleEn: 'Cash Settlements', descAr: 'إدارة التسويات النقدية وصناديق النقد', descEn: 'Manage cash settlements and cash boxes', path: '/cash-settlements', icon: Banknote, sectionAr: 'التسويات', sectionEn: 'Settlements', keywords: ['cash', 'settlement', 'cashbox', 'نقدي', 'صندوق', 'تسوية'] },
  { id: 'cash-settlements-cashboxes', titleAr: 'صناديق النقد', titleEn: 'Cash Boxes', descAr: 'إدارة صناديق النقد بالفروع', descEn: 'Manage branch cash boxes', path: '/cash-settlements', icon: Banknote, sectionAr: 'التسويات', sectionEn: 'Settlements', keywords: ['cashbox', 'صندوق', 'box'], tab: 'cashboxes' },
  { id: 'collection', titleAr: 'التحصيل', titleEn: 'Collection', descAr: 'متابعة الأقساط المستحقة', descEn: 'Track due installments', path: '/collection', icon: Wallet, sectionAr: 'التحصيل', sectionEn: 'Collection', keywords: ['collect', 'due', 'تحصيل', 'مستحق', 'أقساط'] },
  { id: 'collection-overdue', titleAr: 'الأقساط المتأخرة', titleEn: 'Overdue Installments', descAr: 'عرض الأقساط المتأخرة والغرامات', descEn: 'View overdue installments and penalties', path: '/collection', icon: Wallet, sectionAr: 'التحصيل', sectionEn: 'Collection', keywords: ['overdue', 'late', 'penalty', 'متأخر', 'غرامة', 'تأخير'], tab: 'overdue' },
  { id: 'collection-mytasks', titleAr: 'مهامي اليوم', titleEn: 'My Tasks Today', descAr: 'قائمة مهام التحصيل اليومية للمسؤول', descEn: 'Officer daily collection task list', path: '/collection', icon: Wallet, sectionAr: 'التحصيل', sectionEn: 'Collection', keywords: ['my tasks', 'today', 'officer', 'مهامي', 'يومي', 'مسؤول'], tab: 'my-tasks' },
  { id: 'collection-activities', titleAr: 'أنشطة التحصيل', titleEn: 'Collection Activities', descAr: 'سجل أنشطة التحصيل والمتابعة', descEn: 'Collection follow-up activity log', path: '/collection-activities', icon: Phone, sectionAr: 'التحصيل', sectionEn: 'Collection', keywords: ['activity', 'follow-up', 'call', 'نشاط', 'متابعة', 'اتصال'] },
  { id: 'offloading', titleAr: 'تفريغ المحفظة', titleEn: 'Portfolio Offloading', descAr: 'تفريغ وتوزيع المحفظة', descEn: 'Portfolio offloading and distribution', path: '/offloading', icon: Truck, sectionAr: 'التحصيل', sectionEn: 'Collection', keywords: ['offload', 'distribute', 'تفريغ', 'توزيع'], roles: ['TenantAdmin', 'BranchManager'] },
  { id: 'client-groups', titleAr: 'المجموعات', titleEn: 'Client Groups', descAr: 'إدارة مجموعات الإقراض التضامني', descEn: 'Manage solidarity lending groups', path: '/client-groups', icon: Users, sectionAr: 'التحصيل', sectionEn: 'Collection', keywords: ['group', 'solidarity', 'مجموعة', 'تضامني', 'أعضاء', 'member'] },
  { id: 'approvals', titleAr: 'الموافقات', titleEn: 'Approvals', descAr: 'مراجعة طلبات الموافقة', descEn: 'Review approval requests', path: '/approvals', icon: ShieldCheck, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['approve', 'reject', 'pending', 'maker', 'checker', 'موافقة', 'رفض', 'معلق'] },
  { id: 'daily-closing', titleAr: 'الإقفال اليومي', titleEn: 'Daily Closing', descAr: 'إقفال يومي للفرع ومطابقة النقدية', descEn: 'Branch daily closing and cash reconciliation', path: '/daily-closing', icon: Lock, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['close', 'closing', 'reconciliation', 'cash', 'إقفال', 'مطابقة', 'يومي'], roles: ['TenantAdmin', 'BranchManager'] },
  { id: 'audit-trail', titleAr: 'سجل التدقيق', titleEn: 'Audit Trail', descAr: 'سجل جميع العمليات والتغييرات', descEn: 'Log of all operations and changes', path: '/audit-trail', icon: ClipboardList, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['audit', 'log', 'history', 'تدقيق', 'سجل', 'تاريخ'], roles: ['TenantAdmin', 'BranchManager', 'Auditor'] },
  { id: 'blacklists', titleAr: 'القوائم السوداء', titleEn: 'Blacklists', descAr: 'إدارة قوائم الحظر والإرهاب', descEn: 'Manage blacklists and terrorism lists', path: '/blacklists', icon: ShieldAlert, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['blacklist', 'ban', 'terrorism', 'حظر', 'إرهاب', 'سوداء'] },
  { id: 'portfolio-transfer', titleAr: 'تحويل المحفظة', titleEn: 'Portfolio Transfer', descAr: 'نقل القروض بين المسؤولين والفروع', descEn: 'Transfer loans between officers and branches', path: '/portfolio-transfer', icon: ArrowRightLeft, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['transfer', 'reassign', 'تحويل', 'نقل'], roles: ['TenantAdmin', 'BranchManager'] },
  { id: 'branch-requests', titleAr: 'طلبات الفروع', titleEn: 'Branch Requests', descAr: 'إدارة طلبات الفروع', descEn: 'Manage branch requests', path: '/branch-requests', icon: Shield, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['branch', 'request', 'فرع', 'طلب'] },
  { id: 'workflows', titleAr: 'سير العمل', titleEn: 'Workflows', descAr: 'إنشاء وإدارة سير العمل المخصص', descEn: 'Create and manage custom workflows', path: '/workflows', icon: GitBranch, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['workflow', 'process', 'سير عمل', 'إجراء'], roles: ['TenantAdmin', 'BranchManager'] },
  { id: 'notifications', titleAr: 'الإشعارات', titleEn: 'Notifications', descAr: 'مركز الإشعارات والقوالب', descEn: 'Notification center and templates', path: '/notifications', icon: Bell, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['notification', 'sms', 'alert', 'reminder', 'إشعار', 'تنبيه', 'رسالة'] },
  { id: 'notifications-templates', titleAr: 'قوالب الإشعارات', titleEn: 'Notification Templates', descAr: 'إدارة قوالب الرسائل والإشعارات', descEn: 'Manage notification message templates', path: '/notifications', icon: Bell, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['template', 'قالب', 'نموذج'], tab: 'templates' },
  { id: 'sales-agents', titleAr: 'وكلاء المبيعات', titleEn: 'Sales Agents', descAr: 'إدارة وكلاء المبيعات', descEn: 'Manage sales agents', path: '/sales-agents', icon: Users, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['agent', 'sales', 'وكيل', 'مبيعات'] },
  { id: 'reports', titleAr: 'التقارير', titleEn: 'Reports', descAr: 'تقارير المحفظة والتحصيل والتصدير', descEn: 'Portfolio, collection reports and exports', path: '/reports', icon: FileBarChart, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['report', 'export', 'excel', 'pdf', 'تقرير', 'تصدير', 'par', 'aging'] },
  { id: 'reports-fra', titleAr: 'تقرير الرقابة المالية', titleEn: 'FRA Regulatory Report', descAr: 'تقرير هيئة الرقابة المالية التفصيلي', descEn: 'Financial Regulatory Authority detailed report', path: '/reports', icon: FileBarChart, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['fra', 'regulatory', 'رقابة', 'هيئة', 'تنظيمي'], tab: 'fra' },
  { id: 'reports-export', titleAr: 'تصدير Excel', titleEn: 'Export to Excel', descAr: 'تصدير التقارير بصيغة Excel', descEn: 'Export reports as Excel files', path: '/reports', icon: FileBarChart, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['export', 'excel', 'xlsx', 'download', 'تصدير', 'تحميل'] },
  { id: 'settings', titleAr: 'الإعدادات', titleEn: 'Settings', descAr: 'إعدادات النظام والشركة', descEn: 'System and company settings', path: '/settings', icon: Settings, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['settings', 'config', 'إعدادات', 'تكوين'] },
  { id: 'settings-company', titleAr: 'بيانات الشركة', titleEn: 'Company Info', descAr: 'تعديل بيانات الشركة والترخيص', descEn: 'Edit company info and license details', path: '/settings', icon: Settings, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['company', 'شركة', 'ترخيص', 'license', 'fra'], tab: 'company' },
  { id: 'settings-branches', titleAr: 'إدارة الفروع', titleEn: 'Branch Management', descAr: 'إضافة وتعديل فروع الشركة', descEn: 'Add and manage company branches', path: '/settings', icon: Settings, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['branch', 'فرع', 'إضافة فرع'], tab: 'branches' },
  { id: 'settings-products', titleAr: 'منتجات التمويل', titleEn: 'Fund Products', descAr: 'إدارة منتجات التمويل وأسعار الفائدة', descEn: 'Manage fund products and interest rates', path: '/settings', icon: Settings, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['product', 'fund', 'interest rate', 'منتج', 'سعر فائدة', 'penalty'], tab: 'products' },
  { id: 'settings-users', titleAr: 'إدارة المستخدمين', titleEn: 'User Management', descAr: 'إضافة وإدارة مستخدمي النظام', descEn: 'Add and manage system users', path: '/settings', icon: Settings, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['user', 'مستخدم', 'officer', 'admin', 'مسؤول', 'role', 'صلاحية'], tab: 'users' },
  { id: 'settings-risk', titleAr: 'معايير المخاطر', titleEn: 'Risk Criteria', descAr: 'إدارة معايير تقييم المخاطر', descEn: 'Manage risk assessment criteria', path: '/settings', icon: Settings, sectionAr: 'الإدارة', sectionEn: 'Administration', keywords: ['risk', 'criteria', 'score', 'مخاطر', 'تقييم', 'معيار'], tab: 'risk' },
  { id: 'super-admin', titleAr: 'إدارة الشركات', titleEn: 'Tenant Management', descAr: 'إدارة الشركات المسجلة في النظام', descEn: 'Manage registered tenants', path: '/super-admin', icon: Building2, sectionAr: 'النظام', sectionEn: 'System', keywords: ['tenant', 'company', 'super admin', 'شركة', 'مؤسسة'], roles: ['SuperAdmin'] },
];

export function GlobalSearch() {
  const { open, setOpen } = useSearchOpen();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();

  const filteredItems = useMemo(() => {
    let items = searchIndex;
    if (user?.role && user.role !== 'SuperAdmin') {
      items = items.filter(item => {
        if (item.path === '/super-admin') return false;
        if (item.roles && !item.roles.includes(user.role)) return false;
        return true;
      });
    } else if (user?.role === 'SuperAdmin') {
      items = items.filter(item => item.path === '/super-admin' || item.id === 'super-admin');
    }

    if (!query.trim()) return items;

    const q = query.toLowerCase().trim();
    return items.filter(item => {
      if (item.titleAr.includes(q) || item.titleEn.toLowerCase().includes(q)) return true;
      if (item.descAr.includes(q) || item.descEn.toLowerCase().includes(q)) return true;
      if (item.sectionAr?.includes(q) || item.sectionEn?.toLowerCase().includes(q)) return true;
      if (item.keywords.some(kw => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase()))) return true;
      return false;
    });
  }, [query, user?.role]);

  const handleSelect = useCallback((item: SearchItem) => {
    setOpen(false);
    setQuery('');

    if (item.tab) {
      navigate(item.path);
      setTimeout(() => {
        const tabBtns = document.querySelectorAll('button');
        for (const btn of tabBtns) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes(item.tab!) || 
              (item.tab === 'fra' && (text.includes('fra') || text.includes('الرقابة'))) ||
              (item.tab === 'overdue' && (text.includes('overdue') || text.includes('متأخر'))) ||
              (item.tab === 'my-tasks' && (text.includes('my tasks') || text.includes('مهامي'))) ||
              (item.tab === 'templates' && (text.includes('template') || text.includes('قوالب'))) ||
              (item.tab === 'cashboxes' && (text.includes('cashbox') || text.includes('صناديق'))) ||
              (item.tab === 'company' && (text.includes('company') || text.includes('الشركة'))) ||
              (item.tab === 'branches' && (text.includes('branch') || text.includes('الفروع'))) ||
              (item.tab === 'products' && (text.includes('product') || text.includes('المنتجات'))) ||
              (item.tab === 'users' && (text.includes('user') || text.includes('المستخدم'))) ||
              (item.tab === 'risk' && (text.includes('risk') || text.includes('المخاطر')))) {
            btn.click();
            break;
          }
        }
      }, 300);
    } else {
      navigate(item.path);
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
        if (open) setQuery('');
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => { setOpen(false); setQuery(''); }} />
      
      <div role="dialog" aria-modal="true" aria-label={t('البحث السريع', 'Quick Search')} className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up" style={{ animationDuration: '150ms' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search size={20} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={filteredItems.length > 0}
            aria-controls="search-results"
            aria-activedescendant={filteredItems[selectedIndex]?.id}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('ابحث عن صفحة، ميزة، أو إعداد...', 'Search for a page, feature, or setting...')}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-mono border border-border">
            ESC
          </kbd>
        </div>

        <div ref={listRef} id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search size={40} className="mb-3 opacity-30" />
              <p className="text-sm">{t('لا توجد نتائج', 'No results found')}</p>
              <p className="text-xs mt-1">{t('حاول البحث بكلمات مختلفة', 'Try different search terms')}</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, idx) => {
                const showSection = idx === 0 || filteredItems[idx - 1]?.sectionEn !== item.sectionEn;
                return (
                  <React.Fragment key={item.id}>
                    {showSection && item.sectionAr && (
                      <div className="px-5 pt-3 pb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                          {t(item.sectionAr, item.sectionEn || '')}
                        </span>
                      </div>
                    )}
                    <button
                      id={item.id}
                      role="option"
                      aria-selected={idx === selectedIndex}
                      data-selected={idx === selectedIndex}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-3 text-start transition-colors",
                        idx === selectedIndex
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        idx === selectedIndex ? "bg-primary/20" : "bg-secondary"
                      )}>
                        <item.icon size={18} className={idx === selectedIndex ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{t(item.titleAr, item.titleEn)}</span>
                          {item.tab && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-medium shrink-0">
                              {t('قسم', 'Section')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t(item.descAr, item.descEn)}</p>
                      </div>
                      {idx === selectedIndex && (
                        <div className="flex items-center gap-1 shrink-0">
                          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-mono border border-border">
                            <CornerDownLeft size={10} />
                          </kbd>
                        </div>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-secondary/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp size={11} /> <ArrowDown size={11} /> {t('للتنقل', 'Navigate')}
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={11} /> {t('للاختيار', 'Select')}
            </span>
            <span className="flex items-center gap-1">
              ESC {t('للإغلاق', 'Close')}
            </span>
          </div>
          <span>{filteredItems.length} {t('نتيجة', 'results')}</span>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  const { t } = useLanguage();
  const { setOpen } = useSearchOpen();

  return (
    <button
      onClick={() => setOpen(true)}
      aria-label={t('فتح البحث', 'Open search')}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm transition-colors border border-white/10"
    >
      <Search size={16} className="shrink-0" />
      <span className="flex-1 text-start truncate">{t('بحث...', 'Search...')}</span>
      <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border shrink-0">
        <Command size={10} /> K
      </kbd>
    </button>
  );
}

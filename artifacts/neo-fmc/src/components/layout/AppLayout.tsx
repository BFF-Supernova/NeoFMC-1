import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTheme, THEME_LABELS, type ThemeMode } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';
import { GlobalSearch, SearchTrigger, SearchOpenProvider } from '@/components/GlobalSearch';
import Chatbot from '@/components/Chatbot';
import { 
  LayoutDashboard, Users, Calculator, FileText, Briefcase, 
  Wallet, Receipt, Landmark, FileBarChart, Settings, 
  LogOut, Globe, Menu, X, Building2, ChevronRight,
  ShieldCheck, ShieldAlert, ArrowRightLeft, CreditCard,
  GitBranch, Shield, FileCheck, ArrowLeftRight, Banknote,
  Upload, Bell, Truck, Phone, TrendingUp,
  Moon, Sun, Palette, Lock, ClipboardList, ChevronDown,
  PiggyBank, Database, Columns, Mail, BarChart3,
  MapPin, Webhook, MessageSquare, Sliders,
  Package, Store, UserCheck, PieChart, RefreshCw, Scale, GraduationCap, User,
  Brain, BookOpen, Umbrella, Building, ScanLine, Smartphone, Target, Coins,
  LineChart, Zap, BotMessageSquare, UserMinus, Fingerprint, FileSpreadsheet, Search,
} from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const toggleLanguage = () => setLanguage(language === 'ar' ? 'en' : 'ar');

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Palette;
  const ThemeIcon = themeIcon;

  const ROLE_AR: Record<string, string> = {
    TenantAdmin: 'مدير النظام', BranchManager: 'مدير الفرع', LoanOfficer: 'مسؤول الائتمان',
    CollectionOfficer: 'مسؤول التحصيل', Cashier: 'أمين الصندوق', Auditor: 'مراجع',
    DataEntry: 'إدخال بيانات', Accountant: 'محاسب', FinancialController: 'مراقب مالي',
    CFO: 'المدير المالي', SuperAdmin: 'مدير عام النظام', HRSelfService: 'الخدمة الذاتية',
    HR: 'موارد بشرية', HRManager: 'مدير الموارد البشرية',
  };

  const ALL_ROLES = ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Cashier', 'Auditor', 'DataEntry', 'Accountant', 'FinancialController', 'CFO', 'HR', 'HRManager'];
  const ADMIN_ROLES = ['TenantAdmin', 'BranchManager'];
  const FIELD_ROLES = ['TenantAdmin', 'BranchManager', 'LoanOfficer'];
  const FINANCE_ROLES = ['TenantAdmin', 'BranchManager', 'Cashier', 'Auditor', 'Accountant', 'FinancialController', 'CFO'];
  const SENIOR_FINANCE = ['TenantAdmin', 'FinancialController', 'CFO'];
  const HR_ROLES = ['HR', 'HRManager'];
  const SELF_SERVICE_ROLE = ['HRSelfService'];

  const allTenantNav = [
    { section: 'main', ar: 'الرئيسية', en: 'Main' },
    { icon: LayoutDashboard, ar: 'لوحة التحكم', en: 'Dashboard', path: '/dashboard', roles: ALL_ROLES },
    { icon: GraduationCap, ar: 'دليل سير العمل', en: 'Workflow Guide', path: '/workflow-guide', roles: ALL_ROLES },
    { icon: Users, ar: 'العملاء', en: 'Clients', path: '/clients', roles: ALL_ROLES },
    { icon: Calculator, ar: 'حاسبة التمويل', en: 'Loan Calculator', path: '/calculator', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'DataEntry'], module: 'moduleCoreBasic' },
    { section: 'savings', ar: 'الادخار', en: 'Savings' },
    { icon: PiggyBank, ar: 'الادخار', en: 'Savings', path: '/savings', roles: ALL_ROLES, module: 'moduleSavings' },
    { section: 'lending', ar: 'الإقراض', en: 'Lending' },
    { icon: FileText, ar: 'طلبات التمويل', en: 'Loan Requests', path: '/loan-requests', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'Auditor', 'DataEntry'], module: 'moduleCoreBasic' },
    { icon: Briefcase, ar: 'المحفظة', en: 'Portfolio', path: '/loans', roles: ALL_ROLES, module: 'moduleCoreBasic' },
    { icon: TrendingUp, ar: 'حدود الائتمان', en: 'Credit Limits', path: '/credit-limits', roles: ADMIN_ROLES, module: 'moduleAdvancedLending' },
    { icon: Shield, ar: 'الضمانات', en: 'Guarantees', path: '/guarantees', roles: [...FIELD_ROLES, 'Auditor'], module: 'moduleAdvancedLending' },
    { icon: Columns, ar: 'الضمانات العينية', en: 'Collaterals', path: '/collaterals', roles: [...FIELD_ROLES, 'Auditor', 'FinancialController', 'CFO'], module: 'moduleAdvancedLending' },
    { icon: Upload, ar: 'عمليات مجمعة', en: 'Bulk Operations', path: '/bulk-operations', roles: ADMIN_ROLES, module: 'moduleAdvancedLending' },
    { section: 'finance', ar: 'المالية', en: 'Finance' },
    { icon: Landmark, ar: 'الدليل المحاسبي', en: 'Finance/GL', path: '/finance', roles: FINANCE_ROLES, module: 'moduleCoreBasic' },
    { icon: Receipt, ar: 'المصروفات', en: 'Expenses', path: '/expenses', roles: FINANCE_ROLES, module: 'moduleCoreEdge' },
    { icon: CreditCard, ar: 'المدفوعات الإلكترونية', en: 'E-Payments', path: '/epayments', roles: ['TenantAdmin', 'BranchManager', 'Cashier', 'Accountant', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: FileBarChart, ar: 'القوائم المالية', en: 'Financial Statements', path: '/financial-statements', roles: ['TenantAdmin', 'BranchManager', 'Accountant', 'Auditor', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: Landmark, ar: 'مطابقة البنك', en: 'Bank Reconciliation', path: '/bank-reconciliation', roles: ['TenantAdmin', 'BranchManager', 'Accountant', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: Package, ar: 'الأصول الثابتة', en: 'Fixed Assets', path: '/fixed-assets', roles: ['TenantAdmin', 'BranchManager', 'Accountant', 'Auditor', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: Store, ar: 'الموردون', en: 'Vendors & AP', path: '/vendors', roles: ['TenantAdmin', 'BranchManager', 'Accountant', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: PieChart, ar: 'الموازنات', en: 'Budgets', path: '/budgets', roles: ['TenantAdmin', 'BranchManager', 'Accountant', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: RefreshCw, ar: 'القيود المتكررة', en: 'Recurring Journals', path: '/recurring-journals', roles: ['TenantAdmin', 'Accountant', 'FinancialController', 'CFO'], module: 'moduleCoreBasic' },
    { icon: Scale, ar: 'إعدادات الضرائب', en: 'Tax Config', path: '/tax-config', roles: ['TenantAdmin', 'Accountant', 'FinancialController'], module: 'moduleCoreBasic' },
    { section: 'settlements', ar: 'التسويات', en: 'Settlements' },
    { icon: FileCheck, ar: 'الشيكات', en: 'Cheques', path: '/cheques', roles: FINANCE_ROLES, module: 'moduleFinancialSettlements' },
    { icon: ArrowLeftRight, ar: 'التحويلات البنكية', en: 'Wire Transfers', path: '/wire-transfers', roles: FINANCE_ROLES, module: 'moduleFinancialSettlements' },
    { icon: Banknote, ar: 'التسويات النقدية', en: 'Cash Settlements', path: '/cash-settlements', roles: ['TenantAdmin', 'BranchManager', 'Cashier', 'Accountant', 'FinancialController', 'CFO'], module: 'moduleFinancialSettlements' },
    { section: 'collection', ar: 'التحصيل', en: 'Collection' },
    { icon: Wallet, ar: 'التحصيل', en: 'Collection', path: '/collection', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Cashier', 'Auditor'], module: 'moduleCoreEdge' },
    { icon: Phone, ar: 'أنشطة التحصيل', en: 'Activities', path: '/collection-activities', roles: ['TenantAdmin', 'BranchManager', 'CollectionOfficer'], module: 'moduleCoreEdge' },
    { icon: Truck, ar: 'تفريغ المحفظة', en: 'Offloading', path: '/offloading', roles: ADMIN_ROLES, module: 'moduleCoreEdge' },
    { icon: Users, ar: 'المجموعات', en: 'Groups', path: '/client-groups', roles: [...FIELD_ROLES, 'CollectionOfficer'], module: 'moduleAdvancedLending' },
    { section: 'hr', ar: 'الموارد البشرية', en: 'HR & Payroll' },
    { icon: UserCheck, ar: 'الموارد البشرية', en: 'HR & Payroll', path: '/employees', roles: ['TenantAdmin', 'BranchManager', 'Accountant', 'FinancialController', 'CFO', 'HR', 'HRManager'], module: 'moduleHRPayroll' },
    { section: 'selfservice', ar: 'الخدمة الذاتية', en: 'Self Service' },
    { icon: User, ar: 'الخدمة الذاتية', en: 'Self Service', path: '/self-service', roles: [...ALL_ROLES, 'HRSelfService'] },
    { section: 'admin', ar: 'الإدارة', en: 'Administration' },
    { icon: ShieldAlert, ar: 'تقارير الاستثناءات', en: 'Compliance Exceptions', path: '/compliance-exceptions', roles: ['TenantAdmin', 'Auditor', 'FinancialController', 'CFO'] },
    { icon: ShieldCheck, ar: 'الموافقات', en: 'Approvals', path: '/approvals', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Auditor', 'FinancialController', 'CFO', 'HRManager'] },
    { icon: Lock, ar: 'الإقفال المالي', en: 'Financial Closing', path: '/daily-closing', roles: ['TenantAdmin', 'BranchManager', 'Cashier', 'Accountant', 'FinancialController', 'CFO'] },
    { icon: ClipboardList, ar: 'سجل التدقيق', en: 'Audit Trail', path: '/audit-trail', roles: ['TenantAdmin', 'BranchManager', 'Auditor', 'FinancialController', 'CFO', 'HRManager'] },
    { icon: ShieldAlert, ar: 'القوائم السوداء', en: 'Blacklists', path: '/blacklists', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Auditor'], module: 'moduleCoreEdge' },
    { icon: ArrowRightLeft, ar: 'تحويل المحفظة', en: 'Portfolio Transfer', path: '/portfolio-transfer', roles: ADMIN_ROLES },
    { icon: Shield, ar: 'طلبات الفروع', en: 'Branch Requests', path: '/branch-requests', roles: ADMIN_ROLES },
    { icon: GitBranch, ar: 'سير العمل', en: 'Workflows', path: '/workflows', roles: ADMIN_ROLES, module: 'moduleCoreEdge' },
    { icon: Bell, ar: 'الإشعارات', en: 'Notifications', path: '/notifications', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Cashier', 'Accountant', 'FinancialController', 'CFO', 'HR', 'HRManager'] },
    { icon: Users, ar: 'وكلاء المبيعات', en: 'Sales Agents', path: '/sales-agents', roles: ADMIN_ROLES },
    { icon: FileBarChart, ar: 'التقارير', en: 'Reports', path: '/reports', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Auditor', 'Accountant', 'FinancialController', 'CFO', 'HRManager'] },
    { icon: ShieldCheck, ar: 'معايير المخاطر', en: 'Risk Criteria', path: '/risk-criteria', roles: ['TenantAdmin', 'CFO'] },
    { icon: ArrowRightLeft, ar: 'تحويلات النقدية', en: 'Cash Transfers', path: '/branch-cash-transfers', roles: ['TenantAdmin', 'BranchManager', 'Cashier'] },
    { icon: FileBarChart, ar: 'تقارير الرقابة', en: 'FRA Reports', path: '/fra-reports', roles: ['TenantAdmin', 'BranchManager', 'Auditor', 'FinancialController', 'CFO'], module: 'moduleFRAReporting' },
    { icon: BarChart3, ar: 'تحليل الأعمار', en: 'Loan Aging', path: '/loan-aging', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Auditor', 'FinancialController', 'CFO'] },
    { icon: Mail, ar: 'البريد الإلكتروني', en: 'Email Notifications', path: '/email-notifications', roles: ADMIN_ROLES },
    { icon: MessageSquare, ar: 'إشعارات SMS', en: 'SMS Notifications', path: '/sms-notifications', roles: ADMIN_ROLES },
    { icon: MapPin, ar: 'زيارات ميدانية', en: 'Field Check-ins', path: '/officer-checkins', roles: [...FIELD_ROLES, 'CollectionOfficer'] },
    { icon: BarChart3, ar: 'تحليلات المحفظة', en: 'Portfolio Analytics', path: '/portfolio-analytics', roles: ['TenantAdmin', 'BranchManager', 'Auditor', 'FinancialController', 'CFO'] },
    { icon: Sliders, ar: 'تعديل الأسعار', en: 'Bulk Adjustments', path: '/bulk-adjustments', roles: ['TenantAdmin'] },
    { icon: Webhook, ar: 'Webhooks', en: 'Webhooks', path: '/webhooks', roles: ['TenantAdmin'] },
    { icon: Database, ar: 'تصدير البيانات', en: 'Data Export', path: '/data-export', roles: ['TenantAdmin'] },
    { section: 'insurance_agents', ar: 'التأمين والوكلاء', en: 'Insurance & Agents' },
    { icon: Umbrella, ar: 'التأمين', en: 'Insurance', path: '/insurance', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CFO', 'Accountant'], module: 'moduleInsurance' },
    { icon: Building, ar: 'الوكلاء المصرفيون', en: 'Agent Banking', path: '/agent-banking', roles: ['TenantAdmin', 'BranchManager'], module: 'moduleAgentBanking' },
    { icon: RefreshCw, ar: 'إعادة الهيكلة', en: 'Loan Restructuring', path: '/loan-restructuring', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer'], module: 'moduleLoanRestructuring' },
    { section: 'digital', ar: 'القنوات الرقمية', en: 'Digital Channels' },
    { icon: Wallet, ar: 'المحافظ الإلكترونية', en: 'Mobile Wallets', path: '/mobile-wallet', roles: ['TenantAdmin', 'BranchManager', 'Cashier', 'Accountant'], module: 'moduleMobileWallet' },
    { icon: MessageSquare, ar: 'واتساب بيزنس', en: 'WhatsApp', path: '/whatsapp', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer'], module: 'moduleWhatsApp' },
    { icon: ScanLine, ar: 'معالجة المستندات', en: 'OCR Documents', path: '/ocr-documents', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'DataEntry'], module: 'moduleOCR' },
    { section: 'ai_analytics', ar: 'الذكاء الاصطناعي', en: 'AI & Analytics' },
    { icon: Target, ar: 'التحصيل الذكي', en: 'AI Collection', path: '/ai-collection', roles: ['TenantAdmin', 'BranchManager', 'CollectionOfficer'], module: 'moduleAICollection' },
    { icon: Coins, ar: 'التسعير الديناميكي', en: 'Dynamic Pricing', path: '/dynamic-pricing', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer'], module: 'moduleDynamicPricing' },
    { icon: LineChart, ar: 'التدفقات النقدية', en: 'Cash Flow Prediction', path: '/cash-flow-prediction', roles: ['TenantAdmin', 'BranchManager', 'Cashier', 'FinancialController', 'CFO'], module: 'moduleCashFlowPrediction' },
    { icon: Zap, ar: 'اختبارات الضغط', en: 'Stress Testing', path: '/stress-testing', roles: ['TenantAdmin', 'CFO', 'FinancialController'], module: 'moduleAIStressTesting' },
    { icon: BotMessageSquare, ar: 'التقارير السردية', en: 'NLP Reports', path: '/nlp-reporting', roles: ['TenantAdmin', 'CFO', 'FinancialController', 'BranchManager', 'Auditor'], module: 'moduleNLPReporting' },
    { icon: UserMinus, ar: 'التنبؤ بالعملاء', en: 'Churn Prediction', path: '/churn-prediction', roles: ['TenantAdmin', 'BranchManager'], module: 'moduleChurnPrediction' },
    { section: 'regulatory', ar: 'الامتثال والمخاطر', en: 'Compliance & Risk' },
    { icon: TrendingUp, ar: 'IFRS 9 والمخصصات', en: 'IFRS 9 Provisions', path: '/ifrs9', roles: ['TenantAdmin', 'CFO', 'Accountant', 'Auditor', 'FinancialController'], module: 'moduleIFRS9' },
    { icon: Brain, ar: 'محرك المخاطر الذكي', en: 'AI Risk Engine', path: '/ai-risk', roles: ['TenantAdmin', 'CFO', 'BranchManager', 'Auditor', 'CollectionOfficer', 'LoanOfficer'], module: 'moduleAIRisk' },
    { icon: Search, ar: 'I-Score مباشر', en: 'I-Score Live', path: '/iscore-live', roles: ['TenantAdmin', 'BranchManager', 'LoanOfficer'], module: 'moduleIScorelive' },
    { icon: BookOpen, ar: 'الشروط والسياسات', en: 'Legal & Policies', path: '/legal', roles: ALL_ROLES },
    { icon: Settings, ar: 'الإعدادات', en: 'Settings', path: '/settings', roles: [...ADMIN_ROLES, 'HRManager'] },
  ];

  const userRole = user?.role || '';
  const userModules = user?.modules as Record<string, boolean> | undefined;
  const tenantNav = allTenantNav.filter(item => {
    if ('section' in item && !('path' in item)) return true;
    if ('roles' in item) {
      const roleOk = userRole === 'SuperAdmin' || (item as any).roles.includes(userRole);
      if (!roleOk) return false;
      if ('module' in item && (item as any).module) {
        if (!userModules || userModules[(item as any).module] !== true) return false;
      }
    }
    return true;
  }).filter((item, idx, arr) => {
    if ('section' in item && !('path' in item)) {
      const next = arr[idx + 1];
      return next && 'path' in next;
    }
    return true;
  });

  const adminNav = [
    { section: 'platform', ar: 'المنصة', en: 'Platform' },
    { icon: BarChart3, ar: 'لوحة القيادة', en: 'Platform Dashboard', path: '/super-admin?view=dashboard' },
    { icon: Building2, ar: 'الشركات', en: 'Companies', path: '/super-admin?view=companies' },
    { icon: CreditCard, ar: 'التسعير', en: 'Pricing & Plans', path: '/super-admin?view=pricing' },
    { section: 'platform-ops', ar: 'العمليات', en: 'Operations' },
    { icon: ClipboardList, ar: 'سجل المنصة', en: 'Platform Audit Log', path: '/super-admin?view=audit' },
    { icon: Bell, ar: 'إعلانات النظام', en: 'System Announcements', path: '/super-admin?view=announcements' },
    { icon: Settings, ar: 'إعدادات المنصة', en: 'Platform Settings', path: '/super-admin?view=settings' },
  ];

  const { isSuperAdmin, selectedTenant, tenants, setSelectedTenantId, selectedTenantId, hasTenantContext } = useTenantContext();
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);

  const companyContextSeparator = isSuperAdmin ? [
    { section: 'company-context', ar: '', en: '', isTenantSwitcher: true },
  ] : [];
  const navItems = isSuperAdmin ? [...adminNav, ...companyContextSeparator, ...(hasTenantContext ? tenantNav : [])] : tenantNav;

  return (
    <SearchOpenProvider>
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 z-50 flex w-72 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:static lg:translate-x-0",
        isRtl ? "right-0 border-l border-r-0" : "left-0",
        isMobileOpen ? "translate-x-0" : isRtl ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-20 shrink-0 items-center justify-between px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Neo FMC" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight">Neo FMC</span>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-sidebar-foreground hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2">
          <SearchTrigger />
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1 custom-scrollbar">
          {navItems.map((item: any, idx: number) => {
            if (item.section) {
              if (item.isTenantSwitcher) {
                return (
                  <div key={item.section} className={cn("mt-5 mb-2 relative")}>
                    <button
                      onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all duration-200 group"
                    >
                      <Building2 size={16} className="text-primary shrink-0" />
                      <span className="flex-1 text-sm font-medium text-white truncate text-start">
                        {selectedTenant
                          ? t(selectedTenant.companyNameAr || selectedTenant.companyName, selectedTenant.companyName)
                          : t('اختر شركة', 'Select Company')}
                      </span>
                      <ChevronDown size={14} className={cn("text-sidebar-foreground/50 transition-transform duration-200", tenantDropdownOpen && "rotate-180")} />
                    </button>
                    {tenantDropdownOpen && (
                      <div className="mt-1 rounded-xl bg-card border border-border shadow-xl overflow-hidden z-50 relative">
                        {tenants.map((tenant) => (
                          <button
                            key={tenant.id}
                            onClick={() => { setSelectedTenantId(tenant.id); setTenantDropdownOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-start",
                              tenant.id === selectedTenantId
                                ? "bg-primary/20 text-primary font-medium"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full shrink-0", tenant.id === selectedTenantId ? "bg-primary" : "bg-muted-foreground/30")} />
                            <span className="truncate">{t(tenant.companyNameAr || tenant.companyName, tenant.companyName)}</span>
                          </button>
                        ))}
                        {selectedTenantId && (
                          <button
                            onClick={() => { setSelectedTenantId(null); setTenantDropdownOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors border-t border-border text-start"
                          >
                            <X size={12} />
                            <span>{t('إلغاء التحديد', 'Clear Selection')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div key={item.section} className={cn("px-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider", idx > 0 ? "mt-5 mb-2" : "mb-2")}>
                  {t(item.ar, item.en)}
                </div>
              );
            }
            const currentSearch = window.location.search;
            const currentFull = location + currentSearch;
            const isActive = item.path.includes('?')
              ? currentFull === item.path
              : (location === item.path || location.startsWith(item.path + '/'));
            const handleNavClick = (e: React.MouseEvent) => {
              if (item.path.includes('?')) {
                e.preventDefault();
                const base = import.meta.env.BASE_URL.replace(/\/$/, '');
                window.history.pushState({}, '', `${base}${item.path}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
              setIsMobileOpen(false);
            };
            const hasQuery = item.path.includes('?');
            const navContent = (
              <>
                <item.icon size={18} className={cn("shrink-0 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="flex-1">{t(item.ar, item.en)}</span>
                {isActive && <ChevronRight size={14} className={cn("opacity-70", isRtl && "rotate-180")} />}
              </>
            );
            const navClass = cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium" 
                : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
            );
            if (hasQuery) {
              return (
                <a key={item.path} href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${item.path}`} onClick={handleNavClick} className={navClass}>
                  {navContent}
                </a>
              );
            }
            return (
              <Link key={item.path} href={item.path} onClick={() => setIsMobileOpen(false)} className={navClass}>
                {navContent}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 border border-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30 shrink-0">
              {user?.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
              <p className="text-xs text-sidebar-foreground truncate">{t(ROLE_AR[user?.role || ''] || user?.role, user?.role)}</p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
          >
            <LogOut size={20} className={isRtl ? "rotate-180" : ""} />
            <span>{t('تسجيل الخروج', 'Logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top Header */}
        <header className="h-14 sm:h-20 shrink-0 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 lg:hidden shrink-0"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base sm:text-xl md:text-2xl font-display font-bold text-foreground capitalize tracking-tight truncate">
              {location === '/' ? t('الرئيسية', 'Home') : t(
                location.split('/')[1].replace('-', ' '),
                location.split('/')[1].replace('-', ' ')
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <SystemNotificationBell />
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors border border-border"
              >
                <ThemeIcon size={16} />
                <span className="hidden sm:inline">{t(THEME_LABELS[theme].ar, THEME_LABELS[theme].en)}</span>
              </button>
              {themeMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)} />
                  <div className={cn(
                    "absolute top-full mt-2 z-50 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in",
                    isRtl ? "left-0" : "right-0"
                  )}>
                    {(['dark', 'light', 'cheerful'] as ThemeMode[]).map((m) => {
                      const Icon = m === 'dark' ? Moon : m === 'light' ? Sun : Palette;
                      return (
                        <button
                          key={m}
                          onClick={() => { setTheme(m); setThemeMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                            theme === m
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground hover:bg-secondary"
                          )}
                        >
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", 
                            m === 'dark' ? "bg-slate-700 border-slate-500" : 
                            m === 'light' ? "bg-blue-100 border-blue-300" : 
                            "bg-rose-100 border-rose-300"
                          )}>
                            <Icon size={12} className={
                              m === 'dark' ? "text-slate-200" : 
                              m === 'light' ? "text-blue-600" : 
                              "text-rose-500"
                            } />
                          </div>
                          <span>{t(THEME_LABELS[m].ar, THEME_LABELS[m].en)}</span>
                          {theme === m && <span className="ml-auto text-primary">&#10003;</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors border border-border"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full animate-slide-up">
            {children}
          </div>
        </div>
      </main>

      <GlobalSearch />
      <Chatbot />
    </div>
    </SearchOpenProvider>);
}

function SystemNotificationBell() {
  const { t, isRtl } = useLanguage();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dismissedAnn, setDismissedAnn] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('neo_fmc_dismissed_announcements');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const { data: bellData } = useQuery({
    queryKey: ['/user-notifications'],
    queryFn: () => api.get<{ notifications: any[]; announcements: any[] }>('/user-notifications'),
    refetchInterval: 30 * 1000,
  });

  const { data: countData } = useQuery({
    queryKey: ['/user-notifications/unread-count'],
    queryFn: () => api.get<{ unread: number; announcements: number; total: number }>('/user-notifications/unread-count'),
    refetchInterval: 30 * 1000,
  });

  const internalNotifs = bellData?.notifications || [];
  const announcements = (bellData?.announcements || []).filter((a: any) => !dismissedAnn.has(a.id));
  const unreadCount = (countData?.unread || 0) + announcements.length;

  const markRead = async (id: string) => {
    try {
      await api.put(`/user-notifications/${id}/read`);
      qc.invalidateQueries({ queryKey: ['/user-notifications'] });
      qc.invalidateQueries({ queryKey: ['/user-notifications/unread-count'] });
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/user-notifications/read-all');
      const allAnnIds = (bellData?.announcements || []).map((a: any) => a.id);
      const next = new Set([...dismissedAnn, ...allAnnIds]);
      setDismissedAnn(next);
      localStorage.setItem('neo_fmc_dismissed_announcements', JSON.stringify([...next]));
      qc.invalidateQueries({ queryKey: ['/user-notifications'] });
      qc.invalidateQueries({ queryKey: ['/user-notifications/unread-count'] });
    } catch {}
  };

  const dismissAnnouncement = (id: string) => {
    setDismissedAnn(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('neo_fmc_dismissed_announcements', JSON.stringify([...next]));
      return next;
    });
  };

  const severityStyle = (severity: string) => {
    if (severity === 'critical') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (severity === 'warning') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (severity === 'success') return 'bg-green-500/10 text-green-400 border-green-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const severityDot = (severity: string, isRead: boolean) => {
    if (isRead) return 'bg-muted';
    if (severity === 'critical') return 'bg-red-500';
    if (severity === 'warning') return 'bg-yellow-500';
    if (severity === 'success') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const severityLabel = (severity: string) => {
    if (severity === 'critical') return t('حرج', 'Critical');
    if (severity === 'warning') return t('تحذير', 'Warning');
    if (severity === 'success') return t('نجاح', 'Success');
    return t('معلومة', 'Info');
  };

  const typeIcon = (type: string) => {
    if (type === 'new_loan_request') return '📋';
    if (type === 'request_status_change') return '🔄';
    if (type === 'payment_received') return '💰';
    if (type === 'overdue_alert') return '⚠️';
    if (type === 'announcement') return '📢';
    return '🔔';
  };

  const handleNotifClick = async (n: any) => {
    if (!n.isRead) await markRead(n.id);
    setOpen(false);
    if (n.linkUrl) {
      setLocation(n.linkUrl);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors border border-border"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn(
            "absolute top-full mt-2 z-50 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in",
            isRtl ? "left-0" : "right-0"
          )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-bold">{t('الإشعارات', 'Notifications')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  {t('قراءة الكل', 'Mark All Read')}
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {announcements.length === 0 && internalNotifs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Bell size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{t('لا توجد إشعارات', 'No notifications')}</p>
                </div>
              ) : (
                <>
                  {announcements.map((a: any) => (
                    <div key={`ann-${a.id}`} className="px-4 py-3 border-b border-border bg-primary/5">
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5">📢</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", severityStyle(a.severity))}>
                              {severityLabel(a.severity)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{t('إعلان', 'Announcement')}</span>
                          </div>
                          {a.title && <p className="text-xs font-semibold mb-0.5">{a.titleAr ? t(a.titleAr, a.title) : a.title}</p>}
                          <p className="text-sm text-foreground leading-relaxed">{a.messageAr ? t(a.messageAr, a.message) : a.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                            <button onClick={() => dismissAnnouncement(a.id)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                              {t('تجاهل', 'Dismiss')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {internalNotifs.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        "px-4 py-3 border-b border-border last:border-b-0 transition-colors cursor-pointer hover:bg-muted/30",
                        n.isRead ? "opacity-60" : "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", severityStyle(n.severity))}>
                              {severityLabel(n.severity)}
                            </span>
                            {!n.isRead && <div className={cn("w-1.5 h-1.5 rounded-full", severityDot(n.severity, false))} />}
                          </div>
                          <p className="text-xs font-semibold mb-0.5">{n.titleAr ? t(n.titleAr, n.title) : n.title}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{n.messageAr ? t(n.messageAr, n.message) : n.message}</p>
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


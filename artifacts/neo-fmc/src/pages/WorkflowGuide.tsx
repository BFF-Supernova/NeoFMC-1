import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  GraduationCap, Play, ChevronRight, ChevronLeft, CheckCircle2, Circle,
  ArrowRight, MousePointerClick, Pencil, Eye, RotateCcw,
  LayoutDashboard, Users, FileText, Briefcase, Wallet, Receipt,
  Landmark, Lock, Calculator, ShieldCheck, Settings, FileBarChart,
  Phone, CreditCard, Banknote, ArrowLeftRight, UserCheck, Package,
  Store, PieChart, Building2, BarChart3, Upload,
} from 'lucide-react';

type ActionType = 'click' | 'write' | 'review' | 'navigate';

interface TourStep {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  action: ActionType;
  targetPath: string;
  actionHintAr: string;
  actionHintEn: string;
  icon: any;
  module?: string;
}

interface WorkflowPhase {
  phaseAr: string;
  phaseEn: string;
  steps: TourStep[];
}

const ROLE_WORKFLOWS: Record<string, WorkflowPhase[]> = {
  TenantAdmin: [
    {
      phaseAr: 'إعداد النظام',
      phaseEn: 'System Setup',
      steps: [
        { id: 'ta-1', titleAr: 'إعدادات الشركة', titleEn: 'Company Settings', descAr: 'ابدأ بتكوين بيانات الشركة والفروع والمستخدمين', descEn: 'Start by configuring your company data, branches, and users', action: 'click', targetPath: '/settings', actionHintAr: 'انقر على "الإعدادات" من القائمة الجانبية', actionHintEn: 'Click "Settings" from the sidebar menu', icon: Settings },
        { id: 'ta-2', titleAr: 'تحميل دليل الحسابات', titleEn: 'Load Chart of Accounts', descAr: 'حمّل الدليل المحاسبي الموحد المعتمد', descEn: 'Load the standard chart of accounts', action: 'click', targetPath: '/finance', actionHintAr: 'اذهب إلى "المالية" ثم انقر "تحميل الدليل المحاسبي"', actionHintEn: 'Go to "Finance/GL" and click "Load Default Chart of Accounts"', icon: Landmark, module: 'moduleCoreBasic' },
        { id: 'ta-3', titleAr: 'إضافة المستخدمين', titleEn: 'Add Users', descAr: 'أضف المستخدمين بأدوارهم المختلفة (مسؤول فرع، مسؤول قروض، محصّل، محاسب)', descEn: 'Add users with their roles (Branch Manager, Loan Officer, Collector, Accountant)', action: 'click', targetPath: '/settings', actionHintAr: 'من الإعدادات > المستخدمون، انقر "إضافة مستخدم"', actionHintEn: 'From Settings > Users, click "Add User"', icon: Users },
        { id: 'ta-4', titleAr: 'مزامنة الموظفين', titleEn: 'Sync Employees', descAr: 'اربط المستخدمين بسجلات الموظفين في الموارد البشرية', descEn: 'Link system users with employee records in HR', action: 'click', targetPath: '/employees', actionHintAr: 'اذهب إلى "الموارد البشرية" ثم انقر "مزامنة المستخدمين"', actionHintEn: 'Go to "HR & Payroll" and click "Sync Users"', icon: UserCheck },
      ],
    },
    {
      phaseAr: 'العمليات اليومية',
      phaseEn: 'Daily Operations',
      steps: [
        { id: 'ta-5', titleAr: 'لوحة التحكم', titleEn: 'Dashboard Review', descAr: 'راجع أداء المحفظة ومؤشرات الأداء الرئيسية يومياً', descEn: 'Review portfolio performance and KPIs daily', action: 'review', targetPath: '/dashboard', actionHintAr: 'افتح لوحة التحكم واطلع على البيانات', actionHintEn: 'Open the dashboard and review the data', icon: LayoutDashboard },
        { id: 'ta-6', titleAr: 'الموافقات', titleEn: 'Approvals', descAr: 'راجع طلبات التمويل والموافقات المعلقة واتخذ القرار', descEn: 'Review pending loan requests and approve/reject', action: 'click', targetPath: '/approvals', actionHintAr: 'اذهب إلى "الموافقات" وراجع الطلبات المعلقة', actionHintEn: 'Go to "Approvals" and review pending requests', icon: ShieldCheck },
        { id: 'ta-7', titleAr: 'التقارير', titleEn: 'Reports', descAr: 'اطلع على التقارير الشهرية والرقابية', descEn: 'View monthly and regulatory reports', action: 'review', targetPath: '/reports', actionHintAr: 'اذهب إلى "التقارير" لمراجعة الأداء', actionHintEn: 'Go to "Reports" to review performance', icon: FileBarChart },
        { id: 'ta-8', titleAr: 'الإقفال المالي', titleEn: 'Financial Closing', descAr: 'أجرِ الإقفال اليومي والشهري للفروع', descEn: 'Perform daily and monthly closing for branches', action: 'click', targetPath: '/daily-closing', actionHintAr: 'اذهب إلى "الإقفال المالي"، اختر الفرع، ثم أكّد الإقفال', actionHintEn: 'Go to "Financial Closing", select branch, then confirm close', icon: Lock },
      ],
    },
  ],
  BranchManager: [
    {
      phaseAr: 'إدارة الفرع',
      phaseEn: 'Branch Management',
      steps: [
        { id: 'bm-1', titleAr: 'لوحة التحكم', titleEn: 'Dashboard', descAr: 'راجع أداء فرعك ومؤشرات الأداء', descEn: 'Review your branch performance and KPIs', action: 'review', targetPath: '/dashboard', actionHintAr: 'افتح لوحة التحكم لمتابعة أداء فرعك', actionHintEn: 'Open dashboard to monitor your branch performance', icon: LayoutDashboard },
        { id: 'bm-2', titleAr: 'مراجعة طلبات التمويل', titleEn: 'Review Loan Requests', descAr: 'راجع طلبات التمويل المقدمة من مسؤولي القروض', descEn: 'Review loan applications submitted by loan officers', action: 'click', targetPath: '/loan-requests', actionHintAr: 'اذهب إلى "طلبات التمويل" وراجع الطلبات الجديدة', actionHintEn: 'Go to "Loan Requests" and review new applications', icon: FileText },
        { id: 'bm-3', titleAr: 'الموافقات', titleEn: 'Approvals', descAr: 'وافق أو ارفض الطلبات المعلقة ضمن صلاحياتك', descEn: 'Approve or reject requests within your authority', action: 'click', targetPath: '/approvals', actionHintAr: 'اذهب إلى "الموافقات" وانقر "موافقة" أو "رفض"', actionHintEn: 'Go to "Approvals" and click "Approve" or "Reject"', icon: ShieldCheck },
        { id: 'bm-4', titleAr: 'متابعة التحصيل', titleEn: 'Collection Follow-up', descAr: 'تابع حالة التحصيل والأقساط المتأخرة', descEn: 'Follow up on collection status and overdue installments', action: 'review', targetPath: '/collection', actionHintAr: 'اذهب إلى "التحصيل" لمتابعة المتأخرات', actionHintEn: 'Go to "Collection" to track overdue items', icon: Wallet },
        { id: 'bm-5', titleAr: 'الإقفال اليومي', titleEn: 'Daily Closing', descAr: 'أقفل اليوم بعد التحقق من النقدية الفعلية', descEn: 'Close the day after verifying actual cash', action: 'click', targetPath: '/daily-closing', actionHintAr: 'اذهب إلى "الإقفال المالي"، اختر فرعك، وأدخل النقدية الفعلية', actionHintEn: 'Go to "Financial Closing", select your branch, enter actual cash', icon: Lock },
      ],
    },
  ],
  LoanOfficer: [
    {
      phaseAr: 'دورة القروض الكاملة',
      phaseEn: 'Full Loan Cycle',
      steps: [
        { id: 'lo-1', titleAr: 'تسجيل عميل جديد', titleEn: 'Register New Client', descAr: 'سجّل بيانات العميل الأساسية والمستندات المطلوبة', descEn: 'Register basic client info and required documents', action: 'click', targetPath: '/clients', actionHintAr: 'اذهب إلى "العملاء" ثم انقر "+ عميل جديد"', actionHintEn: 'Go to "Clients" then click "+ New Client"', icon: Users },
        { id: 'lo-2', titleAr: 'حاسبة التمويل', titleEn: 'Loan Calculator', descAr: 'احسب الأقساط وجدول السداد قبل تقديم الطلب', descEn: 'Calculate installments and repayment schedule before applying', action: 'write', targetPath: '/calculator', actionHintAr: 'اذهب إلى "حاسبة التمويل"، أدخل المبلغ والفترة والفائدة', actionHintEn: 'Go to "Loan Calculator", enter amount, period, and interest', icon: Calculator, module: 'moduleCoreBasic' },
        { id: 'lo-3', titleAr: 'تقديم طلب تمويل', titleEn: 'Submit Loan Request', descAr: 'أنشئ طلب تمويل جديد للعميل مع كل البيانات المطلوبة', descEn: 'Create new loan application with all required data', action: 'click', targetPath: '/loan-requests', actionHintAr: 'اذهب إلى "طلبات التمويل" ثم انقر "+ طلب جديد"', actionHintEn: 'Go to "Loan Requests" then click "+ New Request"', icon: FileText, module: 'moduleCoreBasic' },
        { id: 'lo-4', titleAr: 'متابعة المحفظة', titleEn: 'Monitor Portfolio', descAr: 'تابع القروض النشطة وحالة السداد لعملائك', descEn: 'Track active loans and payment status for your clients', action: 'review', targetPath: '/loans', actionHintAr: 'اذهب إلى "المحفظة" لمتابعة قروضك النشطة', actionHintEn: 'Go to "Portfolio" to view your active loans', icon: Briefcase, module: 'moduleCoreBasic' },
        { id: 'lo-5', titleAr: 'التحصيل الميداني', titleEn: 'Field Collection', descAr: 'سجّل التحصيلات والزيارات الميدانية للعملاء', descEn: 'Record collections and field visits for clients', action: 'click', targetPath: '/collection', actionHintAr: 'اذهب إلى "التحصيل" ثم انقر "تسجيل تحصيل" بجانب القسط', actionHintEn: 'Go to "Collection" and click "Record Payment" next to installment', icon: Wallet, module: 'moduleCoreEdge' },
        { id: 'lo-6', titleAr: 'الزيارات الميدانية', titleEn: 'Field Check-ins', descAr: 'سجّل تسجيل حضورك الميداني وإثبات الزيارة', descEn: 'Log your field attendance and visit proof', action: 'click', targetPath: '/officer-checkins', actionHintAr: 'اذهب إلى "الزيارات الميدانية" وسجّل موقعك', actionHintEn: 'Go to "Field Check-ins" and log your location', icon: Building2 },
      ],
    },
  ],
  CollectionOfficer: [
    {
      phaseAr: 'دورة التحصيل',
      phaseEn: 'Collection Cycle',
      steps: [
        { id: 'co-1', titleAr: 'لوحة التحكم', titleEn: 'Dashboard', descAr: 'راجع الأقساط المتأخرة المخصصة لك اليوم', descEn: 'Review overdue installments assigned to you today', action: 'review', targetPath: '/dashboard', actionHintAr: 'افتح لوحة التحكم لمعرفة الأقساط المطلوب تحصيلها', actionHintEn: 'Open dashboard to see installments to collect', icon: LayoutDashboard },
        { id: 'co-2', titleAr: 'جدول التحصيل', titleEn: 'Collection Schedule', descAr: 'اطلع على جدول التحصيل اليومي وحدد مسارك', descEn: 'View daily collection schedule and plan your route', action: 'review', targetPath: '/collection', actionHintAr: 'اذهب إلى "التحصيل" لمراجعة الأقساط المستحقة', actionHintEn: 'Go to "Collection" to review due installments', icon: Wallet, module: 'moduleCoreEdge' },
        { id: 'co-3', titleAr: 'تسجيل تحصيل', titleEn: 'Record Payment', descAr: 'سجّل كل تحصيل فور استلام المبلغ من العميل', descEn: 'Record each collection upon receiving amount from client', action: 'click', targetPath: '/collection', actionHintAr: 'في صفحة التحصيل، انقر "تسجيل تحصيل" وأدخل المبلغ', actionHintEn: 'On Collection page, click "Record Payment" and enter amount', icon: Banknote, module: 'moduleCoreEdge' },
        { id: 'co-4', titleAr: 'أنشطة التحصيل', titleEn: 'Collection Activities', descAr: 'سجّل ملاحظات الزيارات والاتصالات مع العملاء', descEn: 'Log visit notes and client contact activities', action: 'write', targetPath: '/collection-activities', actionHintAr: 'اذهب إلى "أنشطة التحصيل" وسجّل ملاحظات كل زيارة', actionHintEn: 'Go to "Activities" and log notes for each visit', icon: Phone, module: 'moduleCoreEdge' },
      ],
    },
  ],
  Cashier: [
    {
      phaseAr: 'العمليات النقدية اليومية',
      phaseEn: 'Daily Cash Operations',
      steps: [
        { id: 'ca-1', titleAr: 'لوحة التحكم', titleEn: 'Dashboard', descAr: 'راجع رصيد الصندوق والعمليات المطلوبة اليوم', descEn: 'Review cash box balance and today\'s operations', action: 'review', targetPath: '/dashboard', actionHintAr: 'افتح لوحة التحكم لمعرفة رصيد الصندوق', actionHintEn: 'Open dashboard to see cash box balance', icon: LayoutDashboard },
        { id: 'ca-2', titleAr: 'تسجيل تحصيل', titleEn: 'Record Collections', descAr: 'سجّل المبالغ المحصلة من المحصلين ومسؤولي القروض', descEn: 'Record amounts collected by collectors and officers', action: 'click', targetPath: '/collection', actionHintAr: 'اذهب إلى "التحصيل" وسجّل المبالغ الواردة', actionHintEn: 'Go to "Collection" and record incoming amounts', icon: Wallet, module: 'moduleCoreEdge' },
        { id: 'ca-3', titleAr: 'صرف القروض', titleEn: 'Disburse Loans', descAr: 'اصرف القروض المعتمدة للعملاء', descEn: 'Disburse approved loans to clients', action: 'click', targetPath: '/loans', actionHintAr: 'اذهب إلى "المحفظة" وانقر "صرف" بجانب القرض المعتمد', actionHintEn: 'Go to "Portfolio" and click "Disburse" next to approved loan', icon: Briefcase, module: 'moduleCoreBasic' },
        { id: 'ca-4', titleAr: 'المصروفات', titleEn: 'Record Expenses', descAr: 'سجّل المصروفات اليومية للفرع', descEn: 'Record daily branch expenses', action: 'write', targetPath: '/expenses', actionHintAr: 'اذهب إلى "المصروفات" وانقر "+ مصروف جديد"', actionHintEn: 'Go to "Expenses" and click "+ New Expense"', icon: Receipt, module: 'moduleCoreEdge' },
        { id: 'ca-5', titleAr: 'الإقفال اليومي', titleEn: 'Daily Closing', descAr: 'أقفل اليوم بعد عدّ النقدية الفعلية في الصندوق', descEn: 'Close the day after counting actual cash in box', action: 'click', targetPath: '/daily-closing', actionHintAr: 'اذهب إلى "الإقفال المالي"، أدخل عدد فئات العملة، ثم "تأكيد الإقفال"', actionHintEn: 'Go to "Financial Closing", fill denomination sheet, then "Confirm Close"', icon: Lock },
      ],
    },
  ],
  Accountant: [
    {
      phaseAr: 'الدورة المحاسبية',
      phaseEn: 'Accounting Cycle',
      steps: [
        { id: 'ac-1', titleAr: 'الدليل المحاسبي', titleEn: 'Chart of Accounts', descAr: 'راجع وأدر الدليل المحاسبي وقيود اليومية', descEn: 'Review and manage chart of accounts and journal entries', action: 'review', targetPath: '/finance', actionHintAr: 'اذهب إلى "المالية" لمراجعة الحسابات والقيود', actionHintEn: 'Go to "Finance/GL" to review accounts and entries', icon: Landmark, module: 'moduleCoreBasic' },
        { id: 'ac-2', titleAr: 'تسجيل قيود', titleEn: 'Record Journal Entries', descAr: 'سجّل القيود المحاسبية اليدوية والتسويات', descEn: 'Record manual journal entries and adjustments', action: 'write', targetPath: '/finance', actionHintAr: 'في صفحة المالية، انقر "قيود اليومية" ثم "قيد جديد"', actionHintEn: 'On Finance page, click "Journal Entries" then "New Entry"', icon: FileText, module: 'moduleCoreBasic' },
        { id: 'ac-3', titleAr: 'القوائم المالية', titleEn: 'Financial Statements', descAr: 'أعدّ ميزان المراجعة وقائمة الدخل والميزانية', descEn: 'Prepare trial balance, income statement, and balance sheet', action: 'review', targetPath: '/financial-statements', actionHintAr: 'اذهب إلى "القوائم المالية" لمراجعة التقارير', actionHintEn: 'Go to "Financial Statements" to review reports', icon: FileBarChart, module: 'moduleCoreBasic' },
        { id: 'ac-4', titleAr: 'مطابقة البنك', titleEn: 'Bank Reconciliation', descAr: 'طابق كشف حساب البنك مع السجلات المحاسبية', descEn: 'Reconcile bank statement with accounting records', action: 'click', targetPath: '/bank-reconciliation', actionHintAr: 'اذهب إلى "مطابقة البنك" وطابق الحركات', actionHintEn: 'Go to "Bank Reconciliation" and match transactions', icon: ArrowLeftRight },
        { id: 'ac-5', titleAr: 'الإقفال الشهري', titleEn: 'Monthly Closing', descAr: 'أجرِ الإقفال الشهري بعد مراجعة كل القيود', descEn: 'Perform monthly close after reviewing all entries', action: 'click', targetPath: '/daily-closing', actionHintAr: 'اذهب إلى "الإقفال المالي" > "شهري"، ثم "تحضير الإقفال"', actionHintEn: 'Go to "Financial Closing" > "Monthly", then "Prepare Closing"', icon: Lock },
      ],
    },
  ],
  Auditor: [
    {
      phaseAr: 'دورة التدقيق',
      phaseEn: 'Audit Cycle',
      steps: [
        { id: 'au-1', titleAr: 'سجل التدقيق', titleEn: 'Audit Trail', descAr: 'راجع سجل كل العمليات والتغييرات في النظام', descEn: 'Review the log of all system operations and changes', action: 'review', targetPath: '/audit-trail', actionHintAr: 'اذهب إلى "سجل التدقيق" لمراجعة كل الأحداث', actionHintEn: 'Go to "Audit Trail" to review all events', icon: FileBarChart },
        { id: 'au-2', titleAr: 'تقارير الاستثناءات', titleEn: 'Compliance Exceptions', descAr: 'راجع الاستثناءات والمخالفات الرقابية', descEn: 'Review compliance exceptions and violations', action: 'review', targetPath: '/compliance-exceptions', actionHintAr: 'اذهب إلى "تقارير الاستثناءات" للتحقق من المخالفات', actionHintEn: 'Go to "Compliance Exceptions" to check violations', icon: ShieldCheck },
        { id: 'au-3', titleAr: 'القوائم المالية', titleEn: 'Financial Statements', descAr: 'تحقق من صحة الأرقام في القوائم المالية', descEn: 'Verify the accuracy of financial statement figures', action: 'review', targetPath: '/financial-statements', actionHintAr: 'اذهب إلى "القوائم المالية" وتحقق من الأرقام', actionHintEn: 'Go to "Financial Statements" and verify figures', icon: FileBarChart },
        { id: 'au-4', titleAr: 'تحليل المحفظة', titleEn: 'Portfolio Analysis', descAr: 'حلّل أعمار المحفظة والقروض المعرضة للمخاطر', descEn: 'Analyze portfolio aging and loans at risk', action: 'review', targetPath: '/loan-aging', actionHintAr: 'اذهب إلى "تحليل الأعمار" لمراجعة PAR', actionHintEn: 'Go to "Loan Aging" to review PAR analysis', icon: BarChart3 },
      ],
    },
  ],
  FinancialController: [
    {
      phaseAr: 'الرقابة المالية',
      phaseEn: 'Financial Control',
      steps: [
        { id: 'fc-1', titleAr: 'لوحة التحكم', titleEn: 'Dashboard', descAr: 'اطلع على المؤشرات المالية الرئيسية', descEn: 'Review key financial indicators', action: 'review', targetPath: '/dashboard', actionHintAr: 'افتح لوحة التحكم لمراجعة المؤشرات', actionHintEn: 'Open dashboard to review indicators', icon: LayoutDashboard },
        { id: 'fc-2', titleAr: 'القوائم المالية', titleEn: 'Financial Statements', descAr: 'راجع واعتمد القوائم المالية الشهرية والربع سنوية', descEn: 'Review and approve monthly/quarterly financial statements', action: 'review', targetPath: '/financial-statements', actionHintAr: 'اذهب إلى "القوائم المالية" للمراجعة والاعتماد', actionHintEn: 'Go to "Financial Statements" for review and approval', icon: FileBarChart },
        { id: 'fc-3', titleAr: 'تقارير الرقابة', titleEn: 'FRA Reports', descAr: 'أعدّ وراجع التقارير الرقابية المطلوبة من هيئة الرقابة', descEn: 'Prepare and review reports required by the regulator', action: 'review', targetPath: '/fra-reports', actionHintAr: 'اذهب إلى "تقارير الرقابة" لإعداد التقارير', actionHintEn: 'Go to "FRA Reports" to prepare reports', icon: FileBarChart },
        { id: 'fc-4', titleAr: 'الإقفال المالي', titleEn: 'Financial Closing', descAr: 'أشرف على الإقفالات الشهرية والربع سنوية والسنوية', descEn: 'Oversee monthly, quarterly, and annual closings', action: 'click', targetPath: '/daily-closing', actionHintAr: 'اذهب إلى "الإقفال المالي" للإشراف على الإقفالات', actionHintEn: 'Go to "Financial Closing" to oversee closings', icon: Lock },
        { id: 'fc-5', titleAr: 'الموافقات', titleEn: 'Approvals', descAr: 'وافق على العمليات المالية التي تحتاج صلاحيتك', descEn: 'Approve financial operations requiring your authority', action: 'click', targetPath: '/approvals', actionHintAr: 'اذهب إلى "الموافقات" واتخذ القرار', actionHintEn: 'Go to "Approvals" and make decisions', icon: ShieldCheck },
      ],
    },
  ],
  CFO: [
    {
      phaseAr: 'القيادة المالية',
      phaseEn: 'Financial Leadership',
      steps: [
        { id: 'cfo-1', titleAr: 'لوحة التحكم', titleEn: 'Strategic Dashboard', descAr: 'اطلع على أداء الشركة الإجمالي والمؤشرات الاستراتيجية', descEn: 'View overall company performance and strategic indicators', action: 'review', targetPath: '/dashboard', actionHintAr: 'افتح لوحة التحكم للاطلاع على الأداء الكلي', actionHintEn: 'Open dashboard for overall performance view', icon: LayoutDashboard },
        { id: 'cfo-2', titleAr: 'تحليلات المحفظة', titleEn: 'Portfolio Analytics', descAr: 'حلّل اتجاهات المحفظة والمخاطر الائتمانية', descEn: 'Analyze portfolio trends and credit risks', action: 'review', targetPath: '/portfolio-analytics', actionHintAr: 'اذهب إلى "تحليلات المحفظة" للتحليل المعمق', actionHintEn: 'Go to "Portfolio Analytics" for deep analysis', icon: PieChart },
        { id: 'cfo-3', titleAr: 'القوائم المالية', titleEn: 'Financial Statements', descAr: 'راجع واعتمد القوائم المالية النهائية', descEn: 'Review and finalize financial statements', action: 'review', targetPath: '/financial-statements', actionHintAr: 'اذهب إلى "القوائم المالية" للمراجعة النهائية', actionHintEn: 'Go to "Financial Statements" for final review', icon: FileBarChart },
        { id: 'cfo-4', titleAr: 'معايير المخاطر', titleEn: 'Risk Criteria', descAr: 'عدّل معايير المخاطر وحدود التعرض', descEn: 'Adjust risk criteria and exposure limits', action: 'click', targetPath: '/risk-criteria', actionHintAr: 'اذهب إلى "معايير المخاطر" لتعديل الحدود', actionHintEn: 'Go to "Risk Criteria" to adjust limits', icon: ShieldCheck },
        { id: 'cfo-5', titleAr: 'الموافقات العليا', titleEn: 'Senior Approvals', descAr: 'وافق على العمليات الكبرى والاستثنائية', descEn: 'Approve major and exceptional operations', action: 'click', targetPath: '/approvals', actionHintAr: 'اذهب إلى "الموافقات" للقرارات النهائية', actionHintEn: 'Go to "Approvals" for final decisions', icon: ShieldCheck },
      ],
    },
  ],
  DataEntry: [
    {
      phaseAr: 'إدخال البيانات',
      phaseEn: 'Data Entry',
      steps: [
        { id: 'de-1', titleAr: 'تسجيل العملاء', titleEn: 'Register Clients', descAr: 'أدخل بيانات العملاء الجدد في النظام', descEn: 'Enter new client data into the system', action: 'write', targetPath: '/clients', actionHintAr: 'اذهب إلى "العملاء" ثم "+ عميل جديد" وأدخل البيانات', actionHintEn: 'Go to "Clients" then "+ New Client" and fill data', icon: Users },
        { id: 'de-2', titleAr: 'تقديم طلبات تمويل', titleEn: 'Submit Applications', descAr: 'أنشئ طلبات تمويل بناءً على بيانات العملاء', descEn: 'Create loan applications based on client data', action: 'write', targetPath: '/loan-requests', actionHintAr: 'اذهب إلى "طلبات التمويل" ثم "+ طلب جديد"', actionHintEn: 'Go to "Loan Requests" then "+ New Request"', icon: FileText },
        { id: 'de-3', titleAr: 'حاسبة التمويل', titleEn: 'Loan Calculator', descAr: 'استخدم الحاسبة لتحديد الأقساط المناسبة', descEn: 'Use calculator to determine suitable installments', action: 'write', targetPath: '/calculator', actionHintAr: 'اذهب إلى "حاسبة التمويل" وأدخل بيانات القرض', actionHintEn: 'Go to "Loan Calculator" and enter loan data', icon: Calculator },
      ],
    },
  ],
};

const ACTION_ICONS: Record<ActionType, any> = {
  click: MousePointerClick,
  write: Pencil,
  review: Eye,
  navigate: ArrowRight,
};

const ACTION_LABELS: Record<ActionType, { ar: string; en: string }> = {
  click: { ar: 'انقر', en: 'Click' },
  write: { ar: 'أدخل بيانات', en: 'Enter Data' },
  review: { ar: 'راجع', en: 'Review' },
  navigate: { ar: 'انتقل إلى', en: 'Navigate' },
};

export default function WorkflowGuide() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const role = user?.role || '';
  const userModules = user?.modules as Record<string, boolean> | undefined;
  const isSuperAdmin = role === 'SuperAdmin';
  const workflowRole = isSuperAdmin ? 'TenantAdmin' : role;
  const rawPhases = ROLE_WORKFLOWS[workflowRole] || [];
  const phases = rawPhases.map(phase => ({
    ...phase,
    steps: phase.steps.filter(step => {
      if (!step.module) return true;
      if (isSuperAdmin) return true;
      return userModules && userModules[step.module] === true;
    }),
  })).filter(phase => phase.steps.length > 0);
  const allSteps = phases.flatMap(p => p.steps);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [tourActive, setTourActive] = useState(false);

  const toggleComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const progress = allSteps.length > 0 ? Math.round((completedSteps.size / allSteps.length) * 100) : 0;

  const roleLabels: Record<string, { ar: string; en: string }> = {
    TenantAdmin: { ar: 'مدير النظام', en: 'Tenant Admin' },
    BranchManager: { ar: 'مدير الفرع', en: 'Branch Manager' },
    LoanOfficer: { ar: 'مسؤول القروض', en: 'Loan Officer' },
    CollectionOfficer: { ar: 'مسؤول التحصيل', en: 'Collection Officer' },
    Cashier: { ar: 'أمين الصندوق', en: 'Cashier' },
    Accountant: { ar: 'المحاسب', en: 'Accountant' },
    Auditor: { ar: 'المدقق', en: 'Auditor' },
    FinancialController: { ar: 'المراقب المالي', en: 'Financial Controller' },
    CFO: { ar: 'المدير المالي', en: 'CFO' },
    DataEntry: { ar: 'مدخل البيانات', en: 'Data Entry' },
    SuperAdmin: { ar: 'مدير المنصة', en: 'Super Admin' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap size={24} className="text-primary" />
            {t('دليل سير العمل', 'Workflow Guide')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? t('عرض دورة العمل كمدير النظام', 'Viewing workflow as Tenant Admin')
              : t(`دورة العمل الكاملة لـ ${roleLabels[role]?.ar || role}`, `Complete workflow for ${roleLabels[role]?.en || role}`)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {t('التقدم', 'Progress')}: <span className="font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {completedSteps.size > 0 && (
            <button
              onClick={() => setCompletedSteps(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw size={12} /> {t('إعادة', 'Reset')}
            </button>
          )}
        </div>
      </div>

      {!tourActive ? (
        <>
          {phases.map((phase, phaseIdx) => (
            <div key={phaseIdx} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center border border-primary/30">
                  {phaseIdx + 1}
                </div>
                {t(phase.phaseAr, phase.phaseEn)}
              </h3>
              <div className="grid gap-3">
                {phase.steps.map((step, stepIdx) => {
                  const globalIdx = phases.slice(0, phaseIdx).reduce((s, p) => s + p.steps.length, 0) + stepIdx;
                  const isDone = completedSteps.has(step.id);
                  const ActionIcon = ACTION_ICONS[step.action];
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "premium-card p-4 transition-all duration-200",
                        isRtl ? "border-r-4" : "border-l-4",
                        isDone ? (isRtl ? "border-r-green-500" : "border-l-green-500") + " bg-green-500/5" : (isRtl ? "border-r-primary/30 hover:border-r-primary" : "border-l-primary/30 hover:border-l-primary") + " hover:shadow-lg"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleComplete(step.id)}
                          className="mt-0.5 shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 size={22} className="text-green-500" />
                          ) : (
                            <Circle size={22} className="text-muted-foreground/40 hover:text-primary transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <step.icon size={16} className="text-primary shrink-0" />
                            <span className={cn("font-bold", isDone && "line-through text-muted-foreground")}>
                              {t(step.titleAr, step.titleEn)}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              step.action === 'click' ? 'bg-red-500/15 text-red-400' :
                              step.action === 'write' ? 'bg-blue-500/15 text-blue-400' :
                              'bg-amber-500/15 text-amber-400'
                            )}>
                              <ActionIcon size={10} className="inline me-1" />
                              {t(ACTION_LABELS[step.action].ar, ACTION_LABELS[step.action].en)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{t(step.descAr, step.descEn)}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500 shrink-0 animate-pulse">
                                <path d="M12 2L8 10H2L7 14L5 22L12 17L19 22L17 14L22 10H16L12 2Z" fill="currentColor" />
                              </svg>
                              <span className="text-red-400 font-medium">{t(step.actionHintAr, step.actionHintEn)}</span>
                            </div>
                            <button
                              onClick={() => { setCurrentStep(globalIdx); setTourActive(true); }}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                            >
                              <Play size={12} /> {t('ابدأ الخطوة', 'Start Step')}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setLocation(step.targetPath)}
                          className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
                          title={t('انتقل مباشرة', 'Go directly')}
                        >
                          <ChevronRight size={16} className={cn("text-muted-foreground", isRtl && "rotate-180")} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      ) : (
        <InteractiveTour
          steps={allSteps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onComplete={(stepId) => {
            toggleComplete(stepId);
            if (currentStep < allSteps.length - 1) {
              setCurrentStep(currentStep + 1);
            } else {
              setTourActive(false);
            }
          }}
          onExit={() => setTourActive(false)}
          onNavigate={setLocation}
        />
      )}
    </div>
  );
}

function InteractiveTour({
  steps, currentStep, onStepChange, onComplete, onExit, onNavigate,
}: {
  steps: TourStep[];
  currentStep: number;
  onStepChange: (idx: number) => void;
  onComplete: (stepId: string) => void;
  onExit: () => void;
  onNavigate: (path: string) => void;
}) {
  const { t, isRtl } = useLanguage();
  const step = steps[currentStep];
  if (!step) return null;
  const ActionIcon = ACTION_ICONS[step.action];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t('الخطوة', 'Step')} <span className="font-bold text-primary">{currentStep + 1}</span> {t('من', 'of')} {steps.length}
        </div>
        <button onClick={onExit} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          {t('إنهاء الجولة', 'Exit Tour')}
        </button>
      </div>

      <div className="flex gap-1">
        {steps.map((_, idx) => (
          <div
            key={idx}
            onClick={() => onStepChange(idx)}
            className={cn(
              "h-1.5 flex-1 rounded-full cursor-pointer transition-all",
              idx === currentStep ? "bg-primary" : idx < currentStep ? "bg-green-500" : "bg-secondary"
            )}
          />
        ))}
      </div>

      <div className="premium-card p-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <step.icon size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t(step.titleAr, step.titleEn)}</h3>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                step.action === 'click' ? 'bg-red-500/15 text-red-400' :
                step.action === 'write' ? 'bg-blue-500/15 text-blue-400' :
                'bg-amber-500/15 text-amber-400'
              )}>
                <ActionIcon size={10} className="inline me-1" />
                {t(ACTION_LABELS[step.action].ar, ACTION_LABELS[step.action].en)}
              </span>
            </div>
          </div>

          <p className="text-muted-foreground mb-6 text-lg">{t(step.descAr, step.descEn)}</p>

          <div className="relative p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/30 mb-6">
            <div className={cn("absolute -top-3", isRtl ? "right-4" : "left-4")}>
              <div className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-red-500/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-bounce">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('إجراء مطلوب', 'Action Required')}
              </div>
            </div>
            <div className="flex items-start gap-3 mt-1">
              <div className="shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/40">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <p className="text-red-300 font-medium text-base leading-relaxed">{t(step.actionHintAr, step.actionHintEn)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigate(step.targetPath)}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <ArrowRight size={16} className={isRtl ? "rotate-180" : ""} />
              {t('انتقل إلى الصفحة', 'Go to Page')}
            </button>
            <button
              onClick={() => onComplete(step.id)}
              className="px-6 py-3 rounded-xl bg-green-600 text-white font-medium flex items-center gap-2 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all"
            >
              <CheckCircle2 size={16} />
              {t('تم — الخطوة التالية', 'Done — Next Step')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
        >
          <ChevronLeft size={14} className={isRtl ? "rotate-180" : ""} />
          {t('السابق', 'Previous')}
        </button>
        <div className="flex gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onStepChange(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-bold transition-all",
                idx === currentStep ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30" :
                idx < currentStep ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                "bg-secondary text-muted-foreground"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
        >
          {t('التالي', 'Next')}
          <ChevronRight size={14} className={isRtl ? "rotate-180" : ""} />
        </button>
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { useListTenants, useCreateTenant, useUpdateTenant, getListTenantsQueryKey } from '@workspace/api-client-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { formatDate, cn } from '@/lib/utils';
import {
  Building2, Plus, ShieldCheck, Mail, Loader2, CheckCircle2, XCircle,
  Settings, CreditCard, Package, Layers, Landmark, FileCheck2, PiggyBank, UserCheck,
  Users, Pencil, KeyRound, Phone, User, Badge, UserCog,
  ToggleLeft, ToggleRight, Eye, EyeOff, DollarSign, Receipt, Percent,
  TrendingUp, AlertTriangle, BarChart3, Save, Activity, PieChart,
  Globe, ClipboardList, Bell, Shield, Send,
  Umbrella, Building, RefreshCw, ScanLine, MessageCircle, Smartphone, Wallet,
  Brain, Target, Coins, LineChart, Zap, FileSearch, BotMessageSquare, UserMinus,
  Scale, FileBarChart, Search, Lock, Fingerprint, FileSpreadsheet,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart as RPieChart, Pie, Cell, Legend, LineChart as RLineChart, Line,
} from 'recharts';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('neo_fmc_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> || {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function ToggleSwitch({ enabled, onChange, label, disabled }: { enabled: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-2">
      <span className="text-sm flex-1">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-12 h-7 rounded-full transition-colors shrink-0",
          enabled ? "bg-primary" : "bg-secondary border border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-6" : "translate-x-1")} />
      </button>
    </label>
  );
}

const MODULE_DEFINITIONS = [
  {
    key: 'moduleCoreBasic', icon: Package, color: 'blue',
    nameAr: 'النظام المالي الأساسي', nameEn: 'Core Finance - Basic',
    descAr: 'المنتجات التمويلية، نشأة القروض، إدارة القروض، دفتر الأستاذ العام، التحصيل الإلكتروني، إدارة المحفظة',
    descEn: 'Fund Products, LOS, LMS, General Ledger, E-Payment Integration, Portfolio Management',
    features: [
      { groupAr: 'المنتجات التمويلية', groupEn: 'Fund Products', items: [
        { ar: 'تعريف المنتجات وإضافة الرسوم والعمولات', en: 'Product definition with fees, charges & commissions' },
        { ar: 'احتساب الفائدة وفقاً لمبادئ الإقراض المسؤول', en: 'Interest calculation per responsible lending principles' },
        { ar: 'التحكم بخطوات سير العمل حسب شريحة المبلغ', en: 'Workflow steps control by loan amount segment' },
        { ar: 'جدول الأقساط الشهري واليومي', en: 'Monthly & daily amortization schedules' },
        { ar: 'دعم الفائدة الصفرية والجزاءات التلقائية', en: 'Zero interest support & automated penalties' },
      ]},
      { groupAr: 'نشأة القروض (LOS)', groupEn: 'Loan Origination (LOS)', items: [
        { ar: 'سير عمل طلبات القروض', en: 'Loan request workflow module' },
        { ar: 'رفع وإدارة المستندات المطلوبة حسب المنتج', en: 'Upload & manage documents per fund product' },
      ]},
      { groupAr: 'إدارة القروض (LMS)', groupEn: 'Loan Management (LMS)', items: [
        { ar: 'الصرف والسداد المبكر والإغلاق الكامل', en: 'Disbursement, early payment & full closure' },
        { ar: 'تحصيل يدوي أو رفع ملف Excel', en: 'Manual collection or Excel file upload' },
        { ar: 'تأجيل الأقساط وشطب الديون (وفاة/عجز كلي)', en: 'Postpone installments & write-off (death/disability)' },
      ]},
      { groupAr: 'دفتر الأستاذ العام', groupEn: 'General Ledger', items: [
        { ar: 'إنشاء حسابات العملاء وتتبع المعاملات تلقائياً', en: 'Auto-generate customer accounts & track transactions' },
        { ar: 'قيود يومية لجميع العمليات المالية', en: 'Journal entries for all financial transactions' },
      ]},
    ]
  },
  {
    key: 'moduleCoreEdge', icon: Layers, color: 'violet',
    nameAr: 'النظام المالي المتقدم (Edge)', nameEn: 'Core Finance - Edge',
    descAr: 'سير عمل متقدم، قوائم سوداء، مصروفات وإيرادات، إدارة التحصيل، شطب متقدم',
    descEn: 'Advanced workflows, Blacklists, Expenses & Revenue, Collection, Advanced Write-off',
    features: [
      { groupAr: 'إدارة سير العمل', groupEn: 'Workflow Administration', items: [
        { ar: 'إضافة أو حذف خطوات سير العمل', en: 'Add/remove workflow steps' },
        { ar: 'التحكم بصلاحيات المستخدمين حسب الدور والمرحلة', en: 'Role & step-based action control' },
      ]},
      { groupAr: 'المصروفات والإيرادات', groupEn: 'Expenses & Revenue', items: [
        { ar: 'تسجيل وتتبع المصروفات والإيرادات التشغيلية', en: 'Record & track operational expenses/revenue' },
        { ar: 'حدود إنفاق شهرية/سنوية لكل فرع', en: 'Monthly/yearly spending limits per branch' },
      ]},
    ]
  },
  {
    key: 'moduleAdvancedLending', icon: Landmark, color: 'amber',
    nameAr: 'الإقراض المتقدم', nameEn: 'Advanced Lending',
    descAr: 'إدارة الحدود الائتمانية، القروض المتزامنة، طلبات القروض بالجملة، التوزيع الجماعي',
    descEn: 'Credit limits, concurrent loans, bulk loan requests, bulk distribution',
    features: [
      { groupAr: 'المنتجات التمويلية', groupEn: 'Fund Products', items: [
        { ar: 'إدارة الحدود الائتمانية', en: 'Credit limit management' },
        { ar: 'إدارة القروض المتزامنة', en: 'Concurrent loan management' },
      ]},
    ]
  },
  {
    key: 'moduleFinancialSettlements', icon: FileCheck2, color: 'emerald',
    nameAr: 'التسويات المالية', nameEn: 'Financial Settlements',
    descAr: 'شيكات مؤجلة، تحويلات بنكية، تسوية نقدية وعمولات',
    descEn: 'Post-Dated Cheques, Wire Transfers, Cash Settlements & Commissions',
    features: [
      { groupAr: 'سير عمل الشيكات المؤجلة', groupEn: 'Post-Dated Cheques Workflow', items: [
        { ar: 'إدارة دورة حياة الشيكات المؤجلة', en: 'Post-dated cheque lifecycle management' },
      ]},
    ]
  },
  {
    key: 'moduleSavings', icon: PiggyBank, color: 'teal',
    nameAr: 'الادخار والودائع', nameEn: 'Savings & Deposits',
    descAr: 'منتجات الادخار، إدارة الحسابات، الادخار الإلزامي، تتبع المعاملات',
    descEn: 'Savings Products, Account Management, Compulsory Savings, Transaction Tracking',
    features: [
      { groupAr: 'إدارة الادخار', groupEn: 'Savings Management', items: [
        { ar: 'منتجات ادخار متعددة (طوعي، إلزامي، ثابت، جماعي)', en: 'Multiple savings product types (Voluntary, Mandatory, Fixed, Group)' },
        { ar: 'خصم ادخار إلزامي تلقائي عند سداد الأقساط', en: 'Auto-deduct compulsory savings on loan payment' },
      ]},
    ]
  },
  {
    key: 'moduleHRPayroll', icon: UserCheck, color: 'rose',
    nameAr: 'الموارد البشرية والرواتب', nameEn: 'HR & Payroll',
    descAr: 'إدارة الموظفين، مسيرات الرواتب، إدارة الإجازات، مطالبات المصروفات، بوابة الخدمة الذاتية',
    descEn: 'Employee Management, Payroll Processing, Leave Management, Expense Claims, Self-Service Portal',
    features: [
      { groupAr: 'إدارة الموظفين', groupEn: 'Employee Management', items: [
        { ar: 'سجل الموظفين مع حقول التأمينات الاجتماعية المصرية', en: 'Employee master with Egyptian social insurance fields' },
        { ar: 'ربط تلقائي بين المستخدمين والموظفين', en: 'Auto-link system users to employee records' },
      ]},
      { groupAr: 'الرواتب', groupEn: 'Payroll', items: [
        { ar: 'معالجة الرواتب مع شرائح الضريبة المصرية', en: 'Payroll processing with Egyptian income tax brackets' },
        { ar: 'حساب التأمينات الاجتماعية (11% موظف، 18.75% صاحب عمل)', en: 'Social insurance calculation (11% employee, 18.75% employer)' },
      ]},
      { groupAr: 'الإجازات والمصروفات', groupEn: 'Leave & Expenses', items: [
        { ar: 'إدارة طلبات الإجازات مع خصم الرصيد', en: 'Leave request management with balance deduction' },
        { ar: 'مطالبات مصروفات الموظفين مع سير عمل الموافقة', en: 'Employee expense claims with approval workflow' },
      ]},
      { groupAr: 'الخدمة الذاتية', groupEn: 'Self-Service Portal', items: [
        { ar: 'بوابة خدمة ذاتية للموظفين (الملف الشخصي، كشوف الرواتب، الإجازات، المصروفات)', en: 'Employee self-service portal (profile, payslips, leaves, expenses)' },
      ]},
    ]
  },
  {
    key: 'moduleInsurance', icon: Umbrella, color: 'cyan',
    nameAr: 'التأمين على الائتمان', nameEn: 'Credit Life Insurance',
    descAr: 'منتجات التأمين، حساب الأقساط، المطالبات',
    descEn: 'Insurance products, premium calculation, claims processing',
    features: [
      { groupAr: 'التأمين', groupEn: 'Insurance', items: [
        { ar: 'تعريف منتجات التأمين وربطها بالقروض', en: 'Define insurance products linked to loans' },
        { ar: 'حساب الأقساط وتوزيعها على الأقساط', en: 'Premium calculation distributed across installments' },
        { ar: 'سير عمل المطالبات التأمينية', en: 'Claims processing workflow' },
      ]},
    ]
  },
  {
    key: 'moduleAgentBanking', icon: Building, color: 'indigo',
    nameAr: 'الوكلاء المصرفيون', nameEn: 'Agent Banking',
    descAr: 'تسجيل الوكلاء، إدارة السيولة، تتبع العمولات',
    descEn: 'Agent registration, float management, commission tracking',
    features: [
      { groupAr: 'الوكلاء', groupEn: 'Agents', items: [
        { ar: 'تسجيل وإدارة الوكلاء', en: 'Agent registration and management' },
        { ar: 'إدارة السيولة (float) وحدودها', en: 'Float management with limits' },
        { ar: 'تتبع العمولات والتسويات', en: 'Commission tracking and reconciliation' },
      ]},
    ]
  },
  {
    key: 'moduleLoanRestructuring', icon: RefreshCw, color: 'orange',
    nameAr: 'إعادة هيكلة القروض', nameEn: 'Loan Restructuring',
    descAr: 'فترات سماح، تمديد المدة، تعديل الأسعار، رسملة المتأخرات',
    descEn: 'Grace periods, term extensions, rate modifications, capitalized arrears',
    features: [
      { groupAr: 'إعادة الهيكلة', groupEn: 'Restructuring', items: [
        { ar: 'محاكاة سيناريوهات إعادة الهيكلة', en: 'Restructuring scenario simulation' },
        { ar: 'تتبع المرحلة وفقاً لمعيار IFRS 9', en: 'IFRS 9 stage migration tracking (12-month Stage 2 minimum)' },
        { ar: 'رسملة المتأخرات وإعادة جدولة', en: 'Capitalize arrears and reschedule' },
      ]},
    ]
  },
  {
    key: 'moduleOCR', icon: ScanLine, color: 'slate',
    nameAr: 'معالجة المستندات بالذكاء الاصطناعي', nameEn: 'OCR Document Processing',
    descAr: 'استخراج بيانات الرقم القومي، تصنيف المستندات، تنبيهات انتهاء الصلاحية',
    descEn: 'National ID extraction, document classification, expiry alerts',
    features: [
      { groupAr: 'المستندات', groupEn: 'Documents', items: [
        { ar: 'استخراج بيانات بطاقة الرقم القومي تلقائياً', en: 'Auto-extract National ID data' },
        { ar: 'تصنيف المستندات تلقائياً', en: 'Automated document classification' },
        { ar: 'تنبيهات انتهاء صلاحية المستندات', en: 'Document expiry alerts' },
      ]},
    ]
  },
  {
    key: 'moduleWhatsApp', icon: MessageCircle, color: 'green',
    nameAr: 'واتساب بيزنس', nameEn: 'WhatsApp Business',
    descAr: 'تذكيرات، إيصالات، متابعات عبر واتساب',
    descEn: 'Reminders, receipts, follow-ups via WhatsApp Business API',
    features: [
      { groupAr: 'واتساب', groupEn: 'WhatsApp', items: [
        { ar: 'إرسال تذكيرات السداد عبر واتساب', en: 'Payment reminders via WhatsApp' },
        { ar: 'إرسال إيصالات ومتابعات جماعية', en: 'Bulk receipts and follow-ups' },
        { ar: 'سجل الرسائل المرسلة', en: 'Message history tracking' },
      ]},
    ]
  },
  {
    key: 'moduleMobileField', icon: Smartphone, color: 'sky',
    nameAr: 'تطبيق الميدان', nameEn: 'Mobile Field App (PWA)',
    descAr: 'عمل ميداني بدون إنترنت، تحصيل، زيارات، طباعة إيصالات',
    descEn: 'Offline field work, collection, visits, receipt printing',
    features: [
      { groupAr: 'الميدان', groupEn: 'Field', items: [
        { ar: 'العمل بدون اتصال ومزامنة تلقائية', en: 'Offline work with auto-sync' },
        { ar: 'تحصيل ميداني مع GPS وصور', en: 'Field collection with GPS and photos' },
      ]},
    ]
  },
  {
    key: 'moduleClientApp', icon: User, color: 'purple',
    nameAr: 'تطبيق العميل الرقمي', nameEn: 'Digital Client App',
    descAr: 'بوابة العملاء لعرض الأرصدة والسداد',
    descEn: 'Client portal for balances and payments',
    features: [
      { groupAr: 'العميل', groupEn: 'Client', items: [
        { ar: 'عرض أرصدة القروض وجدول الأقساط', en: 'View loan balances and schedule' },
        { ar: 'سداد عبر المحافظ الإلكترونية', en: 'Payment via mobile wallets' },
      ]},
    ]
  },
  {
    key: 'moduleMobileWallet', icon: Wallet, color: 'lime',
    nameAr: 'المحافظ الإلكترونية', nameEn: 'Mobile Wallet Integration',
    descAr: 'فودافون كاش، اورنج موني، انستاباي، ميزة',
    descEn: 'Vodafone Cash, Orange Money, InstaPay, Meeza',
    features: [
      { groupAr: 'المحافظ', groupEn: 'Wallets', items: [
        { ar: 'تحصيل وصرف عبر 5 مزودين', en: 'Collection and disbursement via 5 providers' },
        { ar: 'تسوية تلقائية وتتبع المعاملات', en: 'Auto-reconciliation and transaction tracking' },
      ]},
    ]
  },
  {
    key: 'moduleAICollection', icon: Target, color: 'red',
    nameAr: 'تحصيل ذكي بالذكاء الاصطناعي', nameEn: 'AI Collection Optimization',
    descAr: 'توجيه ذكي، استراتيجية اتصال مثلى، تتبع الوعود',
    descEn: 'Smart routing, optimal contact strategy, promise tracking',
    features: [
      { groupAr: 'التحصيل الذكي', groupEn: 'Smart Collection', items: [
        { ar: 'ترتيب أولويات التحصيل بالذكاء الاصطناعي', en: 'AI-powered collection prioritization' },
        { ar: 'توصية بقناة وتوقيت الاتصال الأمثل', en: 'Optimal channel and timing recommendation' },
        { ar: 'تتبع وعود السداد', en: 'Payment promise tracking' },
      ]},
    ]
  },
  {
    key: 'moduleDynamicPricing', icon: Coins, color: 'yellow',
    nameAr: 'التسعير الديناميكي', nameEn: 'Dynamic Loan Pricing',
    descAr: 'أسعار فائدة معدلة حسب المخاطر ضمن حدود البنك المركزي',
    descEn: 'Risk-adjusted interest rates within CBE caps',
    features: [
      { groupAr: 'التسعير', groupEn: 'Pricing', items: [
        { ar: 'أسعار فائدة ديناميكية حسب الجدارة الائتمانية', en: 'Dynamic rates based on creditworthiness' },
        { ar: 'الالتزام بحد البنك المركزي 30%', en: 'CBE 30% cap enforcement' },
      ]},
    ]
  },
  {
    key: 'moduleCashFlowPrediction', icon: LineChart, color: 'fuchsia',
    nameAr: 'التنبؤ بالتدفقات النقدية', nameEn: 'Cash Flow Prediction',
    descAr: 'توقع الاحتياجات النقدية اليومية للفرع',
    descEn: 'Branch daily cash needs prediction',
    features: [
      { groupAr: 'التنبؤ', groupEn: 'Prediction', items: [
        { ar: 'توقع التحصيل والصرف اليومي', en: 'Daily collection and disbursement forecasting' },
        { ar: 'تخطيط الخزينة الأمثل', en: 'Optimal vault planning' },
      ]},
    ]
  },
  {
    key: 'moduleAIStressTesting', icon: Zap, color: 'pink',
    nameAr: 'اختبارات الضغط بالذكاء الاصطناعي', nameEn: 'AI Stress Testing',
    descAr: 'سيناريوهات اقتصادية، مونت كارلو، تحليل ماذا لو',
    descEn: 'Economic scenarios, Monte Carlo, what-if analysis',
    features: [
      { groupAr: 'اختبارات الضغط', groupEn: 'Stress Testing', items: [
        { ar: '8 سيناريوهات معدة مسبقاً (تضخم، عملة، جائحة، إلخ)', en: '8 pre-built scenarios (inflation, currency, pandemic, etc.)' },
        { ar: 'تأثير على PAR و ECL ونسبة التحصيل', en: 'Impact on PAR, ECL, and collection rate' },
      ]},
    ]
  },
  {
    key: 'moduleNLPReporting', icon: BotMessageSquare, color: 'stone',
    nameAr: 'التقارير السردية (NLP)', nameEn: 'NLP Reporting',
    descAr: 'توليد تقارير سردية جاهزة لمجلس الإدارة بالعربية والإنجليزية',
    descEn: 'Narrative report generation in AR/EN, board-ready summaries',
    features: [
      { groupAr: 'التقارير', groupEn: 'Reporting', items: [
        { ar: 'ملخصات أداء المحفظة بلغة طبيعية', en: 'Natural language portfolio summaries' },
        { ar: 'تنبيهات ذكية عند تجاوز نسب المخاطر', en: 'Smart alerts when risk thresholds exceeded' },
      ]},
    ]
  },
  {
    key: 'moduleChurnPrediction', icon: UserMinus, color: 'zinc',
    nameAr: 'التنبؤ بالعملاء المهددين', nameEn: 'Churn Prediction & Cross-Sell',
    descAr: 'توقع فقدان العملاء وتوصيات البيع المتقاطع',
    descEn: 'Client churn prediction with cross-sell recommendations',
    features: [
      { groupAr: 'التنبؤ', groupEn: 'Prediction', items: [
        { ar: 'نموذج تنبؤ بفقدان العملاء', en: 'Client churn prediction model' },
        { ar: 'توصيات بيع متقاطع (قروض أكبر، ادخار، تأمين)', en: 'Cross-sell recommendations (larger loans, savings, insurance)' },
      ]},
    ]
  },
  {
    key: 'moduleIFRS9', icon: Scale, color: 'emerald',
    nameAr: 'IFRS 9 والمخصصات', nameEn: 'IFRS 9 Provisions',
    descAr: 'حساب المخصصات وفقاً للمعيار الدولي للتقارير المالية',
    descEn: 'Expected Credit Loss calculation per international standards',
    features: [
      { groupAr: 'IFRS 9', groupEn: 'IFRS 9', items: [
        { ar: 'حساب الخسائر الائتمانية المتوقعة', en: 'ECL computation with stage classification' },
        { ar: 'تقارير المخصصات التنظيمية', en: 'Regulatory provisions reporting' },
      ]},
    ]
  },
  {
    key: 'moduleAIRisk', icon: Brain, color: 'violet',
    nameAr: 'محرك المخاطر الذكي', nameEn: 'AI Risk Engine',
    descAr: 'نموذج تسجيل ائتماني ذكي مع تحليل مخاطر متقدم',
    descEn: 'AI credit scoring with advanced risk analysis',
    features: [
      { groupAr: 'المخاطر', groupEn: 'Risk', items: [
        { ar: 'تسجيل ائتماني ذكي متعدد العوامل', en: 'Multi-factor AI credit scoring' },
        { ar: 'تحليل مخاطر مع توصيات آلية', en: 'Risk analysis with automated recommendations' },
      ]},
    ]
  },
  {
    key: 'moduleFRAReporting', icon: FileBarChart, color: 'blue',
    nameAr: 'تقارير الرقابة المالية (FRA)', nameEn: 'FRA Digital Reporting',
    descAr: 'تقارير ربع سنوية بصيغة FRA الرسمية',
    descEn: 'Quarterly reports in FRA official format',
    features: [
      { groupAr: 'الرقابة', groupEn: 'Regulatory', items: [
        { ar: 'تقارير ربع سنوية حسب نموذج FRA', en: 'Quarterly FRA template reports' },
        { ar: 'تصدير XML/Excel للتقديم الإلكتروني', en: 'XML/Excel export for digital submission' },
      ]},
    ]
  },
  {
    key: 'moduleIScorelive', icon: Search, color: 'amber',
    nameAr: 'I-Score مباشر', nameEn: 'I-Score Live Integration',
    descAr: 'استعلام مباشر وإعادة إبلاغ شهري للمكتب',
    descEn: 'Live credit bureau query and monthly reporting back',
    features: [
      { groupAr: 'I-Score', groupEn: 'I-Score', items: [
        { ar: 'استعلام ائتماني مباشر من I-Score', en: 'Live credit inquiry from I-Score' },
        { ar: 'إعادة إبلاغ شهري لبيانات السداد', en: 'Monthly repayment data reporting back to bureau' },
      ]},
    ]
  },
  {
    key: 'modulePDPL', icon: Lock, color: 'rose',
    nameAr: 'حماية البيانات (PDPL)', nameEn: 'Data Protection (PDPL)',
    descAr: 'الامتثال لقانون حماية البيانات الشخصية المصري',
    descEn: 'Egyptian Personal Data Protection Law compliance',
    features: [
      { groupAr: 'الخصوصية', groupEn: 'Privacy', items: [
        { ar: 'تشفير البيانات الشخصية AES-256-GCM', en: 'PII encryption with AES-256-GCM' },
        { ar: 'سجل الوصول والتوافق التنظيمي', en: 'Access log and regulatory compliance' },
      ]},
    ]
  },
  {
    key: 'moduleAML', icon: Shield, color: 'red',
    nameAr: 'مكافحة غسيل الأموال (AML)', nameEn: 'AML Screening',
    descAr: 'فحص العملاء ضد قوائم العقوبات',
    descEn: 'Customer screening against sanctions lists',
    features: [
      { groupAr: 'AML', groupEn: 'AML', items: [
        { ar: 'فحص آلي عند تسجيل العملاء', en: 'Automated screening on client registration' },
        { ar: 'مراقبة مستمرة للمعاملات المشبوهة', en: 'Continuous suspicious transaction monitoring' },
      ]},
    ]
  },
  {
    key: 'moduleEKYC', icon: Fingerprint, color: 'teal',
    nameAr: 'التحقق الإلكتروني (eKYC)', nameEn: 'Electronic KYC',
    descAr: 'التحقق من الهوية إلكترونياً',
    descEn: 'Electronic identity verification',
    features: [
      { groupAr: 'eKYC', groupEn: 'eKYC', items: [
        { ar: 'التحقق الآلي من بطاقة الرقم القومي', en: 'Automated National ID verification' },
        { ar: 'مطابقة الصور والبيانات البيومترية', en: 'Photo and biometric matching' },
      ]},
    ]
  },
  {
    key: 'moduleETA', icon: FileSpreadsheet, color: 'blue',
    nameAr: 'الفاتورة الإلكترونية (ETA)', nameEn: 'E-Invoice (ETA)',
    descAr: 'ربط مع منظومة الفواتير الإلكترونية',
    descEn: 'Integration with Egyptian Tax Authority e-invoicing',
    features: [
      { groupAr: 'ETA', groupEn: 'ETA', items: [
        { ar: 'إصدار فواتير إلكترونية تلقائياً', en: 'Automated e-invoice issuance' },
        { ar: 'التوقيع الإلكتروني والإرسال لمنظومة ETA', en: 'Digital signing and ETA submission' },
      ]},
    ]
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', badge: 'bg-blue-500' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', badge: 'bg-violet-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', badge: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', badge: 'bg-emerald-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', badge: 'bg-teal-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', badge: 'bg-rose-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', badge: 'bg-cyan-500' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', badge: 'bg-indigo-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', badge: 'bg-orange-500' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', badge: 'bg-slate-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', badge: 'bg-green-500' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', badge: 'bg-sky-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', badge: 'bg-purple-500' },
  lime: { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20', badge: 'bg-lime-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', badge: 'bg-red-500' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', badge: 'bg-yellow-500' },
  fuchsia: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', badge: 'bg-fuchsia-500' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', badge: 'bg-pink-500' },
  stone: { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/20', badge: 'bg-stone-500' },
  zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', badge: 'bg-zinc-500' },
};

const ROLES = ['TenantAdmin', 'BranchManager', 'LoanOfficer', 'CollectionOfficer', 'Cashier', 'Auditor', 'DataEntry', 'Accountant', 'FinancialController', 'CFO'];

const ROLE_COLORS: Record<string, string> = {
  TenantAdmin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  BranchManager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  LoanOfficer: 'bg-green-500/20 text-green-300 border-green-500/30',
  CollectionOfficer: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Cashier: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Auditor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DataEntry: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  Accountant: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  FinancialController: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  CFO: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

function UserRow({ user, tenantId, branches, onRefresh, onImpersonate, t, isRtl }: {
  user: any; tenantId: string; branches: any[]; onRefresh: () => void;
  onImpersonate: (user: any) => void;
  t: (ar: string, en: string) => string; isRtl: boolean;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [showPwdField, setShowPwdField] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ fullName: user.fullName, role: user.role, isActive: user.isActive, isSuperUser: user.isSuperUser || false, password: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body: any = { fullName: form.fullName, role: form.role, isActive: form.isActive, isSuperUser: form.isSuperUser };
      if (showPwdField && form.password) body.password = form.password;
      await apiFetch(`/tenants/${tenantId}/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث المستخدم', 'User updated') });
      setEditing(false);
      setShowPwdField(false);
      setForm({ ...form, password: '' });
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const roleColor = ROLE_COLORS[user.role] || 'bg-secondary text-muted-foreground border-border';

  if (editing) {
    return (
      <tr className="bg-primary/5">
        <td className="px-4 py-3" colSpan={5}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('الاسم', 'Full Name')}</label>
                <input className="premium-input text-sm py-1.5" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('الدور', 'Role')}</label>
                <select className="premium-input text-sm py-1.5" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('الحالة', 'Status')}</label>
                <select className="premium-input text-sm py-1.5" value={form.isActive ? '1' : '0'} onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}>
                  <option value="1">{t('نشط', 'Active')}</option>
                  <option value="0">{t('معطّل', 'Inactive')}</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isSuperUser} onChange={e => setForm({ ...form, isSuperUser: e.target.checked })} className="w-4 h-4 rounded border-border accent-primary" />
              <span className="text-xs font-medium text-muted-foreground">{t('مستخدم متميز', 'Super User')}</span>
            </label>
            {showPwdField ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('كلمة المرور الجديدة', 'New Password')}</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="premium-input text-sm py-1.5 pr-10" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} dir="ltr" />
                  <button type="button" className="absolute inset-y-0 right-3 flex items-center text-muted-foreground" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : t('حفظ', 'Save')}
              </button>
              <button onClick={() => { setEditing(false); setShowPwdField(false); setForm({ fullName: user.fullName, role: user.role, isActive: user.isActive, password: '' }); }} className="px-4 py-1.5 bg-secondary rounded-lg text-xs font-medium">
                {t('إلغاء', 'Cancel')}
              </button>
              {!showPwdField && (
                <button onClick={() => setShowPwdField(true)} className="px-4 py-1.5 bg-secondary rounded-lg text-xs font-medium flex items-center gap-1 ms-auto text-muted-foreground hover:text-foreground">
                  <KeyRound size={12} /> {t('تغيير كلمة المرور', 'Reset Password')}
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm">{user.fullName}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", roleColor)}>{user.role}</span>
        {user.isSuperUser && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-medium">SU</span>}
      </td>
      <td className="px-4 py-3">
        {user.branchId ? (
          <span className="text-xs text-muted-foreground">{branches.find((b: any) => b.id === user.branchId)?.branchNameEn || t('فرع', 'Branch')}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.isActive
          ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 size={12} /> {t('نشط', 'Active')}</span>
          : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> {t('معطّل', 'Inactive')}</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-lg text-xs flex items-center gap-1 font-medium">
            <Pencil size={11} /> {t('تعديل', 'Edit')}
          </button>
          <button
            onClick={() => onImpersonate(user)}
            className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors"
            title={t('انتحال هوية هذا المستخدم', 'Impersonate this user')}
          >
            <UserCog size={11} /> {t('انتحال', 'Impersonate')}
          </button>
        </div>
      </td>
    </tr>
  );
}

function UsersTab({ tenant, t, isRtl }: { tenant: any; t: (ar: string, en: string) => string; isRtl: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startImpersonation } = useImpersonation();
  const [showAdd, setShowAdd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '', role: 'LoanOfficer', branchId: '', isSuperUser: false });
  const [adding, setAdding] = useState(false);
  const [impersonateTarget, setImpersonateTarget] = useState<any | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonating, setImpersonating] = useState(false);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['sa-users', tenant.id],
    queryFn: () => apiFetch(`/tenants/${tenant.id}/users`),
  });

  const { data: branches } = useQuery({
    queryKey: ['sa-branches', tenant.id],
    queryFn: () => apiFetch(`/tenants/${tenant.id}/branches`),
    initialData: [],
  });

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const body: any = { fullName: addForm.fullName, email: addForm.email, password: addForm.password, role: addForm.role, isSuperUser: addForm.isSuperUser };
      if (addForm.branchId) body.branchId = addForm.branchId;
      await apiFetch(`/tenants/${tenant.id}/users`, { method: 'POST', body: JSON.stringify(body) });
      toast({ title: t('نجاح', 'Success'), description: t('تم إضافة المستخدم', 'User created') });
      setShowAdd(false);
      setAddForm({ fullName: '', email: '', password: '', role: 'LoanOfficer', branchId: '', isSuperUser: false });
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setAdding(false);
    }
  };

  const handleImpersonateConfirm = async () => {
    if (!impersonateTarget || !impersonateReason.trim()) return;
    setImpersonating(true);
    try {
      await startImpersonation(impersonateTarget.id, tenant.id, impersonateReason.trim());
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message });
      setImpersonating(false);
    }
  };

  return (
    <div className="space-y-4">
      {impersonateTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <UserCog size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold">{t('انتحال هوية مستخدم', 'Impersonate User')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('ستتحكم في الجلسة باسم', 'You will take control of the session as')}:{' '}
                  <span className="font-semibold text-foreground">{impersonateTarget.fullName}</span>
                  {' '}({impersonateTarget.email})
                </p>
              </div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{t('جميع الإجراءات التي ستتخذها أثناء هذه الجلسة ستُسجَّل في سجل تدقيق المستأجر وسجل المنصة.', 'All actions taken during this session will be logged in the tenant audit trail and the platform audit log.')}</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                {t('سبب الانتحال', 'Reason for impersonation')} <span className="text-destructive">*</span>
              </label>
              <textarea
                className="premium-input text-sm py-2 resize-none w-full"
                rows={3}
                placeholder={t('اكتب سبباً واضحاً ومحدداً...', 'Write a clear, specific reason...')}
                value={impersonateReason}
                onChange={e => setImpersonateReason(e.target.value)}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">{t('الحد الأدنى', 'Minimum')} 10 {t('أحرف', 'characters')} · {impersonateReason.length}/500</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleImpersonateConfirm}
                disabled={impersonating || impersonateReason.trim().length < 10}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {impersonating ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
                {t('بدء الجلسة', 'Start Session')}
              </button>
              <button
                onClick={() => { setImpersonateTarget(null); setImpersonateReason(''); }}
                disabled={impersonating}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t('المستخدمون', 'Users')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('إدارة مستخدمي هذه الشركة', 'Manage all users for this company')}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90">
          <Plus size={13} /> {t('إضافة مستخدم', 'Add User')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
          <h5 className="text-sm font-bold flex items-center gap-2"><User size={14} /> {t('مستخدم جديد', 'New User')}</h5>
          <form onSubmit={addUser} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('الاسم', 'Full Name')} *</label>
                <input required className="premium-input text-sm py-1.5" value={addForm.fullName} onChange={e => setAddForm({ ...addForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('البريد الإلكتروني', 'Email')} *</label>
                <input required type="email" className="premium-input text-sm py-1.5" dir="ltr" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('كلمة المرور', 'Password')} *</label>
                <div className="relative">
                  <input required type={showPwd ? 'text' : 'password'} className="premium-input text-sm py-1.5 pr-10" dir="ltr" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
                  <button type="button" className="absolute inset-y-0 right-3 flex items-center text-muted-foreground" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('الدور', 'Role')} *</label>
                <select required className="premium-input text-sm py-1.5" value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {(branches as any[])?.length > 0 && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('الفرع', 'Branch')} ({t('اختياري', 'optional')})</label>
                  <select className="premium-input text-sm py-1.5" value={addForm.branchId} onChange={e => setAddForm({ ...addForm, branchId: e.target.value })}>
                    <option value="">{t('بدون فرع', 'No Branch')}</option>
                    {(branches as any[]).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.branchNameEn || b.branchNameAr}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addForm.isSuperUser} onChange={e => setAddForm({ ...addForm, isSuperUser: e.target.checked })} className="w-4 h-4 rounded border-border accent-primary" />
              <span className="text-xs font-medium text-muted-foreground">{t('مستخدم متميز', 'Super User')}</span>
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={adding} className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50">
                {adding ? <Loader2 size={14} className="animate-spin" /> : t('حفظ', 'Save')}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-1.5 bg-secondary rounded-lg text-xs font-medium">
                {t('إلغاء', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المستخدم', 'User')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الدور', 'Role')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الفرع', 'Branch')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراء', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users as any[])?.map((user: any) => (
                <UserRow key={user.id} user={user} tenantId={tenant.id} branches={branches as any[]} onRefresh={refetch} onImpersonate={setImpersonateTarget} t={t} isRtl={isRtl} />
              ))}
              {(users as any[])?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    <Users size={28} className="mx-auto mb-2 opacity-20" />
                    {t('لا يوجد مستخدمون', 'No users found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditDetailsTab({ tenant, t, isRtl, onSave, saving }: {
  tenant: any; t: (ar: string, en: string) => string; isRtl: boolean;
  onSave: (data: any) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    companyName: tenant.companyName || '',
    companyNameAr: tenant.companyNameAr || '',
    fraLicenseNumber: tenant.fraLicenseNumber || '',
    subscriptionPlan: tenant.subscriptionPlan || 'Basic',
    contactEmail: tenant.contactEmail || '',
    contactPhone: tenant.contactPhone || '',
    allowedDomains: tenant.allowedDomains || '',
    isActive: tenant.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Building2 size={12} /> {t('اسم الشركة (إنجليزي)', 'Company Name (EN)')}</label>
          <input required className="premium-input" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Building2 size={12} /> {t('اسم الشركة (عربي)', 'Company Name (AR)')}</label>
          <input className="premium-input" dir="rtl" value={form.companyNameAr} onChange={e => setForm({ ...form, companyNameAr: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Badge size={12} /> {t('رقم ترخيص الرقابة', 'FRA License Number')}</label>
          <input className="premium-input" dir="ltr" value={form.fraLicenseNumber} onChange={e => setForm({ ...form, fraLicenseNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Package size={12} /> {t('الباقة', 'Subscription Plan')}</label>
          <select className="premium-input" value={form.subscriptionPlan} onChange={e => setForm({ ...form, subscriptionPlan: e.target.value })}>
            <option value="Basic">Basic</option>
            <option value="Edge">Edge</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Mail size={12} /> {t('البريد الإلكتروني للتواصل', 'Contact Email')}</label>
          <input type="email" className="premium-input" dir="ltr" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Phone size={12} /> {t('رقم الهاتف', 'Contact Phone')}</label>
          <input className="premium-input" dir="ltr" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><ShieldCheck size={12} /> {t('النطاقات المسموحة', 'Allowed Email Domains')}</label>
          <input className="premium-input" dir="ltr" value={form.allowedDomains} onChange={e => setForm({ ...form, allowedDomains: e.target.value })} placeholder="company.com, corp.org" />
          <p className="text-[11px] text-muted-foreground">{t('نطاقات مفصولة بفواصل. اتركه فارغاً للسماح بجميع النطاقات.', 'Comma-separated domains. Leave empty to allow all domains.')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-4 border border-border gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('حالة الشركة', 'Company Status')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{form.isActive ? t('الشركة نشطة ويمكن لمستخدميها تسجيل الدخول', 'Company is active — users can log in') : t('الشركة معطّلة — لا يمكن تسجيل الدخول', 'Company is suspended — login disabled')}</p>
        </div>
        <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className="flex items-center gap-2 shrink-0 p-1">
          {form.isActive
            ? <ToggleRight size={40} className="text-primary" />
            : <ToggleLeft size={40} className="text-muted-foreground" />}
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('حفظ التعديلات', 'Save Changes')}
        </button>
      </div>
    </form>
  );
}

function SubscriptionTab({ tenant, t, isRtl, onToggleFeature, featureToggling }: {
  tenant: any; t: (ar: string, en: string) => string; isRtl: boolean;
  onToggleFeature: (field: string, currentValue: boolean) => void; featureToggling: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modulePricing } = useQuery({
    queryKey: ['module-pricing'],
    queryFn: () => apiFetch('/subscriptions/module-pricing'),
    initialData: [],
  });
  const { data: userTypePricing } = useQuery({
    queryKey: ['user-type-pricing'],
    queryFn: () => apiFetch('/subscriptions/user-type-pricing'),
    initialData: [],
  });
  const { data: tenantModules, refetch: refetchModules } = useQuery({
    queryKey: ['tenant-modules', tenant.id],
    queryFn: () => apiFetch(`/subscriptions/tenants/${tenant.id}/modules`),
    initialData: [],
  });
  const { data: tenantUserLimits, refetch: refetchLimits } = useQuery({
    queryKey: ['tenant-user-limits', tenant.id],
    queryFn: () => apiFetch(`/subscriptions/tenants/${tenant.id}/user-limits`),
    initialData: [],
  });
  const { data: billingSummary, refetch: refetchBilling } = useQuery({
    queryKey: ['billing-summary', tenant.id],
    queryFn: () => apiFetch(`/subscriptions/tenants/${tenant.id}/billing-summary`),
  });

  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [savingLimit, setSavingLimit] = useState<string | null>(null);

  const getModuleSub = (moduleKey: string) =>
    (tenantModules as any[])?.find((s: any) => s.moduleKey === moduleKey);
  const getUserLimit = (userType: string) =>
    (tenantUserLimits as any[])?.find((l: any) => l.userType === userType);

  const saveModuleSub = async (moduleKey: string, data: any) => {
    setSavingModule(moduleKey);
    try {
      await apiFetch(`/subscriptions/tenants/${tenant.id}/modules/${moduleKey}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
      refetchModules();
      refetchBilling();
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث اشتراك الموديول', 'Module subscription updated') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingModule(null);
    }
  };

  const saveUserLimit = async (userType: string, data: any) => {
    setSavingLimit(userType);
    try {
      await apiFetch(`/subscriptions/tenants/${tenant.id}/user-limits/${userType}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
      refetchLimits();
      refetchBilling();
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث حد المستخدمين', 'User limit updated') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingLimit(null);
    }
  };

  return (
    <div className="space-y-6">
      {billingSummary && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={16} className="text-primary" />
            <p className="text-sm font-bold">{t('ملخص الفاتورة الشهرية', 'Monthly Billing Summary')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('الموديولات', 'Modules')}</p>
              <p className="text-base sm:text-lg font-bold text-primary">${Number(billingSummary.totalModuleMonthly || 0).toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('المستخدمون', 'Users')}</p>
              <p className="text-base sm:text-lg font-bold text-primary">${Number(billingSummary.totalUserMonthly || 0).toFixed(0)}</p>
            </div>
            <div className="text-center border-s border-primary/20">
              <p className="text-xs text-muted-foreground">{t('الإجمالي', 'Total')}</p>
              <p className="text-xl font-bold text-primary">${Number(billingSummary.totalMonthly || 0).toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">/{t('شهرياً', 'month')}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Package size={14} /> {t('اشتراكات الموديولات', 'Module Subscriptions')}</p>
        <p className="text-xs text-muted-foreground mb-3">{t('تحديد سعر مخصص وخصم لكل موديول لهذه الشركة', 'Set custom pricing and discounts per module for this company')}</p>
        <div className="space-y-3">
          {(modulePricing as any[])?.map((mp: any) => {
            const sub = getModuleSub(mp.moduleKey);
            return (
              <ModuleSubRow key={mp.moduleKey} pricing={mp} sub={sub} t={t} isRtl={isRtl}
                saving={savingModule === mp.moduleKey}
                onSave={(data: any) => saveModuleSub(mp.moduleKey, data)} />
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Users size={14} /> {t('حدود المستخدمين والتسعير', 'User Limits & Pricing')}</p>
        <p className="text-xs text-muted-foreground mb-3">{t('تحديد العدد الأقصى من المستخدمين لكل نوع وإدارة الخصومات', 'Set max users per type and manage discounts for this company')}</p>
        <div className="space-y-3">
          {(userTypePricing as any[])?.map((up: any) => {
            const limit = getUserLimit(up.userType);
            return (
              <UserLimitRow key={up.userType} pricing={up} limit={limit} t={t} isRtl={isRtl}
                saving={savingLimit === up.userType}
                onSave={(data: any) => saveUserLimit(up.userType, data)} />
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><ShieldCheck size={14} /> {t('تفعيل الموديولات والميزات', 'Module Feature Flags')}</p>
        <p className="text-xs text-muted-foreground mb-3">{t('تفعيل أو تعطيل كل موديول لهذه الشركة مباشرةً', 'Toggle each system module on or off for this company')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULE_DEFINITIONS.map(mod => {
            const sub = getModuleSub(mod.key);
            const isEnabled = sub?.isActive ?? false;
            const Icon = mod.icon;
            const colors = COLOR_MAP[mod.color];
            return (
              <div
                key={mod.key}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
                  <Icon size={15} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{isRtl ? mod.nameAr : mod.nameEn}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{isRtl ? mod.descAr : mod.descEn}</p>
                </div>
                <ToggleSwitch
                  enabled={isEnabled}
                  onChange={v => saveModuleSub(mod.key, { isActive: v })}
                  label=""
                  disabled={savingModule === mod.key}
                />
              </div>
            );
          })}
        </div>

        <p className="text-sm font-semibold mt-6 mb-2 flex items-center gap-2"><CreditCard size={14} /> {t('بوابات الدفع الإلكتروني وخدمات خارجية', 'E-Payment Gateways & External Services')}</p>
        <div className="bg-secondary/50 rounded-xl p-4 space-y-1">
          <ToggleSwitch
            label={t('تفعيل I-Score — الاستعلام الائتماني', 'Enable I-Score Credit Bureau')}
            enabled={tenant.iscoreEnabled || false}
            onChange={() => onToggleFeature('iscoreEnabled', tenant.iscoreEnabled || false)}
            disabled={featureToggling}
          />
          {['epaymentFawryEnabled:Fawry', 'epaymentOpayEnabled:OPay', 'epaymentKhaznaEnabled:Khazna', 'epaymentMeezaEnabled:Meeza'].map(item => {
            const [field, label] = item.split(':');
            return (
              <ToggleSwitch
                key={field} label={label}
                enabled={tenant[field] || false}
                onChange={() => onToggleFeature(field, tenant[field] || false)}
                disabled={featureToggling}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModuleSubRow({ pricing, sub, t, isRtl, saving, onSave }: {
  pricing: any; sub: any; t: any; isRtl: boolean; saving: boolean; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState({
    isActive: sub?.isActive ?? false,
    billingCycle: sub?.billingCycle ?? 'monthly',
    discountPercent: sub?.discountPercent ?? '0',
    discountAmount: sub?.discountAmount ?? '0',
    customMonthlyPrice: sub?.customMonthlyPrice ?? '',
  });

  useEffect(() => {
    setForm({
      isActive: sub?.isActive ?? false,
      billingCycle: sub?.billingCycle ?? 'monthly',
      discountPercent: sub?.discountPercent ?? '0',
      discountAmount: sub?.discountAmount ?? '0',
      customMonthlyPrice: sub?.customMonthlyPrice ?? '',
    });
  }, [sub?.isActive, sub?.billingCycle, sub?.discountPercent, sub?.discountAmount, sub?.customMonthlyPrice]);

  const isAnnual = form.billingCycle === 'annual';
  const basePriceMonthly = Number(pricing.monthlyPrice);
  const basePriceAnnual = Number(pricing.annualPrice || 0);
  const basePrice = isAnnual ? (basePriceAnnual > 0 ? basePriceAnnual / 12 : basePriceMonthly) : basePriceMonthly;
  const effectivePrice = form.customMonthlyPrice ? Number(form.customMonthlyPrice) : basePrice;
  const afterDiscount = Math.max(0, effectivePrice * (1 - Number(form.discountPercent) / 100) - Number(form.discountAmount));

  return (
    <div className={cn("rounded-xl border p-4 transition-all", form.isActive ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", form.isActive ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground")}>
            <Package size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">{isRtl ? pricing.moduleNameAr || pricing.moduleName : pricing.moduleName}</p>
            <p className="text-xs text-muted-foreground">{t('السعر الأساسي', 'Base price')}: ${basePrice}/{t('شهر', 'mo')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-bold", form.isActive ? "text-primary" : "text-muted-foreground")}>${afterDiscount.toFixed(0)}/{t('شهر', 'mo')}</span>
          <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="" />
        </div>
      </div>
      {form.isActive && (
        <div className="space-y-3 mt-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">{t('نوع الاشتراك', 'Billing Cycle')}</label>
            <div className="flex rounded-lg border border-border overflow-hidden w-fit">
              <button type="button" onClick={() => setForm({ ...form, billingCycle: 'monthly' })}
                className={cn("px-4 py-1.5 text-xs font-medium transition-colors",
                  form.billingCycle === 'monthly' ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>{t('شهري', 'Monthly')}</button>
              <button type="button" onClick={() => setForm({ ...form, billingCycle: 'annual' })}
                className={cn("px-4 py-1.5 text-xs font-medium transition-colors",
                  form.billingCycle === 'annual' ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>{t('سنوي', 'Annual')}{basePriceAnnual > 0 && basePriceAnnual < basePriceMonthly * 12 ? ` (${t('وفّر', 'Save')} ${Math.round((1 - basePriceAnnual / (basePriceMonthly * 12)) * 100)}%)` : ''}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><DollarSign size={10} />{t('سعر مخصص', 'Custom Price')}</label>
              <input type="number" className="premium-input text-xs py-1.5" placeholder={String(basePrice.toFixed(0))} value={form.customMonthlyPrice} onChange={e => setForm({ ...form, customMonthlyPrice: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><Percent size={10} />{t('خصم %', 'Discount %')}</label>
              <input type="number" min="0" max="100" className="premium-input text-xs py-1.5" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><DollarSign size={10} />{t('خصم مبلغ', 'Discount $')}</label>
              <input type="number" min="0" className="premium-input text-xs py-1.5" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: e.target.value })} />
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-3">
        <button onClick={() => onSave(form)} disabled={saving} className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {t('حفظ', 'Save')}
        </button>
      </div>
    </div>
  );
}

function UserLimitRow({ pricing, limit, t, isRtl, saving, onSave }: {
  pricing: any; limit: any; t: any; isRtl: boolean; saving: boolean; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState({
    maxUsers: limit?.maxUsers ?? 0,
    discountPercent: limit?.discountPercent ?? '0',
    discountAmount: limit?.discountAmount ?? '0',
    customPricePerUser: limit?.customPricePerUser ?? '',
  });

  useEffect(() => {
    setForm({
      maxUsers: limit?.maxUsers ?? 0,
      discountPercent: limit?.discountPercent ?? '0',
      discountAmount: limit?.discountAmount ?? '0',
      customPricePerUser: limit?.customPricePerUser ?? '',
    });
  }, [limit?.maxUsers, limit?.discountPercent, limit?.discountAmount, limit?.customPricePerUser]);

  const basePrice = Number(pricing.monthlyPricePerUser);
  const effectivePrice = form.customPricePerUser ? Number(form.customPricePerUser) : basePrice;
  const afterDiscount = Math.max(0, effectivePrice * (1 - Number(form.discountPercent) / 100) - Number(form.discountAmount));
  const currentCount = limit?.currentCount || 0;
  const overLimit = form.maxUsers > 0 && currentCount > form.maxUsers;

  const roleColor = ROLE_COLORS[pricing.userType] || 'bg-secondary text-muted-foreground border-border';

  return (
    <div className="rounded-xl border border-border p-4 bg-secondary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", roleColor)}>
            {isRtl ? pricing.displayNameAr || pricing.displayName : pricing.displayName}
          </span>
          <p className="text-xs text-muted-foreground">${basePrice}/{t('مستخدم/شهر', 'user/mo')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{currentCount}/{form.maxUsers || '∞'} {t('مستخدم', 'users')}</span>
          {overLimit && <AlertTriangle size={14} className="text-red-400" />}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><Users size={10} />{t('الحد الأقصى', 'Max Users')}</label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setForm({ ...form, maxUsers: Math.max(0, form.maxUsers - 1) })} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/20 hover:text-destructive border border-border flex items-center justify-center text-sm font-bold transition-colors">−</button>
            <input type="number" min="0" className="premium-input text-xs py-1.5 text-center flex-1" value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} />
            <button type="button" onClick={() => setForm({ ...form, maxUsers: form.maxUsers + 1 })} className="w-8 h-8 rounded-lg bg-secondary hover:bg-primary/20 hover:text-primary border border-border flex items-center justify-center text-sm font-bold transition-colors">+</button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><DollarSign size={10} />{t('سعر مخصص', 'Custom $')}</label>
          <input type="number" className="premium-input text-xs py-1.5" placeholder={String(basePrice)} value={form.customPricePerUser} onChange={e => setForm({ ...form, customPricePerUser: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><Percent size={10} />{t('خصم %', 'Disc. %')}</label>
          <input type="number" min="0" max="100" className="premium-input text-xs py-1.5" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><DollarSign size={10} />{t('خصم $', 'Disc. $')}</label>
          <input type="number" min="0" className="premium-input text-xs py-1.5" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">{t('السعر الفعلي', 'Effective')}: <span className="font-bold text-foreground">${afterDiscount.toFixed(0)}</span>/{t('مستخدم/شهر', 'user/mo')}</p>
        <button onClick={() => onSave(form)} disabled={saving} className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {t('حفظ', 'Save')}
        </button>
      </div>
    </div>
  );
}

function GlobalPricingPanel({ t, isRtl }: { t: (ar: string, en: string) => string; isRtl: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modulePricing, isLoading: loadingMp, refetch: refetchMp } = useQuery({
    queryKey: ['module-pricing'],
    queryFn: () => apiFetch('/subscriptions/module-pricing'),
    initialData: [],
  });
  const { data: userTypePricing, isLoading: loadingUp, refetch: refetchUp } = useQuery({
    queryKey: ['user-type-pricing'],
    queryFn: () => apiFetch('/subscriptions/user-type-pricing'),
    initialData: [],
  });

  const [editingMp, setEditingMp] = useState<string | null>(null);
  const [editingUp, setEditingUp] = useState<string | null>(null);
  const [mpForm, setMpForm] = useState<any>({});
  const [upForm, setUpForm] = useState<any>({});
  const [savingMp, setSavingMp] = useState(false);
  const [savingUp, setSavingUp] = useState(false);

  const startEditMp = (mp: any) => {
    setEditingMp(mp.id);
    setMpForm({ monthlyPrice: mp.monthlyPrice, annualPrice: mp.annualPrice, moduleName: mp.moduleName, moduleNameAr: mp.moduleNameAr });
  };
  const saveMp = async (id: string) => {
    setSavingMp(true);
    try {
      await apiFetch(`/subscriptions/module-pricing/${id}`, { method: 'PUT', body: JSON.stringify(mpForm) });
      refetchMp();
      setEditingMp(null);
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث التسعير', 'Pricing updated') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setSavingMp(false); }
  };
  const startEditUp = (up: any) => {
    setEditingUp(up.id);
    setUpForm({ monthlyPricePerUser: up.monthlyPricePerUser, annualPricePerUser: up.annualPricePerUser, displayName: up.displayName, displayNameAr: up.displayNameAr });
  };
  const saveUp = async (id: string) => {
    setSavingUp(true);
    try {
      await apiFetch(`/subscriptions/user-type-pricing/${id}`, { method: 'PUT', body: JSON.stringify(upForm) });
      refetchUp();
      setEditingUp(null);
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث التسعير', 'Pricing updated') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setSavingUp(false); }
  };

  if (loadingMp || loadingUp) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="premium-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign size={20} className="text-primary" />
        <h3 className="text-lg font-bold">{t('تسعير النظام', 'System Pricing')}</h3>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Package size={14} /> {t('أسعار الموديولات الأساسية', 'Base Module Pricing')}</p>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الموديول', 'Module')}</th>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('شهري', 'Monthly')}</th>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('سنوي', 'Annual')}</th>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراء', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(modulePricing as any[])?.map((mp: any) => (
                <tr key={mp.id} className="hover:bg-muted/20">
                  {editingMp === mp.id ? (
                    <>
                      <td className="px-4 py-2"><input className="premium-input text-xs py-1" value={mpForm.moduleName} onChange={e => setMpForm({ ...mpForm, moduleName: e.target.value })} /></td>
                      <td className="px-4 py-2"><input type="number" className="premium-input text-xs py-1 w-24" value={mpForm.monthlyPrice} onChange={e => setMpForm({ ...mpForm, monthlyPrice: e.target.value })} /></td>
                      <td className="px-4 py-2"><input type="number" className="premium-input text-xs py-1 w-24" value={mpForm.annualPrice} onChange={e => setMpForm({ ...mpForm, annualPrice: e.target.value })} /></td>
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={() => saveMp(mp.id)} disabled={savingMp} className="px-2 py-1 bg-primary text-white rounded text-xs">{savingMp ? '...' : t('حفظ', 'Save')}</button>
                        <button onClick={() => setEditingMp(null)} className="px-2 py-1 bg-secondary rounded text-xs">{t('إلغاء', 'X')}</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-sm">{isRtl ? mp.moduleNameAr || mp.moduleName : mp.moduleName}</td>
                      <td className="px-4 py-2.5 font-mono text-sm">${Number(mp.monthlyPrice).toFixed(0)}</td>
                      <td className="px-4 py-2.5 font-mono text-sm">${Number(mp.annualPrice).toFixed(0)}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => startEditMp(mp)} className="px-2 py-1 bg-secondary hover:bg-secondary/80 rounded text-xs flex items-center gap-1"><Pencil size={10} /> {t('تعديل', 'Edit')}</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Users size={14} /> {t('أسعار أنواع المستخدمين', 'User Type Pricing')}</p>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('نوع المستخدم', 'User Type')}</th>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('شهري/مستخدم', 'Monthly/User')}</th>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('سنوي/مستخدم', 'Annual/User')}</th>
                <th className={cn("px-4 py-2.5 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراء', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(userTypePricing as any[])?.map((up: any) => {
                const roleColor = ROLE_COLORS[up.userType] || '';
                return (
                  <tr key={up.id} className="hover:bg-muted/20">
                    {editingUp === up.id ? (
                      <>
                        <td className="px-4 py-2"><input className="premium-input text-xs py-1" value={upForm.displayName} onChange={e => setUpForm({ ...upForm, displayName: e.target.value })} /></td>
                        <td className="px-4 py-2"><input type="number" className="premium-input text-xs py-1 w-24" value={upForm.monthlyPricePerUser} onChange={e => setUpForm({ ...upForm, monthlyPricePerUser: e.target.value })} /></td>
                        <td className="px-4 py-2"><input type="number" className="premium-input text-xs py-1 w-24" value={upForm.annualPricePerUser} onChange={e => setUpForm({ ...upForm, annualPricePerUser: e.target.value })} /></td>
                        <td className="px-4 py-2 flex gap-1">
                          <button onClick={() => saveUp(up.id)} disabled={savingUp} className="px-2 py-1 bg-primary text-white rounded text-xs">{savingUp ? '...' : t('حفظ', 'Save')}</button>
                          <button onClick={() => setEditingUp(null)} className="px-2 py-1 bg-secondary rounded text-xs">{t('إلغاء', 'X')}</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5"><span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", roleColor)}>{isRtl ? up.displayNameAr || up.displayName : up.displayName}</span></td>
                        <td className="px-4 py-2.5 font-mono text-sm">${Number(up.monthlyPricePerUser).toFixed(0)}</td>
                        <td className="px-4 py-2.5 font-mono text-sm">${Number(up.annualPricePerUser).toFixed(0)}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => startEditUp(up)} className="px-2 py-1 bg-secondary hover:bg-secondary/80 rounded text-xs flex items-center gap-1"><Pencil size={10} /> {t('تعديل', 'Edit')}</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PlanDefinitionsPanel t={t} isRtl={isRtl} />
    </div>
  );
}

const PLAN_DEFAULTS: Record<string, string[]> = {
  Basic: ['moduleCoreBasic'],
  Edge: ['moduleCoreBasic', 'moduleCoreEdge', 'moduleFinancialSettlements', 'moduleSavings'],
  Enterprise: MODULE_DEFINITIONS.map(m => m.key),
};

function PlanDefinitionsPanel({ t, isRtl }: { t: (ar: string, en: string) => string; isRtl: boolean }) {
  const { toast } = useToast();
  const STORAGE_KEY = 'neo_fmc_plan_definitions';
  const [plans, setPlans] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : PLAN_DEFAULTS;
    } catch {
      return PLAN_DEFAULTS;
    }
  });
  const [saving, setSaving] = useState(false);

  const toggleModule = (plan: string, moduleKey: string) => {
    setPlans(prev => {
      const current = prev[plan] || [];
      const next = current.includes(moduleKey)
        ? current.filter(k => k !== moduleKey)
        : [...current, moduleKey];
      return { ...prev, [plan]: next };
    });
  };

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    setTimeout(() => {
      setSaving(false);
      toast({ title: t('نجاح', 'Success'), description: t('تم حفظ تعريفات الباقات', 'Plan definitions saved') });
    }, 400);
  };

  const PLAN_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    Basic: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500' },
    Edge: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', badge: 'bg-violet-500' },
    Enterprise: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500' },
  };

  return (
    <div className="border-t border-border pt-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2"><Layers size={14} /> {t('تعريف الباقات', 'Plan Definitions')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('حدد الموديولات المضمنة في كل باقة', 'Define which modules are included in each subscription plan')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {t('حفظ', 'Save')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['Basic', 'Edge', 'Enterprise'] as const).map(plan => {
          const style = PLAN_STYLES[plan];
          const included = plans[plan] || [];
          return (
            <div key={plan} className={cn('rounded-xl border p-4 space-y-3', style.bg, style.border)}>
              <div className="flex items-center justify-between">
                <span className={cn('text-sm font-bold', style.text)}>{plan}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full text-white font-medium', style.badge)}>
                  {included.length} {t('موديول', 'modules')}
                </span>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {MODULE_DEFINITIONS.map(mod => {
                  const Icon = mod.icon;
                  const colors = COLOR_MAP[mod.color];
                  const checked = included.includes(mod.key);
                  return (
                    <label
                      key={mod.key}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                        checked ? 'bg-white/5' : 'hover:bg-white/5 opacity-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(plan, mod.key)}
                        className="w-3.5 h-3.5 rounded accent-primary shrink-0"
                      />
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', colors.bg)}>
                        <Icon size={12} className={colors.text} />
                      </div>
                      <span className="text-[11px] font-medium leading-tight">{isRtl ? mod.nameAr : mod.nameEn}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CHART_COLORS = ['hsl(var(--primary))', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const PIE_COLORS = ['hsl(var(--primary))', '#8b5cf6', '#f59e0b', '#10b981'];

type RevenuePeriod = 'monthly' | 'quarterly' | 'annual';

function SaasDashboard({ t, isRtl }: { t: (ar: string, en: string) => string; isRtl: boolean }) {
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('monthly');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: () => apiFetch('/subscriptions/platform-dashboard'),
  });

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!dashboard) return null;

  const { kpis, monthlyTrend, quarterlyTrend, annualSummary, moduleRevenueBreakdown, userTypeBreakdown, perTenantRevenue, moduleAdoption } = dashboard;

  const formatCurrency = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatCurrencyFull = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const kpiCards = [
    { labelAr: 'الإيرادات الشهرية المتكررة', labelEn: 'Monthly Recurring Revenue (MRR)', value: formatCurrency(kpis.mrr), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { labelAr: 'الإيرادات السنوية المتكررة', labelEn: 'Annual Recurring Revenue (ARR)', value: formatCurrency(kpis.arr), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { labelAr: 'إجمالي الشركات', labelEn: 'Total Tenants', value: kpis.totalTenants, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10', sub: `${kpis.activeTenants} ${t('نشط', 'active')}` },
    { labelAr: 'إجمالي المستخدمين', labelEn: 'Total Users', value: kpis.totalUsers, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { labelAr: 'إيرادات الموديولات', labelEn: 'Module Revenue', value: formatCurrency(kpis.revenueFromModules), icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-500/10', sub: `${((kpis.revenueFromModules / (kpis.mrr || 1)) * 100).toFixed(0)}% ${t('من MRR', 'of MRR')}` },
    { labelAr: 'إيرادات المستخدمين', labelEn: 'User Revenue', value: formatCurrency(kpis.revenueFromUsers), icon: User, color: 'text-rose-400', bg: 'bg-rose-500/10', sub: `${((kpis.revenueFromUsers / (kpis.mrr || 1)) * 100).toFixed(0)}% ${t('من MRR', 'of MRR')}` },
  ];

  const revenueChartData = revenuePeriod === 'monthly' ? monthlyTrend :
    revenuePeriod === 'quarterly' ? quarterlyTrend :
    [{ period: t('السنة الحالية', 'Current Year'), moduleRevenue: annualSummary.moduleRevenue, userRevenue: annualSummary.userRevenue, totalRevenue: annualSummary.totalRevenue }];

  const revenuePieData = [
    { name: t('الموديولات', 'Modules'), value: kpis.revenueFromModules },
    { name: t('المستخدمون', 'Users'), value: kpis.revenueFromUsers },
  ];

  const moduleAdoptionData = moduleAdoption?.map((m: any) => ({
    name: isRtl ? (m.moduleNameAr || m.moduleName) : m.moduleName,
    subscribers: m.subscribers,
    rate: m.totalTenants > 0 ? ((m.subscribers / m.totalTenants) * 100).toFixed(0) : 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}: <span className="font-semibold">{formatCurrencyFull(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="premium-card p-4 space-y-2">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.bg)}>
                <Icon size={18} className={kpi.color} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium leading-tight">{isRtl ? kpi.labelAr : kpi.labelEn}</p>
                <p className="text-xl font-display font-bold mt-0.5">{kpi.value}</p>
                {kpi.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> {t('تقرير الإيرادات', 'Revenue Report')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('تتبع الإيرادات المتكررة حسب الفترة', 'Track recurring revenue by period')}</p>
            </div>
            <div className="flex bg-secondary rounded-lg p-0.5 border border-border">
              {([
                { key: 'monthly' as RevenuePeriod, ar: 'شهري', en: 'Monthly' },
                { key: 'quarterly' as RevenuePeriod, ar: 'ربع سنوي', en: 'Quarterly' },
                { key: 'annual' as RevenuePeriod, ar: 'سنوي', en: 'Annual' },
              ]).map(p => (
                <button key={p.key} onClick={() => setRevenuePeriod(p.key)}
                  className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    revenuePeriod === p.key ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground")}>
                  {isRtl ? p.ar : p.en}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {revenuePeriod === 'annual' ? (
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="moduleRevenue" name={t('موديولات', 'Modules')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="userRevenue" name={t('مستخدمون', 'Users')} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="gradModule" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradUser" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="moduleRevenue" name={t('موديولات', 'Modules')} stroke="hsl(var(--primary))" fill="url(#gradModule)" strokeWidth={2} />
                  <Area type="monotone" dataKey="userRevenue" name={t('مستخدمون', 'Users')} stroke="#8b5cf6" fill="url(#gradUser)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><PieChart size={16} className="text-primary" /> {t('توزيع الإيرادات', 'Revenue Split')}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={revenuePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {revenuePieData.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrencyFull(v)} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[0] }} /> {t('الموديولات', 'Modules')}</span>
              <span className="font-bold">{formatCurrency(kpis.revenueFromModules)}/mo</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[1] }} /> {t('المستخدمون', 'Users')}</span>
              <span className="font-bold">{formatCurrency(kpis.revenueFromUsers)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Package size={16} className="text-primary" /> {t('إيرادات الموديولات', 'Module Revenue')}</h3>
          <div className="space-y-3">
            {moduleRevenueBreakdown?.map((m: any, i: number) => {
              const maxRev = Math.max(...moduleRevenueBreakdown.map((x: any) => x.monthlyRevenue), 1);
              return (
                <div key={m.moduleKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{isRtl ? (m.moduleNameAr || m.moduleName) : m.moduleName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{m.subscribers} {t('مشترك', 'subs')}</span>
                      <span className="font-bold">{formatCurrency(m.monthlyRevenue)}/mo</span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(m.monthlyRevenue / maxRev) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Users size={16} className="text-primary" /> {t('إيرادات حسب نوع المستخدم', 'Revenue by User Type')}</h3>
          <div className="space-y-3">
            {userTypeBreakdown?.map((u: any, i: number) => {
              const maxRev = Math.max(...userTypeBreakdown.map((x: any) => x.monthlyRevenue), 1);
              return (
                <div key={u.userType} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{isRtl ? (u.displayNameAr || u.displayName) : u.displayName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{u.count} {t('مستخدم', 'users')}</span>
                      <span className="font-bold">{formatCurrency(u.monthlyRevenue)}/mo</span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(u.monthlyRevenue / maxRev) * 100}%`, background: CHART_COLORS[(i + 2) % CHART_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="premium-card p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Globe size={16} className="text-primary" /> {t('اعتماد الموديولات', 'Module Adoption')}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleAdoptionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                <Tooltip formatter={(v: number) => `${v} tenants`} />
                <Bar dataKey="subscribers" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Receipt size={16} className="text-primary" /> {t('الإيرادات حسب الشركة', 'Revenue by Tenant')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className={cn("pb-2 font-semibold text-muted-foreground", isRtl ? "text-right" : "text-left")}>{t('الشركة', 'Company')}</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-right">{t('موديولات', 'Modules')}</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-right">{t('مستخدمون', 'Users')}</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-right">{t('الإجمالي', 'Total')}</th>
                </tr>
              </thead>
              <tbody>
                {perTenantRevenue?.map((tr: any) => (
                  <tr key={tr.tenantId} className="border-b border-border/50 hover:bg-muted/20">
                    <td className={cn("py-2.5 font-medium", isRtl ? "text-right" : "text-left")}>{tr.companyName}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{formatCurrency(tr.moduleRevenue)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{formatCurrency(tr.userRevenue)}</td>
                    <td className="py-2.5 text-right font-bold text-primary">{formatCurrency(tr.totalRevenue)}</td>
                  </tr>
                ))}
                {perTenantRevenue?.length > 0 && (
                  <tr className="font-bold">
                    <td className={cn("py-2.5", isRtl ? "text-right" : "text-left")}>{t('الإجمالي', 'Total')}</td>
                    <td className="py-2.5 text-right">{formatCurrency(kpis.revenueFromModules)}</td>
                    <td className="py-2.5 text-right">{formatCurrency(kpis.revenueFromUsers)}</td>
                    <td className="py-2.5 text-right text-primary">{formatCurrency(kpis.mrr)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Activity size={16} className="text-primary" /> {t('نمو الشركات', 'Tenant Growth')}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RLineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => `${v} tenants`} />
              <Line type="monotone" dataKey="tenantCount" name={t('عدد الشركات', 'Tenants')} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
            </RLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PlatformAuditLog({ t, isRtl, tenants }: { t: (ar: string, en: string) => string; isRtl: boolean; tenants: any[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('neo_fmc_token');
    fetch(`${API_BASE}/tenants`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then((data: any[]) => {
        const entries: any[] = [];
        (data || []).forEach((tenant: any) => {
          entries.push({
            id: `create-${tenant.id}`,
            type: 'tenant_created',
            typeAr: 'إنشاء شركة',
            typeEn: 'Company Created',
            target: isRtl ? (tenant.companyNameAr || tenant.companyName) : tenant.companyName,
            timestamp: tenant.createdAt,
            icon: Building2,
            color: 'text-green-500',
          });
          if (tenant.updatedAt && tenant.updatedAt !== tenant.createdAt) {
            entries.push({
              id: `update-${tenant.id}`,
              type: 'tenant_updated',
              typeAr: 'تحديث شركة',
              typeEn: 'Company Updated',
              target: isRtl ? (tenant.companyNameAr || tenant.companyName) : tenant.companyName,
              timestamp: tenant.updatedAt,
              icon: Settings,
              color: 'text-blue-500',
            });
          }
        });
        entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(entries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isRtl]);

  const filteredLogs = filterType === 'all' ? logs : logs.filter(l => l.type === filterType);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">{t('الكل', 'All Events')}</option>
          <option value="tenant_created">{t('إنشاء شركة', 'Company Created')}</option>
          <option value="tenant_updated">{t('تحديث شركة', 'Company Updated')}</option>
        </select>
        <span className="text-sm text-muted-foreground">
          {filteredLogs.length} {t('سجل', 'entries')}
        </span>
      </div>
      <div className="premium-card overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('لا توجد سجلات', 'No audit entries yet')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.map(log => {
              const Icon = log.icon;
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-secondary shrink-0")}>
                    <Icon size={18} className={log.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t(log.typeAr, log.typeEn)}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.target}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDate(log.timestamp)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SystemAnnouncements({ t, isRtl }: { t: (ar: string, en: string) => string; isRtl: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [body, setBody] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [priority, setPriority] = useState<'info' | 'warning' | 'critical'>('info');
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const { data: announcements = [], refetch } = useQuery({
    queryKey: ['/api/announcements/all'],
    queryFn: () => apiFetch<any[]>('/announcements/all'),
  });

  const saveAnnouncement = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: t('خطأ', 'Error'), description: t('العنوان والنص مطلوبان', 'Title and body are required'), variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title, titleAr: titleAr || null,
          message: body, messageAr: bodyAr || null,
          severity: priority,
          expiresAt: expiresAt || null,
        }),
      });
      setShowForm(false);
      setTitle(''); setTitleAr(''); setBody(''); setBodyAr(''); setExpiresAt('');
      setPriority('info');
      refetch();
      toast({ title: t('نجاح', 'Success'), description: t('تم إرسال الإعلان لجميع المستخدمين', 'Announcement sent to all system users') });
    } catch (err: any) {
      toast({ title: t('خطأ', 'Error'), description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await apiFetch(`/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      refetch();
    } catch {}
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      refetch();
      toast({ title: t('نجاح', 'Success'), description: t('تم حذف الإعلان', 'Announcement deleted') });
    } catch {}
  };

  const priorityStyles = {
    info: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: t('معلومات', 'Info') },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: t('تحذير', 'Warning') },
    critical: { bg: 'bg-red-500/10', text: 'text-red-500', label: t('حرج', 'Critical') },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('أرسل إشعارات تحديثات النظام لجميع مستخدمي المنصة', 'Send system update notifications to all platform users')}</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-medium text-sm">
          <Plus size={18} /> {t('إعلان جديد', 'New Announcement')}
        </button>
      </div>
      {showForm && (
        <div className="premium-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('العنوان (إنجليزي) *', 'Title (English) *')}</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('مثال: تحديث النظام v2.5', 'e.g. System Update v2.5')} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('العنوان (عربي)', 'Title (Arabic)')}</label>
              <input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('النص (إنجليزي) *', 'Body (English) *')}</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder={t('تفاصيل التحديث أو الإصدار الجديد...', 'Update details or new release notes...')} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('النص (عربي)', 'Body (Arabic)')}</label>
              <textarea value={bodyAr} onChange={e => setBodyAr(e.target.value)} dir="rtl" rows={3} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">{t('الأولوية', 'Priority')}:</label>
              {(['info', 'warning', 'critical'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", priority === p ? `${priorityStyles[p].bg} ${priorityStyles[p].text} ring-2 ring-current/20` : 'bg-secondary text-muted-foreground')}>
                  {priorityStyles[p].label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">{t('ينتهي في', 'Expires')}:</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80">
              {t('إلغاء', 'Cancel')}
            </button>
            <button onClick={saveAnnouncement} disabled={sending || (!title.trim() || !body.trim())} className="px-4 py-2 rounded-xl bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? t('جاري الإرسال...', 'Sending...') : t('إرسال للجميع', 'Send to All Users')}
            </button>
          </div>
        </div>
      )}
      <div className="premium-card overflow-hidden">
        {announcements.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('لا توجد إعلانات', 'No announcements yet')}</p>
            <p className="text-sm mt-1">{t('أرسل إعلانات لإبلاغ جميع مستخدمي النظام', 'Send announcements to notify all system users')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((ann: any) => {
              const ps = priorityStyles[(ann.severity || 'info') as keyof typeof priorityStyles] || priorityStyles.info;
              return (
                <div key={ann.id} className={cn("px-5 py-4 hover:bg-secondary/30 transition-colors", !ann.isActive && "opacity-50")}>
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", ps.bg)}>
                      <AlertTriangle size={18} className={ps.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{isRtl ? (ann.titleAr || ann.title) : (ann.title || ann.titleAr)}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{isRtl ? (ann.messageAr || ann.message) : (ann.message || ann.messageAr)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", ps.bg, ps.text)}>{ps.label}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(ann.createdAt)}</span>
                        {ann.expiresAt && <span className="text-[10px] text-muted-foreground">{t('ينتهي', 'Expires')}: {formatDate(ann.expiresAt)}</span>}
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", ann.isActive ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground")}>
                          {ann.isActive ? t('نشط', 'Active') : t('معطل', 'Inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleActive(ann.id, ann.isActive)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title={ann.isActive ? t('تعطيل', 'Deactivate') : t('تفعيل', 'Activate')}>
                        {ann.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
                      </button>
                      <button onClick={() => deleteAnnouncement(ann.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformSettings({ t, isRtl }: { t: (ar: string, en: string) => string; isRtl: boolean }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('neo_fmc_platform_settings');
    return stored ? JSON.parse(stored) : {
      platformName: 'Neo FMC',
      platformNameAr: 'نيو إف إم سي',
      supportEmail: 'support@neofmc.com',
      maxTenantsAllowed: 100,
      defaultCurrency: 'EGP',
      maintenanceMode: false,
      enforcePasswordPolicy: true,
      sessionTimeoutMinutes: 60,
      allowSelfRegistration: false,
    };
  });

  const handleSave = () => {
    localStorage.setItem('neo_fmc_platform_settings', JSON.stringify(settings));
    toast({ title: t('نجاح', 'Success'), description: t('تم حفظ الإعدادات', 'Settings saved successfully') });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: typeof settings) => ({ ...prev, [key]: value }));
  };

  const settingGroups = [
    {
      titleAr: 'معلومات المنصة', titleEn: 'Platform Info', icon: Globe,
      fields: [
        { key: 'platformName', labelAr: 'اسم المنصة (إنجليزي)', labelEn: 'Platform Name (English)', type: 'text' },
        { key: 'platformNameAr', labelAr: 'اسم المنصة (عربي)', labelEn: 'Platform Name (Arabic)', type: 'text', dir: 'rtl' },
        { key: 'supportEmail', labelAr: 'بريد الدعم الفني', labelEn: 'Support Email', type: 'email' },
        { key: 'defaultCurrency', labelAr: 'العملة الافتراضية', labelEn: 'Default Currency', type: 'text' },
      ]
    },
    {
      titleAr: 'الحدود والسياسات', titleEn: 'Limits & Policies', icon: Shield,
      fields: [
        { key: 'maxTenantsAllowed', labelAr: 'الحد الأقصى للشركات', labelEn: 'Max Tenants Allowed', type: 'number' },
        { key: 'sessionTimeoutMinutes', labelAr: 'مهلة الجلسة (دقائق)', labelEn: 'Session Timeout (minutes)', type: 'number' },
      ]
    },
    {
      titleAr: 'خيارات الأمان', titleEn: 'Security Options', icon: ShieldCheck,
      toggles: [
        { key: 'enforcePasswordPolicy', labelAr: 'فرض سياسة كلمات المرور', labelEn: 'Enforce Password Policy' },
        { key: 'allowSelfRegistration', labelAr: 'السماح بالتسجيل الذاتي', labelEn: 'Allow Self-Registration' },
        { key: 'maintenanceMode', labelAr: 'وضع الصيانة', labelEn: 'Maintenance Mode' },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      {settingGroups.map((group, gi) => {
        const GIcon = group.icon;
        return (
          <div key={gi} className="premium-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GIcon size={16} className="text-primary" />
              {t(group.titleAr, group.titleEn)}
            </div>
            {group.fields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {group.fields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t(f.labelAr, f.labelEn)}</label>
                    <input
                      type={f.type}
                      value={settings[f.key]}
                      onChange={e => updateSetting(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                      dir={f.dir || 'auto'}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ))}
              </div>
            )}
            {group.toggles && (
              <div className="space-y-1">
                {group.toggles.map(tog => (
                  <ToggleSwitch
                    key={tog.key}
                    enabled={settings[tog.key]}
                    onChange={v => updateSetting(tog.key, v)}
                    label={t(tog.labelAr, tog.labelEn)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-end">
        <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-medium text-sm">
          <Save size={16} /> {t('حفظ الإعدادات', 'Save Settings')}
        </button>
      </div>
    </div>
  );
}

type ConfigTab = 'details' | 'users' | 'subscription';
type PageView = 'dashboard' | 'companies' | 'pricing' | 'audit' | 'announcements' | 'settings';

function usePageViewFromUrl(): [PageView, (v: PageView) => void] {
  const getView = (): PageView => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('view') as PageView) || 'dashboard';
  };
  const [view, setViewState] = useState<PageView>(getView);

  useEffect(() => {
    const handler = () => setViewState(getView());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const setView = (v: PageView) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    window.history.pushState({}, '', `${base}/super-admin?view=${v}`);
    setViewState(v);
  };

  return [view, setView];
}

export default function SuperAdmin() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenants, isLoading } = useListTenants();

  const [pageView, setPageView] = usePageViewFromUrl();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [configTenantId, setConfigTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigTab>('details');
  const [formData, setFormData] = useState({
    companyName: '', companyNameAr: '', fraLicenseNumber: '', subscriptionPlan: 'Basic',
    adminName: '', adminEmail: '', adminPassword: '', contactPhone: '', contactEmail: ''
  });
  const [showNewPwd, setShowNewPwd] = useState(false);

  const createMutation = useCreateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        toast({ title: t('نجاح', 'Success'), description: t('تم إنشاء الشركة', 'Company created successfully') });
        setIsDialogOpen(false);
        setFormData({ companyName: '', companyNameAr: '', fraLicenseNumber: '', subscriptionPlan: 'Basic', adminName: '', adminEmail: '', adminPassword: '', contactPhone: '', contactEmail: '' });
      },
      onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message })
    }
  });

  const updateMutation = useUpdateTenant({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        toast({ title: t('نجاح', 'Success'), description: t('تم التحديث', 'Updated successfully') });
      },
      onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message })
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData });
  };

  const toggleFeature = (id: string, field: string, currentValue: boolean) => {
    updateMutation.mutate({ id, data: { [field]: !currentValue } as any });
  };

  const openConfig = (tenantId: string) => {
    setConfigTenantId(tenantId);
    setActiveTab('details');
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const configTenant = configTenantId ? tenants?.find((t: any) => t.id === configTenantId) : null;

  const getModuleBadges = (tenant: any) => MODULE_DEFINITIONS.filter(m => tenant[m.key]);

  const tabConfig: { key: ConfigTab; icon: any; labelAr: string; labelEn: string }[] = [
    { key: 'details', icon: Building2, labelAr: 'بيانات الشركة', labelEn: 'Company Info' },
    { key: 'users', icon: Users, labelAr: 'المستخدمون', labelEn: 'Users' },
    { key: 'subscription', icon: CreditCard, labelAr: 'الاشتراك والموديولات', labelEn: 'Subscription & Modules' },
  ];

  const viewTitles: Record<PageView, { ar: string; en: string; descAr: string; descEn: string }> = {
    dashboard: { ar: 'لوحة القيادة', en: 'Platform Dashboard', descAr: 'نظرة عامة على أداء المنصة', descEn: 'Platform performance overview' },
    companies: { ar: 'الشركات', en: 'Companies', descAr: 'إدارة الشركات والاشتراكات', descEn: 'Manage companies & subscriptions' },
    pricing: { ar: 'التسعير', en: 'Pricing & Plans', descAr: 'تسعير النظام الأساسي', descEn: 'System base pricing configuration' },
    audit: { ar: 'سجل المنصة', en: 'Platform Audit Log', descAr: 'سجل جميع العمليات على مستوى المنصة', descEn: 'All platform-level operations log' },
    announcements: { ar: 'إعلانات النظام', en: 'System Announcements', descAr: 'إدارة الإعلانات والتنبيهات لجميع الشركات', descEn: 'Manage announcements & alerts for all companies' },
    settings: { ar: 'إعدادات المنصة', en: 'Platform Settings', descAr: 'إعدادات عامة للنظام', descEn: 'Global system configuration' },
  };
  const currentView = viewTitles[pageView] || viewTitles.dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold truncate">{t(currentView.ar, currentView.en)}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t(currentView.descAr, currentView.descEn)}</p>
        </div>
        {pageView === 'companies' && (
          <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-medium text-sm shrink-0">
            <Plus size={18} /> {t('إضافة شركة', 'Add Company')}
          </button>
        )}
      </div>

      {pageView === 'dashboard' && <SaasDashboard t={t} isRtl={isRtl} />}

      {pageView === 'pricing' && <GlobalPricingPanel t={t} isRtl={isRtl} />}

      {pageView === 'audit' && <PlatformAuditLog t={t} isRtl={isRtl} tenants={tenants || []} />}

      {pageView === 'announcements' && <SystemAnnouncements t={t} isRtl={isRtl} />}

      {pageView === 'settings' && <PlatformSettings t={t} isRtl={isRtl} />}

      {pageView === 'companies' && (<>
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className={cn("px-3 sm:px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الشركة', 'Company')}</th>
                <th className={cn("px-3 sm:px-6 py-4 font-semibold hidden sm:table-cell", isRtl ? "text-right" : "text-left")}>{t('الترخيص', 'License')}</th>
                <th className={cn("px-3 sm:px-6 py-4 font-semibold hidden md:table-cell", isRtl ? "text-right" : "text-left")}>{t('الموديولات', 'Modules')}</th>
                <th className={cn("px-3 sm:px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-3 sm:px-6 py-4 font-semibold hidden lg:table-cell", isRtl ? "text-right" : "text-left")}>{t('تاريخ الإنضمام', 'Joined')}</th>
                <th className={cn("px-3 sm:px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants?.map((tenant: any) => {
                const activeMods = getModuleBadges(tenant);
                const shortLabels: Record<string, { ar: string; en: string }> = {
                  moduleCoreBasic: { ar: 'أساسي', en: 'Basic' },
                  moduleCoreEdge: { ar: 'Edge', en: 'Edge' },
                  moduleAdvancedLending: { ar: 'إقراض متقدم', en: 'Adv. Lending' },
                  moduleFinancialSettlements: { ar: 'تسويات', en: 'Settlements' },
                  moduleSavings: { ar: 'ادخار', en: 'Savings' },
                  moduleHRPayroll: { ar: 'موارد بشرية', en: 'HR & Payroll' },
                };
                return (
                  <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-semibold text-sm">{isRtl ? (tenant.companyNameAr || tenant.companyName) : tenant.companyName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail size={11} /> {tenant.contactEmail || '—'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 font-mono text-xs hidden sm:table-cell">{tenant.fraLicenseNumber || '—'}</td>
                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {activeMods.length > 0 ? activeMods.map(m => {
                          const colors = COLOR_MAP[m.color];
                          const label = shortLabels[m.key];
                          return (
                            <span key={m.key} className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", colors.bg, colors.text, colors.border)}>
                              {isRtl ? label?.ar : label?.en}
                            </span>
                          );
                        }) : <span className="text-xs text-muted-foreground">{t('لا يوجد', 'None')}</span>}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      {tenant.isActive
                        ? <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium"><CheckCircle2 size={14} /> {t('نشط', 'Active')}</span>
                        : <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium"><XCircle size={14} /> {t('معطّل', 'Suspended')}</span>}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-muted-foreground text-xs hidden lg:table-cell">{formatDate(tenant.createdAt)}</td>
                    <td className="px-3 sm:px-6 py-4">
                      <button
                        onClick={() => openConfig(tenant.id)}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Settings size={12} /> {t('إدارة', 'Manage')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tenants?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Building2 size={32} className="mx-auto mb-3 opacity-20" />
                    {t('لا توجد شركات', 'No companies found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30">
              <h3 className="text-lg sm:text-xl font-bold">{t('إضافة شركة جديدة', 'Add New Company')}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><XCircle size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="tenant-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('اسم الشركة (إنجليزي)', 'Company Name (EN)')} *</label>
                  <input required className="premium-input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('اسم الشركة (عربي)', 'Company Name (AR)')}</label>
                  <input className="premium-input" value={formData.companyNameAr} onChange={e => setFormData({ ...formData, companyNameAr: e.target.value })} dir="rtl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('رقم ترخيص الرقابة', 'FRA License')}</label>
                  <input className="premium-input" value={formData.fraLicenseNumber} onChange={e => setFormData({ ...formData, fraLicenseNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('الباقة', 'Plan')}</label>
                  <select className="premium-input" value={formData.subscriptionPlan} onChange={e => setFormData({ ...formData, subscriptionPlan: e.target.value })}>
                    <option value="Basic">Basic</option>
                    <option value="Edge">Edge</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('البريد الإلكتروني للتواصل', 'Contact Email')}</label>
                  <input type="email" className="premium-input" dir="ltr" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('رقم الهاتف', 'Contact Phone')}</label>
                  <input className="premium-input" dir="ltr" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} />
                </div>
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-border mt-2">
                  <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><ShieldCheck size={16} /> {t('حساب المشرف الأول', 'Initial Admin Account')}</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('اسم المشرف', 'Admin Name')} *</label>
                  <input required className="premium-input" value={formData.adminName} onChange={e => setFormData({ ...formData, adminName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('البريد الإلكتروني', 'Admin Email')} *</label>
                  <input required type="email" className="premium-input" value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">{t('كلمة المرور', 'Password')} *</label>
                  <div className="relative">
                    <input required type={showNewPwd ? 'text' : 'password'} className="premium-input pr-10" value={formData.adminPassword} onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} dir="ltr" />
                    <button type="button" className="absolute inset-y-0 right-3 flex items-center text-muted-foreground" onClick={() => setShowNewPwd(!showNewPwd)}>
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-border bg-secondary/30 flex justify-end gap-3">
              <button onClick={() => setIsDialogOpen(false)} className="px-5 py-2.5 rounded-xl font-medium hover:bg-secondary transition-colors">{t('إلغاء', 'Cancel')}</button>
              <button form="tenant-form" type="submit" disabled={createMutation.isPending} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium disabled:opacity-50 flex items-center gap-2">
                {createMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
                {t('حفظ', 'Create Company')}
              </button>
            </div>
          </div>
        </div>
      )}

      {configTenant && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center bg-secondary/30 gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold truncate">{isRtl ? (configTenant.companyNameAr || configTenant.companyName) : configTenant.companyName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('إدارة الشركة — المشرف العام', 'Company Management — Super Admin')}</p>
              </div>
              <button onClick={() => setConfigTenantId(null)} className="text-muted-foreground hover:text-foreground shrink-0"><XCircle size={22} /></button>
            </div>

            <div className="flex border-b border-border bg-secondary/20 overflow-x-auto">
              {tabConfig.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                      activeTab === tab.key
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon size={15} /> {isRtl ? tab.labelAr : tab.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
              {activeTab === 'details' && (
                <EditDetailsTab
                  tenant={configTenant}
                  t={t}
                  isRtl={isRtl}
                  saving={updateMutation.isPending}
                  onSave={(data) => updateMutation.mutate({ id: configTenant.id, data })}
                />
              )}
              {activeTab === 'users' && (
                <UsersTab tenant={configTenant} t={t} isRtl={isRtl} />
              )}
              {activeTab === 'subscription' && (
                <SubscriptionTab tenant={configTenant} t={t} isRtl={isRtl}
                  onToggleFeature={(field, currentValue) => toggleFeature(configTenant.id, field, currentValue)}
                  featureToggling={updateMutation.isPending} />
              )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/30 flex justify-end">
              <button onClick={() => setConfigTenantId(null)} className="px-5 py-2 hover:bg-secondary rounded-xl font-medium text-sm">
                {t('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

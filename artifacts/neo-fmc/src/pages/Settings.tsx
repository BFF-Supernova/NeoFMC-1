import { useState, useEffect } from 'react';
import {
  useGetSettings, useUpdateSettings,
  useListBranches, useCreateBranch, getListBranchesQueryKey,
  useListFundProducts, useCreateFundProduct, useUpdateFundProduct, getListFundProductsQueryKey,
  useListUsers, useCreateUser, useUpdateUser, getListUsersQueryKey,
  getGetSettingsQueryKey,
} from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdminDelete } from '@/hooks/useSuperAdminDelete';
import {
  Building2, MapPin, Package, Settings as SettingsIcon,
  Loader2, Plus, X, Edit2, Users, Save, Lock, Calendar, Trash2, Search,
  CreditCard, CheckCircle, XCircle, Layers, Eye, EyeOff,
} from 'lucide-react';

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground block">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";
const selectCls = inputCls + " cursor-pointer";
const disabledInputCls = inputCls + " opacity-60 cursor-not-allowed";

export default function Settings() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'company' | 'branches' | 'products' | 'users' | 'holidays' | 'subscription' | 'identifications' | 'fieldVisibility'>('company');

  const { isSuperAdmin: isSA, deleteRecord: saDelete } = useSuperAdminDelete();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdmin = user?.role === 'TenantAdmin' || isSuperAdmin;

  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: branches, isLoading: branchesLoading } = useListBranches();
  const { data: products, isLoading: productsLoading } = useListFundProducts();
  const { data: users, isLoading: usersLoading } = useListUsers();

  const [usersPage, setUsersPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    companyName: '', companyNameAr: '', contactEmail: '', contactPhone: '',
    fraLicenseNumber: '', subscriptionPlan: 'Basic',
    iscoreEnabled: false, epaymentFawryEnabled: false, epaymentOpayEnabled: false,
    epaymentKhaznaEnabled: false, epaymentMeezaEnabled: false,
    moduleCoreBasic: true, moduleCoreEdge: false, moduleAdvancedLending: false, moduleFinancialSettlements: false,
  });

  useEffect(() => {
    if (settings) {
      setCompanyForm({
        companyName: (settings as any).companyName || '',
        companyNameAr: (settings as any).companyNameAr || '',
        contactEmail: (settings as any).contactEmail || '',
        contactPhone: (settings as any).contactPhone || '',
        fraLicenseNumber: (settings as any).fraLicenseNumber || '',
        subscriptionPlan: (settings as any).subscriptionPlan || 'Basic',
        iscoreEnabled: (settings as any).iscoreEnabled || false,
        epaymentFawryEnabled: (settings as any).epaymentFawryEnabled || false,
        epaymentOpayEnabled: (settings as any).epaymentOpayEnabled || false,
        epaymentKhaznaEnabled: (settings as any).epaymentKhaznaEnabled || false,
        epaymentMeezaEnabled: (settings as any).epaymentMeezaEnabled || false,
        moduleCoreBasic: (settings as any).moduleCoreBasic ?? true,
        moduleCoreEdge: (settings as any).moduleCoreEdge || false,
        moduleAdvancedLending: (settings as any).moduleAdvancedLending || false,
        moduleFinancialSettlements: (settings as any).moduleFinancialSettlements || false,
      });
    }
  }, [settings]);

  const updateSettingsMutation = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        setCompanyEditing(false);
      },
      onError: (err: any) => {
        handleApiError(err, t('فشل في حفظ بيانات الشركة', 'Failed to save company info'));
      },
    },
  });

  async function saveCompanyInfo() {
    if (!settings) return;
    updateSettingsMutation.mutate({ data: companyForm as any });
  }

  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    productName: '', interestRateType: 'flat', interestRate: '', amortizationMethod: 'equal_installments',
    minAmount: '', maxAmount: '', maxTermMonths: '24', minTermMonths: '3',
    adminFeePct: '', insuranceFeePct: '', stampDutyPct: '', penaltyRatePerDay: '', penaltyCapPct: '',
    earlyPaymentFeePct: '', rescheduleFeePct: '', defaultCommissionPct: '', gracePeriodDays: '',
    requiresGuarantor: false, isZeroInterest: false, amortizationFrequency: 'monthly',
  });
  const [productError, setProductError] = useState('');

  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ branchNameAr: '', branchNameEn: '', address: '' });

  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '', role: 'LoanOfficer', isSuperUser: false, branchId: '' });
  const [userError, setUserError] = useState('');
  const [userSearch, setUserSearch] = useState('');


  const createProduct = useCreateFundProduct({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListFundProductsQueryKey() }); setProductModal(false); setEditProduct(null); setProductError(''); },
    onError: (e: any) => setProductError(e?.message || e?.data?.message || t('خطأ في إنشاء المنتج', 'Error creating product')),
  }});
  const updateProduct = useUpdateFundProduct({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListFundProductsQueryKey() }); setProductModal(false); setEditProduct(null); setProductError(''); },
    onError: (e: any) => setProductError(e?.message || e?.data?.message || t('خطأ في تحديث المنتج', 'Error updating product')),
  }});

  const createBranch = useCreateBranch({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListBranchesQueryKey() }); setBranchModal(false); },
  }});

  const createUser = useCreateUser({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setUserModal(false); setEditUser(null); setUserError(''); },
    onError: (e: any) => setUserError(e?.data?.message || 'Error'),
  }});
  const updateUser = useUpdateUser({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setUserModal(false); setEditUser(null); setUserError(''); },
    onError: (e: any) => setUserError(e?.data?.message || 'Error'),
  }});

  function openNewProduct() {
    setEditProduct(null);
    setProductForm({ productName: '', interestRateType: 'flat', interestRate: '', amortizationMethod: 'equal_installments', minAmount: '', maxAmount: '', maxTermMonths: '24', minTermMonths: '3', adminFeePct: '', insuranceFeePct: '', stampDutyPct: '', penaltyRatePerDay: '', penaltyCapPct: '', earlyPaymentFeePct: '', rescheduleFeePct: '', defaultCommissionPct: '', gracePeriodDays: '', requiresGuarantor: false, isZeroInterest: false, amortizationFrequency: 'monthly' });
    setProductError('');
    setProductModal(true);
  }

  function openEditProduct(p: any) {
    setEditProduct(p);
    setProductForm({
      productName: p.productName || '', interestRateType: p.interestRateType || 'flat',
      interestRate: p.interestRate?.toString() || '', amortizationMethod: p.amortizationMethod || 'equal_installments',
      minAmount: p.minAmount?.toString() || '', maxAmount: p.maxAmount?.toString() || '',
      maxTermMonths: p.maxTermMonths?.toString() || '24', minTermMonths: p.minTermMonths?.toString() || '3',
      adminFeePct: p.adminFeePct?.toString() || '', insuranceFeePct: p.insuranceFeePct?.toString() || '',
      stampDutyPct: p.stampDutyPct?.toString() || '',
      penaltyRatePerDay: p.penaltyRatePerDay?.toString() || '', penaltyCapPct: p.penaltyCapPct?.toString() || '',
      earlyPaymentFeePct: p.earlyPaymentFeePct?.toString() || '', rescheduleFeePct: p.rescheduleFeePct?.toString() || '',
      defaultCommissionPct: p.defaultCommissionPct?.toString() || '', gracePeriodDays: p.gracePeriodDays?.toString() || '',
      requiresGuarantor: p.requiresGuarantor || false,
      isZeroInterest: p.isZeroInterest || false,
      amortizationFrequency: p.amortizationFrequency || 'monthly',
    });
    setProductError('');
    setProductModal(true);
  }

  function submitProduct() {
    if (!productForm.productName || !productForm.minAmount || !productForm.maxAmount) {
      setProductError(t('يرجى ملء الحقول الإلزامية', 'Please fill required fields'));
      return;
    }
    const data = {
      productName: productForm.productName,
      interestRateType: productForm.interestRateType,
      interestRate: productForm.interestRate ? parseFloat(productForm.interestRate) : undefined,
      amortizationMethod: productForm.amortizationMethod,
      minAmount: parseFloat(productForm.minAmount),
      maxAmount: parseFloat(productForm.maxAmount),
      maxTermMonths: productForm.maxTermMonths ? parseInt(productForm.maxTermMonths) : undefined,
      minTermMonths: productForm.minTermMonths ? parseInt(productForm.minTermMonths) : undefined,
      adminFeePct: productForm.adminFeePct ? parseFloat(productForm.adminFeePct) : undefined,
      insuranceFeePct: productForm.insuranceFeePct ? parseFloat(productForm.insuranceFeePct) : undefined,
      penaltyRatePerDay: productForm.penaltyRatePerDay ? parseFloat(productForm.penaltyRatePerDay) : undefined,
      penaltyCapPct: productForm.penaltyCapPct ? parseFloat(productForm.penaltyCapPct) : undefined,
      earlyPaymentFeePct: productForm.earlyPaymentFeePct ? parseFloat(productForm.earlyPaymentFeePct) : undefined,
      rescheduleFeePct: productForm.rescheduleFeePct ? parseFloat(productForm.rescheduleFeePct) : undefined,
      defaultCommissionPct: productForm.defaultCommissionPct ? parseFloat(productForm.defaultCommissionPct) : undefined,
      gracePeriodDays: productForm.gracePeriodDays ? parseInt(productForm.gracePeriodDays) : undefined,
      requiresGuarantor: productForm.requiresGuarantor,
      stampDutyPct: productForm.stampDutyPct ? parseFloat(productForm.stampDutyPct) : undefined,
      isZeroInterest: productForm.isZeroInterest,
      amortizationFrequency: productForm.amortizationFrequency,
    };
    if (editProduct) {
      updateProduct.mutate({ id: editProduct.id, data } as any);
    } else {
      createProduct.mutate({ data } as any);
    }
  }

  function openNewUser() {
    setEditUser(null);
    setUserForm({ fullName: '', email: '', password: '', role: 'LoanOfficer', isSuperUser: false, branchId: '' });
    setUserError('');
    setUserModal(true);
  }

  function openEditUser(u: any) {
    setEditUser(u);
    setUserForm({ fullName: u.fullName || '', email: u.email || '', password: '', role: u.role || 'LoanOfficer', isSuperUser: u.isSuperUser || false, branchId: u.branchId || '' });
    setUserError('');
    setUserModal(true);
  }

  function submitUser() {
    if (!userForm.fullName || !userForm.email || (!editUser && !userForm.password)) {
      setUserError(t('يرجى ملء الحقول الإلزامية', 'Please fill required fields'));
      return;
    }
    const data: any = { fullName: userForm.fullName, email: userForm.email, role: userForm.role, isSuperUser: userForm.isSuperUser };
    if (userForm.password) data.password = userForm.password;
    if (userForm.branchId) data.branchId = userForm.branchId;
    else data.branchId = null;
    if (editUser) {
      updateUser.mutate({ id: editUser.id, data } as any);
    } else {
      createUser.mutate({ data } as any);
    }
  }

  const pf = productForm;
  const sf = (key: string, val: string | boolean) => setProductForm(prev => ({ ...prev, [key]: val }));
  const cf = (key: string, val: string | boolean) => setCompanyForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('إعدادات النظام', 'System Settings')}</h2>
          <p className="text-muted-foreground">{t('إدارة الشركة، الفروع، والمنتجات التمويلية', 'Manage company, branches, and loan products')}</p>
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar">
        {[
          { key: 'company', icon: Building2, ar: 'بيانات الشركة', en: 'Company Info' },
          { key: 'branches', icon: MapPin, ar: 'الفروع', en: 'Branches' },
          { key: 'products', icon: Package, ar: 'المنتجات', en: 'Products' },
          { key: 'users', icon: Users, ar: 'المستخدمون', en: 'Users' },
          { key: 'holidays', icon: Calendar, ar: 'تقويم العطلات', en: 'Holidays' },
          ...(isSuperAdmin ? [{ key: 'identifications', icon: Layers, ar: 'وثائق التعريف', en: 'Identification Fields' }] : []),
          ...(isSuperAdmin ? [{ key: 'fieldVisibility', icon: Eye, ar: 'إظهار/إخفاء الحقول', en: 'Field Visibility' }] : []),
          ...(isAdmin && !isSuperAdmin ? [{ key: 'subscription', icon: CreditCard, ar: 'الاشتراك', en: 'Subscription' }] : []),
        ].map(({ key, icon: Icon, ar, en }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={cn("px-5 py-4 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap text-sm",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={16} /> {t(ar, en)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'company' && (
          <div className="premium-card p-6 md:p-8 animate-fade-in max-w-3xl">
            {settingsLoading ? <Loader2 className="animate-spin text-primary" /> : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">{t('بيانات الشركة', 'Company Information')}</h3>
                  {isAdmin && !companyEditing && (
                    <button onClick={() => setCompanyEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors">
                      <Edit2 size={16} /> {t('تعديل', 'Edit')}
                    </button>
                  )}
                </div>
                {companyEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label={t('اسم الشركة (إنجليزي)', 'Company Name (English)')} required>
                        <input className={inputCls} value={companyForm.companyName} onChange={e => cf('companyName', e.target.value)} />
                      </Field>
                      <Field label={t('اسم الشركة (عربي)', 'Company Name (Arabic)')}>
                        <input className={inputCls} value={companyForm.companyNameAr} onChange={e => cf('companyNameAr', e.target.value)} dir="rtl" />
                      </Field>
                      <Field label={t('البريد الإلكتروني', 'Contact Email')}>
                        <input className={inputCls} type="email" value={companyForm.contactEmail} onChange={e => cf('contactEmail', e.target.value)} dir="ltr" />
                      </Field>
                      <Field label={t('رقم الهاتف', 'Contact Phone')}>
                        <input className={inputCls} value={companyForm.contactPhone} onChange={e => cf('contactPhone', e.target.value)} dir="ltr" />
                      </Field>
                    </div>

                    <div className="border-t border-border pt-4 mt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Lock size={14} className="text-yellow-400" />
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          {t('بيانات تنظيمية (مسؤول النظام فقط)', 'Regulatory Info (Super Admin Only)')}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label={t('رقم ترخيص الرقابة المالية', 'FRA License Number')}>
                          <input className={isSuperAdmin ? inputCls : disabledInputCls} value={companyForm.fraLicenseNumber} onChange={e => cf('fraLicenseNumber', e.target.value)} disabled={!isSuperAdmin} />
                        </Field>
                        <Field label={t('خطة الاشتراك', 'Subscription Plan')}>
                          <select className={isSuperAdmin ? selectCls : disabledInputCls} value={companyForm.subscriptionPlan} onChange={e => cf('subscriptionPlan', e.target.value)} disabled={!isSuperAdmin}>
                            <option value="Basic">Basic</option>
                            <option value="Professional">Professional</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                        </Field>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Lock size={14} className="text-yellow-400" />
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          {isSuperAdmin
                            ? t('الوحدات والتكاملات (مسؤول النظام فقط)', 'Modules & Integrations (Super Admin Only)')
                            : t('الوحدات والتكاملات (عرض فقط)', 'Modules & Integrations (View Only)')}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'moduleCoreBasic', ar: 'التمويل الأساسي', en: 'Core Basic' },
                          { key: 'moduleCoreEdge', ar: 'التمويل المتقدم', en: 'Core Edge' },
                          { key: 'moduleAdvancedLending', ar: 'الإقراض المتقدم', en: 'Advanced Lending' },
                          { key: 'moduleFinancialSettlements', ar: 'التسويات المالية', en: 'Financial Settlements' },
                          { key: 'iscoreEnabled', ar: 'iScore', en: 'iScore' },
                          { key: 'epaymentFawryEnabled', ar: 'Fawry', en: 'Fawry' },
                          { key: 'epaymentOpayEnabled', ar: 'OPay', en: 'OPay' },
                          { key: 'epaymentKhaznaEnabled', ar: 'Khazna', en: 'Khazna' },
                          { key: 'epaymentMeezaEnabled', ar: 'Meeza', en: 'Meeza' },
                        ].map(item => (
                          <label key={item.key} className={cn("flex items-center gap-2 p-2 rounded-lg", isSuperAdmin ? "hover:bg-muted/50 cursor-pointer" : "opacity-80 cursor-default")}>
                            <input type="checkbox" checked={(companyForm as any)[item.key]} onChange={e => isSuperAdmin && cf(item.key, e.target.checked)} disabled={!isSuperAdmin} className="w-4 h-4 rounded accent-primary" />
                            <span className="text-sm">{t(item.ar, item.en)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button onClick={saveCompanyInfo} disabled={updateSettingsMutation.isPending} className="flex items-center gap-2 px-6 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all disabled:opacity-60">
                        {updateSettingsMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {t('حفظ التغييرات', 'Save Changes')}
                      </button>
                      <button onClick={() => setCompanyEditing(false)} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
                        {t('إلغاء', 'Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { label: t('اسم الشركة', 'Company Name'), val: (settings as any)?.companyName },
                        { label: t('اسم الشركة (عربي)', 'Company Name (Arabic)'), val: (settings as any)?.companyNameAr || '-' },
                        { label: t('البريد الإلكتروني', 'Contact Email'), val: (settings as any)?.contactEmail || '-' },
                        { label: t('رقم الهاتف', 'Contact Phone'), val: (settings as any)?.contactPhone || '-' },
                        { label: t('رقم ترخيص الرقابة', 'FRA License'), val: (settings as any)?.fraLicenseNumber || '-' },
                        { label: t('خطة الاشتراك', 'Subscription Plan'), val: (settings as any)?.subscriptionPlan },
                      ].map(({ label, val }) => (
                        <div key={label} className="space-y-1">
                          <div className="text-sm font-medium text-muted-foreground">{label}</div>
                          <div className="font-bold">{val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                        {t('التكاملات المفعلة', 'Active Integrations')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'epaymentFawryEnabled', label: 'Fawry' },
                          { key: 'epaymentOpayEnabled', label: 'OPay' },
                          { key: 'epaymentKhaznaEnabled', label: 'Khazna' },
                          { key: 'epaymentMeezaEnabled', label: 'Meeza' },
                        ].map(item => (
                          <span key={item.key} className={cn("px-3 py-1 rounded-full text-xs font-medium", (settings as any)?.[item.key] ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground")}>
                            {item.label}: {(settings as any)?.[item.key] ? t('مفعل', 'Active') : t('معطل', 'Inactive')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'branches' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => { setBranchForm({ branchNameAr: '', branchNameEn: '', address: '' }); setBranchModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors">
                  <Plus size={16} /> {t('إضافة فرع', 'Add Branch')}
                </button>
              </div>
            )}
            <div className="premium-card overflow-hidden animate-fade-in">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                  <tr>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('كود الفرع', 'Branch Code')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الفرع', 'Branch Name')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الخزينة الرئيسية', 'Main Cashbox')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {branchesLoading ? (
                    <tr><td colSpan={3} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : branches?.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">{t('لا توجد فروع', 'No branches yet')}</td></tr>
                  ) : branches?.map(b => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{(b as any).branchCode || '-'}</td>
                      <td className="px-6 py-4 font-bold">{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</td>
                      <td className="px-6 py-4 font-mono text-primary">{b.mainCashBoxBalance} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={openNewProduct}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors">
                  <Plus size={16} /> {t('منتج جديد', 'New Product')}
                </button>
              </div>
            )}
            <div className="premium-card overflow-hidden animate-fade-in">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                  <tr>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المنتج', 'Product')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('نوع الفائدة', 'Rate Type')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الفائدة %', 'Rate %')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount Range')}</th>
                    <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                    {isAdmin && <th className="px-6 py-4"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {productsLoading ? (
                    <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : products?.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t('لا توجد منتجات', 'No products yet')}</td></tr>
                  ) : products?.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-bold">{p.productName}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-secondary rounded text-xs">{p.interestRateType === 'flat' ? t('ثابتة', 'Flat') : t('متناقصة', 'Declining')}</span></td>
                      <td className="px-6 py-4 font-mono text-accent">{p.interestRate}%</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.minAmount?.toLocaleString()} – {p.maxAmount?.toLocaleString()} EGP</td>
                      <td className="px-6 py-4">
                        {p.isActive ? <span className="text-green-400 text-xs font-bold">● {t('نشط', 'Active')}</span> : <span className="text-red-400 text-xs">● {t('معطل', 'Inactive')}</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <button onClick={() => openEditProduct(p)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Edit2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                  placeholder={t('بحث بالاسم أو البريد...', 'Search by name or email...')}
                  className={cn("w-full py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all", isRtl ? "pr-9 pl-3" : "pl-9 pr-3")}
                />
                {userSearch && (
                  <button onClick={() => { setUserSearch(''); setUsersPage(1); }} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", isRtl ? "left-3" : "right-3")}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {isAdmin && (
                <button onClick={openNewUser}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shrink-0">
                  <Plus size={16} /> {t('مستخدم جديد', 'New User')}
                </button>
              )}
            </div>
            {(() => {
              if (usersLoading) return <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;
              if (!(users as any[])?.length) return <div className="py-10 text-center text-muted-foreground">{t('لا يوجد مستخدمون', 'No users yet')}</div>;
              const roleOrder: Record<string, number> = { TenantAdmin: 0, BranchManager: 1, LoanOfficer: 2, CollectionOfficer: 3, Cashier: 4, Auditor: 5, Accountant: 6, FinancialController: 7, CFO: 8, DataEntry: 9, HR: 10, HRManager: 11, HRSelfService: 12 };
              const q = userSearch.toLowerCase().trim();
              const filtered = (users as any[]).filter((u: any) => !q || (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
              if (q && !filtered.length) return <div className="py-10 text-center text-muted-foreground">{t('لا توجد نتائج', 'No results found')}</div>;
              const allUsers = [...filtered].sort((a, b) => {
                const ra = roleOrder[a.role] ?? 99;
                const rb = roleOrder[b.role] ?? 99;
                if (ra !== rb) return ra - rb;
                return (a.fullName || '').localeCompare(b.fullName || '');
              });
              const totalPages = Math.ceil(allUsers.length / USERS_PER_PAGE);
              const safePage = Math.min(usersPage, totalPages || 1);
              const paged = allUsers.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);
              return (
                <>
                  <div className="hidden md:block premium-card overflow-hidden animate-fade-in">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                        <tr>
                          <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم', 'Name')}</th>
                          <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('البريد', 'Email')}</th>
                          <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الدور', 'Role')}</th>
                          <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الفرع', 'Branch')}</th>
                          <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                          {isAdmin && <th className="px-6 py-4"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paged.map((u: any) => (
                          <tr key={u.id} className="hover:bg-muted/30">
                            <td className="px-6 py-4 font-bold">{u.fullName}</td>
                            <td className="px-6 py-4 font-mono text-sm text-muted-foreground" dir="ltr">{u.email}</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">{u.role}</span>{u.isSuperUser && <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-[10px] font-medium">SU</span>}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{(() => { const b = (branches as any[])?.find((br: any) => br.id === u.branchId); return b ? (isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)) : '-'; })()}</td>
                            <td className="px-6 py-4">
                              {u.isActive ? <span className="text-green-400 text-xs font-bold">● {t('نشط', 'Active')}</span> : <span className="text-red-400 text-xs">● {t('معطل', 'Inactive')}</span>}
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEditUser(u)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                    <Edit2 size={15} />
                                  </button>
                                  {isSA && u.role !== 'SuperAdmin' && (
                                    deleteConfirmId === u.id ? (
                                      <span className="inline-flex items-center gap-1">
                                        <button onClick={async () => { const ok = await saDelete('user', u.id, u.fullName, ['users']); if (ok) { setDeleteConfirmId(null); qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); } }} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg">{t('تأكيد', 'OK')}</button>
                                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">{t('إلغاء', 'X')}</button>
                                      </span>
                                    ) : (
                                      <button onClick={() => setDeleteConfirmId(u.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title={t('حذف', 'Delete')}>
                                        <Trash2 size={15} />
                                      </button>
                                    )
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-2 animate-fade-in">
                    {paged.map((u: any) => (
                      <div
                        key={u.id}
                        onClick={() => isAdmin && openEditUser(u)}
                        className={cn(
                          "premium-card p-4 transition-colors",
                          isAdmin && "cursor-pointer active:bg-muted/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-sm truncate">{u.fullName}</p>
                              {u.isActive
                                ? <span className="text-green-400 text-[10px] font-bold shrink-0">● {t('نشط', 'Active')}</span>
                                : <span className="text-red-400 text-[10px] shrink-0">● {t('معطل', 'Inactive')}</span>
                              }
                            </div>
                            <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">{u.email}</p>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[11px] font-medium">{u.role}</span>
                              {u.isSuperUser && <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-[10px] font-medium">SU</span>}
                              {(() => { const b = (branches as any[])?.find((br: any) => br.id === u.branchId); return b ? <span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded text-[11px]">{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</span> : null; })()}
                            </div>
                          </div>
                          {isAdmin && (
                            <Edit2 size={16} className="text-muted-foreground shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
            {!usersLoading && (users as any[])?.length > USERS_PER_PAGE && (() => {
              const total = (users as any[]).length;
              const totalPages = Math.ceil(total / USERS_PER_PAGE);
              const safePage = Math.min(usersPage, totalPages || 1);
              return (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-sm text-muted-foreground">
                    {t('عرض', 'Showing')} {((safePage - 1) * USERS_PER_PAGE) + 1}–{Math.min(safePage * USERS_PER_PAGE, total)} {t('من', 'of')} {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-border"
                    >
                      {t('السابق', 'Previous')}
                    </button>
                    {(() => {
                      const pages: (number | '...')[] = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (safePage > 3) pages.push('...');
                        const start = Math.max(2, safePage - 1);
                        const end = Math.min(totalPages - 1, safePage + 1);
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (safePage < totalPages - 2) pages.push('...');
                        pages.push(totalPages);
                      }
                      return pages.map((p, idx) =>
                        p === '...' ? (
                          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm">...</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setUsersPage(p)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                              p === safePage ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
                            )}
                          >
                            {p}
                          </button>
                        )
                      );
                    })()}
                    <button
                      onClick={() => setUsersPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-border"
                    >
                      {t('التالي', 'Next')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>

      <Modal open={productModal} onClose={() => { setProductModal(false); setEditProduct(null); }} title={t(editProduct ? 'تعديل المنتج' : 'منتج تمويلي جديد', editProduct ? 'Edit Product' : 'New Fund Product')}>
        <div className="space-y-4">
          {productError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{productError}</div>}
          <Field label={t('اسم المنتج', 'Product Name')} required>
            <input className={inputCls} value={pf.productName} onChange={e => sf('productName', e.target.value)} placeholder={t('مثال: قرض المشروع الصغير', 'e.g. Small Business Loan')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('نوع الفائدة', 'Interest Type')} required>
              <select className={selectCls} value={pf.interestRateType} onChange={e => sf('interestRateType', e.target.value)}>
                <option value="flat">{t('ثابتة', 'Flat')}</option>
                <option value="declining">{t('متناقصة', 'Declining')}</option>
              </select>
            </Field>
            <Field label={t('معدل الفائدة %', 'Interest Rate %')}>
              <input className={inputCls} type="number" step="0.01" value={pf.interestRate} onChange={e => sf('interestRate', e.target.value)} placeholder="18" />
            </Field>
          </div>
          <Field label={t('طريقة الاستهلاك', 'Amortization Method')} required>
            <select className={selectCls} value={pf.amortizationMethod} onChange={e => sf('amortizationMethod', e.target.value)}>
              <option value="equal_installments">{t('أقساط متساوية', 'Equal Installments')}</option>
              <option value="equal_principal">{t('أصل متساوٍ', 'Equal Principal')}</option>
              <option value="bullet">{t('دفعة واحدة', 'Bullet')}</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('الحد الأدنى (EGP)', 'Min Amount (EGP)')} required>
              <input className={inputCls} type="number" value={pf.minAmount} onChange={e => sf('minAmount', e.target.value)} placeholder="1000" />
            </Field>
            <Field label={t('الحد الأقصى (EGP)', 'Max Amount (EGP)')} required>
              <input className={inputCls} type="number" value={pf.maxAmount} onChange={e => sf('maxAmount', e.target.value)} placeholder="100000" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('أدنى مدة (شهر)', 'Min Term (months)')}>
              <input className={inputCls} type="number" value={pf.minTermMonths} onChange={e => sf('minTermMonths', e.target.value)} placeholder="3" />
            </Field>
            <Field label={t('أقصى مدة (شهر)', 'Max Term (months)')}>
              <input className={inputCls} type="number" value={pf.maxTermMonths} onChange={e => sf('maxTermMonths', e.target.value)} placeholder="24" />
            </Field>
          </div>
          <div className="border-t border-border pt-4 mt-2">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">{t('الرسوم والأحكام الاختيارية', 'Optional Fees & Terms')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('رسوم إدارية %', 'Admin Fee %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.adminFeePct} onChange={e => sf('adminFeePct', e.target.value)} placeholder="1.5" />
              </Field>
              <Field label={t('رسوم تأمين %', 'Insurance Fee %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.insuranceFeePct} onChange={e => sf('insuranceFeePct', e.target.value)} placeholder="0.5" />
              </Field>
              <Field label={t('رسم دمغة %', 'Stamp Duty %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.stampDutyPct} onChange={e => sf('stampDutyPct', e.target.value)} placeholder="0.0" />
              </Field>
              <Field label={t('تكرار السداد', 'Amortization Frequency')}>
                <select className={selectCls} value={pf.amortizationFrequency} onChange={e => sf('amortizationFrequency', e.target.value)}>
                  <option value="monthly">{t('شهري', 'Monthly')}</option>
                  <option value="daily">{t('يومي', 'Daily')}</option>
                </select>
              </Field>
              <Field label={t('بدون فائدة', 'Zero Interest')}>
                <label className="flex items-center gap-2 h-10">
                  <input type="checkbox" checked={pf.isZeroInterest} onChange={e => sf('isZeroInterest', e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
                  <span className="text-sm text-muted-foreground">{t('منتج بدون فائدة', 'Zero interest product')}</span>
                </label>
              </Field>
              <Field label={t('غرامة يومية %', 'Penalty/Day %')}>
                <input className={inputCls} type="number" step="0.001" value={pf.penaltyRatePerDay} onChange={e => sf('penaltyRatePerDay', e.target.value)} placeholder="0.1" />
              </Field>
              <Field label={t('حد الغرامة %', 'Penalty Cap %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.penaltyCapPct} onChange={e => sf('penaltyCapPct', e.target.value)} placeholder="10" />
              </Field>
              <Field label={t('رسوم السداد المبكر %', 'Early Payment Fee %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.earlyPaymentFeePct} onChange={e => sf('earlyPaymentFeePct', e.target.value)} placeholder="2" />
              </Field>
              <Field label={t('رسوم إعادة الجدولة %', 'Reschedule Fee %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.rescheduleFeePct} onChange={e => sf('rescheduleFeePct', e.target.value)} placeholder="1" />
              </Field>
              <Field label={t('عمولة الوكيل الافتراضية %', 'Default Commission %')}>
                <input className={inputCls} type="number" step="0.01" value={pf.defaultCommissionPct} onChange={e => sf('defaultCommissionPct', e.target.value)} placeholder="3" />
              </Field>
              <Field label={t('فترة السماح (يوم)', 'Grace Period (days)')}>
                <input className={inputCls} type="number" value={pf.gracePeriodDays} onChange={e => sf('gracePeriodDays', e.target.value)} placeholder="0" />
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input type="checkbox" id="requiresGuarantor" checked={pf.requiresGuarantor} onChange={e => sf('requiresGuarantor', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              <label htmlFor="requiresGuarantor" className="text-sm cursor-pointer">{t('يتطلب ضامن', 'Requires Guarantor')}</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={submitProduct} disabled={createProduct.isPending || updateProduct.isPending}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {(createProduct.isPending || updateProduct.isPending) ? <Loader2 className="animate-spin" size={18} /> : (editProduct ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء المنتج', 'Create Product'))}
            </button>
            <button onClick={() => { setProductModal(false); setEditProduct(null); }} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={branchModal} onClose={() => setBranchModal(false)} title={t('فرع جديد', 'New Branch')}>
        <div className="space-y-4">
          <Field label={t('اسم الفرع (عربي)', 'Branch Name (Arabic)')} required>
            <input className={inputCls} value={branchForm.branchNameAr} onChange={e => setBranchForm(p => ({ ...p, branchNameAr: e.target.value }))} dir="rtl" placeholder="الفرع الرئيسي" />
          </Field>
          <Field label={t('اسم الفرع (إنجليزي)', 'Branch Name (English)')}>
            <input className={inputCls} value={branchForm.branchNameEn} onChange={e => setBranchForm(p => ({ ...p, branchNameEn: e.target.value }))} dir="ltr" placeholder="Main Branch" />
          </Field>
          <Field label={t('العنوان', 'Address')}>
            <input className={inputCls} value={branchForm.address} onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))} placeholder={t('شارع...', 'Street...')} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createBranch.mutate({ data: branchForm } as any)} disabled={createBranch.isPending}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {createBranch.isPending ? <Loader2 className="animate-spin" size={18} /> : t('إنشاء الفرع', 'Create Branch')}
            </button>
            <button onClick={() => setBranchModal(false)} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={userModal} onClose={() => { setUserModal(false); setEditUser(null); }} title={t(editUser ? 'تعديل المستخدم' : 'مستخدم جديد', editUser ? 'Edit User' : 'New User')}>
        <div className="space-y-4">
          {userError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{userError}</div>}
          <Field label={t('الاسم الكامل', 'Full Name')} required>
            <input className={inputCls} value={userForm.fullName} onChange={e => setUserForm(p => ({ ...p, fullName: e.target.value }))} placeholder={t('الاسم بالكامل', 'Full name')} />
          </Field>
          <Field label={t('البريد الإلكتروني', 'Email')} required>
            <input className={inputCls} type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" dir="ltr" />
          </Field>
          <Field label={t(editUser ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور', editUser ? 'New Password (optional)' : 'Password')} required={!editUser}>
            <input className={inputCls} type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
          </Field>
          <Field label={t('الدور', 'Role')} required>
            <select className={selectCls} value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
              <option value="TenantAdmin">{t('مدير النظام', 'Tenant Admin')}</option>
              <option value="BranchManager">{t('مدير فرع', 'Branch Manager')}</option>
              <option value="LoanOfficer">{t('مسؤول قروض', 'Loan Officer')}</option>
              <option value="CollectionOfficer">{t('مسؤول تحصيل', 'Collection Officer')}</option>
              <option value="Cashier">{t('أمين صندوق', 'Cashier')}</option>
              <option value="Auditor">{t('مدقق', 'Auditor')}</option>
              <option value="DataEntry">{t('إدخال بيانات', 'Data Entry')}</option>
              <option value="Accountant">{t('محاسب', 'Accountant')}</option>
              <option value="FinancialController">{t('مراقب مالي', 'Financial Controller')}</option>
              <option value="CFO">{t('المدير المالي', 'CFO')}</option>
              <option value="HR">{t('موارد بشرية', 'HR')}</option>
              <option value="HRManager">{t('مدير الموارد البشرية', 'HR Manager')}</option>
              <option value="HRSelfService">{t('خدمة ذاتية للموظفين', 'HR Self-Service')}</option>
            </select>
          </Field>
          <Field label={t('الفرع', 'Branch')}>
            <select className={selectCls} value={userForm.branchId} onChange={e => setUserForm(p => ({ ...p, branchId: e.target.value }))}>
              <option value="">{t('بدون فرع', 'No Branch')}</option>
              {(branches as any[])?.map((b: any) => (
                <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('مستخدم متميز', 'Super User')}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={userForm.isSuperUser || false} onChange={e => setUserForm(p => ({ ...p, isSuperUser: e.target.checked }))} className="w-5 h-5 rounded border-border accent-primary" />
              <span className="text-sm text-muted-foreground">{t('يمكنه إدارة المستخدمين من نفس الدور', 'Can manage users of the same role')}</span>
            </label>
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={submitUser} disabled={createUser.isPending || updateUser.isPending}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {(createUser.isPending || updateUser.isPending) ? <Loader2 className="animate-spin" size={18} /> : (editUser ? t('حفظ', 'Save') : t('إنشاء', 'Create'))}
            </button>
            <button onClick={() => { setUserModal(false); setEditUser(null); }} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </Modal>

      {tab === 'holidays' && <HolidayCalendar />}

      {tab === 'subscription' && <SubscriptionView />}

      {tab === 'identifications' && isSuperAdmin && <IdentificationSettings />}

      {tab === 'fieldVisibility' && isSuperAdmin && <FieldVisibilitySettings />}

    </div>
  );
}

function FieldVisibilitySettings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [hiddenFields, setHiddenFields] = useState<Record<string, boolean>>({});
  const [availableFields, setAvailableFields] = useState<{ key: string; category: string; labelEn: string; labelAr: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const tenantId = user?.tenantId || localStorage.getItem('neo_fmc_sa_tenant');
    if (!tenantId) return;
    Promise.all([
      api.get<{ hiddenFields: Record<string, boolean>; availableFields: typeof availableFields }>(`/tenants/${tenantId}/hidden-fields`),
    ]).then(([data]) => {
      setHiddenFields(data.hiddenFields || {});
      setAvailableFields(data.availableFields || []);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const categories = [...new Set(availableFields.map(f => f.category))];
  const categoryLabels: Record<string, { ar: string; en: string }> = {
    client: { ar: 'حقول العميل', en: 'Client Fields' },
    loan: { ar: 'حقول القرض', en: 'Loan Fields' },
    financial: { ar: 'التقارير المالية', en: 'Financial Reports' },
    reports: { ar: 'التقارير', en: 'Reports' },
  };

  const handleToggle = (key: string) => {
    setHiddenFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = user?.tenantId || localStorage.getItem('neo_fmc_sa_tenant');
      if (!tenantId) throw new Error('No tenant');
      await api.put(`/tenants/${tenantId}/hidden-fields`, hiddenFields);
      toast({ title: t('نجاح', 'Success'), description: t('تم حفظ إعدادات إظهار الحقول', 'Field visibility settings saved') });
    } catch (err: any) {
      const msg = err?.conflicts
        ? t('لا يمكن إخفاء حقول مطلوبة في إعدادات التعريف', 'Cannot hide fields that are required in identification settings')
        : err?.message || t('فشل الحفظ', 'Failed to save');
      toast({ title: t('خطأ', 'Error'), description: msg, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (!loaded) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  const hiddenCount = Object.values(hiddenFields).filter(Boolean).length;

  return (
    <div className="premium-card p-6 md:p-8 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">{t('إعدادات إظهار/إخفاء الحقول', 'Field Visibility Settings')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('اختر الحقول التي تريد إخفاءها من واجهة المستخدم لهذا المستأجر. الحقول المخفية لن تظهر في النماذج والتقارير.', 'Choose fields to hide from the UI for this tenant. Hidden fields will not appear in forms and reports.')}</p>
        </div>
      </div>
      <div className="space-y-6">
        {categories.map(cat => (
          <div key={cat}>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t(categoryLabels[cat]?.ar || cat, categoryLabels[cat]?.en || cat)}
            </h4>
            <div className="space-y-2">
              {availableFields.filter(f => f.category === cat).map(field => (
                <label key={field.key} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    {hiddenFields[field.key] ? <EyeOff size={16} className="text-muted-foreground" /> : <Eye size={16} className="text-primary" />}
                    <span className={cn("font-medium", hiddenFields[field.key] && "text-muted-foreground line-through")}>{t(field.labelAr, field.labelEn)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(field.key)}
                    className={cn(
                      "relative w-12 h-7 rounded-full transition-colors duration-200",
                      !hiddenFields[field.key] ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
                      !hiddenFields[field.key] ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {hiddenCount > 0
            ? t(`${hiddenCount} حقل مخفي`, `${hiddenCount} field(s) hidden`)
            : t('جميع الحقول ظاهرة', 'All fields visible')}
        </p>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {t('حفظ', 'Save')}
        </button>
      </div>
    </div>
  );
}

function HolidayCalendar() {
  const { t, isRtl } = useLanguage();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', holidayDate: '', isRecurring: false });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>(`/holidays?year=${year}`);
      setHolidays(data);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  useEffect(() => { loadHolidays(); }, [year]);

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/holidays/${editingId}`, form);
      } else {
        await api.post('/holidays', form);
      }
      setShowAdd(false);
      setEditingId(null);
      setForm({ name: '', nameAr: '', holidayDate: '', isRecurring: false });
      loadHolidays();
    } catch (err) { handleApiError(err); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/holidays/${id}`);
      loadHolidays();
    } catch (err) { handleApiError(err); }
  };

  const startEdit = (h: any) => {
    setEditingId(h.id);
    setForm({ name: h.name, nameAr: h.nameAr || '', holidayDate: h.holidayDate, isRecurring: h.isRecurring });
    setShowAdd(true);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">{t('السنة', 'Year')}</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className={cn(inputCls, "w-28")}>
            {[year - 1, year, year + 1, year + 2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name: '', nameAr: '', holidayDate: '', isRecurring: false }); setShowAdd(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 text-sm font-medium">
          <Plus size={16} /> {t('إضافة عطلة', 'Add Holiday')}
        </button>
      </div>

      {showAdd && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{editingId ? t('تعديل العطلة', 'Edit Holiday') : t('عطلة جديدة', 'New Holiday')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('الاسم (إنجليزي)', 'Name (English)')} required>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label={t('الاسم (عربي)', 'Name (Arabic)')}>
              <input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} className={inputCls} dir="rtl" />
            </Field>
            <Field label={t('التاريخ', 'Date')} required>
              <input type="date" value={form.holidayDate} onChange={e => setForm(p => ({ ...p, holidayDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label={t('متكرر سنويًا', 'Recurring Annually')}>
              <label className="flex items-center gap-3 cursor-pointer h-10">
                <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(p => ({ ...p, isRecurring: e.target.checked }))} className="w-5 h-5 rounded border-border accent-primary" />
                <span className="text-sm text-muted-foreground">{t('يتكرر كل سنة في نفس التاريخ', 'Repeats every year on the same date')}</span>
              </label>
            </Field>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 text-sm font-medium">{t('حفظ', 'Save')}</button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80 text-sm font-medium">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        {loading ? <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم', 'Name')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم بالعربية', 'Name (AR)')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('متكرر', 'Recurring')}</th>
                  <th className="px-6 py-4 font-semibold text-center">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holidays.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Calendar className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد عطلات', 'No holidays')}</td></tr>
                ) : holidays.map(h => (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{h.holidayDate}</td>
                    <td className="px-6 py-4 font-medium">{h.name}</td>
                    <td className="px-6 py-4" dir="rtl">{h.nameAr || '-'}</td>
                    <td className="px-6 py-4">{h.isRecurring ? <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-xs">{t('نعم', 'Yes')}</span> : <span className="text-muted-foreground text-xs">-</span>}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(h)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionView() {
  const { t, isRtl } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any>('/subscriptions/my-subscription');
        setData(res);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">{t('لا توجد بيانات اشتراك', 'No subscription data available')}</div>;

  const modules: any[] = data.modules || [];
  const userLicenses: any[] = data.userLicenses || [];
  const subscribedModules = modules.filter((m: any) => m.isSubscribed);
  const unsubscribedModules = modules.filter((m: any) => !m.isSubscribed);
  const licensedUsers = userLicenses.filter((u: any) => u.maxUsers > 0);
  const totalLicenses = licensedUsers.reduce((s: number, u: any) => s + u.maxUsers, 0);
  const totalUsed = licensedUsers.reduce((s: number, u: any) => s + u.currentCount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-card p-5 text-center">
          <Layers size={20} className="mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold text-primary">{subscribedModules.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('وحدة مفعّلة', 'Active Modules')}</div>
        </div>
        <div className="premium-card p-5 text-center">
          <Users size={20} className="mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold text-primary">{totalUsed} <span className="text-muted-foreground text-base font-normal">/ {totalLicenses}</span></div>
          <div className="text-xs text-muted-foreground mt-1">{t('تراخيص مستخدمة', 'Licenses Used')}</div>
        </div>
        <div className="premium-card p-5 text-center">
          <CreditCard size={20} className="mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold text-primary">{licensedUsers.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('أنواع مستخدمين مرخّصة', 'Licensed User Types')}</div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Layers size={16} className="text-primary" />{t('الوحدات المشترك بها', 'Subscribed Modules')}</h3>
        {subscribedModules.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-6 text-center">{t('لا توجد وحدات مفعّلة', 'No active modules')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subscribedModules.map((m: any) => (
              <div key={m.moduleKey} className="premium-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{isRtl ? (m.moduleNameAr || m.moduleName) : m.moduleName}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      m.billingCycle === 'annual' ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                    )}>{m.billingCycle === 'annual' ? t('سنوي', 'Annual') : t('شهري', 'Monthly')}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{isRtl ? (m.descriptionAr || m.description) : m.description}</div>
                  {m.endDate && (
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {t('ينتهي في', 'Expires')}: {new Date(m.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {unsubscribedModules.length > 0 && (
        <div>
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-muted-foreground"><XCircle size={16} />{t('وحدات غير مشترك بها', 'Unsubscribed Modules')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {unsubscribedModules.map((m: any) => (
              <div key={m.moduleKey} className="premium-card p-5 flex items-start gap-4 opacity-50">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <XCircle size={20} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{isRtl ? (m.moduleNameAr || m.moduleName) : m.moduleName}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{isRtl ? (m.descriptionAr || m.description) : m.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Users size={16} className="text-primary" />{t('تراخيص المستخدمين', 'User Licenses')}</h3>
        {licensedUsers.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-6 text-center">{t('لا توجد تراخيص مستخدمين', 'No user licenses configured')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {licensedUsers.map((u: any) => {
              const pct = u.maxUsers > 0 ? Math.round((u.currentCount / u.maxUsers) * 100) : 0;
              const isNearLimit = pct >= 80;
              const isAtLimit = u.currentCount >= u.maxUsers;
              return (
                <div key={u.userType} className="premium-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-sm">{isRtl ? (u.displayNameAr || u.displayName) : u.displayName}</div>
                    <div className={cn("text-xs font-mono px-2 py-0.5 rounded-full",
                      isAtLimit ? "bg-destructive/10 text-destructive" : isNearLimit ? "bg-yellow-500/10 text-yellow-600" : "bg-primary/10 text-primary"
                    )}>
                      {u.currentCount}/{u.maxUsers}
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all",
                        isAtLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 text-end">{pct}% {t('مستخدم', 'used')}</div>
                </div>
              );
            })}
          </div>
        )}

        {userLicenses.filter((u: any) => u.maxUsers === 0).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('أنواع مستخدمين بدون ترخيص', 'Unlicensed User Types')}</h4>
            <div className="flex flex-wrap gap-2">
              {userLicenses.filter((u: any) => u.maxUsers === 0).map((u: any) => (
                <span key={u.userType} className="text-xs px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground">
                  {isRtl ? (u.displayNameAr || u.displayName) : u.displayName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IdentificationSettings() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const ID_FIELDS: { key: string; ar: string; en: string; icon: typeof Layers }[] = [
    { key: 'nationalId', ar: 'الرقم القومي', en: 'National ID', icon: CreditCard },
    { key: 'jobTitle', ar: 'المسمى الوظيفي', en: 'Job Title', icon: Users },
    { key: 'agriculturalLandId', ar: 'رقم حيازة الأرض الزراعية', en: 'Agricultural Land ID', icon: Layers },
    { key: 'professionLicenseId', ar: 'رقم رخصة المهنة', en: 'Profession License ID', icon: Layers },
    { key: 'taxId', ar: 'الرقم الضريبي', en: 'Tax ID', icon: Layers },
    { key: 'commercialRegistrationNo', ar: 'رقم السجل التجاري', en: 'Commercial Registration No.', icon: Layers },
  ];

  const defaultSettings = { nationalId: true, jobTitle: true, professionLicenseId: true, agriculturalLandId: true, taxId: true, commercialRegistrationNo: true };
  const [settings, setSettings] = useState<Record<string, boolean>>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<Record<string, boolean>>('/tenants/my/identification-settings')
      .then(data => { setSettings({ ...defaultSettings, ...data }); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const enabledCount = Object.values(settings).filter(Boolean).length;

  const handleToggle = (key: string) => {
    const newVal = !settings[key];
    if (!newVal && enabledCount <= 1) {
      toast({ title: t('تحذير', 'Warning'), description: t('يجب تفعيل حقل تعريف واحد على الأقل', 'At least one identification field must be enabled'), variant: 'destructive' });
      return;
    }
    setSettings(prev => ({ ...prev, [key]: newVal }));
  };

  const handleSave = async () => {
    if (enabledCount < 1) return;
    setSaving(true);
    try {
      const tenantId = user?.tenantId || localStorage.getItem('neo_fmc_sa_tenant');
      if (!tenantId) throw new Error('No tenant');
      await api.put(`/tenants/${tenantId}/identification-settings`, settings);
      toast({ title: t('نجاح', 'Success'), description: t('تم حفظ إعدادات وثائق التعريف', 'Identification settings saved') });
    } catch (err: any) {
      toast({ title: t('خطأ', 'Error'), description: err?.message || t('فشل الحفظ', 'Failed to save'), variant: 'destructive' });
    }
    setSaving(false);
  };

  if (!loaded) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Layers size={20} className="text-primary" />
          {t('إعدادات وثائق التعريف', 'Client Identification Documents')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t('اختر وثائق التعريف المطلوبة عند إضافة عميل جديد. يجب تفعيل وثيقة واحدة على الأقل.', 'Select which identification documents are required when adding new clients. At least one must be enabled.')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {ID_FIELDS.map(({ key, ar, en, icon: FieldIcon }) => {
          const active = !!settings[key];
          const isLastEnabled = active && enabledCount <= 1;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleToggle(key)}
              className={cn(
                'relative flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer group',
                active
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/20',
              )}
            >
              <div className={cn(
                'absolute top-2.5 flex items-center justify-center w-5 h-5 rounded border-2 transition-all duration-200',
                isRtl ? 'left-2.5' : 'right-2.5',
                active
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/40 bg-transparent',
              )}>
                {active && <CheckCircle size={14} className="text-primary-foreground" />}
              </div>

              <div className={cn(
                'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-200',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted/50 text-muted-foreground group-hover:bg-muted/80',
              )}>
                <FieldIcon size={24} />
              </div>

              <span className={cn(
                'text-xs sm:text-sm font-semibold leading-tight transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {t(ar, en)}
              </span>

              {active && (
                <span className="mt-2 text-[10px] sm:text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {t('مفعّل', 'Enabled')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            enabledCount >= 1 ? 'bg-emerald-400' : 'bg-red-400',
          )} />
          <p className="text-sm text-muted-foreground">
            {t(`${enabledCount} وثيقة مفعّلة من ${ID_FIELDS.length}`, `${enabledCount} of ${ID_FIELDS.length} enabled`)}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || enabledCount < 1} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {t('حفظ', 'Save')}
        </button>
      </div>
    </div>
  );
}

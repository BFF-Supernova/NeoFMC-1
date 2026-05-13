import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Users, Plus, Loader2, Calendar, DollarSign, ClipboardList, RefreshCw, Shield, ShieldOff, Link, User, Briefcase, Phone, Pencil, X, Settings, ChevronDown, ChevronRight, Check, XCircle, Send, BookOpen, ArrowRight, FileText, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { useSuperAdminDelete } from '@/hooks/useSuperAdminDelete';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Posted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Employees() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'TenantAdmin' || user?.role === 'SuperAdmin';
  const isHR = isAdmin || ['BranchManager', 'HR', 'HRManager'].includes(user?.role || '');
  const { isSuperAdmin, deleteRecord } = useSuperAdminDelete();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const isHRManager = isAdmin || user?.role === 'HRManager';
  const [tab, setTab] = useState<'employees' | 'payroll' | 'leaves' | 'claims' | 'settings'>('employees');
  const [employees, setEmployees] = useState<any>({ data: [], total: 0 });
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ branchId: '', fullName: '', fullNameAr: '', nationalId: '', phone: '', email: '', department: '', jobTitle: '', hireDate: '', contractType: 'FullTime', basicSalary: '', housingAllowance: '0', transportAllowance: '0', phoneAllowance: '0', socialInsuranceNo: '', socialInsuranceSalary: '', bankName: '', bankAccountNo: '', userId: '' });
  const [nextCode, setNextCode] = useState('');
  const [payrollForm, setPayrollForm] = useState({ periodMonth: String(new Date().getMonth() + 1), periodYear: String(new Date().getFullYear()), branchId: '' });
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', leaveType: 'Annual', startDate: '', endDate: '', days: '', reason: '' });
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [payrollConfig, setPayrollConfig] = useState<any>(null);
  const [taxBrackets, setTaxBrackets] = useState<any[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [payrollItems, setPayrollItems] = useState<Record<string, any[]>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadData(); api.get<any[]>('/branches').then(setBranches).catch(() => {}); if (isHR) loadUnlinkedUsers(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emp, pr, lv, ec] = await Promise.all([api.get<any>('/employees'), api.get<any>('/employees/payroll'), api.get<any>('/employees/leave-requests'), api.get<any>('/employees/expense-claims').catch(() => ({ data: [] }))]);
      setEmployees(emp); setPayrollRuns(pr.data || []); setLeaves(lv.data || []); setExpenseClaims(ec.data || []);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const loadUnlinkedUsers = async () => {
    try { const res = await api.get<any>('/employees/unlinked-users'); setUnlinkedUsers(res.data || []); } catch (_) {}
  };

  const fetchNextCode = async () => {
    try { const res = await api.get<any>('/employees/next-code'); setNextCode(res.code || ''); } catch (_) { setNextCode(''); }
  };

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const cfg = await api.get<any>('/employees/payroll-config');
      setPayrollConfig(cfg);
      const br = await api.get<any>(`/employees/tax-brackets?year=${cfg.effectiveYear || 2026}`);
      setTaxBrackets(br.data || []);
    } catch (err) { handleApiError(err); }
    setConfigLoading(false);
  }, []);

  useEffect(() => { if (tab === 'settings' && isHRManager && !payrollConfig) loadConfig(); }, [tab, isHRManager, payrollConfig, loadConfig]);

  const createEmployee = async () => {
    try {
      await api.post('/employees', { ...form, userId: form.userId || undefined, basicSalary: Number(form.basicSalary), housingAllowance: Number(form.housingAllowance), transportAllowance: Number(form.transportAllowance), phoneAllowance: Number(form.phoneAllowance), socialInsuranceSalary: Number(form.socialInsuranceSalary || 0) });
      setShowForm(false); loadData(); loadUnlinkedUsers();
    } catch (err) { handleApiError(err); }
  };

  const syncUsersAsEmployees = async () => {
    setSyncing(true);
    try {
      const res = await api.post<any>('/employees/sync-users', {});
      if (res.synced > 0) { loadData(); loadUnlinkedUsers(); }
      alert(res.message);
    } catch (err) { handleApiError(err); }
    setSyncing(false);
  };

  const handleLinkUser = (userId: string) => {
    const u = unlinkedUsers.find(u => u.id === userId);
    if (u) { setForm(f => ({ ...f, userId, fullName: f.fullName || u.fullName, email: f.email || u.email, branchId: f.branchId || u.branchId || '', department: f.department || u.role, jobTitle: f.jobTitle || u.role })); }
    else { setForm(f => ({ ...f, userId: '' })); }
  };

  const runPayroll = async () => {
    try {
      await api.post('/employees/payroll/run', { periodMonth: Number(payrollForm.periodMonth), periodYear: Number(payrollForm.periodYear), branchId: payrollForm.branchId || undefined });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const payrollAction = async (id: string, action: 'submit' | 'approve' | 'reject' | 'post') => {
    setActionLoading(id);
    try {
      if (action === 'reject') {
        const reason = prompt(isRtl ? 'سبب الرفض:' : 'Rejection reason:');
        if (!reason) { setActionLoading(null); return; }
        await api.put(`/employees/payroll/${id}/reject`, { reason });
      } else {
        await api.put(`/employees/payroll/${id}/${action}`, {});
      }
      loadData();
    } catch (err) { handleApiError(err); }
    setActionLoading(null);
  };

  const loadPayrollItems = async (runId: string) => {
    if (expandedRun === runId) { setExpandedRun(null); return; }
    setExpandedRun(runId);
    if (!payrollItems[runId]) {
      try {
        const res = await api.get<any>(`/employees/payroll/${runId}/items`);
        setPayrollItems(prev => ({ ...prev, [runId]: res.data || [] }));
      } catch (err) { handleApiError(err); }
    }
  };

  const handleClaimAction = async (id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt(isRtl ? 'سبب الرفض:' : 'Rejection reason:') : undefined;
    if (action === 'reject' && !reason) return;
    try { await api.put(`/employees/expense-claims/${id}/approve`, { action, rejectionReason: reason }); loadData(); } catch (err) { handleApiError(err); }
  };

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt(isRtl ? 'سبب الرفض:' : 'Rejection reason:') : undefined;
    if (action === 'reject' && !reason) return;
    try { await api.put(`/employees/leave-requests/${id}/approve`, { action, rejectionReason: reason }); loadData(); } catch (err) { handleApiError(err); }
  };

  const submitLeaveRequest = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.days) return;
    try {
      await api.post('/employees/leave-requests', leaveForm);
      setShowLeaveForm(false); setLeaveForm({ employeeId: '', leaveType: 'Annual', startDate: '', endDate: '', days: '', reason: '' }); loadData();
    } catch (err) { handleApiError(err); }
  };

  const openEditEmployee = (emp: any) => {
    setEditingEmployee(emp);
    setEditForm({
      fullName: emp.fullName || '', fullNameAr: emp.fullNameAr || '', nationalId: emp.nationalId || '',
      phone: emp.phone || '', email: emp.email || '', department: emp.department || '', jobTitle: emp.jobTitle || '',
      contractType: emp.contractType || 'FullTime', status: emp.status || 'Active',
      basicSalary: String(emp.basicSalary || 0), housingAllowance: String(emp.housingAllowance || 0),
      transportAllowance: String(emp.transportAllowance || 0), phoneAllowance: String(emp.phoneAllowance || 0),
      otherAllowances: String(emp.otherAllowances || 0),
      socialInsuranceNo: emp.socialInsuranceNo || '', socialInsuranceSalary: String(emp.socialInsuranceSalary || ''),
      bankName: emp.bankName || '', bankAccountNo: emp.bankAccountNo || '',
    });
  };

  const saveEditEmployee = async () => {
    if (!editingEmployee) return;
    try { await api.put(`/employees/${editingEmployee.id}`, editForm); setEditingEmployee(null); loadData(); } catch (err) { handleApiError(err); }
  };

  const saveConfig = async () => {
    if (!payrollConfig) return;
    try {
      await api.put('/employees/payroll-config', payrollConfig);
      alert(t('تم حفظ الإعدادات', 'Configuration saved'));
    } catch (err) { handleApiError(err); }
  };

  const saveTaxBrackets = async () => {
    try {
      await api.put('/employees/tax-brackets', { brackets: taxBrackets, fiscalYear: payrollConfig?.effectiveYear || 2026 });
      alert(t('تم حفظ شرائح الضريبة', 'Tax brackets saved'));
    } catch (err) { handleApiError(err); }
  };

  const tabList: { key: typeof tab; label: [string, string]; badge?: number }[] = [
    { key: 'employees', label: ['الموظفون', 'Employees'] },
    { key: 'payroll', label: ['الرواتب', 'Payroll'], badge: payrollRuns.filter(r => r.status === 'Submitted').length },
    { key: 'leaves', label: ['الإجازات', 'Leaves'], badge: leaves.filter((l: any) => l.status === 'Pending').length },
    { key: 'claims', label: ['طلبات المصروفات', 'Expense Claims'], badge: expenseClaims.filter((c: any) => c.status === 'Pending').length },
    ...(isHRManager ? [{ key: 'settings' as typeof tab, label: ['إعدادات الموارد البشرية', 'HR Settings'] as [string, string] }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">{t('الموارد البشرية الأساسية', 'Core HR & Payroll')}</h2><p className="text-muted-foreground mt-1">{t('إدارة شاملة للموظفين والرواتب والضرائب والتأمينات', 'Employee Central, Payroll, Tax & Social Insurance Management')}</p></div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={syncUsersAsEmployees} disabled={syncing} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 text-sm">
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {t('مزامنة المستخدمين', 'Sync Users')}
            </button>
          )}
          {isHR && (
            <button onClick={() => { setShowForm(true); setForm({ branchId: '', fullName: '', fullNameAr: '', nationalId: '', phone: '', email: '', department: '', jobTitle: '', hireDate: '', contractType: 'FullTime', basicSalary: '', housingAllowance: '0', transportAllowance: '0', phoneAllowance: '0', socialInsuranceNo: '', socialInsuranceSalary: '', bankName: '', bankAccountNo: '', userId: '' }); fetchNextCode(); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
              <Plus size={18} />{t('موظف جديد', 'New Employee')}
            </button>
          )}
        </div>
      </div>

      {isAdmin && unlinkedUsers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 text-sm">
          <Shield className="text-amber-500 shrink-0" size={20} />
          <span>{t(`يوجد ${unlinkedUsers.length} مستخدم نشط بدون سجل موظف. اضغط "مزامنة المستخدمين" لإنشاء سجلات الموظفين تلقائياً.`, `${unlinkedUsers.length} active user(s) without employee records. Click "Sync Users" to auto-create.`)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card p-4"><Users className="text-primary mb-2" size={20} /><div className="text-2xl font-bold">{employees.total || 0}</div><div className="text-xs text-muted-foreground">{t('إجمالي الموظفين', 'Total Employees')}</div></div>
        <div className="premium-card p-4"><DollarSign className="text-green-500 mb-2" size={20} /><div className="text-2xl font-bold">{payrollRuns.length}</div><div className="text-xs text-muted-foreground">{t('مسيرات الرواتب', 'Payroll Runs')}</div></div>
        <div className="premium-card p-4"><Calendar className="text-blue-500 mb-2" size={20} /><div className="text-2xl font-bold">{leaves.filter((l: any) => l.status === 'Pending').length}</div><div className="text-xs text-muted-foreground">{t('طلبات إجازة معلقة', 'Pending Leaves')}</div></div>
        <div className="premium-card p-4"><ClipboardList className="text-orange-500 mb-2" size={20} /><div className="text-2xl font-bold">{employees.data?.filter((e: any) => e.status === 'Active').length || 0}</div><div className="text-xs text-muted-foreground">{t('موظفون نشطون', 'Active Employees')}</div></div>
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {tabList.map(t2 => (
          <button key={t2.key} className={cn("px-5 py-3 font-medium border-b-2 text-sm whitespace-nowrap flex items-center gap-2", tab === t2.key ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab(t2.key)}>
            {t2.key === 'settings' && <Settings size={14} />}
            {t(t2.label[0], t2.label[1])}
            {t2.badge && t2.badge > 0 ? <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-600 rounded-full font-bold">{t2.badge}</span> : null}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('موظف جديد', 'New Employee')}</h3>
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <label className="text-sm font-medium flex items-center gap-2"><Link size={14} />{t('ربط بمستخدم نظام (اختياري)', 'Link to System User (optional)')}</label>
            <select value={form.userId} onChange={e => handleLinkUser(e.target.value)} className="input-field">
              <option value="">{t('بدون صلاحية دخول للنظام', 'No system access — standalone employee')}</option>
              {unlinkedUsers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} — {u.email} ({u.role})</option>)}
            </select>
          </div>
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><User size={14} />{t('البيانات الأساسية', 'Basic Information')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الفرع', 'Branch')} *</label><select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="input-field"><option value="">{t('اختر الفرع...', 'Select branch...')}</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</option>)}</select></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('كود الموظف', 'Employee Code')}</label><div className="input-field bg-muted/50 flex items-center gap-2 cursor-not-allowed"><span className="font-mono font-bold text-primary">{nextCode || '...'}</span><span className="text-muted-foreground text-[10px]">({t('تلقائي', 'Auto')})</span></div></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الاسم بالإنجليزية', 'Full Name (EN)')} *</label><input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الاسم بالعربية', 'Full Name (AR)')} *</label><input value={form.fullNameAr} onChange={e => setForm({ ...form, fullNameAr: e.target.value })} className="input-field" dir="rtl" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الرقم القومي', 'National ID')} *</label><input value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} maxLength={14} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('تاريخ التعيين', 'Hire Date')} *</label><input type="date" value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} className="input-field" /></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Briefcase size={14} />{t('بيانات العمل', 'Job Details')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('القسم', 'Department')}</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('المسمى الوظيفي', 'Job Title')}</label><input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('نوع العقد', 'Contract Type')}</label><select value={form.contractType} onChange={e => setForm({ ...form, contractType: e.target.value })} className="input-field"><option value="FullTime">{t('دوام كامل', 'Full Time')}</option><option value="PartTime">{t('دوام جزئي', 'Part Time')}</option><option value="Contract">{t('عقد مؤقت', 'Contract')}</option></select></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Phone size={14} />{t('بيانات التواصل', 'Contact')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('رقم الهاتف', 'Phone')}</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('البريد', 'Email')}</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><DollarSign size={14} />{t('الراتب والبدلات', 'Salary & Allowances')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الراتب الأساسي', 'Basic Salary')} *</label><input type="number" min="0" step="0.01" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدل سكن', 'Housing')}</label><input type="number" min="0" step="0.01" value={form.housingAllowance} onChange={e => setForm({ ...form, housingAllowance: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدل انتقال', 'Transport')}</label><input type="number" min="0" step="0.01" value={form.transportAllowance} onChange={e => setForm({ ...form, transportAllowance: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدل هاتف', 'Phone')}</label><input type="number" min="0" step="0.01" value={form.phoneAllowance} onChange={e => setForm({ ...form, phoneAllowance: e.target.value })} className="input-field" /></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Shield size={14} />{t('التأمينات والبنك', 'Insurance & Banking')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('رقم التأمينات', 'SI No.')}</label><input value={form.socialInsuranceNo} onChange={e => setForm({ ...form, socialInsuranceNo: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('أجر التأمينات', 'SI Salary')}</label><input type="number" min="0" step="0.01" value={form.socialInsuranceSalary} onChange={e => setForm({ ...form, socialInsuranceSalary: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('اسم البنك', 'Bank Name')}</label><input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('رقم الحساب', 'Account No.')}</label><input value={form.bankAccountNo} onChange={e => setForm({ ...form, bankAccountNo: e.target.value })} className="input-field" /></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2"><button onClick={createEmployee} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">{t('حفظ', 'Save')}</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button></div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : tab === 'employees' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start">{t('كود', 'Code')}</th><th className="p-3 text-start">{t('الاسم', 'Name')}</th><th className="p-3">{t('القسم', 'Dept')}</th><th className="p-3">{t('الوظيفة', 'Title')}</th><th className="p-3 text-end">{t('الراتب', 'Salary')}</th><th className="p-3">{t('النظام', 'Access')}</th><th className="p-3">{t('الحالة', 'Status')}</th>{isHR && <th className="p-3">{t('إجراء', 'Action')}</th>}</tr></thead>
            <tbody>{employees.data?.map((e: any) => (
              <tr key={e.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-mono">{e.employeeCode}</td><td className="p-3"><button onClick={() => setSelectedProfile(e)} className="font-medium hover:text-primary hover:underline underline-offset-2 transition-colors text-start">{isRtl ? (e.fullNameAr || e.fullName) : e.fullName}</button></td>
                <td className="p-3">{e.department}</td><td className="p-3">{e.jobTitle}</td>
                <td className="p-3 text-end">{formatCurrency(e.basicSalary)}</td>
                <td className="p-3">
                  {e.hasSystemAccess ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title={e.systemRole}><Shield size={12} />{e.systemRole}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"><ShieldOff size={12} />{t('بدون', 'None')}</span>
                  )}
                </td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", e.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700')}>{e.status}</span></td>
                {isHR && (
                  <td className="p-3">
                    <button onClick={() => openEditEmployee(e)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title={t('تعديل', 'Edit')}><Pencil size={14} /></button>
                    {isSuperAdmin && (
                      deleteConfirmId === e.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button onClick={async () => { const ok = await deleteRecord('employee', e.id, e.fullName, ['employees']); if (ok) { setDeleteConfirmId(null); loadData(); } }} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg">{t('تأكيد', 'OK')}</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">{t('إلغاء', 'X')}</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(e.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title={t('حذف', 'Delete')}><Trash2 size={14} /></button>
                      )
                    )}
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
          {(!employees.data || employees.data.length === 0) && <div className="p-8 text-center text-muted-foreground">{t('لا يوجد موظفون', 'No employees found')}</div>}
        </div>

      ) : tab === 'payroll' ? (
        <div className="space-y-4">
          <div className="premium-card p-6">
            <h3 className="text-lg font-bold mb-4">{t('مسير رواتب جديد', 'New Payroll Run')}</h3>
            <div className="flex gap-4 items-end flex-wrap">
              <div><label className="text-sm text-muted-foreground">{t('الشهر', 'Month')}</label><input type="number" min="1" max="12" value={payrollForm.periodMonth} onChange={e => setPayrollForm({ ...payrollForm, periodMonth: e.target.value })} className="input-field mt-1 w-24" /></div>
              <div><label className="text-sm text-muted-foreground">{t('السنة', 'Year')}</label><input type="number" value={payrollForm.periodYear} onChange={e => setPayrollForm({ ...payrollForm, periodYear: e.target.value })} className="input-field mt-1 w-28" /></div>
              <div><label className="text-sm text-muted-foreground">{t('الفرع', 'Branch')}</label>
                <select value={payrollForm.branchId} onChange={e => setPayrollForm({ ...payrollForm, branchId: e.target.value })} className="input-field mt-1">
                  <option value="">{t('الكل', 'All Branches')}</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)}</option>)}
                </select>
              </div>
              <button onClick={runPayroll} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg flex items-center gap-2"><DollarSign size={16} />{t('تشغيل', 'Run Payroll')}</button>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen size={14} className="text-blue-500" />{t('سير العمل', 'Payroll Workflow')}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 font-medium">{t('مسودة', 'Draft')}</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 font-medium text-blue-700 dark:text-blue-400">{t('مقدم', 'Submitted')}</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 font-medium text-green-700 dark:text-green-400">{t('معتمد', 'Approved')}</span>
              <ArrowRight size={12} />
              <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 font-medium text-purple-700 dark:text-purple-400">{t('مرحل', 'Posted')}</span>
            </div>
          </div>

          <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="p-3 w-8"></th>
                <th className="p-3">{t('الفترة', 'Period')}</th>
                <th className="p-3">{t('عدد', 'Count')}</th>
                <th className="p-3 text-end">{t('إجمالي', 'Gross')}</th>
                <th className="p-3 text-end">{t('تأمينات (موظف)', 'SI (Emp)')}</th>
                <th className="p-3 text-end">{t('تأمينات (شركة)', 'SI (ER)')}</th>
                <th className="p-3 text-end">{t('ضريبة', 'Tax')}</th>
                <th className="p-3 text-end">{t('صافي', 'Net')}</th>
                <th className="p-3">{t('الحالة', 'Status')}</th>
                <th className="p-3">{t('إجراءات', 'Actions')}</th>
              </tr></thead>
              <tbody>
                {payrollRuns.map((r: any) => (
                  <>
                    <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => loadPayrollItems(r.id)}>
                      <td className="p-3">{expandedRun === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td className="p-3 font-medium">{r.periodMonth}/{r.periodYear}</td>
                      <td className="p-3">{r.employeeCount}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(r.totalGross)}</td>
                      <td className="p-3 text-end font-mono text-orange-600">{formatCurrency(r.totalSocialInsuranceEmployee)}</td>
                      <td className="p-3 text-end font-mono text-orange-600">{formatCurrency(r.totalSocialInsuranceEmployer)}</td>
                      <td className="p-3 text-end font-mono text-red-600">{formatCurrency(r.totalIncomeTax)}</td>
                      <td className="p-3 text-end font-mono font-bold text-green-600">{formatCurrency(r.totalNet)}</td>
                      <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_COLORS[r.status] || STATUS_COLORS.Draft)}>{r.status}</span></td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 flex-wrap">
                          {r.status === 'Draft' && (
                            <button disabled={actionLoading === r.id} onClick={() => payrollAction(r.id, 'submit')} className="px-2 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1" title={t('تقديم للاعتماد', 'Submit for Approval')}>
                              {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} {t('تقديم', 'Submit')}
                            </button>
                          )}
                          {r.status === 'Submitted' && isHRManager && (
                            <>
                              <button disabled={actionLoading === r.id} onClick={() => payrollAction(r.id, 'approve')} className="px-2 py-1 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center gap-1">
                                {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} {t('اعتماد', 'Approve')}
                              </button>
                              <button disabled={actionLoading === r.id} onClick={() => payrollAction(r.id, 'reject')} className="px-2 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-1">
                                <XCircle size={10} /> {t('رفض', 'Reject')}
                              </button>
                            </>
                          )}
                          {r.status === 'Approved' && isHRManager && (
                            <button disabled={actionLoading === r.id} onClick={() => payrollAction(r.id, 'post')} className="px-2 py-1 text-xs rounded-lg bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-1">
                              {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />} {t('ترحيل مالي', 'Post to GL')}
                            </button>
                          )}
                          {r.status === 'Rejected' && (
                            <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} />{r.rejectionReason || t('مرفوض', 'Rejected')}</span>
                          )}
                          {r.status === 'Posted' && (
                            <span className="text-xs text-purple-500 flex items-center gap-1"><Check size={10} />{t('تم الترحيل', 'Posted')}</span>
                          )}
                          <button onClick={() => loadPayrollItems(r.id)} className="px-2 py-1 text-xs rounded-lg border hover:bg-muted flex items-center gap-1"><Eye size={10} /> {t('تفاصيل', 'Details')}</button>
                        </div>
                      </td>
                    </tr>
                    {expandedRun === r.id && (
                      <tr key={`${r.id}-items`}>
                        <td colSpan={10} className="bg-muted/20 p-0">
                          <div className="p-4">
                            <h4 className="font-semibold text-sm mb-3">{t('تفاصيل مسير الرواتب', 'Payroll Breakdown')} — {r.periodMonth}/{r.periodYear}</h4>
                            {payrollItems[r.id] ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead><tr className="bg-muted/60 border-b">
                                    <th className="p-2 text-start">{t('الموظف', 'Employee')}</th>
                                    <th className="p-2">{t('القسم', 'Dept')}</th>
                                    <th className="p-2 text-end">{t('أساسي', 'Basic')}</th>
                                    <th className="p-2 text-end">{t('بدلات', 'Allow.')}</th>
                                    <th className="p-2 text-end">{t('إجمالي', 'Gross')}</th>
                                    <th className="p-2 text-end">{t('تأمينات', 'SI')}</th>
                                    <th className="p-2 text-end">{t('ت. شركة', 'SI(ER)')}</th>
                                    <th className="p-2 text-end">{t('ضريبة', 'Tax')}</th>
                                    <th className="p-2 text-end">{t('خصومات', 'Ded.')}</th>
                                    <th className="p-2 text-end font-bold">{t('صافي', 'Net')}</th>
                                  </tr></thead>
                                  <tbody>
                                    {payrollItems[r.id].map((item: any) => (
                                      <tr key={item.id} className="border-b hover:bg-muted/20">
                                        <td className="p-2"><span className="font-medium">{isRtl ? (item.employeeNameAr || item.employeeName) : item.employeeName}</span><br/><span className="text-[10px] text-muted-foreground">{item.employeeCode}</span></td>
                                        <td className="p-2">{item.department}</td>
                                        <td className="p-2 text-end font-mono">{formatCurrency(item.basicSalary)}</td>
                                        <td className="p-2 text-end font-mono">{formatCurrency(item.allowances)}</td>
                                        <td className="p-2 text-end font-mono font-medium">{formatCurrency(item.grossSalary)}</td>
                                        <td className="p-2 text-end font-mono text-orange-600">{formatCurrency(item.socialInsuranceEmployee)}</td>
                                        <td className="p-2 text-end font-mono text-orange-600">{formatCurrency(item.socialInsuranceEmployer)}</td>
                                        <td className="p-2 text-end font-mono text-red-600">{formatCurrency(item.incomeTax)}</td>
                                        <td className="p-2 text-end font-mono text-red-600">{formatCurrency(item.totalDeductions)}</td>
                                        <td className="p-2 text-end font-mono font-bold text-green-600">{formatCurrency(item.netSalary)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot><tr className="bg-muted/40 font-semibold border-t-2">
                                    <td colSpan={4} className="p-2">{t('الإجمالي', 'Total')}</td>
                                    <td className="p-2 text-end font-mono">{formatCurrency(r.totalGross)}</td>
                                    <td className="p-2 text-end font-mono text-orange-600">{formatCurrency(r.totalSocialInsuranceEmployee)}</td>
                                    <td className="p-2 text-end font-mono text-orange-600">{formatCurrency(r.totalSocialInsuranceEmployer)}</td>
                                    <td className="p-2 text-end font-mono text-red-600">{formatCurrency(r.totalIncomeTax)}</td>
                                    <td className="p-2 text-end font-mono text-red-600">{formatCurrency(r.totalDeductions)}</td>
                                    <td className="p-2 text-end font-mono font-bold text-green-600">{formatCurrency(r.totalNet)}</td>
                                  </tr></tfoot>
                                </table>
                              </div>
                            ) : <div className="flex justify-center py-4"><Loader2 className="animate-spin" size={20} /></div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {payrollRuns.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا يوجد مسيرات رواتب', 'No payroll runs')}</div>}
          </div>
        </div>

      ) : tab === 'leaves' ? (
        <div className="space-y-4">
          {isHR && (
            <button onClick={() => setShowLeaveForm(!showLeaveForm)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg">
              <Plus size={16} />{t('تقديم طلب إجازة', 'Submit Leave Request')}
            </button>
          )}
          {showLeaveForm && (
            <div className="premium-card p-6 space-y-4">
              <h3 className="font-bold">{t('طلب إجازة جديد', 'New Leave Request')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الموظف', 'Employee')}</label>
                  <select value={leaveForm.employeeId} onChange={e => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} className="input-field">
                    <option value="">{t('اختر...', 'Select...')}</option>
                    {employees.data?.map((e: any) => <option key={e.id} value={e.id}>{isRtl ? (e.fullNameAr || e.fullName) : e.fullName} ({e.employeeCode})</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('النوع', 'Type')}</label>
                  <select value={leaveForm.leaveType} onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} className="input-field">
                    <option value="Annual">{t('سنوية', 'Annual')}</option><option value="Sick">{t('مرضية', 'Sick')}</option><option value="Casual">{t('عارضة', 'Casual')}</option><option value="Unpaid">{t('بدون راتب', 'Unpaid')}</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('عدد الأيام', 'Days')}</label><input type="number" min="1" value={leaveForm.days} onChange={e => setLeaveForm({ ...leaveForm, days: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('من', 'From')}</label><input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('إلى', 'To')}</label><input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('السبب', 'Reason')}</label><input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="input-field" placeholder={t('اختياري', 'Optional')} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={submitLeaveRequest} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">{t('إرسال', 'Submit')}</button>
                <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 rounded-lg border text-sm">{t('إلغاء', 'Cancel')}</button>
              </div>
            </div>
          )}
          <div className="premium-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="p-3">{t('الموظف', 'Employee')}</th><th className="p-3">{t('النوع', 'Type')}</th><th className="p-3">{t('من', 'From')}</th><th className="p-3">{t('إلى', 'To')}</th><th className="p-3">{t('أيام', 'Days')}</th><th className="p-3">{t('الحالة', 'Status')}</th>{isHR && <th className="p-3">{t('إجراء', 'Action')}</th>}</tr></thead>
              <tbody>{leaves.map((l: any) => (
                <tr key={l.id} className="border-b hover:bg-muted/30">
                  <td className="p-3"><span className="font-medium">{isRtl ? (l.employeeNameAr || l.employeeName || '-') : (l.employeeName || '-')}</span>{l.employeeCode && <><br/><span className="text-[10px] text-muted-foreground">{l.employeeCode}</span></>}</td>
                  <td className="p-3">{l.leaveType}</td><td className="p-3">{l.startDate}</td><td className="p-3">{l.endDate}</td><td className="p-3">{l.days}</td>
                  <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs", l.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : l.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>{l.status}</span></td>
                  {isHR && (
                    <td className="p-3">
                      {l.status === 'Pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleLeaveAction(l.id, 'approve')} className="p-1 rounded bg-green-500 text-white hover:bg-green-600" title={t('قبول', 'Approve')}><Check size={12} /></button>
                          <button onClick={() => handleLeaveAction(l.id, 'reject')} className="p-1 rounded bg-red-500 text-white hover:bg-red-600" title={t('رفض', 'Reject')}><XCircle size={12} /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}</tbody>
            </table>
            {leaves.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا يوجد طلبات إجازة', 'No leave requests')}</div>}
          </div>
        </div>

      ) : tab === 'claims' ? (
        <div className="premium-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="p-3">{t('الموظف', 'Employee')}</th>
              <th className="p-3">{t('الفئة', 'Category')}</th>
              <th className="p-3">{t('الوصف', 'Description')}</th>
              <th className="p-3">{t('المبلغ', 'Amount')}</th>
              <th className="p-3">{t('التاريخ', 'Date')}</th>
              <th className="p-3">{t('الحالة', 'Status')}</th>
              {isHR && <th className="p-3">{t('إجراء', 'Action')}</th>}
            </tr></thead>
            <tbody>{expenseClaims.map((c: any) => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="p-3"><span className="font-medium">{c.employeeName}</span><br/><span className="text-[10px] text-muted-foreground">{c.employeeCode}</span></td>
                <td className="p-3">{c.category}</td>
                <td className="p-3 max-w-[200px] truncate">{c.description}</td>
                <td className="p-3 font-semibold">{formatCurrency(c.amount)}</td>
                <td className="p-3 text-xs">{formatDate(c.createdAt)}</td>
                <td className="p-3">
                  <span className={cn("px-2 py-1 rounded-full text-xs", c.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : c.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>{c.status}</span>
                  {c.rejectionReason && <div className="text-[10px] text-red-500 mt-1">{c.rejectionReason}</div>}
                </td>
                {isHR && (
                  <td className="p-3">
                    {c.status === 'Pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleClaimAction(c.id, 'approve')} className="p-1 rounded bg-green-500 text-white hover:bg-green-600"><Check size={12} /></button>
                        <button onClick={() => handleClaimAction(c.id, 'reject')} className="p-1 rounded bg-red-500 text-white hover:bg-red-600"><XCircle size={12} /></button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
          {expenseClaims.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('لا توجد طلبات مصروفات', 'No expense claims')}</div>}
        </div>

      ) : tab === 'settings' && isHRManager ? (
        <div className="space-y-6">
          {configLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div> : payrollConfig && (
            <>
              <div className="premium-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Shield size={18} className="text-primary" />{t('إعدادات التأمينات الاجتماعية', 'Social Insurance Configuration')}</h3>
                  <span className="text-xs text-muted-foreground">{t('السنة المالية', 'Fiscal Year')}: {payrollConfig.effectiveYear}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('نسبة حصة الموظف', 'Employee Share Rate')} (%)</label>
                    <input type="number" step="0.01" value={(payrollConfig.siEmployeeRate * 100).toFixed(2)} onChange={e => setPayrollConfig({ ...payrollConfig, siEmployeeRate: Number(e.target.value) / 100 })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('نسبة حصة صاحب العمل', 'Employer Share Rate')} (%)</label>
                    <input type="number" step="0.01" value={(payrollConfig.siEmployerRate * 100).toFixed(2)} onChange={e => setPayrollConfig({ ...payrollConfig, siEmployerRate: Number(e.target.value) / 100 })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الحد الأقصى للأجر التأميني', 'SI Salary Ceiling')} (EGP)</label>
                    <input type="number" step="100" value={payrollConfig.siCeiling} onChange={e => setPayrollConfig({ ...payrollConfig, siCeiling: Number(e.target.value) })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الحد الأدنى للأجر التأميني', 'SI Salary Floor')} (EGP)</label>
                    <input type="number" step="100" value={payrollConfig.siFloor} onChange={e => setPayrollConfig({ ...payrollConfig, siFloor: Number(e.target.value) })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الإعفاء الشخصي السنوي', 'Annual Personal Exemption')} (EGP)</label>
                    <input type="number" step="1000" value={payrollConfig.personalExemption} onChange={e => setPayrollConfig({ ...payrollConfig, personalExemption: Number(e.target.value) })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('السنة المالية', 'Effective Year')}</label>
                    <input type="number" value={payrollConfig.effectiveYear} onChange={e => setPayrollConfig({ ...payrollConfig, effectiveYear: Number(e.target.value) })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveConfig} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">{t('حفظ الإعدادات', 'Save Configuration')}</button>
                </div>
              </div>

              <div className="premium-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2"><DollarSign size={18} className="text-green-500" />{t('شرائح ضريبة الدخل', 'Income Tax Brackets')} — {payrollConfig.effectiveYear}</h3>
                  <button onClick={() => { const lastTo = taxBrackets.length > 0 ? taxBrackets[taxBrackets.length - 1].toAmount : 0; setTaxBrackets([...taxBrackets, { fromAmount: lastTo + 0.01, toAmount: lastTo + 100000, rate: 0 }]); }} className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground flex items-center gap-1">
                    <Plus size={12} />{t('إضافة شريحة', 'Add Bracket')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="p-3 text-start">#</th>
                      <th className="p-3 text-end">{t('من (جنيه)', 'From (EGP)')}</th>
                      <th className="p-3 text-end">{t('إلى (جنيه)', 'To (EGP)')}</th>
                      <th className="p-3 text-end">{t('النسبة', 'Rate')} (%)</th>
                      <th className="p-3 w-10"></th>
                    </tr></thead>
                    <tbody>{taxBrackets.map((b: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3"><input type="number" step="0.01" value={b.fromAmount} onChange={e => { const nb = [...taxBrackets]; nb[i] = { ...nb[i], fromAmount: Number(e.target.value) }; setTaxBrackets(nb); }} className="input-field text-end w-36" /></td>
                        <td className="p-3"><input type="number" step="0.01" value={b.toAmount} onChange={e => { const nb = [...taxBrackets]; nb[i] = { ...nb[i], toAmount: Number(e.target.value) }; setTaxBrackets(nb); }} className="input-field text-end w-36" /></td>
                        <td className="p-3"><input type="number" step="0.5" value={b.rate} onChange={e => { const nb = [...taxBrackets]; nb[i] = { ...nb[i], rate: Number(e.target.value) }; setTaxBrackets(nb); }} className="input-field text-end w-24" /></td>
                        <td className="p-3"><button onClick={() => setTaxBrackets(taxBrackets.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-red-100 text-red-500"><X size={14} /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveTaxBrackets} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">{t('حفظ شرائح الضريبة', 'Save Tax Brackets')}</button>
                </div>
              </div>

              <div className="premium-card p-6 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2"><Settings size={18} className="text-muted-foreground" />{t('إعدادات إضافية', 'Additional Settings')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('العملة', 'Currency')}</label>
                    <input value={payrollConfig.currency} onChange={e => setPayrollConfig({ ...payrollConfig, currency: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('تكرار الصرف', 'Pay Frequency')}</label>
                    <select value={payrollConfig.payFrequency} onChange={e => setPayrollConfig({ ...payrollConfig, payFrequency: e.target.value })} className="input-field">
                      <option value="Monthly">{t('شهري', 'Monthly')}</option>
                      <option value="BiWeekly">{t('نصف شهري', 'Bi-Weekly')}</option>
                      <option value="Weekly">{t('أسبوعي', 'Weekly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('معدل الأوفرتايم', 'Overtime Rate')}</label>
                    <input type="number" step="0.25" value={payrollConfig.overtimeRate} onChange={e => setPayrollConfig({ ...payrollConfig, overtimeRate: Number(e.target.value) })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveConfig} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">{t('حفظ', 'Save')}</button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={() => setSelectedProfile(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><User className="text-primary" size={20} />{t('ملف الموظف', 'Employee Profile')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedProfile.employeeCode} — {isRtl ? (selectedProfile.fullNameAr || selectedProfile.fullName) : selectedProfile.fullName}</p>
              </div>
              <button onClick={() => setSelectedProfile(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><User size={32} className="text-primary" /></div>
                <div>
                  <h4 className="text-lg font-bold">{selectedProfile.fullName}</h4>
                  {selectedProfile.fullNameAr && <p className="text-sm text-muted-foreground">{selectedProfile.fullNameAr}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", selectedProfile.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700')}>{selectedProfile.status}</span>
                    {selectedProfile.hasSystemAccess && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{selectedProfile.systemRole}</span>}
                  </div>
                </div>
              </div>

              <div className="premium-card p-4 space-y-3">
                <p className="text-sm font-bold flex items-center gap-2"><Briefcase size={14} className="text-primary" />{t('بيانات الوظيفة', 'Job Details')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">{t('كود الموظف', 'Employee Code')}</span><p className="font-mono font-medium">{selectedProfile.employeeCode}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('القسم', 'Department')}</span><p className="font-medium">{selectedProfile.department || '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('المسمى الوظيفي', 'Job Title')}</span><p className="font-medium">{selectedProfile.jobTitle || '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('نوع العقد', 'Contract')}</span><p className="font-medium">{selectedProfile.contractType || '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('الفرع', 'Branch')}</span><p className="font-medium">{(() => { const b = branches.find((br: any) => br.id === selectedProfile.branchId); return b ? (isRtl ? b.branchNameAr : (b.branchNameEn || b.branchNameAr)) : '-'; })()}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('تاريخ التعيين', 'Hire Date')}</span><p className="font-medium">{selectedProfile.hireDate ? formatDate(selectedProfile.hireDate) : '-'}</p></div>
                </div>
              </div>

              <div className="premium-card p-4 space-y-3">
                <p className="text-sm font-bold flex items-center gap-2"><Phone size={14} className="text-primary" />{t('بيانات الاتصال', 'Contact Information')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">{t('الرقم القومي', 'National ID')}</span><p className="font-mono font-medium">{selectedProfile.nationalId || '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('الهاتف', 'Phone')}</span><p className="font-mono font-medium">{selectedProfile.phone || '-'}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">{t('البريد الإلكتروني', 'Email')}</span><p className="font-medium">{selectedProfile.email || '-'}</p></div>
                </div>
              </div>

              <div className="premium-card p-4 space-y-3">
                <p className="text-sm font-bold flex items-center gap-2"><DollarSign size={14} className="text-primary" />{t('الراتب والبدلات', 'Salary & Allowances')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">{t('الراتب الأساسي', 'Basic Salary')}</span><p className="font-bold text-lg text-primary">{formatCurrency(selectedProfile.basicSalary)}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('بدل سكن', 'Housing')}</span><p className="font-medium">{formatCurrency(selectedProfile.housingAllowance || 0)}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('بدل انتقال', 'Transport')}</span><p className="font-medium">{formatCurrency(selectedProfile.transportAllowance || 0)}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('بدل هاتف', 'Phone')}</span><p className="font-medium">{formatCurrency(selectedProfile.phoneAllowance || 0)}</p></div>
                  {selectedProfile.otherAllowances > 0 && <div><span className="text-muted-foreground text-xs">{t('بدلات أخرى', 'Other')}</span><p className="font-medium">{formatCurrency(selectedProfile.otherAllowances)}</p></div>}
                  <div className="col-span-2 pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">{t('إجمالي الحزمة', 'Total Package')}</span>
                    <p className="font-bold text-lg">{formatCurrency((selectedProfile.basicSalary || 0) + (selectedProfile.housingAllowance || 0) + (selectedProfile.transportAllowance || 0) + (selectedProfile.phoneAllowance || 0) + (selectedProfile.otherAllowances || 0))}</p>
                  </div>
                </div>
              </div>

              <div className="premium-card p-4 space-y-3">
                <p className="text-sm font-bold flex items-center gap-2"><Shield size={14} className="text-primary" />{t('التأمينات والبنك', 'Insurance & Banking')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">{t('رقم التأمينات', 'SI Number')}</span><p className="font-mono font-medium">{selectedProfile.socialInsuranceNo || '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('أجر التأمينات', 'SI Salary')}</span><p className="font-medium">{selectedProfile.socialInsuranceSalary ? formatCurrency(selectedProfile.socialInsuranceSalary) : '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('اسم البنك', 'Bank Name')}</span><p className="font-medium">{selectedProfile.bankName || '-'}</p></div>
                  <div><span className="text-muted-foreground text-xs">{t('رقم الحساب', 'Account Number')}</span><p className="font-mono font-medium">{selectedProfile.bankAccountNo || '-'}</p></div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {isHR && <button onClick={() => { setSelectedProfile(null); openEditEmployee(selectedProfile); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"><Pencil size={14} />{t('تعديل', 'Edit')}</button>}
                <button onClick={() => setSelectedProfile(null)} className="px-4 py-2 rounded-lg border text-sm">{t('إغلاق', 'Close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditingEmployee(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{t('تعديل بيانات الموظف', 'Edit Employee')} — {editingEmployee.employeeCode}</h3>
              <button onClick={() => setEditingEmployee(null)} className="p-1 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t('البيانات الأساسية', 'Basic Info')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الاسم (EN)', 'Full Name (EN)')}</label><input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الاسم (AR)', 'Full Name (AR)')}</label><input value={editForm.fullNameAr} onChange={e => setEditForm({ ...editForm, fullNameAr: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الرقم القومي', 'National ID')}</label><input value={editForm.nationalId} onChange={e => setEditForm({ ...editForm, nationalId: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الهاتف', 'Phone')}</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('البريد', 'Email')}</label><input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('القسم', 'Department')}</label><input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('المسمى الوظيفي', 'Job Title')}</label><input value={editForm.jobTitle} onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })} className="input-field" /></div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الحالة', 'Status')}</label>
                    <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="input-field">
                      <option value="Active">{t('نشط', 'Active')}</option><option value="OnLeave">{t('إجازة', 'On Leave')}</option><option value="Terminated">{t('منتهي', 'Terminated')}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><DollarSign size={14} />{t('الراتب والبدلات', 'Salary & Allowances')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('الراتب الأساسي', 'Basic Salary')}</label><input type="number" min="0" step="0.01" value={editForm.basicSalary} onChange={e => setEditForm({ ...editForm, basicSalary: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدل السكن', 'Housing')}</label><input type="number" min="0" step="0.01" value={editForm.housingAllowance} onChange={e => setEditForm({ ...editForm, housingAllowance: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدل المواصلات', 'Transport')}</label><input type="number" min="0" step="0.01" value={editForm.transportAllowance} onChange={e => setEditForm({ ...editForm, transportAllowance: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدل الهاتف', 'Phone')}</label><input type="number" min="0" step="0.01" value={editForm.phoneAllowance} onChange={e => setEditForm({ ...editForm, phoneAllowance: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('بدلات أخرى', 'Other')}</label><input type="number" min="0" step="0.01" value={editForm.otherAllowances} onChange={e => setEditForm({ ...editForm, otherAllowances: e.target.value })} className="input-field" /></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Shield size={14} />{t('التأمينات والبنك', 'Insurance & Banking')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('رقم التأمينات', 'SI No.')}</label><input value={editForm.socialInsuranceNo} onChange={e => setEditForm({ ...editForm, socialInsuranceNo: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('أجر التأمينات', 'SI Salary')}</label><input type="number" min="0" step="0.01" value={editForm.socialInsuranceSalary} onChange={e => setEditForm({ ...editForm, socialInsuranceSalary: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('اسم البنك', 'Bank')}</label><input value={editForm.bankName} onChange={e => setEditForm({ ...editForm, bankName: e.target.value })} className="input-field" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t('رقم الحساب', 'Account No.')}</label><input value={editForm.bankAccountNo} onChange={e => setEditForm({ ...editForm, bankAccountNo: e.target.value })} className="input-field" /></div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveEditEmployee} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">{t('حفظ التعديلات', 'Save Changes')}</button>
              <button onClick={() => setEditingEmployee(null)} className="px-4 py-2 rounded-lg border">{t('إلغاء', 'Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

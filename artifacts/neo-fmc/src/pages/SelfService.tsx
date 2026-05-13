import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import {
  User, FileText, Calendar, DollarSign, Loader2, Plus, X,
  CheckCircle, Clock, XCircle, Briefcase, Phone, Mail,
  CreditCard, Shield, CalendarDays, Receipt, Send, Pencil,
  Upload, Paperclip, ExternalLink
} from 'lucide-react';

const LEAVE_TYPES = [
  { value: 'Annual', ar: 'إجازة سنوية', en: 'Annual Leave' },
  { value: 'Casual', ar: 'إجازة عارضة', en: 'Casual Leave' },
  { value: 'Maternity', ar: 'إجازة أمومة', en: 'Maternity Leave' },
  { value: 'Paternity', ar: 'إجازة أبوة', en: 'Paternity Leave' },
  { value: 'Condolence', ar: 'إجازة عزاء', en: 'Condolence Leave' },
  { value: 'BusinessTrip', ar: 'إجازة مأمورية', en: 'Business Trip Leave' },
  { value: 'SickNonDocumented', ar: 'إجازة مرضية (بدون مستند)', en: 'Sick Leave (Non-Documented)' },
  { value: 'SickDocumented', ar: 'إجازة مرضية (بمستند)', en: 'Sick Leave (Documented)' },
];

const EXPENSE_CATEGORIES = [
  { value: 'Transport', ar: 'مواصلات', en: 'Transport' },
  { value: 'Meals', ar: 'وجبات', en: 'Meals' },
  { value: 'Office Supplies', ar: 'مستلزمات مكتبية', en: 'Office Supplies' },
  { value: 'Travel', ar: 'سفر', en: 'Travel' },
  { value: 'Communication', ar: 'اتصالات', en: 'Communication' },
  { value: 'Other', ar: 'أخرى', en: 'Other' },
];

type Tab = 'profile' | 'payslips' | 'leaves' | 'expenses';

export default function SelfService() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<{ balances: any; data: any[] }>({ balances: {}, data: [] });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveForm, setLeaveForm] = useState({ leaveType: 'Annual', startDate: '', endDate: '', days: '', reason: '' });
  const [expenseForm, setExpenseForm] = useState({ category: 'Transport', description: '', amount: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [doctorNoteFile, setDoctorNoteFile] = useState<File | null>(null);
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', bankAccountNo: '', bankIban: '' });
  const [savingBank, setSavingBank] = useState(false);

  const fetchData = async (currentTab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (currentTab === 'profile') {
        const res = await api.get<any>('/employees/my-profile');
        setProfile(res);
      } else if (currentTab === 'payslips') {
        const res = await api.get<any>('/employees/my-payslips');
        setPayslips(res?.data || []);
      } else if (currentTab === 'leaves') {
        const res = await api.get<any>('/employees/my-leaves');
        setLeaves({ balances: res?.balances || {}, data: res?.data || [] });
      } else if (currentTab === 'expenses') {
        const res = await api.get<any>('/employees/my-expenses');
        setExpenses(res?.data || []);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error loading data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(tab); }, [tab]);

  const handleLeaveSubmit = async () => {
    if (!leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.days) return;
    if (leaveForm.leaveType === 'SickDocumented' && !doctorNoteFile) {
      handleApiError(new Error(t('يرجى إرفاق التقرير الطبي', 'Please attach the doctor\'s note')), t);
      return;
    }
    setSubmitting(true);
    try {
      let attachmentUrl: string | undefined;
      if (doctorNoteFile) {
        const formData = new FormData();
        formData.append('file', doctorNoteFile);
        const uploadRes = await api.upload<{ url: string }>('/employees/my-leaves/upload-attachment', formData);
        attachmentUrl = uploadRes.url;
      }
      await api.post('/employees/my-leaves', { ...leaveForm, attachmentUrl });
      setShowLeaveForm(false);
      setLeaveForm({ leaveType: 'Annual', startDate: '', endDate: '', days: '', reason: '' });
      setDoctorNoteFile(null);
      fetchData('leaves');
    } catch (err: any) {
      handleApiError(err, t);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async () => {
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) return;
    setSubmitting(true);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const uploadRes = await api.upload<{ url: string }>('/employees/my-expenses/upload-receipt', formData);
        receiptUrl = uploadRes.url;
      }
      await api.post('/employees/my-expenses', { ...expenseForm, receiptUrl });
      setShowExpenseForm(false);
      setExpenseForm({ category: 'Transport', description: '', amount: '' });
      setReceiptFile(null);
      fetchData('expenses');
    } catch (err: any) {
      handleApiError(err, t);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankSave = async () => {
    setSavingBank(true);
    try {
      await api.patch('/employees/my-profile/bank', bankForm);
      setEditingBank(false);
      fetchData('profile');
    } catch (err: any) {
      handleApiError(err, t);
    } finally {
      setSavingBank(false);
    }
  };

  useEffect(() => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      if (end >= start) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setLeaveForm(f => ({ ...f, days: String(diffDays) }));
      }
    }
  }, [leaveForm.startDate, leaveForm.endDate]);

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: any; cls: string }> = {
      Pending: { icon: Clock, cls: 'bg-yellow-500/10 text-yellow-600' },
      Approved: { icon: CheckCircle, cls: 'bg-green-500/10 text-green-600' },
      Rejected: { icon: XCircle, cls: 'bg-red-500/10 text-red-600' },
    };
    const s = map[status] || map.Pending;
    const Icon = s.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", s.cls)}>
        <Icon size={10} />{status}
      </span>
    );
  };

  const tabs: { key: Tab; icon: any; ar: string; en: string }[] = [
    { key: 'profile', icon: User, ar: 'ملفي الشخصي', en: 'My Profile' },
    { key: 'payslips', icon: FileText, ar: 'كشوف الرواتب', en: 'My Payslips' },
    { key: 'leaves', icon: Calendar, ar: 'الإجازات', en: 'My Leaves' },
    { key: 'expenses', icon: Receipt, ar: 'طلبات المصروفات', en: 'My Expenses' },
  ];

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none";
  const selectCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none";

  return (
    <div className={cn("max-w-6xl mx-auto space-y-6", isRtl && "text-right")} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="text-primary" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t('الخدمة الذاتية للموظفين', 'Employee Self Service')}</h1>
          <p className="text-xs text-muted-foreground">{t('إدارة بياناتك وطلباتك', 'Manage your profile, leaves, and expenses')}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tb => {
          const Icon = tb.icon;
          return (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                tab === tb.key ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon size={16} />{t(tb.ar, tb.en)}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="animate-spin mx-auto text-primary" size={28} />
        </div>
      )}

      {!loading && error && (
        <div className="premium-card p-8 text-center">
          <XCircle className="mx-auto text-red-500 mb-3" size={32} />
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {t('تأكد من أن حسابك مرتبط بسجل موظف. تواصل مع مدير النظام.', 'Make sure your user account is linked to an employee record. Contact your administrator.')}
          </p>
        </div>
      )}

      {!loading && !error && tab === 'profile' && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="premium-card p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><User size={16} className="text-primary" />{t('المعلومات الأساسية', 'Basic Information')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label={t('كود الموظف', 'Employee Code')} value={profile.employeeCode} />
              <InfoField label={t('الاسم', 'Full Name')} value={profile.fullName} />
              <InfoField label={t('الاسم بالعربي', 'Name (Arabic)')} value={profile.fullNameAr || '—'} />
              <InfoField label={t('الرقم القومي', 'National ID')} value={profile.nationalId || '—'} />
            </div>
          </div>
          <div className="premium-card p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Briefcase size={16} className="text-primary" />{t('تفاصيل الوظيفة', 'Job Details')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label={t('القسم', 'Department')} value={profile.department || '—'} />
              <InfoField label={t('المسمى الوظيفي', 'Job Title')} value={profile.jobTitle || '—'} />
              <InfoField label={t('الدرجة', 'Grade')} value={profile.grade || '—'} />
              <InfoField label={t('نوع العقد', 'Contract Type')} value={profile.contractType} />
              <InfoField label={t('تاريخ التعيين', 'Hire Date')} value={formatDate(profile.hireDate)} />
              <InfoField label={t('الحالة', 'Status')} value={profile.status} badge />
            </div>
          </div>
          <div className="premium-card p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Phone size={16} className="text-primary" />{t('بيانات الاتصال', 'Contact Details')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label={t('الهاتف', 'Phone')} value={profile.phone || '—'} />
              <InfoField label={t('البريد', 'Email')} value={profile.email || '—'} />
            </div>
          </div>
          <div className="premium-card p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><CalendarDays size={16} className="text-primary" />{t('رصيد الإجازات', 'Leave Balances')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{profile.annualLeaveBalance}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('إجازة سنوية', 'Annual Leave')}</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{profile.sickLeaveBalance}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('إجازة مرضية', 'Sick Leave')}</p>
              </div>
            </div>
          </div>
          <div className="premium-card p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard size={16} className="text-primary" />{t('البيانات المصرفية', 'Banking Details')}</h3>
              {!editingBank && (
                <button onClick={() => { setBankForm({ bankName: profile.bankName || '', bankAccountNo: profile.bankAccountNo || '', bankIban: profile.bankIban || '' }); setEditingBank(true); }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
                  <Pencil size={12} />{t('تعديل', 'Edit')}
                </button>
              )}
            </div>
            {editingBank ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('اسم البنك', 'Bank Name')}</label>
                    <input className={inputCls} value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} placeholder={t('مثال: البنك الأهلي', 'e.g. National Bank')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('رقم الحساب', 'Account No.')}</label>
                    <input className={inputCls} value={bankForm.bankAccountNo} onChange={e => setBankForm(f => ({ ...f, bankAccountNo: e.target.value }))} placeholder="1234567890" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('IBAN', 'IBAN')}</label>
                    <input className={inputCls} value={bankForm.bankIban} onChange={e => setBankForm(f => ({ ...f, bankIban: e.target.value }))} placeholder="EG123456789012345678901234" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingBank(false)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors">{t('إلغاء', 'Cancel')}</button>
                  <button onClick={handleBankSave} disabled={savingBank} className="flex items-center gap-1 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-primary/90">
                    {savingBank ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {t('حفظ', 'Save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <InfoField label={t('البنك', 'Bank')} value={profile.bankName || '—'} />
                <InfoField label={t('رقم الحساب', 'Account No.')} value={profile.bankAccountNo || '—'} />
                <InfoField label={t('IBAN', 'IBAN')} value={profile.bankIban || '—'} />
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && tab === 'payslips' && (
        <div className="space-y-3">
          {payslips.length === 0 ? (
            <div className="premium-card p-10 text-center">
              <FileText className="mx-auto text-muted-foreground mb-3" size={32} />
              <p className="text-sm text-muted-foreground">{t('لا توجد كشوف رواتب معتمدة بعد', 'No approved payslips yet')}</p>
            </div>
          ) : (
            payslips.map((p: any) => (
              <PayslipCard key={p.id} payslip={p} t={t} isRtl={isRtl} />
            ))
          )}
        </div>
      )}

      {!loading && !error && tab === 'leaves' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{leaves.balances?.annual ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">{t('رصيد إجازة سنوية', 'Annual Balance')}</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{leaves.balances?.sick ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">{t('رصيد إجازة مرضية', 'Sick Balance')}</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{leaves.data.filter((l: any) => l.status === 'Pending').length}</p>
              <p className="text-[11px] text-muted-foreground">{t('طلبات معلقة', 'Pending Requests')}</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{leaves.data.filter((l: any) => l.status === 'Approved').length}</p>
              <p className="text-[11px] text-muted-foreground">{t('إجازات مقبولة', 'Approved')}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setShowLeaveForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-all">
              <Plus size={16} />{t('طلب إجازة جديد', 'New Leave Request')}
            </button>
          </div>

          {showLeaveForm && (
            <div className="premium-card p-5 space-y-4 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t('طلب إجازة جديد', 'New Leave Request')}</h3>
                <button onClick={() => setShowLeaveForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('نوع الإجازة', 'Leave Type')} *</label>
                  <select className={selectCls} value={leaveForm.leaveType} onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}>
                    {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{t(lt.ar, lt.en)}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('عدد الأيام', 'Days')} *</label>
                  <input className={inputCls} type="number" min="0.5" step="0.5" value={leaveForm.days}
                    onChange={e => setLeaveForm(f => ({ ...f, days: e.target.value }))} placeholder="1" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('من تاريخ', 'From Date')} *</label>
                  <input className={inputCls} type="date" value={leaveForm.startDate}
                    onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('إلى تاريخ', 'To Date')} *</label>
                  <input className={inputCls} type="date" value={leaveForm.endDate}
                    onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('السبب', 'Reason')}</label>
                  <textarea className={cn(inputCls, "resize-none")} rows={2} value={leaveForm.reason}
                    onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('اختياري', 'Optional')} />
                </div>
                {leaveForm.leaveType === 'SickDocumented' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('التقرير الطبي', "Doctor's Note")} *</label>
                    <div className="flex items-center gap-3">
                      <label className={cn(inputCls, "flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors", doctorNoteFile ? "border-blue-500/30" : "")}>
                        <Upload size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{doctorNoteFile ? doctorNoteFile.name : t('إرفاق التقرير الطبي (PDF, صورة)', 'Attach doctor note (PDF, image)')}</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={e => setDoctorNoteFile(e.target.files?.[0] || null)} />
                      </label>
                      {doctorNoteFile && (
                        <button onClick={() => setDoctorNoteFile(null)} className="text-muted-foreground hover:text-red-500 shrink-0"><X size={14} /></button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={handleLeaveSubmit} disabled={submitting || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.days || (leaveForm.leaveType === 'SickDocumented' && !doctorNoteFile)}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {t('إرسال الطلب', 'Submit Request')}
                </button>
              </div>
            </div>
          )}

          {leaves.data.length === 0 && !showLeaveForm ? (
            <div className="premium-card p-10 text-center">
              <Calendar className="mx-auto text-muted-foreground mb-3" size={32} />
              <p className="text-sm text-muted-foreground">{t('لا توجد طلبات إجازة', 'No leave requests yet')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaves.data.map((l: any) => (
                <div key={l.id} className="premium-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      l.leaveType === 'Annual' ? "bg-green-500/10" :
                      l.leaveType === 'SickDocumented' || l.leaveType === 'SickNonDocumented' ? "bg-blue-500/10" :
                      l.leaveType === 'Maternity' || l.leaveType === 'Paternity' ? "bg-purple-500/10" :
                      l.leaveType === 'Condolence' ? "bg-slate-500/10" :
                      l.leaveType === 'BusinessTrip' ? "bg-teal-500/10" : "bg-orange-500/10"
                    )}>
                      <Calendar size={16} className={
                        l.leaveType === 'Annual' ? "text-green-600" :
                        l.leaveType === 'SickDocumented' || l.leaveType === 'SickNonDocumented' ? "text-blue-600" :
                        l.leaveType === 'Maternity' || l.leaveType === 'Paternity' ? "text-purple-600" :
                        l.leaveType === 'Condolence' ? "text-slate-600" :
                        l.leaveType === 'BusinessTrip' ? "text-teal-600" : "text-orange-600"
                      } />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{LEAVE_TYPES.find(lt => lt.value === l.leaveType)?.[isRtl ? 'ar' : 'en'] || l.leaveType}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.days} {t('أيام', 'days')}</p>
                      {l.reason && <p className="text-[11px] text-muted-foreground truncate">{l.reason}</p>}
                      {l.attachmentUrl && (
                        <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${l.attachmentUrl}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium mt-0.5">
                          <Paperclip size={10} />{t('التقرير الطبي', "Doctor's Note")}
                        </a>
                      )}
                      {l.rejectionReason && <p className="text-[11px] text-red-500">{t('سبب الرفض', 'Reason')}: {l.rejectionReason}</p>}
                    </div>
                  </div>
                  {statusBadge(l.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && tab === 'expenses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{expenses.filter((e: any) => e.status === 'Pending').length}</p>
              <p className="text-[11px] text-muted-foreground">{t('معلقة', 'Pending')}</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(expenses.filter((e: any) => e.status === 'Approved').reduce((s: number, e: any) => s + e.amount, 0))}</p>
              <p className="text-[11px] text-muted-foreground">{t('تم اعتمادها', 'Approved Total')}</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{expenses.length}</p>
              <p className="text-[11px] text-muted-foreground">{t('إجمالي الطلبات', 'Total Claims')}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-all">
              <Plus size={16} />{t('طلب مصروفات جديد', 'New Expense Claim')}
            </button>
          </div>

          {showExpenseForm && (
            <div className="premium-card p-5 space-y-4 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t('طلب مصروفات جديد', 'New Expense Claim')}</h3>
                <button onClick={() => setShowExpenseForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('الفئة', 'Category')} *</label>
                  <select className={selectCls} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{t(c.ar, c.en)}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('المبلغ (ج.م)', 'Amount (EGP)')} *</label>
                  <input className={inputCls} type="number" min="0" step="0.01" value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('الوصف', 'Description')} *</label>
                  <textarea className={cn(inputCls, "resize-none")} rows={2} value={expenseForm.description}
                    onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder={t('تفاصيل المصروف', 'Expense details')} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('إيصال / مستند', 'Receipt / Document')}</label>
                  <div className="flex items-center gap-3">
                    <label className={cn(inputCls, "flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors", receiptFile ? "border-primary/30" : "")}>
                      <Upload size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{receiptFile ? receiptFile.name : t('اختر ملف (PDF, صورة)', 'Choose file (PDF, image)')}</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                    </label>
                    {receiptFile && (
                      <button onClick={() => setReceiptFile(null)} className="text-muted-foreground hover:text-red-500 shrink-0"><X size={14} /></button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleExpenseSubmit} disabled={submitting || !expenseForm.description || !expenseForm.amount}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {t('إرسال الطلب', 'Submit Claim')}
                </button>
              </div>
            </div>
          )}

          {expenses.length === 0 && !showExpenseForm ? (
            <div className="premium-card p-10 text-center">
              <Receipt className="mx-auto text-muted-foreground mb-3" size={32} />
              <p className="text-sm text-muted-foreground">{t('لا توجد طلبات مصروفات', 'No expense claims yet')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((e: any) => (
                <div key={e.id} className="premium-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <DollarSign size={16} className="text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{EXPENSE_CATEGORIES.find(c => c.value === e.category)?.[isRtl ? 'ar' : 'en'] || e.category}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{e.description}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs font-semibold text-primary">{formatCurrency(e.amount)}</p>
                        {e.receiptUrl && (
                          <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${e.receiptUrl}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium">
                            <Paperclip size={10} />{t('إيصال', 'Receipt')}
                          </a>
                        )}
                      </div>
                      {e.rejectionReason && <p className="text-[11px] text-red-500">{t('سبب الرفض', 'Reason')}: {e.rejectionReason}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(e.status)}
                    <span className="text-[10px] text-muted-foreground">{formatDate(e.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {badge ? (
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
          value === 'Active' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
        )}>{value}</span>
      ) : (
        <p className="text-sm font-medium">{value}</p>
      )}
    </div>
  );
}

function PayslipCard({ payslip: p, t, isRtl }: { payslip: any; t: (ar: string, en: string) => string; isRtl: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const monthNames = isRtl
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="premium-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={18} className="text-primary" />
          </div>
          <div className={cn("text-start", isRtl && "text-right")}>
            <p className="text-sm font-semibold">{monthNames[p.periodMonth - 1]} {p.periodYear}</p>
            <p className="text-[11px] text-muted-foreground">{t('صافي الراتب', 'Net Salary')}: {formatCurrency(p.netSalary)}</p>
          </div>
        </div>
        <span className="text-lg font-bold text-primary">{formatCurrency(p.netSalary)}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{t('الراتب الأساسي', 'Basic Salary')}</p>
              <p className="font-medium">{formatCurrency(p.basicSalary)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{t('البدلات', 'Allowances')}</p>
              <p className="font-medium">{formatCurrency(p.allowances)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{t('إجمالي الراتب', 'Gross Salary')}</p>
              <p className="font-medium">{formatCurrency(p.grossSalary)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{t('التأمينات', 'Social Insurance')}</p>
              <p className="font-medium text-red-500">-{formatCurrency(p.socialInsuranceEmployee)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{t('ضريبة الدخل', 'Income Tax')}</p>
              <p className="font-medium text-red-500">-{formatCurrency(p.incomeTax)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{t('إجمالي الخصومات', 'Total Deductions')}</p>
              <p className="font-medium text-red-500">-{formatCurrency(p.totalDeductions)}</p>
            </div>
            <div className="space-y-0.5 sm:col-span-2">
              <p className="text-[11px] text-muted-foreground">{t('صافي الراتب', 'Net Salary')}</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(p.netSalary)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

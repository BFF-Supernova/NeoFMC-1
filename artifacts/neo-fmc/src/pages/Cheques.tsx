import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useListClients } from '@workspace/api-client-react';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { FileCheck, Plus, Loader2, Shield, Users, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Cheques() {
  const { t, isRtl } = useLanguage();
  const [, navigate] = useLocation();
  const [cheques, setCheques] = useState<any>({ data: [], total: 0 });
  const [guarantees, setGuarantees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    chequeType: 'PDC', assignedTo: 'Customer', customerCategory: 'Individual', guaranteeId: '', clientId: '',
    chequeNumber: '', bankName: '', bankBranch: '', amount: '', issueDate: '', dueDate: '',
    drawerName: '', drawerNationalId: '', notes: ''
  });
  const [filteredClients, setFilteredClients] = useState<any[]>([]);

  const { data: clients } = useListClients({ request: { query: { limit: 200 } } as any });

  useEffect(() => {
    if (form.customerCategory && form.assignedTo === 'Customer') {
      api.get<any>(`/clients/filter/by-category?category=${form.customerCategory}`)
        .then(res => setFilteredClients(res?.data || []))
        .catch(() => setFilteredClients([]));
    }
  }, [form.customerCategory, form.assignedTo]);

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, gData] = await Promise.all([
        api.get<any>(`/cheques${filter ? `?status=${filter}` : ''}`),
        api.get<any>('/guarantees')
      ]);
      setCheques(data);
      const gList = Array.isArray(gData) ? gData : (gData?.data || []);
      setGuarantees(gList);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await api.post('/cheques', {
        ...form,
        amount: Number(form.amount),
        clientId: form.assignedTo === 'Customer' ? form.clientId || undefined : undefined,
        guaranteeId: form.assignedTo === 'Guarantor' ? form.guaranteeId || undefined : undefined,
      });
      setShowForm(false);
      setForm({ chequeType: 'PDC', assignedTo: 'Customer', customerCategory: 'Individual', guaranteeId: '', clientId: '', chequeNumber: '', bankName: '', bankBranch: '', amount: '', issueDate: '', dueDate: '', drawerName: '', drawerNationalId: '', notes: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await api.put(`/cheques/${id}/status`, { status }); loadData(); } catch (err) { handleApiError(err); }
  };

  const statusFilters = ['', 'Pending', 'Presented', 'Cleared', 'Bounced'];

  const chequeTypeLabel = (type: string) => {
    if (type === 'GuaranteeCheque') return t('شيك ضمان', 'Guarantee Cheque');
    return t('شيك آجل', 'PDC');
  };

  const assignedToLabel = (val: string) => {
    if (val === 'Guarantor') return t('كفيل', 'Guarantor');
    return t('عميل', 'Customer');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('إدارة الشيكات', 'Cheque Management')}</h2>
          <p className="text-muted-foreground mt-1">{t('تتبع الشيكات الآجلة وشيكات الضمان', 'Track PDCs and guarantee cheques')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 font-medium">
          <Plus size={18} /> {t('إضافة شيك', 'Add Cheque')}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(s => (
          <button key={s || 'all'} onClick={() => setFilter(s)} className={cn("px-4 py-2 rounded-xl text-sm transition-colors font-medium", filter === s ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
            {s || t('الكل', 'All')}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('شيك جديد', 'New Cheque')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FileCheck size={12} /> {t('نوع الشيك', 'Cheque Type')} *
              </label>
              <select value={form.chequeType} onChange={e => setForm({ ...form, chequeType: e.target.value })} className="premium-input">
                <option value="PDC">{t('شيك آجل (PDC)', 'Post-Dated Check (PDC)')}</option>
                <option value="GuaranteeCheque">{t('شيك ضمان', 'Guarantee Cheque')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users size={12} /> {t('منسوب إلى', 'Assigned To')} *
              </label>
              <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value, guaranteeId: '', clientId: '' })} className="premium-input">
                <option value="Customer">{t('عميل', 'Customer')}</option>
                <option value="Guarantor">{t('كفيل', 'Guarantor')}</option>
              </select>
            </div>
            {form.assignedTo === 'Customer' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('فئة العميل', 'Customer Category')} *</label>
                  <select value={form.customerCategory} onChange={e => setForm({ ...form, customerCategory: e.target.value, clientId: '' })} className="premium-input">
                    <option value="Individual">{t('فرد', 'Individual')}</option>
                    <option value="Corporate">{t('شركة', 'Corporate')}</option>
                    <option value="Garage">{t('معرض', 'Garage')}</option>
                    <option value="SME">{t('مشروع صغير', 'SME')}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('اختر العميل', 'Select Customer')} *</label>
                  <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="premium-input">
                    <option value="">{t('-- اختر عميل --', '-- Select Customer --')}</option>
                    {filteredClients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.fullNameAr} ({c.nationalId})</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {form.assignedTo === 'Guarantor' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Shield size={12} /> {t('اختر الكفيل', 'Select Guarantor')}
                </label>
                <select value={form.guaranteeId} onChange={e => setForm({ ...form, guaranteeId: e.target.value })} className="premium-input">
                  <option value="">{t('-- اختر كفيل --', '-- Select Guarantor --')}</option>
                  {guarantees.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.guarantorName} {g.guarantorNationalId ? `(${g.guarantorNationalId})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('رقم الشيك', 'Cheque #')} *</label>
              <input placeholder={t('رقم الشيك', 'Cheque #')} value={form.chequeNumber} onChange={e => setForm({ ...form, chequeNumber: e.target.value })} className="premium-input" dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('اسم البنك', 'Bank Name')} *</label>
              <input placeholder={t('اسم البنك', 'Bank Name')} value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('فرع البنك', 'Bank Branch')}</label>
              <input placeholder={t('فرع البنك', 'Bank Branch')} value={form.bankBranch} onChange={e => setForm({ ...form, bankBranch: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('المبلغ', 'Amount')} *</label>
              <input type="number" placeholder={t('المبلغ', 'Amount')} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('تاريخ الإصدار', 'Issue Date')} *</label>
              <input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('تاريخ الاستحقاق', 'Due Date')} *</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('اسم الساحب', 'Drawer Name')} *</label>
              <input placeholder={t('اسم الساحب', 'Drawer Name')} value={form.drawerName} onChange={e => setForm({ ...form, drawerName: e.target.value })} className="premium-input" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('الرقم القومي للساحب', 'Drawer National ID')}</label>
              <input placeholder={t('الرقم القومي للساحب', 'Drawer National ID')} value={form.drawerNationalId} onChange={e => setForm({ ...form, drawerNationalId: e.target.value })} className="premium-input" dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
              <input placeholder={t('ملاحظات', 'Notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="premium-input" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 font-medium shadow-lg shadow-primary/20">{t('حفظ', 'Save')}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl hover:bg-secondary font-medium">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('رقم الشيك', 'Cheque #')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('منسوب إلى', 'Assigned To')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('البنك', 'Bank')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الساحب', 'Drawer')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاستحقاق', 'Due Date')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : cheques.data?.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground"><FileCheck className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد شيكات', 'No cheques')}</td></tr>
              ) : (
                cheques.data?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs">{c.chequeNumber}</td>
                    <td className="px-4 py-4">
                      <span className={cn("px-2 py-1 rounded-md text-xs font-bold border",
                        c.chequeType === 'GuaranteeCheque' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      )}>
                        {chequeTypeLabel(c.chequeType || 'PDC')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {c.assignedTo === 'Guarantor' ? (
                        <button onClick={() => navigate('/guarantees')} className="flex items-center gap-1 hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                          <Shield size={12} className="text-amber-400" />
                          <span>{c.guarantorName || t('كفيل', 'Guarantor')}</span>
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/clients?clientId=${c.clientId}`)} className="flex items-center gap-1 hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                          <Users size={12} className="text-blue-400" />
                          <span>{c.clientName || t('عميل', 'Customer')}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">{c.bankName}</td>
                    <td className="px-4 py-4">{c.drawerName}</td>
                    <td className="px-4 py-4 font-bold text-primary">{formatCurrency(c.amount)}</td>
                    <td className="px-4 py-4">{formatDate(c.dueDate)}</td>
                    <td className="px-4 py-4"><span className={cn("px-2 py-1 rounded-md text-xs font-bold border", getStatusColor(c.status))}>{c.status}</span></td>
                    <td className="px-4 py-4">
                      <select onChange={e => { if (e.target.value) handleStatusChange(c.id, e.target.value); }} value="" className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs">
                        <option value="">{t('تغيير', 'Change')}</option>
                        <option value="Presented">{t('تقديم', 'Present')}</option>
                        <option value="Cleared">{t('صرف', 'Clear')}</option>
                        <option value="Bounced">{t('ارتجاع', 'Bounce')}</option>
                        <option value="Cancelled">{t('إلغاء', 'Cancel')}</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

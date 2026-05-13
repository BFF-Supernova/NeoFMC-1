import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useListClients } from '@workspace/api-client-react';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError, apiFetch } from '@/lib/api';
import { Shield, Plus, Loader2, Users, Link2, ExternalLink, XCircle, FileUp, FileText, Download, CalendarDays, CheckCircle2, Clock, Paperclip } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export default function Guarantees() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [guarantees, setGuarantees] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [createStep, setCreateStep] = useState<'form' | 'docs'>('form');
  const [newGuaranteeId, setNewGuaranteeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: '', loanId: '', guarantorName: '', guarantorNationalId: '', guarantorPhone: '', guarantorAddress: '',
    guarantorJobTitle: '', guarantorProfessionLicenseId: '', guarantorAgriculturalLandId: '',
    guarantorTaxId: '', guarantorCommercialRegistrationNo: '',
    guarantorIdIssuanceDate: '', guarantorIdExpiryDate: '',
    guaranteeType: 'Personal', guaranteeValue: '', description: ''
  });

  const { data: clients } = useListClients({ request: { query: { limit: 200 } } as any });

  const { data: idSettings } = useQuery({
    queryKey: ['/api/tenants/my/identification-settings'],
    queryFn: () => apiFetch<Record<string, boolean>>('/tenants/my/identification-settings'),
  });

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  const docFileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('NationalID');
  const [docUploading, setDocUploading] = useState(false);

  const { data: guaranteeDocs, refetch: refetchGuaranteeDocs } = useQuery({
    queryKey: ['/api/documents/guarantee', newGuaranteeId],
    queryFn: async () => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/documents?guaranteeId=${newGuaranteeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!newGuaranteeId,
  });

  const [selectedGuaranteeForDocs, setSelectedGuaranteeForDocs] = useState<any>(null);
  const [selectedGuarantorProfile, setSelectedGuarantorProfile] = useState<any>(null);
  const existingDocFileRef = useRef<HTMLInputElement>(null);
  const [existingDocType, setExistingDocType] = useState('NationalID');
  const [existingDocUploading, setExistingDocUploading] = useState(false);

  const { data: existingGuaranteeDocs, refetch: refetchExistingDocs } = useQuery({
    queryKey: ['/api/documents/guarantee-existing', selectedGuaranteeForDocs?.id],
    queryFn: async () => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/documents?guaranteeId=${selectedGuaranteeForDocs.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!selectedGuaranteeForDocs,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const data = await api.get<any>('/guarantees'); setGuarantees(data); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ clientId: '', loanId: '', guarantorName: '', guarantorNationalId: '', guarantorPhone: '', guarantorAddress: '', guarantorJobTitle: '', guarantorProfessionLicenseId: '', guarantorAgriculturalLandId: '', guarantorTaxId: '', guarantorCommercialRegistrationNo: '', guarantorIdIssuanceDate: '', guarantorIdExpiryDate: '', guaranteeType: 'Personal', guaranteeValue: '', description: '' });
    setShowForm(false);
    setCreateStep('form');
    setNewGuaranteeId(null);
  };

  const handleCreate = async () => {
    try {
      const result = await api.post<any>('/guarantees', {
        ...form,
        clientId: form.clientId || undefined,
        loanId: form.loanId || undefined,
        guaranteeValue: form.guaranteeValue ? Number(form.guaranteeValue) : undefined,
        guarantorJobTitle: form.guarantorJobTitle || undefined,
        guarantorProfessionLicenseId: form.guarantorProfessionLicenseId || undefined,
        guarantorAgriculturalLandId: form.guarantorAgriculturalLandId || undefined,
        guarantorTaxId: form.guarantorTaxId || undefined,
        guarantorCommercialRegistrationNo: form.guarantorCommercialRegistrationNo || undefined,
        guarantorIdIssuanceDate: form.guarantorIdIssuanceDate || undefined,
        guarantorIdExpiryDate: form.guarantorIdExpiryDate || undefined,
      });
      toast({ title: t('نجاح', 'Success'), description: t('تم إنشاء الضمان - يرجى إرفاق مستند واحد على الأقل', 'Guarantee created - please attach at least 1 document') });
      setNewGuaranteeId(result.id);
      setCreateStep('docs');
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleFinishCreate = () => {
    const docCount = guaranteeDocs?.length || 0;
    if (docCount < 1) {
      toast({ title: t('تنبيه', 'Notice'), description: t('يجب إرفاق مستند تعريف واحد على الأقل للكفيل', 'At least one guarantor identification document must be attached'), variant: 'destructive' });
      return;
    }
    resetForm();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, guaranteeId: string, refetch: () => void, setUploading: (v: boolean) => void, fileRef: React.RefObject<HTMLInputElement | null>, selectedDocType: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        toast({ title: t('خطأ', 'Error'), description: t('يجب أن يكون الملف بصيغة PDF فقط', 'Only PDF files are allowed'), variant: 'destructive' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('خطأ', 'Error'), description: t('حجم الملف أكبر من 10 ميجابايت', 'File size exceeds 10MB'), variant: 'destructive' });
        continue;
      }

      setUploading(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const token = localStorage.getItem('neo_fmc_token');
        const res = await fetch(`${BASE}/api/documents/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            guaranteeId,
            documentType: selectedDocType,
            documentName: file.name,
            fileContent: base64,
            mimeType: 'application/pdf',
          })
        });

        if (res.ok) {
          toast({ title: t('تم الرفع', 'Uploaded'), description: file.name });
          refetch();
        } else {
          toast({ title: t('فشل الرفع', 'Upload Failed'), variant: 'destructive' });
        }
      } catch {
        toast({ title: t('خطأ', 'Error'), variant: 'destructive' });
      }
      setUploading(false);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleVerify = async (id: string) => {
    try { await api.put(`/guarantees/${id}`, { status: 'Verified' }); loadData(); } catch (err) { handleApiError(err); }
  };

  const handleRelease = async (id: string) => {
    try { await api.put(`/guarantees/${id}`, { status: 'Released' }); loadData(); } catch (err) { handleApiError(err); }
  };

  const getGuaranteesList = () => {
    if (Array.isArray(guarantees)) return guarantees;
    if (guarantees?.data && Array.isArray(guarantees.data)) return guarantees.data;
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('الضمانات', 'Guarantees')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة الضمانات والكفلاء', 'Manage guarantees and guarantors')}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 font-medium">
          <Plus size={18} /> {t('إضافة ضمان', 'Add Guarantee')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{t('ضمان جديد', 'New Guarantee')}</h3>
                {createStep === 'docs' && (
                  <p className="text-xs text-muted-foreground mt-1">{t('الخطوة 2: إرفاق مستندات الكفيل', 'Step 2: Attach Guarantor Documents')}</p>
                )}
              </div>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>

            {createStep === 'form' ? (
              <form onSubmit={e => { e.preventDefault(); handleCreate(); }} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Users size={12} /> {t('ربط بعميل (اختياري)', 'Link to Client (Optional)')}
                    </label>
                    <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="premium-input">
                      <option value="">{t('-- بدون ربط --', '-- No Link --')}</option>
                      {clients?.data.map(c => <option key={c.id} value={c.id}>{c.fullNameAr} - {c.nationalId}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('معرف القرض (اختياري)', 'Loan ID (Optional)')}</label>
                    <input placeholder={t('معرف القرض', 'Loan ID')} value={form.loanId} onChange={e => setForm({ ...form, loanId: e.target.value })} className="premium-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('نوع الضمان', 'Guarantee Type')}</label>
                    <select value={form.guaranteeType} onChange={e => setForm({ ...form, guaranteeType: e.target.value })} className="premium-input">
                      <option value="Personal">{t('شخصي', 'Personal')}</option>
                      <option value="Property">{t('عقاري', 'Property')}</option>
                      <option value="Vehicle">{t('مركبة', 'Vehicle')}</option>
                      <option value="BusinessAsset">{t('أصول تجارية', 'Business Asset')}</option>
                      <option value="BankGuarantee">{t('ضمان بنكي', 'Bank Guarantee')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('اسم الكفيل', 'Guarantor Name')} *</label>
                    <input placeholder={t('اسم الكفيل', 'Guarantor Name')} value={form.guarantorName} onChange={e => setForm({ ...form, guarantorName: e.target.value })} className="premium-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('الهاتف', 'Phone')}</label>
                    <input placeholder={t('الهاتف', 'Phone')} value={form.guarantorPhone} onChange={e => setForm({ ...form, guarantorPhone: e.target.value })} className="premium-input" dir="ltr" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('العنوان', 'Address')}</label>
                  <input placeholder={t('العنوان', 'Address')} value={form.guarantorAddress} onChange={e => setForm({ ...form, guarantorAddress: e.target.value })} className="premium-input" />
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">{t('وثائق تعريف الكفيل', 'Guarantor Identification Documents')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(!idSettings || idSettings.nationalId) && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('الرقم القومي', 'National ID')} {idSettings?.nationalId ? '*' : ''}</label>
                        <input placeholder={t('الرقم القومي', 'National ID')} value={form.guarantorNationalId} onChange={e => setForm({ ...form, guarantorNationalId: e.target.value })} className="premium-input" dir="ltr" required={!!idSettings?.nationalId} />
                      </div>
                    )}
                    {idSettings?.jobTitle && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('المسمى الوظيفي', 'Job Title')} *</label>
                        <input placeholder={t('المسمى الوظيفي', 'Job Title')} value={form.guarantorJobTitle} onChange={e => setForm({ ...form, guarantorJobTitle: e.target.value })} className="premium-input" required />
                      </div>
                    )}
                    {idSettings?.professionLicenseId && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('رقم رخصة المهنة', 'Profession License ID')} *</label>
                        <input placeholder={t('رقم رخصة المهنة', 'Profession License ID')} value={form.guarantorProfessionLicenseId} onChange={e => setForm({ ...form, guarantorProfessionLicenseId: e.target.value })} className="premium-input" dir="ltr" required />
                      </div>
                    )}
                    {idSettings?.agriculturalLandId && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('رقم حيازة الأرض الزراعية', 'Agricultural Land ID')} *</label>
                        <input placeholder={t('رقم حيازة الأرض الزراعية', 'Agricultural Land ID')} value={form.guarantorAgriculturalLandId} onChange={e => setForm({ ...form, guarantorAgriculturalLandId: e.target.value })} className="premium-input" dir="ltr" required />
                      </div>
                    )}
                    {idSettings?.taxId && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('الرقم الضريبي', 'Tax ID')} *</label>
                        <input placeholder={t('الرقم الضريبي', 'Tax ID')} value={form.guarantorTaxId} onChange={e => setForm({ ...form, guarantorTaxId: e.target.value })} className="premium-input" dir="ltr" required />
                      </div>
                    )}
                    {idSettings?.commercialRegistrationNo && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('رقم السجل التجاري', 'Commercial Registration No.')} *</label>
                        <input placeholder={t('رقم السجل التجاري', 'Commercial Registration No.')} value={form.guarantorCommercialRegistrationNo} onChange={e => setForm({ ...form, guarantorCommercialRegistrationNo: e.target.value })} className="premium-input" dir="ltr" required />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium flex items-center gap-1">
                        <CalendarDays size={12} />
                        {t('تاريخ الإصدار', 'Issuance Date')}
                      </label>
                      <input type="date" className="premium-input" value={form.guarantorIdIssuanceDate} onChange={e => setForm({ ...form, guarantorIdIssuanceDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium flex items-center gap-1">
                        <CalendarDays size={12} />
                        {t('تاريخ الانتهاء', 'Expiry Date')}
                      </label>
                      <input type="date" className="premium-input" value={form.guarantorIdExpiryDate} onChange={e => setForm({ ...form, guarantorIdExpiryDate: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('قيمة الضمان', 'Guarantee Value')}</label>
                    <input type="number" placeholder={t('قيمة الضمان', 'Guarantee Value')} value={form.guaranteeValue} onChange={e => setForm({ ...form, guaranteeValue: e.target.value })} className="premium-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('الوصف', 'Description')}</label>
                    <input placeholder={t('الوصف', 'Description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="premium-input" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 font-medium shadow-lg shadow-primary/20">{t('التالي: إرفاق المستندات', 'Next: Attach Documents')}</button>
                  <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-xl hover:bg-secondary font-medium">{t('إلغاء', 'Cancel')}</button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm">
                  <p className="font-medium">{t('يجب إرفاق مستند تعريف واحد على الأقل للكفيل (PDF)', 'At least one guarantor identification document (PDF) must be attached')}</p>
                </div>

                <div className="premium-card p-4 border-dashed space-y-3">
                  <p className="text-sm font-bold">{t('رفع مستند (PDF فقط)', 'Upload Document (PDF Only)')}</p>
                  <div className="flex items-center gap-3">
                    <select className="premium-input flex-1" value={docType} onChange={e => setDocType(e.target.value)}>
                      <option value="NationalID">{t('البطاقة الشخصية', 'National ID')}</option>
                      <option value="ProofOfAddress">{t('إثبات العنوان', 'Proof of Address')}</option>
                      <option value="ProfessionLicense">{t('رخصة المهنة', 'Profession License')}</option>
                      <option value="TaxCard">{t('البطاقة الضريبية', 'Tax Card')}</option>
                      <option value="CommercialRegistration">{t('السجل التجاري', 'Commercial Registration')}</option>
                      <option value="Other">{t('أخرى', 'Other')}</option>
                    </select>
                    <button type="button" disabled={docUploading} onClick={() => docFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium whitespace-nowrap">
                      {docUploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                      {t('اختر ملف', 'Choose File')}
                    </button>
                  </div>
                  <input ref={docFileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => handleDocUpload(e, newGuaranteeId!, refetchGuaranteeDocs, setDocUploading, docFileRef, docType)} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <FileText size={16} />
                    {t('المستندات المرفقة', 'Attached Documents')} ({guaranteeDocs?.length || 0})
                  </p>
                  {(!guaranteeDocs || guaranteeDocs.length === 0) ? (
                    <div className="premium-card p-6 text-center border-dashed bg-transparent">
                      <FileText size={28} className="mx-auto mb-2 opacity-20 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t('لم يتم إرفاق مستندات بعد', 'No documents attached yet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {guaranteeDocs.map((doc: any) => (
                        <div key={doc.id} className="premium-card p-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.documentName}</p>
                            <span className="text-xs px-2 py-0.5 bg-secondary rounded-md">{doc.documentType}</span>
                          </div>
                          <CheckCircle2 size={16} className="text-green-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={handleFinishCreate} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {t('إتمام التسجيل', 'Complete Registration')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('رقم الضمان', 'Ref #')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الكفيل', 'Guarantor')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العميل المرتبط', 'Linked Client')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الرقم القومي', 'National ID')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('القيمة', 'Value')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : getGuaranteesList().length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground"><Shield className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد ضمانات', 'No guarantees')}</td></tr>
              ) : (
                getGuaranteesList().map((g: any) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{g.guaranteeNumber || '-'}</td>
                    <td className="px-4 py-4 font-medium"><button onClick={() => setSelectedGuarantorProfile(g)} className="hover:text-primary hover:underline underline-offset-2 transition-colors text-start">{g.guarantorName}</button></td>
                    <td className="px-4 py-4">
                      {g.clientName ? (
                        <button onClick={() => navigate(`/clients?clientId=${g.clientId}`)} className="flex items-center gap-1 text-sm hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                          <Link2 size={12} className="text-primary" />
                          {g.clientName}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-muted-foreground text-xs">{g.guarantorNationalId || '-'}</td>
                    <td className="px-4 py-4 text-sm">{g.guaranteeType}</td>
                    <td className="px-4 py-4 font-bold text-primary">{g.guaranteeValue ? formatCurrency(g.guaranteeValue) : '-'}</td>
                    <td className="px-4 py-4"><span className={cn("px-2 py-1 rounded-md text-xs font-bold border", getStatusColor(g.status))}>{g.status}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => setSelectedGuaranteeForDocs(g)} className="text-muted-foreground hover:text-foreground text-xs px-2.5 py-1.5 bg-secondary rounded-lg font-medium flex items-center gap-1">
                          <Paperclip size={12} />
                          {t('مرفقات', 'Docs')}
                        </button>
                        {g.status === 'Active' && <button onClick={() => handleVerify(g.id)} className="text-blue-400 hover:text-blue-300 text-xs px-2.5 py-1.5 bg-blue-500/10 rounded-lg font-medium">{t('تحقق', 'Verify')}</button>}
                        {(g.status === 'Active' || g.status === 'Verified') && <button onClick={() => handleRelease(g.id)} className="text-green-400 hover:text-green-300 text-xs px-2.5 py-1.5 bg-green-500/10 rounded-lg font-medium">{t('إفراج', 'Release')}</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGuaranteeForDocs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Paperclip className="text-primary" size={20} />
                  {t('مرفقات الكفيل', 'Guarantor Attachments')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedGuaranteeForDocs.guarantorName} - {selectedGuaranteeForDocs.guaranteeNumber || ''}</p>
              </div>
              <button onClick={() => setSelectedGuaranteeForDocs(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="premium-card p-4 border-dashed space-y-3">
                <p className="text-sm font-bold">{t('رفع مستند جديد (PDF فقط)', 'Upload New Document (PDF Only)')}</p>
                <div className="flex items-center gap-3">
                  <select className="premium-input flex-1" value={existingDocType} onChange={e => setExistingDocType(e.target.value)}>
                    <option value="NationalID">{t('البطاقة الشخصية', 'National ID')}</option>
                    <option value="ProofOfAddress">{t('إثبات العنوان', 'Proof of Address')}</option>
                    <option value="ProfessionLicense">{t('رخصة المهنة', 'Profession License')}</option>
                    <option value="TaxCard">{t('البطاقة الضريبية', 'Tax Card')}</option>
                    <option value="CommercialRegistration">{t('السجل التجاري', 'Commercial Registration')}</option>
                    <option value="Other">{t('أخرى', 'Other')}</option>
                  </select>
                  <button type="button" disabled={existingDocUploading} onClick={() => existingDocFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium whitespace-nowrap">
                    {existingDocUploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                    {t('اختر ملف', 'Choose File')}
                  </button>
                </div>
                <input ref={existingDocFileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => handleDocUpload(e, selectedGuaranteeForDocs.id, refetchExistingDocs, setExistingDocUploading, existingDocFileRef, existingDocType)} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <FileText size={16} />
                  {t('المستندات المرفقة', 'Attached Documents')} ({existingGuaranteeDocs?.length || 0})
                </p>
                {!existingGuaranteeDocs || existingGuaranteeDocs.length === 0 ? (
                  <div className="premium-card p-8 text-center border-dashed bg-transparent">
                    <FileText size={32} className="mx-auto mb-3 opacity-20 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('لا توجد مرفقات', 'No attachments')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingGuaranteeDocs.map((doc: any) => (
                      <div key={doc.id} className="premium-card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                          <FileText size={20} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.documentName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-secondary rounded-md">{doc.documentType}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">v{doc.version || 1}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(doc.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>
                        <a href={`${BASE}/api/documents/download/${doc.id}?token=${localStorage.getItem('neo_fmc_token')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Download size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedGuarantorProfile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedGuarantorProfile(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Shield className="text-primary" size={20} />
                  {t('ملف الكفيل', 'Guarantor Profile')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedGuarantorProfile.guaranteeNumber} — {selectedGuarantorProfile.guarantorName}</p>
              </div>
              <button onClick={() => setSelectedGuarantorProfile(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Users size={32} className="text-primary" /></div>
                <div>
                  <h4 className="text-lg font-bold">{selectedGuarantorProfile.guarantorName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", getStatusColor(selectedGuarantorProfile.status))}>{selectedGuarantorProfile.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">{selectedGuarantorProfile.guaranteeType}</span>
                  </div>
                </div>
              </div>

              <div className="premium-card p-4 space-y-3">
                <p className="text-sm font-bold">{t('البيانات الشخصية', 'Personal Information')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">{t('الاسم', 'Full Name')}</span>
                    <p className="font-medium">{selectedGuarantorProfile.guarantorName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('الرقم القومي', 'National ID')}</span>
                    <p className="font-mono font-medium">{selectedGuarantorProfile.guarantorNationalId || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('الهاتف', 'Phone')}</span>
                    <p className="font-mono font-medium">{selectedGuarantorProfile.guarantorPhone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('الوظيفة', 'Job Title')}</span>
                    <p className="font-medium">{selectedGuarantorProfile.guarantorJobTitle || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">{t('العنوان', 'Address')}</span>
                    <p className="font-medium">{selectedGuarantorProfile.guarantorAddress || '-'}</p>
                  </div>
                </div>
              </div>

              {(selectedGuarantorProfile.guarantorTaxId || selectedGuarantorProfile.guarantorCommercialRegistrationNo || selectedGuarantorProfile.guarantorProfessionLicenseId || selectedGuarantorProfile.guarantorAgriculturalLandId) && (
                <div className="premium-card p-4 space-y-3">
                  <p className="text-sm font-bold">{t('وثائق التعريف', 'Identification Details')}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedGuarantorProfile.guarantorTaxId && <div><span className="text-muted-foreground text-xs">{t('الرقم الضريبي', 'Tax ID')}</span><p className="font-mono font-medium">{selectedGuarantorProfile.guarantorTaxId}</p></div>}
                    {selectedGuarantorProfile.guarantorCommercialRegistrationNo && <div><span className="text-muted-foreground text-xs">{t('السجل التجاري', 'Commercial Reg.')}</span><p className="font-mono font-medium">{selectedGuarantorProfile.guarantorCommercialRegistrationNo}</p></div>}
                    {selectedGuarantorProfile.guarantorProfessionLicenseId && <div><span className="text-muted-foreground text-xs">{t('رخصة المهنة', 'Profession License')}</span><p className="font-mono font-medium">{selectedGuarantorProfile.guarantorProfessionLicenseId}</p></div>}
                    {selectedGuarantorProfile.guarantorAgriculturalLandId && <div><span className="text-muted-foreground text-xs">{t('حيازة زراعية', 'Agricultural Land ID')}</span><p className="font-mono font-medium">{selectedGuarantorProfile.guarantorAgriculturalLandId}</p></div>}
                    {selectedGuarantorProfile.guarantorIdIssuanceDate && <div><span className="text-muted-foreground text-xs">{t('تاريخ الإصدار', 'Issue Date')}</span><p className="font-medium">{formatDate(selectedGuarantorProfile.guarantorIdIssuanceDate)}</p></div>}
                    {selectedGuarantorProfile.guarantorIdExpiryDate && <div><span className="text-muted-foreground text-xs">{t('تاريخ الانتهاء', 'Expiry Date')}</span><p className="font-medium">{formatDate(selectedGuarantorProfile.guarantorIdExpiryDate)}</p></div>}
                  </div>
                </div>
              )}

              <div className="premium-card p-4 space-y-3">
                <p className="text-sm font-bold">{t('تفاصيل الضمان', 'Guarantee Details')}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">{t('رقم الضمان', 'Guarantee Number')}</span>
                    <p className="font-mono font-medium">{selectedGuarantorProfile.guaranteeNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('النوع', 'Type')}</span>
                    <p className="font-medium">{selectedGuarantorProfile.guaranteeType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('القيمة', 'Value')}</span>
                    <p className="font-bold text-lg text-primary">{selectedGuarantorProfile.guaranteeValue ? formatCurrency(selectedGuarantorProfile.guaranteeValue) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t('الحالة', 'Status')}</span>
                    <p><span className={cn("px-2.5 py-0.5 rounded-md text-xs font-bold border", getStatusColor(selectedGuarantorProfile.status))}>{selectedGuarantorProfile.status}</span></p>
                  </div>
                  {selectedGuarantorProfile.description && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">{t('الوصف', 'Description')}</span>
                      <p className="font-medium">{selectedGuarantorProfile.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedGuarantorProfile.clientName && (
                <div className="premium-card p-4 space-y-3">
                  <p className="text-sm font-bold">{t('العميل المرتبط', 'Linked Client')}</p>
                  <button onClick={() => { setSelectedGuarantorProfile(null); navigate(`/clients?clientId=${selectedGuarantorProfile.clientId}`); }} className="flex items-center gap-2 text-sm text-primary hover:underline underline-offset-2">
                    <Link2 size={14} />{selectedGuarantorProfile.clientName}
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { const g = selectedGuarantorProfile; setSelectedGuarantorProfile(null); setSelectedGuaranteeForDocs(g); }} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                  <Paperclip size={14} />{t('عرض المرفقات', 'View Attachments')}
                </button>
                <button onClick={() => setSelectedGuarantorProfile(null)} className="px-4 py-2 rounded-lg border text-sm">{t('إغلاق', 'Close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

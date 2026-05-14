import { useState, useRef, useEffect } from 'react';
import { useListClients, useCreateClient, useCalculateClientRiskScore, getListClientsQueryKey } from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import { Users, Plus, Search, ShieldAlert, Loader2, XCircle, ChevronLeft, ChevronRight, FileUp, FileText, Trash2, Download, Paperclip, Clock, CheckCircle2, AlertTriangle, UserCheck, Camera, Edit, CalendarDays, MapPin, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useHiddenFields } from '@/hooks/useHiddenFields';
import { useLocation } from 'wouter';
import { useSuperAdminDelete } from '@/hooks/useSuperAdminDelete';

export default function Clients() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isHidden } = useHiddenFields();
  const { isSuperAdmin, deleteRecord } = useSuperAdminDelete();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [location, navigate] = useLocation();
  const [selectedClientProfile, setSelectedClientProfile] = useState<string | null>(null);
  
  const { data, isLoading } = useListClients({ query: { queryKey: ['/api/clients', { page, search }] }, request: { query: { page, limit: 10, search } } as any });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClientForRisk, setSelectedClientForRisk] = useState<string | null>(null);
  const [selectedClientForDocs, setSelectedClientForDocs] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('NationalID');
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  const [selectedClientForKyc, setSelectedClientForKyc] = useState<any>(null);
  const [kycForm, setKycForm] = useState({ kycStatus: 'Pending', kycNotes: '' });

  const [editingClient, setEditingClient] = useState<any>(null);

  const [createStep, setCreateStep] = useState<'form' | 'docs'>('form');
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const createDocFileRef = useRef<HTMLInputElement>(null);
  const [createDocType, setCreateDocType] = useState('NationalID');
  const [createUploading, setCreateUploading] = useState(false);

  const [formData, setFormData] = useState({
    nationalId: '', fullNameAr: '', fullNameEn: '', phone: '', address: '',
    primaryAddress: '', secondaryAddress: '',
    jobTitle: '', professionLicenseId: '', agriculturalLandId: '', taxId: '', commercialRegistrationNo: '',
    idIssuanceDate: '', idExpiryDate: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('clientId');
    if (cid) {
      setSelectedClientProfile(cid);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: idSettings } = useQuery({
    queryKey: ['/api/tenants/my/identification-settings'],
    queryFn: () => apiFetch<Record<string, boolean>>('/tenants/my/identification-settings'),
  });

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  const uploadDocJson = async (body: Record<string, unknown>) => {
    const token = localStorage.getItem('neo_fmc_token');
    const tenantId = localStorage.getItem('neo_fmc_sa_tenant');
    return fetch(`${BASE}/api/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && token !== 'session' ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
      },
      body: JSON.stringify(body),
    });
  };

  const profileQuery = useQuery({
    queryKey: ['/api/clients/profile', selectedClientProfile],
    queryFn: async () => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/clients/${selectedClientProfile}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!selectedClientProfile,
  });

  const { data: profileDocs, refetch: refetchProfileDocs } = useQuery({
    queryKey: ['/api/documents/profile', selectedClientProfile],
    queryFn: () => apiFetch(`/documents?clientId=${selectedClientProfile}`),
    enabled: !!selectedClientProfile,
  });
  const profileDocsList = Array.isArray(profileDocs) ? profileDocs : [];

  const { data: clientDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['/api/documents', selectedClientForDocs?.id],
    queryFn: () => apiFetch(`/documents?clientId=${selectedClientForDocs.id}`),
    enabled: !!selectedClientForDocs,
  });
  const clientDocsList = Array.isArray(clientDocs) ? clientDocs : [];

  const { data: newClientDocs, refetch: refetchNewClientDocs } = useQuery({
    queryKey: ['/api/documents/new-client', newClientId],
    queryFn: () => apiFetch(`/documents?clientId=${newClientId}`),
    enabled: !!newClientId,
  });
  const newClientDocsList = Array.isArray(newClientDocs) ? newClientDocs : [];

  const deletDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiFetch(`/documents/${docId}`, { method: 'DELETE' });
    },
    onSuccess: (_, docId) => {
      toast({ title: t('تم الحذف', 'Deleted') });
      queryClient.setQueryData(['/api/documents', selectedClientForDocs?.id], (old: any) =>
        Array.isArray(old) ? old.filter((doc: any) => doc.id !== docId) : old
      );
      queryClient.setQueryData(['/api/documents/profile', selectedClientProfile], (old: any) =>
        Array.isArray(old) ? old.filter((doc: any) => doc.id !== docId) : old
      );
      queryClient.setQueryData(['/api/documents/new-client', newClientId], (old: any) =>
        Array.isArray(old) ? old.filter((doc: any) => doc.id !== docId) : old
      );
      refetchDocs();
      refetchProfileDocs();
      refetchNewClientDocs();
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedClientForDocs) return;

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
      setDocUploadError(null);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const existingDocs = clientDocsList.filter((d: any) => d.documentType === docType);
        const nextVersion = existingDocs.length > 0 ? Math.max(...existingDocs.map((d: any) => d.version || 1)) + 1 : 1;

        const res = await uploadDocJson({
          clientId: selectedClientForDocs.id,
          documentType: docType,
          documentName: file.name,
          fileContent: base64,
          mimeType: 'application/pdf',
          version: nextVersion,
        });

        if (res.ok) {
          toast({ title: t('تم الرفع', 'Uploaded'), description: `${file.name} (v${nextVersion})` });
        } else {
          const err = await res.json().catch(() => ({}));
          const message = err.message || err.error || t('فشل الرفع', 'Upload Failed');
          setDocUploadError(String(message));
          toast({ title: t('فشل الرفع', 'Upload Failed'), description: String(message), variant: 'destructive' });
        }
      } catch {
        setDocUploadError(t('حدث خطأ غير متوقع أثناء الرفع', 'An unexpected upload error occurred'));
        toast({ title: t('خطأ', 'Error'), description: t('حدث خطأ غير متوقع أثناء الرفع', 'An unexpected upload error occurred'), variant: 'destructive' });
      }
      setUploading(false);
    }
    refetchDocs();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !newClientId) return;

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        toast({ title: t('خطأ', 'Error'), description: t('يجب أن يكون الملف بصيغة PDF فقط', 'Only PDF files are allowed'), variant: 'destructive' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('خطأ', 'Error'), description: t('حجم الملف أكبر من 10 ميجابايت', 'File size exceeds 10MB'), variant: 'destructive' });
        continue;
      }

      setCreateUploading(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const res = await uploadDocJson({
          clientId: newClientId,
          documentType: createDocType,
          documentName: file.name,
          fileContent: base64,
          mimeType: 'application/pdf',
        });

        if (res.ok) {
          toast({ title: t('تم الرفع', 'Uploaded'), description: file.name });
          refetchNewClientDocs();
        } else {
          toast({ title: t('فشل الرفع', 'Upload Failed'), variant: 'destructive' });
        }
      } catch {
        toast({ title: t('خطأ', 'Error'), variant: 'destructive' });
      }
      setCreateUploading(false);
    }
    if (createDocFileRef.current) createDocFileRef.current.value = '';
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-GB');
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${date} ${h12}:${mins} ${ampm}`;
  };

  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; allowOverride: boolean } | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const canEditClient = ['SuperAdmin', 'TenantAdmin', 'BranchManager', 'LoanOfficer', 'DataEntry'].includes((user as any)?.role || '');

  const createMutation = useCreateClient({
    mutation: {
      onSuccess: (data: any) => {
        toast({ title: t('نجاح', 'Success'), description: t('تمت الإضافة - يرجى إرفاق مستند واحد على الأقل', 'Added - please attach at least 1 document') });
        setNewClientId(data.id);
        setCreateStep('docs');
        setDuplicateWarning(null);
        setForceCreate(false);
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      },
      onError: (error: any) => {
        const errMsg = error?.message || '';
        if (errMsg.includes('already exists') && errMsg.includes('phone')) {
          setDuplicateWarning({
            message: t('تحذير: رقم الهاتف مسجل مسبقاً لعميل آخر', 'Warning: This phone number is already registered to another client'),
            allowOverride: true
          });
        } else if (errMsg.includes('already exists') && errMsg.includes('National ID')) {
          toast({ title: t('خطأ', 'Error'), description: t('رقم الهوية مسجل مسبقاً', 'National ID already exists'), variant: 'destructive' });
        } else {
          toast({ title: t('خطأ', 'Error'), description: errMsg || t('حدث خطأ', 'An error occurred'), variant: 'destructive' });
        }
      }
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث بيانات العميل', 'Client data updated') });
      setEditingClient(null);
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    },
    onError: (err: any) => {
      toast({ title: t('خطأ', 'Error'), description: err.message || t('فشل التحديث', 'Update failed'), variant: 'destructive' });
    }
  });

  const riskQuery = useCalculateClientRiskScore(selectedClientForRisk!, {
    query: { enabled: !!selectedClientForRisk }
  });

  const clientDetailQuery = useQuery({
    queryKey: ['/api/clients/detail', selectedClientForKyc?.id],
    queryFn: async () => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/clients/${selectedClientForKyc.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!selectedClientForKyc,
  });

  const editClientDetailQuery = useQuery({
    queryKey: ['/api/clients/edit-detail', editingClient?.id],
    queryFn: async () => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/clients/${editingClient.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!editingClient,
  });

  useEffect(() => {
    if (editClientDetailQuery.data && editingClient) {
      const d = editClientDetailQuery.data;
      setEditForm({
        nationalId: d.nationalId || '',
        fullNameAr: d.fullNameAr || '',
        fullNameEn: d.fullNameEn || '',
        phone: d.phone || '',
        address: d.address || '',
        primaryAddress: d.primaryAddress || '',
        secondaryAddress: d.secondaryAddress || '',
        jobTitle: d.jobTitle || '',
        professionLicenseId: d.professionLicenseId || '',
        agriculturalLandId: d.agriculturalLandId || '',
        taxId: d.taxId || '',
        commercialRegistrationNo: d.commercialRegistrationNo || '',
        idIssuanceDate: d.idIssuanceDate || '',
        idExpiryDate: d.idExpiryDate || '',
      });
    }
  }, [editClientDetailQuery.data, editingClient]);

  const kycMutation = useMutation({
    mutationFn: async (data: { kycStatus: string; kycNotes: string }) => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/clients/${selectedClientForKyc.id}/kyc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update KYC');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('نجاح', 'Success'), description: t('تم تحديث حالة KYC', 'KYC status updated') });
      clientDetailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    },
    onError: () => {
      toast({ title: t('خطأ', 'Error'), description: t('فشل تحديث KYC', 'Failed to update KYC'), variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forceCreate) {
      const token = localStorage.getItem('neo_fmc_token');
      fetch(`${BASE}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, allowOverride: true })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          toast({ title: t('نجاح', 'Success'), description: t('تمت الإضافة - يرجى إرفاق مستند واحد على الأقل', 'Added - please attach at least 1 document') });
          setNewClientId(data.id);
          setCreateStep('docs');
          setDuplicateWarning(null);
          setForceCreate(false);
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        } else {
          toast({ title: t('خطأ', 'Error'), variant: 'destructive' });
        }
      });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  const resetCreateDialog = () => {
    setIsDialogOpen(false);
    setCreateStep('form');
    setNewClientId(null);
    setFormData({ nationalId: '', fullNameAr: '', fullNameEn: '', phone: '', address: '', primaryAddress: '', secondaryAddress: '', jobTitle: '', professionLicenseId: '', agriculturalLandId: '', taxId: '', commercialRegistrationNo: '', idIssuanceDate: '', idExpiryDate: '' });
    setDuplicateWarning(null);
    setForceCreate(false);
  };

  const handleFinishCreate = () => {
    const docCount = newClientDocs?.length || 0;
    if (docCount < 1) {
      toast({ title: t('تنبيه', 'Notice'), description: t('يجب إرفاق مستند تعريف واحد على الأقل', 'At least one identification document must be attached'), variant: 'destructive' });
      return;
    }
    resetCreateDialog();
  };

  const [editForm, setEditForm] = useState<any>({});
  const openEditDialog = (client: any) => {
    setEditingClient(client);
    setEditForm({
      nationalId: client.nationalId || '',
      fullNameAr: client.fullNameAr || '',
      fullNameEn: client.fullNameEn || '',
      phone: client.phone || '',
      address: client.address || '',
      primaryAddress: client.primaryAddress || '',
      secondaryAddress: client.secondaryAddress || '',
      jobTitle: client.jobTitle || '',
      professionLicenseId: client.professionLicenseId || '',
      agriculturalLandId: client.agriculturalLandId || '',
      taxId: client.taxId || '',
      commercialRegistrationNo: client.commercialRegistrationNo || '',
      idIssuanceDate: client.idIssuanceDate || '',
      idExpiryDate: client.idExpiryDate || '',
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editMutation.mutate(editForm);
  };

  const { data: editClientDocs, refetch: refetchEditDocs } = useQuery({
    queryKey: ['/api/documents/edit-client', editingClient?.id],
    queryFn: async () => {
      const token = localStorage.getItem('neo_fmc_token');
      const res = await fetch(`${BASE}/api/documents?clientId=${editingClient.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!editingClient,
  });
  const editClientDocsList = Array.isArray(editClientDocs) ? editClientDocs : [];

  const editDocFileRef = useRef<HTMLInputElement>(null);
  const [editDocType, setEditDocType] = useState('NationalID');
  const [editUploading, setEditUploading] = useState(false);

  const handleEditDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingClient) return;

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        toast({ title: t('خطأ', 'Error'), description: t('يجب أن يكون الملف بصيغة PDF فقط', 'Only PDF files are allowed'), variant: 'destructive' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('خطأ', 'Error'), description: t('حجم الملف أكبر من 10 ميجابايت', 'File size exceeds 10MB'), variant: 'destructive' });
        continue;
      }

      setEditUploading(true);
      setDocUploadError(null);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const existingDocs = editClientDocsList.filter((d: any) => d.documentType === editDocType);
        const nextVersion = existingDocs.length > 0 ? Math.max(...existingDocs.map((d: any) => d.version || 1)) + 1 : 1;

        const res = await uploadDocJson({
          clientId: editingClient.id,
          documentType: editDocType,
          documentName: file.name,
          fileContent: base64,
          mimeType: 'application/pdf',
          version: nextVersion,
        });

        if (res.ok) {
          toast({ title: t('تم الرفع', 'Uploaded'), description: `${file.name} (v${nextVersion})` });
          refetchEditDocs();
        } else {
          const err = await res.json().catch(() => ({}));
          const message = err.message || err.error || t('فشل الرفع', 'Upload Failed');
          setDocUploadError(String(message));
          toast({ title: t('فشل الرفع', 'Upload Failed'), description: String(message), variant: 'destructive' });
        }
      } catch {
        setDocUploadError(t('حدث خطأ غير متوقع أثناء الرفع', 'An unexpected upload error occurred'));
        toast({ title: t('خطأ', 'Error'), description: t('حدث خطأ غير متوقع أثناء الرفع', 'An unexpected upload error occurred'), variant: 'destructive' });
      }
      setEditUploading(false);
    }
    if (editDocFileRef.current) editDocFileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('إدارة العملاء', 'Client Management')}</h2>
          <p className="text-muted-foreground mt-1">{t('سجل وقاعدة بيانات العملاء', 'Client database and records')}</p>
        </div>
        <button onClick={() => { resetCreateDialog(); setIsDialogOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-medium">
          <Plus size={18} />
          {t('إضافة عميل', 'Add Client')}
        </button>
      </div>

      <div className="premium-card p-4">
        <div className="relative max-w-md mb-4">
          <Search className={cn("absolute top-3 text-muted-foreground", isRtl ? "right-3" : "left-3")} size={18} />
          <input 
            type="text" 
            placeholder={t('بحث بالرقم القومي أو الاسم...', 'Search by ID or name...')}
            className={cn("premium-input", isRtl ? "pr-10" : "pl-10")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('كود العميل', 'Code')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم', 'Name')}</th>
                {!isHidden('client.nationalId') && <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الرقم القومي', 'National ID')}</th>}
                {!isHidden('client.phone') && <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الهاتف', 'Phone')}</th>}
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التقييم', 'Risk Score')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}>{t('تاريخ الإضافة', 'Added')}</th>
                <th className={cn("px-4 py-3 font-semibold", isRtl ? "text-right" : "text-left")}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Users size={32} className="mx-auto mb-3 opacity-20" />
                    {t('لا يوجد عملاء', 'No clients found')}
                  </td>
                </tr>
              ) : (
                data?.data.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{(client as any).clientCode || '-'}</td>
                    <td className="px-4 py-3 font-medium">
                      <button onClick={() => setSelectedClientProfile(client.id)} className="hover:text-primary hover:underline underline-offset-2 transition-colors text-left">
                        {client.fullNameAr}
                      </button>
                    </td>
                    {!isHidden('client.nationalId') && <td className="px-4 py-3 font-mono text-xs">{client.nationalId}</td>}
                    {!isHidden('client.phone') && <td className="px-4 py-3 text-muted-foreground" dir="ltr">{client.phone || '-'}</td>}
                    <td className="px-4 py-3">
                      {client.isBlacklisted ? (
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-xs font-medium">Blacklisted</span>
                      ) : client.riskScore ? (
                        <span className={cn("px-2 py-1 rounded-md text-xs font-bold", 
                          client.riskScore > 75 ? "bg-green-500/10 text-green-400" : 
                          client.riskScore > 50 ? "bg-yellow-500/10 text-yellow-400" : "bg-orange-500/10 text-orange-400"
                        )}>
                          {client.riskScore}/100
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(client.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        {canEditClient && (
                          <button
                            onClick={() => openEditDialog(client)}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            <Edit size={14} />
                            {t('تعديل', 'Edit')}
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedClientForKyc(client); setKycForm({ kycStatus: (client as any).kycStatus || 'Pending', kycNotes: '' }); }}
                          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <UserCheck size={14} />
                          {t('KYC', 'KYC')}
                        </button>
                        <button 
                          onClick={() => setSelectedClientForDocs(client)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <Paperclip size={14} />
                          {t('المرفقات', 'Attachments')}
                        </button>
                        <button 
                          onClick={() => setSelectedClientForRisk(client.id)}
                          className="text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <ShieldAlert size={14} />
                          {t('فحص المخاطر', 'Check Risk')}
                        </button>
                        {isSuperAdmin && (
                          deleteConfirmId === client.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={async () => { const ok = await deleteRecord('client', client.id, client.fullName || 'Client', ['clients']); if (ok) setDeleteConfirmId(null); }}
                                className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg"
                              >{t('تأكيد', 'Confirm')}</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary px-3 py-1.5 rounded-lg">{t('إلغاء', 'Cancel')}</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(client.id)}
                              className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              {t('حذف', 'Delete')}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{t('إجمالي:', 'Total:')} {data?.total || 0}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p=>p-1)} className="p-1 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-50"><ChevronRight className={cn(isRtl && "rotate-180")} size={16}/></button>
            <span className="px-2">{page}</span>
            <button disabled={!data || data.data.length < 10} onClick={() => setPage(p=>p+1)} className="p-1 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-50"><ChevronLeft className={cn(isRtl && "rotate-180")} size={16}/></button>
          </div>
        </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{t('إضافة عميل', 'Add Client')}</h3>
                {createStep === 'docs' && (
                  <p className="text-xs text-muted-foreground mt-1">{t('الخطوة 2: إرفاق المستندات', 'Step 2: Attach Documents')}</p>
                )}
              </div>
              <button onClick={resetCreateDialog} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>

            {createStep === 'form' ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('الاسم الثلاثي (عربي)', 'Full Name (AR)')} *</label>
                  <input required className="premium-input" value={formData.fullNameAr} onChange={e => setFormData({...formData, fullNameAr: e.target.value})} dir="rtl" />
                </div>
                {!isHidden('client.phone') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('الهاتف', 'Phone')}</label>
                  <input className="premium-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} dir="ltr" />
                </div>
                )}

                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin size={14} />
                    {t('العناوين', 'Addresses')}
                  </p>
                  {!isHidden('client.address') && (
                  <div className="space-y-2 mb-3">
                    <label className="text-sm font-medium">{t('العنوان', 'Address')}</label>
                    <textarea className="premium-input min-h-[60px]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  )}
                  <div className="space-y-2 mb-3">
                    <label className="text-sm font-medium">{t('العنوان الأساسي', 'Primary Address')}</label>
                    <textarea className="premium-input min-h-[50px]" value={formData.primaryAddress} onChange={e => setFormData({...formData, primaryAddress: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('العنوان الثانوي', 'Secondary Address')}</label>
                    <textarea className="premium-input min-h-[50px]" value={formData.secondaryAddress} onChange={e => setFormData({...formData, secondaryAddress: e.target.value})} />
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">{t('وثائق التعريف', 'Identification Documents')}</p>
                  <div className="space-y-3">
                    {(!idSettings || idSettings.nationalId) && !isHidden('client.nationalId') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('الرقم القومي', 'National ID')} {idSettings?.nationalId ? '*' : ''}</label>
                        <input maxLength={14} minLength={14} className="premium-input" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} dir="ltr" required={!!idSettings?.nationalId} />
                      </div>
                    )}
                    {idSettings?.jobTitle && !isHidden('client.jobTitle') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('المسمى الوظيفي', 'Job Title')} *</label>
                        <input className="premium-input" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} required />
                      </div>
                    )}
                    {idSettings?.professionLicenseId && !isHidden('client.professionLicenseId') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('رقم رخصة المهنة', 'Profession License ID')} *</label>
                        <input className="premium-input" value={formData.professionLicenseId} onChange={e => setFormData({...formData, professionLicenseId: e.target.value})} dir="ltr" required />
                      </div>
                    )}
                    {idSettings?.agriculturalLandId && !isHidden('client.agriculturalLandId') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('رقم حيازة الأرض الزراعية', 'Agricultural Land ID')} *</label>
                        <input className="premium-input" value={formData.agriculturalLandId} onChange={e => setFormData({...formData, agriculturalLandId: e.target.value})} dir="ltr" required />
                      </div>
                    )}
                    {idSettings?.taxId && !isHidden('client.taxId') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('الرقم الضريبي', 'Tax ID')} *</label>
                        <input className="premium-input" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} dir="ltr" required />
                      </div>
                    )}
                    {idSettings?.commercialRegistrationNo && !isHidden('client.commercialRegistrationNo') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t('رقم السجل التجاري', 'Commercial Registration No.')} *</label>
                        <input className="premium-input" value={formData.commercialRegistrationNo} onChange={e => setFormData({...formData, commercialRegistrationNo: e.target.value})} dir="ltr" required />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <CalendarDays size={12} />
                          {t('تاريخ الإصدار', 'Issuance Date')}
                        </label>
                        <input type="date" className="premium-input" value={formData.idIssuanceDate} onChange={e => setFormData({...formData, idIssuanceDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <CalendarDays size={12} />
                          {t('تاريخ الانتهاء', 'Expiry Date')}
                        </label>
                        <input type="date" className="premium-input" value={formData.idExpiryDate} onChange={e => setFormData({...formData, idExpiryDate: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                {duplicateWarning && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm space-y-2">
                    <p className="font-medium">{duplicateWarning.message}</p>
                    {duplicateWarning.allowOverride && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={forceCreate} onChange={e => setForceCreate(e.target.checked)} className="rounded" />
                        <span>{t('متابعة الحفظ رغم التحذير', 'Continue saving despite warning')}</span>
                      </label>
                    )}
                  </div>
                )}
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={resetCreateDialog} className="px-4 py-2 rounded-xl font-medium hover:bg-secondary">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium">
                    {createMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : t('التالي: إرفاق المستندات', 'Next: Attach Documents')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm">
                  <p className="font-medium">{t('يجب إرفاق مستند تعريف واحد على الأقل (PDF) لإتمام تسجيل العميل', 'At least one identification document (PDF) must be attached to complete client registration')}</p>
                </div>

                <div className="premium-card p-4 border-dashed space-y-3">
                  <p className="text-sm font-bold">{t('رفع مستند (PDF فقط)', 'Upload Document (PDF Only)')}</p>
                  <div className="flex items-center gap-3">
                    <select className="premium-input flex-1" value={createDocType} onChange={e => setCreateDocType(e.target.value)}>
                      <option value="NationalID">{t('البطاقة الشخصية', 'National ID')}</option>
                      <option value="ProofOfAddress">{t('إثبات العنوان', 'Proof of Address')}</option>
                      <option value="IncomeProof">{t('إثبات الدخل', 'Income Proof')}</option>
                      <option value="ProfessionLicense">{t('رخصة المهنة', 'Profession License')}</option>
                      <option value="TaxCard">{t('البطاقة الضريبية', 'Tax Card')}</option>
                      <option value="CommercialRegistration">{t('السجل التجاري', 'Commercial Registration')}</option>
                      <option value="Other">{t('أخرى', 'Other')}</option>
                    </select>
                    <button type="button" disabled={createUploading} onClick={() => createDocFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium whitespace-nowrap">
                      {createUploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                      {t('اختر ملف', 'Choose File')}
                    </button>
                  </div>
                  <input ref={createDocFileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleCreateDocUpload} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <FileText size={16} />
                    {t('المستندات المرفقة', 'Attached Documents')} ({newClientDocsList.length})
                  </p>
                  {newClientDocsList.length === 0 ? (
                    <div className="premium-card p-6 text-center border-dashed bg-transparent">
                      <FileText size={28} className="mx-auto mb-2 opacity-20 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t('لم يتم إرفاق مستندات بعد', 'No documents attached yet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newClientDocsList.map((doc: any) => (
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

      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Edit className="text-blue-400" size={20} />
                  {t('تعديل بيانات العميل', 'Edit Client Profile')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{editingClient.fullNameAr}</p>
              </div>
              <button onClick={() => setEditingClient(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('الاسم (عربي)', 'Name (AR)')} *</label>
                    <input required className="premium-input" value={editForm.fullNameAr} onChange={e => setEditForm({...editForm, fullNameAr: e.target.value})} dir="rtl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('الاسم (إنجليزي)', 'Name (EN)')}</label>
                    <input className="premium-input" value={editForm.fullNameEn || ''} onChange={e => setEditForm({...editForm, fullNameEn: e.target.value})} />
                  </div>
                </div>
                {!isHidden('client.phone') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('الهاتف', 'Phone')}</label>
                    <input className="premium-input" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} dir="ltr" />
                  </div>
                )}
                {!isHidden('client.address') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('العنوان', 'Address')}</label>
                    <textarea className="premium-input min-h-[50px]" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('العنوان الأساسي', 'Primary Address')}</label>
                    <textarea className="premium-input min-h-[50px]" value={editForm.primaryAddress} onChange={e => setEditForm({...editForm, primaryAddress: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t('العنوان الثانوي', 'Secondary Address')}</label>
                    <textarea className="premium-input min-h-[50px]" value={editForm.secondaryAddress} onChange={e => setEditForm({...editForm, secondaryAddress: e.target.value})} />
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">{t('وثائق التعريف', 'Identification Documents')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(!idSettings || idSettings.nationalId) && !isHidden('client.nationalId') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('الرقم القومي', 'National ID')}</label>
                        <input maxLength={14} className="premium-input" value={editForm.nationalId} onChange={e => setEditForm({...editForm, nationalId: e.target.value})} dir="ltr" />
                      </div>
                    )}
                    {idSettings?.jobTitle && !isHidden('client.jobTitle') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('المسمى الوظيفي', 'Job Title')}</label>
                        <input className="premium-input" value={editForm.jobTitle} onChange={e => setEditForm({...editForm, jobTitle: e.target.value})} />
                      </div>
                    )}
                    {idSettings?.professionLicenseId && !isHidden('client.professionLicenseId') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('رقم رخصة المهنة', 'Profession License ID')}</label>
                        <input className="premium-input" value={editForm.professionLicenseId} onChange={e => setEditForm({...editForm, professionLicenseId: e.target.value})} dir="ltr" />
                      </div>
                    )}
                    {idSettings?.agriculturalLandId && !isHidden('client.agriculturalLandId') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('رقم حيازة الأرض الزراعية', 'Agricultural Land ID')}</label>
                        <input className="premium-input" value={editForm.agriculturalLandId} onChange={e => setEditForm({...editForm, agriculturalLandId: e.target.value})} dir="ltr" />
                      </div>
                    )}
                    {idSettings?.taxId && !isHidden('client.taxId') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('الرقم الضريبي', 'Tax ID')}</label>
                        <input className="premium-input" value={editForm.taxId} onChange={e => setEditForm({...editForm, taxId: e.target.value})} dir="ltr" />
                      </div>
                    )}
                    {idSettings?.commercialRegistrationNo && !isHidden('client.commercialRegistrationNo') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t('رقم السجل التجاري', 'Commercial Registration')}</label>
                        <input className="premium-input" value={editForm.commercialRegistrationNo} onChange={e => setEditForm({...editForm, commercialRegistrationNo: e.target.value})} dir="ltr" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium flex items-center gap-1"><CalendarDays size={12} />{t('تاريخ الإصدار', 'Issuance Date')}</label>
                      <input type="date" className="premium-input" value={editForm.idIssuanceDate} onChange={e => setEditForm({...editForm, idIssuanceDate: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium flex items-center gap-1"><CalendarDays size={12} />{t('تاريخ الانتهاء', 'Expiry Date')}</label>
                      <input type="date" className="premium-input" value={editForm.idExpiryDate} onChange={e => setEditForm({...editForm, idExpiryDate: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Paperclip size={14} />
                    {t('المستندات المرفقة (النسخ الجديدة تحتفظ بالقديمة)', 'Attached Documents (new versions keep old ones)')}
                  </p>
                  <div className="premium-card p-3 border-dashed space-y-2 mb-3">
                    <div className="flex items-center gap-3">
                      <select className="premium-input flex-1" value={editDocType} onChange={e => setEditDocType(e.target.value)}>
                        <option value="NationalID">{t('البطاقة الشخصية', 'National ID')}</option>
                        <option value="ProofOfAddress">{t('إثبات العنوان', 'Proof of Address')}</option>
                        <option value="IncomeProof">{t('إثبات الدخل', 'Income Proof')}</option>
                        <option value="ProfessionLicense">{t('رخصة المهنة', 'Profession License')}</option>
                        <option value="TaxCard">{t('البطاقة الضريبية', 'Tax Card')}</option>
                        <option value="CommercialRegistration">{t('السجل التجاري', 'Commercial Registration')}</option>
                        <option value="Other">{t('أخرى', 'Other')}</option>
                      </select>
                      <button type="button" disabled={editUploading} onClick={() => editDocFileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium whitespace-nowrap text-sm">
                        {editUploading ? <Loader2 className="animate-spin" size={14} /> : <FileUp size={14} />}
                        {t('رفع نسخة جديدة', 'Upload New Version')}
                      </button>
                    </div>
                    <input ref={editDocFileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleEditDocUpload} />
                  </div>
                  {editClientDocsList.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                      {editClientDocsList.map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 text-sm">
                          <FileText size={14} className="text-red-400 shrink-0" />
                          <span className="flex-1 truncate">{doc.documentName}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-secondary rounded">{doc.documentType}</span>
                          <span className="text-xs text-muted-foreground">v{doc.version || 1}</span>
                          <a href={`${BASE}/api/documents/download/${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <Download size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border">
                  <button type="button" onClick={() => setEditingClient(null)} className="px-4 py-2 rounded-xl font-medium hover:bg-secondary">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={editMutation.isPending} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg font-medium flex items-center gap-2">
                    {editMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Edit size={16} />}
                    {t('حفظ التعديلات', 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedClientForDocs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Paperclip className="text-primary" size={20} />
                  {t('مرفقات العميل', 'Client Attachments')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedClientForDocs.fullNameAr}{!isHidden('client.nationalId') && selectedClientForDocs.nationalId ? ` - ${selectedClientForDocs.nationalId}` : ''}</p>
              </div>
              <button onClick={() => setSelectedClientForDocs(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="premium-card p-4 border-dashed space-y-3">
                <p className="text-sm font-bold">{t('رفع مستند جديد (PDF فقط)', 'Upload New Document (PDF Only)')}</p>
                <div className="flex items-center gap-3">
                  <select
                    className="premium-input flex-1"
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                  >
                    <option value="NationalID">{t('البطاقة الشخصية', 'National ID')}</option>
                    <option value="ProofOfAddress">{t('إثبات العنوان', 'Proof of Address')}</option>
                    <option value="IncomeProof">{t('إثبات الدخل', 'Income Proof')}</option>
                    <option value="ProfessionLicense">{t('رخصة المهنة', 'Profession License')}</option>
                    <option value="TaxCard">{t('البطاقة الضريبية', 'Tax Card')}</option>
                    <option value="CommercialRegistration">{t('السجل التجاري', 'Commercial Registration')}</option>
                    <option value="Guarantee">{t('ضمان', 'Guarantee')}</option>
                    <option value="Contract">{t('عقد', 'Contract')}</option>
                    <option value="Other">{t('أخرى', 'Other')}</option>
                  </select>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-medium whitespace-nowrap"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                    {t('اختر ملف PDF', 'Choose PDF')}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground">{t('الحد الأقصى 10 ميجابايت لكل ملف. النسخ القديمة تبقى محفوظة.', 'Max 10MB per file. Old versions are kept.')}</p>
                {docUploadError && <p className="text-xs text-red-400">{docUploadError}</p>}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <FileText size={16} />
                  {t('المستندات المرفقة', 'Attached Documents')} ({clientDocsList.length})
                </p>
                {clientDocsList.length === 0 ? (
                  <div className="premium-card p-8 text-center border-dashed bg-transparent">
                    <FileText size={32} className="mx-auto mb-3 opacity-20 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('لا توجد مرفقات بعد', 'No attachments yet')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientDocsList.map((doc: any) => (
                      <div key={doc.id} className="premium-card p-4 flex items-center gap-4 group">
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
                              {formatDateTime(doc.createdAt)}
                            </span>
                          </div>
                          <a
                            href={`${BASE}/api/documents/download/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex text-xs text-primary hover:underline break-all"
                          >
                            {t('عرض المرفق', 'Open attachment')}
                          </a>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={`${BASE}/api/documents/download/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title={t('تحميل', 'Download')}
                          >
                            <Download size={16} />
                          </a>
                          <button
                            onClick={() => deletDocMutation.mutate(doc.id)}
                            disabled={deletDocMutation.isPending}
                            className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title={t('حذف', 'Delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClientForKyc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <UserCheck className="text-emerald-400" size={20} />
                  {t('التحقق من الهوية (KYC)', 'KYC Verification')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedClientForKyc.fullNameAr}{!isHidden('client.nationalId') && selectedClientForKyc.nationalId ? ` - ${selectedClientForKyc.nationalId}` : ''}</p>
              </div>
              <button onClick={() => setSelectedClientForKyc(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {clientDetailQuery.isLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : (
                <>
                  <div className="premium-card p-4 space-y-3">
                    <p className="text-sm font-bold flex items-center gap-2">
                      {(() => {
                        const status = clientDetailQuery.data?.kycStatus || 'Pending';
                        const statusConfig: Record<string, { color: string; icon: any; labelAr: string; labelEn: string }> = {
                          Pending: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock, labelAr: 'قيد الانتظار', labelEn: 'Pending' },
                          InProgress: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Loader2, labelAr: 'قيد المراجعة', labelEn: 'In Progress' },
                          Verified: { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2, labelAr: 'تم التحقق', labelEn: 'Verified' },
                          Rejected: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle, labelAr: 'مرفوض', labelEn: 'Rejected' },
                          Expired: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: AlertTriangle, labelAr: 'منتهي', labelEn: 'Expired' },
                        };
                        const cfg = statusConfig[status] || statusConfig.Pending;
                        const Icon = cfg.icon;
                        return (
                          <>
                            {t('حالة KYC الحالية:', 'Current KYC Status:')}
                            <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1", cfg.color)}>
                              <Icon size={12} />
                              {t(cfg.labelAr, cfg.labelEn)}
                            </span>
                          </>
                        );
                      })()}
                    </p>
                    {clientDetailQuery.data?.kycVerifiedAt && (
                      <p className="text-xs text-muted-foreground">
                        {t('تم التحقق في:', 'Verified at:')} {formatDate(clientDetailQuery.data.kycVerifiedAt)}
                      </p>
                    )}
                    {clientDetailQuery.data?.kycNotes && (
                      <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                        {clientDetailQuery.data.kycNotes}
                      </p>
                    )}
                  </div>

                  <div className="premium-card p-4 space-y-3">
                    <p className="text-sm font-bold">{t('تحديث حالة KYC', 'Update KYC Status')}</p>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('الحالة', 'Status')}</label>
                        <select
                          className="premium-input"
                          value={kycForm.kycStatus}
                          onChange={e => setKycForm({ ...kycForm, kycStatus: e.target.value })}
                        >
                          <option value="Pending">{t('قيد الانتظار', 'Pending')}</option>
                          <option value="InProgress">{t('قيد المراجعة', 'In Progress')}</option>
                          <option value="Verified">{t('تم التحقق', 'Verified')}</option>
                          <option value="Rejected">{t('مرفوض', 'Rejected')}</option>
                          <option value="Expired">{t('منتهي', 'Expired')}</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
                        <textarea
                          className="premium-input min-h-[60px]"
                          value={kycForm.kycNotes}
                          onChange={e => setKycForm({ ...kycForm, kycNotes: e.target.value })}
                          placeholder={t('ملاحظات KYC...', 'KYC notes...')}
                        />
                      </div>
                      <button
                        onClick={() => kycMutation.mutate(kycForm)}
                        disabled={kycMutation.isPending}
                        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg font-medium flex items-center justify-center gap-2"
                      >
                        {kycMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        {t('تحديث KYC', 'Update KYC')}
                      </button>
                    </div>
                  </div>

                  <div className="premium-card p-4 space-y-3">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Camera size={16} />
                      {t('صور الهوية', 'ID Photos')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="aspect-[4/3] rounded-xl border border-border bg-secondary/30 flex items-center justify-center">
                        {clientDetailQuery.data?.idFrontUrl ? (
                          <img src={clientDetailQuery.data.idFrontUrl} alt="ID Front" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <div className="text-center text-muted-foreground text-xs">
                            <Camera size={24} className="mx-auto mb-1 opacity-30" />
                            {t('وجه البطاقة', 'ID Front')}
                          </div>
                        )}
                      </div>
                      <div className="aspect-[4/3] rounded-xl border border-border bg-secondary/30 flex items-center justify-center">
                        {clientDetailQuery.data?.idBackUrl ? (
                          <img src={clientDetailQuery.data.idBackUrl} alt="ID Back" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <div className="text-center text-muted-foreground text-xs">
                            <Camera size={24} className="mx-auto mb-1 opacity-30" />
                            {t('ظهر البطاقة', 'ID Back')}
                          </div>
                        )}
                      </div>
                    </div>
                    {clientDetailQuery.data?.photoUrl && (
                      <div className="flex items-center gap-3">
                        <img src={clientDetailQuery.data.photoUrl} alt="Client Photo" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
                        <span className="text-sm text-muted-foreground">{t('صورة العميل', 'Client Photo')}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedClientProfile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Users className="text-primary" size={20} />
                  {t('ملف العميل', 'Client Profile')}
                </h3>
                {profileQuery.data && (
                  <p className="text-sm text-muted-foreground mt-1">{profileQuery.data.fullNameAr}</p>
                )}
              </div>
              <button onClick={() => setSelectedClientProfile(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {profileQuery.isLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : profileQuery.data ? (
                <>
                  <div className="premium-card p-4 space-y-3">
                    <p className="text-sm font-bold">{t('البيانات الأساسية', 'Basic Information')}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">{t('الاسم (عربي)', 'Name (AR)')}</span>
                        <p className="font-medium">{profileQuery.data.fullNameAr}</p>
                      </div>
                      {profileQuery.data.fullNameEn && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('الاسم (إنجليزي)', 'Name (EN)')}</span>
                          <p className="font-medium">{profileQuery.data.fullNameEn}</p>
                        </div>
                      )}
                      {!isHidden('client.nationalId') && profileQuery.data.nationalId && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('الرقم القومي', 'National ID')}</span>
                          <p className="font-mono">{profileQuery.data.nationalId}</p>
                        </div>
                      )}
                      {!isHidden('client.phone') && profileQuery.data.phone && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('الهاتف', 'Phone')}</span>
                          <p dir="ltr">{profileQuery.data.phone}</p>
                        </div>
                      )}
                      {profileQuery.data.clientCode && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('كود العميل', 'Client Code')}</span>
                          <p className="font-mono">{profileQuery.data.clientCode}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(profileQuery.data.address || profileQuery.data.primaryAddress || profileQuery.data.secondaryAddress) && (
                    <div className="premium-card p-4 space-y-3">
                      <p className="text-sm font-bold flex items-center gap-2"><MapPin size={14} />{t('العناوين', 'Addresses')}</p>
                      <div className="space-y-2 text-sm">
                        {profileQuery.data.address && (
                          <div>
                            <span className="text-muted-foreground text-xs">{t('العنوان', 'Address')}</span>
                            <p>{profileQuery.data.address}</p>
                          </div>
                        )}
                        {profileQuery.data.primaryAddress && (
                          <div>
                            <span className="text-muted-foreground text-xs">{t('العنوان الأساسي', 'Primary Address')}</span>
                            <p>{profileQuery.data.primaryAddress}</p>
                          </div>
                        )}
                        {profileQuery.data.secondaryAddress && (
                          <div>
                            <span className="text-muted-foreground text-xs">{t('العنوان الثانوي', 'Secondary Address')}</span>
                            <p>{profileQuery.data.secondaryAddress}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="premium-card p-4 space-y-3">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <UserCheck size={14} />
                      {t('حالة KYC', 'KYC Status')}
                    </p>
                    {(() => {
                      const status = profileQuery.data.kycStatus || 'Pending';
                      const statusConfig: Record<string, { color: string; icon: any; labelAr: string; labelEn: string }> = {
                        Pending: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock, labelAr: 'قيد الانتظار', labelEn: 'Pending' },
                        InProgress: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Loader2, labelAr: 'قيد المراجعة', labelEn: 'In Progress' },
                        Verified: { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2, labelAr: 'تم التحقق', labelEn: 'Verified' },
                        Rejected: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle, labelAr: 'مرفوض', labelEn: 'Rejected' },
                        Expired: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: AlertTriangle, labelAr: 'منتهي', labelEn: 'Expired' },
                      };
                      const cfg = statusConfig[status] || statusConfig.Pending;
                      const Icon = cfg.icon;
                      return (
                        <span className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1", cfg.color)}>
                          <Icon size={12} />
                          {t(cfg.labelAr, cfg.labelEn)}
                        </span>
                      );
                    })()}
                    {profileQuery.data.kycNotes && (
                      <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg mt-2">{profileQuery.data.kycNotes}</p>
                    )}
                  </div>

                  <div className="premium-card p-4 space-y-3">
                    <p className="text-sm font-bold">{t('وثائق التعريف', 'Identification')}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {!isHidden('client.jobTitle') && profileQuery.data.jobTitle && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('المسمى الوظيفي', 'Job Title')}</span>
                          <p>{profileQuery.data.jobTitle}</p>
                        </div>
                      )}
                      {!isHidden('client.professionLicenseId') && profileQuery.data.professionLicenseId && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('رخصة المهنة', 'Profession License')}</span>
                          <p className="font-mono">{profileQuery.data.professionLicenseId}</p>
                        </div>
                      )}
                      {!isHidden('client.taxId') && profileQuery.data.taxId && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('الرقم الضريبي', 'Tax ID')}</span>
                          <p className="font-mono">{profileQuery.data.taxId}</p>
                        </div>
                      )}
                      {!isHidden('client.commercialRegistrationNo') && profileQuery.data.commercialRegistrationNo && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('السجل التجاري', 'Commercial Reg.')}</span>
                          <p className="font-mono">{profileQuery.data.commercialRegistrationNo}</p>
                        </div>
                      )}
                      {profileQuery.data.idIssuanceDate && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('تاريخ الإصدار', 'Issuance Date')}</span>
                          <p>{profileQuery.data.idIssuanceDate}</p>
                        </div>
                      )}
                      {profileQuery.data.idExpiryDate && (
                        <div>
                          <span className="text-muted-foreground text-xs">{t('تاريخ الانتهاء', 'Expiry Date')}</span>
                          <p>{profileQuery.data.idExpiryDate}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {profileDocsList.length > 0 && (
                    <div className="premium-card p-4 space-y-3">
                      <p className="text-sm font-bold flex items-center gap-2">
                        <Paperclip size={14} />
                        {t('المستندات', 'Documents')} ({profileDocsList.length})
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {profileDocsList.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 text-sm">
                            <FileText size={14} className="text-red-400 shrink-0" />
                            <span className="flex-1 truncate">{doc.documentName}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-secondary rounded">{doc.documentType}</span>
                            <span className="text-xs text-muted-foreground">v{doc.version || 1}</span>
                            <a href={`${BASE}/api/documents/download/${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                              <Download size={14} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {canEditClient && (
                      <button
                        onClick={() => { setSelectedClientProfile(null); openEditDialog(profileQuery.data); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm"
                      >
                        <Edit size={14} />
                        {t('تعديل البيانات', 'Edit Profile')}
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedClientProfile(null); setSelectedClientForKyc(profileQuery.data); setKycForm({ kycStatus: profileQuery.data.kycStatus || 'Pending', kycNotes: '' }); }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm"
                    >
                      <UserCheck size={14} />
                      {t('تحديث KYC', 'Update KYC')}
                    </button>
                    <button
                      onClick={() => { setSelectedClientProfile(null); setSelectedClientForDocs(profileQuery.data); }}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl font-medium text-sm"
                    >
                      <Paperclip size={14} />
                      {t('إدارة المرفقات', 'Manage Attachments')}
                    </button>
                    <button
                      onClick={() => { setSelectedClientProfile(null); setSelectedClientForRisk(profileQuery.data.id); }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium text-sm"
                    >
                      <ShieldAlert size={14} />
                      {t('فحص المخاطر', 'Risk Check')}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('لم يتم العثور على العميل', 'Client not found')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedClientForRisk && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><ShieldAlert className="text-primary"/> {t('نتيجة فحص المخاطر', 'Risk Assessment')}</h3>
              <button onClick={() => setSelectedClientForRisk(null)} className="text-muted-foreground"><XCircle size={24}/></button>
            </div>
            <div className="p-6">
              {riskQuery.isLoading ? (
                 <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : riskQuery.data ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-primary/20 mb-4 relative">
                    <span className="text-4xl font-display font-bold text-primary">{riskQuery.data.totalScore}</span>
                  </div>
                  <h4 className={cn("text-xl font-bold mb-6", 
                    riskQuery.data.riskLevel === 'Low' ? 'text-green-400' : 
                    riskQuery.data.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {riskQuery.data.riskLevel} Risk
                  </h4>
                  <div className="space-y-3 text-left bg-secondary/30 p-4 rounded-xl">
                    {riskQuery.data.breakdown.map((b, i) => (
                      <div key={i} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{b.criteriaName}</span>
                        <span className="font-bold">{b.score}/{b.maxScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">{t('حدث خطأ', 'Error loading data')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

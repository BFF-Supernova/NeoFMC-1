import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Workflow, Plus, Settings, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Workflows() {
  const { t, isRtl } = useLanguage();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ workflowName: '', workflowNameAr: '', description: '', entityType: 'LoanRequest' });
  const [stepForm, setStepForm] = useState({ stepName: '', stepNameAr: '', stepOrder: 1, allowedRoles: '', isTerminal: false });
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const wfs = await api.get<any[]>('/custom-workflows'); setWorkflows(wfs); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const loadWorkflowDetail = async (id: string) => {
    try {
      const detail = await api.get<any>(`/custom-workflows/${id}`);
      setWorkflows(prev => prev.map(w => w.id === id ? detail : w));
    } catch (err) { handleApiError(err); }
  };

  const handleCreate = async () => {
    try {
      await api.post('/custom-workflows', form);
      setShowForm(false);
      setForm({ workflowName: '', workflowNameAr: '', description: '', entityType: 'LoanRequest' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleAddStep = async (workflowId: string) => {
    try {
      await api.post(`/custom-workflows/${workflowId}/steps`, {
        ...stepForm,
        allowedRoles: stepForm.allowedRoles ? stepForm.allowedRoles.split(',').map(r => r.trim()) : null,
      });
      setAddingStepTo(null);
      setStepForm({ stepName: '', stepNameAr: '', stepOrder: 1, allowedRoles: '', isTerminal: false });
      loadWorkflowDetail(workflowId);
    } catch (err) { handleApiError(err); }
  };

  const handleDeleteStep = async (workflowId: string, stepId: string) => {
    try { await api.delete(`/custom-workflows/${workflowId}/steps/${stepId}`); loadWorkflowDetail(workflowId); } catch (err) { handleApiError(err); }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); } else {
      setExpandedId(id);
      loadWorkflowDetail(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('سير العمل المخصص', 'Custom Workflows')}</h2>
          <p className="text-muted-foreground mt-1">{t('إنشاء وإدارة مسارات العمل', 'Create and manage workflow pipelines')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('إنشاء سير عمل', 'Create Workflow')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('سير عمل جديد', 'New Workflow')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder={t('الاسم (إنجليزي)', 'Name (English)')} value={form.workflowName} onChange={e => setForm({ ...form, workflowName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('الاسم (عربي)', 'Name (Arabic)')} value={form.workflowNameAr} onChange={e => setForm({ ...form, workflowNameAr: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('الوصف', 'Description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <select value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="LoanRequest">{t('طلب تمويل', 'Loan Request')}</option>
              <option value="Expense">{t('مصروف', 'Expense')}</option>
              <option value="BranchRequest">{t('طلب فرع', 'Branch Request')}</option>
              <option value="Other">{t('أخرى', 'Other')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('إنشاء', 'Create')}</button>
            <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Workflow className="mx-auto mb-3 opacity-20" size={48} />
          <p>{t('لا توجد مسارات عمل', 'No workflows found')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map(wf => (
            <div key={wf.id} className="premium-card overflow-hidden">
              <div className="p-5 flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(wf.id)}>
                <div>
                  <h4 className="font-bold">{isRtl ? wf.workflowNameAr || wf.workflowName : wf.workflowName}</h4>
                  <p className="text-sm text-muted-foreground">{wf.entityType} • {wf.isActive ? t('مفعل', 'Active') : t('معطل', 'Inactive')}</p>
                </div>
                {expandedId === wf.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedId === wf.id && (
                <div className="border-t border-border p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium">{t('خطوات سير العمل', 'Workflow Steps')}</h5>
                    <button onClick={() => setAddingStepTo(wf.id)} className="text-sm flex items-center gap-1 text-primary hover:text-primary/80">
                      <Plus size={14} /> {t('إضافة خطوة', 'Add Step')}
                    </button>
                  </div>

                  {wf.steps && wf.steps.length > 0 ? (
                    <div className="space-y-2">
                      {wf.steps.sort((a: any, b: any) => a.stepOrder - b.stepOrder).map((step: any, idx: number) => (
                        <div key={step.id} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{step.stepOrder}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{isRtl ? step.stepNameAr || step.stepName : step.stepName}</p>
                            {step.allowedRoles && <p className="text-xs text-muted-foreground">{t('الأدوار', 'Roles')}: {step.allowedRoles.join(', ')}</p>}
                          </div>
                          {step.isTerminal && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded">{t('نهائي', 'Terminal')}</span>}
                          <button onClick={() => handleDeleteStep(wf.id, step.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('لا توجد خطوات', 'No steps defined')}</p>
                  )}

                  {addingStepTo === wf.id && (
                    <div className="p-4 bg-secondary/10 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input placeholder={t('اسم الخطوة', 'Step Name')} value={stepForm.stepName} onChange={e => setStepForm({ ...stepForm, stepName: e.target.value })} className="input bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder={t('الاسم بالعربي', 'Arabic Name')} value={stepForm.stepNameAr} onChange={e => setStepForm({ ...stepForm, stepNameAr: e.target.value })} className="input bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                        <input type="number" placeholder={t('الترتيب', 'Order')} value={stepForm.stepOrder} onChange={e => setStepForm({ ...stepForm, stepOrder: Number(e.target.value) })} className="input bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <input placeholder={t('الأدوار المسموحة (مفصولة بفاصلة)', 'Allowed Roles (comma-separated)')} value={stepForm.allowedRoles} onChange={e => setStepForm({ ...stepForm, allowedRoles: e.target.value })} className="input w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={stepForm.isTerminal} onChange={e => setStepForm({ ...stepForm, isTerminal: e.target.checked })} />
                          {t('خطوة نهائية', 'Terminal Step')}
                        </label>
                        <button onClick={() => handleAddStep(wf.id)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm">{t('إضافة', 'Add')}</button>
                        <button onClick={() => setAddingStepTo(null)} className="text-sm text-muted-foreground">{t('إلغاء', 'Cancel')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

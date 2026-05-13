import { useState } from 'react';
import {
  useListRiskCriteria, useCreateRiskCriteria, getListRiskCriteriaQueryKey,
} from '@workspace/api-client-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import {
  ShieldCheck, Loader2, Plus, X, Edit2,
} from 'lucide-react';

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-11 rounded-xl bg-secondary/50 border border-border px-4 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";
const selectCls = "w-full h-11 rounded-xl bg-secondary/50 border border-border px-4 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";

export default function RiskCriteria() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdmin = user?.role === 'TenantAdmin' || isSuperAdmin;

  const { data: riskCriteria, isLoading } = useListRiskCriteria();

  const [riskModal, setRiskModal] = useState(false);
  const [editRisk, setEditRisk] = useState<any>(null);
  const [riskForm, setRiskForm] = useState({ criteriaName: '', criteriaType: '', maxScore: '10', weight: '1' });
  const [riskError, setRiskError] = useState('');
  const [riskSaving, setRiskSaving] = useState(false);

  const createRisk = useCreateRiskCriteria({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getListRiskCriteriaQueryKey() }); setRiskModal(false); setEditRisk(null); setRiskError(''); },
    onError: (e: any) => setRiskError(e?.data?.message || 'Error'),
  }});

  function openNewRisk() {
    setEditRisk(null);
    setRiskForm({ criteriaName: '', criteriaType: '', maxScore: '10', weight: '1' });
    setRiskError('');
    setRiskModal(true);
  }

  function openEditRisk(r: any) {
    setEditRisk(r);
    setRiskForm({
      criteriaName: r.criteriaName || '',
      criteriaType: r.criteriaType || '',
      maxScore: r.maxScore?.toString() || '10',
      weight: r.weight?.toString() || '1',
    });
    setRiskError('');
    setRiskModal(true);
  }

  async function submitRisk() {
    if (!riskForm.criteriaName || !riskForm.criteriaType) {
      setRiskError(t('يرجى ملء الحقول الإلزامية', 'Please fill required fields'));
      return;
    }
    const data = {
      criteriaName: riskForm.criteriaName,
      criteriaType: riskForm.criteriaType,
      maxScore: parseInt(riskForm.maxScore),
      weight: parseFloat(riskForm.weight),
      rules: { maxScore: parseInt(riskForm.maxScore) },
    };
    if (editRisk) {
      setRiskSaving(true);
      try {
        await api.put(`/risk-criteria/${editRisk.id}`, data);
        qc.invalidateQueries({ queryKey: getListRiskCriteriaQueryKey() });
        setRiskModal(false);
        setEditRisk(null);
        setRiskError('');
      } catch (err) {
        handleApiError(err);
        setRiskError(err instanceof Error ? err.message : 'Error updating criteria');
      } finally {
        setRiskSaving(false);
      }
    } else {
      createRisk.mutate({ data } as any);
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <ShieldCheck size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('معايير المخاطر', 'Risk Criteria')}</h2>
            <p className="text-muted-foreground text-sm">{t('إدارة وتكوين معايير تقييم المخاطر', 'Configure and manage risk assessment criteria')}</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openNewRisk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shadow-md shadow-primary/20">
            <Plus size={16} /> {t('معيار جديد', 'New Criteria')}
          </button>
        )}
      </div>

      <div className="premium-card overflow-hidden animate-fade-in">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
            <tr>
              <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المعيار', 'Criterion')}</th>
              <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
              <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الوزن', 'Weight')}</th>
              <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('أقصى درجة', 'Max Score')}</th>
              <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
              {isAdmin && <th className="px-6 py-4"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
            ) : (riskCriteria as any[])?.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">{t('لا توجد معايير مخاطر بعد', 'No risk criteria configured yet')}</td></tr>
            ) : (riskCriteria as any[])?.map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-bold">{r.criteriaName}</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-secondary rounded-lg text-xs font-medium">{r.criteriaType}</span></td>
                <td className="px-6 py-4 font-mono">{r.weight}</td>
                <td className="px-6 py-4 font-mono">{r.maxScore || 10}</td>
                <td className="px-6 py-4">
                  {r.isActive !== false
                    ? <span className="text-green-400 text-xs font-bold flex items-center gap-1">● {t('نشط', 'Active')}</span>
                    : <span className="text-red-400 text-xs flex items-center gap-1">● {t('معطل', 'Inactive')}</span>}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <button onClick={() => openEditRisk(r)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Edit2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={riskModal} onClose={() => { setRiskModal(false); setEditRisk(null); }} title={t(editRisk ? 'تعديل معيار المخاطر' : 'معيار مخاطر جديد', editRisk ? 'Edit Risk Criterion' : 'New Risk Criterion')}>
        <div className="space-y-4">
          {riskError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{riskError}</div>}
          <Field label={t('اسم المعيار', 'Criterion Name')} required>
            <input className={inputCls} value={riskForm.criteriaName} onChange={e => setRiskForm(p => ({ ...p, criteriaName: e.target.value }))} placeholder={t('مثال: نسبة المديونية', 'e.g. Debt Ratio')} />
          </Field>
          <Field label={t('نوع المعيار', 'Criterion Type')} required>
            <select className={selectCls} value={riskForm.criteriaType} onChange={e => setRiskForm(p => ({ ...p, criteriaType: e.target.value }))}>
              <option value="">{t('اختر النوع', 'Select Type')}</option>
              <option value="Age">{t('العمر', 'Age')}</option>
              <option value="PaymentHistory">{t('سجل السداد', 'Payment History')}</option>
              <option value="Blacklist">{t('القائمة السوداء', 'Blacklist')}</option>
              <option value="DebtRatio">{t('نسبة المديونية', 'Debt Ratio')}</option>
              <option value="IncomeLevel">{t('مستوى الدخل', 'Income Level')}</option>
              <option value="EmploymentStatus">{t('حالة التوظيف', 'Employment Status')}</option>
              <option value="Custom">{t('مخصص', 'Custom')}</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('الحد الأقصى للدرجات', 'Max Score')}>
              <input className={inputCls} type="number" value={riskForm.maxScore} onChange={e => setRiskForm(p => ({ ...p, maxScore: e.target.value }))} placeholder="10" />
            </Field>
            <Field label={t('الوزن', 'Weight')}>
              <input className={inputCls} type="number" step="0.1" value={riskForm.weight} onChange={e => setRiskForm(p => ({ ...p, weight: e.target.value }))} placeholder="1" />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={submitRisk} disabled={createRisk.isPending || riskSaving}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {(createRisk.isPending || riskSaving) ? <Loader2 className="animate-spin" size={18} /> : (editRisk ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء', 'Create'))}
            </button>
            <button onClick={() => { setRiskModal(false); setEditRisk(null); }} className="px-5 h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm transition-all">
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

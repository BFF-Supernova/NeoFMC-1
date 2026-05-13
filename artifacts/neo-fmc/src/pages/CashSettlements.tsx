import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Banknote, Plus, Loader2, CheckCircle, Box } from 'lucide-react';

export default function CashSettlements() {
  const { t, isRtl } = useLanguage();
  const [tab, setTab] = useState<'settlements' | 'cashboxes'>('settlements');
  const [settlements, setSettlements] = useState<any>({ data: [], total: 0 });
  const [cashBoxes, setCashBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ branchId: '', settlementType: 'Collection', cashBoxType: 'Main', amount: '', fromBranchId: '', toBranchId: '', commissionPct: '', referenceNumber: '', notes: '' });

  useEffect(() => { loadData(); api.get<any[]>('/branches').then(setBranches).catch(() => {}); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sett, boxes] = await Promise.all([
        api.get<any>('/cash-settlements'),
        api.get<any[]>('/cash-settlements/cash-boxes'),
      ]);
      setSettlements(sett);
      setCashBoxes(boxes);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      const commissionAmount = form.commissionPct ? (Number(form.amount) * Number(form.commissionPct) / 100).toFixed(2) : '0';
      await api.post('/cash-settlements', {
        ...form, amount: Number(form.amount),
        commissionAmount: Number(commissionAmount),
        commissionPct: Number(form.commissionPct || 0),
        fromBranchId: form.fromBranchId || undefined,
        toBranchId: form.toBranchId || undefined,
      });
      setShowForm(false);
      setForm({ branchId: '', settlementType: 'Collection', cashBoxType: 'Main', amount: '', fromBranchId: '', toBranchId: '', commissionPct: '', referenceNumber: '', notes: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleApprove = async (id: string) => {
    try { await api.put(`/cash-settlements/${id}/approve`); loadData(); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('التسويات النقدية', 'Cash Settlements')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة التسويات النقدية والصناديق', 'Manage cash settlements and cash boxes')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('تسوية جديدة', 'New Settlement')}
        </button>
      </div>

      <div className="flex border-b border-border overflow-x-auto custom-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'settlements' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('settlements')}>
          <Banknote className="inline mr-2" size={16} />{t('التسويات', 'Settlements')}
        </button>
        <button className={cn("px-4 sm:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm", tab === 'cashboxes' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")} onClick={() => setTab('cashboxes')}>
          <Box className="inline mr-2" size={16} />{t('الصناديق', 'Cash Boxes')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('تسوية نقدية جديدة', 'New Cash Settlement')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="">{t('اختر الفرع', 'Select Branch')}</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : b.branchNameEn || b.branchNameAr}</option>)}
            </select>
            <select value={form.settlementType} onChange={e => setForm({ ...form, settlementType: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="Collection">{t('تحصيل', 'Collection')}</option>
              <option value="Transfer">{t('تحويل', 'Transfer')}</option>
              <option value="Deposit">{t('إيداع', 'Deposit')}</option>
              <option value="Withdrawal">{t('سحب', 'Withdrawal')}</option>
              <option value="Commission">{t('عمولة', 'Commission')}</option>
            </select>
            <select value={form.cashBoxType} onChange={e => setForm({ ...form, cashBoxType: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
              <option value="Main">{t('رئيسي', 'Main')}</option>
              <option value="Secondary">{t('ثانوي', 'Secondary')}</option>
              <option value="Tertiary">{t('ثالث', 'Tertiary')}</option>
            </select>
            <input type="number" placeholder={t('المبلغ', 'Amount')} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input type="number" placeholder={t('نسبة العمولة %', 'Commission %')} value={form.commissionPct} onChange={e => setForm({ ...form, commissionPct: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('رقم المرجع', 'Reference #')} value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            {form.settlementType === 'Transfer' && (
              <>
                <select value={form.fromBranchId} onChange={e => setForm({ ...form, fromBranchId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
                  <option value="">{t('من فرع', 'From Branch')}</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : b.branchNameEn || b.branchNameAr}</option>)}
                </select>
                <select value={form.toBranchId} onChange={e => setForm({ ...form, toBranchId: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2">
                  <option value="">{t('إلى فرع', 'To Branch')}</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{isRtl ? b.branchNameAr : b.branchNameEn || b.branchNameAr}</option>)}
                </select>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('حفظ', 'Save')}</button>
            <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      {tab === 'settlements' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                <tr>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الصندوق', 'Box')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المبلغ', 'Amount')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('العمولة', 'Commission')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الحالة', 'Status')}</th>
                  <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : settlements.data?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">{t('لا توجد تسويات', 'No settlements')}</td></tr>
                ) : (
                  settlements.data?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{s.settlementType}</td>
                      <td className="px-6 py-4">{s.cashBoxType}</td>
                      <td className="px-6 py-4 font-bold text-primary">{formatCurrency(s.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{formatCurrency(s.commissionAmount)}</td>
                      <td className="px-6 py-4">{formatDate(s.settlementDate)}</td>
                      <td className="px-6 py-4"><span className={cn("px-2 py-1 rounded text-xs", getStatusColor(s.status))}>{s.status}</span></td>
                      <td className="px-6 py-4">
                        {s.status === 'Pending' && (
                          <button onClick={() => handleApprove(s.id)} className="text-green-400 hover:text-green-300"><CheckCircle size={18} /></button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'cashboxes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cashBoxes.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground"><Box className="mx-auto mb-3 opacity-20" size={32} />{t('لا توجد صناديق', 'No cash boxes')}</div>
          ) : (
            cashBoxes.map((box: any) => (
              <div key={box.id} className="premium-card p-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold">{box.boxName}</h4>
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{box.boxType}</span>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(box.balance)}</p>
                <p className="text-xs text-muted-foreground mt-1">{box.isActive ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

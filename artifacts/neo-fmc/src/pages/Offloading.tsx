import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate, cn, getStatusColor } from '@/lib/utils';
import { api, handleApiError } from '@/lib/api';
import { Truck, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Offloading() {
  const { t, isRtl } = useLanguage();
  const [batches, setBatches] = useState<any>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<any>(null);
  const [form, setForm] = useState({ batchName: '', description: '', thirdPartyName: '', thirdPartyContact: '', offloadDate: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { const data = await api.get<any>('/offloading'); setBatches(data); } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await api.post('/offloading', form);
      setShowForm(false);
      setForm({ batchName: '', description: '', thirdPartyName: '', thirdPartyContact: '', offloadDate: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await api.put(`/offloading/${id}/status`, { status }); loadData(); } catch (err) { handleApiError(err); }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try { const detail = await api.get<any>(`/offloading/${id}`); setExpandedBatch(detail); } catch (err) { handleApiError(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('تفريغ المحفظة', 'Offloading')}</h2>
          <p className="text-muted-foreground mt-1">{t('تفريغ محفظة القروض لأطراف ثالثة', 'Offload loan portfolios to third parties')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={18} /> {t('دفعة جديدة', 'New Batch')}
        </button>
      </div>

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('دفعة تفريغ جديدة', 'New Offloading Batch')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder={t('اسم الدفعة', 'Batch Name')} value={form.batchName} onChange={e => setForm({ ...form, batchName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('الطرف الثالث', 'Third Party')} value={form.thirdPartyName} onChange={e => setForm({ ...form, thirdPartyName: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('جهة الاتصال', 'Contact')} value={form.thirdPartyContact} onChange={e => setForm({ ...form, thirdPartyContact: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input type="date" value={form.offloadDate} onChange={e => setForm({ ...form, offloadDate: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2" />
            <input placeholder={t('الوصف', 'Description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input bg-background border border-border rounded-lg px-4 py-2 md:col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">{t('إنشاء', 'Create')}</button>
            <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></div>
      ) : batches.data?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Truck className="mx-auto mb-3 opacity-20" size={48} /><p>{t('لا توجد دفعات', 'No batches')}</p></div>
      ) : (
        <div className="space-y-4">
          {batches.data?.map((batch: any) => (
            <div key={batch.id} className="premium-card overflow-hidden">
              <div className="p-5 flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(batch.id)}>
                <div>
                  <h4 className="font-bold">{batch.batchName}</h4>
                  <p className="text-sm text-muted-foreground">{batch.totalLoans} {t('قرض', 'loans')} • {formatCurrency(batch.totalAmount)} • {batch.thirdPartyName || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("px-2 py-1 rounded text-xs", getStatusColor(batch.status))}>{batch.status}</span>
                  {expandedId === batch.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {expandedId === batch.id && expandedBatch && (
                <div className="border-t border-border p-5 space-y-4">
                  <div className="flex gap-2">
                    {batch.status === 'Draft' && <button onClick={() => handleStatusChange(batch.id, 'Submitted')} className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded text-xs">{t('تقديم', 'Submit')}</button>}
                    {batch.status === 'Submitted' && <button onClick={() => handleStatusChange(batch.id, 'Approved')} className="bg-green-500/10 text-green-400 px-3 py-1 rounded text-xs">{t('موافقة', 'Approve')}</button>}
                    {batch.status === 'Approved' && <button onClick={() => handleStatusChange(batch.id, 'Completed')} className="bg-primary/10 text-primary px-3 py-1 rounded text-xs">{t('اكتمال', 'Complete')}</button>}
                  </div>

                  {expandedBatch.items?.length > 0 && (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr>
                          <th className="px-4 py-2 text-left">{t('العميل', 'Client')}</th>
                          <th className="px-4 py-2 text-left">{t('المبلغ المتبقي', 'Outstanding')}</th>
                          <th className="px-4 py-2 text-left">{t('سعر التفريغ', 'Offload Price')}</th>
                          <th className="px-4 py-2 text-left">{t('الحالة', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {expandedBatch.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2">{item.clientName || '-'}</td>
                            <td className="px-4 py-2 font-bold">{formatCurrency(item.outstandingAmount)}</td>
                            <td className="px-4 py-2">{item.offloadPrice ? formatCurrency(item.offloadPrice) : '-'}</td>
                            <td className="px-4 py-2"><span className={cn("px-2 py-1 rounded text-xs", getStatusColor(item.status))}>{item.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

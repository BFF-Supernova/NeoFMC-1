import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlacklists, useAddBlacklist, useRemoveBlacklist } from '@/hooks/useComplianceApi';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDate } from '@/lib/utils';
import {
  ShieldAlert, Plus, Trash2, Loader2, X, Search, AlertTriangle, UserX,
} from 'lucide-react';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

export default function Blacklists() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [listTypeFilter, setListTypeFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nationalId: '', fullName: '', listType: 'unfavorable', reason: '', source: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useBlacklists(listTypeFilter || undefined);
  const addMutation = useAddBlacklist();
  const removeMutation = useRemoveBlacklist();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nationalId || !form.fullName) return;
    addMutation.mutate(form, {
      onSuccess: () => {
        toast({ title: t('تمت الإضافة', 'Added'), description: t('تمت إضافة السجل للقائمة', 'Entry added to blacklist') });
        setShowModal(false);
        setForm({ nationalId: '', fullName: '', listType: 'unfavorable', reason: '', source: '' });
      },
      onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
    });
  };

  const handleRemove = (id: string) => {
    removeMutation.mutate(id, {
      onSuccess: () => toast({ title: t('تم الحذف', 'Removed'), description: t('تم حذف السجل', 'Entry removed') }),
      onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
    });
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const entries = data?.data || [];
  const filtered = searchQuery
    ? entries.filter((e: any) => e.nationalId.includes(searchQuery) || e.fullName.includes(searchQuery))
    : entries;

  const tabs = [
    { key: '', label: t('الكل', 'All') },
    { key: 'unfavorable', label: t('قوائم غير مرغوبة', 'Unfavorable') },
    { key: 'terrorism', label: t('قوائم إرهاب', 'Terrorism') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert size={24} className="text-red-400" />{t('القوائم السوداء', 'Blacklist Management')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة القوائم غير المرغوبة وقوائم الإرهاب', 'Manage unfavorable and terrorism lists')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg font-medium transition-all">
          <Plus size={18} />
          {t('إضافة سجل', 'Add Entry')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('إجمالي السجلات', 'Total Entries')}</p>
            <h3 className="text-3xl font-display font-bold mt-1">{entries.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400"><UserX size={24} /></div>
        </div>
        <div className="premium-card p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('غير مرغوبة', 'Unfavorable')}</p>
            <h3 className="text-3xl font-display font-bold mt-1">{entries.filter((e: any) => e.listType === 'unfavorable').length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400"><AlertTriangle size={24} /></div>
        </div>
        <div className="premium-card p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('إرهاب', 'Terrorism')}</p>
            <h3 className="text-3xl font-display font-bold mt-1">{entries.filter((e: any) => e.listType === 'terrorism').length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500"><ShieldAlert size={24} /></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setListTypeFilter(tab.key)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                listTypeFilter === tab.key ? "bg-red-600 text-white" : "bg-secondary hover:bg-secondary/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute top-3 start-3 text-muted-foreground" />
          <input
            className={inputCls + " ps-9"}
            placeholder={t('بحث بالرقم القومي أو الاسم...', 'Search by National ID or Name...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الرقم القومي', 'National ID')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('الاسم', 'Name')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('السبب', 'Reason')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('المصدر', 'Source')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-6 py-4 font-semibold", isRtl ? "text-right" : "text-left")}>{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{entry.nationalId}</td>
                  <td className="px-6 py-4 font-semibold">{entry.fullName}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border",
                      entry.listType === 'terrorism' ? "bg-red-600/10 text-red-500 border-red-600/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    )}>
                      {entry.listType === 'terrorism' ? t('إرهاب', 'Terrorism') : t('غير مرغوب', 'Unfavorable')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{entry.reason || '-'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{entry.source || '-'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(entry.createdAt)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={removeMutation.isPending}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <UserX size={32} className="mx-auto mb-3 opacity-20" />
                    {t('لا توجد سجلات', 'No blacklist entries found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold">{t('إضافة للقائمة السوداء', 'Add to Blacklist')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t('الرقم القومي', 'National ID')} <span className="text-destructive">*</span></label>
                  <input className={inputCls} required maxLength={14} value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t('نوع القائمة', 'List Type')} <span className="text-destructive">*</span></label>
                  <select className={inputCls} value={form.listType} onChange={e => setForm({ ...form, listType: e.target.value })}>
                    <option value="unfavorable">{t('غير مرغوب', 'Unfavorable')}</option>
                    <option value="terrorism">{t('إرهاب', 'Terrorism')}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('الاسم الكامل', 'Full Name')} <span className="text-destructive">*</span></label>
                <input className={inputCls} required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('السبب', 'Reason')}</label>
                <input className={inputCls} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('المصدر', 'Source')}</label>
                <input className={inputCls} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder={t('مثال: البنك المركزي', 'e.g. Central Bank')} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl hover:bg-secondary transition-colors">{t('إلغاء', 'Cancel')}</button>
                <button type="submit" disabled={addMutation.isPending} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50">
                  {addMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : t('إضافة', 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

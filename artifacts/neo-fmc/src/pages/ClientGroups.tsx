import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Users, Plus, X, Loader2, UserPlus, Trash2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const inputCls = "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

export default function ClientGroups() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addMemberDialog, setAddMemberDialog] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/client-groups'],
    queryFn: () => api.get<any>('/client-groups'),
  });

  const { data: clients } = useQuery({
    queryKey: ['/api/clients', clientSearch],
    queryFn: () => api.get<any>(`/clients?search=${clientSearch}&limit=10`),
    enabled: !!addMemberDialog && clientSearch.length >= 2,
  });

  const createGroup = useMutation({
    mutationFn: (data: any) => api.post('/client-groups', data),
    onSuccess: () => {
      toast({ title: t('تم إنشاء المجموعة', 'Group Created') });
      setShowCreate(false); setForm({});
      qc.invalidateQueries({ queryKey: ['/api/client-groups'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const addMember = useMutation({
    mutationFn: ({ groupId, clientId }: { groupId: string; clientId: string }) => api.post(`/client-groups/${groupId}/members`, { clientId }),
    onSuccess: () => {
      toast({ title: t('تمت إضافة العضو', 'Member Added') });
      setAddMemberDialog(null); setClientSearch('');
      qc.invalidateQueries({ queryKey: ['/api/client-groups'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: t('خطأ', 'Error'), description: err.message }),
  });

  const removeMember = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) => api.delete(`/client-groups/${groupId}/members/${memberId}`),
    onSuccess: () => {
      toast({ title: t('تم حذف العضو', 'Member Removed') });
      qc.invalidateQueries({ queryKey: ['/api/client-groups'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('مجموعات العملاء', 'Client Groups')}</h2>
          <p className="text-muted-foreground mt-1">{t('إدارة مجموعات الإقراض التضامني', 'Manage solidarity lending groups')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90">
          <Plus size={16} /> {t('مجموعة جديدة', 'New Group')}
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
      ) : data?.data?.length === 0 ? (
        <div className="premium-card p-12 text-center text-muted-foreground">
          <Users size={40} className="mx-auto mb-4 opacity-20" />
          {t('لا توجد مجموعات حتى الآن', 'No groups yet')}
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.data?.map((group: any) => (
            <div key={group.id} className="premium-card p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Users size={20} className="text-primary" /> {group.groupName}
                    {group.groupNameAr && <span className="text-muted-foreground text-sm">({group.groupNameAr})</span>}
                  </h3>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{t('الأعضاء', 'Members')}: {group.memberCount}/{group.maxMembers}</span>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", group.status === 'Active' ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-muted text-muted-foreground")}>{group.status}</span>
                    {group.leaderName && <span>{t('القائد', 'Leader')}: {group.leaderName}</span>}
                  </div>
                </div>
                <button onClick={() => setAddMemberDialog(group.id)} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-medium flex items-center gap-1.5 hover:bg-primary/30">
                  <UserPlus size={14} /> {t('إضافة عضو', 'Add Member')}
                </button>
              </div>

              {group.members?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {group.members.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 text-sm">
                      <span>{m.clientName || m.clientId?.slice(0, 8)}</span>
                      <span className="text-[10px] text-muted-foreground">{m.role}</span>
                      <button onClick={() => removeMember.mutate({ groupId: group.id, memberId: m.id })} className="text-red-400 hover:text-red-300 ml-1"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2"><Users size={18} className="text-primary" /> {t('مجموعة جديدة', 'New Group')}</h3>
              <button onClick={() => { setShowCreate(false); setForm({}); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('اسم المجموعة (إنجليزي)', 'Group Name (English)')} *</label>
                <input className={inputCls} value={form.groupName || ''} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('اسم المجموعة (عربي)', 'Group Name (Arabic)')}</label>
                <input className={inputCls} value={form.groupNameAr || ''} onChange={e => setForm(f => ({ ...f, groupNameAr: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('الحد الأقصى للأعضاء', 'Max Members')}</label>
                <input type="number" className={inputCls} value={form.maxMembers || '7'} onChange={e => setForm(f => ({ ...f, maxMembers: e.target.value }))} min={2} max={30} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
                <textarea className={inputCls + " h-16 resize-none"} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCreate(false); setForm({}); }} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary">{t('إلغاء', 'Cancel')}</button>
                <button
                  onClick={() => createGroup.mutate({ groupName: form.groupName, groupNameAr: form.groupNameAr, maxMembers: Number(form.maxMembers || 7), notes: form.notes })}
                  disabled={!form.groupName || createGroup.isPending}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground flex items-center gap-2"
                >
                  {createGroup.isPending && <Loader2 size={14} className="animate-spin" />}
                  {t('إنشاء', 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addMemberDialog && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2"><UserPlus size={18} className="text-primary" /> {t('إضافة عضو', 'Add Member')}</h3>
              <button onClick={() => { setAddMemberDialog(null); setClientSearch(''); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search size={16} className="absolute top-3 left-3 text-muted-foreground" />
                <input className={inputCls + " pl-9"} placeholder={t('ابحث بالاسم أو الرقم القومي...', 'Search by name or national ID...')} value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {clients?.data?.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => addMember.mutate({ groupId: addMemberDialog!, clientId: c.id })}
                    className="w-full text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <p className="font-medium">{c.fullNameAr}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.nationalId}</p>
                  </button>
                ))}
                {clientSearch.length >= 2 && (!clients?.data || clients.data.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('لا توجد نتائج', 'No results')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, handleApiError } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { MapPin, Plus, Loader2, Users, Clock, Eye } from 'lucide-react';

export default function OfficerCheckins() {
  const { t, isRtl } = useLanguage();
  const [checkins, setCheckins] = useState<any>({ data: [], total: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ latitude: '', longitude: '', visitType: 'Collection', notes: '', clientId: '' });
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, summaryData] = await Promise.all([
        api.get<any>('/officer-checkins'),
        api.get<any>('/officer-checkins/summary'),
      ]);
      setCheckins(data);
      setSummary(summaryData);
    } catch (err) { handleApiError(err); }
    setLoading(false);
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm({ ...form, latitude: pos.coords.latitude.toFixed(7), longitude: pos.coords.longitude.toFixed(7) });
          setGettingLocation(false);
        },
        () => { setGettingLocation(false); alert(t('تعذر الحصول على الموقع', 'Could not get location')); }
      );
    } else {
      setGettingLocation(false);
      alert(t('الموقع غير مدعوم', 'Geolocation not supported'));
    }
  };

  const handleCheckin = async () => {
    if (!form.latitude || !form.longitude) {
      alert(t('يرجى تحديد الموقع أولاً', 'Please get location first'));
      return;
    }
    try {
      await api.post('/officer-checkins', {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        visitType: form.visitType,
        notes: form.notes || undefined,
        clientId: form.clientId || undefined,
      });
      setShowForm(false);
      setForm({ latitude: '', longitude: '', visitType: 'Collection', notes: '', clientId: '' });
      loadData();
    } catch (err) { handleApiError(err); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin size={24} className="text-primary" /> {t('تسجيل الزيارات الميدانية', 'Field Visit Check-in')}</h2>
          <p className="text-muted-foreground mt-1">{t('تسجيل GPS للزيارات الميدانية', 'GPS check-in for field visits')}</p>
        </div>
        <button onClick={() => { setShowForm(true); getCurrentLocation(); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 font-medium">
          <Plus size={18} /> {t('تسجيل زيارة', 'Check In')}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="premium-card p-5 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{t('زيارات اليوم', 'Today\'s Visits')}</p>
              <h3 className="text-3xl font-bold mt-1">{summary.today?.totalCheckins || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><MapPin size={24} /></div>
          </div>
          <div className="premium-card p-5 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{t('ضباط نشطين', 'Active Officers')}</p>
              <h3 className="text-3xl font-bold mt-1">{summary.today?.uniqueOfficers || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent"><Users size={24} /></div>
          </div>
          <div className="premium-card p-5 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{t('عملاء تمت زيارتهم', 'Clients Visited')}</p>
              <h3 className="text-3xl font-bold mt-1">{summary.today?.uniqueClients || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600"><Eye size={24} /></div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="premium-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('تسجيل زيارة جديدة', 'New Check-in')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('خط العرض', 'Latitude')}</label>
              <input value={form.latitude} readOnly className="premium-input bg-muted" dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('خط الطول', 'Longitude')}</label>
              <input value={form.longitude} readOnly className="premium-input bg-muted" dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('نوع الزيارة', 'Visit Type')}</label>
              <select value={form.visitType} onChange={e => setForm({ ...form, visitType: e.target.value })} className="premium-input">
                <option value="Collection">{t('تحصيل', 'Collection')}</option>
                <option value="Verification">{t('تحقق', 'Verification')}</option>
                <option value="FollowUp">{t('متابعة', 'Follow-Up')}</option>
                <option value="Assessment">{t('تقييم', 'Assessment')}</option>
                <option value="Marketing">{t('تسويق', 'Marketing')}</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">{t('ملاحظات', 'Notes')}</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="premium-input" placeholder={t('ملاحظات...', 'Notes...')} />
            </div>
          </div>
          {gettingLocation && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> {t('جاري تحديد الموقع...', 'Getting location...')}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={handleCheckin} disabled={!form.latitude} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 font-medium shadow-lg shadow-primary/20 disabled:opacity-50">{t('تسجيل', 'Check In')}</button>
            <button onClick={() => getCurrentLocation()} className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 font-medium">{t('تحديث الموقع', 'Refresh Location')}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl hover:bg-secondary font-medium">{t('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "")}>{t('الضابط', 'Officer')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "")}>{t('العميل', 'Client')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "")}>{t('النوع', 'Type')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "")}>{t('الموقع', 'Location')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "")}>{t('التاريخ', 'Date')}</th>
                <th className={cn("px-4 py-3", isRtl ? "text-right" : "")}>{t('ملاحظات', 'Notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(checkins.data || []).map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.officerName || '-'}</td>
                  <td className="px-4 py-3">{c.clientName || '-'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">{c.visitType}</span></td>
                  <td className="px-4 py-3 text-xs font-mono">{c.latitude?.toFixed(5)}, {c.longitude?.toFixed(5)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.checkedInAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">{c.notes || '-'}</td>
                </tr>
              ))}
              {(!checkins.data || checkins.data.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground"><MapPin size={32} className="mx-auto mb-3 opacity-20" />{t('لا توجد زيارات', 'No check-ins yet')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

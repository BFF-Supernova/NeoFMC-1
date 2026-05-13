import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Download, Database, FileJson, Archive, Check } from 'lucide-react';

export default function DataExport() {
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const { data: entities } = useQuery({ queryKey: ['/data-export/entities'], queryFn: () => apiFetch('/data-export/entities') });

  const downloadEntity = async (key: string) => {
    setDownloading(key);
    try {
      const data = await apiFetch(`/data-export/download/${key}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${key}_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      setDownloaded(prev => new Set(prev).add(key));
      toast({ title: t('تم التنزيل', 'Downloaded'), description: `${data.recordCount} ${t('سجل', 'records')}` });
    } catch { toast({ title: t('خطأ', 'Error'), variant: 'destructive' }); }
    setDownloading(null);
  };

  const downloadFullBackup = async () => {
    setDownloading('full');
    try {
      const data = await apiFetch('/data-export/full-backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `full_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast({ title: t('تم تنزيل النسخة الاحتياطية الكاملة', 'Full backup downloaded') });
    } catch { toast({ title: t('خطأ', 'Error'), variant: 'destructive' }); }
    setDownloading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            {t('تصدير البيانات', 'Data Export')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('تصدير بيانات المؤسسة ونسخ احتياطي', 'Export institution data and backups')}</p>
        </div>
        <button onClick={downloadFullBackup} disabled={downloading === 'full'} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
          <Archive className="h-4 w-4" />{downloading === 'full' ? t('جاري التنزيل...', 'Downloading...') : t('نسخة احتياطية كاملة', 'Full Backup')}
        </button>
      </div>

      <div className="premium-card p-4">
        <p className="text-sm text-muted-foreground mb-4">{t('اختر الكيانات التي تريد تصديرها. يتم التصدير بصيغة JSON.', 'Select entities to export. Data is exported in JSON format.')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entities?.entities?.map((entity: any) => (
            <button key={entity.key} onClick={() => downloadEntity(entity.key)} disabled={downloading === entity.key} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors text-start disabled:opacity-50">
              <div className="flex items-center gap-3">
                <FileJson className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium text-sm">{isRtl ? entity.nameAr : entity.nameEn}</div>
                  <div className="text-xs text-muted-foreground">{entity.key}</div>
                </div>
              </div>
              {downloading === entity.key ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              ) : downloaded.has(entity.key) ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="premium-card p-4">
        <h3 className="font-semibold mb-2">{t('ملاحظات هامة', 'Important Notes')}</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>{t('يتم تصدير البيانات الخاصة بمؤسستك فقط', 'Only your institution\'s data is exported')}</li>
          <li>{t('تتم مراجعة التصدير في سجل التدقيق', 'Exports are logged in the audit trail')}</li>
          <li>{t('الملفات بصيغة JSON يمكن استيرادها لاحقاً', 'JSON files can be re-imported later')}</li>
          <li>{t('لا يتضمن التصدير كلمات مرور المستخدمين', 'Exports do not include user passwords')}</li>
        </ul>
      </div>
    </div>
  );
}

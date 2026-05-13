import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, FileText, BarChart3, RefreshCcw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function EmailNotifications() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'history' | 'stats'>('send');
  const [sendForm, setSendForm] = useState({ to: '', subject: '', body: '', templateName: '' });

  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/email-notifications/templates'],
    queryFn: () => api.get<any[]>('/email-notifications/templates'),
  });

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/email-notifications/history'],
    queryFn: () => api.get<any[]>('/email-notifications/history'),
    enabled: activeTab === 'history',
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/email-notifications/stats'],
    queryFn: () => api.get<any>('/email-notifications/stats'),
    enabled: activeTab === 'stats',
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/email-notifications/templates/seed-defaults', {}),
    onSuccess: () => {
      toast({ title: t('تم إنشاء القوالب الافتراضية', 'Default templates created') });
      refetchTemplates();
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => api.post('/email-notifications/send', data),
    onSuccess: (result: any) => {
      if (result.success) {
        toast({ title: t('تم إرسال البريد', 'Email sent successfully') });
      } else {
        toast({ title: t('فشل الإرسال', 'Send failed'), description: result.error, variant: 'destructive' });
      }
      setSendForm({ to: '', subject: '', body: '', templateName: '' });
    },
  });

  const tabs = [
    { key: 'send' as const, icon: Send, label: t('إرسال', 'Send Email') },
    { key: 'templates' as const, icon: FileText, label: t('القوالب', 'Templates') },
    { key: 'history' as const, icon: Clock, label: t('السجل', 'History') },
    { key: 'stats' as const, icon: BarChart3, label: t('الإحصائيات', 'Statistics') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          {t('إشعارات البريد الإلكتروني', 'Email Notifications')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('إدارة وإرسال إشعارات البريد الإلكتروني', 'Manage and send email notifications')}</p>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'send' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('إرسال بريد إلكتروني', 'Send Email')}</CardTitle>
            <CardDescription>{t('أرسل بريد مباشر أو استخدم قالب', 'Send a direct email or use a template')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('القالب (اختياري)', 'Template (optional)')}</Label>
              <Select value={sendForm.templateName} onValueChange={(v) => setSendForm(prev => ({ ...prev, templateName: v }))}>
                <SelectTrigger><SelectValue placeholder={t('اختر قالب...', 'Select template...')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('بدون قالب', 'No template')}</SelectItem>
                  {templates?.map((tmpl: any) => (
                    <SelectItem key={tmpl.id} value={tmpl.templateName}>{tmpl.templateName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('إلى', 'To')}</Label>
              <Input value={sendForm.to} onChange={e => setSendForm(prev => ({ ...prev, to: e.target.value }))} placeholder="email@example.com" />
            </div>
            {(!sendForm.templateName || sendForm.templateName === 'none') && (
              <>
                <div className="space-y-2">
                  <Label>{t('الموضوع', 'Subject')}</Label>
                  <Input value={sendForm.subject} onChange={e => setSendForm(prev => ({ ...prev, subject: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('المحتوى', 'Body')}</Label>
                  <Textarea value={sendForm.body} onChange={e => setSendForm(prev => ({ ...prev, body: e.target.value }))} rows={6} />
                </div>
              </>
            )}
            <Button
              onClick={() => sendMutation.mutate(sendForm.templateName && sendForm.templateName !== 'none'
                ? { to: sendForm.to, templateName: sendForm.templateName, variables: {} }
                : { to: sendForm.to, subject: sendForm.subject, body: sendForm.body }
              )}
              disabled={sendMutation.isPending || !sendForm.to}
            >
              <Send className="h-4 w-4 mr-2" />
              {t('إرسال', 'Send')}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t('قوالب البريد', 'Email Templates')}</h2>
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              {t('إنشاء القوالب الافتراضية', 'Seed Default Templates')}
            </Button>
          </div>
          {!templates?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              {t('لا توجد قوالب. انقر "إنشاء القوالب الافتراضية" للبدء.', 'No templates. Click "Seed Default Templates" to get started.')}
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((tmpl: any) => (
                <Card key={tmpl.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tmpl.templateName}</CardTitle>
                      <Badge variant={tmpl.isActive ? 'default' : 'secondary'}>{tmpl.isActive ? t('نشط', 'Active') : t('معطل', 'Inactive')}</Badge>
                    </div>
                    <CardDescription>{tmpl.channel} &middot; {tmpl.templateType}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{tmpl.subject || t('بدون موضوع', 'No subject')}</p>
                    {tmpl.variables?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tmpl.variables.map((v: string) => (
                          <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t('سجل الإشعارات', 'Notification History')}</h2>
            <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
              <RefreshCcw className="h-4 w-4 mr-2" />{t('تحديث', 'Refresh')}
            </Button>
          </div>
          {!history?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              {t('لا توجد إشعارات مرسلة', 'No notifications sent yet')}
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {history.map((n: any) => (
                <Card key={n.id}>
                  <CardContent className="py-3 flex items-center gap-4">
                    {n.status === 'Sent' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                     n.status === 'Failed' ? <XCircle className="h-5 w-5 text-red-500" /> :
                     <AlertCircle className="h-5 w-5 text-yellow-500" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{n.recipientContact}</span>
                        <Badge variant="outline" className="text-xs">{n.channel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{n.subject || n.body?.substring(0, 60)}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">{t('إجمالي الإشعارات', 'Total Notifications')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <p className="text-sm text-muted-foreground">{t('مرسل', 'Sent')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-sm text-muted-foreground">{t('فشل', 'Failed')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.emailCount}</div>
              <p className="text-sm text-muted-foreground">{t('بريد إلكتروني', 'Emails')}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

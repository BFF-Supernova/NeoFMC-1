import { db, smsNotificationsTable } from "@workspace/db";

const SMS_PROVIDER = process.env.SMS_PROVIDER || "";
const SMS_API_KEY = process.env.SMS_API_KEY || "";
const SMS_API_SECRET = process.env.SMS_API_SECRET || "";
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || "NeoFMC";
const SMS_BASE_URL = process.env.SMS_BASE_URL || "";

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const SMS_TEMPLATES: Record<string, { en: string; ar: string }> = {
  payment_reminder: {
    en: "Dear {{clientName}}, your installment of {{amount}} EGP is due on {{dueDate}}. Please ensure timely payment. - Neo FMC",
    ar: "عزيزي {{clientName}}، قسطك بمبلغ {{amount}} جنيه مستحق في {{dueDate}}. يرجى السداد في الموعد. - نيو FMC",
  },
  payment_received: {
    en: "Dear {{clientName}}, we received your payment of {{amount}} EGP on {{date}}. Thank you. - Neo FMC",
    ar: "عزيزي {{clientName}}، تم استلام دفعتك بمبلغ {{amount}} جنيه بتاريخ {{date}}. شكراً لك. - نيو FMC",
  },
  overdue_notice: {
    en: "Dear {{clientName}}, your installment of {{amount}} EGP was due on {{dueDate}} and is now {{daysOverdue}} days overdue. Please pay immediately. - Neo FMC",
    ar: "عزيزي {{clientName}}، قسطك بمبلغ {{amount}} جنيه كان مستحقاً في {{dueDate}} وهو متأخر {{daysOverdue}} يوم. يرجى السداد فوراً. - نيو FMC",
  },
  loan_approved: {
    en: "Dear {{clientName}}, your loan application for {{amount}} EGP has been approved. Please visit your branch for disbursement. - Neo FMC",
    ar: "عزيزي {{clientName}}، تمت الموافقة على طلب التمويل الخاص بك بمبلغ {{amount}} جنيه. يرجى زيارة الفرع للصرف. - نيو FMC",
  },
  welcome: {
    en: "Welcome to Neo FMC, {{clientName}}! Your account has been created. - Neo FMC",
    ar: "مرحباً بك في نيو FMC، {{clientName}}! تم إنشاء حسابك. - نيو FMC",
  },
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsResult> {
  try {
    const accountSid = SMS_API_KEY;
    const authToken = SMS_API_SECRET;
    const from = SMS_SENDER_ID;
    const body = new URLSearchParams({ To: phone, From: from, Body: message });
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const data = await resp.json() as any;
    if (resp.ok) return { success: true, messageId: data.sid };
    return { success: false, error: data.message || "Twilio error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendViaVodafone(phone: string, message: string): Promise<SmsResult> {
  try {
    const resp = await fetch(`${SMS_BASE_URL}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SMS_API_KEY}` },
      body: JSON.stringify({ to: phone, message, sender: SMS_SENDER_ID }),
    });
    const data = await resp.json() as any;
    if (resp.ok) return { success: true, messageId: data.messageId || data.id };
    return { success: false, error: data.error || "Provider error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendViaGeneric(phone: string, message: string): Promise<SmsResult> {
  try {
    const resp = await fetch(`${SMS_BASE_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SMS_API_KEY}` },
      body: JSON.stringify({ to: phone, message, sender_id: SMS_SENDER_ID }),
    });
    const data = await resp.json() as any;
    if (resp.ok) return { success: true, messageId: data.id || data.message_id };
    return { success: false, error: data.error || data.message || "Provider error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendSmsViaProvider(phone: string, message: string): Promise<SmsResult> {
  if (!SMS_PROVIDER) {
    return { success: false, error: "SMS provider not configured. Set SMS_PROVIDER env var." };
  }

  switch (SMS_PROVIDER.toLowerCase()) {
    case "twilio": return sendViaTwilio(phone, message);
    case "vodafone": return sendViaVodafone(phone, message);
    default: return sendViaGeneric(phone, message);
  }
}

export async function sendSms(
  tenantId: string,
  phone: string,
  message: string,
  opts?: { templateKey?: string; createdById?: string }
): Promise<{ success: boolean; notificationId: string; error?: string }> {
  const result = await sendSmsViaProvider(phone, message);

  const [notification] = await db.insert(smsNotificationsTable).values({
    tenantId,
    recipientPhone: phone,
    message,
    templateKey: opts?.templateKey || null,
    status: result.success ? "Sent" : "Failed",
    provider: SMS_PROVIDER || "none",
    providerMessageId: result.messageId || null,
    errorMessage: result.error || null,
    sentAt: result.success ? new Date() : null,
    createdById: opts?.createdById || null,
  }).returning();

  return { success: result.success, notificationId: notification.id, error: result.error };
}

export async function sendTemplateSms(
  tenantId: string,
  phone: string,
  templateKey: string,
  variables: Record<string, string>,
  language: "en" | "ar" = "ar",
  createdById?: string
): Promise<{ success: boolean; notificationId: string; error?: string }> {
  const template = SMS_TEMPLATES[templateKey];
  if (!template) return { success: false, notificationId: "", error: `Unknown template: ${templateKey}` };

  const message = interpolate(template[language], variables);
  return sendSms(tenantId, phone, message, { templateKey, createdById });
}

export async function sendBatchSms(
  tenantId: string,
  recipients: Array<{ phone: string; message: string; templateKey?: string }>,
  createdById?: string
): Promise<{ sent: number; failed: number; results: Array<{ phone: string; success: boolean; error?: string }> }> {
  let sent = 0, failed = 0;
  const results: Array<{ phone: string; success: boolean; error?: string }> = [];

  for (const r of recipients) {
    const result = await sendSms(tenantId, r.phone, r.message, { templateKey: r.templateKey, createdById });
    if (result.success) sent++;
    else failed++;
    results.push({ phone: r.phone, success: result.success, error: result.error });
  }

  return { sent, failed, results };
}

export function getSmsTemplates() {
  return Object.entries(SMS_TEMPLATES).map(([key, t]) => ({
    key,
    previewEn: t.en,
    previewAr: t.ar,
  }));
}

export function isConfigured(): boolean {
  return !!SMS_PROVIDER;
}

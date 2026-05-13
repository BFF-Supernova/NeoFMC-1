import nodemailer from "nodemailer";
import { db, notificationsTable, notificationTemplatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

const defaultConfig: EmailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || "noreply@neofmc.com",
};

function createTransporter(config: EmailConfig = defaultConfig) {
  if (!config.user || !config.pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
}

export async function sendEmail(params: {
  tenantId: string;
  to: string;
  subject: string;
  body: string;
  recipientType?: string;
  recipientId?: string;
  templateId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter();

  const [notification] = await db.insert(notificationsTable).values({
    tenantId: params.tenantId,
    templateId: params.templateId || null,
    channel: "Email",
    recipientType: params.recipientType || "User",
    recipientId: params.recipientId || null,
    recipientContact: params.to,
    subject: params.subject,
    body: params.body,
    status: "Pending",
  }).returning();

  if (!transporter) {
    await db.update(notificationsTable)
      .set({ status: "Failed", failureReason: "SMTP not configured" })
      .where(eq(notificationsTable.id, notification.id));
    return { success: false, error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables." };
  }

  try {
    await transporter.sendMail({
      from: defaultConfig.from,
      to: params.to,
      subject: params.subject,
      html: params.body,
    });

    await db.update(notificationsTable)
      .set({ status: "Sent", sentAt: new Date() })
      .where(eq(notificationsTable.id, notification.id));

    return { success: true };
  } catch (err: any) {
    await db.update(notificationsTable)
      .set({ status: "Failed", failureReason: err.message })
      .where(eq(notificationsTable.id, notification.id));
    return { success: false, error: err.message };
  }
}

export async function sendTemplatedEmail(params: {
  tenantId: string;
  templateName: string;
  to: string;
  variables: Record<string, string>;
  recipientType?: string;
  recipientId?: string;
  language?: "en" | "ar";
}): Promise<{ success: boolean; error?: string }> {
  const [template] = await db.select()
    .from(notificationTemplatesTable)
    .where(
      and(
        eq(notificationTemplatesTable.tenantId, params.tenantId),
        eq(notificationTemplatesTable.templateName, params.templateName),
        eq(notificationTemplatesTable.isActive, true),
      )
    )
    .limit(1);

  if (!template) {
    return { success: false, error: `Template '${params.templateName}' not found` };
  }

  const bodyTemplate = params.language === "ar" && template.bodyTemplateAr
    ? template.bodyTemplateAr
    : template.bodyTemplate;

  const subject = template.subject
    ? interpolateTemplate(template.subject, params.variables)
    : params.templateName;
  const body = interpolateTemplate(bodyTemplate, params.variables);

  return sendEmail({
    tenantId: params.tenantId,
    to: params.to,
    subject,
    body,
    recipientType: params.recipientType,
    recipientId: params.recipientId,
    templateId: template.id,
  });
}

export async function sendBatchEmails(params: {
  tenantId: string;
  recipients: Array<{ to: string; variables: Record<string, string>; recipientId?: string }>;
  templateName: string;
  recipientType?: string;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of params.recipients) {
    const result = await sendTemplatedEmail({
      tenantId: params.tenantId,
      templateName: params.templateName,
      to: recipient.to,
      variables: recipient.variables,
      recipientType: params.recipientType,
      recipientId: recipient.recipientId,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(`${recipient.to}: ${result.error}`);
    }
  }

  return { sent, failed, errors };
}

export const EMAIL_TEMPLATES = {
  PAYMENT_REMINDER: {
    name: "payment_reminder",
    subject: "Payment Reminder - Installment Due",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Reminder</h2>
      <p>Dear {{clientName}},</p>
      <p>This is a reminder that your installment of <strong>EGP {{amount}}</strong> is due on <strong>{{dueDate}}</strong>.</p>
      <p>Loan ID: {{loanId}}</p>
      <p>Please ensure timely payment to avoid any late fees.</p>
      <p>Best regards,<br/>{{companyName}}</p>
    </div>`,
    bodyAr: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
      <h2>تذكير بالدفع</h2>
      <p>عزيزي/عزيزتي {{clientName}},</p>
      <p>نذكرك بأن القسط المستحق بقيمة <strong>{{amount}} جنيه</strong> يستحق في <strong>{{dueDate}}</strong>.</p>
      <p>رقم القرض: {{loanId}}</p>
      <p>يرجى الدفع في الموعد لتجنب أي رسوم تأخير.</p>
      <p>مع تحيات،<br/>{{companyName}}</p>
    </div>`,
    variables: ["clientName", "amount", "dueDate", "loanId", "companyName"],
  },
  LOAN_APPROVAL: {
    name: "loan_approval",
    subject: "Loan Application Approved",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Loan Approved</h2>
      <p>Dear {{clientName}},</p>
      <p>We are pleased to inform you that your loan application for <strong>EGP {{amount}}</strong> has been approved.</p>
      <p>Term: {{termMonths}} months</p>
      <p>Please visit your nearest branch to complete the disbursement process.</p>
      <p>Best regards,<br/>{{companyName}}</p>
    </div>`,
    bodyAr: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
      <h2>تمت الموافقة على القرض</h2>
      <p>عزيزي/عزيزتي {{clientName}},</p>
      <p>يسعدنا إبلاغك بالموافقة على طلب القرض الخاص بك بقيمة <strong>{{amount}} جنيه</strong>.</p>
      <p>المدة: {{termMonths}} شهر</p>
      <p>يرجى زيارة أقرب فرع لاستكمال إجراءات الصرف.</p>
      <p>مع تحيات،<br/>{{companyName}}</p>
    </div>`,
    variables: ["clientName", "amount", "termMonths", "companyName"],
  },
  OVERDUE_NOTICE: {
    name: "overdue_notice",
    subject: "Overdue Payment Notice",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e53e3e;">Overdue Payment Notice</h2>
      <p>Dear {{clientName}},</p>
      <p>Your installment of <strong>EGP {{amount}}</strong> was due on <strong>{{dueDate}}</strong> and is now <strong>{{daysOverdue}} days overdue</strong>.</p>
      <p>Outstanding balance: EGP {{outstandingBalance}}</p>
      <p>Late fees may apply. Please make your payment as soon as possible.</p>
      <p>Best regards,<br/>{{companyName}}</p>
    </div>`,
    bodyAr: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
      <h2 style="color: #e53e3e;">إشعار تأخر الدفع</h2>
      <p>عزيزي/عزيزتي {{clientName}},</p>
      <p>القسط المستحق بقيمة <strong>{{amount}} جنيه</strong> كان مستحقاً في <strong>{{dueDate}}</strong> وهو متأخر بـ <strong>{{daysOverdue}} يوم</strong>.</p>
      <p>الرصيد المستحق: {{outstandingBalance}} جنيه</p>
      <p>قد تُطبق رسوم تأخير. يرجى السداد في أقرب وقت.</p>
      <p>مع تحيات،<br/>{{companyName}}</p>
    </div>`,
    variables: ["clientName", "amount", "dueDate", "daysOverdue", "outstandingBalance", "companyName"],
  },
  WELCOME: {
    name: "welcome",
    subject: "Welcome to {{companyName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome!</h2>
      <p>Dear {{clientName}},</p>
      <p>Welcome to <strong>{{companyName}}</strong>. Your account has been created successfully.</p>
      <p>Your Client ID: {{clientId}}</p>
      <p>We look forward to serving you.</p>
      <p>Best regards,<br/>{{companyName}}</p>
    </div>`,
    bodyAr: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
      <h2>مرحباً!</h2>
      <p>عزيزي/عزيزتي {{clientName}},</p>
      <p>مرحباً بك في <strong>{{companyName}}</strong>. تم إنشاء حسابك بنجاح.</p>
      <p>رقم العميل: {{clientId}}</p>
      <p>نتطلع لخدمتك.</p>
      <p>مع تحيات،<br/>{{companyName}}</p>
    </div>`,
    variables: ["clientName", "clientId", "companyName"],
  },
};

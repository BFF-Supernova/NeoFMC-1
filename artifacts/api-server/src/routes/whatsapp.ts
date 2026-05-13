import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleWhatsApp"));

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0";
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function sendWhatsAppMessage(to: string, template: string, params: string[], lang = "ar"): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return { success: false, error: "WhatsApp Business API not configured" };
  }
  try {
    const resp = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.startsWith("+") ? to.slice(1) : (to.startsWith("0") ? "2" + to : to),
        type: "template",
        template: {
          name: template,
          language: { code: lang === "ar" ? "ar" : "en" },
          components: params.length > 0 ? [{ type: "body", parameters: params.map(p => ({ type: "text", text: p })) }] : [],
        },
      }),
    });
    const data = await resp.json() as any;
    if (data.messages?.[0]?.id) return { success: true, messageId: data.messages[0].id };
    return { success: false, error: data.error?.message || "Unknown error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

router.get("/templates", async (_req, res) => {
  const templates = [
    { id: "payment_reminder", nameAr: "تذكير بالسداد", nameEn: "Payment Reminder", params: ["clientName", "amount", "dueDate"] },
    { id: "overdue_notice", nameAr: "إشعار تأخر", nameEn: "Overdue Notice", params: ["clientName", "amount", "daysOverdue"] },
    { id: "loan_approved", nameAr: "قبول طلب التمويل", nameEn: "Loan Approved", params: ["clientName", "amount"] },
    { id: "payment_received", nameAr: "تأكيد استلام الدفعة", nameEn: "Payment Received", params: ["clientName", "amount", "receiptNumber"] },
    { id: "collection_followup", nameAr: "متابعة تحصيل", nameEn: "Collection Follow-up", params: ["clientName", "outstandingAmount"] },
    { id: "account_statement", nameAr: "كشف حساب", nameEn: "Account Statement", params: ["clientName", "period"] },
  ];
  res.json(templates);
});

router.post("/send", requireRole("TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { phone, templateId, params, clientId, lang } = req.body;

    if (!phone || !templateId) {
      res.status(400).json({ error: "phone and templateId are required" });
      return;
    }

    const result = await sendWhatsAppMessage(phone, templateId, params || [], lang || "ar");

    await db.execute(sql`
      INSERT INTO whatsapp_messages (tenant_id, phone, template_id, params, client_id, status, message_id, error, sent_by)
      VALUES (${tenantId}::uuid, ${phone}, ${templateId}, ${JSON.stringify(params || [])}::jsonb, ${clientId ? sql`${clientId}::uuid` : sql`NULL`}, ${result.success ? 'sent' : 'failed'}, ${result.messageId || null}, ${result.error || null}, ${req.user!.id}::uuid)
    `);

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "whatsapp_message_sent", entity: "whatsapp_message", details: { phone: phone.slice(0, 3) + "****", templateId, success: result.success } });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/send-bulk-reminders", requireRole("TenantAdmin", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { daysBeforeDue, templateId } = req.body;
    const days = daysBeforeDue || 3;

    const result = await db.execute(sql`
      SELECT i.id, i.due_date, i.total_amount, i.paid_amount, c.full_name_ar, c.phone, c.id as client_id
      FROM installments i JOIN loans l ON i.loan_id = l.id JOIN clients c ON l.client_id = c.id
      WHERE l.tenant_id = ${tenantId}::uuid AND i.status IN ('Pending', 'PartiallyPaid')
        AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + make_interval(days => ${days})
        AND c.phone IS NOT NULL
      ORDER BY i.due_date ASC LIMIT 500
    `);

    let sent = 0, failed = 0;
    for (const row of result.rows as any[]) {
      const remaining = Number(row.total_amount) - Number(row.paid_amount);
      const sendResult = await sendWhatsAppMessage(row.phone, templateId || "payment_reminder", [row.full_name_ar, remaining.toFixed(2), new Date(row.due_date).toLocaleDateString("ar-EG")]);
      if (sendResult.success) sent++; else failed++;
    }

    res.json({ total: result.rows.length, sent, failed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`
      SELECT wm.*, c.full_name_ar as client_name FROM whatsapp_messages wm
      LEFT JOIN clients c ON wm.client_id = c.id
      WHERE wm.tenant_id = ${tenantId}::uuid ORDER BY wm.created_at DESC LIMIT 500
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

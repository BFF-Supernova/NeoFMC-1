import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";

const router = Router();

router.use(requireAuth, requireModule("moduleNLPReporting"));

router.post("/generate-summary", requireRole("TenantAdmin", "CFO", "FinancialController", "BranchManager", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { period, lang } = req.body;
    const language = lang || "ar";

    const kpiResult = await db.execute(sql`
      SELECT
        COUNT(DISTINCT l.id) as active_loans,
        COALESCE(SUM(l.outstanding_balance), 0) as total_outstanding,
        COALESCE(SUM(l.disbursed_amount), 0) as total_disbursed,
        COUNT(DISTINCT c.id) as total_clients
      FROM loans l JOIN clients c ON l.client_id = c.id
      WHERE l.tenant_id = ${tenantId}::uuid AND l.status = 'Active'
    `);

    const collectionResult = await db.execute(sql`
      SELECT COALESCE(SUM(p.amount), 0) as collected_amount, COUNT(p.id) as payment_count
      FROM payments p JOIN loans l ON p.loan_id = l.id
      WHERE l.tenant_id = ${tenantId}::uuid AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const overdueResult = await db.execute(sql`
      SELECT COUNT(*) as overdue_count, COALESCE(SUM(i.total_amount - i.paid_amount), 0) as overdue_amount
      FROM installments i JOIN loans l ON i.loan_id = l.id
      WHERE l.tenant_id = ${tenantId}::uuid AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < CURRENT_DATE
    `);

    const kpi = kpiResult.rows[0] as any;
    const collection = collectionResult.rows[0] as any;
    const overdue = overdueResult.rows[0] as any;

    const activeLoans = Number(kpi.active_loans);
    const totalOutstanding = Number(kpi.total_outstanding);
    const collectedAmount = Number(collection.collected_amount);
    const overdueAmount = Number(overdue.overdue_amount);
    const overdueCount = Number(overdue.overdue_count);
    const parRatio = totalOutstanding > 0 ? (overdueAmount / totalOutstanding * 100) : 0;

    let narrative: string;
    if (language === "ar") {
      narrative = `## ملخص أداء المحفظة\n\n`;
      narrative += `### نظرة عامة\n`;
      narrative += `- عدد القروض النشطة: **${activeLoans.toLocaleString("ar-EG")}** قرض\n`;
      narrative += `- إجمالي الرصيد القائم: **${totalOutstanding.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}** جنيه مصري\n`;
      narrative += `- عدد العملاء: **${Number(kpi.total_clients).toLocaleString("ar-EG")}** عميل\n\n`;
      narrative += `### التحصيل (آخر 30 يوم)\n`;
      narrative += `- المبلغ المحصل: **${collectedAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}** جنيه مصري\n`;
      narrative += `- عدد المدفوعات: **${Number(collection.payment_count).toLocaleString("ar-EG")}** دفعة\n\n`;
      narrative += `### المخاطر\n`;
      narrative += `- نسبة المحفظة المعرضة للخطر (PAR): **${parRatio.toFixed(2)}%**\n`;
      narrative += `- عدد الأقساط المتأخرة: **${overdueCount.toLocaleString("ar-EG")}** قسط\n`;
      narrative += `- إجمالي المبالغ المتأخرة: **${overdueAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}** جنيه مصري\n\n`;

      if (parRatio > 10) narrative += `> ⚠️ **تحذير:** نسبة PAR تتجاوز 10% — يُوصى بمراجعة سياسات التحصيل فوراً\n\n`;
      else if (parRatio > 5) narrative += `> ℹ️ نسبة PAR في النطاق المقبول لكن تحتاج مراقبة مستمرة\n\n`;
      else narrative += `> ✅ نسبة PAR ممتازة — المحفظة في وضع صحي\n\n`;
    } else {
      narrative = `## Portfolio Performance Summary\n\n`;
      narrative += `### Overview\n`;
      narrative += `- Active Loans: **${activeLoans.toLocaleString()}**\n`;
      narrative += `- Total Outstanding: **EGP ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}**\n`;
      narrative += `- Total Clients: **${Number(kpi.total_clients).toLocaleString()}**\n\n`;
      narrative += `### Collections (Last 30 Days)\n`;
      narrative += `- Collected: **EGP ${collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}**\n`;
      narrative += `- Payments: **${Number(collection.payment_count).toLocaleString()}**\n\n`;
      narrative += `### Risk\n`;
      narrative += `- PAR Ratio: **${parRatio.toFixed(2)}%**\n`;
      narrative += `- Overdue Installments: **${overdueCount.toLocaleString()}**\n`;
      narrative += `- Overdue Amount: **EGP ${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}**\n\n`;

      if (parRatio > 10) narrative += `> ⚠️ **Warning:** PAR exceeds 10% — immediate review of collection policies recommended\n\n`;
      else if (parRatio > 5) narrative += `> ℹ️ PAR within acceptable range but requires continuous monitoring\n\n`;
      else narrative += `> ✅ Excellent PAR ratio — portfolio in healthy condition\n\n`;
    }

    res.json({ narrative, data: { activeLoans, totalOutstanding, collectedAmount, overdueAmount, overdueCount, parRatio: Math.round(parRatio * 100) / 100 }, generatedAt: new Date().toISOString(), language });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

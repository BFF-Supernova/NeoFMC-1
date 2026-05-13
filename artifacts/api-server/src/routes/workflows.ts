import { Router } from "express";
import { db, customWorkflowsTable, workflowStepsTable, workflowInstancesTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/entity-types", requireAuth, async (_req, res) => {
  res.json([
    { key: "LoanRequest", nameEn: "Loan Request", nameAr: "طلب القرض" },
    { key: "LoanDisbursement", nameEn: "Loan Disbursement", nameAr: "صرف القرض" },
    { key: "Payment", nameEn: "Payment Collection", nameAr: "تحصيل الأقساط" },
    { key: "Expense", nameEn: "Expense", nameAr: "المصروفات" },
    { key: "Settlement", nameEn: "Early Settlement", nameAr: "التسوية المبكرة" },
    { key: "WriteOff", nameEn: "Write-Off", nameAr: "شطب الديون" },
    { key: "Reschedule", nameEn: "Loan Reschedule", nameAr: "إعادة الجدولة" },
    { key: "BranchRequest", nameEn: "Branch Request", nameAr: "طلب الفرع" },
    { key: "PortfolioTransfer", nameEn: "Portfolio Transfer", nameAr: "نقل المحفظة" },
    { key: "Cheque", nameEn: "Cheque Processing", nameAr: "معالجة الشيكات" },
    { key: "WireTransfer", nameEn: "Wire Transfer", nameAr: "التحويل البنكي" },
    { key: "CashSettlement", nameEn: "Cash Settlement", nameAr: "التسوية النقدية" },
    { key: "ClientOnboarding", nameEn: "Client Onboarding", nameAr: "تسجيل العملاء" },
    { key: "Guarantee", nameEn: "Guarantee", nameAr: "الضمانات" },
    { key: "JournalEntry", nameEn: "Journal Entry", nameAr: "قيد يومية" },
    { key: "CreditLimit", nameEn: "Credit Limit Change", nameAr: "تغيير الحد الائتماني" },
    { key: "FeeWaiver", nameEn: "Fee Waiver", nameAr: "إعفاء الرسوم" },
    { key: "Blacklist", nameEn: "Blacklist Action", nameAr: "إجراء القوائم السوداء" },
    { key: "DailyClosing", nameEn: "Daily Closing", nameAr: "الإقفال اليومي" },
  ]);
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const entityType = req.query.entityType as string | undefined;

    let whereClause = eq(customWorkflowsTable.tenantId, tenantId);
    if (entityType) whereClause = and(whereClause, eq(customWorkflowsTable.entityType, entityType)) as typeof whereClause;

    const workflows = await db.select().from(customWorkflowsTable).where(whereClause).orderBy(desc(customWorkflowsTable.createdAt));
    res.json(workflows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [workflow] = await db.select().from(customWorkflowsTable)
      .where(and(eq(customWorkflowsTable.id, req.params.id), eq(customWorkflowsTable.tenantId, tenantId))).limit(1);
    if (!workflow) { res.status(404).json({ error: "not_found" }); return; }

    const steps = await db.select().from(workflowStepsTable)
      .where(and(eq(workflowStepsTable.workflowId, workflow.id), eq(workflowStepsTable.tenantId, tenantId)))
      .orderBy(asc(workflowStepsTable.stepOrder));

    res.json({ ...workflow, steps });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { workflowName, workflowNameAr, description, entityType, steps } = req.body;
    if (!workflowName || !entityType) {
      res.status(400).json({ error: "bad_request", message: "workflowName, entityType required" });
      return;
    }

    const [workflow] = await db.insert(customWorkflowsTable).values({
      tenantId, workflowName, workflowNameAr, description, entityType,
    }).returning();

    const createdSteps = [];
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        const [created] = await db.insert(workflowStepsTable).values({
          tenantId, workflowId: workflow.id,
          stepName: step.stepName,
          stepNameAr: step.stepNameAr,
          stepOrder: step.stepOrder,
          allowedRoles: step.allowedRoles || null,
          allowedActions: step.allowedActions || null,
          viewableFields: step.viewableFields || null,
          editableFields: step.editableFields || null,
          requiredFields: step.requiredFields || null,
          autoTransitionTo: step.autoTransitionTo || null,
          conditions: step.conditions || null,
          disbursementType: step.disbursementType || null,
          isTerminal: step.isTerminal || false,
        }).returning();
        createdSteps.push(created);
      }
    }

    res.status(201).json({ ...workflow, steps: createdSteps });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { workflowName, workflowNameAr, description, isActive } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (workflowName !== undefined) updateData.workflowName = workflowName;
    if (workflowNameAr !== undefined) updateData.workflowNameAr = workflowNameAr;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db.update(customWorkflowsTable).set(updateData)
      .where(and(eq(customWorkflowsTable.id, req.params.id), eq(customWorkflowsTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/steps", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [workflow] = await db.select().from(customWorkflowsTable)
      .where(and(eq(customWorkflowsTable.id, req.params.id), eq(customWorkflowsTable.tenantId, tenantId))).limit(1);
    if (!workflow) { res.status(404).json({ error: "not_found" }); return; }

    const { stepName, stepNameAr, stepOrder, allowedRoles, allowedActions, viewableFields, editableFields, requiredFields, autoTransitionTo, conditions, disbursementType, isTerminal } = req.body;
    if (!stepName || stepOrder === undefined) {
      res.status(400).json({ error: "bad_request", message: "stepName, stepOrder required" });
      return;
    }

    const [step] = await db.insert(workflowStepsTable).values({
      tenantId, workflowId: workflow.id, stepName, stepNameAr,
      stepOrder, allowedRoles, allowedActions, viewableFields, editableFields,
      requiredFields, autoTransitionTo, conditions, disbursementType, isTerminal: isTerminal || false,
    }).returning();

    res.status(201).json(step);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/steps/:stepId", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const updateData: Record<string, unknown> = {};
    const fields = ["stepName", "stepNameAr", "stepOrder", "allowedRoles", "allowedActions", "viewableFields", "editableFields", "requiredFields", "autoTransitionTo", "conditions", "disbursementType", "isTerminal"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    }

    const [updated] = await db.update(workflowStepsTable).set(updateData)
      .where(and(eq(workflowStepsTable.id, req.params.stepId), eq(workflowStepsTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id/steps/:stepId", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const deleted = await db.delete(workflowStepsTable)
      .where(and(eq(workflowStepsTable.id, req.params.stepId), eq(workflowStepsTable.tenantId, tenantId)));
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

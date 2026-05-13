import { Router } from "express";
import { db, recurringJournalTemplatesTable, recurringJournalLinesTable, journalEntriesTable, journalItemsTable } from "@workspace/db";
import { eq, and, desc, sql, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
const JOURNAL_ROLES = ["TenantAdmin", "Accountant", "FinancialController", "CFO"] as const;

router.get("/", requireAuth, requireRole(...JOURNAL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const templates = await db.select().from(recurringJournalTemplatesTable).where(eq(recurringJournalTemplatesTable.tenantId, tenantId)).orderBy(desc(recurringJournalTemplatesTable.createdAt));
    res.json({ data: templates.map(t => ({ ...t, totalDebit: Number(t.totalDebit), totalCredit: Number(t.totalCredit) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, requireRole(...JOURNAL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, description, frequency, startDate, endDate, isAutoReverse, branchId, lines } = req.body;
    if (!name || !frequency || !startDate || !lines || lines.length === 0) {
      res.status(400).json({ error: "bad_request", message: "name, frequency, startDate, lines required" }); return;
    }

    let totalDebit = 0, totalCredit = 0;
    for (const line of lines) { totalDebit += Number(line.debit || 0); totalCredit += Number(line.credit || 0); }
    if (Math.abs(totalDebit - totalCredit) > 0.01) { res.status(400).json({ error: "bad_request", message: "Debits must equal credits" }); return; }

    const [template] = await db.insert(recurringJournalTemplatesTable).values({
      tenantId, branchId, name, nameAr, description, frequency, startDate, endDate,
      nextRunDate: startDate, isAutoReverse: isAutoReverse || false,
      totalDebit: totalDebit.toString(), totalCredit: totalCredit.toString(),
    }).returning();

    for (const line of lines) {
      await db.insert(recurringJournalLinesTable).values({
        tenantId, templateId: template.id, accountId: line.accountId,
        description: line.description, debit: (line.debit || 0).toString(), credit: (line.credit || 0).toString(),
      });
    }
    res.status(201).json({ ...template, totalDebit, totalCredit });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/:id/lines", requireAuth, requireRole(...JOURNAL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const lines = await db.select().from(recurringJournalLinesTable).where(and(eq(recurringJournalLinesTable.templateId, req.params.id), eq(recurringJournalLinesTable.tenantId, tenantId)));
    res.json({ data: lines.map(l => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/execute", requireAuth, requireRole(...JOURNAL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const today = new Date().toISOString().split("T")[0];

    const dueTemplates = await db.select().from(recurringJournalTemplatesTable)
      .where(and(
        eq(recurringJournalTemplatesTable.tenantId, tenantId),
        eq(recurringJournalTemplatesTable.isActive, true),
        lte(recurringJournalTemplatesTable.nextRunDate, today),
      ));

    let executed = 0;
    for (const tmpl of dueTemplates) {
      const lines = await db.select().from(recurringJournalLinesTable).where(eq(recurringJournalLinesTable.templateId, tmpl.id));
      if (lines.length === 0) continue;

      await db.insert(journalEntriesTable).values({
        tenantId, branchId: tmpl.branchId, referenceType: "RecurringJournal", referenceId: tmpl.id,
        transactionDate: today, description: `[Auto] ${tmpl.name}`,
        totalDebit: tmpl.totalDebit, totalCredit: tmpl.totalCredit,
      });

      if (tmpl.isAutoReverse) {
        await db.insert(journalEntriesTable).values({
          tenantId, branchId: tmpl.branchId, referenceType: "AutoReversal", referenceId: tmpl.id,
          transactionDate: today, description: `[Auto Reversal] ${tmpl.name}`,
          totalDebit: tmpl.totalCredit, totalCredit: tmpl.totalDebit,
        });
      }

      const nextDate = new Date(tmpl.nextRunDate || today);
      if (tmpl.frequency === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (tmpl.frequency === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (tmpl.frequency === "Annually") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (tmpl.frequency === "Weekly") nextDate.setDate(nextDate.getDate() + 7);

      const shouldDeactivate = tmpl.endDate && nextDate.toISOString().split("T")[0] > tmpl.endDate;
      await db.update(recurringJournalTemplatesTable).set({
        lastRunDate: today, nextRunDate: nextDate.toISOString().split("T")[0],
        isActive: !shouldDeactivate, updatedAt: new Date(),
      }).where(eq(recurringJournalTemplatesTable.id, tmpl.id));
      executed++;
    }
    res.json({ executed, date: today });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/toggle", requireAuth, requireRole(...JOURNAL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [tmpl] = await db.select().from(recurringJournalTemplatesTable)
      .where(and(eq(recurringJournalTemplatesTable.id, req.params.id), eq(recurringJournalTemplatesTable.tenantId, tenantId))).limit(1);
    if (!tmpl) { res.status(404).json({ error: "not_found" }); return; }
    await db.update(recurringJournalTemplatesTable).set({ isActive: !tmpl.isActive, updatedAt: new Date() }).where(eq(recurringJournalTemplatesTable.id, tmpl.id));
    res.json({ isActive: !tmpl.isActive });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

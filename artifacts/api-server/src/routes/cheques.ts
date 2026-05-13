import { Router } from "express";
import { db, chequesTable, journalEntriesTable, clientsTable, guaranteesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;

    let whereClause = eq(chequesTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(chequesTable.status, status)) as typeof whereClause;

    const [cheques, [{ count }]] = await Promise.all([
      db.select().from(chequesTable).where(whereClause).orderBy(desc(chequesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(chequesTable).where(whereClause),
    ]);

    const clientIds = [...new Set(cheques.map(c => c.clientId).filter(Boolean))];
    const clientMap = new Map<string, string>();
    for (const cId of clientIds) {
      const [cl] = await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, cId!)).limit(1);
      if (cl) clientMap.set(cId!, cl.fullNameAr);
    }

    const guaranteeIds = [...new Set(cheques.map(c => c.guaranteeId).filter(Boolean))];
    const guaranteeMap = new Map<string, string>();
    for (const gId of guaranteeIds) {
      const [g] = await db.select({ guarantorName: guaranteesTable.guarantorName }).from(guaranteesTable).where(eq(guaranteesTable.id, gId!)).limit(1);
      if (g) guaranteeMap.set(gId!, g.guarantorName);
    }

    res.json({
      data: cheques.map(c => ({
        ...c, amount: Number(c.amount),
        clientName: c.clientId ? clientMap.get(c.clientId) || null : null,
        guarantorName: c.guaranteeId ? guaranteeMap.get(c.guaranteeId) || null : null,
      })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { loanId, clientId, guaranteeId, branchId, chequeType, assignedTo, customerCategory, chequeNumber, bankName, bankBranch, amount, issueDate, dueDate, drawerName, drawerNationalId, notes } = req.body;
    if (!chequeNumber || !bankName || !amount || !issueDate || !dueDate || !drawerName) {
      res.status(400).json({ error: "bad_request", message: "chequeNumber, bankName, amount, issueDate, dueDate, drawerName required" });
      return;
    }

    const [cheque] = await db.insert(chequesTable).values({
      tenantId, loanId: loanId || null, clientId: clientId || null, guaranteeId: guaranteeId || null, branchId: branchId || null,
      chequeType: chequeType || "PDC", assignedTo: assignedTo || "Customer", customerCategory: customerCategory || "Individual",
      chequeNumber, bankName, bankBranch, amount: amount.toString(),
      issueDate, dueDate, drawerName, drawerNationalId,
      status: "Pending", notes, createdById: req.user!.id,
    }).returning();

    res.status(201).json({ ...cheque, amount: Number(cheque.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/status", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { status, bounceReason } = req.body;
    const validStatuses = ["Pending", "Presented", "Cleared", "Bounced", "Cancelled", "Replaced"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "bad_request", message: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "Presented") updateData.presentedDate = new Date().toISOString().split("T")[0];
    if (status === "Cleared") updateData.clearedDate = new Date().toISOString().split("T")[0];
    if (status === "Bounced") {
      updateData.bouncedDate = new Date().toISOString().split("T")[0];
      updateData.bounceReason = bounceReason;
    }

    const [updated] = await db.update(chequesTable).set(updateData)
      .where(and(eq(chequesTable.id, req.params.id), eq(chequesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }

    if (status === "Cleared" && !updated.glReconciled) {
      await db.insert(journalEntriesTable).values({
        tenantId, referenceType: "ChequeCleared", referenceId: updated.id,
        description: `Cheque ${updated.chequeNumber} cleared - ${Number(updated.amount)} EGP`,
        totalDebit: updated.amount, totalCredit: updated.amount,
      });
      await db.update(chequesTable).set({ glReconciled: true }).where(eq(chequesTable.id, updated.id));
    }

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [cheque] = await db.select().from(chequesTable)
      .where(and(eq(chequesTable.id, req.params.id), eq(chequesTable.tenantId, tenantId))).limit(1);
    if (!cheque) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...cheque, amount: Number(cheque.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

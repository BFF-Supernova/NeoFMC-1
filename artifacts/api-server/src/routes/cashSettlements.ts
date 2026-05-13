import { Router } from "express";
import { db, cashSettlementsTable, cashBoxesTable, branchesTable, journalEntriesTable } from "@workspace/db";
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

    let whereClause = eq(cashSettlementsTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(cashSettlementsTable.status, status)) as typeof whereClause;

    const [settlements, [{ count }]] = await Promise.all([
      db.select().from(cashSettlementsTable).where(whereClause).orderBy(desc(cashSettlementsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(cashSettlementsTable).where(whereClause),
    ]);

    res.json({
      data: settlements.map(s => ({ ...s, amount: Number(s.amount), commissionAmount: s.commissionAmount ? Number(s.commissionAmount) : 0, commissionPct: s.commissionPct ? Number(s.commissionPct) : 0 })),
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
    const { branchId, settlementType, cashBoxType, amount, settlementDate, fromBranchId, toBranchId, commissionAmount, commissionPct, referenceNumber, notes } = req.body;
    if (!branchId || !settlementType || !amount) {
      res.status(400).json({ error: "bad_request", message: "branchId, settlementType, amount required" });
      return;
    }

    const validTypes = ["Collection", "Transfer", "Deposit", "Withdrawal", "Commission", "Other"];
    if (!validTypes.includes(settlementType)) {
      res.status(400).json({ error: "bad_request", message: `settlementType must be one of: ${validTypes.join(", ")}` });
      return;
    }

    const [settlement] = await db.insert(cashSettlementsTable).values({
      tenantId, branchId, settlementType,
      cashBoxType: cashBoxType || "Main",
      amount: amount.toString(),
      settlementDate: settlementDate || new Date().toISOString().split("T")[0],
      fromBranchId: fromBranchId || null,
      toBranchId: toBranchId || null,
      tellerId: req.user!.id,
      tellerName: req.user!.fullName,
      commissionAmount: commissionAmount?.toString() || "0.00",
      commissionPct: commissionPct?.toString() || "0.00",
      referenceNumber, notes,
      status: "Pending",
      createdById: req.user!.id,
    }).returning();

    res.status(201).json({ ...settlement, amount: Number(settlement.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/approve", requireAuth, requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [settlement] = await db.select().from(cashSettlementsTable)
      .where(and(eq(cashSettlementsTable.id, req.params.id), eq(cashSettlementsTable.tenantId, tenantId))).limit(1);
    if (!settlement) { res.status(404).json({ error: "not_found" }); return; }

    const [updated] = await db.update(cashSettlementsTable).set({
      status: "Approved",
      approvedById: req.user!.id,
      approvedByName: req.user!.fullName,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(cashSettlementsTable.id, settlement.id)).returning();

    if (settlement.settlementType === "Transfer" && settlement.fromBranchId && settlement.toBranchId) {
      const amt = Number(settlement.amount);
      await db.update(branchesTable).set({
        mainCashBoxBalance: sql`main_cash_box_balance - ${amt}`,
        updatedAt: new Date(),
      }).where(and(eq(branchesTable.id, settlement.fromBranchId), eq(branchesTable.tenantId, tenantId)));

      await db.update(branchesTable).set({
        mainCashBoxBalance: sql`main_cash_box_balance + ${amt}`,
        updatedAt: new Date(),
      }).where(and(eq(branchesTable.id, settlement.toBranchId), eq(branchesTable.tenantId, tenantId)));
    }

    if (!updated.glReconciled) {
      await db.insert(journalEntriesTable).values({
        tenantId, branchId: updated.branchId, referenceType: "CashSettlement", referenceId: updated.id,
        description: `Cash ${updated.settlementType} - ${Number(updated.amount)} EGP`,
        totalDebit: updated.amount, totalCredit: updated.amount,
      });
      await db.update(cashSettlementsTable).set({ glReconciled: true }).where(eq(cashSettlementsTable.id, updated.id));
    }

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/cash-boxes", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const branchId = req.query.branchId as string | undefined;

    let whereClause = eq(cashBoxesTable.tenantId, tenantId);
    if (branchId) whereClause = and(whereClause, eq(cashBoxesTable.branchId, branchId)) as typeof whereClause;

    const boxes = await db.select().from(cashBoxesTable).where(whereClause);
    res.json(boxes.map(b => ({ ...b, balance: Number(b.balance) })));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/cash-boxes", requireAuth, requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, boxType, boxName, balance, assignedToId } = req.body;
    if (!branchId || !boxName) {
      res.status(400).json({ error: "bad_request", message: "branchId, boxName required" });
      return;
    }

    const existingBoxes = await db.select().from(cashBoxesTable)
      .where(and(eq(cashBoxesTable.branchId, branchId), eq(cashBoxesTable.tenantId, tenantId)));
    if (existingBoxes.length >= 3) {
      res.status(400).json({ error: "bad_request", message: "Maximum 3 cash boxes per branch" });
      return;
    }

    const [box] = await db.insert(cashBoxesTable).values({
      tenantId, branchId, boxType: boxType || "Main", boxName,
      balance: balance?.toString() || "0.00",
      assignedToId: assignedToId || null,
    }).returning();

    res.status(201).json({ ...box, balance: Number(box.balance) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { db, creditLimitsTable, creditDrawsTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const clientId = req.query.clientId as string | undefined;
    const status = req.query.status as string | undefined;

    let whereClause = eq(creditLimitsTable.tenantId, tenantId);
    if (clientId) whereClause = and(whereClause, eq(creditLimitsTable.clientId, clientId)) as typeof whereClause;
    if (status) whereClause = and(whereClause, eq(creditLimitsTable.status, status)) as typeof whereClause;

    const [limits, [{ count }]] = await Promise.all([
      db.select().from(creditLimitsTable).where(whereClause).orderBy(desc(creditLimitsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(creditLimitsTable).where(whereClause),
    ]);

    res.json({
      data: limits.map(l => ({
        ...l, creditLimit: Number(l.creditLimit), availableBalance: Number(l.availableBalance),
        usedAmount: Number(l.usedAmount), interestRate: l.interestRate ? Number(l.interestRate) : null,
      })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clientId, productId, creditLimit, interestRate, gracePeriodDays, expiryDate, isRevolving, maxConcurrentLoans } = req.body;
    if (!clientId || !creditLimit) {
      res.status(400).json({ error: "bad_request", message: "clientId, creditLimit required" });
      return;
    }

    const [cl] = await db.insert(creditLimitsTable).values({
      tenantId, clientId, productId: productId || null,
      creditLimit: creditLimit.toString(),
      availableBalance: creditLimit.toString(),
      usedAmount: "0.00",
      interestRate: interestRate?.toString() || null,
      gracePeriodDays: gracePeriodDays || 0,
      expiryDate: expiryDate || null,
      isRevolving: isRevolving !== false,
      maxConcurrentLoans: maxConcurrentLoans || 1,
      status: "Active",
    }).returning();

    res.status(201).json({
      ...cl, creditLimit: Number(cl.creditLimit), availableBalance: Number(cl.availableBalance),
      usedAmount: Number(cl.usedAmount), interestRate: cl.interestRate ? Number(cl.interestRate) : null,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { creditLimit, interestRate, gracePeriodDays, expiryDate, isRevolving, maxConcurrentLoans, status } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (creditLimit !== undefined) {
      updateData.creditLimit = creditLimit.toString();
      const [existing] = await db.select().from(creditLimitsTable)
        .where(and(eq(creditLimitsTable.id, req.params.id), eq(creditLimitsTable.tenantId, tenantId))).limit(1);
      if (existing) {
        updateData.availableBalance = (Number(creditLimit) - Number(existing.usedAmount)).toString();
      }
    }
    if (interestRate !== undefined) updateData.interestRate = interestRate?.toString();
    if (gracePeriodDays !== undefined) updateData.gracePeriodDays = gracePeriodDays;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate;
    if (isRevolving !== undefined) updateData.isRevolving = isRevolving;
    if (maxConcurrentLoans !== undefined) updateData.maxConcurrentLoans = maxConcurrentLoans;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db.update(creditLimitsTable).set(updateData)
      .where(and(eq(creditLimitsTable.id, req.params.id), eq(creditLimitsTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({
      ...updated, creditLimit: Number(updated.creditLimit), availableBalance: Number(updated.availableBalance),
      usedAmount: Number(updated.usedAmount),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/draw", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { drawAmount, dueDate, notes } = req.body;
    if (!drawAmount) { res.status(400).json({ error: "bad_request", message: "drawAmount required" }); return; }

    const [cl] = await db.select().from(creditLimitsTable)
      .where(and(eq(creditLimitsTable.id, req.params.id), eq(creditLimitsTable.tenantId, tenantId))).limit(1);
    if (!cl) { res.status(404).json({ error: "not_found" }); return; }
    if (cl.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Credit limit is not active" }); return; }
    if (Number(drawAmount) > Number(cl.availableBalance)) {
      res.status(400).json({ error: "bad_request", message: "Draw amount exceeds available balance" });
      return;
    }
    if (cl.activeLoanCount >= cl.maxConcurrentLoans) {
      res.status(400).json({ error: "bad_request", message: "Maximum concurrent loans reached" });
      return;
    }

    const [draw] = await db.insert(creditDrawsTable).values({
      tenantId, creditLimitId: cl.id, clientId: cl.clientId,
      drawAmount: drawAmount.toString(), outstandingAmount: drawAmount.toString(),
      interestRate: cl.interestRate, dueDate, notes, status: "Active",
    }).returning();

    await db.update(creditLimitsTable).set({
      usedAmount: (Number(cl.usedAmount) + Number(drawAmount)).toString(),
      availableBalance: (Number(cl.availableBalance) - Number(drawAmount)).toString(),
      activeLoanCount: cl.activeLoanCount + 1,
      updatedAt: new Date(),
    }).where(eq(creditLimitsTable.id, cl.id));

    await db.insert(journalEntriesTable).values({
      tenantId, referenceType: "CreditDraw", referenceId: draw.id,
      description: `Credit draw of ${drawAmount} EGP`,
      totalDebit: drawAmount.toString(), totalCredit: drawAmount.toString(),
    });

    res.status(201).json({
      ...draw, drawAmount: Number(draw.drawAmount), outstandingAmount: Number(draw.outstandingAmount),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/draws", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const draws = await db.select().from(creditDrawsTable)
      .where(and(eq(creditDrawsTable.creditLimitId, req.params.id), eq(creditDrawsTable.tenantId, tenantId)))
      .orderBy(desc(creditDrawsTable.createdAt));

    res.json(draws.map(d => ({
      ...d, drawAmount: Number(d.drawAmount), outstandingAmount: Number(d.outstandingAmount),
      interestRate: d.interestRate ? Number(d.interestRate) : null,
    })));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/draws/:drawId/repay", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { amount } = req.body;
    if (!amount) { res.status(400).json({ error: "bad_request", message: "amount required" }); return; }

    const [draw] = await db.select().from(creditDrawsTable)
      .where(and(eq(creditDrawsTable.id, req.params.drawId), eq(creditDrawsTable.tenantId, tenantId))).limit(1);
    if (!draw) { res.status(404).json({ error: "not_found" }); return; }

    const newOutstanding = Math.max(0, Number(draw.outstandingAmount) - Number(amount));
    const newStatus = newOutstanding <= 0 ? "Closed" : "Active";

    const [updated] = await db.update(creditDrawsTable).set({
      outstandingAmount: newOutstanding.toString(), status: newStatus, updatedAt: new Date(),
    }).where(eq(creditDrawsTable.id, draw.id)).returning();

    const [cl] = await db.select().from(creditLimitsTable)
      .where(eq(creditLimitsTable.id, draw.creditLimitId)).limit(1);
    if (cl && cl.isRevolving) {
      await db.update(creditLimitsTable).set({
        usedAmount: Math.max(0, Number(cl.usedAmount) - Number(amount)).toString(),
        availableBalance: Math.min(Number(cl.creditLimit), Number(cl.availableBalance) + Number(amount)).toString(),
        activeLoanCount: newStatus === "Closed" ? Math.max(0, cl.activeLoanCount - 1) : cl.activeLoanCount,
        updatedAt: new Date(),
      }).where(eq(creditLimitsTable.id, cl.id));
    }

    res.json({ ...updated, drawAmount: Number(updated.drawAmount), outstandingAmount: Number(updated.outstandingAmount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

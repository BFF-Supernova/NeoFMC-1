import { Router } from "express";
import { db, expensesTable, revenuesTable, branchesTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;

    let whereClause = eq(expensesTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(expensesTable.status, status)) as typeof whereClause;
    if (branchId) whereClause = and(whereClause, eq(expensesTable.branchId, branchId)) as typeof whereClause;

    const [expenses, [{ count }]] = await Promise.all([
      db.select().from(expensesTable).where(whereClause).orderBy(desc(expensesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(expensesTable).where(whereClause),
    ]);

    res.json({ data: expenses.map(e => ({ ...e, amount: Number(e.amount) })), total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, category, description, amount, transactionDate, referenceNumber, documentUrls } = req.body;
    if (!branchId || !category || !description || !amount) {
      res.status(400).json({ error: "bad_request", message: "branchId, category, description, amount required" });
      return;
    }

    const [branch] = await db.select().from(branchesTable)
      .where(and(eq(branchesTable.id, branchId), eq(branchesTable.tenantId, tenantId))).limit(1);
    if (!branch) { res.status(404).json({ error: "not_found", message: "Branch not found" }); return; }

    if (branch.monthlySpendingLimit) {
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split("T")[0];
      const [{ total }] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(expensesTable)
        .where(and(eq(expensesTable.branchId, branchId), eq(expensesTable.tenantId, tenantId),
          eq(expensesTable.status, "Approved"), gte(expensesTable.transactionDate, monthStart)));
      if (Number(total) + Number(amount) > Number(branch.monthlySpendingLimit)) {
        res.status(400).json({ error: "limit_exceeded", message: "Monthly spending limit exceeded for this branch" });
        return;
      }
    }

    if (branch.yearlySpendingLimit) {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
      const [{ total }] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(expensesTable)
        .where(and(eq(expensesTable.branchId, branchId), eq(expensesTable.tenantId, tenantId),
          eq(expensesTable.status, "Approved"), gte(expensesTable.transactionDate, yearStart)));
      if (Number(total) + Number(amount) > Number(branch.yearlySpendingLimit)) {
        res.status(400).json({ error: "limit_exceeded", message: "Yearly spending limit exceeded for this branch" });
        return;
      }
    }

    const [expense] = await db.insert(expensesTable).values({
      tenantId, branchId, category, description, amount: amount.toString(),
      transactionDate: transactionDate || new Date().toISOString().split("T")[0],
      referenceNumber, documentUrls: documentUrls || null,
      status: "Pending",
      createdById: req.user!.id,
      createdByName: req.user!.fullName,
    }).returning();

    res.status(201).json({ ...expense, amount: Number(expense.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/verify", requireAuth, requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { action, rejectionReason } = req.body;
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "bad_request", message: "action must be 'approve' or 'reject'" });
      return;
    }

    const [expense] = await db.select().from(expensesTable)
      .where(and(eq(expensesTable.id, req.params.id), eq(expensesTable.tenantId, tenantId))).limit(1);
    if (!expense) { res.status(404).json({ error: "not_found" }); return; }
    if (expense.createdById === req.user!.id) {
      res.status(400).json({ error: "bad_request", message: "Cannot verify own expense (maker-checker)" });
      return;
    }

    const updateData: Record<string, unknown> = {
      status: action === "approve" ? "Approved" : "Rejected",
      verifiedById: req.user!.id,
      verifiedByName: req.user!.fullName,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    };
    if (action === "reject") updateData.rejectionReason = rejectionReason;

    const [updated] = await db.update(expensesTable).set(updateData)
      .where(eq(expensesTable.id, expense.id)).returning();

    if (action === "approve" && !updated.glSynced) {
      await db.insert(journalEntriesTable).values({
        tenantId, branchId: updated.branchId, referenceType: "Expense", referenceId: updated.id,
        description: `${updated.category}: ${updated.description}`,
        totalDebit: updated.amount, totalCredit: updated.amount,
      });
      await db.update(expensesTable).set({ glSynced: true }).where(eq(expensesTable.id, updated.id));

      await db.update(branchesTable).set({
        currentMonthSpending: sql`current_month_spending + ${Number(updated.amount)}`,
        currentYearSpending: sql`current_year_spending + ${Number(updated.amount)}`,
        updatedAt: new Date(),
      }).where(eq(branchesTable.id, updated.branchId));
    }

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/revenues", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    let whereClause = eq(revenuesTable.tenantId, tenantId);
    const [revenues, [{ count }]] = await Promise.all([
      db.select().from(revenuesTable).where(whereClause).orderBy(desc(revenuesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(revenuesTable).where(whereClause),
    ]);

    res.json({ data: revenues.map(r => ({ ...r, amount: Number(r.amount) })), total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/revenues", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, category, description, amount, transactionDate, referenceNumber, documentUrls } = req.body;
    if (!branchId || !category || !description || !amount) {
      res.status(400).json({ error: "bad_request", message: "branchId, category, description, amount required" });
      return;
    }

    const [revenue] = await db.insert(revenuesTable).values({
      tenantId, branchId, category, description, amount: amount.toString(),
      transactionDate: transactionDate || new Date().toISOString().split("T")[0],
      referenceNumber, documentUrls: documentUrls || null,
      status: "Pending",
      createdById: req.user!.id,
      createdByName: req.user!.fullName,
    }).returning();

    res.status(201).json({ ...revenue, amount: Number(revenue.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/revenues/:id/verify", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { action, rejectionReason } = req.body;
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "bad_request", message: "action must be 'approve' or 'reject'" });
      return;
    }

    const [revenue] = await db.select().from(revenuesTable)
      .where(and(eq(revenuesTable.id, req.params.id), eq(revenuesTable.tenantId, tenantId))).limit(1);
    if (!revenue) { res.status(404).json({ error: "not_found" }); return; }
    if (revenue.createdById === req.user!.id) {
      res.status(400).json({ error: "bad_request", message: "Cannot verify own revenue (maker-checker)" });
      return;
    }

    const updateData: Record<string, unknown> = {
      status: action === "approve" ? "Approved" : "Rejected",
      verifiedById: req.user!.id,
      verifiedByName: req.user!.fullName,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    };
    if (action === "reject") updateData.rejectionReason = rejectionReason;

    const [updated] = await db.update(revenuesTable).set(updateData)
      .where(eq(revenuesTable.id, revenue.id)).returning();

    if (action === "approve" && !updated.glSynced) {
      await db.insert(journalEntriesTable).values({
        tenantId, branchId: updated.branchId, referenceType: "Revenue", referenceId: updated.id,
        description: `${updated.category}: ${updated.description}`,
        totalDebit: "0", totalCredit: updated.amount,
      });
      await db.update(revenuesTable).set({ glSynced: true }).where(eq(revenuesTable.id, updated.id));
    }

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

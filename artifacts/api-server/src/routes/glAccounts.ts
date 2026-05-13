import { Router } from "express";
import { db, glAccountsTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { seedGlAccountsForTenant } from "../lib/glAccountsSeed";

const router = Router();

router.get("/gl-accounts", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const accounts = await db.select().from(glAccountsTable)
      .where(eq(glAccountsTable.tenantId, tenantId))
      .orderBy(glAccountsTable.accountCode);
    res.json(accounts.map(a => ({
      id: a.id,
      tenantId: a.tenantId,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountNameAr: a.accountNameAr,
      accountType: a.accountType,
      costCenterId: a.costCenterId,
      balance: Number(a.balance),
      createdAt: a.createdAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/gl-accounts/seed", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const count = await seedGlAccountsForTenant(tenantId);
    if (count === 0) {
      res.json({ message: "Accounts already exist", seeded: 0 });
    } else {
      res.status(201).json({ message: "Default accounts seeded", seeded: count });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/gl-accounts", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { accountCode, accountName, accountNameAr, accountType, costCenterId } = req.body;
    if (!accountCode || !accountName || !accountType) {
      res.status(400).json({ error: "bad_request", message: "accountCode, accountName, accountType required" });
      return;
    }
    const [account] = await db.insert(glAccountsTable).values({
      tenantId, accountCode, accountName, accountNameAr, accountType, costCenterId,
    }).returning();
    res.status(201).json({ id: account.id, tenantId: account.tenantId, accountCode: account.accountCode, accountName: account.accountName, accountNameAr: account.accountNameAr, accountType: account.accountType, costCenterId: account.costCenterId, balance: Number(account.balance), createdAt: account.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/journal-entries", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [entries, [{ count }]] = await Promise.all([
      db.select().from(journalEntriesTable).where(eq(journalEntriesTable.tenantId, tenantId)).orderBy(desc(journalEntriesTable.transactionDate)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(journalEntriesTable).where(eq(journalEntriesTable.tenantId, tenantId)),
    ]);

    res.json({
      data: entries.map(e => ({
        id: e.id, tenantId: e.tenantId, branchId: e.branchId, referenceType: e.referenceType, referenceId: e.referenceId,
        transactionDate: e.transactionDate, description: e.description,
        totalDebit: Number(e.totalDebit), totalCredit: Number(e.totalCredit),
        isReconciled: e.isReconciled, createdAt: e.createdAt,
      })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

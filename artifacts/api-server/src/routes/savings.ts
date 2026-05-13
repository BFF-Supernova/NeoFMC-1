import { Router } from "express";
import { db, savingsProductsTable, savingsAccountsTable, savingsTransactionsTable, clientsTable, branchesTable, journalEntriesTable, journalItemsTable, glAccountsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/products", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const products = await db.select().from(savingsProductsTable)
      .where(eq(savingsProductsTable.tenantId, tenantId))
      .orderBy(desc(savingsProductsTable.createdAt));
    res.json({ data: products.map(p => ({ ...p, annualInterestRate: Number(p.annualInterestRate), minimumBalance: Number(p.minimumBalance), minimumOpeningAmount: Number(p.minimumOpeningAmount), maximumBalance: p.maximumBalance ? Number(p.maximumBalance) : null, earlyWithdrawalPenaltyRate: p.earlyWithdrawalPenaltyRate ? Number(p.earlyWithdrawalPenaltyRate) : null, mandatoryAmount: p.mandatoryAmount ? Number(p.mandatoryAmount) : null })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/products", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "BranchManager", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const { nameAr, nameEn, productType, annualInterestRate, compoundingFrequency, minimumBalance, minimumOpeningAmount, maximumBalance, withdrawalLimitPerMonth, earlyWithdrawalPenaltyRate, lockInPeriodDays, dormancyPeriodDays, mandatoryAmount, mandatoryFrequency, description, descriptionAr } = req.body;
    if (!nameAr || !productType) { res.status(400).json({ error: "bad_request", message: "nameAr and productType required" }); return; }
    const [product] = await db.insert(savingsProductsTable).values({
      tenantId, nameAr, nameEn: nameEn || null, productType, annualInterestRate: (annualInterestRate || 0).toString(), compoundingFrequency: compoundingFrequency || "Monthly", minimumBalance: (minimumBalance || 0).toString(), minimumOpeningAmount: (minimumOpeningAmount || 0).toString(), maximumBalance: maximumBalance ? maximumBalance.toString() : null, withdrawalLimitPerMonth: withdrawalLimitPerMonth || null, earlyWithdrawalPenaltyRate: earlyWithdrawalPenaltyRate ? earlyWithdrawalPenaltyRate.toString() : "0.00", lockInPeriodDays: lockInPeriodDays || 0, dormancyPeriodDays: dormancyPeriodDays || 365, mandatoryAmount: mandatoryAmount ? mandatoryAmount.toString() : null, mandatoryFrequency: mandatoryFrequency || null, description: description || null, descriptionAr: descriptionAr || null,
    }).returning();
    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "CREATE", entity: "SavingsProduct", entityId: product.id, details: { nameAr, productType } });
    res.status(201).json(product);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/products/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "BranchManager", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const updates: Record<string, any> = {};
    const fields = ["nameAr", "nameEn", "productType", "annualInterestRate", "compoundingFrequency", "minimumBalance", "minimumOpeningAmount", "maximumBalance", "withdrawalLimitPerMonth", "earlyWithdrawalPenaltyRate", "lockInPeriodDays", "dormancyPeriodDays", "mandatoryAmount", "mandatoryFrequency", "isActive", "description", "descriptionAr"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (["annualInterestRate", "minimumBalance", "minimumOpeningAmount", "maximumBalance", "earlyWithdrawalPenaltyRate", "mandatoryAmount"].includes(f)) {
          updates[f] = req.body[f] != null ? req.body[f].toString() : null;
        } else { updates[f] = req.body[f]; }
      }
    }
    updates.updatedAt = new Date();
    const [product] = await db.update(savingsProductsTable).set(updates)
      .where(and(eq(savingsProductsTable.id, req.params.id), eq(savingsProductsTable.tenantId, tenantId)))
      .returning();
    if (!product) { res.status(404).json({ error: "not_found" }); return; }
    res.json(product);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/accounts", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const clientId = req.query.clientId as string | undefined;
    const status = req.query.status as string | undefined;

    let whereClause = eq(savingsAccountsTable.tenantId, tenantId);
    if (clientId) whereClause = and(whereClause, eq(savingsAccountsTable.clientId, clientId)) as any;
    if (status) whereClause = and(whereClause, eq(savingsAccountsTable.status, status)) as any;

    const [accounts, [{ total }]] = await Promise.all([
      db.select({
        account: savingsAccountsTable,
        clientNameAr: clientsTable.fullNameAr,
        clientNameEn: clientsTable.fullNameEn,
        clientNationalId: clientsTable.nationalId,
        productNameAr: savingsProductsTable.nameAr,
        productNameEn: savingsProductsTable.nameEn,
        branchName: branchesTable.name,
      }).from(savingsAccountsTable)
        .leftJoin(clientsTable, eq(savingsAccountsTable.clientId, clientsTable.id))
        .leftJoin(savingsProductsTable, eq(savingsAccountsTable.productId, savingsProductsTable.id))
        .leftJoin(branchesTable, eq(savingsAccountsTable.branchId, branchesTable.id))
        .where(whereClause)
        .orderBy(desc(savingsAccountsTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)` }).from(savingsAccountsTable).where(whereClause),
    ]);

    res.json({
      data: accounts.map(a => ({
        ...a.account,
        balance: Number(a.account.balance),
        accruedInterest: Number(a.account.accruedInterest),
        totalDeposits: Number(a.account.totalDeposits),
        totalWithdrawals: Number(a.account.totalWithdrawals),
        totalInterestEarned: Number(a.account.totalInterestEarned),
        clientNameAr: a.clientNameAr,
        clientNameEn: a.clientNameEn,
        clientNationalId: a.clientNationalId,
        productNameAr: a.productNameAr,
        productNameEn: a.productNameEn,
        branchName: a.branchName,
      })),
      total: Number(total), page, limit,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/accounts", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clientId, productId, branchId, loanId, accountType, initialDeposit } = req.body;
    if (!clientId || !productId) { res.status(400).json({ error: "bad_request", message: "clientId and productId required" }); return; }

    const [product] = await db.select().from(savingsProductsTable)
      .where(and(eq(savingsProductsTable.id, productId), eq(savingsProductsTable.tenantId, tenantId))).limit(1);
    if (!product) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }
    if (!product.isActive) { res.status(400).json({ error: "bad_request", message: "Product is inactive" }); return; }

    const deposit = Number(initialDeposit) || 0;
    if (deposit > 0 && deposit < Number(product.minimumOpeningAmount)) {
      res.status(400).json({ error: "bad_request", message: `Minimum opening amount is ${product.minimumOpeningAmount}` }); return;
    }

    const accountNumber = `SAV-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date().toISOString().split("T")[0];

    const [account] = await db.insert(savingsAccountsTable).values({
      tenantId, clientId, productId, branchId: branchId || null,
      loanId: loanId || null,
      accountType: accountType || "Voluntary",
      accountNumber, balance: deposit.toString(),
      totalDeposits: deposit.toString(),
      lastTransactionDate: deposit > 0 ? today : null,
    }).returning();

    if (deposit > 0) {
      await db.insert(savingsTransactionsTable).values({
        tenantId, accountId: account.id, transactionType: "Deposit",
        amount: deposit.toString(), balanceAfter: deposit.toString(),
        paymentMethod: "Cash", description: "Initial deposit",
        performedById: req.user!.id, performedByName: req.user!.fullName,
      });
    }

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "CREATE", entity: "SavingsAccount", entityId: account.id, details: { clientId, productId, initialDeposit: deposit } });
    res.status(201).json({ ...account, balance: Number(account.balance) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/accounts/:id/deposit", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { amount, paymentMethod, referenceNumber, description } = req.body;
    if (!amount || Number(amount) <= 0) { res.status(400).json({ error: "bad_request", message: "Amount must be positive" }); return; }

    const [account] = await db.select().from(savingsAccountsTable)
      .where(and(eq(savingsAccountsTable.id, req.params.id), eq(savingsAccountsTable.tenantId, tenantId))).limit(1);
    if (!account) { res.status(404).json({ error: "not_found" }); return; }
    if (account.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Account is not active" }); return; }
    if (account.isBlocked) { res.status(400).json({ error: "bad_request", message: "Account is blocked" }); return; }

    const newBalance = Number(account.balance) + Number(amount);
    const [product] = await db.select().from(savingsProductsTable).where(eq(savingsProductsTable.id, account.productId)).limit(1);
    if (product?.maximumBalance && newBalance > Number(product.maximumBalance)) {
      res.status(400).json({ error: "bad_request", message: `Would exceed maximum balance of ${product.maximumBalance}` }); return;
    }

    const today = new Date().toISOString().split("T")[0];
    const [updated] = await db.update(savingsAccountsTable).set({
      balance: newBalance.toString(),
      totalDeposits: (Number(account.totalDeposits) + Number(amount)).toString(),
      lastTransactionDate: today,
      dormantSince: null,
      updatedAt: new Date(),
    }).where(eq(savingsAccountsTable.id, account.id)).returning();

    await db.insert(savingsTransactionsTable).values({
      tenantId, accountId: account.id, transactionType: "Deposit",
      amount: Number(amount).toString(), balanceAfter: newBalance.toString(),
      paymentMethod: paymentMethod || "Cash", referenceNumber: referenceNumber || null,
      description: description || null,
      performedById: req.user!.id, performedByName: req.user!.fullName,
    });

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "DEPOSIT", entity: "SavingsAccount", entityId: account.id, details: { amount: Number(amount), newBalance } });
    res.json({ ...updated, balance: Number(updated.balance) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/accounts/:id/withdraw", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { amount, paymentMethod, referenceNumber, description } = req.body;
    if (!amount || Number(amount) <= 0) { res.status(400).json({ error: "bad_request", message: "Amount must be positive" }); return; }

    const [account] = await db.select().from(savingsAccountsTable)
      .where(and(eq(savingsAccountsTable.id, req.params.id), eq(savingsAccountsTable.tenantId, tenantId))).limit(1);
    if (!account) { res.status(404).json({ error: "not_found" }); return; }
    if (account.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Account is not active" }); return; }
    if (account.isBlocked) { res.status(400).json({ error: "bad_request", message: "Account is blocked" }); return; }

    const [product] = await db.select().from(savingsProductsTable).where(eq(savingsProductsTable.id, account.productId)).limit(1);
    const currentBalance = Number(account.balance);
    const withdrawAmount = Number(amount);

    if (withdrawAmount > currentBalance) { res.status(400).json({ error: "bad_request", message: "Insufficient balance" }); return; }
    if (product?.minimumBalance && (currentBalance - withdrawAmount) < Number(product.minimumBalance)) {
      res.status(400).json({ error: "bad_request", message: `Would go below minimum balance of ${product.minimumBalance}` }); return;
    }
    if (product?.withdrawalLimitPerMonth && Number(account.withdrawalsThisMonth) >= product.withdrawalLimitPerMonth) {
      res.status(400).json({ error: "bad_request", message: `Monthly withdrawal limit of ${product.withdrawalLimitPerMonth} reached` }); return;
    }
    if (product?.lockInPeriodDays && product.lockInPeriodDays > 0) {
      const openDate = new Date(account.openedAt);
      const lockEnd = new Date(openDate.getTime() + product.lockInPeriodDays * 86400000);
      if (new Date() < lockEnd) {
        res.status(400).json({ error: "bad_request", message: `Lock-in period until ${lockEnd.toISOString().split("T")[0]}` }); return;
      }
    }

    const newBalance = currentBalance - withdrawAmount;
    const today = new Date().toISOString().split("T")[0];
    const [updated] = await db.update(savingsAccountsTable).set({
      balance: newBalance.toString(),
      totalWithdrawals: (Number(account.totalWithdrawals) + withdrawAmount).toString(),
      withdrawalsThisMonth: (Number(account.withdrawalsThisMonth) + 1).toString(),
      lastTransactionDate: today,
      updatedAt: new Date(),
    }).where(eq(savingsAccountsTable.id, account.id)).returning();

    await db.insert(savingsTransactionsTable).values({
      tenantId, accountId: account.id, transactionType: "Withdrawal",
      amount: withdrawAmount.toString(), balanceAfter: newBalance.toString(),
      paymentMethod: paymentMethod || "Cash", referenceNumber: referenceNumber || null,
      description: description || null,
      performedById: req.user!.id, performedByName: req.user!.fullName,
    });

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "WITHDRAWAL", entity: "SavingsAccount", entityId: account.id, details: { amount: withdrawAmount, newBalance } });
    res.json({ ...updated, balance: Number(updated.balance) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/accounts/:id/transactions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const [account] = await db.select().from(savingsAccountsTable)
      .where(and(eq(savingsAccountsTable.id, req.params.id), eq(savingsAccountsTable.tenantId, tenantId))).limit(1);
    if (!account) { res.status(404).json({ error: "not_found" }); return; }

    const [txns, [{ total }]] = await Promise.all([
      db.select().from(savingsTransactionsTable)
        .where(eq(savingsTransactionsTable.accountId, req.params.id))
        .orderBy(desc(savingsTransactionsTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)` }).from(savingsTransactionsTable)
        .where(eq(savingsTransactionsTable.accountId, req.params.id)),
    ]);

    res.json({
      data: txns.map(t => ({ ...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter) })),
      total: Number(total), page, limit,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [totalAccounts] = await db.select({ count: sql<number>`count(*)` }).from(savingsAccountsTable).where(and(eq(savingsAccountsTable.tenantId, tenantId), eq(savingsAccountsTable.status, "Active")));
    const [totalBalance] = await db.select({ sum: sql<number>`COALESCE(SUM(balance), 0)` }).from(savingsAccountsTable).where(and(eq(savingsAccountsTable.tenantId, tenantId), eq(savingsAccountsTable.status, "Active")));
    const [totalProducts] = await db.select({ count: sql<number>`count(*)` }).from(savingsProductsTable).where(and(eq(savingsProductsTable.tenantId, tenantId), eq(savingsProductsTable.isActive, true)));

    res.json({
      activeAccounts: Number(totalAccounts.count),
      totalBalance: Number(totalBalance.sum),
      activeProducts: Number(totalProducts.count),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/accounts/:id/close", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "BranchManager", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const [account] = await db.select().from(savingsAccountsTable)
      .where(and(eq(savingsAccountsTable.id, req.params.id), eq(savingsAccountsTable.tenantId, tenantId))).limit(1);
    if (!account) { res.status(404).json({ error: "not_found" }); return; }
    if (Number(account.balance) > 0) {
      res.status(400).json({ error: "bad_request", message: "Withdraw all funds before closing" }); return;
    }

    const [updated] = await db.update(savingsAccountsTable).set({
      status: "Closed", closedAt: new Date(), updatedAt: new Date(),
    }).where(eq(savingsAccountsTable.id, account.id)).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "CLOSE", entity: "SavingsAccount", entityId: account.id });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

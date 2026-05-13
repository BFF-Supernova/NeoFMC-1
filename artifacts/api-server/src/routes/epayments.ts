import { Router } from "express";
import { db, epaymentConfigsTable, epaymentTransactionsTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, requireSuperAdmin } from "../lib/auth";
import { getGateway, getAvailableGateways } from "../lib/paymentGateways";

const router = Router();

router.get("/gateways", requireAuth, async (_req, res) => {
  res.json({ gateways: getAvailableGateways() });
});

router.get("/configs", requireAuth, async (req, res) => {
  try {
    const isSuperAdmin = req.user!.role === 'SuperAdmin';
    const tenantId = isSuperAdmin ? (req.query.tenantId as string || req.user!.tenantId) : req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const configs = await db.select().from(epaymentConfigsTable)
      .where(eq(epaymentConfigsTable.tenantId, tenantId)).orderBy(desc(epaymentConfigsTable.createdAt));
    const masked = configs.map(c => ({ ...c, apiKey: c.apiKey ? "***" : null, secretKey: c.secretKey ? "***" : null, webhookSecret: c.webhookSecret ? "***" : null }));
    res.json(masked);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/configs", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const tenantId = req.body.tenantId || req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden", message: "tenantId required" }); return; }
    const { gateway, displayName, merchantId, apiKey, secretKey, callbackUrl, webhookSecret, environment, metadata } = req.body;
    if (!gateway) { res.status(400).json({ error: "bad_request", message: "gateway required" }); return; }

    const [config] = await db.insert(epaymentConfigsTable).values({
      tenantId, gateway, displayName, merchantId, apiKey, secretKey, callbackUrl, webhookSecret,
      environment: environment || "sandbox", metadata, isActive: false,
    }).returning();
    res.status(201).json({ ...config, apiKey: "***", secretKey: "***", webhookSecret: config.webhookSecret ? "***" : null });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/configs/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const tenantId = req.body.tenantId || req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden", message: "tenantId required" }); return; }
    const { displayName, merchantId, apiKey, secretKey, callbackUrl, webhookSecret, environment, isActive, metadata } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (displayName !== undefined) updateData.displayName = displayName;
    if (merchantId !== undefined) updateData.merchantId = merchantId;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (secretKey !== undefined) updateData.secretKey = secretKey;
    if (callbackUrl !== undefined) updateData.callbackUrl = callbackUrl;
    if (webhookSecret !== undefined) updateData.webhookSecret = webhookSecret;
    if (environment !== undefined) updateData.environment = environment;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (metadata !== undefined) updateData.metadata = metadata;

    const whereConditions = tenantId
      ? and(eq(epaymentConfigsTable.id, req.params.id), eq(epaymentConfigsTable.tenantId, tenantId))
      : eq(epaymentConfigsTable.id, req.params.id);
    const [updated] = await db.update(epaymentConfigsTable).set(updateData)
      .where(whereConditions).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, apiKey: "***", secretKey: "***", webhookSecret: updated.webhookSecret ? "***" : null });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/initiate", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { gateway, loanId, amount, customerPhone, customerEmail, customerName } = req.body;
    if (!gateway || !amount) { res.status(400).json({ error: "bad_request", message: "gateway, amount required" }); return; }

    const [config] = await db.select().from(epaymentConfigsTable)
      .where(and(eq(epaymentConfigsTable.tenantId, tenantId), eq(epaymentConfigsTable.gateway, gateway), eq(epaymentConfigsTable.isActive, true))).limit(1);
    if (!config) { res.status(400).json({ error: "bad_request", message: `Gateway ${gateway} not configured or inactive` }); return; }

    const gw = getGateway(gateway);
    if (!gw) { res.status(400).json({ error: "bad_request", message: `Gateway ${gateway} not supported` }); return; }

    gw.initialize({
      merchantId: config.merchantId || undefined,
      apiKey: config.apiKey || undefined,
      secretKey: config.secretKey || undefined,
      environment: config.environment as "sandbox" | "production",
      callbackUrl: config.callbackUrl || undefined,
      webhookSecret: config.webhookSecret || undefined,
    });

    const [txn] = await db.insert(epaymentTransactionsTable).values({
      tenantId, configId: config.id, loanId: loanId || null, gateway,
      amount: amount.toString(), customerPhone, customerEmail, customerName,
      status: "Pending",
    }).returning();

    const result = await gw.createPayment({
      amount: Number(amount), currency: "EGP", orderId: txn.id,
      customerPhone, customerEmail, customerName,
    });

    await db.update(epaymentTransactionsTable).set({
      externalTransactionId: result.transactionId,
      status: result.status === "completed" ? "Completed" : result.status === "failed" ? "Failed" : "Pending",
      gatewayResponse: result.rawResponse as any,
      updatedAt: new Date(),
    }).where(eq(epaymentTransactionsTable.id, txn.id));

    res.status(201).json({
      transactionId: txn.id,
      externalTransactionId: result.transactionId,
      redirectUrl: result.redirectUrl,
      status: result.status,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const gateway = req.query.gateway as string | undefined;

    let whereClause = eq(epaymentTransactionsTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(epaymentTransactionsTable.status, status)) as typeof whereClause;
    if (gateway) whereClause = and(whereClause, eq(epaymentTransactionsTable.gateway, gateway)) as typeof whereClause;

    const [txns, [{ count }]] = await Promise.all([
      db.select().from(epaymentTransactionsTable).where(whereClause).orderBy(desc(epaymentTransactionsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(epaymentTransactionsTable).where(whereClause),
    ]);

    res.json({
      data: txns.map(t => ({ ...t, amount: Number(t.amount), refundAmount: t.refundAmount ? Number(t.refundAmount) : null })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/transactions/:id/reconcile", requireAuth, requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [txn] = await db.select().from(epaymentTransactionsTable)
      .where(and(eq(epaymentTransactionsTable.id, req.params.id), eq(epaymentTransactionsTable.tenantId, tenantId))).limit(1);
    if (!txn) { res.status(404).json({ error: "not_found" }); return; }
    if (txn.glReconciled) { res.status(400).json({ error: "bad_request", message: "Already reconciled" }); return; }

    await db.insert(journalEntriesTable).values({
      tenantId, referenceType: "E-Payment", referenceId: txn.id,
      description: `E-payment via ${txn.gateway} - ${Number(txn.amount)} EGP`,
      totalDebit: txn.amount, totalCredit: txn.amount,
    });

    const [updated] = await db.update(epaymentTransactionsTable).set({
      glReconciled: true, reconciledAt: new Date(), updatedAt: new Date(),
    }).where(eq(epaymentTransactionsTable.id, txn.id)).returning();

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/webhook/:gateway", async (req, res) => {
  try {
    const gatewayName = req.params.gateway;
    const gw = getGateway(gatewayName);
    if (!gw) { res.status(404).json({ error: "not_found" }); return; }

    if (gw.verifyWebhook) {
      const isValid = gw.verifyWebhook(req.body, req.headers as Record<string, string>);
      if (!isValid) {
        console.warn(`Webhook signature verification failed for gateway: ${gatewayName}`);
        res.status(401).json({ error: "invalid_webhook_signature" });
        return;
      }
    }

    const { transactionId, status, orderId } = req.body;
    if (orderId) {
      const newStatus = status === "completed" || status === "PAID" ? "Completed" : status === "failed" || status === "FAILED" ? "Failed" : "Pending";
      await db.update(epaymentTransactionsTable).set({
        externalTransactionId: transactionId,
        status: newStatus,
        gatewayResponse: req.body,
        updatedAt: new Date(),
      }).where(eq(epaymentTransactionsTable.id, orderId));
    }
    res.json({ received: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

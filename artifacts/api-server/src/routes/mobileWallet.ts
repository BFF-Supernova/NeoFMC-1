import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleMobileWallet"));

const WALLET_PROVIDERS = {
  vodafone_cash: { name: "Vodafone Cash", nameAr: "فودافون كاش", prefix: "010", apiBase: "https://api.vodafone.com.eg" },
  orange_money: { name: "Orange Money", nameAr: "اورنج موني", prefix: "012", apiBase: "https://api.orange.com.eg" },
  etisalat_cash: { name: "Etisalat Cash", nameAr: "اتصالات كاش", prefix: "011", apiBase: "https://api.etisalat.com.eg" },
  instapay: { name: "InstaPay", nameAr: "انستاباي", prefix: "", apiBase: "https://api.instapay.eg" },
  meeza: { name: "Meeza", nameAr: "ميزة", prefix: "", apiBase: "https://api.meeza.net" },
};

router.get("/providers", (_req, res) => {
  res.json(Object.entries(WALLET_PROVIDERS).map(([key, val]) => ({ id: key, ...val })));
});

router.post("/initiate-payment", requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { provider, walletNumber, amount, loanId, installmentId, clientId, description } = req.body;

    if (!provider || !walletNumber || !amount) {
      res.status(400).json({ error: "provider, walletNumber, and amount are required" });
      return;
    }
    if (!WALLET_PROVIDERS[provider as keyof typeof WALLET_PROVIDERS]) {
      res.status(400).json({ error: `Unknown provider. Valid: ${Object.keys(WALLET_PROVIDERS).join(", ")}` });
      return;
    }

    const transactionRef = `MW-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const [txn] = (await db.execute(sql`
      INSERT INTO mobile_wallet_transactions (tenant_id, provider, wallet_number, amount, loan_id, installment_id, client_id, description, transaction_ref, status, initiated_by)
      VALUES (${tenantId}::uuid, ${provider}, ${walletNumber}, ${amount}, ${loanId ? sql`${loanId}::uuid` : sql`NULL`}, ${installmentId ? sql`${installmentId}::uuid` : sql`NULL`}, ${clientId ? sql`${clientId}::uuid` : sql`NULL`}, ${description || null}, ${transactionRef}, 'pending', ${req.user!.id}::uuid)
      RETURNING *
    `)).rows;

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "wallet_payment_initiated", entity: "mobile_wallet_transaction", entityId: txn.id, details: { provider, amount, walletNumber: walletNumber.slice(0, 3) + "****" + walletNumber.slice(-3) } });

    res.status(201).json({ transaction: txn, message: "Payment initiated. Awaiting wallet confirmation.", paymentInstructions: { provider: WALLET_PROVIDERS[provider as keyof typeof WALLET_PROVIDERS].name, reference: transactionRef, amount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/webhook/:provider", async (req, res) => {
  try {
    const { provider } = req.params;
    const { transactionRef, status, providerRef } = req.body;

    if (!transactionRef || !status) {
      res.status(400).json({ error: "transactionRef and status required" });
      return;
    }

    const newStatus = status === "success" ? "completed" : status === "failed" ? "failed" : "pending";
    const result = await db.execute(sql`
      UPDATE mobile_wallet_transactions SET status = ${newStatus}, provider_reference = ${providerRef || null}, completed_at = ${newStatus === 'completed' ? sql`NOW()` : sql`NULL`}, updated_at = NOW()
      WHERE transaction_ref = ${transactionRef} AND provider = ${provider}
      RETURNING id
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "transaction_not_found" });
      return;
    }

    res.json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/transactions", requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { provider, status, startDate, endDate } = req.query;
    let query = sql`SELECT mwt.*, c.full_name_ar as client_name FROM mobile_wallet_transactions mwt LEFT JOIN clients c ON mwt.client_id = c.id WHERE mwt.tenant_id = ${tenantId}::uuid`;
    if (provider) query = sql`${query} AND mwt.provider = ${provider}`;
    if (status) query = sql`${query} AND mwt.status = ${status}`;
    if (startDate) query = sql`${query} AND mwt.created_at >= ${startDate}::timestamp`;
    if (endDate) query = sql`${query} AND mwt.created_at <= ${endDate}::timestamp`;
    query = sql`${query} ORDER BY mwt.created_at DESC LIMIT 500`;
    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

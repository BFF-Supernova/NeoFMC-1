import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleInsurance"));

router.get("/products", requireRole("TenantAdmin", "CFO", "Accountant", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`
      SELECT * FROM insurance_products WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/products", requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, nameAr, type, premiumRate, premiumCalculation, coverageAmount, provider, isActive } = req.body;

    if (!name || !type || premiumRate === undefined) {
      res.status(400).json({ error: "name, type, and premiumRate are required" });
      return;
    }

    const [product] = (await db.execute(sql`
      INSERT INTO insurance_products (tenant_id, name, name_ar, type, premium_rate, premium_calculation, coverage_amount, provider, is_active)
      VALUES (${tenantId}::uuid, ${name}, ${nameAr || null}, ${type}, ${premiumRate}, ${premiumCalculation || 'percentage_of_loan'}, ${coverageAmount || null}, ${provider || null}, ${isActive !== false})
      RETURNING *
    `)).rows;

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "create_insurance_product", entity: "insurance_product", entityId: product.id, details: { name, type } });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/policies", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { loanId, clientId, status } = req.query;
    let query = sql`SELECT ip.*, ins.name as product_name, c.full_name_ar as client_name
      FROM insurance_policies ip
      JOIN insurance_products ins ON ip.product_id = ins.id
      JOIN clients c ON ip.client_id = c.id
      WHERE ip.tenant_id = ${tenantId}::uuid`;
    if (loanId) query = sql`${query} AND ip.loan_id = ${loanId}::uuid`;
    if (clientId) query = sql`${query} AND ip.client_id = ${clientId}::uuid`;
    if (status) query = sql`${query} AND ip.status = ${status}`;
    query = sql`${query} ORDER BY ip.created_at DESC`;
    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/policies", requireRole("TenantAdmin", "BranchManager", "LoanOfficer", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { productId, clientId, loanId, premiumAmount, coverageAmount, startDate, endDate, beneficiary } = req.body;

    if (!productId || !clientId || !premiumAmount) {
      res.status(400).json({ error: "productId, clientId, and premiumAmount are required" });
      return;
    }

    const [policy] = (await db.execute(sql`
      INSERT INTO insurance_policies (tenant_id, product_id, client_id, loan_id, premium_amount, coverage_amount, start_date, end_date, beneficiary, status)
      VALUES (${tenantId}::uuid, ${productId}::uuid, ${clientId}::uuid, ${loanId ? sql`${loanId}::uuid` : sql`NULL`}, ${premiumAmount}, ${coverageAmount || null}, ${startDate || sql`NOW()`}, ${endDate || null}, ${beneficiary || null}, 'active')
      RETURNING *
    `)).rows;

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "create_insurance_policy", entity: "insurance_policy", entityId: policy.id, details: { clientId, loanId } });
    res.status(201).json(policy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/claims", requireRole("TenantAdmin", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { policyId, claimType, claimAmount, description, supportingDocuments } = req.body;

    if (!policyId || !claimType) {
      res.status(400).json({ error: "policyId and claimType are required" });
      return;
    }

    const [claim] = (await db.execute(sql`
      INSERT INTO insurance_claims (tenant_id, policy_id, claim_type, claim_amount, description, supporting_documents, status, filed_by)
      VALUES (${tenantId}::uuid, ${policyId}::uuid, ${claimType}, ${claimAmount || null}, ${description || null}, ${supportingDocuments ? JSON.stringify(supportingDocuments) : null}::jsonb, 'filed', ${req.user!.id}::uuid)
      RETURNING *
    `)).rows;

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "file_insurance_claim", entity: "insurance_claim", entityId: claim.id, details: { policyId, claimType } });
    res.status(201).json(claim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/claims", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`
      SELECT ic.*, ip.premium_amount, ins.name as product_name, c.full_name_ar as client_name
      FROM insurance_claims ic
      JOIN insurance_policies ip ON ic.policy_id = ip.id
      JOIN insurance_products ins ON ip.product_id = ins.id
      JOIN clients c ON ip.client_id = c.id
      WHERE ic.tenant_id = ${tenantId}::uuid ORDER BY ic.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/claims/:id/status", requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, settlementAmount, notes } = req.body;
    const validStatuses = ["filed", "under_review", "approved", "rejected", "settled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }
    const [claim] = (await db.execute(sql`
      UPDATE insurance_claims SET status = ${status}, settlement_amount = COALESCE(${settlementAmount || null}, settlement_amount), notes = COALESCE(${notes || null}, notes), updated_at = NOW()
      WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId}::uuid RETURNING *
    `)).rows;
    if (!claim) { res.status(404).json({ error: "claim_not_found" }); return; }
    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: `insurance_claim_${status}`, entity: "insurance_claim", entityId: claim.id, details: { status } });
    res.json(claim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/calculate-premium", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { productId, loanAmount, termMonths } = req.query;
    if (!productId || !loanAmount) {
      res.status(400).json({ error: "productId and loanAmount are required" });
      return;
    }
    const [product] = (await db.execute(sql`
      SELECT * FROM insurance_products WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid
    `)).rows;
    if (!product) { res.status(404).json({ error: "product_not_found" }); return; }

    const amount = Number(loanAmount);
    const rate = Number(product.premium_rate) / 100;
    let premium = amount * rate;
    if (product.premium_calculation === "per_month" && termMonths) {
      premium = amount * rate * Number(termMonths);
    }
    const perInstallment = termMonths ? premium / Number(termMonths) : premium;

    res.json({ totalPremium: Math.round(premium * 100) / 100, perInstallment: Math.round(perInstallment * 100) / 100, coverageAmount: product.coverage_amount || amount, productName: product.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

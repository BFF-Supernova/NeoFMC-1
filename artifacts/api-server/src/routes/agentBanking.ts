import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleAgentBanking"));

router.get("/agents", requireRole("TenantAdmin", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`SELECT * FROM banking_agents WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/agents", requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, nameAr, phone, address, branchId, agentType, commissionRate, floatLimit } = req.body;
    if (!name || !phone || !agentType) {
      res.status(400).json({ error: "name, phone, and agentType are required" });
      return;
    }
    const [agent] = (await db.execute(sql`
      INSERT INTO banking_agents (tenant_id, name, name_ar, phone, address, branch_id, agent_type, commission_rate, float_limit, float_balance, status)
      VALUES (${tenantId}::uuid, ${name}, ${nameAr || null}, ${phone}, ${address || null}, ${branchId ? sql`${branchId}::uuid` : sql`NULL`}, ${agentType}, ${commissionRate || 0}, ${floatLimit || 50000}, 0, 'active')
      RETURNING *
    `)).rows;
    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "create_agent", entity: "banking_agent", entityId: agent.id, details: { name, agentType } });
    res.status(201).json(agent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/agents/:id/float", requireRole("TenantAdmin", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { amount, type, reference } = req.body;
    if (!amount || !type || !["top_up", "withdrawal"].includes(type)) {
      res.status(400).json({ error: "amount and type (top_up/withdrawal) required" });
      return;
    }
    const op = type === "top_up" ? sql`float_balance + ${amount}` : sql`float_balance - ${amount}`;
    const [agent] = (await db.execute(sql`
      UPDATE banking_agents SET float_balance = ${op}, updated_at = NOW()
      WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId}::uuid RETURNING *
    `)).rows;
    if (!agent) { res.status(404).json({ error: "agent_not_found" }); return; }

    await db.execute(sql`
      INSERT INTO agent_transactions (tenant_id, agent_id, type, amount, reference, performed_by)
      VALUES (${tenantId}::uuid, ${req.params.id}::uuid, ${type}, ${amount}, ${reference || null}, ${req.user!.id}::uuid)
    `);
    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: `agent_float_${type}`, entity: "banking_agent", entityId: req.params.id, details: { amount, type } });
    res.json(agent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { agentId, clientId, loanId, type, amount, reference } = req.body;
    if (!agentId || !type || !amount) {
      res.status(400).json({ error: "agentId, type, and amount are required" });
      return;
    }
    const [txn] = (await db.execute(sql`
      INSERT INTO agent_transactions (tenant_id, agent_id, client_id, loan_id, type, amount, reference, performed_by, status)
      VALUES (${tenantId}::uuid, ${agentId}::uuid, ${clientId ? sql`${clientId}::uuid` : sql`NULL`}, ${loanId ? sql`${loanId}::uuid` : sql`NULL`}, ${type}, ${amount}, ${reference || null}, ${req.user!.id}::uuid, 'completed')
      RETURNING *
    `)).rows;
    res.status(201).json(txn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { agentId, startDate, endDate } = req.query;
    let query = sql`SELECT at.*, ba.name as agent_name FROM agent_transactions at JOIN banking_agents ba ON at.agent_id = ba.id WHERE at.tenant_id = ${tenantId}::uuid`;
    if (agentId) query = sql`${query} AND at.agent_id = ${agentId}::uuid`;
    if (startDate) query = sql`${query} AND at.created_at >= ${startDate}::timestamp`;
    if (endDate) query = sql`${query} AND at.created_at <= ${endDate}::timestamp`;
    query = sql`${query} ORDER BY at.created_at DESC LIMIT 500`;
    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/reconciliation", requireRole("TenantAdmin", "BranchManager", "Accountant", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`
      SELECT ba.id, ba.name, ba.float_balance, ba.float_limit,
        COUNT(at.id) as transaction_count,
        COALESCE(SUM(CASE WHEN at.type = 'collection' THEN at.amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN at.type = 'disbursement' THEN at.amount ELSE 0 END), 0) as total_disbursed,
        COALESCE(SUM(CASE WHEN at.type IN ('collection', 'disbursement') THEN at.amount * ba.commission_rate / 100 ELSE 0 END), 0) as total_commission
      FROM banking_agents ba
      LEFT JOIN agent_transactions at ON ba.id = at.agent_id AND at.created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE ba.tenant_id = ${tenantId}::uuid
      GROUP BY ba.id, ba.name, ba.float_balance, ba.float_limit
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

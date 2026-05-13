import { Router } from "express";
import { db, salesAgentsTable, commissionsTable, productCommissionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const agents = await db.select().from(salesAgentsTable)
      .where(eq(salesAgentsTable.tenantId, tenantId))
      .orderBy(desc(salesAgentsTable.createdAt));

    const result = [];
    for (const agent of agents) {
      const [{ totalEarned }] = await db.select({ totalEarned: sql<number>`coalesce(sum(commission_amount), 0)` })
        .from(commissionsTable).where(and(eq(commissionsTable.agentId, agent.id), eq(commissionsTable.tenantId, tenantId), eq(commissionsTable.status, "Paid")));
      const [{ pendingAmount }] = await db.select({ pendingAmount: sql<number>`coalesce(sum(commission_amount), 0)` })
        .from(commissionsTable).where(and(eq(commissionsTable.agentId, agent.id), eq(commissionsTable.tenantId, tenantId), eq(commissionsTable.status, "Pending")));
      result.push({
        ...formatAgent(agent),
        totalEarned: Number(totalEarned),
        pendingAmount: Number(pendingAmount),
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { agentName, agentNameAr, agentType, companyName, phone, email, nationalId, defaultCommissionPct } = req.body;
    if (!agentName || !agentType) {
      res.status(400).json({ error: "bad_request", message: "agentName and agentType required" });
      return;
    }
    const [agent] = await db.insert(salesAgentsTable).values({
      tenantId, agentName, agentNameAr, agentType, companyName, phone, email, nationalId,
      defaultCommissionPct: (defaultCommissionPct || 0).toString(),
      isActive: true,
    }).returning();
    res.status(201).json({ ...formatAgent(agent), totalEarned: 0, pendingAmount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { agentName, agentNameAr, agentType, companyName, phone, email, nationalId, defaultCommissionPct, isActive } = req.body;
    const [updated] = await db.update(salesAgentsTable)
      .set({ agentName, agentNameAr, agentType, companyName, phone, email, nationalId,
        defaultCommissionPct: defaultCommissionPct?.toString(), isActive, updatedAt: new Date() })
      .where(and(eq(salesAgentsTable.id, req.params.id), eq(salesAgentsTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    const [{ totalEarned }] = await db.select({ totalEarned: sql<number>`coalesce(sum(commission_amount), 0)` })
      .from(commissionsTable).where(and(eq(commissionsTable.agentId, updated.id), eq(commissionsTable.tenantId, tenantId), eq(commissionsTable.status, "Paid")));
    const [{ pendingAmount }] = await db.select({ pendingAmount: sql<number>`coalesce(sum(commission_amount), 0)` })
      .from(commissionsTable).where(and(eq(commissionsTable.agentId, updated.id), eq(commissionsTable.tenantId, tenantId), eq(commissionsTable.status, "Pending")));
    res.json({ ...formatAgent(updated), totalEarned: Number(totalEarned), pendingAmount: Number(pendingAmount) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatAgent(a: typeof salesAgentsTable.$inferSelect) {
  return {
    id: a.id, tenantId: a.tenantId, agentName: a.agentName, agentNameAr: a.agentNameAr,
    agentType: a.agentType, companyName: a.companyName, phone: a.phone, email: a.email,
    nationalId: a.nationalId, defaultCommissionPct: Number(a.defaultCommissionPct),
    isActive: a.isActive, createdAt: a.createdAt,
  };
}

export default router;

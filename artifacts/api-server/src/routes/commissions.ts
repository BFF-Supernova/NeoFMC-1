import { Router } from "express";
import { db, commissionsTable, salesAgentsTable, productCommissionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/commissions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const agentId = req.query.agentId as string | undefined;

    let whereClause = eq(commissionsTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(commissionsTable.status, status)) as typeof whereClause;
    if (agentId) whereClause = and(whereClause, eq(commissionsTable.agentId, agentId)) as typeof whereClause;

    const [commissions, [{ count }], [{ totalPending }], [{ totalPaid }]] = await Promise.all([
      db.select().from(commissionsTable).where(whereClause).orderBy(desc(commissionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(commissionsTable).where(whereClause),
      db.select({ totalPending: sql<number>`coalesce(sum(commission_amount), 0)` }).from(commissionsTable).where(and(eq(commissionsTable.tenantId, tenantId), eq(commissionsTable.status, "Pending"))),
      db.select({ totalPaid: sql<number>`coalesce(sum(commission_amount), 0)` }).from(commissionsTable).where(and(eq(commissionsTable.tenantId, tenantId), eq(commissionsTable.status, "Paid"))),
    ]);

    const agentIds = [...new Set(commissions.map(c => c.agentId))];
    const agentMap = new Map<string, string>();
    for (const id of agentIds) {
      const [a] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, id)).limit(1);
      if (a) agentMap.set(id, a.agentName);
    }

    res.json({
      data: commissions.map(c => ({
        id: c.id, agentId: c.agentId, agentName: agentMap.get(c.agentId) || "",
        loanId: c.loanId, disbursedAmount: Number(c.disbursedAmount),
        commissionPct: Number(c.commissionPct), commissionAmount: Number(c.commissionAmount),
        status: c.status, paidAt: c.paidAt, createdAt: c.createdAt,
      })),
      total: Number(count), page, limit,
      totalPending: Number(totalPending), totalPaid: Number(totalPaid),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/commissions/:id/pay", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [updated] = await db.update(commissionsTable)
      .set({ status: "Paid", paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(commissionsTable.id, req.params.id), eq(commissionsTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, updated.agentId)).limit(1);
    res.json({
      id: updated.id, agentId: updated.agentId, agentName: agent?.agentName || "",
      loanId: updated.loanId, disbursedAmount: Number(updated.disbursedAmount),
      commissionPct: Number(updated.commissionPct), commissionAmount: Number(updated.commissionAmount),
      status: updated.status, paidAt: updated.paidAt, createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/product-commissions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    let whereClause = eq(productCommissionsTable.tenantId, tenantId);
    const productId = req.query.productId as string | undefined;
    if (productId) whereClause = and(whereClause, eq(productCommissionsTable.productId, productId)) as typeof whereClause;

    const pcs = await db.select().from(productCommissionsTable).where(whereClause);
    const result = [];
    for (const pc of pcs) {
      const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, pc.agentId)).limit(1);
      result.push({
        id: pc.id, productId: pc.productId, agentId: pc.agentId,
        agentName: agent?.agentName || "", commissionPct: Number(pc.commissionPct),
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/product-commissions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { productId, agentId, commissionPct } = req.body;
    if (!productId || !agentId || commissionPct === undefined) {
      res.status(400).json({ error: "bad_request" }); return;
    }

    const existing = await db.select().from(productCommissionsTable)
      .where(and(eq(productCommissionsTable.tenantId, tenantId), eq(productCommissionsTable.productId, productId), eq(productCommissionsTable.agentId, agentId))).limit(1);

    let pc;
    if (existing.length > 0) {
      [pc] = await db.update(productCommissionsTable)
        .set({ commissionPct: commissionPct.toString() })
        .where(eq(productCommissionsTable.id, existing[0].id))
        .returning();
    } else {
      [pc] = await db.insert(productCommissionsTable).values({
        tenantId, productId, agentId, commissionPct: commissionPct.toString(),
      }).returning();
    }

    const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, agentId)).limit(1);
    res.json({
      id: pc.id, productId: pc.productId, agentId: pc.agentId,
      agentName: agent?.agentName || "", commissionPct: Number(pc.commissionPct),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

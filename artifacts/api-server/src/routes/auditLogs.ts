import { Router } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, requireRole("TenantAdmin", "BranchManager", "Auditor", "FinancialController", "CFO", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    let whereClause = eq(auditLogsTable.tenantId, tenantId);
    if (entity) whereClause = and(whereClause, eq(auditLogsTable.entity, entity)) as typeof whereClause;
    if (action) whereClause = and(whereClause, eq(auditLogsTable.action, action)) as typeof whereClause;
    if (from) whereClause = and(whereClause, gte(auditLogsTable.createdAt, new Date(from))) as typeof whereClause;
    if (to) whereClause = and(whereClause, lte(auditLogsTable.createdAt, new Date(to))) as typeof whereClause;

    const [rows, [{ count }]] = await Promise.all([
      db.select().from(auditLogsTable).where(whereClause).orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(auditLogsTable).where(whereClause),
    ]);

    res.json({ data: rows, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

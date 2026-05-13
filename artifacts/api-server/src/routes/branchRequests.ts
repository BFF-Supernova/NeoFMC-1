import { Router } from "express";
import { db, branchRequestsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const requestType = req.query.requestType as string | undefined;

    let whereClause = eq(branchRequestsTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(branchRequestsTable.status, status)) as typeof whereClause;
    if (requestType) whereClause = and(whereClause, eq(branchRequestsTable.requestType, requestType)) as typeof whereClause;

    const [requests, [{ count }]] = await Promise.all([
      db.select().from(branchRequestsTable).where(whereClause).orderBy(desc(branchRequestsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(branchRequestsTable).where(whereClause),
    ]);

    res.json({ data: requests, total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, requestType, referenceId, referenceLabel, description, data } = req.body;
    if (!branchId || !requestType) {
      res.status(400).json({ error: "bad_request", message: "branchId, requestType required" });
      return;
    }

    const validTypes = ["EarlySettlement", "Rescheduling", "PaymentReversal", "WriteOff", "LoanCancellation", "Other"];
    if (!validTypes.includes(requestType)) {
      res.status(400).json({ error: "bad_request", message: `requestType must be one of: ${validTypes.join(", ")}` });
      return;
    }

    const [request] = await db.insert(branchRequestsTable).values({
      tenantId, branchId, requestType, referenceId, referenceLabel, description, data,
      requestedById: req.user!.id,
      requestedByName: req.user!.fullName,
      status: "Pending",
    }).returning();

    res.status(201).json(request);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/review", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { action, rejectionReason } = req.body;
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "bad_request", message: "action must be 'approve' or 'reject'" });
      return;
    }

    const [request] = await db.select().from(branchRequestsTable)
      .where(and(eq(branchRequestsTable.id, req.params.id), eq(branchRequestsTable.tenantId, tenantId))).limit(1);
    if (!request) { res.status(404).json({ error: "not_found" }); return; }

    const updateData: Record<string, unknown> = {
      status: action === "approve" ? "Approved" : "Rejected",
      reviewedById: req.user!.id,
      reviewedByName: req.user!.fullName,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };
    if (action === "reject") updateData.rejectionReason = rejectionReason;

    const [updated] = await db.update(branchRequestsTable).set(updateData)
      .where(eq(branchRequestsTable.id, request.id)).returning();

    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(branchRequestsTable)
      .where(and(eq(branchRequestsTable.tenantId, tenantId), eq(branchRequestsTable.status, "Pending")));
    const [approved] = await db.select({ count: sql<number>`count(*)` }).from(branchRequestsTable)
      .where(and(eq(branchRequestsTable.tenantId, tenantId), eq(branchRequestsTable.status, "Approved")));
    const [rejected] = await db.select({ count: sql<number>`count(*)` }).from(branchRequestsTable)
      .where(and(eq(branchRequestsTable.tenantId, tenantId), eq(branchRequestsTable.status, "Rejected")));

    res.json({ pending: Number(pending.count), approved: Number(approved.count), rejected: Number(rejected.count) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

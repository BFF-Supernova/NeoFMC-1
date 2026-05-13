import { Router } from "express";
import { db, collectionActivitiesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const loanId = req.query.loanId as string | undefined;

    let whereClause = eq(collectionActivitiesTable.tenantId, tenantId);
    if (loanId) whereClause = and(whereClause, eq(collectionActivitiesTable.loanId, loanId)) as typeof whereClause;

    const [activities, [{ count }]] = await Promise.all([
      db.select().from(collectionActivitiesTable).where(whereClause).orderBy(desc(collectionActivitiesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(collectionActivitiesTable).where(whereClause),
    ]);

    res.json({ data: activities, total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { loanId, clientId, activityType, channel, contactDate, outcome, notes, nextFollowUpDate, assignedCollectorId, assignedCollectorName, thirdPartyCompany, region } = req.body;
    if (!loanId || !activityType) {
      res.status(400).json({ error: "bad_request", message: "loanId, activityType required" });
      return;
    }

    const [activity] = await db.insert(collectionActivitiesTable).values({
      tenantId, loanId, clientId: clientId || null,
      activityType, channel: channel || "Phone",
      contactDate: contactDate || new Date().toISOString().split("T")[0],
      outcome, notes, nextFollowUpDate: nextFollowUpDate || null,
      assignedCollectorId, assignedCollectorName,
      thirdPartyCompany, region,
      createdById: req.user!.id,
    }).returning();

    res.status(201).json(activity);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

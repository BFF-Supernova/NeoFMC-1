import { Router } from "express";
import { db, holidaysTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const year = req.query.year as string;

    let whereClause: any = eq(holidaysTable.tenantId, tenantId);
    if (year) {
      whereClause = and(whereClause, sql`EXTRACT(YEAR FROM ${holidaysTable.holidayDate}) = ${Number(year)}`);
    }

    const holidays = await db.select().from(holidaysTable)
      .where(whereClause)
      .orderBy(holidaysTable.holidayDate);

    res.json(holidays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, holidayDate, isRecurring } = req.body;

    if (!name || !holidayDate) {
      res.status(400).json({ error: "bad_request", message: "name and holidayDate are required" });
      return;
    }

    const [holiday] = await db.insert(holidaysTable).values({
      tenantId, name, nameAr: nameAr || null,
      holidayDate, isRecurring: isRecurring || false,
    }).returning();

    res.status(201).json(holiday);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, holidayDate, isRecurring } = req.body;

    const [updated] = await db.update(holidaysTable)
      .set({ name, nameAr, holidayDate, isRecurring })
      .where(and(eq(holidaysTable.id, req.params.id), eq(holidaysTable.tenantId, tenantId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [deleted] = await db.delete(holidaysTable)
      .where(and(eq(holidaysTable.id, req.params.id), eq(holidaysTable.tenantId, tenantId)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

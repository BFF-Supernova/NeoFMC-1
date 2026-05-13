import { Router } from "express";
import { db, blacklistsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const listType = req.query.listType as string | undefined;

    let whereClause = eq(blacklistsTable.tenantId, tenantId);
    if (listType) {
      whereClause = and(whereClause, eq(blacklistsTable.listType, listType)) as typeof whereClause;
    }

    const rows = await db.select().from(blacklistsTable).where(whereClause);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (!["TenantAdmin", "BranchManager"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Insufficient permissions to modify blacklist" });
      return;
    }
    const { nationalId, fullName, listType, reason, source } = req.body;
    if (!nationalId || !fullName) {
      res.status(400).json({ error: "bad_request", message: "nationalId and fullName required" });
      return;
    }

    const [existing] = await db.select().from(blacklistsTable)
      .where(and(eq(blacklistsTable.tenantId, tenantId), eq(blacklistsTable.nationalId, nationalId)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "duplicate", message: "National ID already blacklisted" });
      return;
    }

    const [row] = await db.insert(blacklistsTable).values({
      tenantId,
      nationalId,
      fullName,
      listType: listType || "unfavorable",
      reason: reason || null,
      source: source || null,
      addedById: req.user!.id,
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (!["TenantAdmin", "BranchManager"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Insufficient permissions to modify blacklist" });
      return;
    }

    const [deleted] = await db.delete(blacklistsTable)
      .where(and(eq(blacklistsTable.id, req.params.id), eq(blacklistsTable.tenantId, tenantId)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "not_found" }); return; }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/check/:nationalId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const rows = await db.select().from(blacklistsTable)
      .where(and(eq(blacklistsTable.tenantId, tenantId), eq(blacklistsTable.nationalId, req.params.nationalId)));

    res.json({
      nationalId: req.params.nationalId,
      isBlacklisted: rows.length > 0,
      entries: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { db, branchesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateBranchCode } from "../lib/refGenerator";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const branches = await db.select().from(branchesTable)
      .where(eq(branchesTable.tenantId, tenantId))
      .orderBy(desc(branchesTable.createdAt));
    res.json(branches.map(formatBranch));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchNameAr, branchNameEn, spendingLimit, locationData } = req.body;
    if (!branchNameAr) { res.status(400).json({ error: "bad_request", message: "branchNameAr required" }); return; }
    const { branchCode, branchSeq } = await generateBranchCode(tenantId);
    const [branch] = await db.insert(branchesTable).values({
      tenantId,
      branchNameAr,
      branchNameEn,
      branchCode,
      branchSeq,
      spendingLimit: spendingLimit?.toString(),
      locationData,
    }).returning();
    res.status(201).json(formatBranch(branch));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { id } = req.params;
    const { branchNameAr, branchNameEn, spendingLimit, locationData } = req.body;
    const [updated] = await db.update(branchesTable)
      .set({ branchNameAr, branchNameEn, spendingLimit: spendingLimit?.toString(), locationData, updatedAt: new Date() })
      .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(formatBranch(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { id } = req.params;
    await db.delete(branchesTable).where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, tenantId)));
    res.json({ success: true, message: "Branch deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatBranch(b: typeof branchesTable.$inferSelect) {
  return {
    id: b.id,
    tenantId: b.tenantId,
    branchCode: b.branchCode || null,
    branchSeq: b.branchSeq || null,
    branchNameAr: b.branchNameAr,
    branchNameEn: b.branchNameEn,
    mainCashBoxBalance: Number(b.mainCashBoxBalance),
    spendingLimit: b.spendingLimit ? Number(b.spendingLimit) : null,
    locationData: b.locationData,
    createdAt: b.createdAt,
  };
}

export default router;

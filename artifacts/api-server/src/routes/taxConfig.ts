import { Router } from "express";
import { db, taxCodesTable, incomeTaxBracketsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/codes", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const codes = await db.select().from(taxCodesTable).where(eq(taxCodesTable.tenantId, tenantId));
    res.json({ data: codes.map(c => ({ ...c, rate: Number(c.rate) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/codes", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { code, name, nameAr, type, rate, description } = req.body;
    if (!code || !name || !type || rate === undefined) { res.status(400).json({ error: "bad_request", message: "code, name, type, rate required" }); return; }
    const [tc] = await db.insert(taxCodesTable).values({ tenantId, code, name, nameAr, type, rate: rate.toString(), description }).returning();
    res.status(201).json({ ...tc, rate: Number(tc.rate) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/codes/:id", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, rate, isActive, description } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (rate !== undefined) updateData.rate = rate.toString();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;
    const [updated] = await db.update(taxCodesTable).set(updateData)
      .where(and(eq(taxCodesTable.id, req.params.id), eq(taxCodesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, rate: Number(updated.rate) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/brackets", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const year = Number(req.query.year) || new Date().getFullYear();
    const brackets = await db.select().from(incomeTaxBracketsTable)
      .where(and(eq(incomeTaxBracketsTable.tenantId, tenantId), eq(incomeTaxBracketsTable.fiscalYear, year)));
    res.json({ data: brackets.map(b => ({ ...b, fromAmount: Number(b.fromAmount), toAmount: Number(b.toAmount), rate: Number(b.rate) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/brackets/seed", requireAuth, requireRole("TenantAdmin", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const year = Number(req.body.fiscalYear) || new Date().getFullYear();
    const egyptBrackets = [
      { fromAmount: "0", toAmount: "40000", rate: "0", orderIndex: 1 },
      { fromAmount: "40000", toAmount: "55000", rate: "10", orderIndex: 2 },
      { fromAmount: "55000", toAmount: "70000", rate: "15", orderIndex: 3 },
      { fromAmount: "70000", toAmount: "200000", rate: "20", orderIndex: 4 },
      { fromAmount: "200000", toAmount: "400000", rate: "22.5", orderIndex: 5 },
      { fromAmount: "400000", toAmount: "600000", rate: "25", orderIndex: 6 },
      { fromAmount: "600000", toAmount: "700000", rate: "27.5", orderIndex: 7 },
      { fromAmount: "700000", toAmount: "9999999999", rate: "27.5", orderIndex: 8 },
    ];
    for (const b of egyptBrackets) {
      await db.insert(incomeTaxBracketsTable).values({ tenantId, ...b, fiscalYear: year });
    }
    res.json({ message: `Egyptian tax brackets seeded for ${year}`, count: egyptBrackets.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

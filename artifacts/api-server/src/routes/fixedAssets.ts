import { Router } from "express";
import { db, fixedAssetsTable, assetCategoriesTable, depreciationEntriesTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
const ASSET_ROLES = ["TenantAdmin", "BranchManager", "Accountant", "Auditor", "FinancialController", "CFO"] as const;

router.get("/categories", requireAuth, requireRole(...ASSET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const rows = await db.select().from(assetCategoriesTable).where(eq(assetCategoriesTable.tenantId, tenantId));
    res.json({ data: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/categories", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, depreciationMethod, defaultUsefulLifeMonths, assetAccountId, depreciationAccountId, accumulatedDepAccountId } = req.body;
    if (!name) { res.status(400).json({ error: "bad_request", message: "name required" }); return; }
    const [cat] = await db.insert(assetCategoriesTable).values({
      tenantId, name, nameAr, depreciationMethod: depreciationMethod || "StraightLine",
      defaultUsefulLifeMonths: defaultUsefulLifeMonths || 60,
      assetAccountId, depreciationAccountId, accumulatedDepAccountId,
    }).returning();
    res.status(201).json(cat);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/", requireAuth, requireRole(...ASSET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;

    let where = eq(fixedAssetsTable.tenantId, tenantId);
    if (status) where = and(where, eq(fixedAssetsTable.status, status)) as typeof where;
    if (branchId) where = and(where, eq(fixedAssetsTable.branchId, branchId)) as typeof where;

    const [assets, [{ count }]] = await Promise.all([
      db.select().from(fixedAssetsTable).where(where).orderBy(desc(fixedAssetsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(fixedAssetsTable).where(where),
    ]);
    res.json({ data: assets.map(a => ({ ...a, purchaseCost: Number(a.purchaseCost), salvageValue: Number(a.salvageValue), accumulatedDepreciation: Number(a.accumulatedDepreciation), netBookValue: Number(a.netBookValue) })), total: Number(count), page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, categoryId, assetCode, name, nameAr, description, serialNumber, purchaseDate, purchaseCost, salvageValue, usefulLifeMonths, depreciationMethod, location, assignedToId, warrantyExpiry, documentUrls } = req.body;
    if (!branchId || !assetCode || !name || !purchaseDate || !purchaseCost) {
      res.status(400).json({ error: "bad_request", message: "branchId, assetCode, name, purchaseDate, purchaseCost required" }); return;
    }
    const cost = Number(purchaseCost);
    const salvage = Number(salvageValue || 0);
    const [asset] = await db.insert(fixedAssetsTable).values({
      tenantId, branchId, categoryId, assetCode, name, nameAr, description, serialNumber,
      purchaseDate, purchaseCost: cost.toString(), salvageValue: salvage.toString(),
      usefulLifeMonths: usefulLifeMonths || 60, depreciationMethod: depreciationMethod || "StraightLine",
      netBookValue: cost.toString(), location, assignedToId, warrantyExpiry,
      documentUrls: documentUrls || null, createdById: req.user!.id,
    }).returning();
    res.status(201).json({ ...asset, purchaseCost: Number(asset.purchaseCost), netBookValue: Number(asset.netBookValue) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin", "Accountant"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, description, location, assignedToId, warrantyExpiry, serialNumber } = req.body;
    const [updated] = await db.update(fixedAssetsTable).set({ name, nameAr, description, location, assignedToId, warrantyExpiry, serialNumber, updatedAt: new Date() })
      .where(and(eq(fixedAssetsTable.id, req.params.id), eq(fixedAssetsTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, purchaseCost: Number(updated.purchaseCost), netBookValue: Number(updated.netBookValue) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/:id/dispose", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { disposalDate, disposalAmount, disposalMethod } = req.body;
    if (!disposalDate || disposalAmount === undefined) { res.status(400).json({ error: "bad_request", message: "disposalDate, disposalAmount required" }); return; }

    const [asset] = await db.select().from(fixedAssetsTable).where(and(eq(fixedAssetsTable.id, req.params.id), eq(fixedAssetsTable.tenantId, tenantId))).limit(1);
    if (!asset) { res.status(404).json({ error: "not_found" }); return; }
    if (asset.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Asset not active" }); return; }

    const nbv = Number(asset.netBookValue);
    const saleAmount = Number(disposalAmount);
    const gainLoss = saleAmount - nbv;

    const [updated] = await db.update(fixedAssetsTable).set({
      status: "Disposed", disposalDate, disposalAmount: saleAmount.toString(),
      disposalMethod: disposalMethod || "Sale", disposalGainLoss: gainLoss.toString(),
      netBookValue: "0.00", updatedAt: new Date(),
    }).where(eq(fixedAssetsTable.id, asset.id)).returning();

    await db.insert(journalEntriesTable).values({
      tenantId, branchId: asset.branchId, referenceType: "AssetDisposal", referenceId: asset.id,
      description: `Disposal of ${asset.name} - ${disposalMethod || "Sale"}`,
      totalDebit: saleAmount.toString(), totalCredit: saleAmount.toString(),
    });

    res.json({ ...updated, purchaseCost: Number(updated.purchaseCost), disposalGainLoss: gainLoss });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/run-depreciation", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { periodDate } = req.body;
    if (!periodDate) { res.status(400).json({ error: "bad_request", message: "periodDate required" }); return; }

    const activeAssets = await db.select().from(fixedAssetsTable).where(and(eq(fixedAssetsTable.tenantId, tenantId), eq(fixedAssetsTable.status, "Active")));
    let totalDepreciation = 0;
    let assetsProcessed = 0;

    for (const asset of activeAssets) {
      const cost = Number(asset.purchaseCost);
      const salvage = Number(asset.salvageValue);
      const accDep = Number(asset.accumulatedDepreciation);
      const depreciable = cost - salvage;
      if (depreciable <= 0 || accDep >= depreciable) continue;

      let monthlyDep = 0;
      if (asset.depreciationMethod === "StraightLine") {
        monthlyDep = depreciable / asset.usefulLifeMonths;
      } else {
        const rate = 2 / asset.usefulLifeMonths;
        monthlyDep = (cost - accDep) * rate;
      }
      monthlyDep = Math.round(Math.min(monthlyDep, depreciable - accDep) * 100) / 100;
      if (monthlyDep <= 0) continue;

      const newAccDep = Math.round((accDep + monthlyDep) * 100) / 100;
      const newNbv = Math.round((cost - newAccDep) * 100) / 100;

      await db.insert(depreciationEntriesTable).values({
        tenantId, assetId: asset.id, periodDate, amount: monthlyDep.toString(),
        accumulatedTotal: newAccDep.toString(), netBookValue: newNbv.toString(),
      });
      await db.update(fixedAssetsTable).set({
        accumulatedDepreciation: newAccDep.toString(), netBookValue: newNbv.toString(),
        lastDepreciationDate: periodDate, updatedAt: new Date(),
      }).where(eq(fixedAssetsTable.id, asset.id));

      totalDepreciation += monthlyDep;
      assetsProcessed++;
    }

    if (totalDepreciation > 0) {
      await db.insert(journalEntriesTable).values({
        tenantId, referenceType: "Depreciation", transactionDate: periodDate,
        description: `Monthly depreciation for ${periodDate}`,
        totalDebit: totalDepreciation.toString(), totalCredit: totalDepreciation.toString(),
      });
    }

    res.json({ assetsProcessed, totalDepreciation: Math.round(totalDepreciation * 100) / 100, periodDate });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/:id/depreciation-schedule", requireAuth, requireRole(...ASSET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const entries = await db.select().from(depreciationEntriesTable)
      .where(and(eq(depreciationEntriesTable.assetId, req.params.id), eq(depreciationEntriesTable.tenantId, tenantId)))
      .orderBy(depreciationEntriesTable.periodDate);
    res.json({ data: entries.map(e => ({ ...e, amount: Number(e.amount), accumulatedTotal: Number(e.accumulatedTotal), netBookValue: Number(e.netBookValue) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/summary", requireAuth, requireRole(...ASSET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [totals] = await db.select({
      totalAssets: sql<number>`count(*)`,
      totalCost: sql<number>`COALESCE(SUM(CAST(purchase_cost AS NUMERIC)), 0)`,
      totalDepreciation: sql<number>`COALESCE(SUM(CAST(accumulated_depreciation AS NUMERIC)), 0)`,
      totalNbv: sql<number>`COALESCE(SUM(CAST(net_book_value AS NUMERIC)), 0)`,
    }).from(fixedAssetsTable).where(and(eq(fixedAssetsTable.tenantId, tenantId), eq(fixedAssetsTable.status, "Active")));
    res.json({ totalAssets: Number(totals.totalAssets), totalCost: Number(totals.totalCost), totalDepreciation: Number(totals.totalDepreciation), totalNbv: Number(totals.totalNbv) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

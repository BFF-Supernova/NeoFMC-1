import { Router } from "express";
import { db, collateralsTable, clientsTable, loansTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const clientId = req.query.clientId as string | undefined;
    const loanId = req.query.loanId as string | undefined;

    let whereClause = eq(collateralsTable.tenantId, tenantId);
    if (clientId) whereClause = and(whereClause, eq(collateralsTable.clientId, clientId)) as any;
    if (loanId) whereClause = and(whereClause, eq(collateralsTable.loanId, loanId)) as any;

    const [data, [{ total }]] = await Promise.all([
      db.select({
        collateral: collateralsTable,
        clientNameAr: clientsTable.fullNameAr,
        clientNameEn: clientsTable.fullNameEn,
      }).from(collateralsTable)
        .leftJoin(clientsTable, eq(collateralsTable.clientId, clientsTable.id))
        .where(whereClause)
        .orderBy(desc(collateralsTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)` }).from(collateralsTable).where(whereClause),
    ]);

    res.json({
      data: data.map(d => ({
        ...d.collateral,
        estimatedValue: Number(d.collateral.estimatedValue),
        currentValue: Number(d.collateral.currentValue),
        clientNameAr: d.clientNameAr,
        clientNameEn: d.clientNameEn,
      })),
      total: Number(total), page, limit,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clientId, loanId, collateralType, description, descriptionAr, estimatedValue, registrationNumber, location, insurancePolicyNumber, insuranceExpiryDate, notes } = req.body;
    if (!clientId || !collateralType || !description || !estimatedValue) {
      res.status(400).json({ error: "bad_request", message: "clientId, collateralType, description, estimatedValue required" }); return;
    }
    const today = new Date().toISOString().split("T")[0];
    const [collateral] = await db.insert(collateralsTable).values({
      tenantId, clientId, loanId: loanId || null, collateralType, description, descriptionAr: descriptionAr || null,
      estimatedValue: estimatedValue.toString(), currentValue: estimatedValue.toString(),
      registrationNumber: registrationNumber || null, location: location || null,
      lastValuationDate: today,
      insurancePolicyNumber: insurancePolicyNumber || null,
      insuranceExpiryDate: insuranceExpiryDate || null,
      notes: notes || null,
      valuationHistory: [{ date: today, value: Number(estimatedValue), assessor: req.user!.fullName }],
      createdById: req.user!.id, createdByName: req.user!.fullName,
    }).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "CREATE", entity: "Collateral", entityId: collateral.id, details: { collateralType, estimatedValue } });
    res.status(201).json({ ...collateral, estimatedValue: Number(collateral.estimatedValue), currentValue: Number(collateral.currentValue) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [existing] = await db.select().from(collateralsTable)
      .where(and(eq(collateralsTable.id, req.params.id), eq(collateralsTable.tenantId, tenantId))).limit(1);
    if (!existing) { res.status(404).json({ error: "not_found" }); return; }

    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = ["collateralType", "description", "descriptionAr", "loanId", "registrationNumber", "location", "status", "insurancePolicyNumber", "insuranceExpiryDate", "notes"];
    for (const f of fields) { if (req.body[f] !== undefined) updates[f] = req.body[f] || null; }

    if (req.body.currentValue !== undefined) {
      const newVal = Number(req.body.currentValue);
      updates.currentValue = newVal.toString();
      updates.lastValuationDate = new Date().toISOString().split("T")[0];
      const history = (existing.valuationHistory as any[]) || [];
      history.push({ date: updates.lastValuationDate, value: newVal, assessor: req.user!.fullName });
      updates.valuationHistory = history;
    }

    const [updated] = await db.update(collateralsTable).set(updates)
      .where(eq(collateralsTable.id, req.params.id)).returning();
    res.json({ ...updated, estimatedValue: Number(updated.estimatedValue), currentValue: Number(updated.currentValue) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const [deleted] = await db.delete(collateralsTable)
      .where(and(eq(collateralsTable.id, req.params.id), eq(collateralsTable.tenantId, tenantId)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "DELETE", entity: "Collateral", entityId: req.params.id });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/coverage/:loanId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.loanId), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }

    const collaterals = await db.select().from(collateralsTable)
      .where(and(eq(collateralsTable.loanId, req.params.loanId), eq(collateralsTable.tenantId, tenantId)));

    const totalValue = collaterals.reduce((sum, c) => sum + Number(c.currentValue), 0);
    const loanAmount = Number(loan.outstandingBalance);
    const coverageRatio = loanAmount > 0 ? (totalValue / loanAmount) * 100 : 0;

    res.json({ loanId: loan.id, loanAmount, totalCollateralValue: totalValue, coverageRatio: Math.round(coverageRatio * 100) / 100, collateralCount: collaterals.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

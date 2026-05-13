import { Router } from "express";
import { db, riskCriteriaTable, clientsTable, loansTable, loanRequestsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/risk-criteria", requireAuth, requireRole("SuperAdmin", "TenantAdmin", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const criteria = await db.select().from(riskCriteriaTable)
      .where(eq(riskCriteriaTable.tenantId, tenantId))
      .orderBy(desc(riskCriteriaTable.createdAt));
    res.json(criteria.map(c => ({
      id: c.id, criteriaName: c.criteriaName, criteriaNameAr: c.criteriaNameAr,
      criteriaType: c.criteriaType, weight: c.weight, rules: c.rules, isActive: c.isActive,
      maxScore: (c.rules as any)?.maxScore || 10,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/risk-criteria", requireAuth, requireRole("SuperAdmin", "TenantAdmin", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { criteriaName, criteriaNameAr, criteriaType, weight, rules } = req.body;
    if (!criteriaName || !criteriaType || !weight || !rules) {
      res.status(400).json({ error: "bad_request" }); return;
    }
    const [criteria] = await db.insert(riskCriteriaTable).values({
      tenantId, criteriaName, criteriaNameAr, criteriaType, weight, rules, isActive: true,
    }).returning();
    res.status(201).json({
      id: criteria.id, criteriaName: criteria.criteriaName, criteriaNameAr: criteria.criteriaNameAr,
      criteriaType: criteria.criteriaType, weight: criteria.weight, rules: criteria.rules, isActive: criteria.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/risk-criteria/:id", requireAuth, requireRole("SuperAdmin", "TenantAdmin", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (role !== "SuperAdmin" && role !== "TenantAdmin") {
      res.status(403).json({ error: "forbidden", message: "Only admins can edit risk criteria" }); return;
    }
    const { id } = req.params;
    const { criteriaName, criteriaNameAr, criteriaType, weight, rules, isActive } = req.body;
    if (weight !== undefined && (typeof weight !== 'number' || weight <= 0)) {
      res.status(400).json({ error: "bad_request", message: "weight must be a positive number" }); return;
    }
    if (criteriaType !== undefined && typeof criteriaType !== 'string') {
      res.status(400).json({ error: "bad_request", message: "criteriaType must be a string" }); return;
    }
    const [existing] = await db.select().from(riskCriteriaTable)
      .where(and(eq(riskCriteriaTable.id, id), eq(riskCriteriaTable.tenantId, tenantId)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "not_found" }); return; }
    const updateData: Record<string, unknown> = {};
    if (criteriaName !== undefined) updateData.criteriaName = criteriaName;
    if (criteriaNameAr !== undefined) updateData.criteriaNameAr = criteriaNameAr;
    if (criteriaType !== undefined) updateData.criteriaType = criteriaType;
    if (weight !== undefined) updateData.weight = weight;
    if (rules !== undefined) {
      const existingRules = (existing.rules && typeof existing.rules === 'object') ? existing.rules : {};
      updateData.rules = { ...existingRules, ...rules };
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "bad_request", message: "No fields to update" }); return;
    }
    const [updated] = await db.update(riskCriteriaTable)
      .set(updateData)
      .where(and(eq(riskCriteriaTable.id, id), eq(riskCriteriaTable.tenantId, tenantId)))
      .returning();
    res.json({
      id: updated.id, criteriaName: updated.criteriaName, criteriaNameAr: updated.criteriaNameAr,
      criteriaType: updated.criteriaType, weight: updated.weight, rules: updated.rules, isActive: updated.isActive,
      maxScore: (updated.rules as any)?.maxScore || 10,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/clients/:id/risk-score", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const clientId = req.params.id;

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, tenantId))).limit(1);
    if (!client) { res.status(404).json({ error: "not_found" }); return; }

    const criteria = await db.select().from(riskCriteriaTable)
      .where(and(eq(riskCriteriaTable.tenantId, tenantId), eq(riskCriteriaTable.isActive, true)));

    let totalScore = 0;
    let maxPossibleScore = 0;
    const breakdown = [];

    for (const c of criteria) {
      maxPossibleScore += c.weight * 10;
      let score = c.weight * 5;
      let notes = "Default assessment";

      if (c.criteriaType === "Age") {
        const nid = client.nationalId;
        if (nid && nid.length >= 7) {
          const birthYear = parseInt(nid.substring(1, 3));
          const century = nid[0] === "2" ? 1900 : 2000;
          const age = new Date().getFullYear() - (century + birthYear);
          if (age >= 25 && age <= 55) { score = c.weight * 8; notes = `Age: ${age} - Optimal range`; }
          else if (age >= 18 && age < 25) { score = c.weight * 5; notes = `Age: ${age} - Young borrower`; }
          else { score = c.weight * 3; notes = `Age: ${age} - Higher risk age group`; }
        }
      } else if (c.criteriaType === "PaymentHistory") {
        const [{ loanCount }] = await db.select({ loanCount: sql<number>`count(*)` }).from(loansTable)
          .where(and(eq(loansTable.tenantId, tenantId)));
        if (Number(loanCount) > 3) { score = c.weight * 9; notes = "Excellent payment history"; }
        else if (Number(loanCount) > 0) { score = c.weight * 6; notes = "Limited history"; }
        else { score = c.weight * 4; notes = "No prior loans"; }
      } else if (c.criteriaType === "Blacklist") {
        if (client.isBlacklisted) { score = 0; notes = `Blacklisted: ${client.blacklistReason || "No reason"}`; }
        else { score = c.weight * 10; notes = "Not blacklisted"; }
      }

      totalScore += score;
      breakdown.push({ criteriaName: c.criteriaName, score, maxScore: c.weight * 10, notes });
    }

    if (criteria.length === 0) {
      maxPossibleScore = 100;
      totalScore = 50;
      breakdown.push({ criteriaName: "No criteria configured", score: 50, maxScore: 100, notes: "Configure risk criteria in Settings" });
    }

    const riskLevel = totalScore >= maxPossibleScore * 0.7 ? "Low" : totalScore >= maxPossibleScore * 0.4 ? "Medium" : "High";

    await db.update(clientsTable).set({ riskScore: totalScore, updatedAt: new Date() }).where(eq(clientsTable.id, clientId));

    res.json({ clientId, totalScore, maxPossibleScore, riskLevel, breakdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

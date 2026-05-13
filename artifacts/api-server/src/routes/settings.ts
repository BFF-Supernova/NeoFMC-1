import { Router } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function formatTenant(t: typeof tenantsTable.$inferSelect) {
  return {
    id: t.id,
    companyName: t.companyName,
    companyNameAr: t.companyNameAr,
    fraLicenseNumber: t.fraLicenseNumber,
    subscriptionPlan: t.subscriptionPlan,
    logoUrl: t.logoUrl,
    isActive: t.isActive,
    contactEmail: t.contactEmail,
    contactPhone: t.contactPhone,
    iscoreEnabled: t.iscoreEnabled,
    epaymentFawryEnabled: t.epaymentFawryEnabled,
    epaymentOpayEnabled: t.epaymentOpayEnabled,
    epaymentKhaznaEnabled: t.epaymentKhaznaEnabled,
    epaymentMeezaEnabled: t.epaymentMeezaEnabled,
    moduleCoreBasic: t.moduleCoreBasic,
    moduleCoreEdge: t.moduleCoreEdge,
    moduleAdvancedLending: t.moduleAdvancedLending,
    moduleFinancialSettlements: t.moduleFinancialSettlements,
    allowedDomains: t.allowedDomains,
    createdAt: t.createdAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const tenantId = user.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "no_tenant", message: "No tenant associated with this user" });
      return;
    }
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(formatTenant(tenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const tenantId = user.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "no_tenant" });
      return;
    }
    const { companyName, companyNameAr, fraLicenseNumber, subscriptionPlan, logoUrl, isActive, contactEmail, contactPhone, iscoreEnabled, epaymentFawryEnabled, epaymentOpayEnabled, epaymentKhaznaEnabled, epaymentMeezaEnabled, moduleCoreBasic, moduleCoreEdge, moduleAdvancedLending, moduleFinancialSettlements, moduleSavings } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (companyName !== undefined) updateData.companyName = companyName;
    if (companyNameAr !== undefined) updateData.companyNameAr = companyNameAr;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (user.role === "SuperAdmin") {
      if (fraLicenseNumber !== undefined) updateData.fraLicenseNumber = fraLicenseNumber;
      if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (iscoreEnabled !== undefined) updateData.iscoreEnabled = iscoreEnabled;
      if (epaymentFawryEnabled !== undefined) updateData.epaymentFawryEnabled = epaymentFawryEnabled;
      if (epaymentOpayEnabled !== undefined) updateData.epaymentOpayEnabled = epaymentOpayEnabled;
      if (epaymentKhaznaEnabled !== undefined) updateData.epaymentKhaznaEnabled = epaymentKhaznaEnabled;
      if (epaymentMeezaEnabled !== undefined) updateData.epaymentMeezaEnabled = epaymentMeezaEnabled;
      if (moduleCoreBasic !== undefined) updateData.moduleCoreBasic = moduleCoreBasic;
      if (moduleCoreEdge !== undefined) updateData.moduleCoreEdge = moduleCoreEdge;
      if (moduleAdvancedLending !== undefined) updateData.moduleAdvancedLending = moduleAdvancedLending;
      if (moduleFinancialSettlements !== undefined) updateData.moduleFinancialSettlements = moduleFinancialSettlements;
      if (moduleSavings !== undefined) updateData.moduleSavings = moduleSavings;
    }
    const [updated] = await db.update(tenantsTable)
      .set(updateData)
      .where(eq(tenantsTable.id, tenantId))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(formatTenant(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

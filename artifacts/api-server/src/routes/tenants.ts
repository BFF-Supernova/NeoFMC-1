import { Router } from "express";
import { db, tenantsTable, usersTable, branchesTable, tenantUserLimitsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, hashPassword } from "../lib/auth";
import { seedGlAccountsForTenant } from "../lib/glAccountsSeed";

const router = Router();

router.get("/", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const tenants = await db.select().from(tenantsTable).orderBy(desc(tenantsTable.createdAt));
    res.json(tenants.map(formatTenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { companyName, companyNameAr, fraLicenseNumber, subscriptionPlan, contactEmail, contactPhone, adminName, adminEmail, adminPassword } = req.body;

    if (!companyName || !adminEmail || !adminPassword) {
      res.status(400).json({ error: "bad_request", message: "companyName, adminEmail, adminPassword required" });
      return;
    }

    const [tenant] = await db.insert(tenantsTable).values({
      companyName,
      companyNameAr,
      fraLicenseNumber,
      subscriptionPlan: subscriptionPlan || "Basic",
      contactEmail,
      contactPhone,
      isActive: true,
    }).returning();

    await db.insert(usersTable).values({
      tenantId: tenant.id,
      fullName: adminName || "Tenant Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "TenantAdmin",
      isActive: true,
    });

    try { await seedGlAccountsForTenant(tenant.id); } catch (e) { console.error("GL seed error:", e); }

    res.status(201).json(formatTenant(tenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/self-register", async (req, res) => {
  try {
    const { companyName, companyNameAr, fraLicenseNumber, adminFullName, adminEmail, adminPassword, branchName, branchNameAr, branchCity, branchAddress, plan } = req.body;

    if (!companyName || !companyNameAr || !adminFullName || !adminEmail || !adminPassword) {
      res.status(400).json({ error: "bad_request", message: "companyName, companyNameAr, adminFullName, adminEmail, adminPassword required" });
      return;
    }

    if (adminPassword.length < 6) {
      res.status(400).json({ error: "bad_request", message: "Password must be at least 6 characters" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      res.status(400).json({ error: "bad_request", message: "Invalid email format" });
      return;
    }

    const validPlans = ["Basic", "Professional", "Enterprise"];
    const selectedPlan = validPlans.includes(plan) ? plan : "Basic";

    const tenantId = await db.transaction(async (tx) => {
      const existingUser = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
      if (existingUser.length > 0) {
        throw new Error("EMAIL_EXISTS");
      }

      const [tenant] = await tx.insert(tenantsTable).values({
        companyName,
        companyNameAr,
        fraLicenseNumber: fraLicenseNumber || null,
        subscriptionPlan: selectedPlan,
        contactEmail: adminEmail,
        isActive: false,
        onboardingStatus: "PendingApproval",
      }).returning();

      await tx.insert(usersTable).values({
        tenantId: tenant.id,
        fullName: adminFullName,
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        role: "TenantAdmin",
        isActive: true,
      });

      if (branchName) {
        await tx.insert(branchesTable).values({
          tenantId: tenant.id,
          branchName: branchName || "Main Branch",
          branchNameAr: branchNameAr || "الفرع الرئيسي",
          city: branchCity || null,
          address: branchAddress || null,
          isActive: true,
        });
      }

      return tenant.id;
    });

    try { await seedGlAccountsForTenant(tenantId); } catch (e) { console.error("GL seed error (self-register):", e); }

    res.status(201).json({ success: true, tenantId, message: "Account created successfully" });
  } catch (err: any) {
    if (err?.message === "EMAIL_EXISTS") {
      res.status(409).json({ error: "conflict", message: "An account with this email already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/pending-approvals", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const pending = await db.select().from(tenantsTable)
      .where(eq(tenantsTable.onboardingStatus, "PendingApproval"))
      .orderBy(desc(tenantsTable.createdAt));
    res.json(pending.map(formatTenant));
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/approve", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.params.id)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }
    if (tenant.onboardingStatus !== "PendingApproval") {
      res.status(400).json({ error: "bad_request", message: "Tenant is not pending approval" }); return;
    }

    const [updated] = await db.update(tenantsTable).set({
      onboardingStatus: "Approved",
      isActive: true,
      updatedAt: new Date(),
    }).where(eq(tenantsTable.id, req.params.id)).returning();

    res.json(formatTenant(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/reject", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.params.id)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }
    if (tenant.onboardingStatus !== "PendingApproval") {
      res.status(400).json({ error: "bad_request", message: "Tenant is not pending approval" }); return;
    }

    const [updated] = await db.update(tenantsTable).set({
      onboardingStatus: "Rejected",
      isActive: false,
      updatedAt: new Date(),
    }).where(eq(tenantsTable.id, req.params.id)).returning();

    res.json({ ...formatTenant(updated), rejectionReason: reason || null });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/branding", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { primaryColor, secondaryColor, logoUrl, faviconUrl, customDomain } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (faviconUrl !== undefined) updates.faviconUrl = faviconUrl;
    if (customDomain !== undefined) updates.customDomain = customDomain;

    const [updated] = await db.update(tenantsTable).set(updates)
      .where(eq(tenantsTable.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(formatTenant(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/bulk/toggle-module", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantIds, moduleKey, enabled } = req.body;
    if (!Array.isArray(tenantIds) || !moduleKey || typeof enabled !== "boolean") {
      res.status(400).json({ error: "bad_request", message: "tenantIds array, moduleKey, and enabled boolean required" }); return;
    }

    const validModules = [
      "moduleCoreBasic", "moduleCoreEdge", "moduleAdvancedLending", "moduleFinancialSettlements",
      "moduleSavings", "moduleHRPayroll", "moduleInsurance", "moduleAgentBanking",
      "moduleLoanRestructuring", "moduleOCR", "moduleWhatsApp", "moduleMobileField",
      "moduleClientApp", "moduleMobileWallet", "moduleAICollection", "moduleDynamicPricing",
      "moduleCashFlowPrediction", "moduleAIStressTesting", "moduleNLPReporting",
      "moduleChurnPrediction", "moduleIFRS9", "moduleAIRisk", "moduleFRAReporting",
      "moduleIScorelive", "modulePDPL", "moduleAML", "moduleEKYC", "moduleETA",
    ];
    if (!validModules.includes(moduleKey)) {
      res.status(400).json({ error: "bad_request", message: `Invalid module key. Valid keys: ${validModules.join(", ")}` }); return;
    }

    let updatedCount = 0;
    for (const id of tenantIds) {
      const result = await db.update(tenantsTable)
        .set({ [moduleKey]: enabled, updatedAt: new Date() })
        .where(eq(tenantsTable.id, id));
      updatedCount++;
    }

    res.json({ success: true, updatedCount, moduleKey, enabled });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/bulk/change-plan", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantIds, plan } = req.body;
    if (!Array.isArray(tenantIds) || !["Basic", "Professional", "Enterprise"].includes(plan)) {
      res.status(400).json({ error: "bad_request", message: "tenantIds array and valid plan (Basic/Professional/Enterprise) required" }); return;
    }

    for (const id of tenantIds) {
      await db.update(tenantsTable).set({ subscriptionPlan: plan, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
    }

    res.json({ success: true, updatedCount: tenantIds.length, plan });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/bulk/toggle-status", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantIds, isActive } = req.body;
    if (!Array.isArray(tenantIds) || typeof isActive !== "boolean") {
      res.status(400).json({ error: "bad_request", message: "tenantIds array and isActive boolean required" }); return;
    }

    for (const id of tenantIds) {
      await db.update(tenantsTable).set({ isActive, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
    }

    res.json({ success: true, updatedCount: tenantIds.length, isActive });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

const DEFAULT_ID_SETTINGS = { nationalId: true, jobTitle: true, professionLicenseId: true, agriculturalLandId: true, taxId: true, commercialRegistrationNo: true };

router.get("/my/identification-settings", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [tenant] = await db.select({ requiredIdentifications: tenantsTable.requiredIdentifications })
      .from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }
    res.json(tenant.requiredIdentifications || DEFAULT_ID_SETTINGS);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    if (user.role !== "SuperAdmin" && user.tenantId !== id) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }
    res.json(formatTenant(tenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    if (user.role !== "SuperAdmin" && user.tenantId !== id) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const { companyName, companyNameAr, fraLicenseNumber, subscriptionPlan, logoUrl, isActive, contactEmail, contactPhone, iscoreEnabled, epaymentFawryEnabled, epaymentOpayEnabled, epaymentKhaznaEnabled, epaymentMeezaEnabled, moduleCoreBasic, moduleCoreEdge, moduleAdvancedLending, moduleFinancialSettlements, moduleSavings, moduleHRPayroll, moduleInsurance, moduleAgentBanking, moduleLoanRestructuring, moduleOCR, moduleWhatsApp, moduleMobileField, moduleClientApp, moduleMobileWallet, moduleAICollection, moduleDynamicPricing, moduleCashFlowPrediction, moduleAIStressTesting, moduleNLPReporting, moduleChurnPrediction, moduleIFRS9, moduleAIRisk, moduleFRAReporting, moduleIScorelive, modulePDPL, moduleAML, moduleEKYC, moduleETA, allowedDomains } = req.body;
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
      if (moduleHRPayroll !== undefined) updateData.moduleHRPayroll = moduleHRPayroll;
      if (moduleInsurance !== undefined) updateData.moduleInsurance = moduleInsurance;
      if (moduleAgentBanking !== undefined) updateData.moduleAgentBanking = moduleAgentBanking;
      if (moduleLoanRestructuring !== undefined) updateData.moduleLoanRestructuring = moduleLoanRestructuring;
      if (moduleOCR !== undefined) updateData.moduleOCR = moduleOCR;
      if (moduleWhatsApp !== undefined) updateData.moduleWhatsApp = moduleWhatsApp;
      if (moduleMobileField !== undefined) updateData.moduleMobileField = moduleMobileField;
      if (moduleClientApp !== undefined) updateData.moduleClientApp = moduleClientApp;
      if (moduleMobileWallet !== undefined) updateData.moduleMobileWallet = moduleMobileWallet;
      if (moduleAICollection !== undefined) updateData.moduleAICollection = moduleAICollection;
      if (moduleDynamicPricing !== undefined) updateData.moduleDynamicPricing = moduleDynamicPricing;
      if (moduleCashFlowPrediction !== undefined) updateData.moduleCashFlowPrediction = moduleCashFlowPrediction;
      if (moduleAIStressTesting !== undefined) updateData.moduleAIStressTesting = moduleAIStressTesting;
      if (moduleNLPReporting !== undefined) updateData.moduleNLPReporting = moduleNLPReporting;
      if (moduleChurnPrediction !== undefined) updateData.moduleChurnPrediction = moduleChurnPrediction;
      if (moduleIFRS9 !== undefined) updateData.moduleIFRS9 = moduleIFRS9;
      if (moduleAIRisk !== undefined) updateData.moduleAIRisk = moduleAIRisk;
      if (moduleFRAReporting !== undefined) updateData.moduleFRAReporting = moduleFRAReporting;
      if (moduleIScorelive !== undefined) updateData.moduleIScorelive = moduleIScorelive;
      if (modulePDPL !== undefined) updateData.modulePDPL = modulePDPL;
      if (moduleAML !== undefined) updateData.moduleAML = moduleAML;
      if (moduleEKYC !== undefined) updateData.moduleEKYC = moduleEKYC;
      if (moduleETA !== undefined) updateData.moduleETA = moduleETA;
      if (allowedDomains !== undefined) updateData.allowedDomains = allowedDomains || null;
    }
    const [updated] = await db.update(tenantsTable)
      .set(updateData)
      .where(eq(tenantsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(formatTenant(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/users", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const users = await db.select().from(usersTable)
      .where(eq(usersTable.tenantId, id))
      .orderBy(desc(usersTable.createdAt));
    res.json(users.map(formatUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/users", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, role, branchId } = req.body;
    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: "bad_request", message: "fullName, email, password, role required" });
      return;
    }
    const [tenantRow] = await db.select({ allowedDomains: tenantsTable.allowedDomains }).from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
    if (tenantRow?.allowedDomains) {
      const domains = tenantRow.allowedDomains.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);
      if (domains.length > 0) {
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (!emailDomain || !domains.includes(emailDomain)) {
          res.status(400).json({ error: "domain_restricted", message: `Email domain not allowed. Permitted domains: ${domains.join(', ')}` });
          return;
        }
      }
    }
    const [limit] = await db.select().from(tenantUserLimitsTable)
      .where(and(
        eq(tenantUserLimitsTable.tenantId, id),
        eq(tenantUserLimitsTable.userType, role)
      )).limit(1);
    if (limit && limit.maxUsers !== null) {
      if (limit.maxUsers === 0) {
        res.status(400).json({
          error: "user_limit_reached",
          message: `${role} users are not allowed for this tenant (quota is 0).`
        });
        return;
      }
      const [{ count: currentCount }] = await db.select({
        count: sql<number>`cast(count(*) as int)`,
      }).from(usersTable)
        .where(and(
          eq(usersTable.tenantId, id),
          eq(usersTable.role, role),
          eq(usersTable.isActive, true)
        ));
      if (currentCount >= limit.maxUsers) {
        res.status(400).json({
          error: "user_limit_reached",
          message: `Maximum ${limit.maxUsers} ${role} users allowed for this tenant. Currently ${currentCount} active.`
        });
        return;
      }
    }
    const [newUser] = await db.insert(usersTable).values({
      tenantId: id,
      fullName,
      email,
      passwordHash: hashPassword(password),
      role,
      branchId: branchId || null,
      isSuperUser: !!req.body.isSuperUser,
      isActive: true,
    }).returning();
    res.status(201).json(formatUser(newUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/users/:userId", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { fullName, role, isActive, password } = req.body;

    const [existing] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, id))).limit(1);
    if (!existing) { res.status(404).json({ error: "not_found" }); return; }

    const newRole = role || existing.role;
    const newActive = isActive !== undefined ? isActive : existing.isActive;
    const roleChanged = newRole !== existing.role;
    const reactivating = newActive && !existing.isActive;

    if ((roleChanged || reactivating) && newActive) {
      const [limit] = await db.select().from(tenantUserLimitsTable)
        .where(and(
          eq(tenantUserLimitsTable.tenantId, id),
          eq(tenantUserLimitsTable.userType, newRole)
        )).limit(1);
      if (limit && limit.maxUsers !== null) {
        if (limit.maxUsers === 0) {
          res.status(400).json({
            error: "user_limit_reached",
            message: `${newRole} users are not allowed for this tenant (quota is 0).`
          });
          return;
        }
        const [{ count: currentCount }] = await db.select({
          count: sql<number>`cast(count(*) as int)`,
        }).from(usersTable)
          .where(and(
            eq(usersTable.tenantId, id),
            eq(usersTable.role, newRole),
            eq(usersTable.isActive, true)
          ));
        const countExcludingSelf = (existing.role === newRole && existing.isActive) ? currentCount - 1 : currentCount;
        if (countExcludingSelf >= limit.maxUsers) {
          res.status(400).json({
            error: "user_limit_reached",
            message: `Maximum ${limit.maxUsers} ${newRole} users allowed. Currently ${countExcludingSelf} active.`
          });
          return;
        }
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName !== undefined) updates.fullName = fullName;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (req.body.isSuperUser !== undefined) updates.isSuperUser = !!req.body.isSuperUser;
    if (password) updates.passwordHash = hashPassword(password);
    const [updated] = await db.update(usersTable)
      .set(updates)
      .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, id)))
      .returning();
    res.json(formatUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/identification-settings", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    if (user.role !== "SuperAdmin" && user.role !== "TenantAdmin") {
      res.status(403).json({ error: "forbidden" }); return;
    }
    if (user.role === "TenantAdmin" && user.tenantId !== id) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const settings = req.body as Record<string, boolean>;
    const validKeys = ["nationalId", "jobTitle", "professionLicenseId", "agriculturalLandId", "taxId", "commercialRegistrationNo"];
    const cleaned: Record<string, boolean> = {};
    for (const k of validKeys) {
      cleaned[k] = !!settings[k];
    }
    const enabledCount = Object.values(cleaned).filter(Boolean).length;
    if (enabledCount < 1) {
      res.status(400).json({ error: "bad_request", message: "At least one identification field must be enabled" });
      return;
    }
    const [updated] = await db.update(tenantsTable)
      .set({ requiredIdentifications: cleaned, updatedAt: new Date() })
      .where(eq(tenantsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated.requiredIdentifications || cleaned);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/branches", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const branches = await db.select().from(branchesTable)
      .where(eq(branchesTable.tenantId, id))
      .orderBy(desc(branchesTable.createdAt));
    res.json(branches.map(b => ({
      id: b.id,
      tenantId: b.tenantId,
      branchNameAr: b.branchNameAr,
      branchNameEn: b.branchNameEn,
      createdAt: b.createdAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    tenantId: u.tenantId,
    branchId: u.branchId,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isSuperUser: u.isSuperUser,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

const HIDEABLE_FIELDS: { key: string; category: string; labelEn: string; labelAr: string }[] = [
  { key: 'client.fullNameEn', category: 'client', labelEn: 'Full Name (English)', labelAr: 'الاسم الكامل (إنجليزي)' },
  { key: 'client.phone', category: 'client', labelEn: 'Phone', labelAr: 'الهاتف' },
  { key: 'client.address', category: 'client', labelEn: 'Address', labelAr: 'العنوان' },
  { key: 'client.nationalId', category: 'client', labelEn: 'National ID', labelAr: 'الرقم القومي' },
  { key: 'client.jobTitle', category: 'client', labelEn: 'Job Title', labelAr: 'المسمى الوظيفي' },
  { key: 'client.professionLicenseId', category: 'client', labelEn: 'Profession License ID', labelAr: 'رقم رخصة المهنة' },
  { key: 'client.agriculturalLandId', category: 'client', labelEn: 'Agricultural Land ID', labelAr: 'رقم حيازة الأرض الزراعية' },
  { key: 'client.taxId', category: 'client', labelEn: 'Tax ID', labelAr: 'الرقم الضريبي' },
  { key: 'client.commercialRegistrationNo', category: 'client', labelEn: 'Commercial Registration No.', labelAr: 'رقم السجل التجاري' },
  { key: 'loan.purpose', category: 'loan', labelEn: 'Loan Purpose', labelAr: 'غرض القرض' },
  { key: 'loan.guarantors', category: 'loan', labelEn: 'Guarantors Section', labelAr: 'قسم الضامنين' },
  { key: 'loan.collateral', category: 'loan', labelEn: 'Collateral Section', labelAr: 'قسم الضمانات' },
  { key: 'loan.graceperiod', category: 'loan', labelEn: 'Grace Period', labelAr: 'فترة السماح' },
  { key: 'financial.cashflow', category: 'financial', labelEn: 'Cash Flow Statement', labelAr: 'قائمة التدفقات النقدية' },
  { key: 'financial.branchpnl', category: 'financial', labelEn: 'Branch P&L Report', labelAr: 'تقرير ربحية الفروع' },
  { key: 'reports.collection', category: 'reports', labelEn: 'Collection Report', labelAr: 'تقرير التحصيل' },
  { key: 'reports.risk', category: 'reports', labelEn: 'Risk Analysis Report', labelAr: 'تقرير تحليل المخاطر' },
];

router.get("/my/hidden-fields", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [tenant] = await db.select({ hiddenFields: tenantsTable.hiddenFields })
      .from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }
    res.json(tenant.hiddenFields || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/my/hideable-fields", requireAuth, async (req, res) => {
  res.json(HIDEABLE_FIELDS);
});

router.get("/:id/hidden-fields", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [tenant] = await db.select({ hiddenFields: tenantsTable.hiddenFields })
      .from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ hiddenFields: tenant.hiddenFields || {}, availableFields: HIDEABLE_FIELDS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/hidden-fields", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hiddenFields = req.body as Record<string, boolean>;
    const validKeys = HIDEABLE_FIELDS.map(f => f.key);

    const [tenant] = await db.select({ requiredIdentifications: tenantsTable.requiredIdentifications })
      .from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }

    const reqIds = (tenant.requiredIdentifications || {}) as Record<string, boolean>;
    const idFieldMapping: Record<string, string> = {
      'client.nationalId': 'nationalId',
      'client.jobTitle': 'jobTitle',
      'client.professionLicenseId': 'professionLicenseId',
      'client.agriculturalLandId': 'agriculturalLandId',
      'client.taxId': 'taxId',
      'client.commercialRegistrationNo': 'commercialRegistrationNo',
    };

    const conflicts: string[] = [];
    const cleaned: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(hiddenFields)) {
      if (!validKeys.includes(k)) continue;
      if (v && idFieldMapping[k] && reqIds[idFieldMapping[k]]) {
        conflicts.push(k);
        continue;
      }
      cleaned[k] = !!v;
    }

    if (conflicts.length > 0) {
      res.status(400).json({
        error: "conflict",
        message: "Cannot hide fields that are required in identification settings",
        conflicts,
      });
      return;
    }

    const [updated] = await db.update(tenantsTable)
      .set({ hiddenFields: cleaned, updatedAt: new Date() })
      .where(eq(tenantsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated.hiddenFields || cleaned);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

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
    moduleSavings: t.moduleSavings,
    moduleHRPayroll: t.moduleHRPayroll,
    moduleInsurance: t.moduleInsurance,
    moduleAgentBanking: t.moduleAgentBanking,
    moduleLoanRestructuring: t.moduleLoanRestructuring,
    moduleOCR: t.moduleOCR,
    moduleWhatsApp: t.moduleWhatsApp,
    moduleMobileField: t.moduleMobileField,
    moduleClientApp: t.moduleClientApp,
    moduleMobileWallet: t.moduleMobileWallet,
    moduleAICollection: t.moduleAICollection,
    moduleDynamicPricing: t.moduleDynamicPricing,
    moduleCashFlowPrediction: t.moduleCashFlowPrediction,
    moduleAIStressTesting: t.moduleAIStressTesting,
    moduleNLPReporting: t.moduleNLPReporting,
    moduleChurnPrediction: t.moduleChurnPrediction,
    moduleIFRS9: t.moduleIFRS9,
    moduleAIRisk: t.moduleAIRisk,
    moduleFRAReporting: t.moduleFRAReporting,
    moduleIScorelive: t.moduleIScorelive,
    modulePDPL: t.modulePDPL,
    moduleAML: t.moduleAML,
    moduleEKYC: t.moduleEKYC,
    moduleETA: t.moduleETA,
    allowedDomains: t.allowedDomains,
    requiredIdentifications: t.requiredIdentifications || { nationalId: true, jobTitle: true, professionLicenseId: true, agriculturalLandId: true, taxId: true, commercialRegistrationNo: true },
    hiddenFields: t.hiddenFields || {},
    createdAt: t.createdAt,
  };
}

export default router;

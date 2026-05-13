import { Router } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, verifyToken, hashPassword, verifyPassword, validatePasswordComplexity, requireAuth } from "../lib/auth";
import * as OTPAuth from "otpauth";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "bad_request", message: "Email and password required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
      return;
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      res.status(423).json({ error: "account_locked", message: `Account locked. Try again in ${minutesLeft} minutes.` });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: Record<string, any> = { failedLoginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id));
      res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
      return;
    }

    const isLegacyHash = user.passwordHash.length === 64 && /^[a-f0-9]+$/.test(user.passwordHash);
    if (isLegacyHash) {
      await db.update(usersTable).set({ passwordHash: hashPassword(password) }).where(eq(usersTable.id, user.id));
    }

    if (!user.isActive) {
      res.status(403).json({ error: "account_disabled", message: "Account is disabled" });
      return;
    }

    if (user.tenantId && user.role !== "SuperAdmin") {
      const [tenant] = await db.select({ isActive: tenantsTable.isActive, onboardingStatus: tenantsTable.onboardingStatus })
        .from(tenantsTable).where(eq(tenantsTable.id, user.tenantId)).limit(1);
      if (tenant && !tenant.isActive) {
        res.status(403).json({ error: "tenant_inactive", message: "Your company account is currently inactive. Please contact your administrator." });
        return;
      }
      if (tenant && tenant.onboardingStatus && tenant.onboardingStatus !== "Approved") {
        res.status(403).json({ error: "tenant_pending", message: "Your company is pending approval. Please wait for the platform administrator to approve your registration." });
        return;
      }
    }

    const PRIVILEGED_ROLES = ["TenantAdmin", "BranchManager", "FinancialController", "CFO"];
    if (PRIVILEGED_ROLES.includes(user.role) && !user.totpEnabled) {
      res.status(403).json({
        error: "mfa_required",
        message: "Multi-factor authentication must be enabled for privileged roles. Please contact your administrator to set up 2FA.",
        requiresMfaSetup: true,
        userId: user.id,
      });
      return;
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) {
        res.status(200).json({ requires2FA: true, message: "2FA code required" });
        return;
      }
      const totp = new OTPAuth.TOTP({
        issuer: "NeoFMC",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });
      const delta = totp.validate({ token: totpCode, window: 1 });
      if (delta === null) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: Record<string, any> = { failedLoginAttempts: attempts };
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        }
        await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id));
        res.status(401).json({ error: "invalid_2fa", message: "Invalid 2FA code" });
        return;
      }
    }

    if (user.failedLoginAttempts > 0) {
      await db.update(usersTable).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(usersTable.id, user.id));
    }

    if (user.tenantId) {
      const [tenant] = await db.select({ allowedDomains: tenantsTable.allowedDomains }).from(tenantsTable).where(eq(tenantsTable.id, user.tenantId)).limit(1);
      if (tenant?.allowedDomains) {
        const domains = tenant.allowedDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        if (domains.length > 0) {
          const emailDomain = email.split('@')[1]?.toLowerCase();
          if (!emailDomain || !domains.includes(emailDomain)) {
            res.status(403).json({ error: "domain_restricted", message: "Your email domain is not authorized for this tenant" });
            return;
          }
        }
      }
    }

    const token = signToken({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    });

    let modules: Record<string, boolean> | undefined;
    if (user.tenantId) {
      const [tenant] = await db.select({
        moduleCoreBasic: tenantsTable.moduleCoreBasic,
        moduleCoreEdge: tenantsTable.moduleCoreEdge,
        moduleAdvancedLending: tenantsTable.moduleAdvancedLending,
        moduleFinancialSettlements: tenantsTable.moduleFinancialSettlements,
        moduleSavings: tenantsTable.moduleSavings,
        moduleHRPayroll: tenantsTable.moduleHRPayroll,
        moduleInsurance: tenantsTable.moduleInsurance,
        moduleAgentBanking: tenantsTable.moduleAgentBanking,
        moduleLoanRestructuring: tenantsTable.moduleLoanRestructuring,
        moduleOCR: tenantsTable.moduleOCR,
        moduleWhatsApp: tenantsTable.moduleWhatsApp,
        moduleMobileField: tenantsTable.moduleMobileField,
        moduleClientApp: tenantsTable.moduleClientApp,
        moduleMobileWallet: tenantsTable.moduleMobileWallet,
        moduleAICollection: tenantsTable.moduleAICollection,
        moduleDynamicPricing: tenantsTable.moduleDynamicPricing,
        moduleCashFlowPrediction: tenantsTable.moduleCashFlowPrediction,
        moduleAIStressTesting: tenantsTable.moduleAIStressTesting,
        moduleNLPReporting: tenantsTable.moduleNLPReporting,
        moduleChurnPrediction: tenantsTable.moduleChurnPrediction,
        moduleIFRS9: tenantsTable.moduleIFRS9,
        moduleAIRisk: tenantsTable.moduleAIRisk,
        moduleFRAReporting: tenantsTable.moduleFRAReporting,
        moduleIScorelive: tenantsTable.moduleIScorelive,
        modulePDPL: tenantsTable.modulePDPL,
        moduleAML: tenantsTable.moduleAML,
        moduleEKYC: tenantsTable.moduleEKYC,
        moduleETA: tenantsTable.moduleETA,
      }).from(tenantsTable).where(eq(tenantsTable.id, user.tenantId)).limit(1);
      if (tenant) modules = tenant;
    }

    res.json({
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isSuperUser: user.isSuperUser,
        isActive: user.isActive,
        createdAt: user.createdAt,
        modules,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    let modules: Record<string, boolean> | undefined;
    if (user.tenantId) {
      const [tenant] = await db.select({
        moduleCoreBasic: tenantsTable.moduleCoreBasic,
        moduleCoreEdge: tenantsTable.moduleCoreEdge,
        moduleAdvancedLending: tenantsTable.moduleAdvancedLending,
        moduleFinancialSettlements: tenantsTable.moduleFinancialSettlements,
        moduleSavings: tenantsTable.moduleSavings,
        moduleHRPayroll: tenantsTable.moduleHRPayroll,
        moduleInsurance: tenantsTable.moduleInsurance,
        moduleAgentBanking: tenantsTable.moduleAgentBanking,
        moduleLoanRestructuring: tenantsTable.moduleLoanRestructuring,
        moduleOCR: tenantsTable.moduleOCR,
        moduleWhatsApp: tenantsTable.moduleWhatsApp,
        moduleMobileField: tenantsTable.moduleMobileField,
        moduleClientApp: tenantsTable.moduleClientApp,
        moduleMobileWallet: tenantsTable.moduleMobileWallet,
        moduleAICollection: tenantsTable.moduleAICollection,
        moduleDynamicPricing: tenantsTable.moduleDynamicPricing,
        moduleCashFlowPrediction: tenantsTable.moduleCashFlowPrediction,
        moduleAIStressTesting: tenantsTable.moduleAIStressTesting,
        moduleNLPReporting: tenantsTable.moduleNLPReporting,
        moduleChurnPrediction: tenantsTable.moduleChurnPrediction,
        moduleIFRS9: tenantsTable.moduleIFRS9,
        moduleAIRisk: tenantsTable.moduleAIRisk,
        moduleFRAReporting: tenantsTable.moduleFRAReporting,
        moduleIScorelive: tenantsTable.moduleIScorelive,
        modulePDPL: tenantsTable.modulePDPL,
        moduleAML: tenantsTable.moduleAML,
        moduleEKYC: tenantsTable.moduleEKYC,
        moduleETA: tenantsTable.moduleETA,
      }).from(tenantsTable).where(eq(tenantsTable.id, user.tenantId)).limit(1);
      if (tenant) modules = tenant;
    }

    res.json({
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isSuperUser: user.isSuperUser,
      isActive: user.isActive,
      createdAt: user.createdAt,
      modules,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "bad_request", message: "Current and new password required" });
      return;
    }

    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      res.status(400).json({ error: "weak_password", message: complexity.message });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "not_found" }); return; }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: "invalid_credentials", message: "Current password is incorrect" });
      return;
    }

    await db.update(usersTable)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(usersTable.id, req.user!.id));

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;

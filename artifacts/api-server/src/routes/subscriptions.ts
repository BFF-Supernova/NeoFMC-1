import { Router } from "express";
import { db, modulePricingTable, userTypePricingTable, tenantModuleSubscriptionsTable, tenantUserLimitsTable, usersTable, tenantsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, requireRole } from "../lib/auth";

const router = Router();

router.get("/my-subscription", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const allModules = await db.select().from(modulePricingTable).orderBy(modulePricingTable.sortOrder);
    const tenantSubs = await db.select().from(tenantModuleSubscriptionsTable)
      .where(eq(tenantModuleSubscriptionsTable.tenantId, tenantId));

    const allUserTypes = await db.select().from(userTypePricingTable).orderBy(userTypePricingTable.sortOrder);
    const tenantLimits = await db.select().from(tenantUserLimitsTable)
      .where(eq(tenantUserLimitsTable.tenantId, tenantId));

    const userCounts = await db.select({
      role: usersTable.role,
      count: sql<number>`cast(count(*) as int)`,
    }).from(usersTable)
      .where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true)))
      .groupBy(usersTable.role);

    const countMap: Record<string, number> = {};
    userCounts.forEach(uc => { countMap[uc.role] = uc.count; });

    const subMap: Record<string, typeof tenantSubs[0]> = {};
    tenantSubs.forEach(s => { subMap[s.moduleKey] = s; });

    const limitMap: Record<string, typeof tenantLimits[0]> = {};
    tenantLimits.forEach(l => { limitMap[l.userType] = l; });

    const modules = allModules.map(m => {
      const sub = subMap[m.moduleKey];
      return {
        moduleKey: m.moduleKey,
        moduleName: m.moduleName,
        moduleNameAr: m.moduleNameAr,
        description: m.description,
        descriptionAr: m.descriptionAr,
        isSubscribed: sub?.isActive ?? false,
        billingCycle: sub?.billingCycle || 'monthly',
        startDate: sub?.startDate || null,
        endDate: sub?.endDate || null,
      };
    });

    const userLicenses = allUserTypes.map(ut => {
      const limit = limitMap[ut.userType];
      return {
        userType: ut.userType,
        displayName: ut.displayName,
        displayNameAr: ut.displayNameAr,
        maxUsers: limit?.maxUsers ?? 0,
        currentCount: countMap[ut.userType] || 0,
      };
    });

    res.json({ modules, userLicenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/module-pricing", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(modulePricingTable).orderBy(modulePricingTable.sortOrder);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/module-pricing/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleName, moduleNameAr, description, descriptionAr, monthlyPrice, annualPrice, isActive, sortOrder } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (moduleName !== undefined) updates.moduleName = moduleName;
    if (moduleNameAr !== undefined) updates.moduleNameAr = moduleNameAr;
    if (description !== undefined) updates.description = description;
    if (descriptionAr !== undefined) updates.descriptionAr = descriptionAr;
    if (monthlyPrice !== undefined) updates.monthlyPrice = String(monthlyPrice);
    if (annualPrice !== undefined) updates.annualPrice = String(annualPrice);
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const [updated] = await db.update(modulePricingTable).set(updates).where(eq(modulePricingTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/user-type-pricing", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(userTypePricingTable).orderBy(userTypePricingTable.sortOrder);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/user-type-pricing/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, displayNameAr, monthlyPricePerUser, annualPricePerUser, isActive, sortOrder } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName;
    if (displayNameAr !== undefined) updates.displayNameAr = displayNameAr;
    if (monthlyPricePerUser !== undefined) updates.monthlyPricePerUser = String(monthlyPricePerUser);
    if (annualPricePerUser !== undefined) updates.annualPricePerUser = String(annualPricePerUser);
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const [updated] = await db.update(userTypePricingTable).set(updates).where(eq(userTypePricingTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/tenants/:tenantId/modules", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const subs = await db.select().from(tenantModuleSubscriptionsTable)
      .where(eq(tenantModuleSubscriptionsTable.tenantId, tenantId));
    res.json(subs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/tenants/:tenantId/modules/:moduleKey", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, moduleKey } = req.params;
    const { isActive, billingCycle, discountPercent, discountAmount, customMonthlyPrice, startDate, endDate } = req.body;

    const existing = await db.select().from(tenantModuleSubscriptionsTable)
      .where(and(
        eq(tenantModuleSubscriptionsTable.tenantId, tenantId),
        eq(tenantModuleSubscriptionsTable.moduleKey, moduleKey)
      )).limit(1);

    let result;
    let statusCode = 200;
    if (existing.length > 0) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (isActive !== undefined) updates.isActive = isActive;
      if (billingCycle !== undefined) updates.billingCycle = billingCycle;
      if (discountPercent !== undefined) updates.discountPercent = String(discountPercent || 0);
      if (discountAmount !== undefined) updates.discountAmount = String(discountAmount || 0);
      if (customMonthlyPrice !== undefined) updates.customMonthlyPrice = customMonthlyPrice !== null && customMonthlyPrice !== '' ? String(customMonthlyPrice) : null;
      if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
      const [updated] = await db.update(tenantModuleSubscriptionsTable).set(updates)
        .where(and(
          eq(tenantModuleSubscriptionsTable.tenantId, tenantId),
          eq(tenantModuleSubscriptionsTable.moduleKey, moduleKey)
        )).returning();
      result = updated;
    } else {
      const [created] = await db.insert(tenantModuleSubscriptionsTable).values({
        tenantId,
        moduleKey,
        isActive: isActive ?? true,
        billingCycle: billingCycle || 'monthly',
        discountPercent: String(discountPercent || 0),
        discountAmount: String(discountAmount || 0),
        customMonthlyPrice: customMonthlyPrice != null && customMonthlyPrice !== '' ? String(customMonthlyPrice) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }).returning();
      result = created;
      statusCode = 201;
    }

    const moduleColumnMap: Record<string, string> = {
      moduleCoreBasic: 'moduleCoreBasic',
      moduleCoreEdge: 'moduleCoreEdge',
      moduleAdvancedLending: 'moduleAdvancedLending',
      moduleFinancialSettlements: 'moduleFinancialSettlements',
      moduleSavings: 'moduleSavings',
      moduleHRPayroll: 'moduleHRPayroll',
    };
    if (isActive !== undefined && moduleColumnMap[moduleKey]) {
      await db.update(tenantsTable)
        .set({ [moduleColumnMap[moduleKey]]: isActive, updatedAt: new Date() })
        .where(eq(tenantsTable.id, tenantId));
    }

    res.status(statusCode).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/tenants/:tenantId/user-limits", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const allUserTypes = await db.select().from(userTypePricingTable).orderBy(userTypePricingTable.sortOrder);
    const limits = await db.select().from(tenantUserLimitsTable)
      .where(eq(tenantUserLimitsTable.tenantId, tenantId));

    const userCounts = await db.select({
      role: usersTable.role,
      count: sql<number>`cast(count(*) as int)`,
    }).from(usersTable)
      .where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true)))
      .groupBy(usersTable.role);

    const countMap: Record<string, number> = {};
    userCounts.forEach(uc => { countMap[uc.role] = uc.count; });

    const limitMap: Record<string, typeof limits[0]> = {};
    limits.forEach(l => { limitMap[l.userType] = l; });

    const result = allUserTypes.map(ut => {
      const limit = limitMap[ut.userType];
      return {
        ...(limit || { tenantId, userType: ut.userType, maxUsers: 0, discountPercent: "0", discountAmount: "0", customPricePerUser: null }),
        id: limit?.id || null,
        currentCount: countMap[ut.userType] || 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/tenants/:tenantId/user-limits/:userType", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, userType } = req.params;
    const { maxUsers, discountPercent, discountAmount, customPricePerUser } = req.body;

    const existing = await db.select().from(tenantUserLimitsTable)
      .where(and(
        eq(tenantUserLimitsTable.tenantId, tenantId),
        eq(tenantUserLimitsTable.userType, userType)
      )).limit(1);

    if (existing.length > 0) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (maxUsers !== undefined) updates.maxUsers = maxUsers;
      if (discountPercent !== undefined) updates.discountPercent = String(discountPercent || 0);
      if (discountAmount !== undefined) updates.discountAmount = String(discountAmount || 0);
      if (customPricePerUser !== undefined) updates.customPricePerUser = customPricePerUser !== null && customPricePerUser !== '' ? String(customPricePerUser) : null;
      const [updated] = await db.update(tenantUserLimitsTable).set(updates)
        .where(and(
          eq(tenantUserLimitsTable.tenantId, tenantId),
          eq(tenantUserLimitsTable.userType, userType)
        )).returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(tenantUserLimitsTable).values({
        tenantId,
        userType,
        maxUsers: maxUsers ?? 0,
        discountPercent: String(discountPercent || 0),
        discountAmount: String(discountAmount || 0),
        customPricePerUser: customPricePerUser != null && customPricePerUser !== '' ? String(customPricePerUser) : null,
      }).returning();
      res.status(201).json(created);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/tenants/:tenantId/billing-summary", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const modulePrices = await db.select().from(modulePricingTable);
    const userPrices = await db.select().from(userTypePricingTable);
    const moduleSubs = await db.select().from(tenantModuleSubscriptionsTable)
      .where(eq(tenantModuleSubscriptionsTable.tenantId, tenantId));
    const userLimits = await db.select().from(tenantUserLimitsTable)
      .where(eq(tenantUserLimitsTable.tenantId, tenantId));

    const userCounts = await db.select({
      role: usersTable.role,
      count: sql<number>`cast(count(*) as int)`,
    }).from(usersTable)
      .where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true)))
      .groupBy(usersTable.role);

    const countMap: Record<string, number> = {};
    userCounts.forEach(uc => { countMap[uc.role] = uc.count; });

    const priceMap: Record<string, any> = {};
    modulePrices.forEach(mp => { priceMap[mp.moduleKey] = mp; });

    const userPriceMap: Record<string, any> = {};
    userPrices.forEach(up => { userPriceMap[up.userType] = up; });

    let totalModuleMonthly = 0;
    const moduleBreakdown = moduleSubs.filter(s => s.isActive).map(sub => {
      const base = priceMap[sub.moduleKey];
      const basePrice = sub.customMonthlyPrice ? Number(sub.customMonthlyPrice) : (base ? Number(base.monthlyPrice) : 0);
      const discPct = Number(sub.discountPercent || 0);
      const discAmt = Number(sub.discountAmount || 0);
      const afterDiscount = Math.max(0, basePrice * (1 - discPct / 100) - discAmt);
      totalModuleMonthly += afterDiscount;
      return {
        moduleKey: sub.moduleKey,
        moduleName: base?.moduleName || sub.moduleKey,
        basePrice,
        discountPercent: discPct,
        discountAmount: discAmt,
        finalPrice: afterDiscount,
      };
    });

    const limitMap: Record<string, typeof userLimits[0]> = {};
    userLimits.forEach(l => { limitMap[l.userType] = l; });

    let totalUserMonthly = 0;
    const userBreakdown = userPrices.map(base => {
      const limit = limitMap[base.userType];
      const pricePerUser = limit?.customPricePerUser ? Number(limit.customPricePerUser) : Number(base.monthlyPricePerUser);
      const discPct = limit ? Number(limit.discountPercent || 0) : 0;
      const discAmt = limit ? Number(limit.discountAmount || 0) : 0;
      const afterDiscount = Math.max(0, pricePerUser * (1 - discPct / 100) - discAmt);
      const currentCount = countMap[base.userType] || 0;
      const lineTotal = afterDiscount * currentCount;
      totalUserMonthly += lineTotal;
      return {
        userType: base.userType,
        displayName: base.displayName,
        maxUsers: limit?.maxUsers || 0,
        currentCount,
        pricePerUser,
        discountPercent: discPct,
        discountAmount: discAmt,
        finalPricePerUser: afterDiscount,
        lineTotal,
      };
    });

    res.json({
      moduleBreakdown,
      userBreakdown,
      totalModuleMonthly,
      totalUserMonthly,
      totalMonthly: totalModuleMonthly + totalUserMonthly,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/platform-dashboard", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const allTenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
    const modulePrices = await db.select().from(modulePricingTable);
    const userPrices = await db.select().from(userTypePricingTable);
    const allModuleSubs = await db.select().from(tenantModuleSubscriptionsTable);
    const allUserLimits = await db.select().from(tenantUserLimitsTable);

    const allUsers = await db.select({
      tenantId: usersTable.tenantId,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    }).from(usersTable);

    const priceMap: Record<string, any> = {};
    modulePrices.forEach(mp => { priceMap[mp.moduleKey] = mp; });
    const userPriceMap: Record<string, any> = {};
    userPrices.forEach(up => { userPriceMap[up.userType] = up; });

    const activeTenants = allTenants.filter(t => t.isActive);
    const totalUsers = allUsers.filter(u => u.isActive).length;

    let totalMRR = 0;
    const perTenantRevenue: { tenantId: string; companyName: string; moduleRevenue: number; userRevenue: number; totalRevenue: number }[] = [];

    for (const tenant of activeTenants) {
      const tSubs = allModuleSubs.filter(s => s.tenantId === tenant.id && s.isActive);
      const tLimits = allUserLimits.filter(l => l.tenantId === tenant.id);
      const tUsers = allUsers.filter(u => u.tenantId === tenant.id && u.isActive);

      let moduleRev = 0;
      for (const sub of tSubs) {
        const base = priceMap[sub.moduleKey];
        const basePrice = sub.customMonthlyPrice ? Number(sub.customMonthlyPrice) : (base ? Number(base.monthlyPrice) : 0);
        const discPct = Number(sub.discountPercent || 0);
        const discAmt = Number(sub.discountAmount || 0);
        moduleRev += Math.max(0, basePrice * (1 - discPct / 100) - discAmt);
      }

      let userRev = 0;
      const userCountByRole: Record<string, number> = {};
      tUsers.forEach(u => { if (u.role) userCountByRole[u.role] = (userCountByRole[u.role] || 0) + 1; });

      for (const [role, count] of Object.entries(userCountByRole)) {
        const limit = tLimits.find(l => l.userType === role);
        const basePrice = userPriceMap[role];
        if (!basePrice) continue;
        const pricePerUser = limit?.customPricePerUser ? Number(limit.customPricePerUser) : Number(basePrice.monthlyPricePerUser);
        const discPct = limit ? Number(limit.discountPercent || 0) : 0;
        const discAmt = limit ? Number(limit.discountAmount || 0) : 0;
        const effectivePrice = Math.max(0, pricePerUser * (1 - discPct / 100) - discAmt);
        userRev += effectivePrice * count;
      }

      const tenantTotal = moduleRev + userRev;
      totalMRR += tenantTotal;
      perTenantRevenue.push({
        tenantId: tenant.id,
        companyName: tenant.companyName,
        moduleRevenue: moduleRev,
        userRevenue: userRev,
        totalRevenue: tenantTotal,
      });
    }

    const activeTenantIds = new Set(activeTenants.map(t => t.id));

    const moduleAdoption: Record<string, number> = {};
    modulePrices.forEach(mp => { moduleAdoption[mp.moduleKey] = 0; });
    allModuleSubs.filter(s => s.isActive && activeTenantIds.has(s.tenantId)).forEach(s => {
      moduleAdoption[s.moduleKey] = (moduleAdoption[s.moduleKey] || 0) + 1;
    });

    const moduleRevenueBreakdown = modulePrices.map(mp => {
      const activeSubs = allModuleSubs.filter(s => s.moduleKey === mp.moduleKey && s.isActive && activeTenantIds.has(s.tenantId));
      let revenue = 0;
      activeSubs.forEach(sub => {
        const basePrice = sub.customMonthlyPrice ? Number(sub.customMonthlyPrice) : Number(mp.monthlyPrice);
        const discPct = Number(sub.discountPercent || 0);
        const discAmt = Number(sub.discountAmount || 0);
        revenue += Math.max(0, basePrice * (1 - discPct / 100) - discAmt);
      });
      return { moduleKey: mp.moduleKey, moduleName: mp.moduleName, moduleNameAr: mp.moduleNameAr, subscribers: activeSubs.length, monthlyRevenue: revenue };
    });

    const userTypeBreakdown = userPrices.map(up => {
      const activeOfType = allUsers.filter(u => u.role === up.userType && u.isActive && activeTenantIds.has(u.tenantId!));
      let revenue = 0;
      const tenantIds = new Set(activeOfType.map(u => u.tenantId));
      tenantIds.forEach(tid => {
        if (!tid || !activeTenantIds.has(tid)) return;
        const count = activeOfType.filter(u => u.tenantId === tid).length;
        const limit = allUserLimits.find(l => l.tenantId === tid && l.userType === up.userType);
        const pricePerUser = limit?.customPricePerUser ? Number(limit.customPricePerUser) : Number(up.monthlyPricePerUser);
        const discPct = limit ? Number(limit.discountPercent || 0) : 0;
        const discAmt = limit ? Number(limit.discountAmount || 0) : 0;
        revenue += Math.max(0, pricePerUser * (1 - discPct / 100) - discAmt) * count;
      });
      return { userType: up.userType, displayName: up.displayName, displayNameAr: up.displayNameAr, count: activeOfType.length, monthlyRevenue: revenue };
    });

    const now = new Date();
    const monthlyTrend: { period: string; moduleRevenue: number; userRevenue: number; totalRevenue: number; tenantCount: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const tenantsAtDate = allTenants.filter(t => t.isActive && new Date(t.createdAt) <= endOfMonth);
      const usersAtDate = allUsers.filter(u => u.isActive && new Date(u.createdAt!) <= endOfMonth);
      const subsAtDate = allModuleSubs.filter(s => s.isActive && new Date(s.createdAt) <= endOfMonth);

      let mRev = 0;
      subsAtDate.forEach(sub => {
        if (!tenantsAtDate.find(t => t.id === sub.tenantId)) return;
        const base = priceMap[sub.moduleKey];
        const basePrice = sub.customMonthlyPrice ? Number(sub.customMonthlyPrice) : (base ? Number(base.monthlyPrice) : 0);
        const discPct = Number(sub.discountPercent || 0);
        const discAmt = Number(sub.discountAmount || 0);
        mRev += Math.max(0, basePrice * (1 - discPct / 100) - discAmt);
      });

      let uRev = 0;
      const activeTenantsAtDate = tenantsAtDate;
      activeTenantsAtDate.forEach(tenant => {
        const tUsers = usersAtDate.filter(u => u.tenantId === tenant.id);
        const countByRole: Record<string, number> = {};
        tUsers.forEach(u => { if (u.role) countByRole[u.role] = (countByRole[u.role] || 0) + 1; });
        for (const [role, count] of Object.entries(countByRole)) {
          const limit = allUserLimits.find(l => l.tenantId === tenant.id && l.userType === role);
          const basePrice = userPriceMap[role];
          if (!basePrice) continue;
          const pricePerUser = limit?.customPricePerUser ? Number(limit.customPricePerUser) : Number(basePrice.monthlyPricePerUser);
          const discPct = limit ? Number(limit.discountPercent || 0) : 0;
          const discAmt = limit ? Number(limit.discountAmount || 0) : 0;
          uRev += Math.max(0, pricePerUser * (1 - discPct / 100) - discAmt) * count;
        }
      });

      const monthLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyTrend.push({ period: monthLabel, moduleRevenue: mRev, userRevenue: uRev, totalRevenue: mRev + uRev, tenantCount: tenantsAtDate.length });
    }

    const quarterlyTrend: { period: string; moduleRevenue: number; userRevenue: number; totalRevenue: number }[] = [];
    for (let i = 0; i < monthlyTrend.length; i += 3) {
      const chunk = monthlyTrend.slice(i, i + 3);
      if (chunk.length === 0) continue;
      const qNum = Math.floor(i / 3) + 1;
      const year = chunk[0].period.split(' ')[1];
      quarterlyTrend.push({
        period: `Q${((new Date(chunk[0].period + ' 1').getMonth()) / 3 | 0) + 1} ${year}`,
        moduleRevenue: chunk.reduce((s, c) => s + c.moduleRevenue, 0),
        userRevenue: chunk.reduce((s, c) => s + c.userRevenue, 0),
        totalRevenue: chunk.reduce((s, c) => s + c.totalRevenue, 0),
      });
    }

    const annualRevenue = monthlyTrend.reduce((s, c) => s + c.totalRevenue, 0);
    const moduleAnnual = monthlyTrend.reduce((s, c) => s + c.moduleRevenue, 0);
    const userAnnual = monthlyTrend.reduce((s, c) => s + c.userRevenue, 0);

    const revenueByModule = moduleRevenueBreakdown.reduce((s, m) => s + m.monthlyRevenue, 0);
    const revenueByUsers = userTypeBreakdown.reduce((s, u) => s + u.monthlyRevenue, 0);

    res.json({
      kpis: {
        totalTenants: allTenants.length,
        activeTenants: activeTenants.length,
        suspendedTenants: allTenants.length - activeTenants.length,
        totalUsers,
        mrr: totalMRR,
        arr: totalMRR * 12,
        revenueFromModules: revenueByModule,
        revenueFromUsers: revenueByUsers,
      },
      perTenantRevenue: perTenantRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue),
      moduleAdoption: Object.entries(moduleAdoption).map(([key, count]) => {
        const mp = modulePrices.find(m => m.moduleKey === key);
        return { moduleKey: key, moduleName: mp?.moduleName || key, moduleNameAr: mp?.moduleNameAr || key, subscribers: count, totalTenants: activeTenants.length };
      }),
      moduleRevenueBreakdown,
      userTypeBreakdown,
      monthlyTrend,
      quarterlyTrend,
      annualSummary: { totalRevenue: annualRevenue, moduleRevenue: moduleAnnual, userRevenue: userAnnual },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/seed-modules", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const ALL_MODULES = [
      { moduleKey: 'moduleCoreBasic', moduleName: 'Core Finance - Basic', moduleNameAr: 'النظام المالي الأساسي', monthlyPrice: '500', annualPrice: '5000', sortOrder: 1 },
      { moduleKey: 'moduleCoreEdge', moduleName: 'Core Finance - Edge', moduleNameAr: 'النظام المالي المتقدم (Edge)', monthlyPrice: '300', annualPrice: '3000', sortOrder: 2 },
      { moduleKey: 'moduleAdvancedLending', moduleName: 'Advanced Lending', moduleNameAr: 'الإقراض المتقدم', monthlyPrice: '200', annualPrice: '2000', sortOrder: 3 },
      { moduleKey: 'moduleFinancialSettlements', moduleName: 'Financial Settlements', moduleNameAr: 'التسويات المالية', monthlyPrice: '150', annualPrice: '1500', sortOrder: 4 },
      { moduleKey: 'moduleSavings', moduleName: 'Savings & Deposits', moduleNameAr: 'الادخار والودائع', monthlyPrice: '200', annualPrice: '2000', sortOrder: 5 },
      { moduleKey: 'moduleHRPayroll', moduleName: 'HR & Payroll', moduleNameAr: 'الموارد البشرية والرواتب', monthlyPrice: '250', annualPrice: '2500', sortOrder: 6 },
      { moduleKey: 'moduleInsurance', moduleName: 'Credit Life Insurance', moduleNameAr: 'التأمين على الائتمان', monthlyPrice: '150', annualPrice: '1500', sortOrder: 7 },
      { moduleKey: 'moduleAgentBanking', moduleName: 'Agent Banking', moduleNameAr: 'الوكلاء المصرفيون', monthlyPrice: '200', annualPrice: '2000', sortOrder: 8 },
      { moduleKey: 'moduleLoanRestructuring', moduleName: 'Loan Restructuring', moduleNameAr: 'إعادة هيكلة القروض', monthlyPrice: '100', annualPrice: '1000', sortOrder: 9 },
      { moduleKey: 'moduleOCR', moduleName: 'OCR Document Processing', moduleNameAr: 'معالجة المستندات بالذكاء الاصطناعي', monthlyPrice: '150', annualPrice: '1500', sortOrder: 10 },
      { moduleKey: 'moduleWhatsApp', moduleName: 'WhatsApp Business', moduleNameAr: 'واتساب بيزنس', monthlyPrice: '100', annualPrice: '1000', sortOrder: 11 },
      { moduleKey: 'moduleMobileField', moduleName: 'Mobile Field App (PWA)', moduleNameAr: 'تطبيق الميدان', monthlyPrice: '150', annualPrice: '1500', sortOrder: 12 },
      { moduleKey: 'moduleClientApp', moduleName: 'Digital Client App', moduleNameAr: 'تطبيق العميل الرقمي', monthlyPrice: '100', annualPrice: '1000', sortOrder: 13 },
      { moduleKey: 'moduleMobileWallet', moduleName: 'Mobile Wallet Integration', moduleNameAr: 'المحافظ الإلكترونية', monthlyPrice: '150', annualPrice: '1500', sortOrder: 14 },
      { moduleKey: 'moduleAICollection', moduleName: 'AI Collection Optimization', moduleNameAr: 'تحصيل ذكي بالذكاء الاصطناعي', monthlyPrice: '200', annualPrice: '2000', sortOrder: 15 },
      { moduleKey: 'moduleDynamicPricing', moduleName: 'Dynamic Loan Pricing', moduleNameAr: 'التسعير الديناميكي', monthlyPrice: '150', annualPrice: '1500', sortOrder: 16 },
      { moduleKey: 'moduleCashFlowPrediction', moduleName: 'Cash Flow Prediction', moduleNameAr: 'التنبؤ بالتدفقات النقدية', monthlyPrice: '150', annualPrice: '1500', sortOrder: 17 },
      { moduleKey: 'moduleAIStressTesting', moduleName: 'AI Stress Testing', moduleNameAr: 'اختبارات الضغط بالذكاء الاصطناعي', monthlyPrice: '200', annualPrice: '2000', sortOrder: 18 },
      { moduleKey: 'moduleNLPReporting', moduleName: 'NLP Reporting', moduleNameAr: 'التقارير السردية (NLP)', monthlyPrice: '150', annualPrice: '1500', sortOrder: 19 },
      { moduleKey: 'moduleChurnPrediction', moduleName: 'Churn Prediction & Cross-Sell', moduleNameAr: 'التنبؤ بالعملاء المهددين', monthlyPrice: '150', annualPrice: '1500', sortOrder: 20 },
      { moduleKey: 'moduleIFRS9', moduleName: 'IFRS 9 Provisions', moduleNameAr: 'IFRS 9 والمخصصات', monthlyPrice: '200', annualPrice: '2000', sortOrder: 21 },
      { moduleKey: 'moduleAIRisk', moduleName: 'AI Risk Engine', moduleNameAr: 'محرك المخاطر الذكي', monthlyPrice: '250', annualPrice: '2500', sortOrder: 22 },
      { moduleKey: 'moduleFRAReporting', moduleName: 'FRA Digital Reporting', moduleNameAr: 'تقارير الرقابة المالية (FRA)', monthlyPrice: '100', annualPrice: '1000', sortOrder: 23 },
      { moduleKey: 'moduleIScorelive', moduleName: 'I-Score Live Integration', moduleNameAr: 'I-Score مباشر', monthlyPrice: '200', annualPrice: '2000', sortOrder: 24 },
      { moduleKey: 'modulePDPL', moduleName: 'Data Protection (PDPL)', moduleNameAr: 'حماية البيانات (PDPL)', monthlyPrice: '100', annualPrice: '1000', sortOrder: 25 },
      { moduleKey: 'moduleAML', moduleName: 'AML Screening', moduleNameAr: 'مكافحة غسيل الأموال (AML)', monthlyPrice: '150', annualPrice: '1500', sortOrder: 26 },
      { moduleKey: 'moduleEKYC', moduleName: 'Electronic KYC', moduleNameAr: 'التحقق الإلكتروني (eKYC)', monthlyPrice: '150', annualPrice: '1500', sortOrder: 27 },
      { moduleKey: 'moduleETA', moduleName: 'E-Invoice (ETA)', moduleNameAr: 'الفاتورة الإلكترونية (ETA)', monthlyPrice: '100', annualPrice: '1000', sortOrder: 28 },
    ];

    const existing = await db.select({ moduleKey: modulePricingTable.moduleKey }).from(modulePricingTable);
    const existingKeys = new Set(existing.map(r => r.moduleKey));
    const toInsert = ALL_MODULES.filter(m => !existingKeys.has(m.moduleKey));

    if (toInsert.length > 0) {
      await db.insert(modulePricingTable).values(
        toInsert.map(m => ({
          ...m,
          annualPrice: m.annualPrice,
          isActive: true,
          description: m.moduleName,
          descriptionAr: m.moduleNameAr,
        }))
      );
    }

    const all = await db.select().from(modulePricingTable).orderBy(modulePricingTable.sortOrder);
    res.json({ seeded: toInsert.length, total: all.length, modules: all });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", details: String(err) });
  }
});

export default router;

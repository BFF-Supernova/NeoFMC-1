import { Router } from "express";
import { db, tenantInvoicesTable, tenantsTable, tenantModuleSubscriptionsTable, modulePricingTable, userTypePricingTable, tenantUserLimitsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../lib/auth";

const router = Router();

router.get("/:tenantId/invoices", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const invoices = await db.select().from(tenantInvoicesTable)
      .where(eq(tenantInvoicesTable.tenantId, req.params.tenantId))
      .orderBy(desc(tenantInvoicesTable.createdAt))
      .limit(50);
    res.json(invoices);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/:tenantId/generate-invoice", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    const { periodMonth, periodYear } = req.body;
    const month = periodMonth || new Date().getMonth() + 1;
    const year = periodYear || new Date().getFullYear();

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) { res.status(404).json({ error: "not_found" }); return; }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const moduleSubs = await db.select({
      moduleKey: tenantModuleSubscriptionsTable.moduleKey,
      billingCycle: tenantModuleSubscriptionsTable.billingCycle,
      discountPercent: tenantModuleSubscriptionsTable.discountPercent,
      customMonthlyPrice: tenantModuleSubscriptionsTable.customMonthlyPrice,
    }).from(tenantModuleSubscriptionsTable)
      .where(and(eq(tenantModuleSubscriptionsTable.tenantId, tenantId), eq(tenantModuleSubscriptionsTable.isActive, true)));

    const modulePricing = await db.select().from(modulePricingTable).where(eq(modulePricingTable.isActive, true));
    const pricingMap = new Map(modulePricing.map(p => [p.moduleKey, p]));

    const lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number; category: string }> = [];
    let modulesTotal = 0;

    for (const sub of moduleSubs) {
      const pricing = pricingMap.get(sub.moduleKey);
      if (!pricing) continue;

      let price = sub.customMonthlyPrice ? Number(sub.customMonthlyPrice) : Number(pricing.monthlyPrice);
      const discount = Number(sub.discountPercent || 0);
      if (discount > 0) price = price * (1 - discount / 100);

      lineItems.push({
        description: pricing.moduleName,
        quantity: 1,
        unitPrice: price,
        total: price,
        category: "module",
      });
      modulesTotal += price;
    }

    const userCounts = await db.execute(sql`
      SELECT role, COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId} AND is_active = true
      GROUP BY role
    `);
    const userPricing = await db.select().from(userTypePricingTable).where(eq(userTypePricingTable.isActive, true));
    const userPriceMap = new Map(userPricing.map(p => [p.userType, p]));

    let usersTotal = 0;
    const activeUsersCount = (userCounts.rows as any[]).reduce((s: number, r: any) => s + Number(r.count), 0);

    for (const row of (userCounts.rows as any[])) {
      const pricing = userPriceMap.get(row.role);
      if (!pricing) continue;
      const count = Number(row.count);
      const pricePerUser = Number(pricing.monthlyPricePerUser);
      const total = count * pricePerUser;

      if (total > 0) {
        lineItems.push({
          description: `${pricing.displayName} (${count} users)`,
          quantity: count,
          unitPrice: pricePerUser,
          total,
          category: "users",
        });
        usersTotal += total;
      }
    }

    const taxRate = 0.14;
    const subtotal = modulesTotal + usersTotal;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = `INV-${year}${String(month).padStart(2, "0")}-${tenant.companyName.replace(/\s+/g, "").substring(0, 6).toUpperCase()}`;
    const dueDate = new Date(year, month, 15);

    const [invoice] = await db.insert(tenantInvoicesTable).values({
      tenantId,
      invoiceNumber,
      periodStart,
      periodEnd,
      modulesAmount: modulesTotal.toFixed(2),
      usersAmount: usersTotal.toFixed(2),
      discountAmount: "0",
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      status: "Draft",
      dueDate,
      lineItems,
      activeModulesCount: moduleSubs.length,
      activeUsersCount,
    }).returning();

    res.status(201).json(invoice);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/invoices/:id/status", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { status, paymentMethod, paymentReference } = req.body;
    const validStatuses = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "bad_request", message: `Status must be one of: ${validStatuses.join(", ")}` }); return;
    }

    const updates: any = { status, updatedAt: new Date() };
    if (status === "Paid") {
      updates.paidAt = new Date();
      if (paymentMethod) updates.paymentMethod = paymentMethod;
      if (paymentReference) updates.paymentReference = paymentReference;
    }

    const [updated] = await db.update(tenantInvoicesTable)
      .set(updates)
      .where(eq(tenantInvoicesTable.id, req.params.id))
      .returning();

    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/revenue-summary", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const result = await db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM period_start) as month,
        COUNT(*) as invoice_count,
        SUM(total_amount::numeric) as total_revenue,
        SUM(CASE WHEN status = 'Paid' THEN total_amount::numeric ELSE 0 END) as collected_revenue,
        SUM(modules_amount::numeric) as modules_revenue,
        SUM(users_amount::numeric) as users_revenue
      FROM tenant_invoices
      WHERE EXTRACT(YEAR FROM period_start) = ${year}
      GROUP BY EXTRACT(MONTH FROM period_start)
      ORDER BY month
    `);

    const totalResult = await db.execute(sql`
      SELECT
        COUNT(*) as total_invoices,
        SUM(total_amount::numeric) as total_billed,
        SUM(CASE WHEN status = 'Paid' THEN total_amount::numeric ELSE 0 END) as total_collected,
        SUM(CASE WHEN status IN ('Sent','Overdue') THEN total_amount::numeric ELSE 0 END) as total_outstanding
      FROM tenant_invoices
      WHERE EXTRACT(YEAR FROM period_start) = ${year}
    `);

    res.json({
      year,
      monthly: result.rows,
      summary: (totalResult.rows as any[])?.[0] || {},
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

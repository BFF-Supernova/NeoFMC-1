import { Router } from "express";
import { db, fundProductsTable, loansTable, loanRequestsTable, installmentsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const ADMIN_ROLES = ["SuperAdmin", "TenantAdmin"];

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

const router = Router();
router.use(requireAuth, requireAdmin);

router.post("/preview", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { adjustmentType, scope, productId, newRate, rateChange } = req.body;
    if (!adjustmentType || !["rate_change", "fee_change"].includes(adjustmentType)) {
      res.status(400).json({ error: "bad_request", message: "adjustmentType must be rate_change or fee_change" });
      return;
    }

    let affectedLoansQuery = db.select({
      loanId: loansTable.id,
      currentOutstanding: loansTable.outstandingBalance,
      productName: fundProductsTable.productName,
      currentRate: loanRequestsTable.interestRate,
    })
      .from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .leftJoin(fundProductsTable, eq(loanRequestsTable.productId, fundProductsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    if (scope === "product" && productId) {
      affectedLoansQuery = affectedLoansQuery.where(
        and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"), eq(loanRequestsTable.productId, productId))
      ) as any;
    }

    const affectedLoans = await affectedLoansQuery;

    const preview = affectedLoans.map(loan => {
      const currentRate = Number(loan.currentRate) || 0;
      const appliedNewRate = newRate !== undefined ? Number(newRate) : currentRate + (Number(rateChange) || 0);
      return {
        loanId: loan.loanId,
        productName: loan.productName,
        currentRate,
        newRate: appliedNewRate,
        rateChange: appliedNewRate - currentRate,
        outstanding: Number(loan.currentOutstanding),
      };
    });

    res.json({
      adjustmentType,
      scope: scope || "all",
      affectedLoans: preview.length,
      totalOutstanding: preview.reduce((s, l) => s + l.outstanding, 0),
      loans: preview.slice(0, 50),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/apply", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { adjustmentType, scope, productId, newRate, rateChange, reason } = req.body;
    if (!adjustmentType || !reason) {
      res.status(400).json({ error: "bad_request", message: "adjustmentType and reason required" });
      return;
    }

    if (adjustmentType === "rate_change" && scope === "product" && productId) {
      const appliedRate = newRate !== undefined ? Number(newRate) : undefined;
      if (appliedRate !== undefined) {
        await db.update(fundProductsTable).set({
          interestRate: appliedRate.toString(),
          updatedAt: new Date(),
        } as any).where(and(eq(fundProductsTable.id, productId), eq(fundProductsTable.tenantId, tenantId)));
      }
    }

    const { auditLogsTable } = await import("@workspace/db");
    await db.insert(auditLogsTable).values({
      tenantId,
      userId: req.user!.id,
      action: "bulk_adjustment",
      entityType: "fund_products",
      entityId: productId || "all",
      details: { adjustmentType, scope, productId, newRate, rateChange, reason },
    } as any);

    res.json({ success: true, message: "Bulk adjustment applied" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

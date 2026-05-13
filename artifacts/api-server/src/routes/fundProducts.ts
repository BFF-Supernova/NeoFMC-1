import { Router } from "express";
import { db, fundProductsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const products = await db.select().from(fundProductsTable)
      .where(eq(fundProductsTable.tenantId, tenantId))
      .orderBy(desc(fundProductsTable.createdAt));
    res.json(products.map(formatProduct));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { productName, interestRateType, interestRate, amortizationMethod, minAmount, maxAmount, maxTermMonths, earlyPaymentFeePct } = req.body;
    if (!productName || !interestRateType || !amortizationMethod || !minAmount || !maxAmount) {
      res.status(400).json({ error: "bad_request", message: "Required fields missing" });
      return;
    }

    const CBE_MAX_INTEREST_RATE = 30;
    const CBE_MAX_LOAN_AMOUNT = 200000;
    if (interestRate && Number(interestRate) > CBE_MAX_INTEREST_RATE) {
      res.status(400).json({ error: "cbe_rate_cap_exceeded", message: `Interest rate ${interestRate}% exceeds CBE maximum of ${CBE_MAX_INTEREST_RATE}%. Per CBE microfinance circular, rates must not exceed the cap.` });
      return;
    }
    if (Number(maxAmount) > CBE_MAX_LOAN_AMOUNT) {
      res.status(400).json({ error: "cbe_amount_cap_exceeded", message: `Maximum amount EGP ${maxAmount} exceeds CBE microfinance loan ceiling of EGP ${CBE_MAX_LOAN_AMOUNT.toLocaleString()}.` });
      return;
    }

    const [product] = await db.insert(fundProductsTable).values({
      tenantId,
      productName,
      interestRateType,
      interestRate: (interestRate || 0).toString(),
      amortizationMethod,
      minAmount: minAmount.toString(),
      maxAmount: maxAmount.toString(),
      maxTermMonths: maxTermMonths || 24,
      earlyPaymentFeePct: earlyPaymentFeePct?.toString(),
      isActive: true,
    }).returning();
    res.status(201).json(formatProduct(product));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { id } = req.params;
    const {
      productName, interestRateType, interestRate, amortizationMethod,
      minAmount, maxAmount, maxTermMonths, minTermMonths, adminFeePct,
      insuranceFeePct, penaltyRatePerDay, penaltyCapPct, earlyPaymentFeePct,
      rescheduleFeePct, defaultCommissionPct, gracePeriodDays, requiresGuarantor,
      stampDutyPct, isZeroInterest, amortizationFrequency, isActive,
    } = req.body;

    if (!productName || !interestRateType || !amortizationMethod) {
      res.status(400).json({ error: "bad_request", message: "Product name, interest rate type, and amortization method are required" });
      return;
    }
    if (minAmount === undefined || minAmount === null || maxAmount === undefined || maxAmount === null) {
      res.status(400).json({ error: "bad_request", message: "Minimum and maximum amounts are required" });
      return;
    }
    if (Number(minAmount) <= 0 || Number(maxAmount) <= 0) {
      res.status(400).json({ error: "bad_request", message: "Amounts must be greater than zero" });
      return;
    }
    if (Number(minAmount) > Number(maxAmount)) {
      res.status(400).json({ error: "bad_request", message: "Minimum amount cannot exceed maximum amount" });
      return;
    }
    if (minTermMonths !== undefined && maxTermMonths !== undefined && Number(minTermMonths) > Number(maxTermMonths)) {
      res.status(400).json({ error: "bad_request", message: "Minimum term cannot exceed maximum term" });
      return;
    }

    const CBE_MAX_INTEREST_RATE = 30;
    const CBE_MAX_LOAN_AMOUNT = 200000;
    if (interestRate !== undefined && Number(interestRate) > CBE_MAX_INTEREST_RATE) {
      res.status(400).json({ error: "cbe_rate_cap_exceeded", message: `Interest rate ${interestRate}% exceeds CBE maximum of ${CBE_MAX_INTEREST_RATE}%. Per CBE microfinance circular, rates must not exceed the cap.` });
      return;
    }
    if (maxAmount !== undefined && Number(maxAmount) > CBE_MAX_LOAN_AMOUNT) {
      res.status(400).json({ error: "cbe_amount_cap_exceeded", message: `Maximum amount EGP ${maxAmount} exceeds CBE microfinance loan ceiling of EGP ${CBE_MAX_LOAN_AMOUNT.toLocaleString()}.` });
      return;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (productName !== undefined) updateData.productName = productName;
    if (interestRateType !== undefined) updateData.interestRateType = interestRateType;
    if (interestRate !== undefined) updateData.interestRate = interestRate.toString();
    if (amortizationMethod !== undefined) updateData.amortizationMethod = amortizationMethod;
    if (amortizationFrequency !== undefined) updateData.amortizationFrequency = amortizationFrequency;
    if (minAmount !== undefined) updateData.minAmount = minAmount.toString();
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount.toString();
    if (maxTermMonths !== undefined) updateData.maxTermMonths = maxTermMonths;
    if (minTermMonths !== undefined) updateData.minTermMonths = minTermMonths;
    if (adminFeePct !== undefined) updateData.adminFeePct = adminFeePct?.toString() || "0.00";
    if (insuranceFeePct !== undefined) updateData.insuranceFeePct = insuranceFeePct?.toString() || "0.00";
    if (stampDutyPct !== undefined) updateData.stampDutyPct = stampDutyPct?.toString() || "0.00";
    if (penaltyRatePerDay !== undefined) updateData.penaltyRatePerDay = penaltyRatePerDay?.toString() || "0.00";
    if (penaltyCapPct !== undefined) updateData.penaltyCapPct = penaltyCapPct?.toString() || null;
    if (earlyPaymentFeePct !== undefined) updateData.earlyPaymentFeePct = earlyPaymentFeePct?.toString() || null;
    if (rescheduleFeePct !== undefined) updateData.rescheduleFeePct = rescheduleFeePct?.toString() || null;
    if (defaultCommissionPct !== undefined) updateData.defaultCommissionPct = defaultCommissionPct?.toString() || "0.00";
    if (gracePeriodDays !== undefined) updateData.gracePeriodDays = gracePeriodDays || 0;
    if (requiresGuarantor !== undefined) updateData.requiresGuarantor = requiresGuarantor;
    if (isZeroInterest !== undefined) updateData.isZeroInterest = isZeroInterest;
    if (isActive !== undefined) updateData.isActive = isActive;
    const { arrearsTolerance, holidayHandling } = req.body;
    if (arrearsTolerance !== undefined) updateData.arrearsTolerance = arrearsTolerance?.toString() || "0.00";
    if (holidayHandling !== undefined) updateData.holidayHandling = holidayHandling || "next_business_day";

    const [updated] = await db.update(fundProductsTable)
      .set(updateData)
      .where(and(eq(fundProductsTable.id, id), eq(fundProductsTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found", message: "Product not found" }); return; }
    res.json(formatProduct(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to update product" });
  }
});

function formatProduct(p: typeof fundProductsTable.$inferSelect) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    productName: p.productName,
    interestRateType: p.interestRateType,
    interestRate: Number(p.interestRate),
    amortizationMethod: p.amortizationMethod,
    amortizationFrequency: p.amortizationFrequency,
    isZeroInterest: p.isZeroInterest,
    minAmount: Number(p.minAmount),
    maxAmount: Number(p.maxAmount),
    minTermMonths: p.minTermMonths,
    maxTermMonths: p.maxTermMonths,
    gracePeriodDays: p.gracePeriodDays,
    adminFeePct: Number(p.adminFeePct),
    insuranceFeePct: Number(p.insuranceFeePct),
    stampDutyPct: Number(p.stampDutyPct),
    penaltyRatePerDay: Number(p.penaltyRatePerDay),
    penaltyCapPct: p.penaltyCapPct ? Number(p.penaltyCapPct) : null,
    earlyPaymentFeePct: p.earlyPaymentFeePct ? Number(p.earlyPaymentFeePct) : null,
    rescheduleFeePct: p.rescheduleFeePct ? Number(p.rescheduleFeePct) : null,
    defaultCommissionPct: Number(p.defaultCommissionPct),
    requiresGuarantor: p.requiresGuarantor,
    isActive: p.isActive,
    arrearsTolerance: Number(p.arrearsTolerance || 0),
    holidayHandling: p.holidayHandling || "next_business_day",
    createdAt: p.createdAt,
  };
}

export default router;

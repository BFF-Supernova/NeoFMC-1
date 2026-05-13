import { Request, Response, NextFunction } from "express";

const FINANCIAL_KEYS = new Set([
  "amount", "totalAmount", "paidAmount", "principalAmount", "interestAmount", "penaltyAmount",
  "disbursedAmount", "outstandingBalance", "totalPaid", "requestedAmount", "approvedAmount",
  "totalDisbursedAmount", "totalOutstandingBalance", "disbursedThisMonth", "collectedThisMonth",
  "overdueAmount", "totalCollected", "totalDisbursed", "totalExpenses", "expectedCash",
  "actualCash", "discrepancy", "creditLimit", "drawAmount", "totalEarned", "pendingAmount",
  "commissionAmount", "totalDebit", "totalCredit", "balance", "debitBalance", "creditBalance",
  "current", "days1to30", "days31to60", "days61to90", "days91to180", "days180plus", "totalPar",
  "outstandingPrincipal", "outstandingInterest", "totalDue", "discount", "settlementAmount",
  "earlyPaymentFeePct", "rescheduleFeePct", "defaultCommissionPct", "interestRate",
  "penaltyRatePerDay",
]);

function maskValue(key: string, value: any): any {
  if (FINANCIAL_KEYS.has(key)) {
    if (typeof value === "number") return "***";
    if (typeof value === "string" && value !== "" && !isNaN(Number(value))) return "***";
  }
  return value;
}

function maskObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => maskObject(item));
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null && !(value instanceof Date)) {
        masked[key] = maskObject(value);
      } else {
        masked[key] = maskValue(key, value);
      }
    }
    return masked;
  }
  return obj;
}

export function superAdminFinancialMask(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "SuperAdmin") {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    return originalJson(maskObject(body));
  } as any;

  next();
}

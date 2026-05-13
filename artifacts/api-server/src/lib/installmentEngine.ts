import { db, holidaysTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
}

async function getHolidayDates(tenantId: string): Promise<Set<string>> {
  try {
    const holidays = await db.select({ holidayDate: holidaysTable.holidayDate })
      .from(holidaysTable)
      .where(eq(holidaysTable.tenantId, tenantId));
    return new Set(holidays.map(h => h.holidayDate));
  } catch {
    return new Set();
  }
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6;
}

function adjustToNextBusinessDay(date: Date, holidays: Set<string>): Date {
  const adjusted = new Date(date);
  let attempts = 0;
  while ((isWeekend(adjusted) || holidays.has(adjusted.toISOString().split("T")[0])) && attempts < 30) {
    adjusted.setDate(adjusted.getDate() + 1);
    attempts++;
  }
  return adjusted;
}

export async function generateAmortizationScheduleWithHolidays(params: {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  method: string;
  disbursementDate: Date;
  gracePeriodDays: number;
  tenantId?: string;
  holidayHandling?: string;
}): Promise<InstallmentScheduleItem[]> {
  const { tenantId, holidayHandling } = params;
  let holidays = new Set<string>();
  if (tenantId && holidayHandling !== "none") {
    holidays = await getHolidayDates(tenantId);
  }
  return generateScheduleInternal(params, holidays, holidayHandling || "next_business_day");
}

function generateScheduleInternal(params: {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  method: string;
  disbursementDate: Date;
  gracePeriodDays: number;
}, holidays: Set<string>, holidayHandling: string): InstallmentScheduleItem[] {
  const { principal, annualInterestRate, termMonths, method, disbursementDate, gracePeriodDays } = params;
  const schedule: InstallmentScheduleItem[] = [];
  const monthlyRate = annualInterestRate / 100 / 12;

  const firstDueDate = new Date(disbursementDate);
  firstDueDate.setDate(firstDueDate.getDate() + gracePeriodDays);
  firstDueDate.setMonth(firstDueDate.getMonth() + 1);

  if (method === "Monthly" || method === "Daily" || method === "equal_installments" || method === "declining_balance") {
    if (annualInterestRate === 0) {
      const monthlyPrincipal = round(principal / termMonths);
      let remaining = principal;
      for (let i = 1; i <= termMonths; i++) {
        const princ = i === termMonths ? remaining : monthlyPrincipal;
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        const adjustedDate = holidayHandling !== "none" ? adjustToNextBusinessDay(dueDate, holidays) : dueDate;
        schedule.push({
          installmentNumber: i,
          dueDate: adjustedDate.toISOString().split("T")[0],
          principalAmount: round(princ),
          interestAmount: 0,
          totalAmount: round(princ),
        });
        remaining -= princ;
      }
    } else {
      const emi = round(principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1));
      let remaining = principal;
      for (let i = 1; i <= termMonths; i++) {
        const interest = round(remaining * monthlyRate);
        const princ = i === termMonths ? remaining : round(emi - interest);
        const total = i === termMonths ? round(princ + interest) : emi;
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        const adjustedDate = holidayHandling !== "none" ? adjustToNextBusinessDay(dueDate, holidays) : dueDate;
        schedule.push({
          installmentNumber: i,
          dueDate: adjustedDate.toISOString().split("T")[0],
          principalAmount: round(princ),
          interestAmount: round(interest),
          totalAmount: round(total),
        });
        remaining -= princ;
      }
    }
  }

  return schedule;
}

export function generateAmortizationSchedule(params: {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  method: string;
  disbursementDate: Date;
  gracePeriodDays: number;
}): InstallmentScheduleItem[] {
  return generateScheduleInternal(params, new Set(), "none");
}

export function simulateLoan(params: {
  amount: number;
  termMonths: number;
  interestRate: number;
  amortizationMethod: string;
  adminFeePct: number;
  insuranceFeePct: number;
}) {
  const { amount, termMonths, interestRate, amortizationMethod, adminFeePct, insuranceFeePct } = params;

  const adminFee = round(amount * (adminFeePct || 0) / 100);
  const insuranceFee = round(amount * (insuranceFeePct || 0) / 100);
  const netDisbursement = round(amount - adminFee - insuranceFee);

  const schedule = generateAmortizationSchedule({
    principal: amount,
    annualInterestRate: interestRate,
    termMonths,
    method: amortizationMethod,
    disbursementDate: new Date(),
    gracePeriodDays: 0,
  });

  const totalInterest = round(schedule.reduce((sum, s) => sum + s.interestAmount, 0));
  const totalRepayment = round(schedule.reduce((sum, s) => sum + s.totalAmount, 0));
  const monthlyInstallment = schedule.length > 0 ? schedule[0].totalAmount : 0;

  return {
    monthlyInstallment,
    totalInterest,
    totalRepayment,
    adminFee,
    insuranceFee,
    netDisbursement,
    schedule: schedule.map(s => ({
      month: s.installmentNumber,
      principal: s.principalAmount,
      interest: s.interestAmount,
      total: s.totalAmount,
      remainingBalance: 0,
    })),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

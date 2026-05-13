export interface LoanData {
  id: string;
  outstandingBalance: number;
  daysOverdue: number;
  originalAmount: number;
  interestRate: number;
  termMonths: number;
  disbursementDate: string;
  status: string;
  productType: string;
  branchId: string;
  clientRiskScore?: number;
  isRestructured: boolean;
  collateralValue?: number;
}

export type IFRS9Stage = 1 | 2 | 3;

export interface StagingResult {
  loanId: string;
  stage: IFRS9Stage;
  stageLabel: string;
  reason: string;
  previousStage?: IFRS9Stage;
  stageChanged: boolean;
}

export interface ECLResult {
  loanId: string;
  stage: IFRS9Stage;
  pd: number;
  lgd: number;
  ead: number;
  ecl: number;
  provisionRate: number;
  provisionAmount: number;
}

export interface ProvisioningSummary {
  totalPortfolio: number;
  totalECL: number;
  provisionCoverageRatio: number;
  byStage: {
    stage: IFRS9Stage;
    stageLabel: string;
    loanCount: number;
    totalExposure: number;
    avgPD: number;
    avgLGD: number;
    totalECL: number;
    provisionRate: number;
  }[];
  byProduct: Record<string, { exposure: number; ecl: number; count: number }>;
  byBranch: Record<string, { exposure: number; ecl: number; count: number }>;
}

const CBE_PROVISIONING_MATRIX: Record<string, { minRate: number; maxRate: number; stage: IFRS9Stage }> = {
  "current": { minRate: 0.01, maxRate: 0.05, stage: 1 },
  "watch": { minRate: 0.05, maxRate: 0.10, stage: 1 },
  "substandard": { minRate: 0.15, maxRate: 0.25, stage: 2 },
  "doubtful": { minRate: 0.25, maxRate: 0.50, stage: 2 },
  "loss": { minRate: 0.50, maxRate: 1.00, stage: 3 },
};

const PD_BY_DAYS_OVERDUE: Record<string, number> = {
  "0": 0.02,
  "1-30": 0.05,
  "31-60": 0.15,
  "61-90": 0.30,
  "91-180": 0.55,
  "181-365": 0.80,
  "365+": 0.95,
};

function getDaysOverdueBucket(daysOverdue: number): string {
  if (daysOverdue === 0) return "0";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  if (daysOverdue <= 180) return "91-180";
  if (daysOverdue <= 365) return "181-365";
  return "365+";
}

export function classifyStage(loan: LoanData, previousStage?: IFRS9Stage): StagingResult {
  let stage: IFRS9Stage;
  let reason: string;

  if (loan.status === "WrittenOff") {
    stage = 3;
    reason = "Loan written off";
  } else if (loan.daysOverdue > 90 || loan.status === "Default") {
    stage = 3;
    reason = `Credit impaired: ${loan.daysOverdue} days overdue`;
  } else if (
    loan.daysOverdue > 30 ||
    loan.isRestructured ||
    (loan.clientRiskScore && loan.clientRiskScore > 70)
  ) {
    stage = 2;
    reason = loan.isRestructured
      ? "Significant increase in credit risk: Restructured loan"
      : loan.daysOverdue > 30
        ? `Significant increase in credit risk: ${loan.daysOverdue} days overdue`
        : "Significant increase in credit risk: High client risk score";
  } else {
    stage = 1;
    reason = "Performing loan with no significant increase in credit risk";
  }

  const stageLabels: Record<number, string> = {
    1: "Performing",
    2: "Underperforming",
    3: "Non-performing / Default",
  };

  return {
    loanId: loan.id,
    stage,
    stageLabel: stageLabels[stage],
    reason,
    previousStage,
    stageChanged: previousStage !== undefined && previousStage !== stage,
  };
}

export function calculatePD(loan: LoanData, stage: IFRS9Stage): number {
  const bucket = getDaysOverdueBucket(loan.daysOverdue);
  let basePD = PD_BY_DAYS_OVERDUE[bucket] || 0.02;

  if (loan.isRestructured) basePD = Math.min(basePD * 1.5, 1.0);
  if (loan.clientRiskScore && loan.clientRiskScore > 60) {
    basePD = Math.min(basePD * (1 + (loan.clientRiskScore - 60) / 100), 1.0);
  }

  if (stage === 1) {
    return Math.min(basePD, 0.15);
  } else if (stage === 2) {
    const remainingMonths = Math.max(loan.termMonths - monthsSinceDisbursement(loan.disbursementDate), 1);
    return Math.min(1 - Math.pow(1 - basePD, remainingMonths / 12), 0.90);
  }
  return Math.min(basePD, 1.0);
}

function monthsSinceDisbursement(disbursementDate: string): number {
  const disbursed = new Date(disbursementDate);
  const now = new Date();
  return (now.getFullYear() - disbursed.getFullYear()) * 12 + (now.getMonth() - disbursed.getMonth());
}

export function calculateLGD(loan: LoanData): number {
  const baseLGD = 0.65;

  if (loan.collateralValue && loan.collateralValue > 0) {
    const collateralCoverage = loan.collateralValue / loan.outstandingBalance;
    const haircut = 0.30;
    const adjustedCoverage = collateralCoverage * (1 - haircut);
    return Math.max(baseLGD * (1 - adjustedCoverage), 0.10);
  }

  return baseLGD;
}

export function calculateEAD(loan: LoanData): number {
  return loan.outstandingBalance;
}

export function calculateECL(loan: LoanData, previousStage?: IFRS9Stage): ECLResult {
  const staging = classifyStage(loan, previousStage);
  const pd = calculatePD(loan, staging.stage);
  const lgd = calculateLGD(loan);
  const ead = calculateEAD(loan);
  const ecl = pd * lgd * ead;

  const provisionRate = ecl / (ead || 1);

  return {
    loanId: loan.id,
    stage: staging.stage,
    pd: Math.round(pd * 10000) / 10000,
    lgd: Math.round(lgd * 10000) / 10000,
    ead: Math.round(ead * 100) / 100,
    ecl: Math.round(ecl * 100) / 100,
    provisionRate: Math.round(provisionRate * 10000) / 10000,
    provisionAmount: Math.round(ecl * 100) / 100,
  };
}

export function calculatePortfolioProvisions(loans: LoanData[]): ProvisioningSummary {
  const results = loans.map(loan => calculateECL(loan));

  const byStageMap = new Map<IFRS9Stage, { loans: ECLResult[]; totalExposure: number; totalECL: number }>();

  for (const result of results) {
    if (!byStageMap.has(result.stage)) {
      byStageMap.set(result.stage, { loans: [], totalExposure: 0, totalECL: 0 });
    }
    const stageData = byStageMap.get(result.stage)!;
    stageData.loans.push(result);
    stageData.totalExposure += result.ead;
    stageData.totalECL += result.ecl;
  }

  const stageLabels: Record<number, string> = { 1: "Performing", 2: "Underperforming", 3: "Non-performing" };

  const byStage = Array.from(byStageMap.entries()).map(([stage, data]) => ({
    stage,
    stageLabel: stageLabels[stage],
    loanCount: data.loans.length,
    totalExposure: Math.round(data.totalExposure * 100) / 100,
    avgPD: data.loans.reduce((sum, l) => sum + l.pd, 0) / data.loans.length,
    avgLGD: data.loans.reduce((sum, l) => sum + l.lgd, 0) / data.loans.length,
    totalECL: Math.round(data.totalECL * 100) / 100,
    provisionRate: data.totalExposure > 0 ? Math.round((data.totalECL / data.totalExposure) * 10000) / 10000 : 0,
  }));

  const totalPortfolio = results.reduce((sum, r) => sum + r.ead, 0);
  const totalECL = results.reduce((sum, r) => sum + r.ecl, 0);

  const byProduct: Record<string, { exposure: number; ecl: number; count: number }> = {};
  const byBranch: Record<string, { exposure: number; ecl: number; count: number }> = {};

  for (let i = 0; i < loans.length; i++) {
    const loan = loans[i];
    const result = results[i];

    if (!byProduct[loan.productType]) byProduct[loan.productType] = { exposure: 0, ecl: 0, count: 0 };
    byProduct[loan.productType].exposure += result.ead;
    byProduct[loan.productType].ecl += result.ecl;
    byProduct[loan.productType].count++;

    if (!byBranch[loan.branchId]) byBranch[loan.branchId] = { exposure: 0, ecl: 0, count: 0 };
    byBranch[loan.branchId].exposure += result.ead;
    byBranch[loan.branchId].ecl += result.ecl;
    byBranch[loan.branchId].count++;
  }

  return {
    totalPortfolio: Math.round(totalPortfolio * 100) / 100,
    totalECL: Math.round(totalECL * 100) / 100,
    provisionCoverageRatio: totalPortfolio > 0 ? Math.round((totalECL / totalPortfolio) * 10000) / 10000 : 0,
    byStage,
    byProduct,
    byBranch,
  };
}

export function getCBEProvisioningMatrix() {
  return CBE_PROVISIONING_MATRIX;
}

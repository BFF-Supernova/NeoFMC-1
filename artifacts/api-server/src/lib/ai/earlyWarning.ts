export interface EWSConfig {
  daysOverdueWarning: number;
  daysOverdueCritical: number;
  parRatioWarning: number;
  parRatioCritical: number;
  concentrationWarning: number;
  collectionRateWarning: number;
  dormantDaysThreshold: number;
  riskScoreThreshold: number;
}

export const DEFAULT_EWS_CONFIG: EWSConfig = {
  daysOverdueWarning: 15,
  daysOverdueCritical: 45,
  parRatioWarning: 0.05,
  parRatioCritical: 0.10,
  concentrationWarning: 0.15,
  collectionRateWarning: 0.85,
  dormantDaysThreshold: 60,
  riskScoreThreshold: 70,
};

export interface EWSAlert {
  alertId: string;
  type: string;
  severity: "info" | "warning" | "critical";
  category: "loan" | "portfolio" | "client" | "branch" | "operational";
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
  entityId?: string;
  entityType?: string;
  recommendedAction: string;
  createdAt: Date;
}

export interface LoanMetrics {
  loanId: string;
  clientId: string;
  clientName: string;
  branchId: string;
  outstandingBalance: number;
  daysOverdue: number;
  missedInstallments: number;
  lastPaymentDate?: string;
  lastContactDate?: string;
  riskScore: number;
  isRestructured: boolean;
  productType: string;
}

export interface PortfolioMetrics {
  totalPortfolio: number;
  parRatio: number;
  par30Amount: number;
  par60Amount: number;
  par90Amount: number;
  collectionRate: number;
  disbursementVolume: number;
  writeOffAmount: number;
  topBorrowerConcentration: number;
  branchConcentration: Record<string, number>;
}

export function generateLoanAlerts(loan: LoanMetrics, config: EWSConfig = DEFAULT_EWS_CONFIG): EWSAlert[] {
  const alerts: EWSAlert[] = [];
  const now = new Date();

  if (loan.daysOverdue >= config.daysOverdueCritical) {
    alerts.push({
      alertId: `EWS-L-${loan.loanId}-CRIT`,
      type: "overdue_critical",
      severity: "critical",
      category: "loan",
      title: "Critical Overdue Alert",
      description: `Loan ${loan.loanId} for ${loan.clientName} is ${loan.daysOverdue} days overdue`,
      metric: "days_overdue",
      currentValue: loan.daysOverdue,
      threshold: config.daysOverdueCritical,
      entityId: loan.loanId,
      entityType: "loan",
      recommendedAction: "Escalate to branch manager for immediate field visit and restructuring assessment",
      createdAt: now,
    });
  } else if (loan.daysOverdue >= config.daysOverdueWarning) {
    alerts.push({
      alertId: `EWS-L-${loan.loanId}-WARN`,
      type: "overdue_warning",
      severity: "warning",
      category: "loan",
      title: "Early Overdue Warning",
      description: `Loan ${loan.loanId} for ${loan.clientName} is ${loan.daysOverdue} days overdue`,
      metric: "days_overdue",
      currentValue: loan.daysOverdue,
      threshold: config.daysOverdueWarning,
      entityId: loan.loanId,
      entityType: "loan",
      recommendedAction: "Assign collection officer for phone follow-up within 48 hours",
      createdAt: now,
    });
  }

  if (loan.lastPaymentDate) {
    const daysSincePayment = (now.getTime() - new Date(loan.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePayment > config.dormantDaysThreshold && loan.outstandingBalance > 0) {
      alerts.push({
        alertId: `EWS-L-${loan.loanId}-DORM`,
        type: "dormant_loan",
        severity: "warning",
        category: "loan",
        title: "Dormant Loan Alert",
        description: `No payment received for ${Math.round(daysSincePayment)} days on active loan`,
        metric: "days_since_payment",
        currentValue: Math.round(daysSincePayment),
        threshold: config.dormantDaysThreshold,
        entityId: loan.loanId,
        entityType: "loan",
        recommendedAction: "Schedule immediate field visit to assess client situation",
        createdAt: now,
      });
    }
  }

  if (loan.riskScore > config.riskScoreThreshold) {
    alerts.push({
      alertId: `EWS-L-${loan.loanId}-RISK`,
      type: "high_risk_score",
      severity: loan.riskScore > 85 ? "critical" : "warning",
      category: "client",
      title: "High Risk Client",
      description: `Client ${loan.clientName} has elevated risk score of ${loan.riskScore}`,
      metric: "risk_score",
      currentValue: loan.riskScore,
      threshold: config.riskScoreThreshold,
      entityId: loan.clientId,
      entityType: "client",
      recommendedAction: "Review client portfolio and consider exposure reduction",
      createdAt: now,
    });
  }

  if (loan.missedInstallments >= 2 && loan.daysOverdue < config.daysOverdueWarning) {
    alerts.push({
      alertId: `EWS-L-${loan.loanId}-MISS`,
      type: "missed_installments_pattern",
      severity: "warning",
      category: "loan",
      title: "Payment Pattern Deterioration",
      description: `${loan.missedInstallments} missed installments detected — potential deterioration`,
      metric: "missed_installments",
      currentValue: loan.missedInstallments,
      threshold: 2,
      entityId: loan.loanId,
      entityType: "loan",
      recommendedAction: "Contact client proactively to assess financial capacity",
      createdAt: now,
    });
  }

  return alerts;
}

export function generatePortfolioAlerts(metrics: PortfolioMetrics, config: EWSConfig = DEFAULT_EWS_CONFIG): EWSAlert[] {
  const alerts: EWSAlert[] = [];
  const now = new Date();

  if (metrics.parRatio >= config.parRatioCritical) {
    alerts.push({
      alertId: `EWS-P-PAR-CRIT-${Date.now()}`,
      type: "par_ratio_critical",
      severity: "critical",
      category: "portfolio",
      title: "Portfolio at Risk — Critical",
      description: `PAR ratio at ${(metrics.parRatio * 100).toFixed(1)}% exceeds critical threshold`,
      metric: "par_ratio",
      currentValue: metrics.parRatio,
      threshold: config.parRatioCritical,
      recommendedAction: "Emergency portfolio review and intensified collection campaign required",
      createdAt: now,
    });
  } else if (metrics.parRatio >= config.parRatioWarning) {
    alerts.push({
      alertId: `EWS-P-PAR-WARN-${Date.now()}`,
      type: "par_ratio_warning",
      severity: "warning",
      category: "portfolio",
      title: "Portfolio at Risk — Warning",
      description: `PAR ratio at ${(metrics.parRatio * 100).toFixed(1)}% approaching critical levels`,
      metric: "par_ratio",
      currentValue: metrics.parRatio,
      threshold: config.parRatioWarning,
      recommendedAction: "Review delinquent accounts and strengthen collection efforts",
      createdAt: now,
    });
  }

  if (metrics.collectionRate < config.collectionRateWarning) {
    alerts.push({
      alertId: `EWS-P-COLL-${Date.now()}`,
      type: "low_collection_rate",
      severity: "warning",
      category: "portfolio",
      title: "Low Collection Efficiency",
      description: `Collection rate at ${(metrics.collectionRate * 100).toFixed(1)}% below target`,
      metric: "collection_rate",
      currentValue: metrics.collectionRate,
      threshold: config.collectionRateWarning,
      recommendedAction: "Analyze collection bottlenecks and reallocate field officers",
      createdAt: now,
    });
  }

  if (metrics.topBorrowerConcentration > config.concentrationWarning) {
    alerts.push({
      alertId: `EWS-P-CONC-${Date.now()}`,
      type: "borrower_concentration",
      severity: "warning",
      category: "portfolio",
      title: "Borrower Concentration Risk",
      description: `Top borrower represents ${(metrics.topBorrowerConcentration * 100).toFixed(1)}% of portfolio`,
      metric: "concentration",
      currentValue: metrics.topBorrowerConcentration,
      threshold: config.concentrationWarning,
      recommendedAction: "Diversify lending and set per-borrower exposure limits",
      createdAt: now,
    });
  }

  return alerts;
}

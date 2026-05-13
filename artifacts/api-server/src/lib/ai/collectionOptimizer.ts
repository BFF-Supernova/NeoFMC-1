export interface CollectionStrategy {
  clientId: string;
  priority: number;
  recommendedChannel: "sms" | "whatsapp" | "phone_call" | "field_visit" | "legal_notice";
  recommendedTime: string;
  estimatedRecovery: number;
  reasoning: string[];
}

export interface CollectionInput {
  clientId: string;
  clientName: string;
  outstandingAmount: number;
  daysOverdue: number;
  totalOverdueInstallments: number;
  lastPaymentDate: string | null;
  lastContactDate: string | null;
  lastContactChannel: string | null;
  contactAttempts: number;
  brokenPromises: number;
  onTimePayments: number;
  totalPayments: number;
  phone: string | null;
  hasWhatsApp: boolean;
  address: string | null;
  governorate: string | null;
}

export function optimizeCollectionStrategy(clients: CollectionInput[]): CollectionStrategy[] {
  return clients.map(client => {
    const priority = calculatePriority(client);
    const channel = recommendChannel(client);
    const time = recommendTime(client);
    const recovery = estimateRecovery(client);
    const reasoning = buildReasoning(client, channel);

    return {
      clientId: client.clientId,
      priority,
      recommendedChannel: channel,
      recommendedTime: time,
      estimatedRecovery: recovery,
      reasoning,
    };
  }).sort((a, b) => b.priority - a.priority);
}

function calculatePriority(client: CollectionInput): number {
  let score = 0;
  score += Math.min(client.outstandingAmount / 10000, 30);
  if (client.daysOverdue <= 7) score += 25;
  else if (client.daysOverdue <= 30) score += 20;
  else if (client.daysOverdue <= 60) score += 15;
  else if (client.daysOverdue <= 90) score += 10;
  else score += 5;

  const paymentRate = client.totalPayments > 0 ? client.onTimePayments / client.totalPayments : 0;
  score += paymentRate * 20;

  if (client.brokenPromises > 2) score += 15;
  else if (client.brokenPromises > 0) score += 8;

  if (client.contactAttempts === 0) score += 10;

  return Math.min(100, Math.round(score));
}

function recommendChannel(client: CollectionInput): "sms" | "whatsapp" | "phone_call" | "field_visit" | "legal_notice" {
  if (client.daysOverdue > 90 && client.brokenPromises > 3) return "legal_notice";
  if (client.daysOverdue > 60 || (client.contactAttempts > 5 && client.brokenPromises > 1)) return "field_visit";
  if (client.daysOverdue > 30 || client.brokenPromises > 0) return "phone_call";
  if (client.hasWhatsApp && client.daysOverdue <= 14) return "whatsapp";
  return "sms";
}

function recommendTime(client: CollectionInput): string {
  if (client.governorate && ["North Sinai", "South Sinai", "Red Sea", "Matruh", "New Valley"].includes(client.governorate)) {
    return "09:00-11:00";
  }
  if (client.daysOverdue > 60) return "10:00-12:00";
  return "14:00-16:00";
}

function estimateRecovery(client: CollectionInput): number {
  const paymentRate = client.totalPayments > 0 ? client.onTimePayments / client.totalPayments : 0.5;
  let base = paymentRate;
  if (client.daysOverdue > 180) base *= 0.3;
  else if (client.daysOverdue > 90) base *= 0.5;
  else if (client.daysOverdue > 30) base *= 0.7;

  if (client.brokenPromises > 2) base *= 0.6;
  if (!client.lastPaymentDate) base *= 0.4;

  return Math.round(Math.min(1, Math.max(0, base)) * client.outstandingAmount * 100) / 100;
}

function buildReasoning(client: CollectionInput, channel: string): string[] {
  const reasons: string[] = [];
  if (client.daysOverdue <= 7) reasons.push("Early-stage overdue — gentle reminder effective");
  else if (client.daysOverdue > 90) reasons.push("Severely overdue — escalation needed");

  if (client.brokenPromises > 0) reasons.push(`${client.brokenPromises} broken payment promise(s) — reduce trust level`);
  if (client.contactAttempts > 3) reasons.push(`${client.contactAttempts} prior contacts without resolution`);

  const paymentRate = client.totalPayments > 0 ? (client.onTimePayments / client.totalPayments * 100).toFixed(0) : "N/A";
  reasons.push(`Historical on-time rate: ${paymentRate}%`);

  if (channel === "field_visit") reasons.push("Remote/difficult contact — field visit recommended");
  if (channel === "legal_notice") reasons.push("Extended non-payment — legal escalation recommended per FRA guidelines");

  return reasons;
}

export interface DynamicPricingResult {
  baseRate: number;
  adjustedRate: number;
  discount: number;
  riskPremium: number;
  finalRate: number;
  reasoning: string[];
}

export function calculateDynamicPrice(creditScore: number, baseRate: number, loanAmount: number, termMonths: number, maxRate = 30): DynamicPricingResult {
  const reasoning: string[] = [];
  let riskPremium = 0;
  let discount = 0;

  if (creditScore >= 80) {
    discount = baseRate * 0.15;
    reasoning.push("Excellent credit score — 15% rate discount");
  } else if (creditScore >= 65) {
    discount = baseRate * 0.08;
    reasoning.push("Good credit score — 8% rate discount");
  } else if (creditScore >= 50) {
    reasoning.push("Average credit score — standard rate applies");
  } else if (creditScore >= 35) {
    riskPremium = baseRate * 0.10;
    reasoning.push("Below average credit — 10% risk premium");
  } else {
    riskPremium = baseRate * 0.20;
    reasoning.push("High risk — 20% risk premium");
  }

  if (loanAmount > 100000) {
    discount += baseRate * 0.03;
    reasoning.push("Large loan amount — 3% volume discount");
  }
  if (termMonths <= 6) {
    discount += baseRate * 0.02;
    reasoning.push("Short term — 2% term discount");
  }

  const adjustedRate = baseRate - discount + riskPremium;
  const finalRate = Math.min(maxRate, Math.max(baseRate * 0.5, adjustedRate));
  reasoning.push(`CBE cap enforced: max ${maxRate}%`);

  return { baseRate, adjustedRate: Math.round(adjustedRate * 100) / 100, discount: Math.round(discount * 100) / 100, riskPremium: Math.round(riskPremium * 100) / 100, finalRate: Math.round(finalRate * 100) / 100, reasoning };
}

export interface CashFlowPrediction {
  date: string;
  expectedCollections: number;
  expectedDisbursements: number;
  netCashFlow: number;
  confidence: number;
}

export function predictBranchCashFlow(historicalData: Array<{ date: string; collections: number; disbursements: number }>, daysAhead: number): CashFlowPrediction[] {
  if (historicalData.length === 0) return [];

  const avgCollections = historicalData.reduce((sum, d) => sum + d.collections, 0) / historicalData.length;
  const avgDisbursements = historicalData.reduce((sum, d) => sum + d.disbursements, 0) / historicalData.length;

  const collectionVariance = historicalData.reduce((sum, d) => sum + Math.pow(d.collections - avgCollections, 2), 0) / historicalData.length;
  const baseConfidence = Math.max(0.4, 1 - Math.sqrt(collectionVariance) / (avgCollections || 1));

  const predictions: CashFlowPrediction[] = [];
  const now = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    let dayMultiplier = 1;
    if (dayOfWeek === 5) dayMultiplier = 0.3;
    else if (dayOfWeek === 6) dayMultiplier = 0.5;
    else if (dayOfWeek === 0 || dayOfWeek === 1) dayMultiplier = 1.2;

    if (date.getDate() <= 5 || date.getDate() >= 25) dayMultiplier *= 1.3;

    const expectedCollections = Math.round(avgCollections * dayMultiplier * 100) / 100;
    const expectedDisbursements = Math.round(avgDisbursements * dayMultiplier * 0.8 * 100) / 100;
    const confidence = Math.round(Math.max(0.3, baseConfidence - (i * 0.02)) * 100) / 100;

    predictions.push({
      date: date.toISOString().split("T")[0],
      expectedCollections,
      expectedDisbursements,
      netCashFlow: Math.round((expectedCollections - expectedDisbursements) * 100) / 100,
      confidence,
    });
  }

  return predictions;
}

export interface StressTestResult {
  scenario: string;
  description: string;
  impactOnPAR: number;
  impactOnECL: number;
  impactOnCollectionRate: number;
  portfolioLossEstimate: number;
  riskLevel: "low" | "medium" | "high" | "severe";
  recommendations: string[];
}

export function runStressTest(portfolio: { totalOutstanding: number; par30: number; par90: number; collectionRate: number; eclTotal: number }, scenario: string): StressTestResult {
  const scenarios: Record<string, { parMultiplier: number; eclMultiplier: number; collectionDrop: number; desc: string }> = {
    inflation_5pct: { parMultiplier: 1.15, eclMultiplier: 1.20, collectionDrop: 0.05, desc: "5% inflation increase scenario" },
    inflation_10pct: { parMultiplier: 1.35, eclMultiplier: 1.50, collectionDrop: 0.12, desc: "10% inflation increase scenario" },
    currency_devaluation: { parMultiplier: 1.25, eclMultiplier: 1.40, collectionDrop: 0.10, desc: "20% EGP devaluation scenario" },
    sector_downturn: { parMultiplier: 1.50, eclMultiplier: 1.80, collectionDrop: 0.15, desc: "Microfinance sector downturn" },
    natural_disaster: { parMultiplier: 2.00, eclMultiplier: 2.50, collectionDrop: 0.30, desc: "Natural disaster in key governorate" },
    regulatory_change: { parMultiplier: 1.10, eclMultiplier: 1.15, collectionDrop: 0.03, desc: "Regulatory tightening (rate caps reduction)" },
    pandemic: { parMultiplier: 1.80, eclMultiplier: 2.20, collectionDrop: 0.25, desc: "Pandemic-level economic disruption" },
    competitor_entry: { parMultiplier: 1.05, eclMultiplier: 1.08, collectionDrop: 0.02, desc: "New competitor enters market" },
  };

  const config = scenarios[scenario] || scenarios.inflation_5pct;
  const newPAR = portfolio.par30 * config.parMultiplier;
  const newECL = portfolio.eclTotal * config.eclMultiplier;
  const newCollectionRate = Math.max(0, portfolio.collectionRate - config.collectionDrop);
  const portfolioLoss = (newECL - portfolio.eclTotal);

  const impactPct = portfolioLoss / portfolio.totalOutstanding;
  const riskLevel = impactPct > 0.15 ? "severe" : impactPct > 0.08 ? "high" : impactPct > 0.03 ? "medium" : "low";

  const recommendations: string[] = [];
  if (riskLevel === "severe" || riskLevel === "high") {
    recommendations.push("Increase provision coverage ratio immediately");
    recommendations.push("Tighten credit scoring thresholds");
    recommendations.push("Accelerate collection efforts on PAR 30+ loans");
  }
  if (config.collectionDrop > 0.10) {
    recommendations.push("Activate emergency collection task force");
    recommendations.push("Consider loan restructuring programs for affected clients");
  }
  recommendations.push("Review portfolio concentration limits");
  recommendations.push("Update board on stress test results per CBE guidelines");

  return {
    scenario, description: config.desc,
    impactOnPAR: Math.round((newPAR - portfolio.par30) * 100) / 100,
    impactOnECL: Math.round((newECL - portfolio.eclTotal) * 100) / 100,
    impactOnCollectionRate: Math.round(config.collectionDrop * 10000) / 100,
    portfolioLossEstimate: Math.round(portfolioLoss * 100) / 100,
    riskLevel,
    recommendations,
  };
}

export interface ChurnPrediction {
  clientId: string;
  churnProbability: number;
  riskLevel: "low" | "medium" | "high";
  factors: string[];
  recommendedAction: string;
  crossSellOpportunities: string[];
}

export function predictChurn(clients: Array<{
  clientId: string; loanCount: number; avgLoanSize: number; lastLoanDate: string;
  onTimeRate: number; daysSinceLastActivity: number; hasSavings: boolean;
  hasInsurance: boolean; satisfactionScore?: number;
}>): ChurnPrediction[] {
  return clients.map(client => {
    let churnScore = 0;
    const factors: string[] = [];
    const crossSell: string[] = [];

    if (client.daysSinceLastActivity > 180) { churnScore += 30; factors.push("No activity for 6+ months"); }
    else if (client.daysSinceLastActivity > 90) { churnScore += 15; factors.push("Inactive for 3+ months"); }

    if (client.loanCount <= 1) { churnScore += 15; factors.push("Single-loan client — low engagement"); }
    if (client.onTimeRate < 0.7) { churnScore += 10; factors.push("Below-average repayment history"); }
    if (client.satisfactionScore !== undefined && client.satisfactionScore < 3) { churnScore += 20; factors.push("Low satisfaction score"); }

    if (!client.hasSavings) { churnScore += 5; crossSell.push("Savings account — increases engagement and retention"); }
    if (!client.hasInsurance) { crossSell.push("Credit life insurance — adds value and protection"); }
    if (client.loanCount >= 3 && client.onTimeRate > 0.85) { crossSell.push("Larger loan amount — reward loyalty with higher limit"); }

    const probability = Math.min(1, churnScore / 100);
    const riskLevel = probability > 0.6 ? "high" : probability > 0.3 ? "medium" : "low";

    let action = "Standard engagement";
    if (riskLevel === "high") action = "Proactive outreach — offer loyalty incentive or rate discount";
    else if (riskLevel === "medium") action = "Schedule follow-up call to discuss next loan cycle";

    return { clientId: client.clientId, churnProbability: Math.round(probability * 100) / 100, riskLevel, factors, recommendedAction: action, crossSellOpportunities: crossSell };
  }).sort((a, b) => b.churnProbability - a.churnProbability);
}

export interface CreditFeatures {
  age: number;
  monthlyIncome: number;
  employmentYears: number;
  existingLoans: number;
  previousLoansCount: number;
  previousDefaultsCount: number;
  repaymentHistory: number;
  daysOverdueHistory: number;
  loanToIncomeRatio: number;
  requestedAmount: number;
  requestedTermMonths: number;
  dependents: number;
  hasCollateral: boolean;
  collateralValue: number;
  iScoreValue: number;
  isGroupLoan: boolean;
  groupSize: number;
  groupRepaymentRate: number;
  governorate: string;
  clientCategory: string;
  daysSinceLastLoan: number;
}

export interface FeatureContribution {
  feature: string;
  value: number;
  weight: number;
  contribution: number;
  direction: "positive" | "negative" | "neutral";
  description: string;
}

export interface CreditScoreResult {
  score: number;
  probability: number;
  decision: "approve" | "review" | "decline";
  riskBucket: "very_low" | "low" | "medium" | "high" | "very_high";
  maxRecommendedAmount: number;
  maxRecommendedTerm: number;
  explanations: FeatureContribution[];
  modelVersion: string;
  scoredAt: Date;
}

const FEATURE_WEIGHTS: Record<string, { weight: number; direction: "positive" | "negative"; normalize: (v: number) => number }> = {
  repaymentHistory: { weight: 0.20, direction: "positive", normalize: (v) => Math.min(v / 100, 1) },
  iScoreValue: { weight: 0.15, direction: "positive", normalize: (v) => Math.min(v / 850, 1) },
  loanToIncomeRatio: { weight: 0.12, direction: "negative", normalize: (v) => Math.min(v / 100, 1) },
  previousDefaultsCount: { weight: 0.12, direction: "negative", normalize: (v) => Math.min(v / 5, 1) },
  employmentYears: { weight: 0.08, direction: "positive", normalize: (v) => Math.min(v / 20, 1) },
  age: { weight: 0.05, direction: "positive", normalize: (v) => {
    if (v < 21) return 0.3;
    if (v < 25) return 0.6;
    if (v <= 55) return 1.0;
    if (v <= 65) return 0.7;
    return 0.4;
  }},
  daysOverdueHistory: { weight: 0.10, direction: "negative", normalize: (v) => Math.min(v / 180, 1) },
  hasCollateral: { weight: 0.05, direction: "positive", normalize: (v) => v ? 1 : 0 },
  groupRepaymentRate: { weight: 0.05, direction: "positive", normalize: (v) => Math.min(v / 100, 1) },
  previousLoansCount: { weight: 0.04, direction: "positive", normalize: (v) => Math.min(v / 10, 1) },
  dependents: { weight: 0.04, direction: "negative", normalize: (v) => Math.min(v / 10, 1) },
};

const GOVERNORATE_RISK: Record<string, number> = {
  "Cairo": 0.0, "Alexandria": 0.0, "Giza": 0.0,
  "Qalyubia": 0.02, "Dakahlia": 0.02, "Gharbia": 0.02, "Monufia": 0.02,
  "Sharqia": 0.03, "Beheira": 0.03, "Kafr El Sheikh": 0.03,
  "Minya": 0.05, "Asyut": 0.05, "Sohag": 0.05, "Qena": 0.05,
  "Fayoum": 0.04, "Beni Suef": 0.04,
  "Aswan": 0.04, "Luxor": 0.03,
  "North Sinai": 0.08, "South Sinai": 0.06,
  "Red Sea": 0.04, "New Valley": 0.05, "Matruh": 0.06,
};

export function calculateCreditScore(features: CreditFeatures): CreditScoreResult {
  const explanations: FeatureContribution[] = [];
  let rawScore = 0;

  for (const [featureName, config] of Object.entries(FEATURE_WEIGHTS)) {
    const featureValue = (features as any)[featureName];
    if (featureValue === undefined || featureValue === null) continue;

    const normalized = config.normalize(typeof featureValue === "boolean" ? (featureValue ? 1 : 0) : featureValue);
    const contribution = config.direction === "positive"
      ? normalized * config.weight
      : (1 - normalized) * config.weight;

    rawScore += contribution;

    explanations.push({
      feature: featureName,
      value: typeof featureValue === "boolean" ? (featureValue ? 1 : 0) : featureValue,
      weight: config.weight,
      contribution: Math.round(contribution * 1000) / 1000,
      direction: contribution > config.weight * 0.5 ? "positive" : contribution < config.weight * 0.3 ? "negative" : "neutral",
      description: getFeatureDescription(featureName, featureValue, contribution, config.weight),
    });
  }

  const govRisk = GOVERNORATE_RISK[features.governorate] || 0.03;
  rawScore -= govRisk;

  if (features.governorate) {
    explanations.push({
      feature: "governorate",
      value: govRisk,
      weight: 0.08,
      contribution: -govRisk,
      direction: govRisk > 0.04 ? "negative" : "neutral",
      description: `Geographic risk adjustment for ${features.governorate}`,
    });
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

  const probability = 1 / (1 + Math.exp(-(rawScore - 0.5) * 8));

  const riskBucket = score >= 80 ? "very_low" :
    score >= 65 ? "low" :
    score >= 50 ? "medium" :
    score >= 35 ? "high" : "very_high";

  const decision = score >= 60 ? "approve" :
    score >= 40 ? "review" : "decline";

  const incomeMultiplier = score >= 70 ? 8 : score >= 50 ? 5 : 3;
  const maxRecommendedAmount = Math.round(features.monthlyIncome * incomeMultiplier);
  const maxRecommendedTerm = score >= 70 ? 36 : score >= 50 ? 24 : 12;

  explanations.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    score,
    probability: Math.round(probability * 10000) / 10000,
    decision,
    riskBucket,
    maxRecommendedAmount,
    maxRecommendedTerm,
    explanations,
    modelVersion: "neo-fmc-cs-v1.0",
    scoredAt: new Date(),
  };
}

function getFeatureDescription(feature: string, value: any, contribution: number, weight: number): string {
  const ratio = contribution / weight;
  const strength = ratio > 0.7 ? "strongly positive" : ratio > 0.4 ? "moderately positive" : "negative";

  const descriptions: Record<string, string> = {
    repaymentHistory: `Repayment history score of ${value}% has ${strength} impact`,
    iScoreValue: `I-Score of ${value} is ${strength} for creditworthiness`,
    loanToIncomeRatio: `Loan-to-income ratio of ${value}% is ${ratio < 0.5 ? "concerning" : "acceptable"}`,
    previousDefaultsCount: `${value} previous default(s) — ${value === 0 ? "positive signal" : "risk factor"}`,
    employmentYears: `${value} years of employment stability`,
    age: `Age ${value} — ${value >= 25 && value <= 55 ? "optimal range" : "outside optimal range"}`,
    daysOverdueHistory: `Maximum ${value} days overdue historically`,
    hasCollateral: value ? "Collateral provided — reduces risk" : "No collateral — higher risk",
    groupRepaymentRate: `Group repayment rate of ${value}%`,
    previousLoansCount: `${value} previous loan(s) — ${value > 0 ? "has credit history" : "new borrower"}`,
    dependents: `${value} dependents — ${value > 5 ? "high obligations" : "manageable"}`,
  };

  return descriptions[feature] || `${feature}: ${value}`;
}

export function segmentPortfolioRisk(scores: Array<{ loanId: string; score: number; bucket: string; amount: number }>): {
  buckets: Record<string, { count: number; totalAmount: number; avgScore: number; percentage: number }>;
  totalLoans: number;
  totalAmount: number;
  weightedAvgScore: number;
} {
  const buckets: Record<string, { count: number; totalAmount: number; scores: number[] }> = {
    very_low: { count: 0, totalAmount: 0, scores: [] },
    low: { count: 0, totalAmount: 0, scores: [] },
    medium: { count: 0, totalAmount: 0, scores: [] },
    high: { count: 0, totalAmount: 0, scores: [] },
    very_high: { count: 0, totalAmount: 0, scores: [] },
  };

  let totalAmount = 0;
  let weightedScoreSum = 0;

  for (const item of scores) {
    const bucket = item.bucket || "medium";
    if (!buckets[bucket]) buckets[bucket] = { count: 0, totalAmount: 0, scores: [] };
    buckets[bucket].count++;
    buckets[bucket].totalAmount += item.amount;
    buckets[bucket].scores.push(item.score);
    totalAmount += item.amount;
    weightedScoreSum += item.score * item.amount;
  }

  const result: Record<string, { count: number; totalAmount: number; avgScore: number; percentage: number }> = {};
  for (const [key, data] of Object.entries(buckets)) {
    result[key] = {
      count: data.count,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
      percentage: totalAmount > 0 ? Math.round((data.totalAmount / totalAmount) * 10000) / 100 : 0,
    };
  }

  return {
    buckets: result,
    totalLoans: scores.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    weightedAvgScore: totalAmount > 0 ? Math.round((weightedScoreSum / totalAmount) * 100) / 100 : 0,
  };
}

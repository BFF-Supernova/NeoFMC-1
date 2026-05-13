import { calculateCreditScore, segmentPortfolioRisk, type CreditFeatures } from "../../artifacts/api-server/src/lib/ai/creditScoring";
import { checkIdentityFraud, type IdentityCheckInput } from "../../artifacts/api-server/src/lib/ai/fraudDetection";

function makeFeatures(overrides: Partial<CreditFeatures> = {}): CreditFeatures {
  return {
    age: 35,
    monthlyIncome: 15000,
    employmentYears: 8,
    existingLoans: 1,
    previousLoansCount: 5,
    previousDefaultsCount: 0,
    repaymentHistory: 95,
    daysOverdueHistory: 0,
    loanToIncomeRatio: 30,
    requestedAmount: 20000,
    requestedTermMonths: 12,
    dependents: 2,
    hasCollateral: true,
    collateralValue: 10000,
    iScoreValue: 700,
    isGroupLoan: false,
    groupSize: 0,
    groupRepaymentRate: 0,
    governorate: "Cairo",
    clientCategory: "individual",
    daysSinceLastLoan: 180,
    ...overrides,
  };
}

console.log("=== AI Credit Scoring Unit Tests ===\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL: ${testName}`);
    failed++;
  }
}

console.log("Credit Score Calculation:");
const goodScore = calculateCreditScore(makeFeatures());
assert(goodScore.score >= 0 && goodScore.score <= 100, "Score should be 0-100");
assert(goodScore.score >= 50, "Good client should score at least 50");
assert(["approve", "review", "decline"].includes(goodScore.decision), "Decision should be valid");
assert(["very_low", "low", "medium", "high", "very_high"].includes(goodScore.riskBucket), "Risk bucket should be valid");
assert(Array.isArray(goodScore.explanations), "Should return explanations array");
assert(goodScore.explanations.length > 0, "Should have at least one explanation");
assert(goodScore.maxRecommendedAmount > 0, "Should recommend an amount");
assert(goodScore.maxRecommendedTerm > 0, "Should recommend a term");
assert(goodScore.modelVersion === "neo-fmc-cs-v1.0", "Should have model version");
assert(goodScore.scoredAt instanceof Date, "Should have scored-at timestamp");

console.log("\nRisky vs good client:");
const riskyScore = calculateCreditScore(makeFeatures({
  repaymentHistory: 20,
  previousDefaultsCount: 3,
  daysOverdueHistory: 120,
  employmentYears: 0,
  loanToIncomeRatio: 80,
  hasCollateral: false,
  iScoreValue: 200,
  dependents: 8,
}));
assert(riskyScore.score < goodScore.score, "Risky client should have lower score");

console.log("\nGovernorate risk adjustment:");
const cairoScore = calculateCreditScore(makeFeatures({ governorate: "Cairo" }));
const sinaiScore = calculateCreditScore(makeFeatures({ governorate: "North Sinai" }));
assert(sinaiScore.score <= cairoScore.score, "North Sinai should have equal or lower score than Cairo");

console.log("\nIdentity Fraud Detection:");
const identityInput: IdentityCheckInput = {
  nationalId: "29001011234567",
  fullNameAr: "محمد أحمد إبراهيم",
  phone: "01012345678",
  tenantId: "test-tenant",
};

const existingClients = [
  { nationalId: "29001011234567", fullNameAr: "أحمد محمد", id: "client-1", phone: "01098765432" },
];

const fraudResult = checkIdentityFraud(identityInput, existingClients);
assert(fraudResult.overallScore >= 0, "Fraud overall score should be non-negative");
assert(Array.isArray(fraudResult.signals), "Should return signals array");
assert(fraudResult.signals.length > 0, "Should flag duplicate national ID");
assert(["proceed", "review", "block"].includes(fraudResult.recommendation), "Should have valid recommendation");

const cleanInput: IdentityCheckInput = {
  nationalId: "28501019876543",
  fullNameAr: "سمير عبد الله",
  phone: "01155555555",
  tenantId: "test-tenant",
};
const cleanResult = checkIdentityFraud(cleanInput, existingClients);
assert(cleanResult.signals.length < fraudResult.signals.length, "Clean client should have fewer fraud signals");

console.log("\nPortfolio Risk Segmentation:");
const portfolioScores = [
  { loanId: "l1", score: 85, bucket: "very_low", amount: 100000 },
  { loanId: "l2", score: 70, bucket: "low", amount: 50000 },
  { loanId: "l3", score: 40, bucket: "high", amount: 30000 },
];
const segmented = segmentPortfolioRisk(portfolioScores);
assert(segmented.totalLoans === 3, "Should count total loans");
assert(segmented.totalAmount === 180000, "Should sum total amount");
assert(segmented.weightedAvgScore > 0, "Should calculate weighted avg score");
assert(segmented.buckets.very_low.count === 1, "Should have 1 very low risk loan");
assert(segmented.buckets.high.count === 1, "Should have 1 high risk loan");

const emptySegment = segmentPortfolioRisk([]);
assert(emptySegment.totalLoans === 0, "Empty portfolio should have 0 loans");
assert(emptySegment.totalAmount === 0, "Empty portfolio should have 0 amount");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

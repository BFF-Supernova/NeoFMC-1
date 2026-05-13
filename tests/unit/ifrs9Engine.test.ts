import { calculateECL, classifyStage, calculatePortfolioProvisions, getCBEProvisioningMatrix, type LoanData } from "../../artifacts/api-server/src/lib/ifrs9Engine";

function makeLoan(overrides: Partial<LoanData> = {}): LoanData {
  return {
    id: "test-loan-1",
    outstandingBalance: 50000,
    daysOverdue: 0,
    originalAmount: 100000,
    interestRate: 20,
    termMonths: 12,
    disbursementDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Active",
    productType: "Personal",
    branchId: "branch-1",
    clientRiskScore: 50,
    isRestructured: false,
    collateralValue: 0,
    ...overrides,
  };
}

console.log("=== IFRS9 Engine Unit Tests ===\n");

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

console.log("Stage Classification Tests:");
const stage1 = classifyStage(makeLoan({ daysOverdue: 0 }));
assert(stage1.stage === 1, "Performing loan (0 DPD) should be Stage 1");

const stage2 = classifyStage(makeLoan({ daysOverdue: 45 }));
assert(stage2.stage === 2, "Underperforming loan (45 DPD) should be Stage 2");

const stage3 = classifyStage(makeLoan({ daysOverdue: 100 }));
assert(stage3.stage === 3, "Non-performing loan (100 DPD) should be Stage 3");

const restructured = classifyStage(makeLoan({ daysOverdue: 0, isRestructured: true }));
assert(restructured.stage === 2, "Restructured loan should be at least Stage 2");

const writtenOff = classifyStage(makeLoan({ status: "WrittenOff" }));
assert(writtenOff.stage === 3, "Written-off loan should be Stage 3");

console.log("\nECL Calculation Tests:");
const eclPerforming = calculateECL(makeLoan({ daysOverdue: 0 }));
assert(eclPerforming.pd >= 0 && eclPerforming.pd <= 1, "PD should be between 0 and 1");
assert(eclPerforming.lgd >= 0 && eclPerforming.lgd <= 1, "LGD should be between 0 and 1");
assert(eclPerforming.ead > 0, "EAD should be positive for loan with outstanding balance");
assert(eclPerforming.ecl >= 0, "ECL should be non-negative");
assert(eclPerforming.ecl <= eclPerforming.ead, "ECL should not exceed EAD");

const eclDefaulted = calculateECL(makeLoan({ daysOverdue: 200 }));
assert(eclDefaulted.ecl > eclPerforming.ecl, "Defaulted loan should have higher ECL");
assert(eclDefaulted.pd > eclPerforming.pd, "Defaulted loan should have higher PD");

const eclWithCollateral = calculateECL(makeLoan({ daysOverdue: 50, collateralValue: 40000, outstandingBalance: 50000 }));
const eclWithoutCollateral = calculateECL(makeLoan({ daysOverdue: 50, collateralValue: 0, outstandingBalance: 50000 }));
assert(eclWithCollateral.lgd <= eclWithoutCollateral.lgd, "Collateral should reduce LGD");

console.log("\nPortfolio Provisions Tests:");
const portfolio = [
  makeLoan({ id: "l1", daysOverdue: 0, outstandingBalance: 100000 }),
  makeLoan({ id: "l2", daysOverdue: 45, outstandingBalance: 50000 }),
  makeLoan({ id: "l3", daysOverdue: 100, outstandingBalance: 30000 }),
];
const summary = calculatePortfolioProvisions(portfolio);
assert(summary.totalPortfolio === 180000, "Total portfolio should sum outstanding balances");
assert(summary.totalECL > 0, "Total ECL should be positive");
assert(summary.provisionCoverageRatio >= 0 && summary.provisionCoverageRatio <= 100, "Coverage ratio should be 0-100%");
assert(summary.byStage.length === 3, "Should have 3 stage buckets");
assert(summary.byStage[0].stage === 1, "First bucket should be Stage 1");

console.log("\nCBE Matrix Tests:");
const matrix = getCBEProvisioningMatrix();
assert(typeof matrix === "object" && matrix !== null, "CBE matrix should be an object");
assert(Object.keys(matrix).length >= 5, "Should have at least 5 CBE categories");

const emptyPortfolio = calculatePortfolioProvisions([]);
assert(emptyPortfolio.totalPortfolio === 0, "Empty portfolio should have 0 total");
assert(emptyPortfolio.totalECL === 0, "Empty portfolio should have 0 ECL");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

export interface FraudSignal {
  signalId: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  description: string;
  details: Record<string, any>;
}

export interface FraudCheckResult {
  checkId: string;
  overallScore: number;
  riskLevel: "clear" | "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  recommendation: "proceed" | "review" | "block";
  checkedAt: Date;
}

export interface IdentityCheckInput {
  nationalId: string;
  fullNameAr: string;
  phone?: string;
  clientId?: string;
  tenantId: string;
}

export interface DisbursementCheckInput {
  loanId: string;
  clientId: string;
  amount: number;
  recipientAccount?: string;
  recipientPhone?: string;
  disbursementMethod: string;
  tenantId: string;
  clientNationalId: string;
  clientCreatedAt: string;
  existingLoanCount: number;
  lastDisbursementDate?: string;
}

export function checkIdentityFraud(input: IdentityCheckInput, existingClients: Array<{ nationalId: string; fullNameAr: string; id: string; phone?: string }>): FraudCheckResult {
  const checkId = `FD-ID-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const signals: FraudSignal[] = [];

  const nidDuplicates = existingClients.filter(c =>
    c.nationalId === input.nationalId && c.id !== input.clientId
  );
  if (nidDuplicates.length > 0) {
    signals.push({
      signalId: `${checkId}-NID-DUP`,
      type: "identity_duplication",
      severity: "critical",
      score: 95,
      description: `National ID ${input.nationalId.substring(0, 3)}*** already exists for ${nidDuplicates.length} other client(s)`,
      details: { duplicateCount: nidDuplicates.length, existingClientIds: nidDuplicates.map(c => c.id) },
    });
  }

  const nameSimilar = existingClients.filter(c => {
    if (c.id === input.clientId) return false;
    return calculateNameSimilarity(c.fullNameAr, input.fullNameAr) > 0.85;
  });
  if (nameSimilar.length > 0) {
    signals.push({
      signalId: `${checkId}-NAME-SIM`,
      type: "name_similarity",
      severity: "medium",
      score: 60,
      description: `${nameSimilar.length} client(s) with very similar names found`,
      details: { similarClientIds: nameSimilar.map(c => c.id) },
    });
  }

  if (input.phone) {
    const phoneDuplicates = existingClients.filter(c =>
      c.phone === input.phone && c.id !== input.clientId
    );
    if (phoneDuplicates.length > 0) {
      signals.push({
        signalId: `${checkId}-PHONE-DUP`,
        type: "phone_duplication",
        severity: "high",
        score: 75,
        description: `Phone number already registered to ${phoneDuplicates.length} other client(s)`,
        details: { duplicateCount: phoneDuplicates.length },
      });
    }
  }

  if (input.nationalId && !/^\d{14}$/.test(input.nationalId)) {
    signals.push({
      signalId: `${checkId}-NID-FMT`,
      type: "invalid_national_id",
      severity: "high",
      score: 80,
      description: "National ID format is invalid",
      details: { providedLength: input.nationalId.length },
    });
  }

  const overallScore = signals.length > 0
    ? Math.min(100, signals.reduce((max, s) => Math.max(max, s.score), 0))
    : 0;

  const riskLevel = overallScore >= 90 ? "critical" :
    overallScore >= 70 ? "high" :
    overallScore >= 40 ? "medium" :
    overallScore > 0 ? "low" : "clear";

  const recommendation = overallScore >= 80 ? "block" :
    overallScore >= 40 ? "review" : "proceed";

  return { checkId, overallScore, riskLevel, signals, recommendation, checkedAt: new Date() };
}

export function checkDisbursementFraud(input: DisbursementCheckInput): FraudCheckResult {
  const checkId = `FD-DIS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const signals: FraudSignal[] = [];

  if (input.amount > 100000) {
    signals.push({
      signalId: `${checkId}-HIGH-AMT`,
      type: "high_amount",
      severity: "medium",
      score: 50,
      description: `Disbursement amount EGP ${input.amount.toLocaleString()} exceeds monitoring threshold`,
      details: { amount: input.amount, threshold: 100000 },
    });
  }

  const clientAge = (Date.now() - new Date(input.clientCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (clientAge < 7 && input.amount > 10000) {
    signals.push({
      signalId: `${checkId}-NEW-CLIENT`,
      type: "new_client_large_disbursement",
      severity: "high",
      score: 70,
      description: `Large disbursement to client created ${Math.round(clientAge)} day(s) ago`,
      details: { clientAgeDays: Math.round(clientAge), amount: input.amount },
    });
  }

  if (input.lastDisbursementDate) {
    const daysSinceLast = (Date.now() - new Date(input.lastDisbursementDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < 1) {
      signals.push({
        signalId: `${checkId}-RAPID`,
        type: "rapid_disbursement",
        severity: "high",
        score: 75,
        description: "Multiple disbursements within 24 hours for the same client",
        details: { hoursSinceLast: Math.round(daysSinceLast * 24) },
      });
    }
  }

  if (input.existingLoanCount >= 3) {
    signals.push({
      signalId: `${checkId}-MULTI-LOAN`,
      type: "multiple_active_loans",
      severity: "medium",
      score: 55,
      description: `Client has ${input.existingLoanCount} existing active loans`,
      details: { activeLoans: input.existingLoanCount },
    });
  }

  const overallScore = signals.length > 0
    ? Math.min(100, signals.reduce((max, s) => Math.max(max, s.score), 0))
    : 0;

  const riskLevel = overallScore >= 90 ? "critical" :
    overallScore >= 70 ? "high" :
    overallScore >= 40 ? "medium" :
    overallScore > 0 ? "low" : "clear";

  const recommendation = overallScore >= 80 ? "block" :
    overallScore >= 40 ? "review" : "proceed";

  return { checkId, overallScore, riskLevel, signals, recommendation, checkedAt: new Date() };
}

function calculateNameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.replace(/[\u064B-\u065F]/g, "").replace(/\s+/g, " ").trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;

  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) { costs[j] = j; continue; }
      if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return (longer.length - costs[shorter.length]) / longer.length;
}

export function calculateCollectionPropensity(input: {
  daysOverdue: number;
  previousPaymentCount: number;
  previousOnTimeRate: number;
  outstandingAmount: number;
  monthlyIncome: number;
  contactable: boolean;
  lastContactDays: number;
  promiseToPayCount: number;
  brokenPromiseCount: number;
}): { score: number; bucket: string; recommendedAction: string } {
  let score = 50;

  score += Math.max(-30, -input.daysOverdue * 0.3);
  score += input.previousOnTimeRate * 20;
  score += input.contactable ? 10 : -15;
  score -= Math.min(20, input.lastContactDays * 0.5);

  if (input.promiseToPayCount > 0) {
    const keepRate = 1 - (input.brokenPromiseCount / input.promiseToPayCount);
    score += keepRate * 15;
  }

  const affordability = input.monthlyIncome > 0 ? input.outstandingAmount / input.monthlyIncome : 10;
  score -= Math.min(15, affordability * 3);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const bucket = score >= 70 ? "high_propensity" :
    score >= 40 ? "medium_propensity" : "low_propensity";

  const recommendedAction = score >= 70 ? "sms_reminder" :
    score >= 50 ? "phone_call" :
    score >= 30 ? "field_visit" : "legal_notice";

  return { score, bucket, recommendedAction };
}

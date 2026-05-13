import { logAudit } from "./auditLog";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface ScreeningRequest {
  nationalId: string;
  fullNameAr: string;
  fullNameEn?: string;
  dateOfBirth?: string;
  tenantId: string;
  userId: string;
  transactionId?: string;
  screeningType: "onboarding" | "transaction" | "periodic";
}

export interface ScreeningHit {
  source: string;
  matchType: "exact" | "fuzzy" | "alias";
  matchScore: number;
  listCategory: string;
  details: string;
  listedDate?: string;
}

export interface ScreeningResult {
  screeningId: string;
  status: "clear" | "hit" | "review" | "error";
  riskLevel: "low" | "medium" | "high" | "critical";
  hits: ScreeningHit[];
  pepMatch: boolean;
  sanctionsMatch: boolean;
  adverseMediaMatch: boolean;
  screenedAt: Date;
  expiresAt: Date;
  errorMessage?: string;
}

export interface TransactionMonitoringRule {
  id: string;
  name: string;
  description: string;
  condition: (tx: TransactionData) => boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface TransactionData {
  amount: number;
  currency: string;
  type: string;
  clientId: string;
  frequency?: number;
  dailyTotal?: number;
  monthlyTotal?: number;
  recipientId?: string;
  isNewClient?: boolean;
  clientRiskScore?: number;
}

export interface TransactionAlert {
  alertId: string;
  ruleId: string;
  ruleName: string;
  riskLevel: string;
  transactionData: TransactionData;
  createdAt: Date;
  status: "pending" | "reviewed" | "escalated" | "dismissed";
}

const TRANSACTION_RULES: TransactionMonitoringRule[] = [
  {
    id: "TM001",
    name: "Large Cash Transaction",
    description: "Single transaction exceeds EGP 50,000 cash threshold",
    condition: (tx) => tx.amount >= 50000 && tx.type === "cash",
    riskLevel: "high",
  },
  {
    id: "TM002",
    name: "Structuring Detection",
    description: "Multiple transactions just below reporting threshold within 24 hours",
    condition: (tx) => (tx.dailyTotal || 0) >= 45000 && tx.amount < 50000 && (tx.frequency || 0) >= 3,
    riskLevel: "critical",
  },
  {
    id: "TM003",
    name: "Rapid Succession Transactions",
    description: "More than 5 transactions in a single day for the same client",
    condition: (tx) => (tx.frequency || 0) > 5,
    riskLevel: "medium",
  },
  {
    id: "TM004",
    name: "High-Risk Client Transaction",
    description: "Any transaction by a client with risk score above 80",
    condition: (tx) => (tx.clientRiskScore || 0) > 80,
    riskLevel: "high",
  },
  {
    id: "TM005",
    name: "New Client Large Transaction",
    description: "Client created within 30 days making transaction over EGP 20,000",
    condition: (tx) => tx.isNewClient === true && tx.amount >= 20000,
    riskLevel: "medium",
  },
  {
    id: "TM006",
    name: "Monthly Volume Spike",
    description: "Client monthly volume exceeds EGP 500,000",
    condition: (tx) => (tx.monthlyTotal || 0) >= 500000,
    riskLevel: "high",
  },
];

const SANCTIONS_PROVIDER_URL = process.env.SANCTIONS_API_URL || "";
const SANCTIONS_API_KEY = process.env.SANCTIONS_API_KEY || "";

export async function screenClient(request: ScreeningRequest): Promise<ScreeningResult> {
  const screeningId = `AML-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const hits: ScreeningHit[] = [];
  let pepMatch = false;
  let sanctionsMatch = false;
  let adverseMediaMatch = false;

  try {
    const blacklistResults = await db.execute(sql`
      SELECT reason, created_at, national_id, full_name
      FROM blacklists
      WHERE tenant_id = ${request.tenantId}::uuid
        AND (national_id = ${request.nationalId} OR full_name ILIKE ${`%${request.fullNameAr}%`})
    `);

    for (const row of blacklistResults.rows) {
      hits.push({
        source: "internal_blacklist",
        matchType: (row as any).national_id === request.nationalId ? "exact" : "fuzzy",
        matchScore: (row as any).national_id === request.nationalId ? 100 : 75,
        listCategory: "Internal Blacklist",
        details: (row as any).reason || "Blacklisted client",
        listedDate: (row as any).created_at?.toString(),
      });
    }

    if (SANCTIONS_API_KEY && SANCTIONS_PROVIDER_URL) {
      try {
        const response = await fetch(`${SANCTIONS_PROVIDER_URL}/screen`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SANCTIONS_API_KEY}`,
          },
          body: JSON.stringify({
            name: request.fullNameAr,
            name_en: request.fullNameEn,
            national_id: request.nationalId,
            date_of_birth: request.dateOfBirth,
            countries: ["EG"],
            lists: ["un_sanctions", "eu_sanctions", "ofac_sdn", "pep_lists", "adverse_media"],
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const data = await response.json() as any;
          if (data.hits && Array.isArray(data.hits)) {
            for (const hit of data.hits) {
              hits.push({
                source: hit.list_name || "external",
                matchType: hit.match_score >= 95 ? "exact" : hit.match_score >= 70 ? "fuzzy" : "alias",
                matchScore: hit.match_score,
                listCategory: hit.category || "Unknown",
                details: hit.details || hit.reason || "",
                listedDate: hit.listed_date,
              });
              if (hit.category === "PEP") pepMatch = true;
              if (hit.category === "sanctions") sanctionsMatch = true;
              if (hit.category === "adverse_media") adverseMediaMatch = true;
            }
          }
        }
      } catch (err) {
        console.error("Sanctions API error:", err);
      }
    }

    const riskLevel = sanctionsMatch ? "critical" :
      pepMatch ? "high" :
      hits.length > 0 ? "medium" : "low";

    const status = sanctionsMatch ? "hit" :
      pepMatch || hits.length > 2 ? "review" :
      hits.length > 0 ? "review" : "clear";

    const result: ScreeningResult = {
      screeningId,
      status,
      riskLevel,
      hits,
      pepMatch,
      sanctionsMatch,
      adverseMediaMatch,
      screenedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };

    await logAudit({
      userId: request.userId,
      tenantId: request.tenantId,
      action: "aml_screening",
      entity: "client",
      details: {
        screeningId,
        type: request.screeningType,
        status: result.status,
        riskLevel: result.riskLevel,
        hitCount: hits.length,
        pepMatch,
        sanctionsMatch,
      },
    });

    return result;
  } catch (error: any) {
    return {
      screeningId,
      status: "error",
      riskLevel: "high",
      hits: [],
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      screenedAt: new Date(),
      expiresAt: new Date(),
      errorMessage: error.message,
    };
  }
}

export function monitorTransaction(transaction: TransactionData): TransactionAlert[] {
  const alerts: TransactionAlert[] = [];

  for (const rule of TRANSACTION_RULES) {
    if (rule.condition(transaction)) {
      alerts.push({
        alertId: `TXA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        riskLevel: rule.riskLevel,
        transactionData: transaction,
        createdAt: new Date(),
        status: "pending",
      });
    }
  }

  return alerts;
}

export function getTransactionRules(): TransactionMonitoringRule[] {
  return TRANSACTION_RULES.map(r => ({ ...r, condition: r.condition }));
}

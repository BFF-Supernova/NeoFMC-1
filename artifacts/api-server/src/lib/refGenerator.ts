import { db, loanRequestsTable, clientsTable, guaranteesTable, loansTable, branchesTable } from "@workspace/db";
import { eq, and, isNotNull, desc, sql } from "drizzle-orm";

const ENTITY_MAP = {
  loan_requests: { table: loanRequestsTable, column: "requestNumber" as const },
  clients: { table: clientsTable, column: "clientCode" as const },
  guarantees: { table: guaranteesTable, column: "guaranteeNumber" as const },
  loans: { table: loansTable, column: "loanNumber" as const },
  branches: { table: branchesTable, column: "branchCode" as const },
} as const;

type EntityKey = keyof typeof ENTITY_MAP;

export async function getBranchSeq(branchId: string): Promise<string> {
  if (!branchId) return "00";
  const [branch] = await db.select({ branchSeq: branchesTable.branchSeq })
    .from(branchesTable)
    .where(eq(branchesTable.id, branchId))
    .limit(1);
  if (!branch || !branch.branchSeq) return "00";
  return branch.branchSeq.toString().padStart(2, "0");
}

export async function generateBranchCode(tenantId: string): Promise<{ branchCode: string; branchSeq: number }> {
  const rows = await db.select({ branchSeq: branchesTable.branchSeq })
    .from(branchesTable)
    .where(and(eq(branchesTable.tenantId, tenantId), isNotNull(branchesTable.branchSeq)))
    .orderBy(desc(branchesTable.branchSeq))
    .limit(1);

  const nextSeq = (rows?.[0]?.branchSeq || 0) + 1;
  const branchCode = `BR-${nextSeq.toString().padStart(2, "0")}`;
  return { branchCode, branchSeq: nextSeq };
}

export async function generateRefNumber(prefix: string, entityKey: EntityKey, _unused: string, tenantId: string, branchSeq?: string): Promise<string> {
  const entity = ENTITY_MAP[entityKey];
  if (!entity) throw new Error(`Unknown entity: ${entityKey}`);

  const { table, column } = entity;
  const tenantCol = (table as any).tenantId;
  const refCol = (table as any)[column];

  const branchPart = branchSeq || "00";
  const searchPrefix = `${prefix}-${branchPart}-`;

  const rows = await db.select({ ref: refCol })
    .from(table)
    .where(and(
      eq(tenantCol, tenantId),
      isNotNull(refCol),
      sql`${refCol} LIKE ${searchPrefix + '%'}`
    ))
    .orderBy(desc(refCol))
    .limit(1);

  let nextNum = 1;
  const lastRef = rows?.[0]?.ref;
  if (lastRef && typeof lastRef === "string") {
    const match = lastRef.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `${prefix}-${branchPart}-${nextNum.toString().padStart(6, "0")}`;
}

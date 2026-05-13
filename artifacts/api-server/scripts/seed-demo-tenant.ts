import { eq } from "drizzle-orm";
import { db, tenantsTable, usersTable, branchesTable, glAccountsTable } from "@workspace/db";

const tenantName = "Demo FMC";
const tenant = (await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.companyName, tenantName)).limit(1))[0];

if (!tenant) {
  throw new Error(`Tenant not found: ${tenantName}`);
}

const counts = {
  users: (await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.tenantId, tenant.id))).length,
  branches: (await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.tenantId, tenant.id))).length,
  glAccounts: (await db.select({ id: glAccountsTable.id }).from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenant.id))).length,
};

console.log(JSON.stringify({ tenantId: tenant.id, counts }, null, 2));
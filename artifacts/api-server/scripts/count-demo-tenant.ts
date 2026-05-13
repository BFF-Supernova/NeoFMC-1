import { eq } from "drizzle-orm";
import { db, tenantsTable, usersTable, branchesTable, glAccountsTable } from "@workspace/db";

const companyName = "Demo FMC 1778699448466";
const [tenant] = await db.select({ id: tenantsTable.id, companyName: tenantsTable.companyName }).from(tenantsTable).where(eq(tenantsTable.companyName, companyName)).limit(1);

if (!tenant) {
  throw new Error(`Tenant not found: ${companyName}`);
}

const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.tenantId, tenant.id));
const branches = await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.tenantId, tenant.id));
const glAccounts = await db.select({ id: glAccountsTable.id }).from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenant.id));

console.log(JSON.stringify({ tenant, counts: { users: users.length, branches: branches.length, glAccounts: glAccounts.length } }, null, 2));
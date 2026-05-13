import { eq } from "drizzle-orm";
import { db, tenantsTable, usersTable, branchesTable, glAccountsTable } from "@workspace/db";
import { hashPassword } from "../src/lib/auth";
import { seedGlAccountsForTenant } from "../src/lib/glAccountsSeed";

const companyName = `Demo FMC ${Date.now()}`;
const companyNameAr = "شركة ديمو إف إم سي";
const adminEmail = `demo-admin-${Date.now()}@fmcsoft.com`;
const adminPassword = "DemoAdmin@123";

const [tenant] = await db.insert(tenantsTable).values({
  companyName,
  companyNameAr,
  subscriptionPlan: "Professional",
  contactEmail: "demo@fmcsoft.com",
  contactPhone: "01000000000",
  isActive: true,
  onboardingStatus: "Approved",
}).returning();

await db.insert(usersTable).values({
  tenantId: tenant.id,
  fullName: "Demo Admin",
  email: adminEmail,
  passwordHash: hashPassword(adminPassword),
  role: "TenantAdmin",
  isActive: true,
});

await db.insert(branchesTable).values({
  tenantId: tenant.id,
  branchName: "Main Branch",
  branchNameAr: "الفرع الرئيسي",
  city: "Cairo",
  address: "Nasr City",
  isActive: true,
});

await seedGlAccountsForTenant(tenant.id);

const userCount = (await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.tenantId, tenant.id))).length;
const branchCount = (await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.tenantId, tenant.id))).length;
const glCount = (await db.select({ id: glAccountsTable.id }).from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenant.id))).length;

console.log(JSON.stringify({ tenantId: tenant.id, adminEmail, adminPassword, userCount, branchCount, glCount }, null, 2));
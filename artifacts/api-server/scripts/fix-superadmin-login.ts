import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "../src/lib/auth";

const email = "sales@fmcsoft.com";

await db.update(usersTable).set({
  passwordHash: hashPassword("Demo@1234"),
  failedLoginAttempts: 0,
  lockedUntil: null,
  isActive: true,
  role: "SuperAdmin",
  isSuperUser: true,
  updatedAt: new Date(),
}).where(eq(usersTable.email, email));

const [user] = await db.select({
  email: usersTable.email,
  failedLoginAttempts: usersTable.failedLoginAttempts,
  lockedUntil: usersTable.lockedUntil,
  isActive: usersTable.isActive,
  role: usersTable.role,
  isSuperUser: usersTable.isSuperUser,
}).from(usersTable).where(eq(usersTable.email, email)).limit(1);

console.log(JSON.stringify(user, null, 2));
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const email = "sales@fmcsoft.com";

await db.update(usersTable).set({
  failedLoginAttempts: 0,
  lockedUntil: null,
  isActive: true,
  role: "SuperAdmin",
  isSuperUser: true,
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
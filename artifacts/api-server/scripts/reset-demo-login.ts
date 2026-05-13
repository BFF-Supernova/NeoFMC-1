import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const email = "demo-admin@fmcsoft.com";

await db.update(usersTable).set({
  failedLoginAttempts: 0,
  lockedUntil: null,
  isActive: true,
  updatedAt: new Date(),
}).where(eq(usersTable.email, email));

const [user] = await db.select({
  email: usersTable.email,
  failedLoginAttempts: usersTable.failedLoginAttempts,
  lockedUntil: usersTable.lockedUntil,
  isActive: usersTable.isActive,
}).from(usersTable).where(eq(usersTable.email, email)).limit(1);

console.log(JSON.stringify(user, null, 2));
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const email = "sales@fmcsoft.com";
const fullName = "Sales";
const password = "Demo@1234";
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is required");
}

const hashPassword = (value: string) =>
  crypto.createHash("sha256").update(value + secret).digest("hex");

const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

if (existing.length > 0) {
  await db.update(usersTable).set({
    fullName,
    role: "SuperAdmin",
    isSuperUser: true,
    isActive: true,
    passwordHash: hashPassword(password),
    updatedAt: new Date(),
  }).where(eq(usersTable.email, email));
  console.log("updated");
} else {
  await db.insert(usersTable).values({
    fullName,
    email,
    passwordHash: hashPassword(password),
    role: "SuperAdmin",
    isSuperUser: true,
    isActive: true,
  });
  console.log("created");
}

const [user] = await db.select({
  email: usersTable.email,
  fullName: usersTable.fullName,
  role: usersTable.role,
  isSuperUser: usersTable.isSuperUser,
  isActive: usersTable.isActive,
}).from(usersTable).where(eq(usersTable.email, email)).limit(1);

console.log(JSON.stringify(user, null, 2));
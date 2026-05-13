import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/ready", async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "unavailable";
    healthy = false;
  }

  checks.server = "ok";
  checks.uptime = `${Math.floor(process.uptime())}s`;
  checks.memory = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
  checks.timestamp = new Date().toISOString();

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
    version: process.env.npm_package_version || "0.0.0",
  });
});

export default router;

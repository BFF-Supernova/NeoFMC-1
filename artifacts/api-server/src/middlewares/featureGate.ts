import { Request, Response, NextFunction } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function requireModule(moduleKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      if (req.user?.role === "SuperAdmin") return next();
      res.status(403).json({ error: "forbidden", message: "No tenant context" });
      return;
    }

    try {
      const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
      if (!tenant) {
        res.status(404).json({ error: "tenant_not_found" });
        return;
      }

      const value = (tenant as any)[moduleKey];
      if (value !== true) {
        res.status(403).json({
          error: "module_disabled",
          module: moduleKey,
          message: `This feature is not enabled for your organization. Contact your administrator to activate it.`,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("Feature gate error:", err);
      res.status(500).json({ error: "server_error" });
    }
  };
}

import { Request, Response, NextFunction } from "express";
import { withTenantContext } from "@workspace/db";

/**
 * tenantRlsMiddleware
 *
 * Wraps every request that has a tenant context in a PostgreSQL transaction
 * where:
 *   - The DB role is switched to `neo_fmc_app` (non-superuser → RLS enforced)
 *   - `app.current_tenant_id` is set to the authenticated user's tenant ID
 *
 * The transaction-scoped drizzle instance is propagated via AsyncLocalStorage,
 * so ALL `db.*` calls in downstream route handlers automatically use the
 * isolated connection — no route changes needed.
 *
 * Commit/Rollback strategy:
 *   - COMMIT on HTTP 1xx–4xx  (successful responses AND expected client errors
 *     like 400/404 carry no partial-write risk since those paths throw before any
 *     write completes or write nothing at all)
 *   - ROLLBACK on HTTP 5xx   (server error → discard any partial writes)
 *   - ROLLBACK on socket close before response (client disconnect mid-request)
 *
 * SuperAdmin routes (tenantId == null) are NOT wrapped — they run as the
 * postgres superuser which bypasses RLS, giving SuperAdmin full visibility.
 */
export function tenantRlsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const tenantId = req.user?.tenantId;

  // No tenant context (SuperAdmin, unauthenticated, or public route)
  if (!tenantId) {
    next();
    return;
  }

  withTenantContext(tenantId, () => {
    return new Promise<void>((resolve, reject) => {
      let settled = false;

      function commit() {
        if (!settled) {
          settled = true;
          resolve();
        }
      }

      function rollback(reason?: string) {
        if (!settled) {
          settled = true;
          reject(new Error(reason ?? "rollback"));
        }
      }

      res.on("finish", () => {
        // res.statusCode is set by the time 'finish' fires
        if (res.statusCode >= 500) {
          rollback(`http_${res.statusCode}`);
        } else {
          commit();
        }
      });

      // Client closed the connection before the response was sent
      res.on("close", () => {
        if (!res.writableEnded) {
          rollback("client_disconnect");
        }
      });

      // Run the rest of the middleware chain inside the tenant context
      // (AsyncLocalStorage propagates to all async work spawned from here)
      next();
    });
  }).catch((err: Error) => {
    // Only surface unexpected errors; rollback is a normal control flow signal
    if (err.message && !err.message.startsWith("http_") && err.message !== "rollback" && err.message !== "client_disconnect") {
      console.error("[tenantRls] unexpected error:", err);
    }
  });
}

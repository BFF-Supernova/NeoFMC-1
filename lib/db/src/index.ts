import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { AsyncLocalStorage } from "async_hooks";
import * as schema from "./schema/index.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type AppDb = NodePgDatabase<typeof schema>;

const tenantStorage = new AsyncLocalStorage<AppDb>();

const globalDb = drizzle(pool, { schema });

/**
 * `db` is a transparent Proxy that reads from AsyncLocalStorage when a tenant
 * context is active (set by `tenantRlsMiddleware`), otherwise falls back to the
 * global pool connection.  All existing route code continues to use `db` with
 * zero changes required.
 */
export const db = new Proxy(globalDb, {
  get(target, prop, receiver) {
    const ctx = tenantStorage.getStore();
    const source = ctx ?? target;
    const value = Reflect.get(source, prop, source);
    return typeof value === "function"
      ? (value as Function).bind(source)
      : value;
  },
}) as AppDb;

/**
 * Runs `fn` inside a PostgreSQL transaction where:
 *   1. The role is switched to `neo_fmc_app` (non-superuser, subject to RLS)
 *   2. `app.current_tenant_id` is set to `tenantId` (transaction-local via set_config)
 *   3. RLS policies on every tenant table enforce the isolation at DB level
 *
 * The transaction-scoped drizzle instance is injected via AsyncLocalStorage so
 * all calls to the exported `db` proxy inside `fn` automatically use it.
 *
 * Commits on success, rolls back on any thrown error.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    // Switch to non-superuser role so RLS policies are enforced
    await client.query("SET LOCAL ROLE neo_fmc_app");
    // Set tenant ID as transaction-local (true = local to transaction)
    await client.query(
      "SELECT set_config('app.current_tenant_id', $1, true)",
      [tenantId],
    );
    const tenantDb = drizzle(client, { schema });
    const result = await tenantStorage.run(tenantDb, fn);
    await client.query("COMMIT");
    committed = true;
    return result;
  } finally {
    if (!committed) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }
    client.release();
  }
}

export * from "./schema/index.ts";

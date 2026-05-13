import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

const ENTITY_TABLE_MAP: Record<string, { table: string; label: string; hasTenant: boolean }> = {
  client: { table: "clients", label: "Client", hasTenant: true },
  loan: { table: "loans", label: "Loan", hasTenant: true },
  loan_request: { table: "loan_requests", label: "Loan Request", hasTenant: true },
  installment: { table: "installments", label: "Installment", hasTenant: true },
  payment: { table: "payments", label: "Payment", hasTenant: true },
  user: { table: "users", label: "User", hasTenant: true },
  branch: { table: "branches", label: "Branch", hasTenant: true },
  employee: { table: "employees", label: "Employee", hasTenant: true },
  expense: { table: "expenses", label: "Expense", hasTenant: true },
  revenue: { table: "revenues", label: "Revenue", hasTenant: true },
  expense_claim: { table: "expense_claims", label: "Expense Claim", hasTenant: true },
  journal_entry: { table: "journal_entries", label: "Journal Entry", hasTenant: true },
  gl_account: { table: "gl_accounts", label: "GL Account", hasTenant: true },
  collateral: { table: "collaterals", label: "Collateral", hasTenant: true },
  guarantee: { table: "guarantees", label: "Guarantee", hasTenant: true },
  document: { table: "documents", label: "Document", hasTenant: true },
  blacklist: { table: "blacklists", label: "Blacklist Entry", hasTenant: true },
  collection_activity: { table: "collection_activities", label: "Collection Activity", hasTenant: true },
  cheque: { table: "cheques", label: "Cheque", hasTenant: true },
  wire_transfer: { table: "wire_transfers", label: "Wire Transfer", hasTenant: true },
  cash_settlement: { table: "cash_settlements", label: "Cash Settlement", hasTenant: true },
  savings_account: { table: "savings_accounts", label: "Savings Account", hasTenant: true },
  savings_transaction: { table: "savings_transactions", label: "Savings Transaction", hasTenant: true },
  fund_product: { table: "fund_products", label: "Fund Product", hasTenant: true },
  fixed_asset: { table: "fixed_assets", label: "Fixed Asset", hasTenant: true },
  vendor: { table: "vendors", label: "Vendor", hasTenant: true },
  purchase_invoice: { table: "purchase_invoices", label: "Purchase Invoice", hasTenant: true },
  vendor_payment: { table: "vendor_payments", label: "Vendor Payment", hasTenant: true },
  budget: { table: "budgets", label: "Budget", hasTenant: true },
  commission: { table: "commissions", label: "Commission", hasTenant: true },
  sales_agent: { table: "sales_agents", label: "Sales Agent", hasTenant: true },
  notification_template: { table: "notification_templates", label: "Notification Template", hasTenant: true },
  notification: { table: "notifications", label: "Notification", hasTenant: true },
  holiday: { table: "holidays", label: "Holiday", hasTenant: true },
  client_group: { table: "client_groups", label: "Client Group", hasTenant: true },
  portfolio_transfer: { table: "portfolio_transfers", label: "Portfolio Transfer", hasTenant: true },
  branch_cash_transfer: { table: "branch_cash_transfers", label: "Branch Cash Transfer", hasTenant: true },
  daily_closing: { table: "daily_closings", label: "Daily Closing", hasTenant: true },
  periodic_closing: { table: "periodic_closings", label: "Periodic Closing", hasTenant: true },
  risk_criteria: { table: "risk_criteria", label: "Risk Criteria", hasTenant: true },
  bank_facility: { table: "bank_facilities", label: "Bank Facility", hasTenant: true },
  insurance_company: { table: "insurance_companies", label: "Insurance Company", hasTenant: true },
  credit_limit: { table: "credit_limits", label: "Credit Limit", hasTenant: true },
  officer_checkin: { table: "officer_checkins", label: "Officer Check-in", hasTenant: true },
  offloading_batch: { table: "offloading_batches", label: "Offloading Batch", hasTenant: true },
  bank_reconciliation: { table: "bank_reconciliation", label: "Bank Reconciliation", hasTenant: true },
  webhook: { table: "webhooks", label: "Webhook", hasTenant: true },
  bulk_operation: { table: "bulk_operations", label: "Bulk Operation", hasTenant: true },
  epayment_config: { table: "epayment_configs", label: "E-Payment Config", hasTenant: true },
  epayment_transaction: { table: "epayment_transactions", label: "E-Payment Transaction", hasTenant: true },
  attendance: { table: "attendance", label: "Attendance", hasTenant: true },
  tenant: { table: "tenants", label: "Tenant", hasTenant: false },
  system_announcement: { table: "system_announcements", label: "System Announcement", hasTenant: false },
  user_notification: { table: "user_notifications", label: "User Notification", hasTenant: false },
  tenant_invoice: { table: "tenant_invoices", label: "Tenant Invoice", hasTenant: false },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/entity-types", requireAuth, requireSuperAdmin, (_req, res) => {
  const types = Object.entries(ENTITY_TABLE_MAP).map(([key, val]) => ({
    key,
    label: val.label,
    hasTenant: val.hasTenant,
  }));
  res.json({ data: types });
});

async function resolveAuditTenantId(entityConfig: { table: string; hasTenant: boolean }, id: string): Promise<string | null> {
  if (!entityConfig.hasTenant) return null;
  try {
    const rows = await db.execute(sql`SELECT tenant_id FROM ${sql.identifier(entityConfig.table)} WHERE id = ${id}::uuid LIMIT 1`);
    const arr = Array.isArray(rows) ? rows : (rows as any).rows || [];
    return arr[0]?.tenant_id || null;
  } catch { return null; }
}

async function safeAuditLog(tenantId: string | null, userId: string, userName: string, action: string, entity: string, entityId: string, details: Record<string, unknown>) {
  if (tenantId) {
    await logAudit({ tenantId, userId, userName, action, entity, entityId, details });
  } else {
    try {
      await db.execute(sql`INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity, entity_id, details)
        VALUES ((SELECT id FROM tenants LIMIT 1), ${userId}::uuid, ${userName}, ${action}, ${entity}, ${entityId}, ${JSON.stringify(details)}::jsonb)`);
    } catch (err) { console.error("[SuperAdminDelete] Audit fallback failed:", err); }
  }
}

router.delete("/:entityType/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { entityType, id } = req.params;
    const { confirm } = req.query;

    if (!UUID_REGEX.test(id)) {
      res.status(400).json({ error: "invalid_id", message: "ID must be a valid UUID." });
      return;
    }

    const entityConfig = ENTITY_TABLE_MAP[entityType];
    if (!entityConfig) {
      res.status(400).json({
        error: "invalid_entity_type",
        message: `Unknown entity type "${entityType}".`,
      });
      return;
    }

    if (confirm !== "true") {
      res.status(400).json({
        error: "confirmation_required",
        message: `Add ?confirm=true to confirm deletion of ${entityConfig.label} record.`,
      });
      return;
    }

    if (entityType === "user") {
      const userRows = await db.execute(sql`SELECT role FROM users WHERE id = ${id}::uuid`);
      const arr = Array.isArray(userRows) ? userRows : (userRows as any).rows || [];
      if (arr[0] && (arr[0] as any).role === "SuperAdmin") {
        res.status(403).json({ error: "forbidden", message: "Cannot delete SuperAdmin users." });
        return;
      }
    }

    const auditTenantId = await resolveAuditTenantId(entityConfig, id);

    const tableName = entityConfig.table;
    const result = await db.execute(
      sql`DELETE FROM ${sql.identifier(tableName)} WHERE id = ${id}::uuid RETURNING id`
    );

    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    if (rows.length === 0) {
      res.status(404).json({
        error: "not_found",
        message: `${entityConfig.label} with ID "${id}" not found.`,
      });
      return;
    }

    await safeAuditLog(auditTenantId, req.user!.id, req.user!.fullName, "SUPERADMIN_DELETE", entityConfig.label, id, { entityType, tableName });

    res.json({
      success: true,
      message: `${entityConfig.label} record deleted successfully.`,
      entityType,
      deletedId: id,
    });
  } catch (err: any) {
    if (err.code === "23503") {
      res.status(409).json({
        error: "foreign_key_violation",
        message: "Cannot delete this record because other records depend on it. Delete the dependent records first.",
      });
      return;
    }
    console.error("[SuperAdminDelete] Error:", err);
    res.status(500).json({ error: "server_error", message: "Deletion failed. Please try again." });
  }
});

router.post("/bulk", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { entityType, ids, confirm } = req.body;

    const entityConfig = ENTITY_TABLE_MAP[entityType];
    if (!entityConfig) {
      res.status(400).json({
        error: "invalid_entity_type",
        message: `Unknown entity type "${entityType}".`,
      });
      return;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "bad_request", message: "ids must be a non-empty array." });
      return;
    }

    if (ids.length > 100) {
      res.status(400).json({ error: "bad_request", message: "Maximum 100 records per bulk delete." });
      return;
    }

    const invalidIds = ids.filter((id: string) => !UUID_REGEX.test(id));
    if (invalidIds.length > 0) {
      res.status(400).json({ error: "invalid_id", message: "All IDs must be valid UUIDs." });
      return;
    }

    if (confirm !== "CONFIRM_BULK_DELETE") {
      res.status(400).json({
        error: "confirmation_required",
        message: `Set confirm: "CONFIRM_BULK_DELETE" to proceed with deleting ${ids.length} ${entityConfig.label} records.`,
      });
      return;
    }

    if (entityType === "user") {
      const superAdmins = await db.execute(
        sql`SELECT id FROM users WHERE id = ANY(${ids}::uuid[]) AND role = 'SuperAdmin'`
      );
      const saRows = Array.isArray(superAdmins) ? superAdmins : (superAdmins as any).rows || [];
      if (saRows.length > 0) {
        res.status(403).json({ error: "forbidden", message: "Cannot delete SuperAdmin users." });
        return;
      }
    }

    const tableName = entityConfig.table;
    const result = await db.execute(
      sql`DELETE FROM ${sql.identifier(tableName)} WHERE id = ANY(${ids}::uuid[]) RETURNING id`
    );
    const rows = Array.isArray(result) ? result : (result as any).rows || [];

    await safeAuditLog(
      entityConfig.hasTenant ? (await resolveAuditTenantId(entityConfig, ids[0])) : null,
      req.user!.id, req.user!.fullName, "SUPERADMIN_BULK_DELETE", entityConfig.label, ids.join(","),
      { entityType, requestedCount: ids.length, deletedCount: rows.length }
    );

    res.json({
      success: true,
      message: `${rows.length} of ${ids.length} ${entityConfig.label} records deleted.`,
      deletedCount: rows.length,
      requestedCount: ids.length,
    });
  } catch (err: any) {
    if (err.code === "23503") {
      res.status(409).json({
        error: "foreign_key_violation",
        message: "Cannot delete some records because other records depend on them. Delete the dependent records first.",
      });
      return;
    }
    console.error("[SuperAdminBulkDelete] Error:", err);
    res.status(500).json({ error: "server_error", message: "Bulk deletion failed. Please try again." });
  }
});

export default router;

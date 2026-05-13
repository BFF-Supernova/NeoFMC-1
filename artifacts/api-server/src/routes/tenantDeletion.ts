import { Router } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireSuperAdmin, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.post("/:tenantId/request-deletion", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason, confirmDeletion } = req.body;

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!tenant) { res.status(404).json({ error: "tenant_not_found" }); return; }

    if (confirmDeletion !== "PERMANENTLY_DELETE") {
      res.status(400).json({
        error: "confirmation_required",
        message: 'Set confirmDeletion: "PERMANENTLY_DELETE" to proceed. This action is irreversible and will delete all tenant data.',
        tenantName: tenant.companyName,
        warning: "All client data, loans, payments, and financial records will be permanently deleted.",
      });
      return;
    }

    const activeLoans = await db.execute(sql`
      SELECT COUNT(*) as count FROM loans WHERE tenant_id = ${tenantId}::uuid AND status IN ('Active', 'Overdue', 'Disbursed')
    `);

    if (Number((activeLoans.rows[0] as any).count) > 0) {
      res.status(409).json({
        error: "deletion_blocked",
        message: "Cannot delete tenant with active loans. Close or write off all loans first.",
        activeLoans: Number((activeLoans.rows[0] as any).count),
      });
      return;
    }

    await logAudit({
      userId: req.user!.id,
      tenantId: null,
      action: "tenant_deletion_initiated",
      entity: "tenant",
      entityId: tenantId,
      details: { tenantName: tenant.companyName, reason: reason || "PDPL erasure request" },
    });

    const tables = [
      "payments", "installments", "loans", "loan_requests", "collection_activities",
      "savings_transactions", "savings_accounts", "savings_products",
      "journal_entries", "gl_accounts", "expenses", "cheques",
      "wire_transfers", "cash_settlements", "epayments",
      "documents", "guarantees", "collaterals",
      "blacklists", "risk_criteria", "iscore_checks",
      "officer_checkins", "branch_cash_transfers",
      "audit_logs", "notifications", "user_notifications",
      "approval_requests", "commissions", "sales_agents",
      "bulk_operations", "credit_limits", "branch_requests",
      "client_group_members", "client_groups",
      "clients", "users", "branches",
      "fund_products", "daily_closing_records",
      "tenant_module_subscriptions", "tenant_user_limits",
    ];

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(tenantId)) {
      res.status(400).json({ error: "invalid_tenant_id" });
      return;
    }

    let deletedCounts: Record<string, number> = {};
    for (const table of tables) {
      try {
        const result = await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}::uuid RETURNING 1`);
        deletedCounts[table] = result.rows.length;
      } catch {
        deletedCounts[table] = 0;
      }
    }

    await db.delete(tenantsTable).where(eq(tenantsTable.id, tenantId));
    deletedCounts["tenants"] = 1;

    await logAudit({
      userId: req.user!.id,
      tenantId: null,
      action: "tenant_deletion_completed",
      entity: "tenant",
      entityId: tenantId,
      details: {
        tenantName: tenant.companyName,
        reason: reason || "PDPL erasure request",
        deletedRecords: deletedCounts,
      },
    });

    res.json({
      success: true,
      tenantId,
      tenantName: tenant.companyName,
      deletedAt: new Date().toISOString(),
      deletedRecords: deletedCounts,
      message: "Tenant and all associated data permanently deleted per PDPL right to erasure.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

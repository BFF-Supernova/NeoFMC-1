import { db, loansTable, clientsTable, loanRequestsTable, installmentsTable, paymentsTable, usersTable, notificationsTable, tenantsTable, branchesTable, platformAlertsTable, platformAlertRulesTable, tenantInvoicesTable, tenantModuleSubscriptionsTable, modulePricingTable, userTypePricingTable, tenantUserLimitsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc, like, or, ilike } from "drizzle-orm";
import { hashPassword } from "./auth";
import { seedGlAccountsForTenant } from "./glAccountsSeed";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const special = "!@#$%";
  let pwd = "";
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  pwd += Math.floor(Math.random() * 10);
  return pwd;
}

export interface ToolContext {
  tenantId: string;
  userId: string;
  userRole: string;
  userName: string;
}

const ADMIN_ROLES = ["SuperAdmin", "TenantAdmin"];
const MANAGER_ROLES = [...ADMIN_ROLES, "BranchManager", "CFO", "FinancialController"];

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "query_kpis",
      description: "Get dashboard KPIs: total portfolio, disbursements, collections, active loans, clients, PAR ratio, collection rate. Supports period: monthly, quarterly, annual, ytd (year-to-date).",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["monthly", "quarterly", "annual", "ytd"], description: "Time period for aggregation" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_financial_summary",
      description: "Get financial summary: total disbursed all-time, total collected all-time, total outstanding balance, total overdue amount, write-off total.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_clients",
      description: "Search clients by name, national ID, or phone number. Returns matching client records.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term: client name (Arabic or English), national ID, or phone" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_client_balance",
      description: "Get a specific client's loan and payment summary: active loans, total outstanding, total paid, overdue amount.",
      parameters: {
        type: "object",
        properties: {
          clientNameOrId: { type: "string", description: "Client name (Arabic or English) or client ID" },
        },
        required: ["clientNameOrId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_overdue_installments",
      description: "List overdue installments, optionally filtered by officer name. Shows client name, amount, days overdue.",
      parameters: {
        type: "object",
        properties: {
          officerName: { type: "string", description: "Officer name to filter by (optional)" },
          limit: { type: "number", description: "Max results to return (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_officer_performance",
      description: "Get performance metrics for a specific officer or all officers: disbursements, collections, clients registered, overdue amount.",
      parameters: {
        type: "object",
        properties: {
          officerName: { type: "string", description: "Officer name to look up (optional, if omitted returns all officers)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "count_entities",
      description: "Count various entities: active loans, total clients, pending requests, overdue installments, active users.",
      parameters: {
        type: "object",
        properties: {
          entity: { type: "string", enum: ["active_loans", "total_clients", "pending_requests", "overdue_installments", "active_users", "all"], description: "Which entity to count" },
        },
        required: ["entity"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reset_user_password",
      description: "Reset a user's password to a random temporary password. Requires TenantAdmin or SuperAdmin role. Identify user by name or email. The temporary password will be generated and must be shared securely.",
      parameters: {
        type: "object",
        properties: {
          userIdentifier: { type: "string", description: "User's full name or email address" },
        },
        required: ["userIdentifier"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_notification",
      description: "Send an in-system notification/reminder to a user. Can be used to remind employees about tasks, deadlines, or any message.",
      parameters: {
        type: "object",
        properties: {
          recipientName: { type: "string", description: "Recipient user's full name or email" },
          message: { type: "string", description: "The notification/reminder message to send" },
          channel: { type: "string", enum: ["system", "email", "sms"], description: "Delivery channel (default: system)" },
        },
        required: ["recipientName", "message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_users",
      description: "List users in the tenant, optionally filtered by role or active status.",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", description: "Filter by role (e.g., LoanOfficer, BranchManager)" },
          activeOnly: { type: "boolean", description: "Only show active users (default true)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_loan_details",
      description: "Get details of a specific loan by loan number, client name, or loan ID.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "Loan number (LN-XXXXXX), client name, or loan ID" },
        },
        required: ["identifier"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_collection_summary",
      description: "Get collection summary for a specific date range or the current period: total collected, number of payments, collection by method.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "this_week", "this_month", "this_quarter", "this_year"], description: "Time period (default: this_month)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_tenant",
      description: "Create a new tenant (microfinance company) on the platform. Only SuperAdmin can use this. Creates the company, its admin user, optionally a main branch, and seeds default GL chart of accounts. Call this ONLY after you have gathered ALL required information from the user through conversation.",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name in English" },
          companyNameAr: { type: "string", description: "Company name in Arabic" },
          fraLicenseNumber: { type: "string", description: "FRA (Financial Regulatory Authority) license number" },
          subscriptionPlan: { type: "string", enum: ["Basic", "Professional", "Enterprise"], description: "Subscription plan tier" },
          contactEmail: { type: "string", description: "Company contact email" },
          contactPhone: { type: "string", description: "Company contact phone" },
          adminName: { type: "string", description: "Full name of the tenant admin user" },
          adminEmail: { type: "string", description: "Email for the tenant admin user (used for login)" },
          adminPassword: { type: "string", description: "Initial password for the tenant admin user (minimum 6 characters)" },
          branchNameAr: { type: "string", description: "Main branch name in Arabic (required to create a branch)" },
          branchNameEn: { type: "string", description: "Main branch name in English (optional)" },
          branchRegion: { type: "string", description: "Branch region/city (optional)" },
          branchRegionAr: { type: "string", description: "Branch region in Arabic (optional)" },
        },
        required: ["companyName", "companyNameAr", "adminName", "adminEmail", "adminPassword", "subscriptionPlan"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_tenants",
      description: "List all tenants (companies) on the platform with their status, plan, and creation date. Only SuperAdmin can use this.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "manage_tenant",
      description: "Manage an existing tenant: activate/deactivate, change subscription plan, toggle modules, approve/reject pending onboarding. SuperAdmin only. Use companyName to find the tenant, then specify the action.",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name (English or Arabic) to search for" },
          action: { type: "string", enum: ["activate", "deactivate", "change_plan", "toggle_module", "approve", "reject"], description: "Action to perform" },
          plan: { type: "string", enum: ["Basic", "Professional", "Enterprise"], description: "New plan (for change_plan action)" },
          moduleKey: { type: "string", description: "Module key to toggle (e.g., moduleSavings, moduleWhatsApp, moduleAICollection)" },
          moduleEnabled: { type: "boolean", description: "Enable or disable the module (for toggle_module action)" },
          rejectionReason: { type: "string", description: "Reason for rejection (for reject action)" },
        },
        required: ["companyName", "action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "platform_analytics",
      description: "Get platform-wide analytics across ALL tenants: total portfolio, tenant rankings by PAR/portfolio/users, revenue overview, dormant tenants, growth metrics. SuperAdmin only.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["overview", "tenant_ranking", "dormant_tenants", "growth", "pending_approvals"], description: "Which analytics to retrieve" },
          rankBy: { type: "string", enum: ["portfolio", "par", "clients", "users", "overdue"], description: "Ranking criteria (for tenant_ranking)" },
        },
        required: ["metric"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_tenant_health",
      description: "Get detailed health and performance metrics for a specific tenant: portfolio stats, PAR ratio, user activity, module usage, recent growth. SuperAdmin only.",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name to look up (English or Arabic)" },
        },
        required: ["companyName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "manage_tenant_branding",
      description: "Configure white-label branding for a tenant: primary/secondary colors, logo URL, favicon, custom domain. SuperAdmin only.",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name to configure branding for" },
          primaryColor: { type: "string", description: "Primary brand color hex code (e.g., #1E40AF)" },
          secondaryColor: { type: "string", description: "Secondary brand color hex code" },
          logoUrl: { type: "string", description: "URL to the company logo image" },
          faviconUrl: { type: "string", description: "URL to the favicon image" },
          customDomain: { type: "string", description: "Custom domain for the tenant" },
        },
        required: ["companyName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_platform_alerts",
      description: "Get active platform alerts and warnings: high PAR tenants, dormant companies, quota limits, new registrations. SuperAdmin only.",
      parameters: {
        type: "object",
        properties: {
          unreadOnly: { type: "boolean", description: "Show only unread alerts (default: false)" },
          severity: { type: "string", enum: ["critical", "warning", "info"], description: "Filter by severity" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_platform_health",
      description: "Run a health check across all tenants to detect issues: high PAR ratios, dormant tenants, overdue portfolios. Generates new alerts. SuperAdmin only.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_tenant_invoice",
      description: "Generate a monthly billing invoice for a specific tenant based on their active modules, users, and pricing. SuperAdmin only.",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name to generate invoice for" },
          month: { type: "number", description: "Invoice month (1-12)" },
          year: { type: "number", description: "Invoice year" },
        },
        required: ["companyName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulk_tenant_operation",
      description: "Perform bulk operations across multiple tenants: enable/disable a module, change plans, activate/deactivate. SuperAdmin only.",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["toggle_module", "change_plan", "toggle_status"], description: "Bulk operation type" },
          companyNames: { type: "array", items: { type: "string" }, description: "List of company names to apply the operation to" },
          moduleKey: { type: "string", description: "Module key (for toggle_module)" },
          moduleEnabled: { type: "boolean", description: "Enable or disable (for toggle_module)" },
          plan: { type: "string", enum: ["Basic", "Professional", "Enterprise"], description: "Target plan (for change_plan)" },
          isActive: { type: "boolean", description: "Active status (for toggle_status)" },
        },
        required: ["operation", "companyNames"],
      },
    },
  },
];

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "this_week": { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
    case "this_month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "this_quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "this_year": case "ytd": case "annual": return new Date(now.getFullYear(), 0, 1);
    case "quarterly": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "monthly": default: return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

const SUPERADMIN_TOOLS = new Set([
  "create_tenant", "list_tenants", "manage_tenant", "platform_analytics",
  "get_tenant_health", "manage_tenant_branding", "get_platform_alerts",
  "check_platform_health", "generate_tenant_invoice", "bulk_tenant_operation",
]);

export async function executeTool(name: string, args: any, ctx: ToolContext): Promise<string> {
  if (SUPERADMIN_TOOLS.has(name)) {
    if (ctx.userRole !== "SuperAdmin") {
      return JSON.stringify({ error: "Access denied. Only SuperAdmin can use this action." });
    }
    try {
      switch (name) {
        case "create_tenant": return await createTenant(args, ctx);
        case "list_tenants": return await listTenants(ctx);
        case "manage_tenant": return await manageTenant(args);
        case "platform_analytics": return await platformAnalytics(args);
        case "get_tenant_health": return await getTenantHealth(args);
        case "manage_tenant_branding": return await manageTenantBranding(args);
        case "get_platform_alerts": return await getPlatformAlerts(args);
        case "check_platform_health": return await checkPlatformHealth();
        case "generate_tenant_invoice": return await generateTenantInvoice(args);
        case "bulk_tenant_operation": return await bulkTenantOperation(args);
        default: return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (err: any) {
      console.error(`[ChatbotTool] Error in ${name}:`, err);
      return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
    }
  }

  if (!ctx.tenantId) {
    return JSON.stringify({ error: "No company selected. The SuperAdmin must select a company from the Companies page before querying company-specific data or performing actions. Tell the user to go to the SuperAdmin page, click on a company, and then try again." });
  }
  try {
    switch (name) {
      case "query_kpis": return await queryKpis(args, ctx);
      case "query_financial_summary": return await queryFinancialSummary(ctx);
      case "search_clients": return await searchClients(args, ctx);
      case "get_client_balance": return await getClientBalance(args, ctx);
      case "list_overdue_installments": return await listOverdueInstallments(args, ctx);
      case "get_officer_performance": return await getOfficerPerformance(args, ctx);
      case "count_entities": return await countEntities(args, ctx);
      case "reset_user_password": return await resetUserPassword(args, ctx);
      case "send_notification": return await sendNotification(args, ctx);
      case "list_users": return await listUsers(args, ctx);
      case "get_loan_details": return await getLoanDetails(args, ctx);
      case "get_collection_summary": return await getCollectionSummary(args, ctx);
      default: return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    console.error(`[ChatbotTool] Error in ${name}:`, err);
    return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
  }
}

async function queryKpis(args: any, ctx: ToolContext): Promise<string> {
  const period = args.period || "monthly";
  const periodStart = getPeriodDate(period);
  const tenantId = ctx.tenantId;

  const results = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenantId} AND status = 'Active') as active_loans,
      (SELECT COALESCE(SUM(disbursed_amount::numeric), 0) FROM loans WHERE tenant_id = ${tenantId}) as total_disbursed,
      (SELECT COALESCE(SUM(outstanding_balance::numeric), 0) FROM loans WHERE tenant_id = ${tenantId} AND status = 'Active') as total_outstanding,
      (SELECT COUNT(*) FROM clients WHERE tenant_id = ${tenantId}) as total_clients,
      (SELECT COUNT(*) FROM clients WHERE tenant_id = ${tenantId} AND created_at >= ${periodStart.toISOString()}::timestamp) as new_clients_period,
      (SELECT COUNT(*) FROM loan_requests WHERE tenant_id = ${tenantId} AND workflow_status = 'Draft') as pending_requests,
      (SELECT COALESCE(SUM(disbursed_amount::numeric), 0) FROM loans WHERE tenant_id = ${tenantId} AND created_at >= ${periodStart.toISOString()}::timestamp) as disbursed_period,
      (SELECT COALESCE(SUM(amount::numeric), 0) FROM payments WHERE tenant_id = ${tenantId} AND status = 'Completed' AND created_at >= ${periodStart.toISOString()}::timestamp) as collected_period,
      (SELECT COALESCE(SUM(total_amount::numeric - paid_amount::numeric), 0) FROM installments WHERE tenant_id = ${tenantId} AND status = 'Pending' AND due_date < CURRENT_DATE) as overdue_amount
  `);
  const r = (results.rows as any[])?.[0] || {};
  const outstanding = Number(r.total_outstanding || 0);
  const overdue = Number(r.overdue_amount || 0);
  const par = outstanding > 0 ? Math.round((overdue / outstanding) * 1000) / 10 : 0;

  return JSON.stringify({
    period,
    activeLoans: Number(r.active_loans),
    totalDisbursedAllTime: Number(r.total_disbursed),
    totalOutstanding: outstanding,
    totalClients: Number(r.total_clients),
    newClientsPeriod: Number(r.new_clients_period),
    pendingRequests: Number(r.pending_requests),
    disbursedPeriod: Number(r.disbursed_period),
    collectedPeriod: Number(r.collected_period),
    overdueAmount: overdue,
    parRatio: par,
  });
}

async function queryFinancialSummary(ctx: ToolContext): Promise<string> {
  const tenantId = ctx.tenantId;
  const results = await db.execute(sql`
    SELECT
      (SELECT COALESCE(SUM(disbursed_amount::numeric), 0) FROM loans WHERE tenant_id = ${tenantId}) as total_disbursed,
      (SELECT COALESCE(SUM(outstanding_balance::numeric), 0) FROM loans WHERE tenant_id = ${tenantId} AND status = 'Active') as total_outstanding,
      (SELECT COALESCE(SUM(total_paid::numeric), 0) FROM loans WHERE tenant_id = ${tenantId}) as total_repaid,
      (SELECT COALESCE(SUM(amount::numeric), 0) FROM payments WHERE tenant_id = ${tenantId} AND status = 'Completed') as total_collected,
      (SELECT COALESCE(SUM(total_amount::numeric - paid_amount::numeric), 0) FROM installments WHERE tenant_id = ${tenantId} AND status = 'Pending' AND due_date < CURRENT_DATE) as total_overdue,
      (SELECT COALESCE(SUM(disbursed_amount::numeric), 0) FROM loans WHERE tenant_id = ${tenantId} AND status = 'WrittenOff') as total_written_off,
      (SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenantId} AND status = 'Active') as active_loan_count,
      (SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenantId} AND status = 'WrittenOff') as written_off_count
  `);
  const r = (results.rows as any[])?.[0] || {};
  return JSON.stringify({
    totalDisbursedAllTime: Number(r.total_disbursed),
    totalOutstanding: Number(r.total_outstanding),
    totalRepaid: Number(r.total_repaid),
    totalCollected: Number(r.total_collected),
    totalOverdue: Number(r.total_overdue),
    totalWrittenOff: Number(r.total_written_off),
    activeLoanCount: Number(r.active_loan_count),
    writtenOffCount: Number(r.written_off_count),
  });
}

async function searchClients(args: any, ctx: ToolContext): Promise<string> {
  const q = args.query?.trim();
  if (!q) return JSON.stringify({ error: "Search query required" });

  const clients = await db.select({
    id: clientsTable.id, clientCode: clientsTable.clientCode,
    fullNameAr: clientsTable.fullNameAr, fullNameEn: clientsTable.fullNameEn,
    nationalId: clientsTable.nationalId, phone: clientsTable.phone,
    isBlacklisted: clientsTable.isBlacklisted, kycStatus: clientsTable.kycStatus,
  }).from(clientsTable)
    .where(and(
      eq(clientsTable.tenantId, ctx.tenantId),
      or(
        like(clientsTable.fullNameAr, `%${q}%`),
        like(clientsTable.fullNameEn, `%${q}%`),
        like(clientsTable.nationalId, `%${q}%`),
        like(clientsTable.phone, `%${q}%`),
      )
    ))
    .limit(10);

  return JSON.stringify({ count: clients.length, clients });
}

async function getClientBalance(args: any, ctx: ToolContext): Promise<string> {
  const q = args.clientNameOrId?.trim();
  if (!q) return JSON.stringify({ error: "Client name or ID required" });

  const clients = await db.select().from(clientsTable)
    .where(and(
      eq(clientsTable.tenantId, ctx.tenantId),
      or(
        like(clientsTable.fullNameAr, `%${q}%`),
        like(clientsTable.fullNameEn, `%${q}%`),
        eq(clientsTable.id, q),
      )
    ))
    .limit(1);

  if (clients.length === 0) return JSON.stringify({ error: "Client not found" });
  const client = clients[0];

  const loanData = await db.execute(sql`
    SELECT
      COUNT(*) as loan_count,
      COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) as active_count,
      COALESCE(SUM(outstanding_balance::numeric), 0) as total_outstanding,
      COALESCE(SUM(total_paid::numeric), 0) as total_paid,
      COALESCE(SUM(disbursed_amount::numeric), 0) as total_disbursed
    FROM loans l
    JOIN loan_requests lr ON l.request_id = lr.id
    WHERE lr.client_id = ${client.id} AND lr.tenant_id = ${ctx.tenantId}
  `);
  const ld = (loanData.rows as any[])?.[0] || {};

  return JSON.stringify({
    client: { name: client.fullNameAr, nameEn: client.fullNameEn, code: client.clientCode, nationalId: client.nationalId, phone: client.phone },
    totalLoans: Number(ld.loan_count),
    activeLoans: Number(ld.active_count),
    totalDisbursed: Number(ld.total_disbursed),
    totalOutstanding: Number(ld.total_outstanding),
    totalPaid: Number(ld.total_paid),
  });
}

async function listOverdueInstallments(args: any, ctx: ToolContext): Promise<string> {
  const limit = Math.min(args.limit || 20, 50);
  const tenantId = ctx.tenantId;

  let officerFilter = sql``;
  if (args.officerName) {
    officerFilter = sql` AND lr.assigned_officer_id IN (SELECT id FROM users WHERE tenant_id = ${tenantId} AND full_name ILIKE ${'%' + args.officerName + '%'})`;
  }

  const results = await db.execute(sql`
    SELECT
      i.id, i.due_date,
      (i.total_amount::numeric - i.paid_amount::numeric) as remaining,
      (CURRENT_DATE - i.due_date::date) as days_overdue,
      c.full_name_ar as client_name, c.phone as client_phone,
      l.loan_number, lr.request_number
    FROM installments i
    JOIN loans l ON i.loan_id = l.id
    JOIN loan_requests lr ON l.request_id = lr.id
    JOIN clients c ON lr.client_id = c.id
    WHERE i.tenant_id = ${tenantId}
      AND i.status IN ('Pending', 'Overdue')
      AND i.due_date < CURRENT_DATE
      ${officerFilter}
    ORDER BY i.due_date ASC
    LIMIT ${limit}
  `);

  const items = (results.rows || []).map((r: any) => ({
    clientName: r.client_name,
    clientPhone: r.client_phone,
    loanNumber: r.loan_number,
    dueDate: r.due_date,
    remainingAmount: Number(r.remaining),
    daysOverdue: Number(r.days_overdue),
  }));

  return JSON.stringify({ count: items.length, overdueInstallments: items });
}

async function getOfficerPerformance(args: any, ctx: ToolContext): Promise<string> {
  if (!MANAGER_ROLES.includes(ctx.userRole)) {
    return JSON.stringify({ error: "Access denied. Only managers can view officer performance." });
  }

  const tenantId = ctx.tenantId;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  let nameFilter = sql``;
  if (args.officerName) {
    nameFilter = sql` AND u.full_name ILIKE ${'%' + args.officerName + '%'}`;
  }

  const results = await db.execute(sql`
    SELECT
      u.id, u.full_name, u.role,
      COALESCE((SELECT COUNT(*) FROM loans l JOIN loan_requests lr ON l.request_id = lr.id WHERE lr.tenant_id = ${tenantId} AND lr.assigned_officer_id = u.id AND l.created_at >= ${startOfMonth}::timestamp), 0) as loans_disbursed,
      COALESCE((SELECT SUM(l.disbursed_amount::numeric) FROM loans l JOIN loan_requests lr ON l.request_id = lr.id WHERE lr.tenant_id = ${tenantId} AND lr.assigned_officer_id = u.id AND l.created_at >= ${startOfMonth}::timestamp), 0) as disbursed_amount,
      COALESCE((SELECT SUM(p.amount::numeric) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = u.id AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as collected_amount,
      COALESCE((SELECT COUNT(*) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = u.id AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as payments_count
    FROM users u
    WHERE u.tenant_id = ${tenantId}
      AND u.role IN ('LoanOfficer', 'CollectionOfficer', 'BranchManager')
      AND u.is_active = true
      ${nameFilter}
    ORDER BY u.full_name
    LIMIT 20
  `);

  const officers = (results.rows || []).map((o: any) => ({
    name: o.full_name,
    role: o.role,
    loansDisbursed: Number(o.loans_disbursed),
    disbursedAmount: Number(o.disbursed_amount),
    collectedAmount: Number(o.collected_amount),
    paymentsCount: Number(o.payments_count),
  }));

  return JSON.stringify({ period: "this_month", officers });
}

async function countEntities(args: any, ctx: ToolContext): Promise<string> {
  const tenantId = ctx.tenantId;
  const entity = args.entity || "all";

  const counts: Record<string, number> = {};

  if (entity === "all" || entity === "active_loans") {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));
    counts.activeLoans = Number(r.count);
  }
  if (entity === "all" || entity === "total_clients") {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(eq(clientsTable.tenantId, tenantId));
    counts.totalClients = Number(r.count);
  }
  if (entity === "all" || entity === "pending_requests") {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(loanRequestsTable).where(and(eq(loanRequestsTable.tenantId, tenantId), eq(loanRequestsTable.workflowStatus, "Draft")));
    counts.pendingRequests = Number(r.count);
  }
  if (entity === "all" || entity === "overdue_installments") {
    const today = new Date().toISOString().split("T")[0];
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(installmentsTable).where(and(eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending"), lte(installmentsTable.dueDate, today)));
    counts.overdueInstallments = Number(r.count);
  }
  if (entity === "all" || entity === "active_users") {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true)));
    counts.activeUsers = Number(r.count);
  }

  return JSON.stringify(counts);
}

async function resetUserPassword(args: any, ctx: ToolContext): Promise<string> {
  if (!ADMIN_ROLES.includes(ctx.userRole)) {
    return JSON.stringify({ error: "Access denied. Only TenantAdmin or SuperAdmin can reset passwords." });
  }

  const identifier = args.userIdentifier?.trim();
  if (!identifier) return JSON.stringify({ error: "User name or email required" });

  const users = await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(and(
      eq(usersTable.tenantId, ctx.tenantId),
      or(
        ilike(usersTable.fullName, `%${identifier}%`),
        ilike(usersTable.email, identifier),
      )
    ))
    .limit(5);

  if (users.length === 0) return JSON.stringify({ error: `No user found matching "${identifier}"` });
  if (users.length > 1) {
    return JSON.stringify({ 
      error: "Multiple users match. Please be more specific.",
      matches: users.map(u => ({ name: u.fullName, email: u.email, role: u.role }))
    });
  }

  const target = users[0];
  const tempPwd = generateTempPassword();
  const newHash = hashPassword(tempPwd);

  await db.update(usersTable)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(usersTable.id, target.id));

  return JSON.stringify({
    success: true,
    message: `Password for "${target.fullName}" (${target.email}) has been reset. Temporary password: ${tempPwd} — please share it securely and ask the user to change it immediately.`,
    user: { name: target.fullName, email: target.email, role: target.role },
    tempPassword: tempPwd,
  });
}

async function sendNotification(args: any, ctx: ToolContext): Promise<string> {
  if (!MANAGER_ROLES.includes(ctx.userRole)) {
    return JSON.stringify({ error: "Access denied. Only managers and admins can send notifications." });
  }

  const recipientName = args.recipientName?.trim();
  const message = args.message?.trim();
  const channel = args.channel || "system";

  if (!recipientName || !message) return JSON.stringify({ error: "Recipient name and message required" });

  const users = await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email })
    .from(usersTable)
    .where(and(
      eq(usersTable.tenantId, ctx.tenantId),
      or(
        ilike(usersTable.fullName, `%${recipientName}%`),
        eq(usersTable.email, recipientName),
      ),
      eq(usersTable.isActive, true),
    ))
    .limit(5);

  if (users.length === 0) return JSON.stringify({ error: `No active user found matching "${recipientName}"` });
  if (users.length > 1) {
    return JSON.stringify({
      error: "Multiple users match. Please be more specific.",
      matches: users.map(u => ({ name: u.fullName, email: u.email }))
    });
  }

  const recipient = users[0];

  await db.insert(notificationsTable).values({
    tenantId: ctx.tenantId,
    channel,
    recipientType: "User",
    recipientId: recipient.id,
    recipientContact: recipient.email,
    status: "Sent",
    body: `[From ${ctx.userName}]: ${message}`,
    sentAt: new Date(),
  });

  return JSON.stringify({
    success: true,
    message: `Notification sent to "${recipient.fullName}" (${recipient.email}).`,
    content: message,
    channel,
  });
}

async function listUsers(args: any, ctx: ToolContext): Promise<string> {
  if (!MANAGER_ROLES.includes(ctx.userRole)) {
    return JSON.stringify({ error: "Access denied. Only managers can list users." });
  }

  let conditions = [eq(usersTable.tenantId, ctx.tenantId)];
  if (args.role) conditions.push(eq(usersTable.role, args.role));
  if (args.activeOnly !== false) conditions.push(eq(usersTable.isActive, true));

  const users = await db.select({
    id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email,
    role: usersTable.role, isActive: usersTable.isActive, isSuperUser: usersTable.isSuperUser,
  }).from(usersTable)
    .where(and(...conditions))
    .orderBy(usersTable.fullName)
    .limit(50);

  return JSON.stringify({ count: users.length, users });
}

async function getLoanDetails(args: any, ctx: ToolContext): Promise<string> {
  const identifier = args.identifier?.trim();
  if (!identifier) return JSON.stringify({ error: "Loan number, client name, or ID required" });

  const results = await db.execute(sql`
    SELECT
      l.id, l.loan_number, l.disbursed_amount, l.outstanding_balance, l.total_paid,
      l.status, l.disbursed_at, l.created_at,
      c.full_name_ar as client_name, c.phone as client_phone, c.client_code,
      lr.request_number, lr.term_months, lr.interest_rate
    FROM loans l
    JOIN loan_requests lr ON l.request_id = lr.id
    JOIN clients c ON lr.client_id = c.id
    WHERE l.tenant_id = ${ctx.tenantId}
      AND (
        l.loan_number = ${identifier}
        OR l.id::text = ${identifier}
        OR c.full_name_ar ILIKE ${'%' + identifier + '%'}
        OR c.full_name_en ILIKE ${'%' + identifier + '%'}
        OR lr.request_number = ${identifier}
      )
    ORDER BY l.created_at DESC
    LIMIT 5
  `);

  const loans = (results.rows || []).map((r: any) => ({
    loanNumber: r.loan_number,
    requestNumber: r.request_number,
    clientName: r.client_name,
    clientCode: r.client_code,
    clientPhone: r.client_phone,
    disbursedAmount: Number(r.disbursed_amount),
    outstandingBalance: Number(r.outstanding_balance),
    totalPaid: Number(r.total_paid),
    status: r.status,
    termMonths: r.term_months,
    interestRate: r.interest_rate ? Number(r.interest_rate) : null,
    disbursedAt: r.disbursed_at,
  }));

  if (loans.length === 0) return JSON.stringify({ error: "No loan found matching that identifier" });
  return JSON.stringify({ count: loans.length, loans });
}

async function getCollectionSummary(args: any, ctx: ToolContext): Promise<string> {
  const period = args.period || "this_month";
  const periodStart = getPeriodDate(period);
  const tenantId = ctx.tenantId;

  const results = await db.execute(sql`
    SELECT
      COUNT(*) as payment_count,
      COALESCE(SUM(amount::numeric), 0) as total_collected,
      COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN amount::numeric ELSE 0 END), 0) as cash_collected,
      COALESCE(SUM(CASE WHEN payment_method = 'E-Payment' THEN amount::numeric ELSE 0 END), 0) as epayment_collected,
      COALESCE(SUM(CASE WHEN payment_method = 'BankTransfer' THEN amount::numeric ELSE 0 END), 0) as bank_collected,
      COALESCE(SUM(CASE WHEN payment_method = 'Cheque' THEN amount::numeric ELSE 0 END), 0) as cheque_collected
    FROM payments
    WHERE tenant_id = ${tenantId}
      AND status = 'Completed'
      AND created_at >= ${periodStart.toISOString()}::timestamp
  `);

  const r = (results.rows as any[])?.[0] || {};
  return JSON.stringify({
    period,
    paymentCount: Number(r.payment_count),
    totalCollected: Number(r.total_collected),
    byMethod: {
      cash: Number(r.cash_collected),
      ePayment: Number(r.epayment_collected),
      bankTransfer: Number(r.bank_collected),
      cheque: Number(r.cheque_collected),
    },
  });
}

async function createTenant(args: any, _ctx: ToolContext): Promise<string> {
  const { companyName, companyNameAr, fraLicenseNumber, subscriptionPlan, contactEmail, contactPhone, adminName, adminEmail, adminPassword, branchNameAr, branchNameEn, branchRegion, branchRegionAr } = args;

  if (!companyName || !companyNameAr) {
    return JSON.stringify({ error: "Both companyName (English) and companyNameAr (Arabic) are required." });
  }
  if (!adminName || !adminEmail || !adminPassword) {
    return JSON.stringify({ error: "adminName, adminEmail, and adminPassword are required to create the tenant admin user." });
  }
  if (adminPassword.length < 6) {
    return JSON.stringify({ error: "Admin password must be at least 6 characters." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(adminEmail)) {
    return JSON.stringify({ error: "Invalid admin email format." });
  }

  const validPlans = ["Basic", "Professional", "Enterprise"];
  const plan = validPlans.includes(subscriptionPlan) ? subscriptionPlan : "Basic";

  const existingUser = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
  if (existingUser.length > 0) {
    return JSON.stringify({ error: `A user with email "${adminEmail}" already exists. Please use a different email for the tenant admin.` });
  }

  const tenantId = await db.transaction(async (tx) => {
    const [tenant] = await tx.insert(tenantsTable).values({
      companyName,
      companyNameAr,
      fraLicenseNumber: fraLicenseNumber || null,
      subscriptionPlan: plan,
      contactEmail: contactEmail || adminEmail,
      contactPhone: contactPhone || null,
      isActive: true,
    }).returning();

    await tx.insert(usersTable).values({
      tenantId: tenant.id,
      fullName: adminName,
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "TenantAdmin",
      isActive: true,
    });

    if (branchNameAr) {
      await tx.insert(branchesTable).values({
        tenantId: tenant.id,
        branchNameAr,
        branchNameEn: branchNameEn || null,
        region: branchRegion || null,
        regionAr: branchRegionAr || null,
      });
    }

    const defaultLimits = [
      { userType: "TenantAdmin", maxUsers: 5 },
      { userType: "BranchManager", maxUsers: 10 },
      { userType: "LoanOfficer", maxUsers: 50 },
      { userType: "CollectionOfficer", maxUsers: 20 },
      { userType: "Cashier", maxUsers: 10 },
      { userType: "Auditor", maxUsers: 5 },
      { userType: "Accountant", maxUsers: 10 },
      { userType: "FinancialController", maxUsers: 5 },
      { userType: "CFO", maxUsers: 3 },
      { userType: "DataEntry", maxUsers: 20 },
      { userType: "HR", maxUsers: 10 },
      { userType: "HRManager", maxUsers: 5 },
      { userType: "HRSelfService", maxUsers: 50 },
    ];
    for (const lim of defaultLimits) {
      await tx.insert(tenantUserLimitsTable).values({
        tenantId: tenant.id,
        userType: lim.userType,
        maxUsers: lim.maxUsers,
      });
    }

    return tenant.id;
  });

  let glSeeded = true;
  try { await seedGlAccountsForTenant(tenantId); } catch (e) { console.error("[Chatbot] GL seed error:", e); glSeeded = false; }

  return JSON.stringify({
    success: true,
    tenantId,
    companyName,
    companyNameAr,
    subscriptionPlan: plan,
    adminEmail,
    adminName,
    branchCreated: !!branchNameAr,
    glAccountsSeeded: glSeeded,
    message: `Tenant "${companyName}" created successfully with admin user "${adminName}" (${adminEmail}). ${branchNameAr ? `Main branch "${branchNameAr}" created.` : "No branch created yet."} ${glSeeded ? "GL chart of accounts seeded." : "Warning: GL chart of accounts seeding failed — manual setup may be needed."} The admin can now log in with their credentials.`,
  });
}

async function listTenants(_ctx: ToolContext): Promise<string> {
  const tenants = await db.select({
    id: tenantsTable.id,
    companyName: tenantsTable.companyName,
    companyNameAr: tenantsTable.companyNameAr,
    subscriptionPlan: tenantsTable.subscriptionPlan,
    isActive: tenantsTable.isActive,
    onboardingStatus: tenantsTable.onboardingStatus,
    contactEmail: tenantsTable.contactEmail,
    contactPhone: tenantsTable.contactPhone,
    fraLicenseNumber: tenantsTable.fraLicenseNumber,
    createdAt: tenantsTable.createdAt,
  }).from(tenantsTable).orderBy(desc(tenantsTable.createdAt)).limit(50);

  return JSON.stringify({ count: tenants.length, tenants });
}

async function findTenantByName(companyName: string) {
  const tenants = await db.select().from(tenantsTable)
    .where(or(
      ilike(tenantsTable.companyName, `%${companyName}%`),
      ilike(tenantsTable.companyNameAr, `%${companyName}%`),
    )).limit(5);

  if (tenants.length === 0) return { error: `No tenant found matching "${companyName}"` };
  if (tenants.length > 1) return { error: "Multiple tenants match. Please be more specific.", matches: tenants.map(t => ({ name: t.companyName, nameAr: t.companyNameAr, plan: t.subscriptionPlan })) };
  return { tenant: tenants[0] };
}

async function manageTenant(args: any): Promise<string> {
  const { companyName, action, plan, moduleKey, moduleEnabled, rejectionReason } = args;
  if (!companyName || !action) return JSON.stringify({ error: "companyName and action are required" });

  const result = findTenantByName(companyName);
  const found = await result;
  if ('error' in found) return JSON.stringify(found);
  const tenant = found.tenant!;

  switch (action) {
    case "activate": {
      await db.update(tenantsTable).set({ isActive: true, updatedAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
      return JSON.stringify({ success: true, message: `"${tenant.companyName}" has been activated.` });
    }
    case "deactivate": {
      await db.update(tenantsTable).set({ isActive: false, updatedAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
      return JSON.stringify({ success: true, message: `"${tenant.companyName}" has been deactivated. Users will no longer be able to log in.` });
    }
    case "change_plan": {
      if (!["Basic", "Professional", "Enterprise"].includes(plan)) return JSON.stringify({ error: "Invalid plan. Choose Basic, Professional, or Enterprise." });
      await db.update(tenantsTable).set({ subscriptionPlan: plan, updatedAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
      return JSON.stringify({ success: true, message: `"${tenant.companyName}" plan changed from ${tenant.subscriptionPlan} to ${plan}.` });
    }
    case "toggle_module": {
      if (!moduleKey) return JSON.stringify({ error: "moduleKey is required for toggle_module action" });
      const validModules = [
        "moduleCoreBasic","moduleCoreEdge","moduleAdvancedLending","moduleFinancialSettlements",
        "moduleSavings","moduleHRPayroll","moduleInsurance","moduleAgentBanking",
        "moduleLoanRestructuring","moduleOCR","moduleWhatsApp","moduleMobileField",
        "moduleClientApp","moduleMobileWallet","moduleAICollection","moduleDynamicPricing",
        "moduleCashFlowPrediction","moduleAIStressTesting","moduleNLPReporting",
        "moduleChurnPrediction","moduleIFRS9","moduleAIRisk","moduleFRAReporting",
        "moduleIScorelive","modulePDPL","moduleAML","moduleEKYC","moduleETA",
      ];
      if (!validModules.includes(moduleKey)) return JSON.stringify({ error: `Invalid module key. Valid keys: ${validModules.join(", ")}` });
      const enabled = moduleEnabled !== false;
      await db.update(tenantsTable).set({ [moduleKey]: enabled, updatedAt: new Date() } as any).where(eq(tenantsTable.id, tenant.id));
      return JSON.stringify({ success: true, message: `Module "${moduleKey}" ${enabled ? "enabled" : "disabled"} for "${tenant.companyName}".` });
    }
    case "approve": {
      if (tenant.onboardingStatus !== "PendingApproval") return JSON.stringify({ error: `"${tenant.companyName}" is not pending approval (status: ${tenant.onboardingStatus}).` });
      await db.update(tenantsTable).set({ onboardingStatus: "Approved", isActive: true, updatedAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
      return JSON.stringify({ success: true, message: `"${tenant.companyName}" onboarding approved and activated. The admin can now log in.` });
    }
    case "reject": {
      if (tenant.onboardingStatus !== "PendingApproval") return JSON.stringify({ error: `"${tenant.companyName}" is not pending approval (status: ${tenant.onboardingStatus}).` });
      await db.update(tenantsTable).set({ onboardingStatus: "Rejected", isActive: false, updatedAt: new Date() }).where(eq(tenantsTable.id, tenant.id));
      return JSON.stringify({ success: true, message: `"${tenant.companyName}" onboarding rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}` });
    }
    default:
      return JSON.stringify({ error: `Unknown action: ${action}` });
  }
}

async function platformAnalytics(args: any): Promise<string> {
  const metric = args.metric || "overview";

  if (metric === "overview") {
    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM tenants) as total_tenants,
        (SELECT COUNT(*) FROM tenants WHERE is_active = true) as active_tenants,
        (SELECT COUNT(*) FROM tenants WHERE onboarding_status = 'PendingApproval') as pending_approvals,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_active_users,
        (SELECT COUNT(DISTINCT tenant_id) FROM users WHERE is_active = true) as tenants_with_users,
        (SELECT COALESCE(SUM(outstanding_balance::numeric), 0) FROM loans WHERE status = 'Active') as total_portfolio,
        (SELECT COALESCE(SUM(disbursed_amount::numeric), 0) FROM loans) as total_disbursed,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM payments WHERE status = 'Completed') as total_collected,
        (SELECT COALESCE(SUM(total_amount::numeric - paid_amount::numeric), 0) FROM installments WHERE status IN ('Pending','Overdue') AND due_date < CURRENT_DATE) as total_overdue,
        (SELECT COUNT(*) FROM clients) as total_clients,
        (SELECT COUNT(*) FROM tenants WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_tenants_30d
    `);
    const r = (result.rows as any[])?.[0] || {};
    const portfolio = Number(r.total_portfolio || 0);
    const overdue = Number(r.total_overdue || 0);
    return JSON.stringify({
      totalTenants: Number(r.total_tenants),
      activeTenants: Number(r.active_tenants),
      pendingApprovals: Number(r.pending_approvals),
      totalActiveUsers: Number(r.total_active_users),
      totalClients: Number(r.total_clients),
      totalPortfolio: portfolio,
      totalDisbursed: Number(r.total_disbursed),
      totalCollected: Number(r.total_collected),
      totalOverdue: overdue,
      platformPAR: portfolio > 0 ? Math.round((overdue / portfolio) * 1000) / 10 : 0,
      newTenantsLast30Days: Number(r.new_tenants_30d),
    });
  }

  if (metric === "tenant_ranking") {
    const rankBy = args.rankBy || "portfolio";
    const result = await db.execute(sql`
      SELECT
        t.id, t.company_name, t.subscription_plan, t.is_active,
        COALESCE((SELECT SUM(l.outstanding_balance::numeric) FROM loans l WHERE l.tenant_id = t.id AND l.status = 'Active'), 0) as portfolio,
        COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = t.id), 0) as clients,
        COALESCE((SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true), 0) as users,
        COALESCE((SELECT SUM(i.total_amount::numeric - i.paid_amount::numeric) FROM installments i WHERE i.tenant_id = t.id AND i.status IN ('Pending','Overdue') AND i.due_date < CURRENT_DATE), 0) as overdue
      FROM tenants t WHERE t.is_active = true
      ORDER BY ${rankBy === "par" ? sql`overdue DESC` : rankBy === "clients" ? sql`clients DESC` : rankBy === "users" ? sql`users DESC` : rankBy === "overdue" ? sql`overdue DESC` : sql`portfolio DESC`}
      LIMIT 20
    `);
    const tenants = (result.rows as any[]).map(r => {
      const p = Number(r.portfolio || 0);
      const o = Number(r.overdue || 0);
      return {
        companyName: r.company_name, plan: r.subscription_plan,
        portfolio: p, clients: Number(r.clients), users: Number(r.users),
        overdue: o, parRatio: p > 0 ? Math.round((o / p) * 1000) / 10 : 0,
      };
    });
    return JSON.stringify({ rankBy, tenants });
  }

  if (metric === "dormant_tenants") {
    const result = await db.execute(sql`
      SELECT t.id, t.company_name, t.subscription_plan,
        (SELECT MAX(u.updated_at) FROM users u WHERE u.tenant_id = t.id) as last_activity
      FROM tenants t WHERE t.is_active = true
        AND (
          (SELECT MAX(u.updated_at) FROM users u WHERE u.tenant_id = t.id) < CURRENT_DATE - INTERVAL '30 days'
          OR (SELECT MAX(u.updated_at) FROM users u WHERE u.tenant_id = t.id) IS NULL
        )
      ORDER BY last_activity ASC NULLS FIRST
      LIMIT 20
    `);
    return JSON.stringify({ dormantTenants: result.rows });
  }

  if (metric === "growth") {
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as new_tenants
      FROM tenants
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    return JSON.stringify({ monthlyGrowth: result.rows });
  }

  if (metric === "pending_approvals") {
    const pending = await db.select({
      id: tenantsTable.id, companyName: tenantsTable.companyName,
      companyNameAr: tenantsTable.companyNameAr, contactEmail: tenantsTable.contactEmail,
      subscriptionPlan: tenantsTable.subscriptionPlan, createdAt: tenantsTable.createdAt,
    }).from(tenantsTable).where(eq(tenantsTable.onboardingStatus, "PendingApproval")).orderBy(desc(tenantsTable.createdAt));
    return JSON.stringify({ count: pending.length, pendingTenants: pending });
  }

  return JSON.stringify({ error: "Unknown metric" });
}

async function getTenantHealth(args: any): Promise<string> {
  const { companyName } = args;
  if (!companyName) return JSON.stringify({ error: "companyName is required" });

  const found = await findTenantByName(companyName);
  if ('error' in found) return JSON.stringify(found);
  const tenant = found.tenant!;

  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM users WHERE tenant_id = ${tenant.id} AND is_active = true) as active_users,
      (SELECT COUNT(*) FROM clients WHERE tenant_id = ${tenant.id}) as total_clients,
      (SELECT COUNT(*) FROM clients WHERE tenant_id = ${tenant.id} AND created_at >= CURRENT_DATE - INTERVAL '30 days') as new_clients_30d,
      (SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenant.id} AND status = 'Active') as active_loans,
      (SELECT COALESCE(SUM(disbursed_amount::numeric), 0) FROM loans WHERE tenant_id = ${tenant.id}) as total_disbursed,
      (SELECT COALESCE(SUM(outstanding_balance::numeric), 0) FROM loans WHERE tenant_id = ${tenant.id} AND status = 'Active') as outstanding,
      (SELECT COALESCE(SUM(amount::numeric), 0) FROM payments WHERE tenant_id = ${tenant.id} AND status = 'Completed') as total_collected,
      (SELECT COALESCE(SUM(total_amount::numeric - paid_amount::numeric), 0) FROM installments WHERE tenant_id = ${tenant.id} AND status IN ('Pending','Overdue') AND due_date < CURRENT_DATE) as overdue,
      (SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenant.id} AND created_at >= CURRENT_DATE - INTERVAL '30 days') as loans_30d,
      (SELECT COUNT(*) FROM loan_requests WHERE tenant_id = ${tenant.id} AND workflow_status = 'Draft') as pending_requests,
      (SELECT COUNT(*) FROM branches WHERE tenant_id = ${tenant.id}) as branches
  `);
  const r = (result.rows as any[])?.[0] || {};
  const outstanding = Number(r.outstanding || 0);
  const overdue = Number(r.overdue || 0);

  const enabledModules: string[] = [];
  const moduleFlags = ["moduleCoreBasic","moduleCoreEdge","moduleAdvancedLending","moduleFinancialSettlements","moduleSavings","moduleHRPayroll","moduleInsurance","moduleAgentBanking","moduleLoanRestructuring","moduleOCR","moduleWhatsApp","moduleMobileField","moduleClientApp","moduleMobileWallet","moduleAICollection","moduleDynamicPricing","moduleCashFlowPrediction","moduleAIStressTesting","moduleNLPReporting","moduleChurnPrediction","moduleIFRS9","moduleAIRisk","moduleFRAReporting","moduleIScorelive","modulePDPL","moduleAML","moduleEKYC","moduleETA"];
  for (const key of moduleFlags) {
    if ((tenant as any)[key]) enabledModules.push(key);
  }

  return JSON.stringify({
    companyName: tenant.companyName,
    companyNameAr: tenant.companyNameAr,
    plan: tenant.subscriptionPlan,
    isActive: tenant.isActive,
    onboardingStatus: tenant.onboardingStatus,
    createdAt: tenant.createdAt,
    activeUsers: Number(r.active_users),
    totalClients: Number(r.total_clients),
    newClientsLast30Days: Number(r.new_clients_30d),
    activeLoans: Number(r.active_loans),
    totalDisbursed: Number(r.total_disbursed),
    outstandingBalance: outstanding,
    totalCollected: Number(r.total_collected),
    overdueAmount: overdue,
    parRatio: outstanding > 0 ? Math.round((overdue / outstanding) * 1000) / 10 : 0,
    loansLast30Days: Number(r.loans_30d),
    pendingRequests: Number(r.pending_requests),
    branches: Number(r.branches),
    enabledModules,
    enabledModulesCount: enabledModules.length,
  });
}

async function manageTenantBranding(args: any): Promise<string> {
  const { companyName, primaryColor, secondaryColor, logoUrl, faviconUrl, customDomain } = args;
  if (!companyName) return JSON.stringify({ error: "companyName is required" });

  const found = await findTenantByName(companyName);
  if ('error' in found) return JSON.stringify(found);
  const tenant = found.tenant!;

  const updates: any = { updatedAt: new Date() };
  if (primaryColor !== undefined) updates.primaryColor = primaryColor;
  if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;
  if (faviconUrl !== undefined) updates.faviconUrl = faviconUrl;
  if (customDomain !== undefined) updates.customDomain = customDomain;

  await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, tenant.id));

  const changes: string[] = [];
  if (primaryColor) changes.push(`primary color → ${primaryColor}`);
  if (secondaryColor) changes.push(`secondary color → ${secondaryColor}`);
  if (logoUrl) changes.push(`logo URL updated`);
  if (faviconUrl) changes.push(`favicon URL updated`);
  if (customDomain) changes.push(`custom domain → ${customDomain}`);

  return JSON.stringify({
    success: true,
    message: `Branding updated for "${tenant.companyName}": ${changes.join(", ") || "no changes"}.`,
  });
}

async function getPlatformAlerts(args: any): Promise<string> {
  const conditions: any[] = [eq(platformAlertsTable.isDismissed, false)];
  if (args.unreadOnly) conditions.push(eq(platformAlertsTable.isRead, false));
  if (args.severity) conditions.push(eq(platformAlertsTable.severity, args.severity));

  const alerts = await db.select({
    id: platformAlertsTable.id,
    severity: platformAlertsTable.severity,
    title: platformAlertsTable.title,
    message: platformAlertsTable.message,
    ruleType: platformAlertsTable.ruleType,
    metricValue: platformAlertsTable.metricValue,
    isRead: platformAlertsTable.isRead,
    createdAt: platformAlertsTable.createdAt,
  }).from(platformAlertsTable)
    .where(and(...conditions))
    .orderBy(desc(platformAlertsTable.createdAt))
    .limit(20);

  return JSON.stringify({ count: alerts.length, alerts });
}

async function checkPlatformHealth(): Promise<string> {
  const alerts: Array<{ tenantId: string; severity: string; title: string; message: string; ruleType: string; metricValue: number }> = [];

  const tenants = await db.select({
    id: tenantsTable.id, companyName: tenantsTable.companyName, isActive: tenantsTable.isActive,
  }).from(tenantsTable).where(eq(tenantsTable.isActive, true));

  for (const tenant of tenants) {
    const parResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(l.outstanding_balance::numeric), 0) as outstanding,
        COALESCE(SUM(CASE WHEN EXISTS(SELECT 1 FROM installments i WHERE i.loan_id = l.id AND i.status IN ('Pending','Overdue') AND i.due_date < CURRENT_DATE) THEN l.outstanding_balance::numeric ELSE 0 END), 0) as at_risk
      FROM loans l WHERE l.tenant_id = ${tenant.id} AND l.status = 'Active'
    `);
    const row = (parResult.rows as any[])?.[0] || {};
    const outstanding = Number(row.outstanding || 0);
    const atRisk = Number(row.at_risk || 0);
    const par = outstanding > 0 ? (atRisk / outstanding) * 100 : 0;

    if (par > 10) {
      alerts.push({
        tenantId: tenant.id, severity: par > 20 ? "critical" : "warning",
        title: `High PAR ratio for ${tenant.companyName}`,
        message: `PAR ratio is ${par.toFixed(1)}%. Outstanding: ${outstanding.toFixed(0)} EGP, At Risk: ${atRisk.toFixed(0)} EGP.`,
        ruleType: "par_threshold", metricValue: par,
      });
    }
  }

  if (alerts.length > 0) {
    await db.insert(platformAlertsTable).values(
      alerts.map(a => ({ tenantId: a.tenantId, severity: a.severity, title: a.title, message: a.message, ruleType: a.ruleType, metricValue: a.metricValue.toString() }))
    );
  }

  return JSON.stringify({
    tenantsChecked: tenants.length,
    alertsGenerated: alerts.length,
    alerts: alerts.map(a => ({ title: a.title, severity: a.severity, message: a.message })),
  });
}

async function generateTenantInvoice(args: any): Promise<string> {
  const { companyName, month, year } = args;
  if (!companyName) return JSON.stringify({ error: "companyName is required" });

  const found = await findTenantByName(companyName);
  if ('error' in found) return JSON.stringify(found);
  const tenant = found.tenant!;

  const invoiceMonth = month || new Date().getMonth() + 1;
  const invoiceYear = year || new Date().getFullYear();
  const periodStart = new Date(invoiceYear, invoiceMonth - 1, 1);
  const periodEnd = new Date(invoiceYear, invoiceMonth, 0, 23, 59, 59);

  const moduleSubs = await db.select().from(tenantModuleSubscriptionsTable)
    .where(and(eq(tenantModuleSubscriptionsTable.tenantId, tenant.id), eq(tenantModuleSubscriptionsTable.isActive, true)));

  const modulePricing = await db.select().from(modulePricingTable).where(eq(modulePricingTable.isActive, true));
  const pricingMap = new Map(modulePricing.map(p => [p.moduleKey, p]));

  const lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number; category: string }> = [];
  let modulesTotal = 0;

  for (const sub of moduleSubs) {
    const pricing = pricingMap.get(sub.moduleKey);
    if (!pricing) continue;
    let price = sub.customMonthlyPrice ? Number(sub.customMonthlyPrice) : Number(pricing.monthlyPrice);
    const discount = Number(sub.discountPercent || 0);
    if (discount > 0) price = price * (1 - discount / 100);
    lineItems.push({ description: pricing.moduleName, quantity: 1, unitPrice: price, total: price, category: "module" });
    modulesTotal += price;
  }

  const userCounts = await db.execute(sql`
    SELECT role, COUNT(*) as count FROM users WHERE tenant_id = ${tenant.id} AND is_active = true GROUP BY role
  `);
  const userPricing = await db.select().from(userTypePricingTable).where(eq(userTypePricingTable.isActive, true));
  const userPriceMap = new Map(userPricing.map(p => [p.userType, p]));
  let usersTotal = 0;
  let totalUsers = 0;

  for (const row of (userCounts.rows as any[])) {
    const pricing = userPriceMap.get(row.role);
    const count = Number(row.count);
    totalUsers += count;
    if (!pricing) continue;
    const pricePerUser = Number(pricing.monthlyPricePerUser);
    const total = count * pricePerUser;
    if (total > 0) {
      lineItems.push({ description: `${pricing.displayName} (${count} users)`, quantity: count, unitPrice: pricePerUser, total, category: "users" });
      usersTotal += total;
    }
  }

  const subtotal = modulesTotal + usersTotal;
  const taxAmount = subtotal * 0.14;
  const totalAmount = subtotal + taxAmount;

  const invoiceNumber = `INV-${invoiceYear}${String(invoiceMonth).padStart(2, "0")}-${tenant.companyName.replace(/\s+/g, "").substring(0, 6).toUpperCase()}`;

  const [invoice] = await db.insert(tenantInvoicesTable).values({
    tenantId: tenant.id, invoiceNumber,
    periodStart, periodEnd,
    modulesAmount: modulesTotal.toFixed(2),
    usersAmount: usersTotal.toFixed(2),
    discountAmount: "0",
    taxAmount: taxAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    status: "Draft",
    dueDate: new Date(invoiceYear, invoiceMonth, 15),
    lineItems,
    activeModulesCount: moduleSubs.length,
    activeUsersCount: totalUsers,
  }).returning();

  return JSON.stringify({
    success: true,
    invoiceId: invoice.id,
    invoiceNumber,
    tenant: tenant.companyName,
    period: `${invoiceYear}-${String(invoiceMonth).padStart(2, "0")}`,
    modulesAmount: modulesTotal,
    usersAmount: usersTotal,
    taxAmount,
    totalAmount,
    lineItemsCount: lineItems.length,
    status: "Draft",
  });
}

async function bulkTenantOperation(args: any): Promise<string> {
  const { operation, companyNames, moduleKey, moduleEnabled, plan, isActive } = args;
  if (!operation || !Array.isArray(companyNames) || companyNames.length === 0) {
    return JSON.stringify({ error: "operation and companyNames array are required" });
  }

  const tenantIds: string[] = [];
  const notFound: string[] = [];
  for (const name of companyNames) {
    const found = await findTenantByName(name);
    if ('error' in found) { notFound.push(name); continue; }
    tenantIds.push(found.tenant!.id);
  }

  if (tenantIds.length === 0) return JSON.stringify({ error: "No matching tenants found", notFound });

  const validModules = [
    "moduleCoreBasic","moduleCoreEdge","moduleAdvancedLending","moduleFinancialSettlements",
    "moduleSavings","moduleHRPayroll","moduleInsurance","moduleAgentBanking",
    "moduleLoanRestructuring","moduleOCR","moduleWhatsApp","moduleMobileField",
    "moduleClientApp","moduleMobileWallet","moduleAICollection","moduleDynamicPricing",
    "moduleCashFlowPrediction","moduleAIStressTesting","moduleNLPReporting",
    "moduleChurnPrediction","moduleIFRS9","moduleAIRisk","moduleFRAReporting",
    "moduleIScorelive","modulePDPL","moduleAML","moduleEKYC","moduleETA",
  ];

  switch (operation) {
    case "toggle_module": {
      if (!moduleKey) return JSON.stringify({ error: "moduleKey is required for toggle_module" });
      if (!validModules.includes(moduleKey)) return JSON.stringify({ error: `Invalid module key. Valid keys: ${validModules.join(", ")}` });
      for (const id of tenantIds) {
        await db.update(tenantsTable).set({ [moduleKey]: moduleEnabled !== false, updatedAt: new Date() } as any).where(eq(tenantsTable.id, id));
      }
      return JSON.stringify({ success: true, message: `Module "${moduleKey}" ${moduleEnabled !== false ? "enabled" : "disabled"} for ${tenantIds.length} tenants.`, updatedCount: tenantIds.length, notFound });
    }
    case "change_plan": {
      if (!["Basic", "Professional", "Enterprise"].includes(plan)) return JSON.stringify({ error: "Valid plan required (Basic/Professional/Enterprise)" });
      for (const id of tenantIds) {
        await db.update(tenantsTable).set({ subscriptionPlan: plan, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
      }
      return JSON.stringify({ success: true, message: `Plan changed to ${plan} for ${tenantIds.length} tenants.`, updatedCount: tenantIds.length, notFound });
    }
    case "toggle_status": {
      const active = isActive !== false;
      for (const id of tenantIds) {
        await db.update(tenantsTable).set({ isActive: active, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
      }
      return JSON.stringify({ success: true, message: `${tenantIds.length} tenants ${active ? "activated" : "deactivated"}.`, updatedCount: tenantIds.length, notFound });
    }
    default:
      return JSON.stringify({ error: `Unknown operation: ${operation}` });
  }
}

import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../lib/auth";
import { TOOL_DEFINITIONS, executeTool, ToolContext } from "../lib/chatbotTools";

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("AI service not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY.");
    }
    _openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey,
    });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are "Es2alny" (اسألني), the intelligent assistant for Neo FMC — a multi-tenant SaaS microfinance management platform built for the Egyptian market. You can both answer questions about the system AND take real actions using your available tools.

RESPOND IN THE SAME LANGUAGE THE USER WRITES IN. If they write in Arabic, respond in Arabic. If in English, respond in English. If mixed, respond in Arabic.

## YOUR CAPABILITIES
You can:
1. **Query live data** — portfolio KPIs, financial summaries, client balances, loan details, collection stats, overdue installments, officer performance
2. **Execute actions** — reset user passwords, send notifications/reminders to employees
3. **Search** — find clients, users, loans by name/ID/number
4. **Answer questions** — explain system features, workflows, navigation, role permissions
5. **Tenant management (SuperAdmin only)** — create tenants, list/activate/deactivate/approve/reject, change plans, toggle modules, configure branding, bulk operations
6. **Platform analytics (SuperAdmin only)** — cross-tenant portfolio overview, tenant rankings, dormant tenant detection, growth metrics
7. **Platform monitoring (SuperAdmin only)** — health checks, alerts for high PAR, dormancy, overdue thresholds
8. **Billing (SuperAdmin only)** — generate monthly invoices for tenants based on modules and user counts

## WHEN TO USE TOOLS
- If the user asks for any data/numbers (sales, collections, balances, counts, etc.), ALWAYS use the appropriate tool to get live data. Never guess or make up numbers.
- If the user asks you to perform an action (reset password, send reminder), use the appropriate tool.
- If the user asks a general knowledge question about the system, answer from your knowledge without tools.

## FORMATTING FINANCIAL DATA
- Always format currency values in EGP (Egyptian Pounds): e.g., "٢٥٠,٠٠٠ جنيه" or "EGP 250,000"
- Use clear headings and bullet points for structured data
- When showing multiple records, use a concise table or list format
- Round percentages to 1 decimal place

## ROLE-BASED ACCESS
Actions are role-gated:
- **Password reset**: Only TenantAdmin, SuperAdmin
- **Send notifications**: Managers and above (TenantAdmin, SuperAdmin, BranchManager, CFO, FinancialController)
- **View officer performance**: Managers and above
- **View data/KPIs**: All authenticated users can query data
- **Create/list tenants**: Only SuperAdmin
If a user tries an action they can't perform, explain which role is needed.

## TENANT CREATION FLOW (SuperAdmin Only)
When a SuperAdmin asks to create a new tenant, company, or customer, you MUST follow this conversational flow:

1. **Acknowledge the request** and explain you'll need to collect some information.
2. **Ask questions in groups** to gather all required and optional details. Do NOT call create_tenant until ALL required fields are confirmed.

### Required Information (must collect ALL before creating):
- **Company name in English** (companyName)
- **Company name in Arabic** (companyNameAr)
- **Subscription plan**: Basic, Professional, or Enterprise — explain the difference if asked
- **Admin full name** (adminName) — the person who will manage this tenant
- **Admin email** (adminEmail) — used for login
- **Admin password** (adminPassword) — minimum 6 characters; suggest a strong one if the user doesn't provide one

### Optional Information (ask about these too):
- **FRA license number** (fraLicenseNumber) — Financial Regulatory Authority license
- **Company contact email** (contactEmail) — defaults to admin email if not provided
- **Company contact phone** (contactPhone)
- **Main branch name in Arabic** (branchNameAr) — required if they want a branch created immediately
- **Main branch name in English** (branchNameEn)
- **Branch region/city** (branchRegion)
- **Branch region in Arabic** (branchRegionAr)

### Conversation Guidelines:
- Ask questions in logical groups (e.g., company info first, then admin details, then optional branch details).
- If the user provides partial info, acknowledge what you have and ask ONLY for what's still missing.
- Before calling the create_tenant tool, present a SUMMARY of all the information you collected and ask the user to CONFIRM it's correct.
- If the user confirms, THEN call the create_tenant tool.
- If the user wants to change something, update accordingly and re-confirm.
- After successful creation, present the result clearly: tenant ID, company name, admin credentials, branch status.
- IMPORTANT: Never generate a password yourself. Always ask the user to provide one, or explicitly ask if they want you to suggest one.
- If the user asks to list or see existing tenants first, use list_tenants before proceeding.

## PLATFORM KNOWLEDGE

### ROLES (11 total)
1. SuperAdmin — Platform-level. Manages tenants, pricing, modules. Financial values masked (***).
2. TenantAdmin — Full tenant access. Company settings, user management.
3. BranchManager — Branch operations, approvals, staff oversight.
4. LoanOfficer — Loan origination, field visits, client registration.
5. CollectionOfficer — Payment collection, follow-ups.
6. Cashier — Cash handling, daily closing, payments.
7. Auditor — Read-only monitoring, compliance.
8. DataEntry — Basic data entry.
9. Accountant — GL/journal entries, expenses, bank reconciliation.
10. FinancialController — Accountant + reports, approvals, financial ratios.
11. CFO — FinancialController + risk criteria, strategic oversight.

### LOAN WORKFLOW (5 stages)
Draft → CreditReview → FieldVisit → Approved → Disbursed
Each stage has role-based gating.

### MODULES
Core Basic, Core Edge, Advanced Lending, Financial Settlements, Savings

### FINANCIAL CLOSING (4 levels)
Daily → Monthly → Quarterly → Annual (hierarchical enforcement)

### PAYMENT METHODS
Cash, E-Payment (Fawry/Paymob), Cheque, Bank Transfer

### KEY FEATURES
Collection workflow, Maker-Checker approvals, Risk scoring, Blacklist management, I-Score checks, Portfolio transfer, E-Payment gateway, GL/Chart of Accounts, FRA regulatory reports, Client groups, Guarantees, Cheques, Savings/Deposits, Bulk operations, Custom workflows, Officer GPS check-in, Client portal, Webhooks, Audit trail, 2FA security, Compliance exceptions, Bank reconciliation, Financial statements

## GUIDELINES
- Be helpful, specific, and proactive. If you detect the user's intent, act on it.
- For data queries, always call the tool first, then present the results naturally.
- When presenting tool results, add context and insights (e.g., "PAR ratio of 8.5% is above the recommended 5% threshold").
- If a tool returns an error, explain it clearly and suggest alternatives.
- If the user's request is ambiguous (e.g., "reset Ahmed's password" but multiple Ahmeds exist), present the options and ask to clarify.
- When sending notifications, confirm what was sent and to whom.
- Keep responses concise but complete.`;

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const MAX_TOOL_ROUNDS = 5;

router.post("/message", requireAuth, async (req, res) => {
  try {
    const { messages, language } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "bad_request", message: "messages array required" });
      return;
    }

    const sanitized: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of messages.slice(-MAX_MESSAGES)) {
      if (!m || typeof m.content !== "string" || !ALLOWED_ROLES.has(m.role)) continue;
      sanitized.push({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_CONTENT_LENGTH) });
    }

    if (sanitized.length === 0) {
      res.status(400).json({ error: "bad_request", message: "No valid messages" });
      return;
    }

    const userRole = req.user?.role || "Unknown";
    const userId = req.user?.id || "";
    const tenantId = req.user?.tenantId || "";
    const userName = req.user?.fullName || "System";
    const isSuperAdminNoTenant = userRole === "SuperAdmin" && !tenantId;
    const contextNote = isSuperAdminNoTenant
      ? `\n\nCurrent user: ${userName} | Role: ${userRole} | Language: ${language || "ar"}.\nNote: You are a SuperAdmin without a selected company. You CAN create new tenants and list existing tenants without selecting a company first. To query company-specific data (loans, clients, KPIs), tell the user to select a company first from the Companies view.`
      : `\n\nCurrent user: ${userName} | Role: ${userRole} | Language: ${language || "ar"}.`;

    const toolContext: ToolContext = { tenantId, userId, userRole, userName };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const abortController = new AbortController();
    let closed = false;
    req.on("close", () => { closed = true; abortController.abort(); });

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + contextNote },
      ...sanitized,
    ];

    let toolRounds = 0;
    while (toolRounds < MAX_TOOL_ROUNDS) {
      if (closed) break;
      toolRounds++;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 4096,
        messages: chatMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        stream: false,
      }, { signal: abortController.signal });

      const choice = response.choices[0];
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        chatMessages.push(message);

        if (!closed) {
          res.write(`data: ${JSON.stringify({ thinking: true })}\n\n`);
        }

        for (const toolCall of message.tool_calls) {
          if (closed) break;
          if (toolCall.type !== "function") continue;
          const fn = toolCall.function;
          const fnName = fn.name;
          let fnArgs: any = {};
          try { fnArgs = JSON.parse(fn.arguments || "{}"); } catch {}

          const SENSITIVE_TOOLS = new Set(["create_tenant", "reset_user_password", "manage_tenant", "bulk_tenant_operation"]);
          if (SENSITIVE_TOOLS.has(fnName)) {
            console.log(`[Chatbot] Tool call: ${fnName}({...redacted...})`);
          } else {
            console.log(`[Chatbot] Tool call: ${fnName}(${JSON.stringify(fnArgs)})`);
          }
          const result = await executeTool(fnName, fnArgs, toolContext);

          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        continue;
      }

      if (message.content && !closed) {
        const chunks = message.content.match(/.{1,80}/gs) || [message.content];
        for (const chunk of chunks) {
          if (closed) break;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }

      break;
    }

    if (toolRounds >= MAX_TOOL_ROUNDS && !closed) {
      res.write(`data: ${JSON.stringify({ content: "I processed your request but reached the maximum number of steps. Please try a more specific question." })}\n\n`);
    }

    if (!closed) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    console.error("[Chatbot] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "server_error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
      res.end();
    }
  }
});

export default router;

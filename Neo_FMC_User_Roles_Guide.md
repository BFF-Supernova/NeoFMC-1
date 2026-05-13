# Neo FMC - User Roles, Authorizations & Business Scenarios Guide

**Version:** 1.0  
**Last Updated:** April 2026  
**Platform:** Neo FMC - Multi-tenant AI-powered Micro-Financing ERP SaaS

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Role Hierarchy & Structure](#2-role-hierarchy--structure)
3. [SuperAdmin (Platform Owner)](#3-superadmin-platform-owner)
4. [TenantAdmin (Company Administrator)](#4-tenantadmin-company-administrator)
5. [BranchManager](#5-branchmanager)
6. [LoanOfficer](#6-loanofficer)
7. [CollectionOfficer](#7-collectionofficer)
8. [Cashier](#8-cashier)
9. [Accountant](#9-accountant)
10. [FinancialController](#10-financialcontroller)
11. [CFO (Chief Financial Officer)](#11-cfo-chief-financial-officer)
12. [Auditor](#12-auditor)
13. [HR (Human Resources)](#13-hr-human-resources)
14. [HRManager](#14-hrmanager)
15. [HRSelfService (Employee Self-Service)](#15-hrselfservice-employee-self-service)
16. [DataEntry](#16-dataentry)
17. [End-to-End Business Scenarios](#17-end-to-end-business-scenarios)
18. [Maker-Checker Approval Matrix](#18-maker-checker-approval-matrix)
19. [Module Access Matrix](#19-module-access-matrix)

---

## 1. System Overview

Neo FMC is a multi-tenant SaaS platform designed for microfinance companies (MFCs) operating in Egypt. The system uses Role-Based Access Control (RBAC) combined with module-based licensing to determine what each user can see and do.

**Key Security Principles:**
- Every user belongs to a single tenant (company), except SuperAdmin who operates across all tenants
- Data isolation is enforced at the database level; users can never see data from other tenants
- Sensitive operations use a Maker-Checker workflow requiring two different people to complete
- Multi-Factor Authentication (MFA) is enforced for privileged roles: TenantAdmin, BranchManager, FinancialController, and CFO
- All actions are recorded in an immutable audit trail

**Subscription Plans & Module Access:**
| Plan | Modules Included |
|------|-----------------|
| **Basic** | Core Basic, Core Edge |
| **Professional** | Basic + Advanced Lending, Financial Settlements, HR & Payroll, Insurance, Mobile Wallet, WhatsApp, OCR |
| **Enterprise** | Professional + AI Risk Engine, AI Collection, Dynamic Pricing, Cash Flow Prediction, Stress Testing, NLP Reporting, Churn Prediction, Agent Banking, Loan Restructuring, PDPL, AML, I-Score Live |

---

## 2. Role Hierarchy & Structure

```
SuperAdmin (Platform Level)
  |
  +-- TenantAdmin (Company Level)
        |
        +-- BranchManager (Branch Level)
        |     |
        |     +-- LoanOfficer
        |     +-- CollectionOfficer
        |     +-- Cashier
        |     +-- DataEntry
        |
        +-- Accountant
        +-- FinancialController
        +-- CFO
        +-- Auditor
        +-- HRManager
        |     |
        |     +-- HR
        |     +-- HRSelfService (all employees)
```

**Default User Limits per Tenant:**

| Role | Max Users |
|------|-----------|
| TenantAdmin | 5 |
| BranchManager | 10 |
| LoanOfficer | 50 |
| CollectionOfficer | 20 |
| Cashier | 10 |
| Auditor | 5 |
| Accountant | 10 |
| FinancialController | 5 |
| CFO | 3 |
| DataEntry | 20 |
| HR | 10 |
| HRManager | 5 |
| HRSelfService | 50 |

---

## 3. SuperAdmin (Platform Owner)

**Description:** The SuperAdmin is the platform owner who manages the entire Neo FMC SaaS infrastructure. This role operates above the tenant level and has visibility into all companies on the platform.

### Authorizations
- Full read/write access across all tenants
- Can switch context to any tenant using the company switcher
- Can create, suspend, activate, and delete tenants
- Can delete any record across 56+ entity types (except other SuperAdmin users)
- Exempt from MFA enforcement (to avoid catch-22 during platform bootstrap)

### Capabilities & Activities

#### 3.1 Tenant (Company) Management
| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Create Tenant** | Register a new microfinance company on the platform | Navigate to SuperAdmin Dashboard > Click "Create Company" > Enter company name, Arabic name, tax registration number, commercial registration > Select subscription plan (Basic/Professional/Enterprise) > Set module toggles > System auto-creates tenant with 13 default role limits and seeds initial configuration |
| **Manage Tenant** | Update tenant settings, subscription, or status | SuperAdmin Dashboard > Select company > Update plan, enable/disable modules, change status (Active/Suspended/Inactive) > Changes take effect immediately for all tenant users |
| **Suspend Tenant** | Temporarily disable a company's access | Set tenant status to "Suspended" > All tenant users are blocked from login > Data is preserved > Reactivate by setting status back to "Active" |

#### 3.2 Platform Analytics
| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Cross-Tenant Analytics** | View platform-wide KPIs | SuperAdmin Dashboard > View total tenants, total users, total active loans, total portfolio value across all companies |
| **Tenant Health Check** | Assess individual tenant performance | Select tenant > View active user count, loan portfolio stats, collection rates, overdue ratios |
| **Tenant Comparison** | Compare performance across tenants | View side-by-side metrics for multiple companies |

#### 3.3 Platform Operations
| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **System Announcements** | Broadcast messages to all tenants | Create announcement with title, content, priority (info/warning/critical) > All tenant users see the notification |
| **Platform Alerts** | Monitor system health | View real-time alerts for tenant issues, system errors, capacity thresholds |
| **Billing & Invoicing** | Generate tenant invoices | Select tenant > Generate invoice based on subscription plan and usage > Invoice stored in tenant_invoices table |
| **White-Label Branding** | Customize tenant appearance | Set primary/secondary colors, logo URL, company name display for each tenant |
| **Bulk Operations** | Mass tenant management | Perform bulk status changes, plan upgrades, or module toggles across multiple tenants simultaneously |

#### 3.4 SuperAdmin Delete
| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Record Deletion** | Remove any record from the system | Navigate to any data page (Clients, Loans, Employees, etc.) > Click delete icon > Confirm deletion > Record is permanently removed and audit logged |
| **Bulk Deletion** | Remove multiple records at once | Select records > Confirm with "CONFIRM_BULK_DELETE" > Up to 100 records deleted per batch |

#### 3.5 AI Assistant (es2alny)
| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Natural Language Queries** | Ask questions about platform data | Open chatbot > Ask "How many active tenants do we have?" or "Show me tenant health for Company X" > AI processes query using SuperAdmin tools and returns structured response |

---

## 4. TenantAdmin (Company Administrator)

**Description:** The TenantAdmin is the primary administrator for a microfinance company. They have full control over their company's configuration, users, branches, and all operational modules.

### Authorizations
- Full access to all features within their tenant
- Can create and manage users with any role (up to configured limits)
- Can configure system settings, workflows, and integrations
- MFA is required for this role
- Cannot access other tenants' data
- Cannot access SuperAdmin platform features

### Capabilities & Activities

#### 4.1 Company Setup & Configuration
| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Branch Management** | Create and manage company branches | Settings > Branches > Add Branch with name, code, address, manager assignment > Branch becomes available for user assignment and loan operations |
| **User Management** | Create and manage system users | Settings > Users > Add User with email, role, branch assignment > System enforces role limits > User receives credentials |
| **Fund Product Setup** | Define loan products | Fund Products > Create Product > Set name, interest type (Declining/Flat), rate, term range, fees (Admin fee, Insurance fee, Stamp duty), penalty rates > Product available for loan origination |
| **GL Account Setup** | Configure Chart of Accounts | GL Accounts > Create accounts following Egyptian accounting standards > Map accounts to system modules (Loan Portfolio, Interest Income, Fee Income, etc.) |
| **Workflow Configuration** | Design custom approval workflows | Workflows > Create Pipeline with name and stages > Assign role-based approvals per stage > Workflow applies to specified operations |
| **Tax Configuration** | Set up Egyptian tax parameters | Tax Config > Configure VAT rates, withholding tax rates, social insurance brackets, personal exemptions |
| **Notification Templates** | Define system notification templates | Notifications > Create templates for SMS, Email, WhatsApp > Link to events (loan approval, payment due, etc.) |
| **Hidden Fields** | Customize UI visibility | Settings > Toggle visibility of specific data fields across all pages for the company |

#### 4.2 Full Operational Access
The TenantAdmin has access to every operational module described in the roles below (Sections 5-16), plus exclusive administrative functions:

| Exclusive Activity | Description | E2E Scenario |
|-------------------|-------------|--------------|
| **Bulk Adjustments** | Mass-update loan terms or rates | Bulk Adjustments > Select loans by filter criteria > Apply rate change or term modification > Changes applied with audit trail |
| **Webhooks** | Configure external integrations | Webhooks > Create webhook URL > Select trigger events > System sends HTTP notifications on events |
| **Data Export** | Export company data | Data Export > Select module (Clients, Loans, Payments) > Choose format > Download complete dataset |
| **Run End-of-Day** | Trigger EOD processing manually | System > Run EOD > System processes accruals, penalties, aging updates, and journal postings |
| **Reopen Daily Closing** | Reverse a closed business day | Daily Closing > Select closed day > Reopen for corrections |
| **ETA E-Invoicing** | Submit invoices to Egyptian Tax Authority | ETA > Prepare invoice document > Digital signing > Submit to ETA API > Track status (Submitted/Valid/Rejected/Cancelled) |

---

## 5. BranchManager

**Description:** The BranchManager oversees all operations at a specific branch. They manage loan officers, handle approvals, and monitor branch performance.

### Authorizations
- Access to all data within their assigned branch
- Approval authority for loans, settlements, and operational requests
- Can view and manage loan officers, collection officers, and cashiers in their branch
- MFA is required for this role
- Cannot create users or modify company settings

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Loan Approval** | Approve or reject loan requests | Loan Requests > Review pending request > Examine client data, risk score, field visit report > Approve (advances to Disbursement) or Reject with reason > Audit logged |
| **Portfolio Monitoring** | Track branch loan portfolio | Dashboard > View total disbursed, outstanding balance, PAR (Portfolio at Risk), collection rate > Drill into individual loans |
| **Loan Requests Review** | Manage the loan pipeline | Loan Requests > View all branch requests by stage (Draft, CreditReview, FieldVisit, Approved) > Advance or return requests |
| **Daily Closing** | Close the branch business day | Daily Closing > Prepare day summary > Verify cash totals > Close day > System posts all pending journal entries |
| **Collection Oversight** | Monitor collection activities | Collection > View officer performance > Track overdue accounts > Assign collection tasks |
| **Financial Statements** | Review branch financials | Financial Statements > View branch-level P&L, Balance Sheet, Trial Balance |
| **Cash Settlements** | Approve cash settlement transactions | Cash Settlements > Review pending settlements > Approve or reject > Funds posted to GL |
| **Branch Requests** | Manage operational requests from branch staff | Approvals > View pending requests (transfers, adjustments, write-offs) > Approve or reject |
| **Portfolio Transfer** | Transfer loans between officers | Portfolio Transfer > Select loans > Assign new loan officer > Transfer effective immediately |
| **Client Management** | Manage branch clients | Clients > View all branch clients > Update KYC status > Review client portfolios |
| **Fund Products** | View available loan products | Fund Products > Browse configured products > View terms and conditions |
| **E-Payments** | Process electronic payments | E-Payments > Record bank transfer, mobile wallet, or card payment > Link to loan/installment |
| **Bank Reconciliation** | Match bank statements | Bank Reconciliation > Upload bank statement > Auto-match transactions > Manually resolve discrepancies |
| **Fixed Assets** | Manage branch assets | Fixed Assets > Register new assets > Track depreciation > Record disposals |
| **Vendors & AP** | Manage branch suppliers | Vendors > Add supplier > Record invoices > Process payments |
| **Budgets** | Manage branch budgets | Budgets > View allocated budget > Track spending vs budget > Variance reporting |
| **Guarantees & Collaterals** | Manage loan security | Guarantees > Add personal guarantors > Collaterals > Register physical collateral items |
| **Agent Banking** | Manage banking agents | Agent Banking > Register agents > Monitor float levels > Track agent transactions |
| **Loan Restructuring** | Restructure problematic loans | Loan Restructuring > Select loan > Propose new terms (rate, tenor, grace period) > Submit for approval |
| **AI Risk Engine** | Run credit scoring and fraud checks | AI Risk > Run credit score for client > Review fraud detection results > View early warning signals |
| **AI Collection** | Smart collection prioritization | AI Collection > View AI-prioritized collection queue > Optimal contact strategy per client |
| **Dynamic Pricing** | Risk-adjusted pricing | Dynamic Pricing > View suggested rates per risk segment > Apply within CBE regulatory caps |
| **Cash Flow Prediction** | Forecast branch liquidity | Cash Flow > View 30/60/90 day forecasts > Plan fund requirements |
| **Loan Aging Analysis** | Track portfolio quality | Loan Aging > View aging buckets (Current, 1-30, 31-60, 61-90, 90+) > Identify deteriorating accounts |
| **Portfolio Analytics** | Advanced portfolio insights | Analytics > View concentration risk, product mix, officer performance metrics |
| **Holidays** | Manage branch holidays | Holidays > Add/edit public holidays > System adjusts due dates around holidays |
| **Mobile Wallets** | Process mobile wallet transactions | Mobile Wallets > Record Vodafone Cash, Orange Money, InstaPay, Meeza payments |
| **WhatsApp Business** | Customer communication | WhatsApp > Send payment reminders > Share digital receipts > Automated notifications |
| **OCR Documents** | Process client documents | OCR > Upload National ID image > AI extracts data > Auto-populate client fields |

---

## 6. LoanOfficer

**Description:** The LoanOfficer is the primary field-level role responsible for client acquisition, loan origination, and portfolio management. This is the most common front-line role in a microfinance company.

### Authorizations
- Can create and manage clients
- Can originate loan requests and submit for approval
- Can view their assigned portfolio but cannot approve loans
- Can perform field check-ins and visits
- Cannot access financial/accounting modules
- Cannot approve their own loan requests

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Client Registration** | Register new borrowers | Clients > New Client > Enter personal details (Name, National ID, Date of Birth, Address, Phone) > Enter business details (Activity type, Monthly income, Years in business) > Upload documents (National ID photo, Tax card, Commercial registration) > Submit for KYC review |
| **KYC Verification** | Verify client identity | Clients > Select client > Review uploaded documents > Run E-KYC verification against NIDA database > Update KYC status (Pending/Approved/Rejected) |
| **Loan Calculator** | Simulate loan terms | Loan Calculator > Select fund product > Enter amount, term > View amortization schedule with principal, interest, fees, and total repayment > Show to client for discussion |
| **Loan Origination** | Create a loan request | Loan Requests > New Request > Select client > Select fund product > Enter requested amount and term > System calculates admin fees, insurance, stamp duty > Attach guarantors and collaterals > Submit request (status: Draft) |
| **Submit for Review** | Advance loan to credit review | Loan Requests > Select draft request > Click "Submit for Review" > Status changes to "CreditReview" > BranchManager notified |
| **Field Visit** | Conduct and record field visits | Loan Requests > Select request in CreditReview > Conduct physical visit to client's business > Record visit findings, photos, GPS location > Status advances to "FieldVisit" |
| **Portfolio Management** | Monitor assigned loans | Portfolio > View all assigned active loans > Track outstanding balances, overdue installments, next due dates |
| **Collection** | Collect repayments in the field | Collection > View daily collection schedule > Record cash/mobile payments received > Issue receipts |
| **I-Score Live** | Check client credit bureau record | I-Score > Enter client National ID > Query Egyptian Credit Bureau > View credit history, existing obligations, score |
| **Guarantees** | Manage loan guarantors | Guarantees > Add guarantor details (Name, National ID, Relationship, Income) > Link to loan request |
| **Client Groups** | Manage group lending | Groups > Create lending group > Add members > Set group guarantee structure |
| **Field Check-ins** | Record GPS-tracked field visits | Check-ins > Clock into location > System records GPS coordinates and timestamp > Track officer coverage area |
| **Loan Restructuring** | Request loan restructuring | Loan Restructuring > Select distressed loan > Propose new terms > Submit for BranchManager approval |
| **Dynamic Pricing** | View risk-based pricing | Dynamic Pricing > View AI-suggested interest rates for client based on risk profile |
| **WhatsApp** | Communicate with clients | WhatsApp > Send payment reminders > Share loan details > Receive client inquiries |
| **OCR Documents** | Scan client documents | OCR > Photograph client National ID > AI extracts text > Auto-fills registration form |
| **Insurance** | Manage loan insurance | Insurance > Attach insurance policy to loan > Record premium payments > Process claims |

### E2E Scenario: Complete Loan Origination

1. **Register Client:** Create client record with personal/business details and documents
2. **Run I-Score:** Check client's credit bureau record for existing obligations
3. **Calculate Loan:** Use loan calculator to determine optimal product and terms
4. **Create Request:** Submit loan request with chosen product, amount, and term
5. **Add Guarantors:** Attach personal guarantors with their documentation
6. **Submit for Review:** Advance request to CreditReview stage
7. **Field Visit:** Conduct physical visit, record findings and GPS check-in
8. **Await Approval:** BranchManager reviews and approves/rejects

---

## 7. CollectionOfficer

**Description:** The CollectionOfficer focuses on loan repayment and recovery. They manage overdue accounts, conduct collection visits, and work with AI tools to optimize recovery strategies.

### Authorizations
- Can view and manage collection activities
- Can record payments and issue receipts
- Can access AI collection tools for prioritization
- Can manage blacklists
- Cannot originate loans or access financial modules
- Cannot approve operational requests

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Daily Collection** | Manage daily collection schedule | Collection > View today's collection tasks sorted by priority > Navigate to client locations > Record payments received |
| **Payment Recording** | Record client repayments | Collection > Select overdue loan > Record payment (Cash/Mobile) > Enter amount > System updates installment status and outstanding balance |
| **Collection Activities** | Track recovery actions | Activities > Log phone calls, SMS sent, visits made > Record client promises to pay > Set follow-up dates |
| **AI Collection** | Use AI-optimized collection strategy | AI Collection > View AI-prioritized debtors list > Best contact time suggestions > Recommended approach per client (call/visit/legal) |
| **Blacklist Management** | Manage blocked borrowers | Blacklists > Add client to blacklist with reason > Blacklisted clients blocked from new loans across the system |
| **Client Groups** | Manage group collections | Groups > View group members' payment status > Apply group pressure mechanisms > Record group payments |
| **Field Check-ins** | GPS-tracked collection visits | Check-ins > Record arrival at client location > Track time spent > Document visit outcome |
| **WhatsApp** | Send collection messages | WhatsApp > Send automated payment reminders > Share overdue notices > Receive payment promises |
| **Loan Aging** | Monitor overdue portfolio | Loan Aging > View aging analysis by bucket > Focus on accounts approaching critical thresholds |
| **Early Warning** | Identify at-risk accounts | AI Risk > View early warning indicators > Proactive outreach to prevent default |

### E2E Scenario: Collection Cycle

1. **Morning Briefing:** Review AI-prioritized collection list for the day
2. **Plan Route:** Organize visits by location for efficiency
3. **Field Visits:** Check in via GPS at each client location
4. **Collect Payments:** Record cash or mobile payments on the spot
5. **Document Activities:** Log call outcomes, visit results, client promises
6. **Escalate:** Flag non-cooperative clients for branch manager review
7. **End of Day:** Submit daily collection summary

---

## 8. Cashier

**Description:** The Cashier handles all monetary transactions at the branch level, including disbursements, repayments, cash settlements, and daily cash reconciliation.

### Authorizations
- Can process financial transactions (receipts and payments)
- Can manage cash boxes and perform daily closing
- Can process e-payments and mobile wallet transactions
- Cannot originate or approve loans
- Cannot access HR or advanced analytics modules

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **E-Payments** | Process electronic payments | E-Payments > Select payment type (Bank Transfer, Card, Mobile) > Enter amount and reference > Link to client/loan > Record transaction |
| **Cash Settlements** | Manage cash transactions | Cash Settlements > Record cash received from clients > Issue numbered receipts > Balance against daily target |
| **Cash Box Management** | Manage branch cash | Cash Settlements > Cash Boxes > Create/monitor cash boxes > Track opening/closing balances > Transfer between boxes |
| **Daily Closing** | Close the business day | Daily Closing > Prepare summary (total receipts, payments, balance) > Verify physical cash matches system > Close day > Auto-post journal entries |
| **Mobile Wallets** | Process mobile payments | Mobile Wallets > Verify Vodafone Cash/Orange Money/InstaPay transaction > Link to client payment > Reconcile with wallet provider |
| **Collection** | Process walk-in repayments | Collection > Client arrives at branch > Verify loan and installment > Process payment > Print receipt |
| **Cash Flow Prediction** | View branch cash needs | Cash Flow > View predicted daily cash requirements > Request fund transfers if needed |

### E2E Scenario: Daily Cash Operations

1. **Open Day:** Verify opening cash balance matches previous closing
2. **Process Transactions:** Record all incoming payments and outgoing disbursements throughout the day
3. **Reconcile Mobile:** Match mobile wallet notifications with system records
4. **Prepare Closing:** Generate day-end summary with all transaction totals
5. **Count Cash:** Physical cash count must match system balance
6. **Close Day:** Submit daily closing report; system posts all pending journal entries

---

## 9. Accountant

**Description:** The Accountant manages the company's financial records, including the General Ledger, journal entries, financial statements, and regulatory reporting.

### Authorizations
- Full access to all financial/accounting modules
- Can create and post journal entries
- Can generate financial statements
- Can manage bank reconciliation and fixed assets
- Can process payroll GL postings
- Cannot approve loans or manage operational workflows

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **General Ledger** | Manage chart of accounts and entries | GL > View chart of accounts > Create journal entries (manual or automated) > Post entries > Generate trial balance |
| **Financial Statements** | Generate regulatory financial reports | Financial Statements > Select period > Generate Trial Balance, Income Statement, Balance Sheet, Cash Flow Statement |
| **Bank Reconciliation** | Match bank and system records | Bank Reconciliation > Upload bank statement (CSV/PDF) > System auto-matches transactions > Manually resolve unmatched items > Post reconciliation entries |
| **Fixed Assets** | Manage company assets | Fixed Assets > Register asset (cost, useful life, depreciation method) > Run monthly depreciation > Track net book value > Record disposals |
| **Vendors & AP** | Manage accounts payable | Vendors > Create vendor profile > Record purchase invoices > Schedule payments > Post to GL |
| **Budgets** | Financial planning | Budgets > Create annual budget by GL account and cost center > Track actual vs budget > Variance analysis > Reallocate funds |
| **Recurring Journals** | Automate periodic entries | Recurring Journals > Define template (accounts, amounts, frequency) > System auto-posts at scheduled intervals |
| **Tax Configuration** | Set up tax parameters | Tax Config > Configure Egyptian VAT rates > Set withholding tax rules > Define social insurance brackets |
| **E-Payments** | Record and reconcile payments | E-Payments > Verify transaction records > Match with bank statements > Post to appropriate GL accounts |
| **Cash Settlements** | Process and verify settlements | Cash Settlements > Review settlement requests > Verify supporting documents > Approve posting |
| **Daily Closing** | Support day-end processes | Daily Closing > Verify all transactions posted > Review auto-generated journals > Confirm closing balances |
| **HR & Payroll** | Process payroll accounting | HR & Payroll > Review payroll run details > Post payroll to GL (Salary Expense Dr, Tax Payable Cr, Net Pay Cr) |
| **Insurance** | Account for insurance transactions | Insurance > Record premium payments > Track insurance receivables > Post claims |
| **Mobile Wallets** | Reconcile mobile payments | Mobile Wallets > Match mobile wallet provider settlements with recorded transactions |
| **IFRS 9 Provisions** | Calculate expected credit losses | IFRS 9 > Run ECL computation > Review stage classifications (Stage 1/2/3) > Post provision entries |
| **Expenses** | Manage company expenses | Expenses > Record expense claims > Attach receipts > Approve and post to GL |
| **ETA E-Invoicing** | Submit tax invoices | ETA > Prepare invoice > Digital signing > Submit to Egyptian Tax Authority > Track status |
| **FRA Reporting** | Generate FRA regulatory reports | FRA > Generate quarterly report for Financial Regulatory Authority > Review data accuracy > Submit |

### E2E Scenario: Monthly Close Process

1. **Post Recurring Journals:** System auto-posts monthly accruals and prepayments
2. **Run Depreciation:** Process monthly fixed asset depreciation
3. **Post Payroll:** Review and post monthly payroll journal entries
4. **Bank Reconciliation:** Upload statements and reconcile all bank accounts
5. **Review Trial Balance:** Verify all accounts balance correctly
6. **IFRS 9 Provisions:** Run ECL calculations and post provision adjustments
7. **Generate Statements:** Produce Income Statement, Balance Sheet, Cash Flow
8. **ETA Submission:** Submit monthly tax invoices to Egyptian Tax Authority

---

## 10. FinancialController

**Description:** The FinancialController is a senior finance role with authority to set risk parameters, approve high-value transactions, and ensure regulatory compliance.

### Authorizations
- All Accountant capabilities plus approval authority
- Can approve settlements, write-offs, and high-value transactions
- Can configure risk criteria and stress testing parameters
- MFA is required for this role
- Cannot create users or modify system configuration

### Capabilities & Activities

All Accountant capabilities (Section 9) plus:

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Approval Authority** | Approve financial operations | Approvals > Review pending settlements, write-offs, rescheduling requests > Approve or reject with comments > Maker-checker principle enforced |
| **Risk Criteria** | Define risk assessment parameters | Risk Criteria > Set scoring weights (income ratio, credit history, collateral value) > Define risk categories and thresholds |
| **IFRS 9 Oversight** | Manage provision policies | IFRS 9 > Set ECL model parameters > Review stage migration rules > Approve provision amounts |
| **Stress Testing** | Run portfolio stress scenarios | Stress Testing > Define scenarios (inflation +5%, currency devaluation, interest rate shock) > Run simulation > Review impact on portfolio quality and provisioning |
| **Cash Flow Prediction** | Strategic cash management | Cash Flow > View company-wide liquidity forecasts > Plan funding strategies |
| **NLP Reporting** | AI-generated management reports | NLP Reports > Generate natural language performance summaries > Board-ready reports covering portfolio quality, profitability, risk metrics |
| **Compliance Exceptions** | Monitor compliance violations | Compliance > Review policy breaches > Document exceptions > Approve remediation plans |
| **Collaterals** | Oversee collateral valuations | Collaterals > Review collateral registrations > Approve valuations > Monitor coverage ratios |
| **Withdrawal of Approvals** | Reverse previously approved items | Approvals > Select approved item > Withdraw approval with reason > Item returns to pending state |
| **Portfolio Analytics** | Strategic portfolio analysis | Analytics > View concentration risk, sector exposure, geographic distribution > Trend analysis |

---

## 11. CFO (Chief Financial Officer)

**Description:** The CFO is the highest-ranking financial role within a tenant, with the same capabilities as the FinancialController plus additional strategic and executive functions.

### Authorizations
- All FinancialController capabilities
- Highest approval authority for financial matters within the tenant
- Can access all analytics and forecasting tools
- MFA is required for this role

### Capabilities & Activities

All FinancialController capabilities (Section 10) plus:

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **AI Credit Scoring** | Oversee credit scoring models | AI Risk > Review scoring model performance > Approve model parameter changes > Monitor score distribution |
| **Churn Prediction** | Client retention strategy | Churn Prediction > View clients at risk of leaving > Review recommended retention actions > Cross-sell opportunity identification |
| **Portfolio Risk Segmentation** | Strategic risk analysis | AI Risk > View portfolio segmented by risk level > Identify concentration risks > Plan mitigation strategies |
| **Insurance Oversight** | Strategic insurance management | Insurance > Review overall insurance portfolio > Monitor claims ratios > Negotiate with providers |
| **Board Reporting** | Executive reporting | NLP Reports + Financial Statements > Generate comprehensive board pack > Trend analysis > Peer comparison |

---

## 12. Auditor

**Description:** The Auditor has a primarily read-only role focused on compliance monitoring, audit trail review, and regulatory reporting. They can view most operational data but have very limited write access.

### Authorizations
- Read access to most operational modules (loans, clients, collections, financials)
- Full access to audit trail
- Can view compliance exceptions
- Can generate FRA reports
- Cannot create or modify operational data
- Cannot approve transactions

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Audit Trail** | Review all system activities | Audit Trail > Search by user, date, action type, entity > View detailed change logs > Export audit data for external review |
| **Compliance Exceptions** | Monitor policy violations | Compliance > View all exceptions flagged by the system > Document findings > Recommend corrective actions |
| **Financial Statements** | Verify financial accuracy | Financial Statements > Review Trial Balance, Income Statement, Balance Sheet > Compare periods > Note discrepancies |
| **Loan Requests** | Review loan pipeline | Loan Requests > View all requests and their workflow stages > Verify approval compliance > Check documentation completeness |
| **Collection** | Monitor collection practices | Collection > Review collection activities > Verify proper procedures followed > Check receipt issuance |
| **FRA Reporting** | Regulatory compliance | FRA Reports > Generate regulatory reports > Verify data accuracy > Prepare submission documentation |
| **NLP Reporting** | Automated compliance summaries | NLP Reports > Generate AI-written compliance narratives > Review for accuracy > Include in audit reports |
| **Fixed Assets** | Verify asset records | Fixed Assets > Review asset register > Verify depreciation calculations > Check disposal records |
| **Loan Aging** | Portfolio quality assessment | Loan Aging > Review aging analysis > Verify proper classification > Check provision adequacy |
| **Portfolio Analytics** | Portfolio risk assessment | Analytics > Review concentration risk > Verify risk metrics > Document findings |
| **Early Warning** | Proactive risk identification | AI Risk > Review early warning signals > Cross-reference with audit findings |
| **Portfolio Risk Segmentation** | Risk classification review | AI Risk > Verify risk segmentation methodology > Review model outputs |
| **Approvals** | Monitor approval process | Approvals > View approval history > Verify maker-checker compliance > Check for conflicts of interest |

### E2E Scenario: Quarterly Audit

1. **Review Audit Trail:** Search for unusual activities (after-hours logins, bulk deletions, role changes)
2. **Verify Approvals:** Ensure all loan approvals followed maker-checker policy
3. **Check Financials:** Reconcile financial statements with underlying transactions
4. **Test Controls:** Verify segregation of duties is maintained
5. **Review Provisions:** Check IFRS 9 calculations and stage classifications
6. **FRA Report:** Generate and verify quarterly regulatory report
7. **Document Findings:** Prepare audit report with exceptions and recommendations

---

## 13. HR (Human Resources)

**Description:** The HR role manages day-to-day human resources operations including employee records, attendance, and payroll processing.

### Authorizations
- Can manage employee records
- Can process payroll
- Can manage attendance and leave
- Cannot access lending, collection, or financial modules
- Cannot approve high-level HR decisions (see HRManager)

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Employee Management** | Manage employee lifecycle | HR & Payroll > Employees > Create employee record (Name, National ID, Job Title, Department, Branch, Salary, Hire Date) > Link to system user account |
| **Attendance Tracking** | Monitor employee attendance | Attendance > View daily clock-in/clock-out records > System auto-calculates hours and overtime (standard 8-hour day) > Generate monthly attendance reports |
| **Leave Management** | Process leave requests | HR > Leave Requests > View pending requests > Check leave balance (Annual: 21 days, Sick: varies) > Approve/reject > System updates balances |
| **Payroll Processing** | Run monthly payroll | HR & Payroll > Run Payroll > System calculates: Gross Salary + Allowances - Social Insurance (employee share) - Income Tax = Net Pay > Review calculations > Post to GL |
| **Social Insurance** | Manage SI compliance | Payroll > View SI calculations > Employee contribution (11%) and Employer contribution (18.75%) within min/max ceilings > Generate SI reports |
| **Document Management** | Manage employee documents | Employees > Upload/manage employment contracts, certificates, ID copies |

### E2E Scenario: Monthly Payroll Cycle

1. **Attendance Review:** Verify monthly attendance records, overtime hours
2. **Leave Reconciliation:** Deduct unpaid leave days from salary
3. **Run Payroll:** Process payroll calculations for all active employees
4. **Review Deductions:** Verify social insurance and tax calculations
5. **Post to GL:** Submit payroll journal entries to General Ledger
6. **Generate Reports:** Produce payslips, SI reports, tax withholding summaries

---

## 14. HRManager

**Description:** The HRManager has senior authority over all HR functions, including approval of leave, terminations, and end-of-service settlements.

### Authorizations
- All HR capabilities plus approval authority
- Can approve leave requests, terminations, and EOS settlements
- Can access the approval workflow for HR-related items
- Can view audit trails related to HR activities
- Cannot access lending or financial modules

### Capabilities & Activities

All HR capabilities (Section 13) plus:

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **HR Approvals** | Approve HR operational requests | Approvals > Review pending HR items (leave, transfers, promotions) > Approve or reject > System applies changes |
| **Employee Termination** | Process employee exits | Employees > Select employee > Record termination date and reason > System updates status to "Terminated" > Triggers EOS calculation |
| **End of Service (EOS)** | Calculate and process final settlement | EOS > Select terminated employee > System calculates: Indemnity (based on years of service) + Accrued leave balance + Pending expenses - Outstanding loans = Net EOS amount > Post to GL |
| **Audit Trail (HR)** | Review HR-related audit records | Audit Trail > Filter by HR entity types > Review changes to employee records, payroll, and approvals |
| **Payroll Configuration** | Set payroll parameters | Payroll Config > Set SI rates, ceilings, floors > Configure income tax brackets > Set personal exemptions |

### E2E Scenario: Employee Exit Process

1. **Initiate Termination:** Record termination date and reason in employee record
2. **Calculate EOS:** System computes indemnity based on tenure and salary
3. **Settle Leave:** Calculate value of unused annual leave
4. **Clear Expenses:** Process any outstanding expense claims
5. **Final Payroll:** Run final salary with prorated amounts
6. **GL Posting:** Post all settlement amounts to General Ledger
7. **Deactivate User:** Disable employee's system access

---

## 15. HRSelfService (Employee Self-Service)

**Description:** The HRSelfService role is assigned to all employees who need access to the self-service portal. This is a limited role that allows employees to view their own information and submit requests.

### Authorizations
- Can view only their own personal and employment information
- Can submit leave requests and expense claims
- Can view their own payslips and attendance records
- Cannot view other employees' data
- Cannot access any operational modules

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **View Profile** | See personal employment details | Self Service > View personal details, job title, department, branch assignment, salary breakdown |
| **Attendance** | Check attendance records | Self Service > View clock-in/clock-out history > Monthly attendance summary > Overtime hours |
| **Leave Requests** | Submit leave applications | Self Service > New Leave Request > Select type (Annual/Casual/Sick/Unpaid) > Enter dates > Add notes > Submit for approval > Track request status |
| **Leave Balance** | Check remaining leave | Self Service > View available Annual and Sick leave days |
| **Payslips** | View salary details | Self Service > View monthly payslip > Breakdown: Gross, Allowances, SI Deduction, Tax, Net Pay |
| **Expense Claims** | Submit expense reports | Self Service > New Expense > Enter amount, category, description > Attach receipt photo > Submit for approval |

---

## 16. DataEntry

**Description:** The DataEntry role has limited operational access, primarily focused on inputting client data and basic loan processing tasks under supervision.

### Authorizations
- Can create and edit client records
- Can create loan request drafts
- Can use the loan calculator
- Cannot submit or approve loan requests
- Cannot access financial, HR, or analytics modules

### Capabilities & Activities

| Activity | Description | E2E Scenario |
|----------|-------------|--------------|
| **Client Data Entry** | Input client information | Clients > New Client > Enter all personal and business details > Upload document copies > Save as draft for review |
| **Loan Requests** | Prepare loan applications | Loan Requests > Create draft loan request > Enter amount, product, term > Save for LoanOfficer review |
| **Loan Calculator** | Generate amortization schedules | Loan Calculator > Select product > Enter terms > Generate schedule for client reference |
| **OCR Documents** | Digitize paper documents | OCR > Scan paper documents > AI extracts text > Verify accuracy > Link to client record |
| **Client Groups** | Data entry for groups | Groups > Enter group member information > Update group records |

---

## 17. End-to-End Business Scenarios

### 17.1 Complete Loan Lifecycle

```
Phase 1: Client Onboarding
[DataEntry/LoanOfficer] Register client -> Upload documents -> Run E-KYC -> Check I-Score

Phase 2: Loan Origination  
[LoanOfficer] Calculate terms -> Create loan request -> Add guarantors -> Submit for review

Phase 3: Credit Review & Approval
[BranchManager] Review credit score -> Review field visit -> Approve/Reject
[AI System] Run fraud detection -> Generate risk score -> Early warning check

Phase 4: Disbursement
[TenantAdmin/BranchManager] Approve disbursement -> [System] Create loan record -> Generate installment schedule -> Post GL journal -> Calculate commissions

Phase 5: Collection & Repayment
[CollectionOfficer] Daily collection visits -> Record payments -> Issue receipts
[Cashier] Process walk-in payments -> Daily cash reconciliation
[AI System] Prioritize collection queue -> Predict collection propensity

Phase 6: Monitoring
[BranchManager] Portfolio review -> PAR monitoring -> Aging analysis
[FinancialController/CFO] IFRS 9 provisions -> Stress testing -> NLP reporting

Phase 7: Closure
[System] Final payment received -> Loan marked as "Closed" -> GL entries posted -> Certificate of clearance
OR
[BranchManager] Write-off recommendation -> [FinancialController] Approve write-off -> GL entries posted
```

### 17.2 Monthly Financial Close

```
Day 1-5: Transaction Processing
[Cashier] Verify all transactions posted
[Accountant] Post recurring journals -> Run depreciation

Day 5-10: Reconciliation
[Accountant] Bank reconciliation -> Vendor reconciliation -> Inter-branch reconciliation

Day 10-15: Payroll
[HR] Attendance finalization -> [Accountant] Payroll processing -> SI/Tax calculations -> GL posting

Day 15-20: Provisions & Adjustments
[Accountant] IFRS 9 ECL calculation -> [FinancialController] Review and approve provisions

Day 20-25: Reporting
[Accountant] Generate Trial Balance, Income Statement, Balance Sheet
[FinancialController] Review and approve statements
[CFO] Board reporting -> NLP management summary

Day 25-30: Regulatory
[Accountant] ETA e-invoice submission -> FRA quarterly report preparation
[Auditor] Compliance review -> Exception documentation
```

### 17.3 Employee Lifecycle (HR)

```
Onboarding:
[HRManager] Create employee record -> Assign department/branch -> Link to user account -> Set salary structure

Monthly Operations:
[HR] Track attendance -> Process leave requests -> Run payroll -> Generate payslips
[HRSelfService] View payslip -> Submit leave requests -> Check balances

Separation:
[HRManager] Initiate termination -> Calculate EOS -> Settle accruals -> Deactivate account
[Accountant] Post final GL entries -> Process final payment
```

### 17.4 ETA E-Invoicing Flow

```
[Accountant/TenantAdmin] Prepare invoice document (type: I/C/D)
-> Digital signing (canonical JSON serialization)
-> Submit to ETA API (single or batch up to 50)
-> Track status: Submitted -> Valid/Rejected
-> If Rejected: Correct and resubmit
-> If Valid: Record UUID and long ID
-> Cancel if needed: Submit cancellation with reason
```

---

## 18. Maker-Checker Approval Matrix

The system enforces separation of duties. A user cannot approve their own request.

| Operation | Makers (Can Request) | Checkers (Can Approve/Reject) |
|-----------|---------------------|------------------------------|
| Loan Approval | LoanOfficer, DataEntry | TenantAdmin, BranchManager |
| Cash Settlement | Cashier, Accountant | TenantAdmin, BranchManager, FinancialController, CFO |
| Write-off | LoanOfficer, BranchManager | TenantAdmin, FinancialController, CFO |
| Loan Rescheduling | LoanOfficer, BranchManager | TenantAdmin, FinancialController, CFO |
| Wire Transfer Reconciliation | Accountant | TenantAdmin, BranchManager, FinancialController, CFO |
| Daily Closing | Cashier, Accountant | TenantAdmin, BranchManager |
| Leave Request | Any Employee (HRSelfService) | HR, HRManager |
| Employee Termination | HR | HRManager |
| EOS Settlement | HR | HRManager, TenantAdmin |
| Approval Withdrawal | - | TenantAdmin, FinancialController, CFO, SuperAdmin |

---

## 19. Module Access Matrix

A comprehensive view of which roles can access which modules:

| Module | SuperAdmin | TenantAdmin | BranchMgr | LoanOfficer | CollectionOfficer | Cashier | Accountant | FinCtrl | CFO | Auditor | HR | HRMgr | DataEntry | HRSelfSvc |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | X | X | X | X | X | X | X | X | X | X | X | X | X | X |
| Clients | X | X | X | X | - | - | - | - | - | - | - | - | X | - |
| Loan Calculator | - | X | X | X | - | - | - | - | - | - | - | - | X | - |
| Loan Requests | - | X | X | X | - | - | - | - | - | X | - | - | X | - |
| Fund Products | - | X | X | X | - | - | - | - | - | - | - | - | X | - |
| Portfolio | - | X | X | X | - | - | - | - | - | - | - | - | - | - |
| Guarantees | - | X | X | X | - | - | - | - | - | X | - | - | - | - |
| E-Payments | - | X | X | - | - | X | X | X | X | - | - | - | - | - |
| Financial Stmts | - | X | X | - | - | - | X | X | X | X | - | - | - | - |
| Bank Recon | - | X | X | - | - | - | X | X | X | - | - | - | - | - |
| Fixed Assets | - | X | X | - | - | - | X | X | X | X | - | - | - | - |
| Vendors & AP | - | X | X | - | - | - | X | X | X | - | - | - | - | - |
| Budgets | - | X | X | - | - | - | X | X | X | - | - | - | - | - |
| Recurring Journals | - | X | - | - | - | - | X | X | X | - | - | - | - | - |
| Tax Config | - | X | - | - | - | - | X | X | - | - | - | - | - | - |
| Cash Settlements | - | X | X | - | - | X | X | X | X | - | - | - | - | - |
| Collection | - | X | X | X | X | X | - | - | - | X | - | - | - | - |
| Activities | - | X | X | - | X | - | - | - | - | - | - | - | - | - |
| Groups | - | X | X | X | X | - | - | - | - | - | - | - | - | - |
| HR & Payroll | - | X | X | - | - | - | X | X | X | - | X | X | - | - |
| Self Service | - | X | X | X | X | X | X | X | X | X | X | X | X | X |
| Compliance | - | X | - | - | - | - | - | X | X | X | - | - | - | - |
| Approvals | - | X | X | X | X | - | - | X | X | X | - | X | - | - |
| Audit Trail | - | X | X | - | - | - | - | X | X | X | - | X | - | - |
| Reports | - | X | X | X | X | - | - | X | X | X | - | - | - | - |
| Settings | - | X | - | - | - | - | - | - | - | - | - | - | - | - |
| Loan Aging | - | X | X | X | X | - | - | X | X | X | - | - | - | - |
| Field Check-ins | - | X | X | X | X | - | - | - | - | - | - | - | - | - |
| Portfolio Analytics | - | X | X | - | - | - | - | X | X | X | - | - | - | - |
| Bulk Adjustments | - | X | - | - | - | - | - | - | - | - | - | - | - | - |
| Webhooks | - | X | - | - | - | - | - | - | - | - | - | - | - | - |
| Data Export | - | X | - | - | - | - | - | - | - | - | - | - | - | - |
| Insurance | - | X | X | X | - | - | X | - | X | - | - | - | - | - |
| Agent Banking | - | X | X | - | - | - | - | - | - | - | - | - | - | - |
| Loan Restructuring | - | X | X | X | - | - | - | - | - | - | - | - | - | - |
| Mobile Wallets | - | X | X | - | - | X | X | - | - | - | - | - | - | - |
| WhatsApp | - | X | X | X | X | - | - | - | - | - | - | - | - | - |
| OCR Documents | - | X | X | X | - | - | - | - | - | - | - | - | X | - |
| AI Collection | - | X | X | - | X | - | - | - | - | - | - | - | - | - |
| Dynamic Pricing | - | X | X | X | - | - | - | - | - | - | - | - | - | - |
| Cash Flow Pred. | - | X | X | - | - | X | - | X | X | - | - | - | - | - |
| Stress Testing | - | X | X | - | - | - | - | X | X | - | - | - | - | - |
| AI Risk Engine | - | X | X | X | X | - | - | X | X | X | - | - | - | - |
| NLP Reporting | - | X | X | - | - | - | - | X | X | X | - | - | - | - |
| Churn Prediction | - | X | X | - | - | - | - | X | X | - | - | - | - | - |
| IFRS 9 | - | X | - | - | - | - | X | X | X | - | - | - | - | - |
| FRA Reports | - | X | X | - | - | - | X | X | X | X | - | - | - | - |
| I-Score Live | - | X | X | X | - | - | - | - | - | - | - | - | - | - |
| AML Screening | - | X | X | X | - | - | - | X | X | X | - | - | - | - |
| ETA E-Invoicing | - | X | - | - | - | - | X | X | X | - | - | - | - | - |

---

**Document End**

*This document is auto-generated from the Neo FMC system configuration and codebase. For the most current role definitions and module access, refer to the system's Settings > Roles & Permissions section.*

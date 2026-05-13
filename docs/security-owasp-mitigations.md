# Neo FMC - OWASP Top 10 Mitigation Documentation
**Version:** 1.0  
**Last Updated:** April 2, 2026

---

## A01:2021 - Broken Access Control

| Control | Implementation |
|---------|---------------|
| RBAC Middleware | `requireAuth`, `requireRole` middleware enforces role-based access on every API endpoint |
| Row-Level Security | PostgreSQL RLS policies with `tenant_id` enforce database-level tenant isolation |
| Maker-Checker | Sensitive operations (write-offs, settlements) require dual approval |
| Least Privilege | 10+ granular roles with purpose-specific permissions |
| MFA Enforcement | TOTP-based MFA mandatory for privileged roles (SuperAdmin, TenantAdmin, BranchManager) |

## A02:2021 - Cryptographic Failures

| Control | Implementation |
|---------|---------------|
| Password Hashing | bcryptjs with 10 rounds |
| Field Encryption | AES-256-GCM for PII fields (National ID, phone, address) |
| Transport | TLS 1.3 enforced via HSTS header |
| JWT Signing | HMAC-SHA256 with configurable secret |
| TOTP Secrets | Base32 encoded, server-side only |

## A03:2021 - Injection

| Control | Implementation |
|---------|---------------|
| SQL Injection | Drizzle ORM with parameterized queries (no raw SQL interpolation) |
| Input Validation | Zod schema validation on all API inputs |
| XSS | React's default escaping + CSP headers |

## A04:2021 - Insecure Design

| Control | Implementation |
|---------|---------------|
| Audit Trail | Immutable `audit_logs` table logging all sensitive operations |
| Financial Controls | Daily/periodic closing prevents backdating |
| CBE Compliance | Hard-coded rate caps and loan amount limits |

## A05:2021 - Security Misconfiguration

| Control | Implementation |
|---------|---------------|
| Security Headers | `securityHeadersMiddleware` sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP, Referrer-Policy |
| Error Handling | Generic error responses in production (no stack traces) |
| Rate Limiting | Per-API, per-auth, per-tenant, per-sensitive-operation limiters |

## A06:2021 - Vulnerable and Outdated Components

| Control | Implementation |
|---------|---------------|
| Dependency Management | pnpm with lockfile for reproducible builds |
| Audit | `pnpm audit` for known vulnerability detection |

## A07:2021 - Identification and Authentication Failures

| Control | Implementation |
|---------|---------------|
| Account Lockout | 5 failed attempts triggers 15-minute lockout |
| Password Complexity | Minimum 8 chars, uppercase, lowercase, digit required |
| Session Management | JWT with expiration, session timeout middleware |
| MFA | TOTP-based 2FA with QR code enrollment |

## A08:2021 - Software and Data Integrity Failures

| Control | Implementation |
|---------|---------------|
| API Validation | OpenAPI spec with generated Zod validators |
| Webhook Verification | Signature verification on payment gateway webhooks |

## A09:2021 - Security Logging and Monitoring Failures

| Control | Implementation |
|---------|---------------|
| Audit Logging | Comprehensive `logAudit()` on all financial and sensitive operations |
| AML Monitoring | Real-time transaction monitoring with configurable rules |
| Health Checks | `/api/healthz` endpoint for uptime monitoring |

## A10:2021 - Server-Side Request Forgery (SSRF)

| Control | Implementation |
|---------|---------------|
| External API Calls | Timeout limits (15-30s) on all external service calls |
| URL Validation | External URLs restricted to known service endpoints (NIDA, ETA, I-Score) |

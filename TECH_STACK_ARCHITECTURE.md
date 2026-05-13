# Tech Stack Architecture - NeoFMC

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (Port 5173)                        │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   React 19.1.0 Application                       │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │   │
│  │  │  UI Layer   │  │  State Mgmt  │  │  Utilities           │   │   │
│  │  │             │  │              │  │                      │   │   │
│  │  │ Radix UI    │  │ React Query  │  │ Vite Build Tool      │   │   │
│  │  │ + Tailwind  │  │ + Zustand(?) │  │ TypeScript 5.9       │   │   │
│  │  │ + Framer    │  │              │  │ ESM Modules          │   │   │
│  │  │ + Recharts  │  │              │  │                      │   │   │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘   │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │         API Client Layer (Auto-Generated)              │   │   │
│  │  │                                                          │   │   │
│  │  │  Generated from OpenAPI Spec by Orval                  │   │   │
│  │  │  • TanStack React Query hooks                          │   │   │
│  │  │  • Type-safe API calls                                 │   │   │
│  │  │  • Zod validation schemas                              │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              │ HTTP/JSON (CORS)                          │
│                              │                                           │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  EXPRESS.JS API SERVER (Port 3000)                       │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                              │   │
│  │                                                                   │   │
│  │  • CORS Handler          • Rate Limiter (express-rate-limit)    │   │
│  │  • Cookie Parser         • Error Handler                         │   │
│  │  • Body Parser (JSON)    • Logging                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Route Handlers                                │   │
│  │                                                                   │   │
│  │  • Authentication Routes    • Business Logic Routes              │   │
│  │    - Login/Register           - Loan Management                  │   │
│  │    - JWT tokens               - Account Operations              │   │
│  │    - 2FA/OTP (otpauth)        - Payments & Collections           │   │
│  │  • User Management           - Reporting                         │   │
│  │  • Webhook Endpoints                                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Business Logic & Services                           │   │
│  │                                                                   │   │
│  │  • Authentication Service (bcryptjs, openid-client)             │   │
│  │  • Email Service (nodemailer)                                   │   │
│  │  • AI Services (OpenAI integration)                             │   │
│  │  • File Processing (xlsx, multer)                              │   │
│  │  • Cron Jobs (node-cron) - scheduled tasks                      │   │
│  │  • QR Code Generation (qrcode)                                 │   │
│  │  • Webhook Service - event publishing                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │            Drizzle ORM Layer (Database Abstraction)              │   │
│  │                                                                   │   │
│  │  • Schema definitions (70+ tables)                              │   │
│  │  • Type-safe queries                                           │   │
│  │  • Migrations management (drizzle-kit)                         │   │
│  │  • Zod schema validation (drizzle-zod)                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              │ PostgreSQL Protocol                       │
│                              │                                           │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE (Port 5432)                       │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   Schema & Tables (70+)                          │   │
│  │                                                                   │   │
│  │  Financial Domains:                                              │   │
│  │  • Loans & Installments       • Savings & Accounts               │   │
│  │  • Payments & Collections     • GL Accounting & Journals         │   │
│  │  • Clients & Customers        • Risk Assessment & Scoring        │   │
│  │  • Branches & Tenants         • IFRS 9 Provisioning             │   │
│  │  • Compliance (AML/KYC)       • Vendor & Expenses                │   │
│  │  • Audit Logging              • User Access Control              │   │
│  │                                                                   │   │
│  │  Data Integrity:                                                 │   │
│  │  • Foreign Keys               • Constraints                       │   │
│  │  • Indexes (on queries)        • Triggers (if any)               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Storage: File-based (default) or external volume (Docker/prod)         │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES (Optional/Conditional)                    │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  OpenAI API      │  │  Email Service   │  │  Replit Auth     │      │
│  │  • GPT Models    │  │  • SMTP (Gmail)  │  │  • OpenID Connect│      │
│  │  • Embeddings    │  │  • Nodemailer    │  │  • OAuth2        │      │
│  │  • Chat/Text     │  │  • Notifications │  │  • Web Auth      │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Monorepo Structure & Dependencies

```
pnpm Workspace (Root)
│
├── artifacts/                          [Applications - compiled & run]
│   ├── api-server/                     [Express.js Backend]
│   │   ├── src/index.ts               [Server entry point]
│   │   ├── src/routes/                [Route handlers]
│   │   ├── src/middleware/            [Express middleware]
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .env                       [Environment variables]
│   │
│   ├── neo-fmc/                        [React Frontend]
│   │   ├── src/main.tsx               [React entry point]
│   │   ├── src/components/            [React components]
│   │   ├── src/pages/                 [Page components]
│   │   ├── src/hooks/                 [Custom React hooks]
│   │   ├── vite.config.ts             [Vite configuration]
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── neo-fmc-presentation/
│   ├── neo-fmc-customer-deck/
│   └── mockup-sandbox/
│
├── lib/                                [Shared Libraries - reusable]
│   │
│   ├── db/                             [Database Layer]
│   │   ├── src/schema/                [Drizzle ORM schemas (70+ tables)]
│   │   │   ├── loans/                [Loan management schemas]
│   │   │   ├── accounts/             [Account schemas]
│   │   │   ├── payments/             [Payment schemas]
│   │   │   ├── clients/              [Client/customer schemas]
│   │   │   └── ... [70+ schema files]
│   │   ├── src/index.ts              [DB exports]
│   │   ├── drizzle.config.ts         [ORM configuration]
│   │   └── package.json
│   │
│   ├── api-zod/                        [Validation Schemas]
│   │   ├── src/schemas/              [Zod schemas for API validation]
│   │   ├── src/types.ts              [Derived types]
│   │   └── package.json
│   │
│   ├── api-spec/                       [API Specification]
│   │   ├── openapi.yaml              [OpenAPI/Swagger spec]
│   │   ├── orval.config.ts           [Code generation config]
│   │   └── package.json
│   │
│   ├── api-client-react/               [Auto-Generated API Client]
│   │   ├── src/generated/            [Generated from OpenAPI]
│   │   │   ├── queries.ts            [React Query hooks]
│   │   │   ├── mutations.ts          [Mutation hooks]
│   │   │   └── types.ts              [API types]
│   │   └── package.json
│   │
│   ├── replit-auth-web/                [Authentication Library]
│   │   ├── src/useAuth.ts            [Auth hook]
│   │   ├── src/AuthContext.tsx       [Auth provider]
│   │   └── package.json
│   │
│   └── integrations/                   [External Service Integrations]
│       ├── openai/                   [OpenAI integration]
│       ├── stripe/                   [Payment provider (if used)]
│       └── ... [Other integrations]
│
├── scripts/                            [Utility Scripts]
│   ├── seed.ts                        [Database seeding]
│   ├── migrate.ts                     [Migration runner]
│   └── package.json
│
├── pnpm-workspace.yaml                [Workspace configuration]
├── package.json                       [Root dependencies]
├── tsconfig.base.json                 [TypeScript base config]
├── tsconfig.json                      [TypeScript main config]
├── .env                               [Root environment variables]
└── .env.example                       [Environment template]
```

---

## 🔄 Data Flow Diagram

```
USER INTERACTION (Browser)
    │
    ▼
┌───────────────────────────┐
│  React Component          │ ← State management (React Query)
│  • Renders UI             │
│  • Handles user input     │
│  • Shows loading/errors   │
└───────────────────────────┘
    │
    │ useQuery() or useMutation()
    │ (React Query hooks)
    │
    ▼
┌───────────────────────────┐
│  Auto-Generated API       │ ← From OpenAPI + Orval
│  Client (React Query)     │
│  • Type-safe requests     │
│  • Caching & retry logic  │
│  • Background sync        │
└───────────────────────────┘
    │
    │ HTTP POST/GET/PUT/DELETE
    │ JSON payload + JWT token
    │
    ▼
┌───────────────────────────────────────────┐
│  Express.js Backend                        │
│  ├─ Route Handler                          │
│  ├─ Middleware (auth, validation)          │
│  ├─ Business Logic & Services              │
│  └─ Drizzle ORM (type-safe queries)        │
└───────────────────────────────────────────┘
    │
    │ SQL queries
    │
    ▼
┌───────────────────────────┐
│  PostgreSQL Database      │
│  • Read/Write data        │
│  • Execute constraints    │
│  • Return query results   │
└───────────────────────────┘
    │
    │ Query result
    │
    ▼
┌───────────────────────────────────────────┐
│  Express.js Response                      │
│  ├─ Format response (JSON)                │
│  ├─ Apply transformations                 │
│  ├─ Set headers/status                    │
│  └─ Send to client                        │
└───────────────────────────────────────────┘
    │
    │ HTTP 200 OK / error response
    │ JSON data
    │
    ▼
┌───────────────────────────┐
│  React Query Updates      │
│  • Cache data             │
│  • Trigger re-render      │
│  • Update component state │
└───────────────────────────┘
    │
    ▼
USER SEES UPDATED UI
```

---

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────┘

1. USER LOGS IN
   Browser: email + password
        │
        ▼
   POST /api/auth/login
        │
        ▼
2. SERVER VALIDATION
   • Zod schema validation
   • Hash password (bcryptjs)
   • Compare with stored hash
        │
        ├─ FAIL: return 401 Unauthorized
        │
        └─ SUCCESS:
             │
             ▼
3. GENERATE JWT TOKEN
   • Header: { alg: HS256, typ: JWT }
   • Payload: { userId, email, permissions }
   • Signed with JWT_SECRET
        │
        ▼
4. RETURN TOKEN
   Response: { token, user, expiresIn }
   + Set secure HTTP-only cookie
        │
        ▼
5. BROWSER STORES TOKEN
   • In React Query cache
   • In localStorage / cookies
   • Attach to future requests
        │
        ▼

┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED REQUEST                    │
└─────────────────────────────────────────────────────────────┘

6. SUBSEQUENT API CALL
   GET /api/loans
   Headers: { Authorization: "Bearer <jwt_token>" }
        │
        ▼
7. SERVER MIDDLEWARE
   • Extract token from header
   • Verify signature (JWT_SECRET)
   • Decode payload
   • Validate expiration
        │
        ├─ INVALID: return 401 Unauthorized
        │
        └─ VALID:
             │
             ▼
8. EXTRACT USER CONTEXT
   • userId from token
   • Permissions/roles
   • Attach to request object
        │
        ▼
9. ROUTE HANDLER EXECUTES
   • Access req.user (user context)
   • Row-level security (tenant/branch)
   • Business logic
        │
        ▼
10. RETURN DATA
    • Only data user can access
    • Status 200 OK
        │
        ▼

┌─────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH                            │
└─────────────────────────────────────────────────────────────┘

11. OPTIONAL: REFRESH TOKEN
    If token expires:
    POST /api/auth/refresh
    Body: { refreshToken }
         │
         ▼
    Generate new JWT
         │
         ▼
    Return new token
```

---

## 📊 Technology Selection Rationale

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend Framework** | React 19 | Modern, component-based, large ecosystem, type-safe with TypeScript |
| **Build Tool** | Vite 7 | Lightning-fast HMR, ESM-first, optimized builds, superior DX |
| **UI Library** | Radix UI | Headless, accessible, fully customizable, great with Tailwind |
| **Styling** | Tailwind CSS 4 | Utility-first, DRY, optimized output, rapid prototyping |
| **State Management** | React Query | Server state focused, caching, deduplication, background sync |
| **Forms** | React Hook Form | Minimal re-renders, tiny bundle, great validation with Zod |
| **Routing** | Wouter | Lightweight, 1KB alternative to React Router |
| **Backend Framework** | Express.js | Lightweight, flexible, large ecosystem, easy middleware |
| **Language** | TypeScript | Type safety, better DX, catches errors at compile-time |
| **Database** | PostgreSQL | ACID compliant, relational, powerful, open-source, scalable |
| **ORM** | Drizzle | Type-safe, SQL-like syntax, migrations, zero-cost abstractions |
| **API Generation** | Orval + OpenAPI | Single source of truth, auto-generated types, no manual sync |
| **Validation** | Zod | Lightweight, composable, both runtime & compile-time validation |
| **Auth** | JWT + OpenID | Stateless, scalable, standard, integrates with external providers |

---

## 🚀 Deployment Considerations

### Local Development
- Full monorepo installed locally
- Hot reload for frontend (Vite)
- Nodemon/tsx watch for backend
- SQLite or local PostgreSQL

### Production Deployment
```
Frontend: Static files → CDN or web server (Nginx/Apache)
Backend:  Docker container → Kubernetes/Docker Swarm
Database: Managed PostgreSQL (RDS, Cloud SQL, etc.)
```

### Environment Separation
```
.env.development   → Local development
.env.staging       → Staging server
.env.production    → Production (secrets in CI/CD)
```

---

## 🔧 Build Process

```
Source Code (TypeScript + JSX)
    │
    ├─ Frontend Path:
    │  Vite (TypeScript, JSX parsing)
    │  → Bundle splitting
    │  → CSS processing (Tailwind)
    │  → Output: /dist (static HTML/JS/CSS)
    │
    └─ Backend Path:
       esbuild (TypeScript compilation)
       → Single bundle
       → Tree-shaking
       → Output: /dist (single JS file)

Local Dev:
- Frontend: Vite dev server (5173) with HMR
- Backend: tsx with --watch (auto-restart on changes)
```

---

## 📈 Scalability Notes

**Vertical Scaling (machine power):**
- Node.js is single-threaded; add more RAM/CPU helps
- PM2 or node-cluster can use all CPU cores

**Horizontal Scaling (multiple machines):**
- Stateless API design (JWT tokens)
- Load balancer routes to multiple backend instances
- Shared PostgreSQL database
- Session state in Redis (if needed)

**Database Optimization:**
- Indexes on frequently queried columns
- Connection pooling (PgBouncer, node-postgres pools)
- Read replicas for scaling reads
- Partitioning for large tables

---

**Architecture Version:** 1.0  
**Last Updated:** May 14, 2026

# NeoFMC Local Deployment Plan

**Project Type:** Full-Stack TypeScript Monorepo with React Frontend + Express.js Backend  
**Database:** PostgreSQL  
**Package Manager:** pnpm  
**Date:** May 14, 2026

---

## 📋 Tech Stack Summary

### Architecture Overview
```
NeoFMC (Monorepo)
├── artifacts/
│   ├── api-server (Express.js backend)
│   ├── neo-fmc (React frontend)
│   ├── neo-fmc-presentation
│   ├── neo-fmc-customer-deck
│   └── mockup-sandbox
├── lib/
│   ├── db (Drizzle ORM + PostgreSQL schemas)
│   ├── api-zod (Shared validation schemas)
│   ├── api-client-react (Auto-generated React Query hooks)
│   ├── api-spec (OpenAPI specification)
│   ├── replit-auth-web (Authentication)
│   └── integrations/ (External services)
└── scripts/
```

### Frontend Stack
- **Framework:** React 19.1.0 + Vite 7.3.0
- **Language:** TypeScript 5.9.2
- **UI:** Radix UI + Tailwind CSS 4.1.14
- **State Management:** TanStack React Query 5.90.21
- **Routing:** Wouter 3.3.5
- **Forms:** React Hook Form + Zod validation
- **Key Libraries:** Framer Motion, Recharts, Lucide Icons, Sonner (toasts)

### Backend Stack
- **Framework:** Express.js 5.x
- **Runtime:** Node.js with TSX executor
- **Language:** TypeScript 5.9.2
- **Database:** PostgreSQL with Drizzle ORM 0.45.1
- **Auth:** JWT + OpenID Connect (Replit)
- **Security:** bcryptjs, express-rate-limit, CORS
- **Additional:** Nodemailer, OpenAI API, node-cron, otpauth

### Database
- **PostgreSQL** (version: see your database installation)
- **ORM:** Drizzle ORM with Drizzle Kit migrations
- **Schema:** 70+ tables supporting financial management (loans, payments, accounts, etc.)

---

## 🚀 Prerequisites

### System Requirements
- **Node.js:** 18.x or higher (recommended 20.x+)
- **pnpm:** 8.x or higher
- **PostgreSQL:** 13.x or higher
- **RAM:** 4GB minimum (8GB recommended)
- **Disk Space:** 2GB+ for node_modules and database

### Installation Verification
```bash
# Check versions
node --version     # Should be v18+
pnpm --version     # Should be 8.x+
psql --version     # Should be 13+
```

---

## 📦 Phase 1: Environment Setup

### Step 1.1 - Install pnpm
```bash
# If you don't have pnpm
npm install -g pnpm

# Verify
pnpm --version
```

### Step 1.2 - Install PostgreSQL
Choose one of these approaches:

#### Option A: Docker (Recommended)
```bash
docker run --name neo-fmc-postgres \
  -e POSTGRES_USER=neo_fmc_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=neo_fmc_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15-alpine
```

#### Option B: Local PostgreSQL Installation
- **macOS:** `brew install postgresql@15`
- **Ubuntu:** `sudo apt-get install postgresql-15`
- **Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)

After installation, create your database:
```bash
createdb neo_fmc_db
createuser neo_fmc_user
psql -c "ALTER USER neo_fmc_user PASSWORD 'your_secure_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE neo_fmc_db TO neo_fmc_user;"
```

### Step 1.3 - Set Up Environment Variables

Create files at:
- **Root:** `D:\NeoFMC\.env`
- **API Server:** `D:\NeoFMC\artifacts\api-server\.env`

**.env (Root Level)**
```env
# PostgreSQL Connection
DATABASE_URL=postgresql://neo_fmc_user:your_secure_password@localhost:5432/neo_fmc_db

# API Server
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=development

# Frontend
VITE_API_BASE_URL=http://localhost:3000
```

**artifacts/api-server/.env**
```env
# Environment
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://neo_fmc_user:your_secure_password@localhost:5432/neo_fmc_db

# Security & Auth
JWT_SECRET=your_development_jwt_secret_key_min_32_chars

# OpenID Connect (Replit Auth) - Optional for local dev
OPENID_PROVIDER_URL=https://replit.com
OPENID_CLIENT_ID=your_client_id
OPENID_CLIENT_SECRET=your_client_secret

# AI Services
OPENAI_API_KEY=your_openai_api_key  # Optional

# Email Service
SMTP_HOST=smtp.gmail.com            # Optional
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret

# CORS Settings
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Optional: artifacts/neo-fmc/.env.local**
```env
# Vite environment for frontend
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Neo FMC Local Dev
```

---

## 🔧 Phase 2: Installation

### Step 2.1 - Install Dependencies
```bash
cd D:\NeoFMC

# Install root and all workspace dependencies
pnpm install

# Verify installation
pnpm list --depth=0
```

### Step 2.2 - Type Checking
```bash
# Build libraries and type check everything
pnpm typecheck

# Full build (includes typecheck)
pnpm build
```

---

## 🗄️ Phase 3: Database Setup

### Step 3.1 - Run Migrations
```bash
cd artifacts/api-server

# Generate and run migrations
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate

# Verify database
psql -U neo_fmc_user -d neo_fmc_db -c "\dt"  # List tables
```

### Step 3.2 - Seed Data (Optional)
If seed scripts exist, run them:
```bash
pnpm exec tsx ./scripts/seed.ts  # If available
```

---

## 🎯 Phase 4: Start Development Servers

### Step 4.1 - Terminal 1: Start Backend API Server
```bash
cd D:\NeoFMC/artifacts/api-server
pnpm dev
```

Expected output:
```
Server running on http://0.0.0.0:3000
Connected to PostgreSQL database
```

### Step 4.2 - Terminal 2: Start Frontend Development Server
```bash
cd D:\NeoFMC/artifacts/neo-fmc
pnpm dev
```

Expected output:
```
VITE v7.3.0  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Step 4.3 - Verify Connection
- Open browser: **http://localhost:5173**
- Check Network tab in DevTools for successful API calls to `http://localhost:3000`
- No CORS errors should appear

---

## ✅ Phase 5: Verification Checklist

- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes all type checks
- [ ] `pnpm build` succeeds
- [ ] PostgreSQL running and accessible
- [ ] Database migrations applied successfully
- [ ] Backend server starts on port 3000
- [ ] Frontend server starts on port 5173
- [ ] Frontend loads in browser without console errors
- [ ] API calls from frontend to backend succeed (check Network tab)
- [ ] Can interact with basic UI elements

---

## 🛠️ Development Workflow

### Adding New Backend Dependencies
```bash
cd artifacts/api-server
pnpm add package-name
# Dependencies automatically available to other packages via workspace
```

### Adding New Frontend Dependencies
```bash
cd artifacts/neo-fmc
pnpm add package-name
```

### Running Specific Workspace Commands
```bash
# Run build only for api-server
pnpm --filter @workspace/api-server run build

# Run dev only for neo-fmc
pnpm --filter @workspace/neo-fmc run dev

# Run across multiple packages
pnpm -r run build
```

### Database Migrations
```bash
cd artifacts/api-server

# Create new migration after schema changes
pnpm exec drizzle-kit generate

# Apply migrations
pnpm exec drizzle-kit migrate

# Introspect existing database
pnpm exec drizzle-kit introspect
```

---

## 🔐 Security Notes for Local Development

⚠️ **DO NOT commit `.env` files to Git**

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### Generate Secure Secrets
```bash
# JWT_SECRET (generate random 32+ char string)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Database password (use a strong password)
# WEBHOOK_SECRET (generate random string)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 📊 Port Configuration

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend (Vite) | 5173 | http://localhost:5173 | React development server |
| Backend API | 3000 | http://localhost:3000 | Express.js API server |
| PostgreSQL | 5432 | localhost:5432 | Database |
| Vite Preview | 5173 | http://localhost:5173 | Production build preview |

To change ports, modify:
- **Frontend:** `artifacts/neo-fmc/vite.config.ts`
- **Backend:** `artifacts/api-server/.env` (PORT variable)
- **Database:** PostgreSQL config

---

## 🐛 Troubleshooting

### Issue: `pnpm: command not found`
**Solution:** Install pnpm globally
```bash
npm install -g pnpm
```

### Issue: PostgreSQL Connection Refused
**Solution:** Verify PostgreSQL is running
```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# For Docker
docker ps | grep postgres
```

### Issue: Port Already in Use
**Solution:** Find and kill process using the port
```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Issue: Module Not Found Errors
**Solution:** Reinstall dependencies
```bash
# Clear cache and reinstall
pnpm store prune
pnpm install
pnpm build
```

### Issue: TypeScript Errors After Fresh Install
**Solution:** Rebuild type definitions
```bash
pnpm typecheck:libs
pnpm build
```

### Issue: API Server Can't Connect to Database
**Checklist:**
- [ ] PostgreSQL is running
- [ ] DATABASE_URL is correct in `.env`
- [ ] Database and user exist
- [ ] Network connectivity (firewall not blocking port 5432)

---

## 📈 Next Steps

### For Backend Development
1. Review `artifacts/api-server/src/index.ts` for server entry point
2. Check `lib/db/src/schema/` for database models
3. API routes are in `artifacts/api-server/src/routes/` (or similar)
4. OpenAPI spec at `lib/api-spec/openapi.yaml` documents all endpoints

### For Frontend Development
1. Entry point: `artifacts/neo-fmc/src/main.tsx`
2. Routes configured in `artifacts/neo-fmc/src/router/` (or App component)
3. API client auto-generated from OpenAPI spec
4. Shared types from `@workspace/api-zod`

### Testing
```bash
# Run tests (if configured)
pnpm test

# Run tests in watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Building for Production
```bash
# Build everything
pnpm build

# Build specific packages
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/neo-fmc run build
```

---

## 📚 Additional Resources

- **Drizzle ORM Docs:** https://orm.drizzle.team
- **Vite Guide:** https://vitejs.dev
- **React Query Docs:** https://tanstack.com/query
- **Express.js Docs:** https://expressjs.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Tailwind CSS:** https://tailwindcss.com
- **Radix UI:** https://www.radix-ui.com

---

## 💾 Backup & Cleanup

### Backup Database
```bash
pg_dump -U neo_fmc_user -d neo_fmc_db > backup.sql

# Restore from backup
psql -U neo_fmc_user -d neo_fmc_db < backup.sql
```

### Clean Up Docker Container
```bash
# Stop and remove PostgreSQL container
docker stop neo-fmc-postgres
docker rm neo-fmc-postgres

# Remove volume
docker volume rm postgres_data
```

### Clear Node Dependencies (Full Reset)
```bash
# Remove all node_modules
rm -rf node_modules artifacts/*/node_modules lib/*/node_modules

# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install
pnpm build
```

---

## 🎉 Success Indicators

Once fully deployed locally, you should be able to:

✅ Access the frontend at http://localhost:5173  
✅ See API calls succeeding in browser DevTools  
✅ Log in (if authentication is configured)  
✅ View data from the database  
✅ Make changes to code and see hot-reload (frontend)  
✅ Backend auto-restarts on file changes (if configured)  
✅ No console errors related to API/network  
✅ TypeScript compilation successful with no errors  

---

**Last Updated:** May 14, 2026  
**Maintained By:** Development Team

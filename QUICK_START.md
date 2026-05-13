# Quick Start Guide - NeoFMC Local Deployment

**⏱️ Estimated Time:** 15-30 minutes (depending on internet/machine speed)

---

## 🚀 One-Minute Overview

You have a **React + Express.js full-stack TypeScript project** with PostgreSQL. Here's the minimal path to get it running locally.

---

## 📋 Prerequisites Check

```bash
node --version      # Need 18+
pnpm --version      # Need 8+ (or npm install -g pnpm)
psql --version      # Need PostgreSQL 13+
```

If any are missing, install them first (see DEPLOYMENT_PLAN.md).

---

## ⚡ Fast Track (5 Steps)

### 1. Set Up PostgreSQL (5 min)

**Docker (easiest):**
```bash
docker run --name neo-fmc-postgres \
  -e POSTGRES_USER=neo_fmc_user \
  -e POSTGRES_PASSWORD=dev123456 \
  -e POSTGRES_DB=neo_fmc_db \
  -p 5432:5432 \
  -d postgres:15-alpine
```

**Or native PostgreSQL:** Run your installer, then:
```bash
createdb neo_fmc_db
createuser neo_fmc_user
psql -c "ALTER USER neo_fmc_user PASSWORD 'dev123456';"
```

### 2. Create `.env` Files (2 min)

**`D:\NeoFMC\.env`**
```env
DATABASE_URL=postgresql://neo_fmc_user:dev123456@localhost:5432/neo_fmc_db
API_PORT=3000
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3000
```

**`D:\NeoFMC\artifacts\api-server\.env`**
```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://neo_fmc_user:dev123456@localhost:5432/neo_fmc_db
JWT_SECRET=dev_secret_key_at_least_32_characters_long
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Install & Build (5-10 min)

```bash
cd D:\NeoFMC
pnpm install
pnpm build
```

### 4. Run Database Migrations (2 min)

```bash
cd artifacts/api-server
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

### 5. Start Servers in Two Terminals (1 min)

**Terminal 1 - Backend:**
```bash
cd D:\NeoFMC/artifacts/api-server
pnpm dev
```
✅ Should see: `Server running on http://0.0.0.0:3000`

**Terminal 2 - Frontend:**
```bash
cd D:\NeoFMC/artifacts/neo-fmc
pnpm dev
```
✅ Should see: `VITE v7.3.0 ready in XXX ms` and `http://localhost:5173`

---

## 🎉 Open Browser

Go to **http://localhost:5173**

✅ **Success if:**
- Page loads without errors
- Network tab shows API calls to http://localhost:3000
- No red errors in browser console

---

## 🔥 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| `pnpm: command not found` | `npm install -g pnpm` |
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running. Start it or use Docker. |
| Port 3000/5173 already in use | Change ports in config or kill process using that port |
| `MODULE_NOT_FOUND` errors | Run `pnpm install` again, then `pnpm build` |
| Database connection fails | Check DATABASE_URL in `.env` — user/password/database name must exist |

---

## 📂 Project Layout

```
D:\NeoFMC/
├── artifacts/
│   ├── api-server/        ← Backend (Express, port 3000)
│   └── neo-fmc/           ← Frontend (React, port 5173)
├── lib/
│   ├── db/                ← Database schemas & ORM
│   ├── api-zod/           ← Validation schemas
│   ├── api-client-react/  ← Auto-generated API client
│   └── api-spec/          ← OpenAPI specification
├── .env                   ← Root config
└── package.json
```

---

## 🔧 Development Tips

### Hot Reload
- **Frontend:** Changes auto-reload in browser (Vite)
- **Backend:** Restarts on file changes (tsx --watch)

### Database Changes
After modifying schemas in `lib/db/src/schema/`:
```bash
cd artifacts/api-server
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

### Add Dependencies
```bash
cd artifacts/api-server  # or neo-fmc for frontend
pnpm add package-name
```

### View API Spec
```bash
cat lib/api-spec/openapi.yaml
```

---

## 📞 Need More Details?

See **`DEPLOYMENT_PLAN.md`** for:
- Complete setup instructions
- Security configuration
- Production build steps
- Troubleshooting guide
- Architecture details

---

## ✅ Checklist

- [ ] PostgreSQL installed and running
- [ ] `.env` files created in root and `artifacts/api-server/`
- [ ] `pnpm install` completed
- [ ] `pnpm build` successful
- [ ] Database migrations ran
- [ ] Backend server running on port 3000
- [ ] Frontend server running on port 5173
- [ ] Browser loads http://localhost:5173 without errors

---

**🎊 You're ready to develop locally!**

Next: Check out the code structure in `artifacts/api-server/src/` and `artifacts/neo-fmc/src/`

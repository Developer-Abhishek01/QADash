# QADash - Project Use Karne Ka Pura Tarika (Hinglish Guide)

> **Version:** 1.0.0 | **Platform:** Enterprise AI-Driven Testing Platform

---

## Table of Contents
1. [Yeh Project Kya Hai?](#1-yeh-project-kya-hai)
2. [Project Structure Samjhiye](#2-project-structure-samjhiye)
3. [Local Machine Pe Chalane Ke Liye Kya Lgega (Prerequisites)](#3-local-machine-pe-chalane-ke-liye-kya-lgega-prerequisites)
4. [GitHub Se Pull Lene Ke Baad Kya Karein (Fresh Setup)](#4-github-se-pull-lene-ke-baad-kya-karein-fresh-setup)
5. [Project Ko Kaise Run Karein](#5-project-ko-kaise-run-karein)
6. [Docker Ke Saath Chalana](#6-docker-ke-saath-chalana)
7. [Har Module Ka Use (Features)](#7-har-module-ka-use-features)
8. [API Endpoints kaise use karein](#8-api-endpoints-kaise-use-karein)
9. [Naye Tests Kaise Likhein](#9-naye-tests-kaise-likhein)
10. [Troubleshooting (Aam Problems)](#10-troubleshooting-aam-problems)

---

## 1. Yeh Project Kya Hai?

**QADash** ek **Enterprise QA Testing Dashboard** hai jo AI ka use karta hai. Isme aap:

- **Automated Tests** run kar sakte ho (UI, API, Performance, Security, Accessibility)
- **AI-powered analysis** le sakte ho (self-healing locators, test generation, predictions)
- **Real-time** execution dekh sakte ho via WebSocket
- **Reports & Analytics** generate kar sakte ho
- **Bugs track** kar sakte ho
- **Scheduler** setup kar sakte ho (cron-based)

---

## 2. Project Structure Samjhiye

```
QADash/
├── apps/                          # 4 main applications
│   ├── frontend/                  # Next.js 14 (Port 3000)
│   │   └── src/app/               # Dashboard pages
│   ├── backend/                   # NestJS API (Port 3001)
│   │   └── src/modules/           # 27 modules (auth, executions, ai, etc.)
│   ├── ai-engine/                 # Python FastAPI (Port 3002)
│   │   └── src/api/               # AI endpoints
│   └── automation/                # Playwright workers
│       └── src/tests/             # E2E test files
├── packages/                      # Shared libraries
│   ├── ui/                        # Common UI components
│   ├── utils/                     # Utility functions
│   ├── types/                     # TypeScript types
│   ├── config/                    # Shared config
│   └── logger/                    # Logging
├── docker/                        # Docker configs
├── k8s/                           # Kubernetes manifests
├── .github/workflows/             # CI/CD pipelines
├── docker-compose.yml             # All services
├── turbo.json                     # Turborepo config
├── package.json                   # Monorepo root
└── start.ps1 / run.bat            # One-click launchers
```

---

## 3. Local Machine Pe Chalane Ke Liye Kya Lgega (Prerequisites)

### Pehli Baar Setup Kar Rahe Ho To Ye Install Karna Hoga:

| # | Chiz | Version | Kyo Zaroori Hai? |
|---|------|---------|------------------|
| 1 | **Node.js** | v20+ | Backend (NestJS) aur Frontend (Next.js) dono ispe chalte hain |
| 2 | **npm** | v10+ (Node ke saath aata hai) | Dependencies install karne ke liye |
| 3 | **Python** | 3.11+ | AI Engine (FastAPI) ke liye |
| 4 | **Docker Desktop** | Latest | PostgreSQL, Redis, MinIO vagairah Docker mein chalten hain |
| 5 | **Git** | Latest | GitHub se code pull/push karne ke liye |
| 6 | **VS Code** (optional) | Latest | Code edit karne ke liye |

### Windows Pe Install Kaise Karein:

```powershell
# 1. Node.js Install (v20 LTS)
# Download from: https://nodejs.org/ (v20 LTS wala lo)

# Check karo:
node --version   # v20.x.x hona chahiye
npm --version    # v10.x.x hona chahiye

# 2. Python Install
# Download from: https://www.python.org/downloads/ (3.11+)
# Install karte time "Add Python to PATH" check karna mat bhoolna

python --version  # 3.11.x hona chahiye

# 3. Docker Desktop Install
# Download from: https://www.docker.com/products/docker-desktop/
# Install karo aur Docker Desktop ko start karo

docker --version

# 4. Git Install
# Download from: https://git-scm.com/downloads/win
```

---

## 4. GitHub Se Pull Lene Ke Baad Kya Karein (Fresh Setup)

Jab aap kisi **doosre laptop** pe jaake GitHub se `git pull` karein (ya `git clone`), to ye steps follow karo:

### Step 1: Repository Clone Karo

```bash
git clone <repo-url>
cd QADash
```

### Step 2: Node.js Dependencies Install Karo (Sabse Pehle)

```bash
# Isse saare apps (frontend, backend, automation) aur packages ki dependencies install ho jaayengi
npm install

# Ya turbo ke saath (recommended):
npx turbo install
```

**Kya Install Hoga?**
- `node_modules/` har app aur package mein
- Root `node_modules/` (hoisted dependencies)
- TypeScript definitions
- Playwright browsers (automation wala)

### Step 3: Python Dependencies Install Karo (AI Engine)

```bash
# AI Engine ke folder mein jao
cd apps/ai-engine

# Virtual environment banao (recommended)
python -m venv venv

# Virtual environment activate karo (Windows)
venv\Scripts\activate

# YA (PowerShell me agar error aaye to):
.\venv\Scripts\Activate.ps1

# Requirements install karo
pip install -r requirements.txt

# Wapas root pe aao
cd ../../
```

### Step 4: Docker Services Start Karo (Database + Redis)

```bash
# Docker Desktop chal raha hai na? Check karo!
# Ek terminal mein ye chalao:
docker-compose up -d postgres redis
```

Isse ye services start hongi:
| Service | Port | Kaam |
|---------|------|------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Queue + Cache |

### Step 5: Environment Variables Set Karo

```bash
# .env file banao (agar nahi hai to)
copy .env.example .env

# Ya PowerShell mein:
Copy-Item .env.example .env
```

**Phir `.env` file kholo aur ye badlo:**
```env
# Database (agar Docker mein PostgreSQL chal raha hai to ye default kaam karega)
DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/qadash?schema=public

# JWT Secret (change karo - kuch bhi random likh do)
JWT_SECRET=apni-marzi-ka-random-string-daalo

# AI API Key (agar OpenAI use karna hai to, warna dummy bhi chalega)
OPENAI_API_KEY=sk-your-key-here

# AI Engine
AI_ENGINE_URL=http://localhost:3002
```

### Step 6: Database Migrate Karo (Prisma)

```bash
# Backend folder mein jao
cd apps/backend

# Prisma client generate karo
npx prisma generate

# Migrations apply karo
npx prisma migrate dev

# Naya database hai to seed data daalo (admin user banega)
npx prisma db seed

# Ya seed manually:
npm run prisma:seed

# Wapas root pe aao
cd ../../
```

### Step 7: Playwright Browsers Install Karo (Automation)

```bash
# Automation folder mein jao
cd apps/automation

# Browser binaries install karo (chromium, firefox, webkit)
npx playwright install --with-deps

# Sirf chromium chahiye to:
npx playwright install chromium

# Wapas root pe aao
cd ../../
```

### Step 8: Build Karo (TypeScript Compile)

```bash
# Root se:
npm run build

# Ya sirf backend:
npx turbo run build --filter=@qadash/backend

# Ya sirf frontend:
npx turbo run build --filter=@qadash/frontend
```

---

## 5. Project Ko Kaise Run Karein

### Option 1: One-Click Startup (Windows - Recommended)

```bash
# Double-click karo ya command line se:
run.bat

# Ya PowerShell:
.\start.ps1
```

### Option 2: Dev Mode (Development ke liye)

```bash
# Sab kuch ek saath (frontend + backend + ai-engine):
npm run dev

# Ya individual:
npx turbo run dev --filter=@qadash/frontend    # Sirf frontend (Port 3000)
npx turbo run dev --filter=@qadash/backend     # Sirf backend (Port 3001)
```

### Option 3: Individual Apps

**Backend (NestJS):**
```bash
cd apps/backend
npm run dev
# API available at: http://localhost:3001/api/v1
# Swagger docs: http://localhost:3001/api/docs
```

**Frontend (Next.js):**
```bash
cd apps/frontend
npm run dev
# UI available at: http://localhost:3000
```

**AI Engine (FastAPI):**
```bash
cd apps/ai-engine
# Pehle virtual environment activate karo (agar banaya hai to)
venv\Scripts\activate
# Ya:
.\venv\Scripts\Activate.ps1

# Phir run karo:
python -m uvicorn src.main:app --reload --port 3002
# AI API at: http://localhost:3002
# Docs: http://localhost:3002/docs
```

**Automation (Playwright Workers):**
```bash
cd apps/automation
npm run dev
```

---

## 6. Docker Ke Saath Chalana

### Full Stack Docker Mein:

```bash
# Saare services start karo
docker-compose up -d

# Saari services stopping
docker-compose down

# Sirf specific services
docker-compose up -d postgres redis backend frontend
```

### Docker Services Ka Map:

| Service | Docker Name | Port | Purpose |
|---------|-------------|------|---------|
| Frontend | qadash-frontend | 3000 | Next.js UI |
| Backend | qadash-backend | 3001 | NestJS API |
| AI Engine | qadash-ai-engine | 3002 | FastAPI |
| PostgreSQL | qadash-postgres | 5432 | Main DB |
| Redis | qadash-redis | 6379 | Queue + Cache |
| MinIO | qadash-minio | 9000 | File Storage |
| Elasticsearch | qadash-es | 9200 | Logs/Search |
| Prometheus | qadash-prometheus | 9090 | Metrics |
| Grafana | qadash-grafana | 3003 | Monitoring UI |
| ZAP | qadash-zap | 8080 | Security Scanning |
| K6 | qadash-k6 | - | Performance Testing |

---

## 7. Har Module Ka Use (Features)

### 7.1 Dashboard
**URL:** `http://localhost:3000/dashboard`
- Saare executions ka overview
- Pass/fail ratio
- Recent activity
- AI insights

### 7.2 Test Executions
**URL:** `http://localhost:3000/executions`
- Naye tests run karo
- Real-time progress dekho (WebSocket)
- Results dekhlo (passed/failed/skipped)
- Screenshots aur videos dekho

### 7.3 Reports
**URL:** `http://localhost:3000/reports`
- Test results ka PDF/Excel export
- Custom report templates
- Historical comparison

### 7.4 AI Insights
**URL:** `http://localhost:3000/ai-insights`
- **Self-healing:** Flaky tests ko auto-fix karta hai
- **Test Generation:** Natural language se tests banao
- **Predictions:** Bataega konsa test fail hone wala hai
- **Analysis:** Failures ka root cause batayega

### 7.5 Bug Management
**URL:** `http://localhost:3000/bugs`
- Bugs create karo (auto ya manually)
- Severity assign karo
- Lifecycle track karo (open → in_progress → resolved)

### 7.6 Security Testing
**URL:** `http://localhost:3000/security`
- ZAP ke saath security scanning
- Vulnerability reports
- OWASP Top 10 checks

### 7.7 Performance Testing
**URL:** `http://localhost:3000/performance`
- K6 ke saath load testing
- Performance metrics
- Baseline comparison

### 7.8 Accessibility Testing
**URL:** `http://localhost:3000/accessibility`
- Axe Core se WCAG compliance
- Accessibility reports

### 7.9 Scheduler
**URL:** `http://localhost:3000/scheduler`
- Cron-based test scheduling
- Recurring executions
- Nightly builds

### 7.10 Monitoring
**URL:** `http://localhost:3000/monitoring`
- Service health
- Prometheus + Grafana metrics

---

## 8. API Endpoints Kaise Use Karein

### Postman / cURL se test kar sakte ho:

```bash
# 1. Login karo (pehle admin user banao)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"YourStr0ng!AdminPass"}'

# Response mein token milega, use karo aage:

# 2. Test execution create karo
curl -X POST http://localhost:3001/api/v1/executions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Test",
    "projectId": "<project-id>",
    "testIds": ["<test-id>"]
  }'

# 3. Service health check
curl http://localhost:3001/health

# 4. AI Analysis
curl -X POST http://localhost:3001/api/v1/ai/analyze \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"execution","data":{"executionId":"<id>"}}'
```

---

## 9. Naye Tests Kaise Likhein

### Playwright Test (E2E):
`apps/automation/src/tests/` mein nayi file banao:

```typescript
// example.test.ts
import { test, expect } from '@playwright/test';

test('homepage ka title sahi hai', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/QADash/);
});
```

### Test Run Karo:
```bash
cd apps/automation
npm run test                    # Headless (background)
npm run test:headed             # Browser dikhega
npm run test:ui                 # Playwright UI mode
```

---

## 10. Troubleshooting (Aam Problems)

### ❌ "Port already in use" error
```bash
# Konsa process port use kar raha hai?
netstat -ano | findstr ":3000"

# Us process ko maro:
taskkill /F /PID <PID>
```

### ❌ "Cannot find module @qadash/logger"
```bash
# Root se npm install karo
npm install
npx turbo run build
```

### ❌ "Database connection refused"
```bash
# Docker mein PostgreSQL chal raha hai?
docker ps | findstr postgres

# Nahi to start karo:
docker-compose up -d postgres
```

### ❌ "PrismaClientInitializationError"
```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev
```

### ❌ "Python not found" (AI Engine)
```bash
# Python install hai? Check karo:
python --version

# Virtual environment activate karna bhool gaye?
cd apps/ai-engine
venv\Scripts\activate
pip install -r requirements.txt
```

### ❌ npm install fail ho raha hai
```bash
# npm cache clear karo
npm cache clean --force

# node_modules delete karo
Remove-Item -Recurse -Force node_modules
Get-ChildItem -Recurse -Directory -Filter node_modules | Remove-Item -Recurse -Force

# Phir se install karo
npm install
```

### ❌ Git push mein files chhoot gayi
```bash
# .gitignore check karo - .env file push nahi hoti
# .env.example push hoti hai, usse copy karna dusre laptop par

# Ensure karo ye files .gitignore mein nahi hain:
# - .env.example (ye rahna chahiye)
# - dist/ (build kar lenge)
# - node_modules/ (npm install kar lenge)
```

### 🔄 Clean Restart Kaise Karein
```bash
# Puri tarah se clean restart
run.bat --clean

# Docker ka data bhi hatana ho to:
docker-compose down -v
docker-compose up -d
```

---

## Quick Reference Card (Ek Nazar Mein)

```
┌──────────────────────────────────────────────────────────────┐
│                    FRESH SETUP CHEAT SHEET                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  git clone <url>                                             │
│  cd QADash                                                   │
│  npm install                    # Node deps                   │
│  cd apps/ai-engine                                            │
│  python -m venv venv                                         │
│  venv\Scripts\activate                                       │
│  pip install -r requirements.txt  # Python deps              │
│  cd ../..                                                     │
│  docker-compose up -d postgres redis  # DB + Redis           │
│  copy .env.example .env          # Env setup                  │
│  cd apps/backend                                              │
│  npx prisma generate                                         │
│  npx prisma migrate dev                                      │
│  npx prisma db seed             # Admin user create           │
│  cd ../..                                                     │
│  cd apps/automation                                           │
│  npx playwright install chromium  # Browser binary            │
│  cd ../..                                                     │
│  npm run dev                    # Start all apps              │
│                                                              │
│  🎉 Dashboard open: http://localhost:3000                    │
│  📚 API Docs: http://localhost:3001/api/docs                  │
│  🤖 AI Docs: http://localhost:3002/docs                      │
└──────────────────────────────────────────────────────────────┘
```

---

> **Tip:** Project push karne se pehle `node_modules/`, `dist/`, `.next/`, `.env`, `venv/` ko `.gitignore` mein daalna mat bhoolo — ye files GitHub pe nahi jaani chahiye!

> **Koi problem?** `run.bat --logs` se logs check karo ya `run.bat --clean` se clean restart karo.

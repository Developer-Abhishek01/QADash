# QADash - Enterprise AI-Driven Testing Platform

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND                                              │
│                                    (Next.js 14)                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Dashboard  │ │ Executions  │ │ Reports     │ │ Bugs        │ │ Analytics   │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Orchestr.  │ │ AI Insights  │ │ Security    │ │ Performance│ │ Accessib.   │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                    WebSocket + REST
                                           │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND                                               │
│                                    (NestJS + BullMQ)                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Orchestrat.│ │ AI Module   │ │ Queue       │ │ Executions │ │ Reports     │        │
│  │ - Queue    │ │ - Integrat. │ │ - BullMQ    │ │ - RealTime │ │ - Analytics │        │
│  │ - EventHub │ │ - Service   │ │ - Redis     │ │ - WebSocket│ │ - Export    │        │
│  │ - Coord.   │ │ - Fallback  │ │ - Priority  │ │ - History  │ │ - Templates │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Bugs        │ │ Security    │ │ Performance │ │ Accessib.   │ │ Monitoring  │        │
│  │ - Lifecycle │ │ - ZAP Scan  │ │ - K6 Load   │ │ - Axe Core  │ │ - Prometheus│        │
│  │ - Tracking  │ │ - Vuln DB   │ │ - Metrics   │ │ - WCAG      │ │ - Grafana   │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
             │                    │                    │
      ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
      │   AI ENGINE  │      │  AUTOMATION │      │   STORAGE    │
      │   (FastAPI)  │      │  (Playwright)│      │ PostgreSQL   │
      │  - SelfHeal  │      │  - Workers  │      │ Redis        │
      │  - NLP       │      │  - Reports  │      │ MinIO        │
      │  - Locator   │      │  - Fixtures │      │ Elasticsearch│
      │  - Generator │      └─────────────┘      └─────────────┘
      └──────────────┘
```

## Module Integration

### 1. Orchestration Module (Central Hub)

**Location:** `apps/backend/src/modules/orchestration/`

**Components:**
- `orchestration.service.ts` - Main orchestration logic
- `orchestration.controller.ts` - REST API endpoints
- `services/queue.service.ts` - BullMQ job queue
- `services/event-hub.service.ts` - WebSocket event broadcasting
- `services/job-coordinator.service.ts` - Job dependency management
- `services/service-registry.service.ts` - Service health tracking

**Features:**
- Submit jobs (test, security, performance, accessibility, ai-analysis)
- Batch job submission with dependencies
- Real-time job status updates via WebSocket
- Service health monitoring
- Automatic failover

### 2. AI Integration

**Location:** `apps/backend/src/modules/ai/ai-integration.service.ts`

**Features:**
- Direct integration with AI Engine (FastAPI)
- Fallback to local analysis when AI unavailable
- Self-healing trigger
- Test generation
- Execution predictions

### 3. Real-time Execution

**Location:** `apps/frontend/src/hooks/useSocket.ts`

**Features:**
- WebSocket connection management
- Execution updates
- Job progress tracking
- Alert notifications

### 4. CI/CD Pipeline

**Location:** `.github/workflows/`

**Workflows:**
- `pr-validation.yml` - PR checks (lint, test, build)
- `release.yml` - Release automation
- `docker-deploy.yml` - Kubernetes deployment
- `regression-tests.yml` - Full test suite
- `smoke-tests.yml` - Quick health checks

### 5. Docker Infrastructure

**Location:** `docker-compose.yml`

**Services:**
- Frontend (Next.js)
- Backend (NestJS)
- PostgreSQL
- Redis
- AI Engine (FastAPI)
- Playwright Workers
- MinIO (S3 Storage)
- Elasticsearch + Kibana
- Prometheus + Grafana
- ZAP (Security)
- K6 (Performance)
- Axe Core (Accessibility)
- Nginx (Reverse Proxy)

## API Endpoints

### Orchestration
```
POST   /api/v1/orchestration/jobs         - Submit job
POST   /api/v1/orchestration/jobs/batch   - Submit batch
GET    /api/v1/orchestration/jobs/:id     - Get job status
DELETE /api/v1/orchestration/jobs/:id     - Cancel job
POST   /api/v1/orchestration/execute/:id  - Full execution
GET    /api/v1/orchestration/services/health - Service health
```

### AI Integration
```
POST   /api/v1/ai/analyze    - Analyze with AI
POST   /api/v1/ai/generate   - Generate tests
GET    /api/v1/ai/health     - AI service health
```

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://...

# Queue
REDIS_URL=redis://...

# AI Engine
AI_ENGINE_URL=http://localhost:3002

# Security
JWT_SECRET=...
JWT_EXPIRES_IN=7d
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Docker compose
docker-compose up -d
```

## Module Status

| Module | Status | Frontend | Backend | Infrastructure |
|--------|--------|----------|---------|----------------|
| Frontend (Next.js) | ✅ Active | /dashboard | - | docker-compose |
| Backend (NestJS) | ✅ Active | - | /api | docker-compose |
| AI Engine (FastAPI) | ✅ Active | /ai-insights | /ai | docker-compose |
| Automation (Playwright) | ✅ Active | /executions | /executions | docker-compose |
| Orchestration | ✅ NEW | /orchestration | /orchestration | BullMQ + Redis |
| Queue System | ✅ Active | - | /queue | BullMQ |
| Real-time Events | ✅ Active | useSocket hook | /gateway (WebSocket) | Socket.io |
| Reports | ✅ Active | /reports | /reports | MinIO Storage |
| Analytics | ✅ Active | /analytics | /analytics | Elasticsearch |
| Bug Management | ✅ Active | /bugs | /bugs | PostgreSQL |
| Security (ZAP) | ✅ Active | /security | /security | docker-compose |
| Performance (K6) | ✅ Active | /performance | /performance | docker-compose |
| Accessibility (Axe) | ✅ Active | /accessibility | /accessibility | docker-compose |
| CI/CD | ✅ Active | - | - | .github/workflows |
| Monitoring | ✅ Active | /monitoring | /monitoring | Prometheus + Grafana |
| Scheduler | ✅ Active | /scheduler | /scheduler | BullMQ |
| Environments | ✅ Active | /environments | /environments | PostgreSQL |
| Notifications | ✅ Active | /notifications | /notifications | Redis Pub/Sub |
| Docker | ✅ Active | - | - | docker-compose.yml |
| Kubernetes | ✅ Active | - | - | k8s/ |

## Quick Start Commands

```bash
# Install dependencies
cd QADash && pnpm install

# Development mode (all services)
pnpm dev
# OR with Docker
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production mode
docker-compose up -d

# Run tests
pnpm test

# Build all apps
pnpm build

# Check service health
curl http://localhost:3001/health
```

## API Documentation

Backend API runs on: http://localhost:3001/api/v1/

Key endpoints:
- `GET /health` - Health check
- `POST /orchestration/jobs` - Submit orchestration job
- `GET /orchestration/services/health` - Service health status
- `POST /ai/analyze` - AI analysis
- `POST /executions` - Run test execution
- `GET /reports` - Get reports
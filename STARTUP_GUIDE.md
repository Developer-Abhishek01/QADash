# QADash Enterprise - One-Click Startup Guide

## Quick Start

### Windows (Double-Click to Start)
```bash
run.bat
```

### Alternative (PowerShell)
```powershell
.\start.ps1
```

---

## Startup Modes

| Mode | Command | Description |
|------|---------|-------------|
| Full | `run.bat` | Complete platform with all validations |
| Quick | `run.bat --quick` | Skip validation, faster startup |
| Docker | `run.bat --docker-only` | Start Docker services only |
| Dev | `run.bat --dev` | Development mode with hot-reload |
| Production | `run.bat --production` | Production-optimized startup |

---

## Features

### ✅ Automated Checks
- Node.js installation
- PNPM/NPM package manager
- Python installation
- Docker & Docker Compose
- Port availability (3000, 3001, 3002, 5432, 6379, 9000, 9200)
- Environment variables
- Project structure integrity

### ✅ Services Started
| Service | Port | URL |
|---------|------|-----|
| Frontend (Next.js) | 3000 | http://localhost:3000 |
| Backend (NestJS) | 3001 | http://localhost:3001 |
| AI Engine (FastAPI) | 3002 | http://localhost:3002 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MinIO | 9000 | http://localhost:9000 |
| Elasticsearch | 9200 | http://localhost:9200 |

### ✅ Monitoring Dashboard
- Real-time service health
- System resource usage (CPU, Memory, Disk)
- Quick actions (open dashboard, view logs, restart)
- Automatic recovery alerts

### ✅ Recovery Features
- Automatic health checks every 30 seconds
- Service failure detection
- Auto-restart for critical services
- Alert notifications via webhook

---

## Commands

### Start Platform
```bash
run.bat                    # Full startup
run.bat --quick           # Quick mode
run.bat --dev             # Development mode
```

### Control Platform
```bash
run.bat --status          # Show platform status
run.bat --logs            # View recent logs
run.bat --restart         # Restart all services
run.bat --stop            # Stop all services
run.bat --clean           # Clean all data and restart
```

### PowerShell Commands
```powershell
.\start.ps1               # Full startup
.\start.ps1 -Mode quick   # Quick mode
.\start.ps1 -Stop         # Stop services
.\start.ps1 -Status       # Show status
.\start.ps1 -Clean        # Clean everything
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr ":3000"

# Kill the process
taskkill /F /PID <PID>
```

### Clean Restart
```bash
run.bat --clean
```

### Check Logs
```bash
# View recent logs
run.bat --logs

# Or open logs folder
explorer logs
```

---

## Environment Setup

Create `.env` file if not exists:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/qadash
REDIS_URL=redis://:password@localhost:6379
JWT_SECRET=your-secret-key
```

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | v18.0.0 | v20.0.0+ |
| Python | 3.9 | 3.11+ |
| Docker | 24.0 | Latest |
| Memory | 4 GB | 8 GB+ |
| Disk Space | 10 GB | 20 GB+ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        run.bat                               │
│                   (One-Click Launcher)                       │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ Validation│       │  Install │       │  Start   │
    │  Checks  │──────>│  Deps    │──────>│ Services │
    └──────────┘       └──────────┘       └──────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
            │  Frontend   │           │   Backend  │           │  AI Engine │
            │  (Next.js)  │           │  (NestJS)  │           │  (FastAPI) │
            │  Port 3000 │           │  Port 3001│           │  Port 3002 │
            └─────────────┘           └─────────────┘           └─────────────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                          ▼                   ▼                   ▼
                    ┌──────────┐       ┌──────────┐       ┌──────────┐
                    │PostgreSQL│     │  Redis  │       │  MinIO   │
                    │  Port 5432│     │  Port 6379│      │  Port 9000│
                    └──────────┘     └──────────┘       └──────────┘
```

---

## Health Monitoring

The platform includes automatic health monitoring:

### Automatic Checks
- Service availability (ports)
- Response latency
- Resource usage (CPU, Memory, Disk)
- Failure detection and recovery

### Monitoring Dashboard
Access via the console menu:
```
┌────────────────────────────────────────┐
│  Services:                             │
│  [OK] Frontend   - Port 3000          │
│  [OK] Backend    - Port 3001           │
│  [OK] AI Engine  - Port 3002           │
│                                        │
│  Quick Actions:                        │
│  [1] Open Dashboard                    │
│  [2] API Documentation                 │
│  [3] View Logs                         │
│  [4] Health Check                      │
│  [5] Stop Platform                     │
│  [6] Restart Services                  │
└────────────────────────────────────────┘
```

---

## Support

For issues or questions:
1. Check logs: `run.bat --logs`
2. Run clean: `run.bat --clean`
3. Verify environment: ensure all prerequisites installed
4. Check port conflicts: `netstat -ano | findstr "3000 3001 3002"`

---

**QADash Enterprise - AI-Driven Testing Platform**
**Version 1.0.0**
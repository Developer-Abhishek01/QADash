#!/bin/bash
# QA Dashboard - Health Check Script
# Linux/macOS Version

set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

VERBOSE=false
WAIT=false
TIMEOUT=30

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose) VERBOSE=true; shift ;;
        -w|--wait) WAIT=true; shift ;;
        -t|--timeout) TIMEOUT=$2; shift 2 ;;
        *) shift ;;
    esac
done

echo -e "${CYAN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║                   QA Dashboard Health Check                ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

all_passed=true

# ========================================
# Node.js Environment
# ========================================
echo -e "${CYAN}[1/8] Checking Node.js...${NC}"

if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not installed${NC}"
    all_passed=false
fi

if command -v pnpm >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PNPM: $(pnpm --version)${NC}"
else
    echo -e "${RED}❌ PNPM not installed${NC}"
    all_passed=false
fi

if command -v npm >/dev/null 2>&1; then
    echo -e "${GREEN}✅ NPM: $(npm --version)${NC}"
else
    echo -e "${RED}❌ NPM not installed${NC}"
    all_passed=false
fi

# ========================================
# Docker Services
# ========================================
echo -e "${CYAN}`n[2/8] Checking Docker...${NC}"

if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"

    if docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker daemon: Running${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker daemon: Not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available${NC}"
fi

# PostgreSQL
echo -e "${CYAN}`n[3/8] Checking PostgreSQL...${NC}"

if docker ps --filter "name=postgres" --format "{{.Names}}" 2>/dev/null | grep -q .; then
    container=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)
    echo -e "${GREEN}✅ PostgreSQL container: Running ($container)${NC}"

    if docker exec $container pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL: Ready to accept connections${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL: Not ready yet${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL container: Not running${NC}"
fi

# Redis
echo -e "${CYAN}`n[4/8] Checking Redis...${NC}"

if docker ps --filter "name=redis" --format "{{.Names}}" 2>/dev/null | grep -q .; then
    container=$(docker ps --filter "name=redis" --format "{{.Names}}" | head -1)
    echo -e "${GREEN}✅ Redis container: Running ($container)${NC}"

    if docker exec $container redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "${GREEN}✅ Redis: PONG${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis container: Not running${NC}"
fi

# ========================================
# Application Health
# ========================================
echo -e "${CYAN}`n[5/8] Checking Frontend...${NC}"

if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend (Next.js): Running on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend: Not responding${NC}"
fi

echo -e "${CYAN}`n[6/8] Checking Backend...${NC}"

if curl -sf http://localhost:3001 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend (NestJS): Running on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  Backend: Not responding${NC}"
fi

echo -e "${CYAN}`n[7/8] Checking AI Engine...${NC}"

if curl -sf http://localhost:3002/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AI Engine (FastAPI): Running on port 3002${NC}"
else
    echo -e "${YELLOW}⚠️  AI Engine: Not responding${NC}"
fi

# ========================================
# Network Ports
# ========================================
echo -e "${CYAN}`n[8/8] Checking Network Ports...${NC}"

check_port() {
    local port=$1
    local name=$2

    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✅ Port $port ($name): Open${NC}"
    else
        echo -e "${YELLOW}⚠️  Port $port ($name): Closed${NC}"
    fi
}

check_port 3000 "Frontend"
check_port 3001 "Backend API"
check_port 3002 "AI Engine"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

# ========================================
# Summary
# ========================================
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                      Summary${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

if $all_passed; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Some checks failed. See details above.${NC}"
fi

echo ""
echo -e "${YELLOW}Recommendations:${NC}"
echo -e "  - Run install.sh to install dependencies"
echo -e "  - Run start.sh to start services"
echo -e "  - Run troubleshoot.sh for help"
echo ""
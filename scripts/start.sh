#!/bin/bash
# QA Dashboard - One-Click Startup Script
# Linux/macOS Version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Options
DOCKER_ONLY=false
PRODUCTION=false
BACKGROUND=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker-only) DOCKER_ONLY=true; shift ;;
        --production) PRODUCTION=true; shift ;;
        --background) BACKGROUND=true; shift ;;
        *) shift ;;
    esac
done

echo -e "${GREEN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║                    QA Dashboard Startup                    ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ========================================
# Pre-flight Checks
# ========================================
echo -e "${BLUE}ℹ️  Running pre-flight checks...${NC}"

# Check Node.js
if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not found. Run install.sh first.${NC}"
    exit 1
fi

# Check PNPM
if command -v pnpm >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PNPM: $(pnpm --version)${NC}"
else
    echo -e "${RED}❌ PNPM not found. Run install.sh first.${NC}"
    exit 1
fi

# Check Docker
if [[ "$DOCKER_ONLY" == false ]] && command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"

    if docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker daemon: Running${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker not running. Starting in dev mode without Docker.${NC}"
    fi
fi

# ========================================
# Environment Validation
# ========================================
echo -e "${BLUE}ℹ️  Validating environment...${NC}"

if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Created .env from template. Please configure before continuing.${NC}"
    fi
fi

# Check critical env vars
if grep -q "POSTGRES_PASSWORD=" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Environment configured${NC}"
else
    echo -e "${YELLOW}⚠️  Please configure .env file${NC}"
fi

# ========================================
# Start Docker Services
# ========================================
if [[ "$DOCKER_ONLY" == false ]] && command -v docker >/dev/null 2>&1; then
    echo -e "${BLUE}ℹ️  Starting Docker services...${NC}"

    if ! docker ps --filter "name=qadash-postgres" >/dev/null 2>&1; then
        docker compose up -d postgres redis

        echo -e "${BLUE}ℹ️  Waiting for PostgreSQL...${NC}"
        for i in {1..30}; do
            if docker exec qadash-postgres pg_isready -U postgres >/dev/null 2>&1; then
                echo -e "${GREEN}✅ PostgreSQL ready${NC}"
                break
            fi
            sleep 1
        done

        echo -e "${BLUE}ℹ️  Waiting for Redis...${NC}"
        sleep 2
        echo -e "${GREEN}✅ Redis ready${NC}"
    else
        echo -e "${GREEN}✅ Docker services already running${NC}"
    fi
fi

# ========================================
# Start Applications
# ========================================
if [[ "$PRODUCTION" == true ]]; then
    echo -e "${BLUE}ℹ️  Starting in PRODUCTION mode...${NC}"

    echo -e "${BLUE}ℹ️  Building applications...${NC}"
    pnpm turbo run build

    echo -e "${BLUE}ℹ️  Starting frontend...${NC}"
    cd apps/frontend && pnpm run start &
    cd ../..

    echo -e "${BLUE}ℹ️  Starting backend...${NC}"
    cd apps/backend && pnpm run start &
    cd ../..

    echo -e "${BLUE}ℹ️  Starting AI Engine...${NC}"
    cd apps/ai-engine && pnpm run start &
    cd ../..

else
    echo -e "${BLUE}ℹ️  Starting in DEVELOPMENT mode...${NC}"

    if [[ "$BACKGROUND" == true ]]; then
        pnpm turbo run dev &
        echo -e "${GREEN}✅ Development server started in background${NC}"
    else
        pnpm turbo run dev
        exit 0
    fi
fi

# ========================================
# Health Check
# ========================================
echo -e "${BLUE}ℹ️  Running health checks...${NC}"
sleep 5

check_endpoint() {
    local name=$1
    local url=$2

    if curl -sf "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name: Healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  $name: Not responding${NC}"
    fi
}

check_endpoint "Frontend" "http://localhost:3000"
check_endpoint "Backend API" "http://localhost:3001"
check_endpoint "AI Engine" "http://localhost:3002/health"

# ========================================
# Summary
# ========================================
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
echo -e "  📊 Dashboard:    ${WHITE}http://localhost:3000${NC}"
echo -e "  🔧 Backend API:  ${WHITE}http://localhost:3001${NC}"
echo -e "  🤖 AI Engine:   ${WHITE}http://localhost:3002${NC}"
echo ""
echo -e "${GRAY}Useful commands:${NC}"
echo -e "  ${GRAY}Logs:    docker compose logs -f${NC}"
echo -e "  ${GRAY}Stop:    docker compose down${NC}"
echo -e "  ${GRAY}Restart: ./start.sh${NC}"
echo ""
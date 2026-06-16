#!/bin/bash
# QA Dashboard - Production Setup
# Linux/macOS Version

set -e

# Options
ENVIRONMENT="production"
SKIP_BUILD=false
SSL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env) ENVIRONMENT=$2; shift 2 ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --ssl) SSL=true; shift ;;
        *) shift ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║              QA Dashboard Production Setup                 ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ========================================
# Pre-requisites Check
# ========================================
echo -e "${BLUE}ℹ️  Checking pre-requisites...${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js is required. Install from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is required for production deployment${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"

if ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is required${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose: $(docker compose version)${NC}"

# ========================================
# Environment Configuration
# ========================================
echo -e "${BLUE}ℹ️  Configuring production environment: $ENVIRONMENT${NC}"

env_file=".env.$ENVIRONMENT"
if [[ ! -f "$env_file" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example "$env_file"
        echo -e "${YELLOW}⚠️  Created $env_file from template. Configure before continuing.${NC}"
        echo "Edit $env_file with production values:"
        echo "  - POSTGRES_PASSWORD (strong password)"
        echo "  - JWT_SECRET (generate strong key)"
        echo "  - REDIS_PASSWORD"
        read -p "Press Enter after configuring: "
    fi
fi

export NODE_ENV=$ENVIRONMENT
echo -e "${GREEN}✅ NODE_ENV=$ENVIRONMENT${NC}"

# ========================================
# Build
# ========================================
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${BLUE}ℹ️  Building applications...${NC}"
    pnpm turbo run build

    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build complete${NC}"
fi

# ========================================
# Docker Build
# ========================================
echo -e "${BLUE}ℹ️  Building Docker images...${NC}"

docker compose build

if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker images built${NC}"

# ========================================
# SSL Configuration (Optional)
# ========================================
if [[ "$SSL" == true ]]; then
    echo -e "${BLUE}ℹ️  Setting up SSL...${NC}"

    ssl_dir="docker/nginx/ssl"
    mkdir -p "$ssl_dir"

    echo -e "${YELLOW}⚠️  SSL certificates not provided. To enable HTTPS:${NC}"
    echo "  1. Place your certificate files in: docker/nginx/ssl/"
    echo "     - server.crt"
    echo "     - server.key"
    echo "  2. Update docker/nginx/conf.d/qadash.conf"
    echo "  3. Re-run this script"
fi

# ========================================
# Start Services
# ========================================
echo -e "${BLUE}ℹ️  Starting production services...${NC}"

docker compose up -d

echo -e "${GREEN}✅ Services started${NC}"

# ========================================
# Health Check
# ========================================
echo -e "${BLUE}ℹ️  Running health checks...${NC}"
sleep 10

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
check_endpoint "Backend" "http://localhost:3001"
check_endpoint "AI Engine" "http://localhost:3002/health"

# ========================================
# Summary
# ========================================
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Production deployment successful!${NC}"
echo ""
echo -e "${YELLOW}Services:${NC}"
echo -e "  📊 Frontend:  ${WHITE}http://localhost:3000${NC}"
echo -e "  🔧 Backend:   ${WHITE}http://localhost:3001${NC}"
echo -e "  🤖 AI Engine: ${WHITE}http://localhost:3002${NC}"
echo ""
echo -e "${GRAY}Useful commands:${NC}"
echo -e "  ${GRAY}View logs:    docker compose logs -f${NC}"
echo -e "  ${GRAY}Stop:        docker compose down${NC}"
echo -e "  ${GRAY}Restart:     docker compose restart${NC}"
echo ""
#!/bin/bash
# QA Dashboard - Troubleshooting Script
# Linux/macOS Version

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FIX=$1

# ========================================
# Auto-fix Functions
# ========================================

fix_node() {
    echo -e "${CYAN}Cleaning node_modules and reinstalling...${NC}"
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    pnpm install
    echo -e "${GREEN}Done${NC}"
}

fix_docker() {
    echo -e "${CYAN}Restarting Docker services...${NC}"
    docker compose down
    docker compose up -d
    echo -e "${GREEN}Docker services restarted${NC}"
}

fix_ports() {
    echo -e "${CYAN}Checking for port conflicts...${NC}"
    for port in 3000 3001 3002 5432 6379; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Port $port in use:${NC}"
            lsof -i :$port
        fi
    done
}

fix_build() {
    echo -e "${CYAN}Full clean and rebuild...${NC}"
    pnpm turbo run clean
    pnpm install
    pnpm turbo run build
    echo -e "${GREEN}Complete${NC}"
}

fix_all() {
    fix_docker
    fix_node
    fix_build
}

# ========================================
# Main Logic
# ========================================

if [[ -n "$FIX" ]]; then
    echo -e "${CYAN}Running auto-fix: $FIX${NC}"

    case "$FIX" in
        node) fix_node ;;
        docker) fix_docker ;;
        ports) fix_ports ;;
        build) fix_build ;;
        all) fix_all ;;
        *)
            echo -e "${RED}Unknown fix: $FIX${NC}"
            echo "Available fixes: node, docker, ports, build, all"
            exit 1
            ;;
    esac
    exit 0
fi

# Show banner
echo -e "${YELLOW}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║                  QA Dashboard Troubleshooting              ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${CYAN}Common Issues and Solutions:${NC}"
echo ""

# Issue 1: Node.js
echo -e "${YELLOW}[1] Node.js Issues${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - Command not found"
echo -e "     - Version error"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Install Node.js LTS from https://nodejs.org"
echo -e "     > Restart your terminal"
echo -e "     > Run: node --version to verify"
echo ""

# Issue 2: PNPM
echo -e "${YELLOW}[2] PNPM Issues${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - Command not found"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Run: npm install -g pnpm"
echo -e "     > Restart terminal"
echo ""

# Issue 3: Docker
echo -e "${YELLOW}[3] Docker Issues${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - Cannot connect to Docker"
echo -e "     - Docker daemon not running"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Start Docker Desktop / Docker daemon"
echo -e "     > Run: sudo systemctl start docker (Linux)"
echo -e "     > Wait 30 seconds for Docker to start"
echo ""

# Issue 4: PostgreSQL
echo -e "${YELLOW}[4] PostgreSQL Connection Issues${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - Connection refused"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Run: docker compose up -d postgres"
echo -e "     > Check logs: docker compose logs postgres"
echo ""

# Issue 5: Redis
echo -e "${YELLOW}[5] Redis Connection Issues${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - Redis connection refused"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Run: docker compose up -d redis"
echo -e "     > Check logs: docker compose logs redis"
echo ""

# Issue 6: Port Conflicts
echo -e "${YELLOW}[6] Port Already in Use${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - EADDRINUSE"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Find process: lsof -i :3000"
echo -e "     > Kill process: kill -9 <PID>"
echo -e "     > Or use different ports in .env"
echo ""

# Issue 7: Build Failures
echo -e "${YELLOW}[7] Build Failures${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - Build failed"
echo -e "     - Module not found"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Run: pnpm turbo run clean"
echo -e "     > Run: pnpm install"
echo -e "     > Run: pnpm turbo run build"
echo ""

# Issue 8: Permission
echo -e "${YELLOW}[8] Permission Denied${NC}"
echo -e "   ${GRAY}Symptoms:${NC}"
echo -e "     - EACCES"
echo -e "   ${CYAN}Solutions:${NC}"
echo -e "     > Run with sudo (not recommended)"
echo -e "     > Fix permissions: chmod -R 755 ."
echo ""

# Diagnostic commands
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Diagnostic Commands${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Run these commands to diagnose issues:${NC}"
echo ""
echo -e "  ${WHITE}Check Node.js:       node --version${NC}"
echo -e "  ${WHITE}Check PNPM:         pnpm --version${NC}"
echo -e "  ${WHITE}Check Docker:       docker --version${NC}"
echo -e "  ${WHITE}Docker logs:        docker compose logs --tail=50${NC}"
echo -e "  ${WHITE}Check ports:        lsof -i :3000 -i :3001 -i :5432${NC}"
echo -e "  ${WHITE}Health check:       ./health-check.sh${NC}"
echo ""

echo -e "${YELLOW}Auto-fix commands:${NC}"
echo ""
echo -e "  ${WHITE}./troubleshoot.sh docker       # Restart Docker${NC}"
echo -e "  ${WHITE}./troubleshoot.sh ports        # Check port conflicts${NC}"
echo -e "  ${WHITE}./troubleshoot.sh build        # Clean and rebuild${NC}"
echo -e "  ${WHITE}./troubleshoot.sh all          # Run all fixes${NC}"
echo ""

echo -e "${GRAY}For more help: Check README.md or open an issue on GitHub${NC}"
echo ""
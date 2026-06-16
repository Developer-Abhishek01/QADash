#!/bin/bash
# QA Dashboard - Automated Installation Script
# Linux/macOS Version
# Run as: chmod +x install.sh && ./install.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Options
SKIP_DOCKER=false
SKIP_NODE=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker) SKIP_DOCKER=true; shift ;;
        --skip-node) SKIP_NODE=true; shift ;;
        --force) FORCE=true; shift ;;
        *) shift ;;
    esac
done

# ========================================
# Banner
# ========================================
echo -e "${MAGENTA}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║           QA Dashboard Enterprise Platform                 ║
║              Automated Installation Script                 ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ========================================
# System Detection
# ========================================
echo -e "${BLUE}ℹ️  Detecting system...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    echo -e "${RED}❌ Unsupported operating system${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Detected: $OS${NC}"

# ========================================
# Check Command Exists
# ========================================
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ========================================
# Check Node.js
# ========================================
check_node() {
    if command_exists node; then
        echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Node.js not found${NC}"
        return 1
    fi
}

install_node() {
    echo -e "${BLUE}ℹ️  Installing Node.js...${NC}"

    if [[ "$OS" == "macos" ]]; then
        if command_exists brew; then
            brew install node@22
        else
            echo -e "${RED}❌ Homebrew not found. Install from https://brew.sh${NC}"
            exit 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    fi
}

if [[ "$SKIP_NODE" == false ]]; then
    if ! check_node; then
        install_node
        check_node
    fi
fi

# ========================================
# Check PNPM
# ========================================
check_pnpm() {
    if command_exists pnpm; then
        echo -e "${GREEN}✅ PNPM: $(pnpm --version)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  PNPM not found${NC}"
        return 1
    fi
}

install_pnpm() {
    echo -e "${BLUE}ℹ️  Installing PNPM...${NC}"
    npm install -g pnpm
}

if ! check_pnpm; then
    install_pnpm
    check_pnpm
fi

# ========================================
# Check Docker
# ========================================
check_docker() {
    if command_exists docker; then
        echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Docker not found${NC}"
        return 1
    fi
}

check_docker_compose() {
    if command_exists docker compose; then
        echo -e "${GREEN}✅ Docker Compose: $(docker compose version)${NC}"
    elif command_exists docker-compose; then
        echo -e "${GREEN}✅ Docker Compose: $(docker-compose --version)${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker Compose not found${NC}"
    fi
}

if [[ "$SKIP_DOCKER" == false ]]; then
    check_docker
    check_docker_compose
fi

# ========================================
# Check Git
# ========================================
if command_exists git; then
    echo -e "${GREEN}✅ Git: $(git --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Git not found${NC}"
fi

# ========================================
# Check Python (for AI Engine)
# ========================================
if command_exists python3; then
    echo -e "${GREEN}✅ Python: $(python3 --version)${NC}"
elif command_exists python; then
    echo -e "${GREEN}✅ Python: $(python --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Python not found (needed for AI Engine)${NC}"
fi

# ========================================
# Create Environment File
# ========================================
echo -e "${BLUE}ℹ️  Setting up environment...${NC}"

if [[ ! -f ".env" ]] || [[ "$FORCE" == true ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from template${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env already exists, skipping (use --force to overwrite)${NC}"
fi

# ========================================
# Install Dependencies
# ========================================
echo -e "${BLUE}ℹ️  Installing project dependencies...${NC}"
pnpm install

if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# ========================================
# Build Packages
# ========================================
echo -e "${BLUE}ℹ️  Building shared packages...${NC}"
pnpm turbo run build --filter=@qadash/*

if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"

# ========================================
# Install Playwright Browsers
# ========================================
echo -e "${BLUE}ℹ️  Installing Playwright browsers...${NC}"
cd apps/automation && pnpm playwright install --with-deps 2>/dev/null || true
cd ../..

# ========================================
# Summary
# ========================================
echo ""
echo -e "${CYANE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYANE}                    Installation Summary                     ${CYANE}"
echo -e "${CYANE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✅ PNPM: $(pnpm --version)${NC}"
if [[ "$SKIP_DOCKER" == false ]]; then
    echo -e "${GREEN}✅ Docker: Installed${NC}"
fi
echo -e "${GREEN}✅ Dependencies: Installed${NC}"
echo -e "${GREEN}✅ Build: Complete${NC}"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Configure .env file with your settings"
echo -e "  2. Run: ./start.sh"
echo -e "  3. Access dashboard at: http://localhost:3000"
echo ""

echo -e "${GRAY}For help: ./troubleshoot.sh${NC}"
echo ""
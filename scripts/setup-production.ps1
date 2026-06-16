# QA Dashboard - Production Setup
# Windows PowerShell Version

param(
    [string]$Environment = "production",
    [switch]$SkipBuild,
    [switch]$SSL
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Cyan { param($msg) Write-Host $msg -ForegroundColor Cyan }

Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║              QA Dashboard Production Setup                 ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

# ========================================
# Pre-requisites Check
# ========================================
Write-Info "Checking pre-requisites..."

# Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
} catch {
    Write-Fail "Node.js is required. Install from https://nodejs.org"
    exit 1
}

# Docker
try {
    $dockerVersion = docker --version
    Write-Success "Docker: $dockerVersion"
} catch {
    Write-Fail "Docker is required for production deployment"
    exit 1
}

# Docker Compose
try {
    $composeVersion = docker compose version
    Write-Success "Docker Compose: $composeVersion"
} catch {
    Write-Fail "Docker Compose is required"
    exit 1
}

# ========================================
# Environment Configuration
# ========================================
Write-Info "Configuring production environment: $Environment"

$envFile = ".env.$Environment"
if (-not (Test-Path $envFile)) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" $envFile
        Write-Warn "Created $envFile from template. Please configure before continuing."
        Write-Host "Edit $envFile with production values:" -ForegroundColor Yellow
        Write-Host "  - POSTGRES_PASSWORD (strong password)" -ForegroundColor White
        Write-Host "  - JWT_SECRET (generate strong key)" -ForegroundColor White
        Write-Host "  - REDIS_PASSWORD" -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter after configuring $envFile"
    }
}

# Set environment variables
$env:NODE_ENV = $Environment
Write-Success "NODE_ENV=$Environment"

# ========================================
# Build
# ========================================
if (-not $SkipBuild) {
    Write-Info "Building applications..."

    pnpm turbo run build

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Build failed"
        exit 1
    }
    Write-Success "Build complete"
}

# ========================================
# Docker Build
# ========================================
Write-Info "Building Docker images..."

docker compose build

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker build failed"
    exit 1
}
Write-Success "Docker images built"

# ========================================
# SSL Configuration (Optional)
# ========================================
if ($SSL) {
    Write-Info "Setting up SSL..."

    $sslDir = "docker/nginx/ssl"
    if (-not (Test-Path $sslDir)) {
        New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
    }

    Write-Warn "SSL certificates not provided. To enable HTTPS:"
    Write-Host "  1. Place your certificate files in: docker/nginx/ssl/" -ForegroundColor White
    Write-Host "     - server.crt" -ForegroundColor White
    Write-Host "     - server.key" -ForegroundColor White
    Write-Host "  2. Update docker/nginx/conf.d/qadash.conf" -ForegroundColor White
    Write-Host "  3. Re-run this script" -ForegroundColor White
}

# ========================================
# Start Services
# ========================================
Write-Info "Starting production services..."

docker compose up -d

Write-Success "Services started"

# ========================================
# Health Check
# ========================================
Write-Info "Running health checks..."
Start-Sleep -Seconds 10

$services = @(
    @{ Name = "Frontend"; Url = "http://localhost:3000" },
    @{ Name = "Backend"; Url = "http://localhost:3001" },
    @{ Name = "AI Engine"; Url = "http://localhost:3002/health" }
)

$allHealthy = $true
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "$($service.Name): Healthy"
        } else {
            Write-Warn "$($service.Name): Status $($response.StatusCode)"
            $allHealthy = $false
        }
    } catch {
        Write-Warn "$($service.Name): Not responding"
        $allHealthy = $false
    }
}

# ========================================
# Summary
# ========================================
Write-Host ""
Write-Cyan "═══════════════════════════════════════════════════════════"
Write-Cyan "                    Production Ready"
Write-Cyan "═══════════════════════════════════════════════════════════"
Write-Host ""

if ($allHealthy) {
    Write-Success "Production deployment successful!"
    Write-Host ""
    Write-Host "Services:" -ForegroundColor Yellow
    Write-Host "  📊 Frontend:  http://localhost:3000" -ForegroundColor White
    Write-Host "  🔧 Backend:   http://localhost:3001" -ForegroundColor White
    Write-Host "  🤖 AI Engine: http://localhost:3002" -ForegroundColor White
} else {
    Write-Warn "Some services may need attention"
}

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "  View logs:    docker compose logs -f" -Gray
Write-Host "  Stop:        docker compose down" -Gray
Write-Host "  Restart:     docker compose restart" -Gray
Write-Host ""
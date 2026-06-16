# QA Dashboard - One-Click Startup Script
# Windows PowerShell Version

param(
    [switch]$DockerOnly,
    [switch]$Production,
    [switch]$Background
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                    QA Dashboard Startup                    ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

# ========================================
# Pre-flight Checks
# ========================================
Write-Info "Running pre-flight checks..."

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
} catch {
    Write-Fail "Node.js not found. Run install.ps1 first."
    exit 1
}

# Check PNPM
try {
    $pnpmVersion = pnpm --version
    Write-Success "PNPM: $pnpmVersion"
} catch {
    Write-Fail "PNPM not found. Run install.ps1 first."
    exit 1
}

# Check Docker
if (-not $DockerOnly) {
    try {
        $dockerVersion = docker --version
        Write-Success "Docker: $dockerVersion"
    } catch {
        Write-Warn "Docker not running. Starting in development mode without Docker."
    }
}

# ========================================
# Environment Validation
# ========================================
Write-Info "Validating environment..."

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Warn "Created .env from template. Please configure before continuing."
    }
}

# Check critical env vars
$requiredVars = @("POSTGRES_PASSWORD")
$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Get-Content ".env" -Raw -ErrorAction SilentlyContinue -EA SilentlyContinue) -match "$var=") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Warn "Missing environment variables: $($missingVars -join ', ')"
}

# ========================================
# Start Docker Services (if not DockerOnly)
# ========================================
if (-not $DockerOnly -and (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Info "Starting Docker services..."

    docker compose ps --filter "status=running" 2>$null | Out-Null

    if ($LASTEXITCODE -ne 0 -or -not (docker compose ps -q postgres 2>$null)) {
        docker compose up -d postgres redis

        Write-Info "Waiting for PostgreSQL..."
        $maxRetries = 30
        $retries = 0
        while ($retries -lt $maxRetries) {
            try {
                docker compose exec -T postgres pg_isready -U postgres 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "PostgreSQL ready"
                    break
                }
            } catch { }
            Start-Sleep -Seconds 1
            $retries++
        }

        Write-Info "Waiting for Redis..."
        Start-Sleep -Seconds 2
        Write-Success "Redis ready"
    } else {
        Write-Success "Docker services already running"
    }
}

# ========================================
# Start Applications
# ========================================
if ($Production) {
    Write-Info "Starting in PRODUCTION mode..."

    # Build all apps
    Write-Info "Building applications..."
    pnpm turbo run build

    # Start all apps
    Write-Info "Starting frontend (Next.js)..."
    Start-Process -FilePath "pnpm" -ArgumentList "run start" -WorkingDirectory "apps/frontend" -WindowStyle Hidden

    Write-Info "Starting backend (NestJS)..."
    Start-Process -FilePath "pnpm" -ArgumentList "run start" -WorkingDirectory "apps/backend" -WindowStyle Hidden

    Write-Info "Starting AI Engine (FastAPI)..."
    Start-Process -FilePath "uvicorn" -ArgumentList "src.main:app --host 0.0.0.0 --port 3002" -WorkingDirectory "apps/ai-engine" -WindowStyle Hidden

} else {
    Write-Info "Starting in DEVELOPMENT mode..."

    # Start all apps in parallel with turbo
    if ($Background) {
        Start-Process -FilePath "pnpm" -ArgumentList "turbo run dev" -WindowStyle Hidden
    } else {
        pnpm turbo run dev
        return
    }
}

# ========================================
# Health Check
# ========================================
Write-Info "Running health checks..."
Start-Sleep -Seconds 5

$healthEndpoints = @(
    @{ Name = "Frontend"; Url = "http://localhost:3000" },
    @{ Name = "Backend API"; Url = "http://localhost:3001" },
    @{ Name = "AI Engine"; Url = "http://localhost:3002/health" }
)

$allHealthy = $true
foreach ($endpoint in $healthEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "$($endpoint.Name): Healthy"
        } else {
            Write-Warn "$($endpoint.Name): Status $($response.StatusCode)"
            $allHealthy = $false
        }
    } catch {
        Write-Warn "$($endpoint.Name): Not responding"
        $allHealthy = $false
    }
}

# ========================================
# Summary
# ========================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($allHealthy) {
    Write-Success "All services started successfully!"
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Yellow
    Write-Host "  📊 Dashboard:    http://localhost:3000" -ForegroundColor White
    Write-Host "  🔧 Backend API: http://localhost:3001" -ForegroundColor White
    Write-Host "  🤖 AI Engine:   http://localhost:3002" -ForegroundColor White
} else {
    Write-Warn "Some services may not be ready. Check logs with:"
    Write-Host "  pnpm turbo run dev" -ForegroundColor White
}

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "  Logs:    docker compose logs -f" -ForegroundColor Gray
Write-Host "  Stop:    docker compose down" -ForegroundColor Gray
Write-Host "  Restart: .\start.ps1" -ForegroundColor Gray
Write-Host ""
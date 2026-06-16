# QA Dashboard - Health Check Script
# Windows PowerShell Version

param(
    [switch]$Verbose,
    [switch]$Wait,
    [int]$Timeout = 30
)

$ErrorActionPreference = "Continue"

# Colors
function Write-Status { param($msg, $color) Write-Host $msg -ForegroundColor $color }
function Write-Green { param($msg) Write-Status "✅ $msg" "Green" }
function Write-Yellow { param($msg) Write-Status "⚠️  $msg" "Yellow" }
function Write-Red { param($msg) Write-Status "❌ $msg" "Red" }
function Write-Cyan { param($msg) Write-Status $msg "Cyan" }

Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                   QA Dashboard Health Check                ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$allPassed = $true
$startTime = Get-Date

# ========================================
# Node.js Environment
# ========================================
Write-Cyan "`n[1/8] Checking Node.js..."

try {
    $nodeVersion = node --version
    Write-Green "Node.js: $nodeVersion"
} catch {
    Write-Red "Node.js not installed"
    $allPassed = $false
}

try {
    $pnpmVersion = pnpm --version
    Write-Green "PNPM: $pnpmVersion"
} catch {
    Write-Red "PNPM not installed"
    $allPassed = $false
}

try {
    $npmVersion = npm --version
    Write-Green "NPM: $npmVersion"
} catch {
    Write-Red "NPM not installed"
    $allPassed = $false
}

# ========================================
# Docker Services
# ========================================
Write-Cyan "`n[2/8] Checking Docker..."

try {
    $dockerVersion = docker --version
    Write-Green "Docker: $dockerVersion"
} catch {
    Write-Yellow "Docker not available"
}

try {
    $dockerRunning = docker ps 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Green "Docker daemon: Running"
    }
} catch {
    Write-Yellow "Docker daemon: Not running"
}

# PostgreSQL
Write-Cyan "`n[3/8] Checking PostgreSQL..."
try {
    $pgContainer = docker ps --filter "name=postgres" --format "{{.Names}}"
    if ($pgContainer) {
        Write-Green "PostgreSQL container: Running ($pgContainer)"

        $pgReady = docker exec $pgContainer pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Green "PostgreSQL: Ready to accept connections"
        } else {
            Write-Yellow "PostgreSQL: Not ready yet"
        }
    } else {
        Write-Yellow "PostgreSQL container: Not running"
    }
} catch {
    Write-Yellow "PostgreSQL: Not available"
}

# Redis
Write-Cyan "`n[4/8] Checking Redis..."
try {
    $redisContainer = docker ps --filter "name=redis" --format "{{.Names}}"
    if ($redisContainer) {
        Write-Green "Redis container: Running ($redisContainer)"

        $redisPing = docker exec $redisContainer redis-cli ping 2>$null
        if ($redisPing -eq "PONG") {
            Write-Green "Redis: PONG"
        }
    } else {
        Write-Yellow "Redis container: Not running"
    }
} catch {
    Write-Yellow "Redis: Not available"
}

# ========================================
# Application Health
# ========================================
Write-Cyan "`n[5/8] Checking Frontend..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Green "Frontend (Next.js): Running on port 3000"
    } else {
        Write-Yellow "Frontend: Status $($response.StatusCode)"
    }
} catch {
    Write-Yellow "Frontend: Not responding"
}

Write-Cyan "`n[6/8] Checking Backend..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Green "Backend (NestJS): Running on port 3001"
    } else {
        Write-Yellow "Backend: Status $($response.StatusCode)"
    }
} catch {
    Write-Yellow "Backend: Not responding"
}

Write-Cyan "`n[7/8] Checking AI Engine..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Green "AI Engine (FastAPI): Running on port 3002"
    } else {
        Write-Yellow "AI Engine: Status $($response.StatusCode)"
    }
} catch {
    Write-Yellow "AI Engine: Not responding"
}

# ========================================
# Network Ports
# ========================================
Write-Cyan "`n[8/8] Checking Network Ports..."

$ports = @(3000, 3001, 3002, 5432, 6379)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        $service = @{
            3000 = "Frontend"
            3001 = "Backend API"
            3002 = "AI Engine"
            5432 = "PostgreSQL"
            6379 = "Redis"
        }
        Write-Green "Port $port ($($service[$port])): Open"
    } else {
        $service = @{
            3000 = "Frontend"
            3001 = "Backend API"
            3002 = "AI Engine"
            5432 = "PostgreSQL"
            6379 = "Redis"
        }
        Write-Yellow "Port $port ($($service[$port])): Closed"
    }
}

# ========================================
# Summary
# ========================================
$duration = (Get-Date) - $startTime

Write-Host ""
Write-Cyan "═══════════════════════════════════════════════════════════"
Write-Cyan "                      Summary"
Write-Cyan "═══════════════════════════════════════════════════════════"

if ($allPassed) {
    Write-Green "All checks passed!"
} else {
    Write-Yellow "Some checks failed. See details above."
}

Write-Host "Duration: $($duration.TotalSeconds) seconds"
Write-Host ""

# ========================================
# Recommendations
# ========================================
if (-not $allPassed) {
    Write-Host "Recommendations:" -ForegroundColor Yellow
    Write-Host "  - Run install.ps1 to install dependencies" -ForegroundColor White
    Write-Host "  - Run start.ps1 to start services" -ForegroundColor White
    Write-Host "  - Run troubleshoot.ps1 for help" -ForegroundColor White
}

# Wait loop if requested
if ($Wait) {
    Write-Host "`nMonitoring services (Ctrl+C to exit)..." -ForegroundColor Gray
    $iterations = 0
    while ($iterations -lt $Timeout) {
        Start-Sleep -Seconds 1
        $iterations++
    }
}

Write-Host ""
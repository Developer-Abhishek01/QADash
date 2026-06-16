# QADash Enterprise - Environment Validation Script
# Version: 2.0
# Purpose: Validate environment prerequisites and configuration

param(
    [switch]$Verbose,
    [switch]$Fix,
    [switch]$Report
)

$ErrorCount = 0
$WarningCount = 0
$InfoList = @()

function Write-Status {
    param($Message, $Status = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($Status) {
        "SUCCESS" { Write-Host "[$timestamp] [SUCCESS] $Message" -ForegroundColor Green }
        "WARNING" { Write-Host "[$timestamp] [WARNING] $Message" -ForegroundColor Yellow }
        "ERROR" { Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red }
        default { Write-Host "[$timestamp] [INFO] $Message" }
    }
}

function Test-Command {
    param($Command, $Name)
    $found = Get-Command $Command -ErrorAction SilentlyContinue
    if ($found) {
        $version = & $Command --version 2>$null | Select-Object -First 1
        Write-Status "Found $Name: $version" "SUCCESS"
        return $true
    } else {
        Write-Status "Missing $Name" "ERROR"
        return $false
    }
}

function Test-Port {
    param($Port, $Name)
    $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
                Where-Object { $_.State -eq "Listen" }
    if ($listener) {
        Write-Status "Port $Port ($Name) - IN USE" "WARNING"
        return $false
    } else {
        Write-Status "Port $Port ($Name) - AVAILABLE" "SUCCESS"
        return $true
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           QADASH ENTERPRISE - ENVIRONMENT VALIDATION                                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. System Requirements Check
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SYSTEM REQUIREMENTS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Node.js
if (Test-Command "node" "Node.js") { $ErrorCount++ }

# NPM/PNPM
if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
    $pnpmVersion = pnpm --version
    Write-Status "Found PNPM: $pnpmVersion" "SUCCESS"
} elseif (Get-Command "npm" -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Status "Found NPM: $npmVersion (PNPM recommended)" "WARNING"
    $WarningCount++
} else {
    Write-Status "No package manager found" "ERROR"
    $ErrorCount++
}

# Python
if (Test-Command "python" "Python") { $ErrorCount++ }

# Docker
if (Test-Command "docker" "Docker") { $ErrorCount++ }

# Docker Compose
$dockerCompose = Get-Command "docker" -ErrorAction SilentlyContinue
if ($dockerCompose) {
    $result = docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Docker Compose: $result" "SUCCESS"
    } else {
        $result = docker-compose --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Docker Compose (standalone): $result" "SUCCESS"
        } else {
            Write-Status "Docker Compose not found" "WARNING"
            $WarningCount++
        }
    }
}

Write-Host ""

# ========================================
# 2. Port Availability Check
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PORT AVAILABILITY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$Ports = @{
    "3000" = "Frontend (Next.js)"
    "3001" = "Backend (NestJS)"
    "3002" = "AI Engine (FastAPI)"
    "5432" = "PostgreSQL"
    "6379" = "Redis"
    "9000" = "MinIO"
    "9200" = "Elasticsearch"
    "9090" = "Prometheus"
    "3003" = "Grafana"
}

$PortIssues = 0
foreach ($port in $Ports.Keys) {
    if (-not (Test-Port $port $Ports[$port])) { $PortIssues++ }
}

Write-Host ""

# ========================================
# 3. Environment Variables Check
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot

# Check for .env files
if (Test-Path "$projectRoot\.env") {
    Write-Status ".env file found" "SUCCESS"
    # Validate critical variables
    $envContent = Get-Content "$projectRoot\.env"
    $requiredVars = @("POSTGRES_PASSWORD", "REDIS_PASSWORD", "JWT_SECRET")
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=") {
            Write-Status "  Variable $var is set" "SUCCESS"
        } else {
            Write-Status "  Variable $var is NOT set" "WARNING"
            $WarningCount++
        }
    }
} else {
    if (Test-Path "$projectRoot\.env.example") {
        Write-Status ".env file not found, creating from .env.example..." "WARNING"
        if ($Fix) {
            Copy-Item "$projectRoot\.env.example" "$projectRoot\.env"
            Write-Status ".env created from example" "SUCCESS"
        }
        $WarningCount++
    } else {
        Write-Status ".env and .env.example files not found" "ERROR"
        $ErrorCount++
    }
}

if (Test-Path "$projectRoot\.env.production") {
    Write-Status ".env.production file found" "SUCCESS"
} else {
    Write-Status ".env.production file not found (optional)" "WARNING"
    $WarningCount++
}

Write-Host ""

# ========================================
# 4. Project Structure Check
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PROJECT STRUCTURE" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$RequiredDirs = @(
    "apps/frontend",
    "apps/backend",
    "apps/ai-engine",
    "apps/automation",
    "packages",
    "docker",
    "k8s",
    "monitoring",
    "scripts"
)

$MissingDirs = @()
foreach ($dir in $RequiredDirs) {
    $fullPath = Join-Path $projectRoot $dir
    if (Test-Path $fullPath) {
        Write-Status "Directory $dir - EXISTS" "SUCCESS"
    } else {
        Write-Status "Directory $dir - MISSING" "ERROR"
        $MissingDirs += $dir
        $ErrorCount++
    }
}

Write-Host ""

# ========================================
# 5. Dependencies Check
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "DEPENDENCIES" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$RequiredFiles = @{
    "package.json" = "Root package.json"
    "pnpm-lock.yaml" = "PNPM lock file"
    "tsconfig.json" = "TypeScript config"
    "turbo.json" = "Turbo config"
    "apps/backend/prisma/schema.prisma" = "Prisma schema"
    "apps/ai-engine/requirements.txt" = "AI Engine requirements"
}

foreach ($file in $RequiredFiles.Keys) {
    $fullPath = Join-Path $projectRoot $file
    if (Test-Path $fullPath) {
        Write-Status "File $file - EXISTS" "SUCCESS"
    } else {
        Write-Status "File $file - MISSING" "WARNING"
        $WarningCount++
    }
}

Write-Host ""

# ========================================
# 6. Disk Space Check
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SYSTEM RESOURCES" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$disk = Get-PSDrive C
$freeGB = [math]::Round($disk.Free / 1GB, 2)
$totalGB = [math]::Round($disk.Used / 1GB + $disk.Free / 1GB, 2)
$percentFree = [math]::Round(($disk.Free / ($disk.Used + $disk.Free)) * 100, 1)

Write-Status "Disk Space: $freeGB GB free of $totalGB GB ($percentFree% free)" "INFO"

if ($freeGB -lt 5) {
    Write-Status "LOW DISK SPACE - Less than 5GB free" "WARNING"
    $WarningCount++
}

# Memory Check
$os = Get-CimInstance Win32_OperatingSystem
$totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedMem = $totalMem - $freeMem
$percentUsed = [math]::Round(($usedMem / $totalMem) * 100, 1)

Write-Status "Memory: $usedMem GB used of $totalMem GB ($percentUsed% used)" "INFO"

if ($percentUsed -gt 90) {
    Write-Status "HIGH MEMORY USAGE - Above 90%" "WARNING"
    $WarningCount++
}

Write-Host ""

# ========================================
# FINAL REPORT
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "FINAL REPORT" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0 -and $WarningCount -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  STATUS: EXCELLENT - All checks passed!                               ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} elseif ($ErrorCount -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  STATUS: GOOD - $WarningCount warnings found                              ║" -ForegroundColor Yellow
    Write-Host "║  The platform should still work, but some features may be limited     ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
} else {
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  STATUS: FAILED - $ErrorCount errors, $WarningCount warnings               ║" -ForegroundColor Red
    Write-Host "║  Please fix the errors before starting the platform                   ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
}

Write-Host ""
Write-Status "Summary: $ErrorCount errors, $WarningCount warnings" "INFO"
Write-Host ""

# Generate Report if requested
if ($Report) {
    $reportPath = Join-Path $projectRoot "logs\env-validation-report.txt"
    $reportContent = @"
QADash Enterprise - Environment Validation Report
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

ERRORS: $ErrorCount
WARNINGS: $WarningCount

CRITICAL ISSUES:
$(if ($ErrorCount -gt 0) { "Some critical checks failed. Review the output above." } else { "None" })

RECOMMENDATIONS:
$(if ($PortIssues -gt 0) { "- Free the required ports or use different port configurations" })
$(if ($MissingDirs.Count -gt 0) { "- Missing directories: $($MissingDirs -join ', ')" })
$(if ($freeGB -lt 5) { "- Free up disk space (minimum 5GB recommended)" })

TO FIX WARNINGS:
1. Run this script with -Fix to auto-fix some issues
2. Review the warnings above for specific remediation steps
"@

    $reportDir = Split-Path $reportPath -Parent
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    $reportContent | Out-File $reportPath -Encoding UTF8
    Write-Status "Report saved to: $reportPath" "INFO"
}

Write-Host "Quick Actions:" -ForegroundColor Cyan
Write-Host "  [1] Start Platform (run.bat)" -ForegroundColor Gray
Write-Host "  [2] View Logs" -ForegroundColor Gray
Write-Host "  [Q] Quit" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter choice"
switch ($choice) {
    "1" { & "$projectRoot\run.bat" }
    "2" { & "explorer.exe" "$projectRoot\logs" }
}

exit $(if ($ErrorCount -eq 0) { 0 } else { 1 })
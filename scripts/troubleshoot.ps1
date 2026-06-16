# QADash Enterprise - Diagnostic & Troubleshooting Script
# Version: 2.0
# Purpose: Identify and fix common issues

param(
    [switch]$Fix,
    [switch]$Deep,
    [switch]$Export
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-DiagHeader {
    param($Title)
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host ""
}

function Write-DiagResult {
    param($Message, $Status = "INFO", $Suggestion = "")
    switch ($Status) {
        "SUCCESS" {
            Write-Host "[SUCCESS] $Message" -ForegroundColor Green
        }
        "WARNING" {
            Write-Host "[WARNING] $Message" -ForegroundColor Yellow
            if ($Suggestion) {
                Write-Host "  └─ Suggestion: $Suggestion" -ForegroundColor DarkYellow
            }
        }
        "ERROR" {
            Write-Host "[ERROR] $Message" -ForegroundColor Red
            if ($Suggestion) {
                Write-Host "  └─ Fix: $Suggestion" -ForegroundColor Magenta
            }
        }
        default {
            Write-Host "[INFO] $Message"
        }
    }
}

function Test-AndFix {
    param(
        $Name,
        $Test,
        $FixScript,
        $Description
    )

    Write-Host "Checking: $Description" -ForegroundColor Gray

    $result = & $Test
    if ($result.Status -eq "PASS") {
        Write-DiagResult "$Name - OK" "SUCCESS"
        return $true
    } elseif ($result.Status -eq "WARNING" -and $Fix -and $FixScript) {
        Write-DiagResult "$Name - Fixing..." "WARNING"
        & $FixScript
        return $true
    } else {
        Write-DiagResult "$Name - Failed: $($result.Message)" "ERROR" $result.Suggestion
        return $false
    }
}

Write-DiagHeader "QADASH ENTERPRISE - DIAGNOSTIC & TROUBLESHOOTING"

$diagnostics = @()
$issues = @()

# ========================================
# 1. PORT CONFLICTS
# ========================================
Write-DiagHeader "1. PORT CONFLICTS"

$requiredPorts = @{
    "3000" = "Frontend (Next.js)"
    "3001" = "Backend (NestJS)"
    "3002" = "AI Engine (FastAPI)"
    "5432" = "PostgreSQL"
    "6379" = "Redis"
    "9000" = "MinIO"
    "9200" = "Elasticsearch"
}

foreach ($port in $requiredPorts.Keys) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                   Where-Object { $_.State -eq "Listen" }

    if ($connections) {
        $process = Get-Process -Id $connections[0].OwningProcess -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.ProcessName } else { "Unknown" }

        Write-DiagResult "Port $port ($($requiredPorts[$port])) is in use by: $processName (PID: $($connections[0].OwningProcess))" "WARNING" "Run 'netstat -ano | findstr :$port' for details"

        $issues += @{
            Type = "PortConflict"
            Port = $port
            Process = $processName
            PID = $connections[0].OwningProcess
        }
    } else {
        Write-DiagResult "Port $port ($($requiredPorts[$port])) - Available" "SUCCESS"
    }
}

# ========================================
# 2. DOCKER STATUS
# ========================================
Write-DiagHeader "2. DOCKER STATUS"

$dockerAvailable = Get-Command "docker" -ErrorAction SilentlyContinue
if (-not $dockerAvailable) {
    Write-DiagResult "Docker is not installed" "ERROR" "Install Docker Desktop from https://docker.com"
    $issues += @{ Type = "MissingDocker" }
} else {
    Write-DiagResult "Docker CLI found" "SUCCESS"

    $dockerRunning = docker info 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-DiagResult "Docker daemon is running" "SUCCESS"

        # Check required containers
        $requiredContainers = @("qadash-postgres", "qadash-redis", "qadash-backend", "qadash-frontend")
        foreach ($container in $requiredContainers) {
            $running = docker ps --filter "name=$container" --filter "status=running" --format "{{.Names}}" 2>$null
            if ($running) {
                Write-DiagResult "Container $container - Running" "SUCCESS"
            } else {
                $exists = docker ps -a --filter "name=$container" --format "{{.Names}}" 2>$null
                if ($exists) {
                    Write-DiagResult "Container $container - Stopped" "WARNING" "Run 'docker start $container' to start"
                    $issues += @{ Type = "StoppedContainer"; Container = $container }
                } else {
                    Write-DiagResult "Container $container - Not created" "WARNING" "Container not found in Docker Compose"
                    $issues += @{ Type = "MissingContainer"; Container = $container }
                }
            }
        }
    } else {
        Write-DiagResult "Docker daemon is not running" "ERROR" "Start Docker Desktop or run 'dockerd' in terminal"
        $issues += @{ Type = "DockerNotRunning" }
    }
}

# ========================================
# 3. NODE.JS SERVICES
# ========================================
Write-DiagHeader "3. NODE.JS SERVICES"

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*QADash*" -or $_.MainWindowTitle -eq ""
}

if ($nodeProcesses) {
    Write-DiagResult "Found $($nodeProcesses.Count) Node.js processes" "SUCCESS"
    foreach ($proc in $nodeProcesses) {
        $port = $null
        # Check common ports
        foreach ($p in @(3000, 3001, 3002)) {
            $listener = Get-NetTCPConnection -LocalPort $p -OwningProcess $proc.Id -ErrorAction SilentlyContinue
            if ($listener) { $port = $p; break }
        }
        $portStr = if ($port) { " (Port $port)" } else { "" }
        Write-DiagResult "  - PID $($proc.Id)$portStr: $($proc.ProcessName)" "SUCCESS"
    }
} else {
    Write-DiagResult "No QADash Node.js processes found" "WARNING" "Run 'run.bat' to start services"
    $issues += @{ Type = "NoNodeProcesses" }
}

# ========================================
# 4. DATABASE CONNECTIONS
# ========================================
Write-DiagHeader "4. DATABASE CONNECTIONS"

# PostgreSQL
$pgListener = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue |
              Where-Object { $_.State -eq "Listen" }

if ($pgListener) {
    Write-DiagResult "PostgreSQL is listening on port 5432" "SUCCESS"

    if ($Fix) {
        Write-Host "Testing PostgreSQL connection..." -ForegroundColor Gray
        # Could add actual connection test here
        Write-DiagResult "PostgreSQL connection test - SKIPPED (needs psql)" "WARNING"
    }
} else {
    Write-DiagResult "PostgreSQL is not listening on port 5432" "WARNING" "Start PostgreSQL or check Docker"
    $issues += @{ Type = "PostgresNotRunning" }
}

# Redis
$redisListener = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue |
                 Where-Object { $_.State -eq "Listen" }

if ($redisListener) {
    Write-DiagResult "Redis is listening on port 6379" "SUCCESS"
} else {
    Write-DiagResult "Redis is not listening on port 6379" "WARNING" "Start Redis or check Docker"
    $issues += @{ Type = "RedisNotRunning" }
}

# ========================================
# 5. FILE PERMISSIONS
# ========================================
Write-DiagHeader "5. FILE PERMISSIONS"

$criticalDirs = @("logs", "uploads", "apps\frontend", "apps\backend", "apps\ai-engine")
foreach ($dir in $criticalDirs) {
    $fullPath = Join-Path $projectRoot $dir
    if (Test-Path $fullPath) {
        try {
            $testFile = Join-Path $fullPath "test_write_$(Get-Random).tmp"
            [System.IO.File]::WriteAllText($testFile, "test")
            Remove-Item $testFile -Force
            Write-DiagResult "Directory $dir - Writable" "SUCCESS"
        } catch {
            Write-DiagResult "Directory $dir - Not writable" "ERROR" "Check folder permissions"
            $issues += @{ Type = "PermissionError"; Path = $fullPath }
        }
    } else {
        Write-DiagResult "Directory $dir - Does not exist" "WARNING" "Create the directory manually"
        if ($Fix) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-DiagResult "Created directory $dir" "SUCCESS"
        }
    }
}

# ========================================
# 6. ENVIRONMENT FILES
# ========================================
Write-DiagHeader "6. ENVIRONMENT FILES"

$envFiles = @(".env", ".env.production", ".env.development", ".env.staging")
foreach ($envFile in $envFiles) {
    $envPath = Join-Path $projectRoot $envFile
    if (Test-Path $envPath) {
        Write-DiagResult "File $envFile - EXISTS" "SUCCESS"

        # Check for sensitive values
        $content = Get-Content $envPath -Raw
        $defaultPasswords = @("password", "secret", "changeme", "12345")
        foreach ($pwd in $defaultPasswords) {
            if ($content -match "PASSWORD=$pwd" -or $content -match "SECRET=$pwd") {
                Write-DiagResult "  WARNING: Default password found in $envFile" "WARNING" "Change default passwords in production"
            }
        }
    } else {
        Write-DiagResult "File $envFile - MISSING" "WARNING" "Create from .env.example or manually"
        $issues += @{ Type = "MissingEnvFile"; File = $envFile }
    }
}

# ========================================
# 7. NETWORK CONNECTIVITY
# ========================================
Write-DiagHeader "7. NETWORK CONNECTIVITY"

$endpoints = @{
    "http://localhost:3001/health" = "Backend Health"
    "http://localhost:3002/health" = "AI Engine Health"
    "http://localhost:3000" = "Frontend"
}

foreach ($endpoint in $endpoints.Keys) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 204) {
            Write-DiagResult "$($endpoints[$endpoint]) ($endpoint) - Reachable" "SUCCESS"
        } else {
            Write-DiagResult "$($endpoints[$endpoint]) ($endpoint) - Returns $($response.StatusCode)" "WARNING"
            $issues += @{ Type = "UnreachableEndpoint"; Endpoint = $endpoint }
        }
    } catch {
        Write-DiagResult "$($endpoints[$endpoint]) ($endpoint) - Unreachable" "ERROR" "Check if service is running"
        $issues += @{ Type = "UnreachableEndpoint"; Endpoint = $endpoint }
    }
}

# ========================================
# 8. DISK & MEMORY
# ========================================
Write-DiagHeader "8. SYSTEM RESOURCES"

$disk = Get-PSDrive C
$freeGB = [math]::Round($disk.Free / 1GB, 2)

if ($freeGB -lt 5) {
    Write-DiagResult "Disk space LOW: $freeGB GB free" "ERROR" "Free up disk space (minimum 5GB recommended)"
    $issues += @{ Type = "LowDiskSpace"; FreeGB = $freeGB }
} else {
    Write-DiagResult "Disk space OK: $freeGB GB free" "SUCCESS"
}

$os = Get-CimInstance Win32_OperatingSystem
$totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedMem = $totalMem - $freeMem
$percentUsed = [math]::Round(($usedMem / $totalMem) * 100, 1)

if ($percentUsed -gt 90) {
    Write-DiagResult "Memory usage HIGH: $percentUsed%" "WARNING" "Close other applications or add more RAM"
    $issues += @{ Type = "HighMemoryUsage"; Percent = $percentUsed }
} else {
    Write-DiagResult "Memory usage OK: $percentUsed% used" "SUCCESS"
}

# ========================================
# 9. LOG ANALYSIS
# ========================================
if ($Deep) {
    Write-DiagHeader "9. LOG ANALYSIS (Deep)"

    $logDir = Join-Path $projectRoot "logs"
    if (Test-Path $logDir) {
        $logFiles = Get-ChildItem -Path $logDir -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 5

        foreach ($logFile in $logFiles) {
            Write-Host "Analyzing: $($logFile.Name)" -ForegroundColor Gray

            $errors = Select-String -Path $logFile.FullName -Pattern "ERROR|Exception|FATAL" -ErrorAction SilentlyContinue
            if ($errors) {
                Write-DiagResult "  Found $($errors.Count) error entries in $($logFile.Name)" "WARNING"
                $issues += @{ Type = "LogErrors"; File = $logFile.Name; Count = $errors.Count }
            }
        }
    }
}

# ========================================
# FINAL REPORT
# ========================================
Write-DiagHeader "DIAGNOSTIC SUMMARY"

$totalIssues = $issues.Count
$criticalCount = ($issues | Where-Object { $_.Type -match "Permission|DockerNot|Disk" }).Count

if ($totalIssues -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  STATUS: ALL CLEAR - No issues found!                               ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor $(if ($criticalCount -gt 0) { "Red" } else { "Yellow" })
    Write-Host "║  STATUS: ISSUES FOUND                                               ║" -ForegroundColor $(if ($criticalCount -gt 0) { "Red" } else { "Yellow" })
    Write-Host "╠════════════════════════════════════════════════════════════════════════╣" -ForegroundColor $(if ($criticalCount -gt 0) { "Red" } else { "Yellow" })
    Write-Host "║  Total Issues: $totalIssues" -ForegroundColor $(if ($criticalCount -gt 0) { "Red" } else { "Yellow" })
    if ($criticalCount -gt 0) {
        Write-Host "║  Critical: $criticalCount" -ForegroundColor Red
    }
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor $(if ($criticalCount -gt 0) { "Red" } else { "Yellow" })

    Write-Host ""
    Write-Host "Quick Fixes:" -ForegroundColor Cyan
    Write-Host "  [1] Restart Platform     (run.bat --restart)"
    Write-Host "  [2] Clean & Restart      (run.bat --clean)"
    Write-Host "  [3] Open Logs           (explorer logs)"
    Write-Host "  [4] Health Check        (health-check.bat)"
    Write-Host ""

    # Export report if requested
    if ($Export) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $reportPath = Join-Path $projectRoot "logs\diagnostic_report_$timestamp.json"

        $report = @{
            Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            TotalIssues = $totalIssues
            CriticalCount = $criticalCount
            Issues = $issues
        }

        $report | ConvertTo-Json -Depth 10 | Out-File $reportPath -Encoding UTF8
        Write-Host "Report saved to: $reportPath" -ForegroundColor Green
    }
}

Write-Host ""
$choice = Read-Host "Enter action (1-4) or press Enter to exit"
switch ($choice) {
    "1" { & "$projectRoot\restart.bat" }
    "2" { & "$projectRoot\run.bat" "--clean" }
    "3" { & "explorer.exe" "$projectRoot\logs" }
    "4" { & "$projectRoot\health-check.bat" }
}

exit $totalIssues
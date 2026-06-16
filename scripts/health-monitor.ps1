# QADash Enterprise - Health Monitoring Dashboard
# Version: 2.0
# Purpose: Real-time health monitoring and alerting

param(
    [int]$Interval = 5,
    [switch]$Alerts,
    [switch]$Export
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Console settings
$Host.UI.RawUI.WindowTitle = "QADash Enterprise - Health Monitor"

# Service definitions
$Services = @{
    "Frontend" = @{ Port = 3000; Url = "http://localhost:3000"; Process = "" }
    "Backend" = @{ Port = 3001; Url = "http://localhost:3001/health"; Process = "" }
    "AI Engine" = @{ Port = 3002; Url = "http://localhost:3002/health"; Process = "" }
    "PostgreSQL" = @{ Port = 5432; Container = "qadash-postgres" }
    "Redis" = @{ Port = 6379; Container = "qadash-redis" }
    "MinIO" = @{ Port = 9000; Container = "qadash-minio" }
    "Elasticsearch" = @{ Port = 9200; Container = "qadash-elasticsearch" }
    "Prometheus" = @{ Port = 9090; Container = "qadash-prometheus" }
    "Grafana" = @{ Port = 3003; Container = "qadash-grafana" }
}

function Write-Header {
    param($Title)
    $width = 100
    $padding = [math]::Max(0, ($width - $Title.Length) / 2)
    $padStr = " " * [int]$padding
    Write-Host ""
    Write-Host ("=" * $width) -ForegroundColor Cyan
    Write-Host "$padStr$Title" -ForegroundColor Cyan
    Write-Host ("=" * $width) -ForegroundColor Cyan
    Write-Host ""
}

function Get-ServiceStatus {
    param($ServiceName, $Config)

    $result = @{
        Name = $ServiceName
        Status = "UNKNOWN"
        Details = ""
        Timestamp = Get-Date
    }

    # Check if port is listening
    $portListener = Get-NetTCPConnection -LocalPort $Config.Port -ErrorAction SilentlyContinue |
                    Where-Object { $_.State -eq "Listen" }

    if ($portListener) {
        # Service is listening
        if ($Config.Url) {
            try {
                $response = Invoke-WebRequest -Uri $Config.Url -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 204) {
                    $result.Status = "HEALTHY"
                    $result.Details = "Responding on port $($Config.Port)"
                } else {
                    $result.Status = "DEGRADED"
                    $result.Details = "Responding but returning status $($response.StatusCode)"
                }
            } catch {
                $result.Status = "RUNNING"
                $result.Details = "Port open but not responding to HTTP"
            }
        } else {
            $result.Status = "RUNNING"
            $result.Details = "Port $($Config.Port) is listening"
        }
    } else {
        # Check Docker containers
        if ($Config.Container) {
            $container = docker ps --filter "name=$($Config.Container)" --filter "status=running" --format "{{.Names}}" 2>$null
            if ($container) {
                $result.Status = "RUNNING"
                $result.Details = "Docker container running (port not exposed locally)"
            } else {
                $result.Status = "STOPPED"
                $result.Details = "Not running (port $($Config.Port))"
            }
        } else {
            $result.Status = "STOPPED"
            $result.Details = "Port $($Config.Port) not listening"
        }
    }

    return $result
}

function Get-SystemMetrics {
    # CPU Usage
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples.CookedValue
    if (-not $cpu) { $cpu = 0 }

    # Memory Usage
    $os = Get-CimInstance Win32_OperatingSystem
    $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedMem = $totalMem - $freeMem
    $memPercent = [math]::Round(($usedMem / $totalMem) * 100, 1)

    # Disk Space
    $disk = Get-PSDrive C
    $freeDisk = [math]::Round($disk.Free / 1GB, 2)

    return @{
        CPU = [math]::Round($cpu, 1)
        MemoryUsed = $usedMem
        MemoryTotal = $totalMem
        MemoryPercent = $memPercent
        DiskFree = $freeDisk
    }
}

function Write-MetricsTable {
    param($Metrics)

    $cpuColor = if ($Metrics.CPU -gt 80) { "Red" } elseif ($Metrics.CPU -gt 60) { "Yellow" } else { "Green" }
    $memColor = if ($Metrics.MemoryPercent -gt 90) { "Red" } elseif ($Metrics.MemoryPercent -gt 75) { "Yellow" } else { "Green" }
    $diskColor = if ($Metrics.DiskFree -lt 5) { "Red" } elseif ($Metrics.DiskFree -lt 10) { "Yellow" } else { "Green" }

    Write-Host "System Metrics:" -ForegroundColor Cyan
    Write-Host "  CPU:        $($Metrics.CPU)%" -ForegroundColor $cpuColor
    Write-Host "  Memory:     $($Metrics.MemoryUsed) GB / $($Metrics.MemoryTotal) GB ($($Metrics.MemoryPercent)%)" -ForegroundColor $memColor
    Write-Host "  Disk Free:  $($Metrics.DiskFree) GB" -ForegroundColor $diskColor
}

function Write-ServiceRow {
    param($Service)

    $statusChar = switch ($Service.Status) {
        "HEALTHY" { "[+]" }
        "RUNNING" { "[*]" }
        "DEGRADED" { "[!]" }
        "STOPPED" { "[X]" }
        default { "[?]" }
    }

    $color = switch ($Service.Status) {
        "HEALTHY" { "Green" }
        "RUNNING" { "Cyan" }
        "DEGRADED" { "Yellow" }
        "STOPPED" { "Red" }
        default { "Gray" }
    }

    $namePad = $Service.Name.PadRight(15)
    $statusPad = $Service.Status.PadRight(10)

    Write-Host "  $statusChar $namePad $statusPad $($Service.Details)" -ForegroundColor $color
}

function Export-HealthReport {
    param($Services, $Metrics)

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportPath = Join-Path $projectRoot "logs\health_report_$timestamp.json"

    $report = @{
        Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Services = $Services
        Metrics = $Metrics
        HealthyCount = ($Services | Where-Object { $_.Status -eq "HEALTHY" }).Count
        TotalCount = $Services.Count
    }

    $report | ConvertTo-Json -Depth 10 | Out-File $reportPath -Encoding UTF8
    return $reportPath
}

# ========================================
# MAIN MONITORING LOOP
# ========================================

Write-Header "QADASH ENTERPRISE - HEALTH MONITORING DASHBOARD"
Write-Host "Refresh Interval: $Interval seconds | Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

$logPath = Join-Path $projectRoot "logs\health-monitor.log"
$startTime = Get-Date

# Create logs directory if needed
if (-not (Test-Path (Split-Path $logPath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path $logPath -Parent) -Force | Out-Null
}

while ($true) {
    Clear-Host

    Write-Header "QADASH ENTERPRISE - HEALTH MONITORING"
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | Session: $([math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)) min" -ForegroundColor DarkGray
    Write-Host ""

    # Get system metrics
    $metrics = Get-SystemMetrics

    Write-Host "┌────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│           SYSTEM RESOURCES             │" -ForegroundColor Cyan
    Write-Host "├────────────────────────────────────────┤" -ForegroundColor Cyan

    $cpuColor = if ($metrics.CPU -gt 80) { "Red" } elseif ($metrics.CPU -gt 60) { "Yellow" } else { "Green" }
    $memColor = if ($metrics.MemoryPercent -gt 90) { "Red" } elseif ($metrics.MemoryPercent -gt 75) { "Yellow" } else { "Green" }
    $diskColor = if ($metrics.DiskFree -lt 5) { "Red" } elseif ($metrics.DiskFree -lt 10) { "Yellow" } else { "Green" }

    Write-Host ("│ CPU:     {0,6}%                      │" -f $metrics.CPU) -ForegroundColor $cpuColor
    Write-Host ("│ Memory:  {0,6}% used (${$metrics.MemoryTotal}GB total)    │" -f $metrics.MemoryPercent) -ForegroundColor $memColor
    Write-Host ("│ Disk:    {0,6} GB free                 │" -f $metrics.DiskFree) -ForegroundColor $diskColor

    Write-Host "└────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""

    # Service status
    Write-Host "┌────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│           SERVICE STATUS               │" -ForegroundColor Cyan
    Write-Host "├────────────────────────────────────────┤" -ForegroundColor Cyan

    $serviceResults = @()
    $healthyCount = 0
    $stoppedCount = 0

    foreach ($serviceName in $Services.Keys) {
        $result = Get-ServiceStatus -ServiceName $serviceName -Config $Services[$serviceName]
        $serviceResults += $result

        $statusChar = switch ($result.Status) {
            "HEALTHY" { "[+]" }
            "RUNNING" { "[*]" }
            "DEGRADED" { "[!]" }
            "STOPPED" { "[X]" }
            default { "[?]" }
        }

        $color = switch ($result.Status) {
            "HEALTHY" { "Green" }
            "RUNNING" { "Cyan" }
            "DEGRADED" { "Yellow" }
            "STOPPED" { "Red" }
            default { "Gray" }
        }

        $namePad = $serviceName.PadRight(14)
        Write-Host ("│ {0} {1} {2,-25}│" -f $statusChar, $namePad, $result.Status) -ForegroundColor $color

        if ($result.Status -eq "HEALTHY") { $healthyCount++ }
        if ($result.Status -eq "STOPPED") { $stoppedCount++ }
    }

    Write-Host "└────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""

    # Summary
    Write-Host "┌────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│              SUMMARY                    │" -ForegroundColor Cyan
    Write-Host "├────────────────────────────────────────┤" -ForegroundColor Cyan

    $totalServices = $Services.Count
    $upPercent = [math]::Round(($healthyCount / $totalServices) * 100, 1)

    $overallColor = if ($stoppedCount -gt 2) { "Red" } elseif ($stoppedCount -gt 0) { "Yellow" } else { "Green" }

    Write-Host ("│ Healthy:   {0}/{1} ({2}%)                │" -f $healthyCount, $totalServices, $upPercent) -ForegroundColor $overallColor
    Write-Host ("│ Stopped:   {0}                       │" -f $stoppedCount) -ForegroundColor $(if ($stoppedCount -gt 0) { "Red" } else { "Green" })
    Write-Host ("│ Uptime:    {0} minutes               │" -f [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)) -ForegroundColor Cyan

    Write-Host "└────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""

    # Quick actions
    Write-Host "Quick Actions:" -ForegroundColor Cyan
    Write-Host "  [1] Open Dashboard    [2] API Docs      [3] Health Report  [4] Restart"
    Write-Host "  [5] View Logs         [6] Refresh       [Q] Quit"
    Write-Host ""

    # Log to file
    $logEntry = "[{0}] Healthy: {1}/{2}, CPU: {3}%, Mem: {4}%, Disk: {5}GB" -f
        (Get-Date -Format "HH:mm:ss"), $healthyCount, $totalServices, $metrics.CPU, $metrics.MemoryPercent, $metrics.DiskFree
    Add-Content -Path $logPath -Value $logEntry

    # Wait for input or interval
    Write-Host "Auto-refresh in $Interval seconds..." -ForegroundColor DarkGray

    $inputReady = $host.UI.RawUI.KeyAvailable
    if ($inputReady) {
        $key = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        switch ($key.Char) {
            "1" { Start-Process "http://localhost:3000" }
            "2" { Start-Process "http://localhost:3001/api/docs" }
            "3" { $reportPath = Export-HealthReport -Services $serviceResults -Metrics $metrics; Write-Host "Report: $reportPath" -ForegroundColor Green }
            "4" { & "$projectRoot\restart.bat" }
            "5" { & "explorer.exe" "$projectRoot\logs" }
            "6" { continue }
            "q" { break }
            "Q" { break }
        }
    }

    Start-Sleep -Seconds $Interval

    # Check for alerts
    if ($Alerts -and $stoppedCount -gt 0) {
        # Could implement email/push notification here
    }
}

# Export report on exit
if ($Export) {
    $reportPath = Export-HealthReport -Services $serviceResults -Metrics $metrics
    Write-Host "Final report saved to: $reportPath" -ForegroundColor Green
}
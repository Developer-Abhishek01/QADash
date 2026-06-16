# QADash Quick Start Script

$projectRoot = "C:\Projects\qadash"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   QADASH ENTERPRISE PLATFORM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    exit
}
Write-Host "[OK] Node.js installed" -ForegroundColor Green

# Check if dependencies installed
if (-not (Test-Path "$projectRoot\node_modules")) {
    Write-Host ""
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Set-Location $projectRoot
    npm install --legacy-peer-deps
}
Write-Host "[OK] Dependencies ready" -ForegroundColor Green

# Start Backend
Write-Host ""
Write-Host "Starting Backend (port 3001)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Projects\qadash\apps\backend"
    npm run dev
}

# Start Frontend
Write-Host "Starting Frontend (port 3000)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Projects\qadash\apps\frontend"
    npm run dev
}

# Wait for services
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check status
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SERVICE STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ports = @(3000, 3001)
foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($listener) {
        Write-Host "  [OK] Port $port - RUNNING" -ForegroundColor Green
    } else {
        Write-Host "  [--] Port $port - NOT RUNNING" -ForegroundColor Yellow
    }
}

# Open browser
Write-Host ""
Write-Host "Opening dashboard..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   PLATFORM STARTED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:3001" -ForegroundColor White
Write-Host ""
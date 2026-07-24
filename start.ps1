# QADash Quick Start Script

$projectRoot = $PSScriptRoot

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

# Check Python for AI Engine
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCheck) {
    $pythonCheck = Get-Command python3 -ErrorAction SilentlyContinue
}
if ($pythonCheck) {
    Write-Host "[OK] Python found" -ForegroundColor Green

    # Setup AI Engine virtual env if needed
    $aiEngineDir = "$projectRoot\apps\ai-engine"

    $env:AI_ENGINE_API_KEY = if ($env:AI_ENGINE_API_KEY) { $env:AI_ENGINE_API_KEY } else { "qadash-ai-dev-key" }
    if (-not (Test-Path "$aiEngineDir\venv")) {
        Write-Host "[INFO] Creating Python virtual environment for AI Engine..." -ForegroundColor Yellow
        Set-Location $aiEngineDir
        & $pythonCheck -m venv venv
        Write-Host "[INFO] Installing Python dependencies..." -ForegroundColor Yellow
        & "$aiEngineDir\venv\Scripts\pip" install -r requirements.txt
    }

    # Check LLM API key for AI features
    $llmKey = $env:LLM_API_KEY
    if (-not $llmKey) {
        $llmKey = $env:OPENAI_API_KEY
    }
    if (-not $llmKey) {
        Write-Host "[WARN] LLM_API_KEY not set! AI document parsing will use basic regex mode." -ForegroundColor Yellow
        Write-Host "       For 100% accurate AI-powered parsing, set LLM_API_KEY in your environment." -ForegroundColor Yellow
        Write-Host "       Copy apps/ai-engine/.env.example to .env and add your API key." -ForegroundColor Yellow
    } else {
        Write-Host "[OK] LLM API key found - AI Engine will use real AI for document parsing" -ForegroundColor Green
    }

    # Load .env file into environment for all child processes
    $envFile = "$aiEngineDir\.env"
    if (Test-Path $envFile) {
        Write-Host "[INFO] Loading API keys from .env file..." -ForegroundColor Yellow
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*([^#=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $val = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($key, $val)
                if ($key -match 'API_KEY') {
                    Write-Host "       $key = ********" -ForegroundColor Green
                }
            }
        }
    }

    # Start AI Engine
    Write-Host "Starting AI Engine (port 3002)..." -ForegroundColor Yellow
    $aiJob = Start-Job -ScriptBlock {
        Set-Location "$using:projectRoot\apps\ai-engine"
        .\venv\Scripts\uvicorn src.main:app --reload --port 3002
    }
} else {
    Write-Host "[WARN] Python not found! AI Engine (port 3002) will not start." -ForegroundColor Yellow
    Write-Host "       Install Python from https://python.org and re-run this script." -ForegroundColor Yellow
}

# Start Backend
Write-Host ""
Write-Host "Starting Backend (port 3001)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:projectRoot\apps\backend"
    npm run dev
}

# Start Frontend
Write-Host "Starting Frontend (port 3000)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:projectRoot\apps\frontend"
    npm run dev
}

# Wait for services
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check status
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SERVICE STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ports = @(3000, 3001, 3002)
$portNames = @{3000="Frontend"; 3001="Backend"; 3002="AI Engine"}
foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($listener) {
        Write-Host "  [OK] $($portNames[$port]) (port $port) - RUNNING" -ForegroundColor Green
    } else {
        Write-Host "  [--] $($portNames[$port]) (port $port) - NOT RUNNING" -ForegroundColor Yellow
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
Write-Host "   AI Engine: http://localhost:3002" -ForegroundColor White
Write-Host ""
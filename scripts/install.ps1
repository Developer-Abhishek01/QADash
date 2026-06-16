# QA Dashboard - Automated Installation Script
# Windows PowerShell Version
# Run as: .\install.ps1

param(
    [switch]$SkipDocker,
    [switch]$SkipNode,
    [switch]$Force,
    [string]$InstallPath = $PSScriptRoot
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# ASCII Art Banner
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║           QA Dashboard Enterprise Platform                 ║
║              Automated Installation Script                 ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

Write-Host ""

# ========================================
# System Detection
# ========================================
$OS = $env:OS
$IsWindows = $OS -eq "Windows_NT"
$IsMac = $IsWindows -eq $false -and (Test-Path "/System/Library/CoreServices/SystemVersion.plist")
$IsLinux = $IsWindows -eq $false -and -$IsMac

Write-Info "Detected OS: $([System.Environment]::OSVersion.VersionString)"

# ========================================
# Version Requirements
# ========================================
$Requirements = @{
    Node = @{ Min = "20.0.0"; Recommended = "22.0.0" }
    PNPM = @{ Min = "8.0.0"; Recommended = "9.0.0" }
    Docker = @{ Min = "20.0.0"; Recommended = "24.0.0" }
    Git = @{ Min = "2.0.0"; Recommended = "2.40.0" }
}

# ========================================
# Check Node.js
# ========================================
function Test-NodeInstalled {
    try {
        $version = node --version 2>$null
        if ($version) { return $version }
    } catch { }
    return $null
}

function Install-Node {
    Write-Info "Installing Node.js LTS..."

    if ($IsWindows) {
        $nodeInstaller = "$env:TEMP\node-latest-x64.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi" -OutFile $nodeInstaller -UseBasicParsing
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$nodeInstaller`" /quiet" -Wait
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
    }
    elseif ($IsMac) {
        brew install node@22
    }
    elseif ($IsLinux) {
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    }
}

Write-Info "Checking Node.js..."
$nodeVersion = Test-NodeInstalled
if (-not $nodeVersion) {
    Write-Warn "Node.js not found"
    if (-not $SkipNode) {
        Install-Node
        $nodeVersion = Test-NodeInstalled
    }
}
if ($nodeVersion) {
    Write-Success "Node.js version: $nodeVersion"
}

# ========================================
# Check PNPM
# ========================================
function Test-PnpmInstalled {
    try {
        $version = pnpm --version 2>$null
        if ($version) { return $version }
    } catch { }
    return $null
}

function Install-Pnpm {
    Write-Info "Installing PNPM..."
    npm install -g pnpm
}

Write-Info "Checking PNPM..."
$pnpmVersion = Test-PnpmInstalled
if (-not $pnpmVersion) {
    Write-Warn "PNPM not found"
    Install-Pnpm
    $pnpmVersion = Test-PnpmInstalled
}
if ($pnpmVersion) {
    Write-Success "PNPM version: $pnpmVersion"
}

# ========================================
# Check Docker
# ========================================
function Test-DockerInstalled {
    try {
        $version = docker --version 2>$null
        if ($version) { return $version }
    } catch { }
    return $null
}

function Install-Docker {
    Write-Info "Docker not found. Please install Docker Desktop from https://docker.com"
}

Write-Info "Checking Docker..."
$dockerVersion = Test-DockerInstalled
if (-not $dockerVersion -and -not $SkipDocker) {
    Install-Docker
    Write-Warn "Docker is required for full setup. Skipping with -SkipDocker flag."
}
if ($dockerVersion) {
    Write-Success "Docker: $dockerVersion"
}

# ========================================
# Check Docker Compose
# ========================================
function Test-DockerCompose {
    try {
        $version = docker compose version 2>$null
        if ($version) { return $version }
    } catch { }
    try {
        $version = docker-compose --version 2>$null
        if ($version) { return $version }
    } catch { }
    return $null
}

$composeVersion = Test-DockerCompose
if ($composeVersion) {
    Write-Success "Docker Compose: $composeVersion"
}

# ========================================
# Clone/Verify Repository
# ========================================
Set-Location $InstallPath
Write-Info "Working directory: $InstallPath"

# ========================================
# Create Environment File
# ========================================
Write-Info "Creating environment configuration..."
$envExample = ".env.example"
$envFile = ".env"

if (-not (Test-Path $envFile) -or $Force) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile -Force
        Write-Success "Created .env from template"
    }
}

# ========================================
# Install Dependencies
# ========================================
Write-Info "Installing project dependencies..."
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Failed to install dependencies"
    exit 1
}

Write-Success "Dependencies installed successfully"

# ========================================
# Build Packages
# ========================================
Write-Info "Building shared packages..."
pnpm turbo run build --filter=@qadash/*

Write-Success "Build complete"

# ========================================
# Final Validation
# ========================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    Installation Summary                     " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Success "Node.js: $nodeVersion"
Write-Success "PNPM: $pnpmVersion"
Write-Success "Docker: $dockerVersion"
Write-Success "Project dependencies: Installed"
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Configure .env file with your settings" -ForegroundColor White
Write-Host "  2. Run: .\start.ps1 (Windows) or ./start.sh (Linux/Mac)" -ForegroundColor White
Write-Host "  3. Access dashboard at: http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "For help: .\troubleshoot.ps1" -ForegroundColor Gray
Write-Host ""
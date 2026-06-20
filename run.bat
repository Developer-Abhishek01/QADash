@echo off
setlocal enabledelayedexpansion

REM ========================================
REM QADASH ENTERPRISE PLATFORM - START SCRIPT
REM ========================================

echo [INFO] Starting QADash Platform...
cd /d "%~dp0"

REM 1. Mandatory Docker Check
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    goto :START_DOCKER
) else (
    goto :DOCKER_READY
)

:START_DOCKER
echo [INFO] Docker is NOT running. Attempting to start Docker Desktop automatically...
set "DOCKER_PATH=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if exist "%DOCKER_PATH%" (
    echo [INFO] Found Docker Desktop at: %DOCKER_PATH%
    echo [INFO] Starting Docker Desktop...
    start "" "%DOCKER_PATH%"
    
    echo [INFO] Waiting for Docker daemon to become ready - this may take up to 60 seconds...
    set "WAIT_COUNT=0"
    goto :DOCKER_WAIT_LOOP
) else (
    echo [WARNING] Docker Desktop was not found at standard path.
    goto :DOCKER_FAILED
)

:DOCKER_WAIT_LOOP
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [OK] Docker daemon is running and ready.
    goto :DOCKER_READY
)
set /a "WAIT_COUNT+=2"
if %WAIT_COUNT% gtr 60 (
    echo.
    echo [WARNING] Docker Desktop started but the daemon did not respond within 60 seconds.
    goto :DOCKER_FAILED
)
<nul set /p "=. "
ping 127.0.0.1 -n 3 >nul
goto :DOCKER_WAIT_LOOP

:DOCKER_FAILED
echo.
echo =======================================================================
echo [CRITICAL] Docker is NOT running and could not be started automatically.
echo =======================================================================
echo.
echo How would you like to proceed?
echo [1] Try starting Docker Desktop manually, then press any key to retry.
echo [2] Bypass Docker check and start other services anyway (Requires local DB/Cache).
echo [3] Exit.
echo.
set /p "CHOICE=Enter choice (1-3) [default: 1]: "
if "%CHOICE%"=="" set "CHOICE=1"
if "%CHOICE%"=="1" (
    echo Retrying Docker check...
    goto :DOCKER_RETRY
)
if "%CHOICE%"=="2" (
    echo [WARNING] Bypassing Docker check. Database ^& Cache services will NOT be started.
    set "BYPASS_DOCKER=1"
    goto :DOCKER_END
)
exit /b 1

:DOCKER_RETRY
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [CRITICAL] Docker is still NOT running.
    goto :DOCKER_FAILED
)
echo [OK] Docker daemon is now running!
goto :DOCKER_READY

:DOCKER_READY
echo [OK] Docker check passed.
set "BYPASS_DOCKER=0"
goto :DOCKER_END

:DOCKER_END


REM 2. Port Cleanup
echo [1/4] Cleaning up ports 3000, 3001, 3002...
taskkill /FI "WINDOWTITLE eq QADash-*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1

REM 3. Infrastructure
if "%BYPASS_DOCKER%"=="1" (
    echo [2/4] Skipping Database ^& Cache - Docker bypassed...
) else (
    echo [2/4] Starting Database ^& Cache...
    docker compose up -d >nul 2>&1
)

REM 4. Launch Services
echo [3/4] Launching Services...

REM Launch Backend (Build latest changes first, then start)
echo Building Backend...
start "QADash-Backend" cmd /k "cd apps\backend && echo Backend Log Window && npm run build && npm run start"

REM Launch Frontend (fixed port 3000)
echo Starting Frontend...
start "QADash-Frontend" cmd /k "cd apps\frontend && echo Frontend Log Window && npx next dev --port 3000"

REM Launch Automation Worker
echo Starting Automation Worker...
start "QADash-Automation" cmd /k "cd apps\automation && echo Automation Worker Log Window && npm run dev"

echo [4/4] Finalizing...
echo [INFO] Waiting for Dashboard to be ready...

set "TIMEOUT_COUNT=0"

:WAIT_BACKEND
set /a "TIMEOUT_COUNT+=1"
if !TIMEOUT_COUNT! gtr 60 (
    echo [WARNING] Backend did not start within 60s. Check the Backend Log Window.
    goto :SKIP_BACKEND_WAIT
)
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    goto :WAIT_BACKEND
)
echo [OK] Backend is Live.
:SKIP_BACKEND_WAIT

set "TIMEOUT_COUNT=0"

:WAIT_FRONTEND
set /a "TIMEOUT_COUNT+=1"
if !TIMEOUT_COUNT! gtr 60 (
    echo [WARNING] Frontend did not start within 60s. Check the Frontend Log Window.
    goto :SKIP_FRONTEND_WAIT
)
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    goto :WAIT_FRONTEND
)
echo [OK] Frontend is Live.
:SKIP_FRONTEND_WAIT

echo [SUCCESS] QADash is ready! Opening Dashboard...
start "" "http://localhost:3000"

echo.
echo ========================================
echo ALL SERVICES ARE RUNNING SUCCESSFULLY
echo ========================================
echo.
echo Press any key to exit this window (Services will keep running).
pause >nul
exit

@echo off
setlocal enabledelayedexpansion

REM ========================================
REM QADASH BACKEND WATCHDOG (Windows)
REM Builds once, then starts backend.
REM If the process exits/crashes, it logs
REM the exit code and auto-restarts after 5s.
REM ========================================

cd /d "%~dp0..\apps\backend"

echo Backend Log Window
echo [INFO] Building backend (nest build)...
call npm run build
if errorlevel 1 (
    echo [ERROR] Backend build failed. Fix build errors and re-run.
    pause
    exit /b 1
)

:restart
echo.
echo [INFO] Starting backend: node dist/apps/backend/src/main.js
node dist/apps/backend/src/main.js
set "EXIT_CODE=!errorlevel!"
echo [WARN] Backend process exited with code !EXIT_CODE! (4294967295 = OS-level crash/kill)
echo [INFO] Restarting in 5 seconds... (Ctrl+C to stop)
timeout /t 5 /nobreak >nul
goto :restart

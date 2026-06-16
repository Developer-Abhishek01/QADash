@echo off
cd /d "%~dp0"
echo ========================================
echo  QADash - Test Runner
echo ========================================
echo.
echo [1/3] Installing dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo npm install failed!
    pause
    exit /b 1
)
echo Done.
echo.
echo [2/3] Running unit tests...
call npm run test:unit
if %errorlevel% neq 0 (
    echo Unit tests failed!
    pause
    exit /b %errorlevel%
)
echo.
echo ========================================
echo  All unit tests passed!
echo ========================================
echo NOTE: E2E tests (automation) require
echo Playwright browsers and a running server.
echo Run: npm run test:e2e
echo.
pause

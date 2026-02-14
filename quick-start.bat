@echo off
color 0E
title WorkScanAI - Quick Start

echo.
echo ========================================
echo    WorkScanAI - Quick Start Guide
echo ========================================
echo.
echo This script will help you get started!
echo.
pause

echo.
echo Step 1: Checking backend environment...
echo ----------------------------------------

if not exist backend\venv (
    echo.
    echo [!] Virtual environment not found!
    echo     Installing dependencies now...
    echo.
    call install-backend-deps.bat
) else (
    echo [OK] Virtual environment exists
)

echo.
echo Step 2: Checking .env file...
echo ----------------------------------------

if not exist backend\.env (
    echo.
    echo [!] backend\.env file missing!
    echo.
    echo Please create backend\.env with your Anthropic API key:
    echo.
    echo     ANTHROPIC_API_KEY=your_key_here
    echo     DATABASE_URL=sqlite:///./workscan.db
    echo.
    echo Get your API key from: https://console.anthropic.com/
    echo.
    pause
    notepad backend\.env
) else (
    echo [OK] .env file exists
)

echo.
echo Step 3: Checking frontend dependencies...
echo ----------------------------------------

if not exist frontend\node_modules (
    echo.
    echo [!] Frontend dependencies not installed!
    echo     Installing now...
    echo.
    cd frontend
    call npm install
    cd ..
) else (
    echo [OK] Frontend dependencies installed
)

echo.
echo Step 4: Running integration tests...
echo ----------------------------------------
echo.
echo Starting backend for testing...

start "Test Backend" cmd /c "cd /d %~dp0backend && venv\Scripts\activate && python start.py"

timeout /t 5 /nobreak > nul

echo Running tests...
cd backend
call venv\Scripts\activate
python test_integration.py
cd ..

echo.
echo ========================================
echo.
echo Ready to launch WorkScanAI!
echo.
echo The backend test server will be stopped.
echo We'll start both servers fresh.
echo.
pause

REM Stop the test backend
taskkill /FI "WindowTitle eq Test Backend*" /T /F 2>nul

echo.
echo Launching WorkScanAI...
echo.

call start-all.bat

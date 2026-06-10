@echo off
title WorkScanAI - Full Stack Server
color 0A

echo ================================================
echo          WorkScanAI Server Launcher
echo ================================================
echo.

REM Check if backend virtual environment exists
if not exist backend\venv (
    echo ERROR: Backend virtual environment not found!
    echo Please run install-backend-deps.bat first
    echo.
    pause
    exit /b 1
)

REM Check if frontend node_modules exists
if not exist frontend\node_modules (
    echo ERROR: Frontend dependencies not installed!
    echo Please run: cd frontend ^&^& npm install
    echo.
    pause
    exit /b 1
)

echo Starting backend server on port 8000...
start "WorkScanAI Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python start.py"

timeout /t 3 /nobreak > nul

echo Starting frontend server on port 3000...
start "WorkScanAI Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================================
echo Both servers are starting...
echo ================================================
echo.
echo Backend API: http://localhost:8000
echo Frontend UI: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to open the application in your browser...
pause > nul

start http://localhost:3000

echo.
echo Servers are running. Close this window to stop both servers.
echo.
pause

# WorkScanAI Backend Startup Script
Write-Host "Starting WorkScanAI Backend..." -ForegroundColor Green

# Change to backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Start the server
Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
python start.py

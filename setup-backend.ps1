# WorkScanAI Backend Setup Script
# Run this to initialize the Python backend

Write-Host "Setting up WorkScanAI Backend..." -ForegroundColor Green

# Navigate to backend directory
Set-Location C:\Users\damya\Projects\workscanai\backend

# Create virtual environment
Write-Host "`nCreating Python virtual environment..." -ForegroundColor Cyan
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1

# Create requirements.txt
Write-Host "`nCreating requirements.txt..." -ForegroundColor Cyan
@"
# FastAPI Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1

# AI/LLM
anthropic==0.18.1
langchain==0.1.6
langchain-anthropic==0.1.4

# Utilities
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0

# CORS
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Testing
pytest==7.4.4
httpx==0.26.0
"@ | Out-File -FilePath requirements.txt -Encoding UTF8

# Install dependencies
Write-Host "`nInstalling Python dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "`n✅ Backend setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Keep this terminal open (venv is activated)" -ForegroundColor Yellow
Write-Host "2. Run: uvicorn app.main:app --reload" -ForegroundColor Yellow
Write-Host "3. API will be at http://localhost:8000" -ForegroundColor Yellow

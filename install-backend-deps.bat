@echo off
echo Installing WorkScanAI Backend Dependencies...
echo.

cd backend

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
)

echo.
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing dependencies from requirements.txt...
pip install --break-system-packages -r requirements.txt

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo To start the backend server, run:
echo   cd backend
echo   venv\Scripts\activate
echo   python start.py
echo.
pause

@echo off
echo Starting WorkScanAI Backend...
cd /d "%~dp0"
call venv\Scripts\activate.bat
python start.py

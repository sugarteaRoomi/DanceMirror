@echo off
cd /d "%~dp0"
if not exist videos mkdir videos

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Installing Python...
    winget install Python.Python.3.12 --silent --accept-package-agreements
    echo Python installed. Please restart this file.
    pause
    exit /b 1
)

:: Install dependencies if needed
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Installing app dependencies...
    pip install flask flask-cors yt-dlp
)

echo Starting DanceMirror...
start http://127.0.0.1:5000
python server\server.py
pause

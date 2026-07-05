@echo off
setlocal
set "APP_DIR=%APPDATA%\DanceMirror"
echo Installing Dance Mirror to %APP_DIR%...

:: Copy app files
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
xcopy /e /i /q "%~dp0." "%APP_DIR%"

:: Install Python if needed
python --version >nul 2>&1
if errorlevel 1 (
    echo Installing Python...
    winget install Python.Python.3.12 --silent --accept-package-agreements
    echo Please restart this installer after Python finishes installing.
    pause
    exit /b 1
)

:: Install dependencies
python -c "import flask" >nul 2>&1
if errorlevel 1 pip install flask flask-cors yt-dlp

:: Create desktop shortcut
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Dance Mirror.lnk"
set "VBS=%APP_DIR%\Start.vbs"
echo Set shell = CreateObject("WScript.Shell") > "%TEMP%\dm_shortcut.vbs"
echo Set link = shell.CreateShortcut("%SHORTCUT%") >> "%TEMP%\dm_shortcut.vbs"
echo link.TargetPath = "%VBS%" >> "%TEMP%\dm_shortcut.vbs"
echo link.WorkingDirectory = "%APP_DIR%" >> "%TEMP%\dm_shortcut.vbs"
echo link.IconLocation = "shell32.dll,13" >> "%TEMP%\dm_shortcut.vbs"
echo link.Save >> "%TEMP%\dm_shortcut.vbs"
cscript //nologo "%TEMP%\dm_shortcut.vbs"
del "%TEMP%\dm_shortcut.vbs"

echo.
echo Installed. Launch from the Dance Mirror icon on your desktop.
echo You can delete the zip and this folder now.
pause

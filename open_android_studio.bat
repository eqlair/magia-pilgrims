@echo off
cd /d "%~dp0"
echo ========================================
echo  Opening Android Studio...
echo ========================================
call npx cap open android
if %ERRORLEVEL% neq 0 (
    echo.
    echo [INFO] Direct launching Android Studio...
    start "" "C:\Program Files\Android\Android Studio\bin\studio64.exe" "%~dp0android"
)

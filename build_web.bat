@echo off
cd /d "%~dp0"
echo ========================================
echo  Magia Pilgrims - Web Build
echo ========================================
call npm run build
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Web build completed! Check 'dist' folder.
) else (
    echo.
    echo [ERROR] Web build failed.
)
echo.
if "%1" neq "--no-pause" pause

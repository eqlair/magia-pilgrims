@echo off
cd /d "%~dp0"
echo ========================================
echo  Magia Pilgrims - Android APK Build
echo ========================================

echo [1/3] Building Web assets...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Syncing Capacitor Android...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Building Debug APK with Gradle...
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd android
call gradlew.bat assembleDebug
set GRADLE_ERR=%ERRORLEVEL%
cd ..

if %GRADLE_ERR% equ 0 (
    echo.
    echo ========================================
    echo  [SUCCESS] APK build completed!
    echo  Output: android\app\build\outputs\apk\debug\magia_pilgrims-debug.apk
    echo ========================================
) else (
    echo.
    echo [ERROR] Gradle APK build failed.
)
echo.
if "%1" neq "--no-pause" pause

@echo off
chcp 65001 > nul
echo ===================================================
echo   Magia Pilgrims - Android APK Build Script
echo ===================================================

cd /d "%~dp0"

echo [1/3] Web アセットをビルド中 (vite build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web ビルドに失敗しました。
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Android プロジェクトへ同期中 (cap sync android)...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Android 同期に失敗しました。
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Android APK をビルド中 (gradlew assembleDebug)...
cd android
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo [ERROR] Gradle ビルドに失敗しました。
    pause
    exit /b %errorlevel%
)

cd ..
echo.
echo ===================================================
echo   ビルド成功！
echo   出力先: android\app\build\outputs\apk\debug\magia_pilgrims-debug.apk
echo ===================================================
echo.
pause

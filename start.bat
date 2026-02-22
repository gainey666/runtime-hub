@echo off
echo ========================================
echo   Runtime Hub - Quick Starter
echo ========================================
echo.

echo [1/3] Starting Main Server (port 3000)...
start "Main Server" cmd /k "node src/server.js"
timeout /t 2 >nul

echo [2/3] Starting Auto-Clicker API (port 3001)...
start "Auto-Clicker API" cmd /k "node src/auto-clicker-api.js"
timeout /t 2 >nul

echo [3/3] Opening Browser...
timeout /t 2 >nul
start http://localhost:3000/node-editor
start http://localhost:3000/auto-clicker-test.html

echo.
echo ========================================
echo   All Systems Started!
echo ========================================
echo.
echo   Node Editor:       http://localhost:3000/node-editor
echo   Auto-Clicker Test: http://localhost:3000/auto-clicker-test.html
echo   Enhanced Dashboard: http://localhost:3000/enhanced-dashboard.html
echo.
echo   To run tests:      node test-everything.js
echo.
echo   Press Ctrl+C in each window to stop servers
echo ========================================

@echo off
REM =============================================================
REM Expense Management - Dev Launcher
REM   backend  : http://localhost:3001
REM   frontend : http://localhost:5173  (open this in your browser)
REM Press Ctrl+C in each window to stop the dev servers.
REM =============================================================
REM Prerequisites (run these once before launching this script):
REM   1. Install Node.js to NODE_DIR below (default C:\Program Files\nodejs)
REM   2. cd backend ^&^& copy .env.sample .env
REM   3. cd backend ^&^& npm install
REM   4. cd backend ^&^& npm run seed   (schema + migrations + initial users)
REM   5. cd frontend ^&^& npm install
REM This script does NOT run install/seed; it only launches dev servers.
REM =============================================================

setlocal
set "PROJECT_ROOT=%~dp0"
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

echo [start.bat] Starting backend on port 3001 ...
start "expense-backend" cmd /k "cd /d %PROJECT_ROOT%backend && set PATH=%NODE_DIR%;%PATH% && npm run dev"

REM Wait a bit so the backend can begin listening
timeout /t 3 /nobreak >nul

echo [start.bat] Starting frontend on port 5173 ...
start "expense-frontend" cmd /k "cd /d %PROJECT_ROOT%frontend && set PATH=%NODE_DIR%;%PATH% && npm run dev"

REM Open the app in the default browser
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Launched.  Frontend: http://localhost:5173    Backend: http://localhost:3001
echo Press Ctrl+C inside each window to stop.
endlocal

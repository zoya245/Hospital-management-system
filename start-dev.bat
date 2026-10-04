@echo off
echo ========================================================
echo Starting Pulse Hospital Management System...
echo ========================================================

echo [1/2] Starting Backend API (Port 3001)...
start "Pulse HMS Backend (Port 3001)" cmd /k "cd hospital-api && node server.js"

echo [2/2] Starting Frontend App (Port 5173)...
start "Pulse HMS Frontend (Port 5173)" cmd /k "cd hospital-frontend && npm run dev"

echo.
echo Both services have been launched in separate windows!
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
pause

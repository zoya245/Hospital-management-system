Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Pulse Hospital Management System..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting Backend API (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd hospital-api; node server.js"

Write-Host "[2/2] Starting Frontend App (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd hospital-frontend; npm run dev"

Write-Host "`nBoth services have been launched in separate windows!" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green

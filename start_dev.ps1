# start_dev.ps1 - Kingston's Portal Development Environment Launcher

Write-Host "Kingston's Portal - Starting Development Environment" -ForegroundColor Green
Write-Host "Project Directory: $(Get-Location)" -ForegroundColor Yellow

# Backend Terminal Commands
$backendCommands = @"
Write-Host 'Setting up Backend Environment...' -ForegroundColor Cyan
cd backend
if (Test-Path 'venv\Scripts\activate') {
    Write-Host 'Activating Python virtual environment...' -ForegroundColor Green
    .\venv\Scripts\activate
    Write-Host 'Installing/updating dependencies...' -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host 'Starting FastAPI backend server...' -ForegroundColor Green
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
} else {
    Write-Host 'Virtual environment not found! Creating one...' -ForegroundColor Red
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt
    Write-Host 'Starting FastAPI backend server...' -ForegroundColor Green
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
}
"@

# Frontend Terminal Commands
$frontendCommands = @"
Write-Host 'Setting up Frontend Environment...' -ForegroundColor Cyan
cd frontend
Write-Host 'Installing Node.js dependencies...' -ForegroundColor Yellow
npm install
Write-Host 'Starting React development server...' -ForegroundColor Green
npm start
"@

# Start Backend Terminal
Write-Host "Starting Backend Terminal..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommands

# Wait a moment before starting frontend
Start-Sleep -Seconds 2

# Start Frontend Terminal
Write-Host "Starting Frontend Terminal..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommands

Write-Host "`nDevelopment environment launched!" -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor White
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor White
Write-Host "API Documentation at: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nClose the terminal windows to stop the servers" -ForegroundColor Yellow 
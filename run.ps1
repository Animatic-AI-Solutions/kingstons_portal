# run_dev.ps1 - Kingston's Portal Development Script

Write-Host "🏦 Kingston's Portal - Starting Development Environment" -ForegroundColor Green

# Navigate to your project directory
$PROJECT_PATH = "C:\Users\Jacob\Documents\git\kingstons_portal\kingstons_portal"
Set-Location $PROJECT_PATH

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Yellow

# Backend setup and start
Write-Host "`n🔧 Setting up Backend..." -ForegroundColor Cyan
Set-Location "backend"

# Check if virtual environment exists
if (Test-Path "venv\Scripts\activate") {
    Write-Host "🐍 Activating Python virtual environment..." -ForegroundColor Green
    & "venv\Scripts\activate"
    
    Write-Host "📦 Installing/updating dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    
    Write-Host "🚀 Starting FastAPI backend server..." -ForegroundColor Green
    # Start backend in background
    Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; venv\Scripts\activate; uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal
    
    Write-Host "✅ Backend server started on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "❌ Virtual environment not found! Creating one..." -ForegroundColor Red
    python -m venv venv
    & "venv\Scripts\activate"
    pip install -r requirements.txt
}

# Give backend time to start
Start-Sleep -Seconds 3

# Frontend setup and start
Write-Host "`n🎨 Setting up Frontend..." -ForegroundColor Cyan
Set-Location "..\frontend"

Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🚀 Starting React development server..." -ForegroundColor Green
# Start frontend
Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm start" -WindowStyle Normal

Write-Host "✅ Frontend server started on http://localhost:3000" -ForegroundColor Green

Write-Host "`n🎉 Both servers are now running!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "⚡ Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor White

Write-Host "`nPress any key to stop all servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop servers
Write-Host "🛑 Stopping servers..." -ForegroundColor Red
Get-Process | Where-Object {$_.ProcessName -eq "node" -or $_.ProcessName -eq "python"} | Stop-Process -Force
Write-Host "✅ All servers stopped." -ForegroundColor Green
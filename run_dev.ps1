# PowerShell script to start backend and frontend development servers

# Start Backend
Write-Host "Starting Backend Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\\venv/Scripts/Activate.ps1; uvicorn main:app --reload"

# Start Frontend
Write-Host "Starting Frontend Development Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host "Both servers are starting in new windows." 
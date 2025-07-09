# Kingston's Portal - Minimal Production Deployment Script
# This script follows the user's original requirements exactly

# Check if running as administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator for IIS reset" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting Kingston's Portal Production Deployment..." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Step 1: Git Pull
Write-Host ""
Write-Host "1. Pulling latest changes from repository..." -ForegroundColor Cyan
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git pull failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: Git pull completed" -ForegroundColor Green

# Step 2: Install Python dependencies
Write-Host ""
Write-Host "2. Installing Python dependencies..." -ForegroundColor Cyan
Set-Location backend

if (-not (Test-Path "venv")) {
    Write-Host "ERROR: Virtual environment not found in backend directory" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}

& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Pip install failed" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location ..
Write-Host "SUCCESS: Python dependencies installed" -ForegroundColor Green

# Step 3: Install Node.js dependencies
Write-Host ""
Write-Host "3. Installing Node.js dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..
Write-Host "SUCCESS: Node.js dependencies installed" -ForegroundColor Green

# Step 4: Build frontend
Write-Host ""
Write-Host "4. Building frontend for production..." -ForegroundColor Cyan
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm build failed" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..
Write-Host "SUCCESS: Frontend build completed" -ForegroundColor Green

# Step 5: Copy backend folder to production location
Write-Host ""
Write-Host "5. Copying backend to production location..." -ForegroundColor Cyan
$destinationPath = "C:\Apps\portal_api\backend"

# Create destination directory if it doesn't exist
if (-not (Test-Path $destinationPath)) {
    New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
}

# Backup .env file if it exists
if (Test-Path "$destinationPath\.env") {
    Copy-Item "$destinationPath\.env" "$destinationPath\.env.backup" -Force
}

# Copy backend files
Copy-Item -Path "backend\*" -Destination $destinationPath -Recurse -Force -Exclude "venv"

# Restore .env file
if (Test-Path "$destinationPath\.env.backup") {
    Copy-Item "$destinationPath\.env.backup" "$destinationPath\.env" -Force
    Remove-Item "$destinationPath\.env.backup" -Force
}

Write-Host "SUCCESS: Backend files copied to $destinationPath" -ForegroundColor Green

# Step 6: Install production dependencies
Write-Host ""
Write-Host "6. Installing production dependencies..." -ForegroundColor Cyan
Push-Location $destinationPath

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    python -m venv venv
}

# Install dependencies
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Production pip install failed" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}

Pop-Location
Write-Host "SUCCESS: Production dependencies installed" -ForegroundColor Green

# Step 7: Restart service
Write-Host ""
Write-Host "7. Restarting Kingston Portal API service..." -ForegroundColor Cyan
$serviceName = "Kingston Portal API"

# Check if service exists
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "Service found. Stopping service..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    
    Write-Host "Starting service..." -ForegroundColor Yellow
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 5
    
    # Check status
    $service = Get-Service -Name $serviceName
    if ($service.Status -eq "Running") {
        Write-Host "SUCCESS: Service is running" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Service status is $($service.Status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: Service not found. You may need to set it up manually." -ForegroundColor Yellow
    Write-Host "Run setup_service.ps1 to configure the Windows service." -ForegroundColor Yellow
}

# Step 8: IIS Reset
Write-Host ""
Write-Host "8. Restarting IIS..." -ForegroundColor Cyan
iisreset
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: IIS reset failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: IIS restarted" -ForegroundColor Green

# Completion message
Write-Host ""
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "Frontend: http://intranet.kingston.local" -ForegroundColor Yellow
Write-Host "Backend API: http://intranet.kingston.local:8001/docs" -ForegroundColor Yellow
Write-Host "Backend Location: C:\Apps\portal_api" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit" 
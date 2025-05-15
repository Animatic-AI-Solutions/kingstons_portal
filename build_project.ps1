# PowerShell script to build the backend and frontend, including installing dependencies.

# Get the directory where the script is located to ensure relative paths work
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "====================================="
Write-Host "Starting Project Build Process"
Write-Host "====================================="

# --- Backend Build ---
Write-Host ""
Write-Host "-------------------------------------"
Write-Host "Building Backend..."
Write-Host "-------------------------------------"
Push-Location "$ScriptDir\backend"

# Check and create/activate Python virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "Python virtual environment 'venv' not found. Creating one..."
    try {
        python -m venv venv
        Write-Host "Virtual environment created."
    } catch {
        Write-Error "Failed to create Python virtual environment. Please ensure Python (python3) and the 'venv' module are installed and available in your PATH."
        Pop-Location
        exit 1
    }
}

Write-Host "Activating Python virtual environment..."
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    try {
        .\venv\Scripts\Activate.ps1
    } catch {
        Write-Error "ERROR: Failed to activate virtual environment from .\venv\Scripts\Activate.ps1"
        Pop-Location
        exit 1
    }
} else {
    Write-Error "ERROR: .\venv\Scripts\Activate.ps1 not found. Cannot activate virtual environment."
    Pop-Location
    exit 1
}

Write-Host "Installing backend Python dependencies from requirements.txt..."
if (Test-Path "requirements.txt") {
    try {
        pip install -r requirements.txt
        Write-Host "Backend dependencies installed."
    } catch {
        Write-Error "Failed to install backend dependencies using pip."
        Pop-Location
        exit 1
    }
} else {
    Write-Warning "requirements.txt not found in backend directory. Skipping pip install."
}

# Deactivating venv in PowerShell is often just exiting the script or current scope where it was activated.
# If you need explicit deactivation, you might have to call a deactivate function if your venv provides one for PowerShell,
# but usually it's not required for script completion.

Write-Host "Backend setup complete."
Pop-Location # Go back to root

# --- Frontend Build ---
Write-Host ""
Write-Host "--------------------------------------"
Write-Host "Building Frontend..."
Write-Host "--------------------------------------"
Push-Location "$ScriptDir\frontend"

Write-Host "Installing frontend Node.js dependencies..."
if (Test-Path "package-lock.json") {
    Write-Host "Found package-lock.json, using 'npm ci' for clean install..."
    try {
        npm ci
    } catch {
        Write-Error "Failed to install frontend dependencies using 'npm ci'."
        Pop-Location
        exit 1
    }
} else {
    Write-Host "package-lock.json not found, using 'npm install'..."
    try {
        npm install
    } catch {
        Write-Error "Failed to install frontend dependencies using 'npm install'."
        Pop-Location
        exit 1
    }
}
Write-Host "Frontend dependencies installed."

Write-Host "Building frontend application (npm run build)..."
try {
    npm run build
    Write-Host "Frontend application built."
} catch {
    Write-Error "Failed to build frontend application using 'npm run build'."
    Pop-Location
    exit 1
}

Write-Host "Frontend setup complete."
Pop-Location # Go back to root

Write-Host ""
Write-Host "====================================="
Write-Host "Project Build Process Completed Successfully!"
Write-Host "=====================================" 
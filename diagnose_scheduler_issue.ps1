Write-Host "=== SCHEDULED TASK DIAGNOSTIC ===" -ForegroundColor Cyan

# Create log file
$logFile = "C:\Users\kingstonadmin\Documents\kingstons_portal\scheduler_diagnostic.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Function to log and display
function LogAndShow($message, $color = "White") {
    Write-Host $message -ForegroundColor $color
    "$timestamp - $message" | Out-File -FilePath $logFile -Append
}

LogAndShow "Starting diagnostic..." "Green"

# 1. Check current user context
LogAndShow "Current User: $env:USERNAME" "Yellow"
LogAndShow "User Profile: $env:USERPROFILE" "Yellow"

# 2. Check PostgreSQL tools
try {
    $pgVersion = & pg_dump --version 2>$null
    LogAndShow "PostgreSQL: $pgVersion" "Green"
} catch {
    LogAndShow "PostgreSQL: NOT FOUND IN PATH" "Red"
    
    # Check common paths
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin", 
        "C:\Program Files\PostgreSQL\15\bin"
    )
    
    foreach ($path in $pgPaths) {
        if (Test-Path "$path\pg_dump.exe") {
            LogAndShow "Found PostgreSQL at: $path" "Yellow"
        }
    }
}

# 3. Check .env file
$envPath = "C:\Users\kingstonadmin\Documents\kingstons_portal\.env"
if (Test-Path $envPath) {
    LogAndShow ".env file: EXISTS" "Green"
    
    # Load environment variables
    $envContent = Get-Content $envPath
    $hasPassword = $false
    $hasDbUrl = $false
    
    foreach ($line in $envContent) {
        if ($line.StartsWith("PGPASSWORD=")) {
            $hasPassword = $true
        }
        if ($line.StartsWith("DATABASE_URL=")) {
            $hasDbUrl = $true
        }
    }
    
    LogAndShow "Has PGPASSWORD: $hasPassword" "Gray"
    LogAndShow "Has DATABASE_URL: $hasDbUrl" "Gray"
} else {
    LogAndShow ".env file: NOT FOUND at $envPath" "Red"
}

# 4. Test database connection as current user
$env:PGPASSWORD = "KingstonApp2024!"
try {
    $result = & psql -h localhost -p 5432 -U kingstons_app -d kingstons_portal -c "SELECT 'SUCCESS' as test;" -t 2>$null
    if ($LASTEXITCODE -eq 0) {
        LogAndShow "Database connection: SUCCESS" "Green"
    } else {
        LogAndShow "Database connection: FAILED (exit code: $LASTEXITCODE)" "Red"
    }
} catch {
    LogAndShow "Database connection: ERROR - $($_.Exception.Message)" "Red"
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# 5. Check backup directories
$backupDir = "C:\Database_Backups\KingstonsPortal"
if (Test-Path $backupDir) {
    LogAndShow "Backup directory: EXISTS" "Green"
} else {
    LogAndShow "Backup directory: DOES NOT EXIST" "Red"
    try {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        New-Item -ItemType Directory -Path "$backupDir\Daily" -Force | Out-Null
        LogAndShow "Created backup directories" "Yellow"
    } catch {
        LogAndShow "Failed to create backup directories" "Red"
    }
}

LogAndShow "Diagnostic completed. Check log: $logFile" "Cyan"
Write-Host "`nPress Enter to continue..."
Read-Host
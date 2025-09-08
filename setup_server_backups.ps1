# ============================================================================
# KINGSTON'S PORTAL - SERVER BACKUP SETUP SCRIPT
# ============================================================================
# This PowerShell script sets up automated backups on the database server
# Run this script ON the database server (192.168.0.223) as Administrator
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "KINGSTON'S PORTAL - DATABASE BACKUP SETUP" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Configuration
$BackupBaseDir = "C:\Database_Backups\KingstonsPortal"
$ScriptsDir = "C:\Database_Scripts"

Write-Host "Creating backup directories..." -ForegroundColor Green

# Create directories
$directories = @($BackupBaseDir, "$BackupBaseDir\Daily", "$BackupBaseDir\Weekly", "$BackupBaseDir\Monthly", $ScriptsDir)
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    } else {
        Write-Host "  Exists: $dir" -ForegroundColor Gray
    }
}

Write-Host "`nSetting up Windows Task Scheduler jobs..." -ForegroundColor Green

# Create daily backup task
$DailyAction = New-ScheduledTaskAction -Execute "C:\Database_Scripts\database_backup_daily.bat" -Argument "silent"
$DailyTrigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
$DailySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
$DailyPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    Register-ScheduledTask -TaskName "KingstonsPortal-DailyBackup" -Action $DailyAction -Trigger $DailyTrigger -Settings $DailySettings -Principal $DailyPrincipal -Force
    Write-Host "  + Daily backup task created (runs at 2:00 AM every day)" -ForegroundColor Green
} catch {
    Write-Host "  X Failed to create daily backup task: $($_.Exception.Message)" -ForegroundColor Red
}

# Create weekly backup task (Sundays at 3:00 AM)
$WeeklyAction = New-ScheduledTaskAction -Execute "C:\Database_Scripts\database_backup_weekly.bat" -Argument "silent"
$WeeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "03:00AM"
$WeeklySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
$WeeklyPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    Register-ScheduledTask -TaskName "KingstonsPortal-WeeklyBackup" -Action $WeeklyAction -Trigger $WeeklyTrigger -Settings $WeeklySettings -Principal $WeeklyPrincipal -Force
    Write-Host "  + Weekly backup task created (runs at 3:00 AM every Sunday)" -ForegroundColor Green
} catch {
    Write-Host "  X Failed to create weekly backup task: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nChecking PostgreSQL installation..." -ForegroundColor Green

# Check if pg_dump is available
try {
    $pgDumpVersion = & pg_dump --version 2>$null
    Write-Host "  + PostgreSQL tools found: $pgDumpVersion" -ForegroundColor Green
} catch {
    Write-Host "  X PostgreSQL tools (pg_dump) not found in PATH!" -ForegroundColor Red
    Write-Host "    Please ensure PostgreSQL client tools are installed and in PATH" -ForegroundColor Yellow
    Write-Host "    Common locations:" -ForegroundColor Yellow
    Write-Host "      C:\Program Files\PostgreSQL\<version>\bin" -ForegroundColor Gray
    Write-Host "      C:\PostgreSQL\<version>\bin" -ForegroundColor Gray
}

Write-Host "`nTesting database connection..." -ForegroundColor Green

# Load environment variables from .env file
$envVars = @{}
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $value = $value -replace '^["''](.*)["'']$', '$1'
            $envVars[$key] = $value
        }
    }
} else {
    Write-Host "  X .env file not found!" -ForegroundColor Red
}

# Test database connection
if ($envVars.ContainsKey("PGPASSWORD")) {
    $env:PGPASSWORD = $envVars["PGPASSWORD"]
} else {
    Write-Host "  X PGPASSWORD not found in .env file!" -ForegroundColor Red
}
try {
    $testResult = & psql -h localhost -p 5432 -U kingstons_app -d kingstons_portal -c "SELECT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  + Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "  X Database connection failed" -ForegroundColor Red
        Write-Host "    Please verify database server is running and credentials are correct" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  X Cannot test database connection: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`nCreating .pgpass file for secure authentication..." -ForegroundColor Green

# Create .pgpass file for secure authentication (alternative to environment variable)
$pgpassPassword = if ($envVars.ContainsKey("PGPASSWORD")) { $envVars["PGPASSWORD"] } else { "KingstonApp2024!" }
$pgpassContent = "localhost:5432:kingstons_portal:kingstons_app:$pgpassPassword"
$pgpassPath = "$env:APPDATA\.pgpass"
try {
    $pgpassContent | Set-Content -Path $pgpassPath -Encoding ASCII
    # Set file permissions (Windows equivalent)
    $acl = Get-Acl $pgpassPath
    $acl.SetAccessRuleProtection($true, $false)  # Disable inheritance
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $pgpassPath -AclObject $acl
    Write-Host "  + Created .pgpass file at $pgpassPath" -ForegroundColor Green
} catch {
    Write-Host "  X Failed to create .pgpass file: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nSetup Summary:" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Backup Location: $BackupBaseDir" -ForegroundColor White
Write-Host "Scripts Location: $ScriptsDir" -ForegroundColor White
Write-Host ""
Write-Host "SCHEDULED TASKS:" -ForegroundColor Yellow
Write-Host "  - Daily backups: Every day at 2:00 AM" -ForegroundColor White
Write-Host "  - Weekly backups: Every Sunday at 3:00 AM" -ForegroundColor White
Write-Host "  - Monthly backups: Automatic (first week of each month)" -ForegroundColor White
Write-Host ""
Write-Host "RETENTION POLICY:" -ForegroundColor Yellow
Write-Host "  - Daily backups: 7 days" -ForegroundColor White
Write-Host "  - Weekly backups: 4 weeks (28 days)" -ForegroundColor White
Write-Host "  - Monthly backups: 12 months" -ForegroundColor White
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Copy the .bat script files to $ScriptsDir" -ForegroundColor White
Write-Host "2. Run a test backup: $ScriptsDir\database_backup_daily.bat" -ForegroundColor White
Write-Host "3. Verify backups are created in $BackupBaseDir" -ForegroundColor White
Write-Host "4. Test restore procedure with: $ScriptsDir\database_restore.bat" -ForegroundColor White
Write-Host ""

Write-Host "MONITORING:" -ForegroundColor Yellow
Write-Host "- Check logs: $BackupBaseDir\backup_log.txt" -ForegroundColor White
Write-Host "- View scheduled tasks: Task Scheduler > KingstonsPortal-*" -ForegroundColor White
Write-Host ""

Write-Host "============================================================================" -ForegroundColor Cyan

Read-Host "Press Enter to continue"
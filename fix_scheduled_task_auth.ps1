# Fix Scheduled Task Authentication Issues
# Run as Administrator

Write-Host "Fixing Scheduled Task Authentication..." -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Configuration
$currentUser = $env:USERNAME
$currentDomain = $env:USERDOMAIN
$scriptPath = "C:\Users\kingstonadmin\Documents\kingstons_portal"
$password = "KingstonApp2024!"

Write-Host "`n1. Creating .pgpass file for SYSTEM user..." -ForegroundColor Yellow

# Create .pgpass content
$pgpassContent = "localhost:5432:kingstons_portal:kingstons_app:$password"

# SYSTEM user profile locations to try
$systemPgpassPaths = @(
    "C:\Windows\System32\config\systemprofile\AppData\Roaming\.pgpass",
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\.pgpass", 
    "C:\Windows\ServiceProfiles\NetworkService\AppData\Roaming\.pgpass"
)

foreach ($pgpassPath in $systemPgpassPaths) {
    try {
        # Create directory if it doesn't exist
        $directory = Split-Path $pgpassPath -Parent
        if (!(Test-Path $directory)) {
            New-Item -ItemType Directory -Path $directory -Force | Out-Null
        }
        
        # Create .pgpass file
        $pgpassContent | Set-Content -Path $pgpassPath -Encoding ASCII -Force
        Write-Host "  Created: $pgpassPath" -ForegroundColor Green
    } catch {
        Write-Host "  Failed: $pgpassPath - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n2. Updating scheduled tasks to run under current user..." -ForegroundColor Yellow

# Get current user's password (you'll need to enter it)
Write-Host "To run the backup under your account, we need your Windows password."
$securePassword = Read-Host "Enter password for $currentDomain\$currentUser" -AsSecureString
$credential = New-Object System.Management.Automation.PSCredential("$currentDomain\$currentUser", $securePassword)

# Update Daily Backup Task
try {
    $dailyTask = Get-ScheduledTask -TaskName "KingstonsPortal-DailyBackup" -ErrorAction SilentlyContinue
    if ($dailyTask) {
        # Update to use the scheduler-optimized script
        $dailyAction = New-ScheduledTaskAction -Execute "$scriptPath\database_backup_daily_scheduler_fixed.bat" -Argument "silent"
        $dailyPrincipal = New-ScheduledTaskPrincipal -UserId "$currentDomain\$currentUser" -LogonType Password
        
        Set-ScheduledTask -TaskName "KingstonsPortal-DailyBackup" -Action $dailyAction -Principal $dailyPrincipal -User "$currentDomain\$currentUser" -Password ([System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)))
        
        Write-Host "  ✓ Updated daily backup task to run as $currentDomain\$currentUser" -ForegroundColor Green
    } else {
        # Create new task with user account
        $dailyAction = New-ScheduledTaskAction -Execute "$scriptPath\database_backup_daily_scheduler_fixed.bat" -Argument "silent"
        $dailyTrigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
        $dailySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $dailyPrincipal = New-ScheduledTaskPrincipal -UserId "$currentDomain\$currentUser" -LogonType Password
        
        Register-ScheduledTask -TaskName "KingstonsPortal-DailyBackup" -Action $dailyAction -Trigger $dailyTrigger -Settings $dailySettings -Principal $dailyPrincipal -User "$currentDomain\$currentUser" -Password ([System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)))
        
        Write-Host "  ✓ Created daily backup task to run as $currentDomain\$currentUser" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Failed to update daily backup task: $($_.Exception.Message)" -ForegroundColor Red
}

# Update Weekly Backup Task  
try {
    $weeklyTask = Get-ScheduledTask -TaskName "KingstonsPortal-WeeklyBackup" -ErrorAction SilentlyContinue
    if ($weeklyTask) {
        $weeklyAction = New-ScheduledTaskAction -Execute "$scriptPath\database_backup_weekly.bat" -Argument "silent" 
        $weeklyPrincipal = New-ScheduledTaskPrincipal -UserId "$currentDomain\$currentUser" -LogonType Password
        
        Set-ScheduledTask -TaskName "KingstonsPortal-WeeklyBackup" -Action $weeklyAction -Principal $weeklyPrincipal -User "$currentDomain\$currentUser" -Password ([System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)))
        
        Write-Host "  ✓ Updated weekly backup task to run as $currentDomain\$currentUser" -ForegroundColor Green
    } else {
        # Create new weekly task
        $weeklyAction = New-ScheduledTaskAction -Execute "$scriptPath\database_backup_weekly.bat" -Argument "silent"
        $weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "03:00AM"
        $weeklySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $weeklyPrincipal = New-ScheduledTaskPrincipal -UserId "$currentDomain\$currentUser" -LogonType Password
        
        Register-ScheduledTask -TaskName "KingstonsPortal-WeeklyBackup" -Action $weeklyAction -Trigger $weeklyTrigger -Settings $weeklySettings -Principal $weeklyPrincipal -User "$currentDomain\$currentUser" -Password ([System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)))
        
        Write-Host "  ✓ Created weekly backup task to run as $currentDomain\$currentUser" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Failed to update weekly backup task: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Verifying task configuration..." -ForegroundColor Yellow

$tasks = @("KingstonsPortal-DailyBackup", "KingstonsPortal-WeeklyBackup")
foreach ($taskName in $tasks) {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        $principal = $task.Principal
        Write-Host "  $taskName - User: $($principal.UserId)" -ForegroundColor Gray
    }
}

Write-Host "`nFix completed! Now test the backup:" -ForegroundColor Cyan
Write-Host "  schtasks /run /tn `"KingstonsPortal-DailyBackup`"" -ForegroundColor Gray

Read-Host "`nPress Enter to continue"
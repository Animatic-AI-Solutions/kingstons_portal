# Setup Organized Backup System with Daily/Weekly/Monthly Structure
# Run as Administrator

Write-Host "Setting up Organized Backup System..." -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$scriptPath = "C:\Users\kingstonadmin\Documents\kingstons_portal\database_backup_organized.ps1"

# Remove existing backup tasks
Write-Host "Removing existing backup tasks..." -ForegroundColor Yellow
$existingTasks = @(
    "KingstonsPortal-DailyBackup",
    "KingstonsPortal-WeeklyBackup", 
    "KingstonsPortal-DailyBackup-Working",
    "KingstonsPortal-DailyBackup-System",
    "KingstonsPortal-DailyBackup-Organized",
    "KingstonsPortal-WeeklyBackup-Organized"
)

foreach ($taskName in $existingTasks) {
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "Removed: $taskName" -ForegroundColor Gray
    } catch {
        # Task didn't exist
    }
}

# Create backup directory structure
$backupBaseDir = "C:\DatabaseBackups\KingstonsPortal"
$directories = @("$backupBaseDir", "$backupBaseDir\Daily", "$backupBaseDir\Weekly", "$backupBaseDir\Monthly")

Write-Host "Creating organized backup directories..." -ForegroundColor Green
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        icacls $dir /grant "Everyone:(OI)(CI)F" /T | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    } else {
        Write-Host "  Exists: $dir" -ForegroundColor Gray
    }
}

# Create Daily Backup Task (runs at 2:00 AM every day)
Write-Host "`nCreating Daily Backup Task..." -ForegroundColor Green
try {
    $dailyAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`" -BackupType daily -Mode silent"
    $dailyTrigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
    $dailySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    $dailyPrincipal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName "KingstonsPortal-DailyBackup-Organized" -Action $dailyAction -Trigger $dailyTrigger -Settings $dailySettings -Principal $dailyPrincipal -Force
    Write-Host "SUCCESS: Daily backup task created (2:00 AM every day)" -ForegroundColor Green
    
} catch {
    Write-Host "FAILED: Could not create daily backup task - $($_.Exception.Message)" -ForegroundColor Red
}

# Create Weekly Backup Task (runs at 3:00 AM every Sunday) 
Write-Host "Creating Weekly Backup Task..." -ForegroundColor Green
try {
    $weeklyAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`" -BackupType weekly -Mode silent"
    $weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "03:00AM"
    $weeklySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    $weeklyPrincipal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName "KingstonsPortal-WeeklyBackup-Organized" -Action $weeklyAction -Trigger $weeklyTrigger -Settings $weeklySettings -Principal $weeklyPrincipal -Force
    Write-Host "SUCCESS: Weekly backup task created (3:00 AM every Sunday)" -ForegroundColor Green
    
} catch {
    Write-Host "FAILED: Could not create weekly backup task - $($_.Exception.Message)" -ForegroundColor Red
}

# Test both backup types
Write-Host "`nTesting backup system..." -ForegroundColor Yellow

# Test daily backup
Write-Host "Testing daily backup..." -ForegroundColor Gray
try {
    Start-ScheduledTask -TaskName "KingstonsPortal-DailyBackup-Organized"
    Start-Sleep -Seconds 15
    $dailyInfo = Get-ScheduledTaskInfo -TaskName "KingstonsPortal-DailyBackup-Organized"
    
    if ($dailyInfo.LastTaskResult -eq 0) {
        Write-Host "SUCCESS: Daily backup test completed" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Daily backup test result code $($dailyInfo.LastTaskResult)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Daily backup test failed - $($_.Exception.Message)" -ForegroundColor Red
}

# Test weekly backup
Write-Host "Testing weekly backup..." -ForegroundColor Gray
try {
    Start-ScheduledTask -TaskName "KingstonsPortal-WeeklyBackup-Organized"
    Start-Sleep -Seconds 20
    $weeklyInfo = Get-ScheduledTaskInfo -TaskName "KingstonsPortal-WeeklyBackup-Organized"
    
    if ($weeklyInfo.LastTaskResult -eq 0) {
        Write-Host "SUCCESS: Weekly backup test completed" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Weekly backup test result code $($weeklyInfo.LastTaskResult)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Weekly backup test failed - $($_.Exception.Message)" -ForegroundColor Red
}

# Show backup structure
Write-Host "`nVerifying backup structure..." -ForegroundColor Yellow
$backupDirs = @("Daily", "Weekly", "Monthly")
foreach ($dir in $backupDirs) {
    $fullPath = "$backupBaseDir\$dir"
    $files = Get-ChildItem $fullPath -File -ErrorAction SilentlyContinue
    Write-Host "  $dir folder: $($files.Count) files" -ForegroundColor Gray
    
    if ($files.Count -gt 0) {
        $latest = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        $sizeMB = [math]::Round($latest.Length / 1MB, 2)
        Write-Host "    Latest: $($latest.Name) ($sizeMB MB)" -ForegroundColor DarkGray
    }
}

# Show task schedule summary
Write-Host "`n=== ORGANIZED BACKUP SYSTEM SETUP COMPLETE ===" -ForegroundColor Cyan
Write-Host "`nBackup Schedule:" -ForegroundColor White
Write-Host "- Daily Backups: Every day at 2:00 AM" -ForegroundColor Gray
Write-Host "  Location: $backupBaseDir\Daily\" -ForegroundColor DarkGray
Write-Host "  Format: Plain SQL (.sql files)" -ForegroundColor DarkGray
Write-Host "  Retention: 7 days" -ForegroundColor DarkGray

Write-Host "- Weekly Backups: Every Sunday at 3:00 AM" -ForegroundColor Gray  
Write-Host "  Location: $backupBaseDir\Weekly\" -ForegroundColor DarkGray
Write-Host "  Format: Compressed (.backup files)" -ForegroundColor DarkGray
Write-Host "  Retention: 4 weeks" -ForegroundColor DarkGray

Write-Host "- Monthly Backups: Automatic (first Sunday of each month)" -ForegroundColor Gray
Write-Host "  Location: $backupBaseDir\Monthly\" -ForegroundColor DarkGray
Write-Host "  Format: Compressed (.backup files)" -ForegroundColor DarkGray
Write-Host "  Retention: 12 months" -ForegroundColor DarkGray

Write-Host "`nManual Commands:" -ForegroundColor Yellow
Write-Host "Start-ScheduledTask -TaskName 'KingstonsPortal-DailyBackup-Organized'" -ForegroundColor Gray
Write-Host "Start-ScheduledTask -TaskName 'KingstonsPortal-WeeklyBackup-Organized'" -ForegroundColor Gray
Write-Host "Get-ScheduledTask -TaskName '*Kingston*'" -ForegroundColor Gray

Read-Host "`nPress Enter to finish"
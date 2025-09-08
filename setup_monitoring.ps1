# Kingston's Portal - Monitoring Setup Script
# Sets up automated monitoring for holiday absence period
# Run as Administrator before departure

param(
    [Parameter(Mandatory=$false)]
    [int]$MonitoringIntervalMinutes = 240,  # 4 hours default
    
    [Parameter(Mandatory=$false)]
    [string]$AlertEmail = "admin@kingston.local",
    
    [Parameter(Mandatory=$false)]
    [switch]$SetupScheduledTask
)

# Ensure Administrator privileges
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

function Write-SetupLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) { 
        "ERROR" { "Red" } 
        "WARN" { "Yellow" } 
        "SUCCESS" { "Green" }
        "SETUP" { "Cyan" }
        default { "White" } 
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

Write-SetupLog "========================================" "SETUP"
Write-SetupLog "Kingston's Portal - Monitoring Setup" "SUCCESS"
Write-SetupLog "========================================" "SETUP"

# Validate monitoring script exists
$monitoringScript = "$PSScriptRoot\monitor_system_health_improved.ps1"
if (!(Test-Path $monitoringScript)) {
    Write-SetupLog "Enhanced monitoring script not found: $monitoringScript" "ERROR"
    Write-SetupLog "Please ensure monitor_system_health_improved.ps1 is in the same directory" "ERROR"
    exit 1
}

Write-SetupLog "Found monitoring script: $monitoringScript" "SUCCESS"

# Create logs directory
$logsDir = "C:\Logs"
if (!(Test-Path $logsDir)) {
    Write-SetupLog "Creating logs directory: $logsDir" "SETUP"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Set up log rotation script
$logRotationScript = @"
# Log rotation for Kingston's Portal monitoring
`$logPath = "C:\Logs\portal_monitoring.log"
if ((Test-Path `$logPath) -and ((Get-Item `$logPath).Length -gt 50MB)) {
    `$rotatedLog = `$logPath -replace '\.log$', "_`$(Get-Date -Format 'yyyyMMdd').log"
    Move-Item `$logPath `$rotatedLog -Force
    Write-Host "Rotated log file to: `$rotatedLog"
}
"@

$logRotationScriptPath = "$PSScriptRoot\rotate_logs.ps1"
$logRotationScript | Out-File -FilePath $logRotationScriptPath -Force
Write-SetupLog "Created log rotation script: $logRotationScriptPath" "SUCCESS"

# Create monitoring wrapper script with enhanced error handling
$monitoringWrapper = @"
# Kingston's Portal Monitoring Wrapper Script
# This script runs the enhanced monitoring with error handling and logging

try {
    # Change to script directory
    Set-Location "$PSScriptRoot"
    
    # Run enhanced monitoring
    Write-Host "Starting enhanced monitoring at `$(Get-Date)" -ForegroundColor Green
    & ".\monitor_system_health_improved.ps1" -SendAlerts -AlertEmail "$AlertEmail" -MaxRetries 3
    
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "Monitoring script returned error code: `$LASTEXITCODE" -ForegroundColor Red
    } else {
        Write-Host "Monitoring completed successfully at `$(Get-Date)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Monitoring wrapper error: `$(`$_.Exception.Message)" -ForegroundColor Red
    
    # Log critical error to Windows Event Log
    try {
        Write-EventLog -LogName Application -Source "Kingston Portal Monitor" -EntryType Error -EventId 1001 -Message "Kingston's Portal monitoring failed: `$(`$_.Exception.Message)"
    } catch {
        Write-Host "Could not write to Event Log" -ForegroundColor Yellow
    }
} finally {
    # Always run log rotation
    try {
        & ".\rotate_logs.ps1"
    } catch {
        Write-Host "Log rotation failed: `$(`$_.Exception.Message)" -ForegroundColor Yellow
    }
}
"@

$monitoringWrapperPath = "$PSScriptRoot\run_monitoring.ps1"
$monitoringWrapper | Out-File -FilePath $monitoringWrapperPath -Force
Write-SetupLog "Created monitoring wrapper: $monitoringWrapperPath" "SUCCESS"

# Set up Windows Scheduled Task if requested
if ($SetupScheduledTask) {
    Write-SetupLog "Setting up Windows Scheduled Task..." "SETUP"
    
    $taskName = "Kingston Portal Health Monitor"
    
    # Remove existing task if it exists
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-SetupLog "Removing existing scheduled task..." "WARN"
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    
    # Create new task
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$monitoringWrapperPath`""
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes $MonitoringIntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 365)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Automated health monitoring for Kingston's Portal during developer absence"
    
    Write-SetupLog "Scheduled task created: $taskName" "SUCCESS"
    Write-SetupLog "Monitoring interval: every $MonitoringIntervalMinutes minutes" "SUCCESS"
    Write-SetupLog "Next run: $((Get-Date).AddMinutes(5))" "SUCCESS"
}

# Create manual monitoring shortcut
$manualMonitorScript = @"
# Manual System Health Check
# Double-click this file to run an immediate health check

Write-Host "Kingston's Portal - Manual Health Check" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

Set-Location "$PSScriptRoot"
& ".\monitor_system_health_improved.ps1"

Write-Host "=======================================" -ForegroundColor Green
Write-Host "Manual health check completed" -ForegroundColor Green
Read-Host "Press Enter to close this window"
"@

$manualMonitorPath = "$PSScriptRoot\manual_health_check.ps1"
$manualMonitorScript | Out-File -FilePath $manualMonitorPath -Force
Write-SetupLog "Created manual health check script: $manualMonitorPath" "SUCCESS"

# Create emergency contact info file
$emergencyInfo = @"
KINGSTON'S PORTAL EMERGENCY CONTACTS
===================================

SYSTEM MONITORING SETUP:
- Monitoring Interval: Every $MonitoringIntervalMinutes minutes
- Log Location: C:\Logs\portal_monitoring.log
- Alert Email: $AlertEmail
$(if ($SetupScheduledTask) { "- Scheduled Task: ENABLED" } else { "- Scheduled Task: NOT ENABLED" })

MANUAL MONITORING:
- Run: .\manual_health_check.ps1 (double-click)
- Full Command: .\monitor_system_health_improved.ps1

EMERGENCY PROCEDURES:
- See: EMERGENCY_PROCEDURES_IMPROVED.md
- Quick Reference: EMERGENCY_PROCEDURES.md

SCRIPTS AVAILABLE:
- monitor_system_health_improved.ps1 (Enhanced monitoring)
- run_monitoring.ps1 (Scheduled wrapper)
- manual_health_check.ps1 (Manual check)
- test_backup_rollback.ps1 (Emergency testing)
- setup_monitoring.ps1 (This setup script)

CRITICAL COMMANDS:
Get-Service -Name "OfficeFastAPIService"
Start-Service -Name "OfficeFastAPIService"
iisreset
Test-NetConnection -ComputerName localhost -Port 8001

ESCALATION PHONE NUMBERS:
Level 1: [Primary Contact Phone]
Level 2: [Emergency Contact Phone]
Level 3: [Manager Phone]
Level 4: [Developer Emergency Phone - CRITICAL ONLY]

Generated: $(Get-Date)
"@

$emergencyInfoPath = "$PSScriptRoot\EMERGENCY_CONTACT_INFO.txt"
$emergencyInfo | Out-File -FilePath $emergencyInfoPath -Force
Write-SetupLog "Created emergency contact info: $emergencyInfoPath" "SUCCESS"

# Test the monitoring setup
Write-SetupLog "Testing monitoring setup..." "SETUP"
try {
    & $monitoringWrapperPath
    Write-SetupLog "Monitoring test completed successfully" "SUCCESS"
} catch {
    Write-SetupLog "Monitoring test failed: $($_.Exception.Message)" "ERROR"
    Write-SetupLog "Please check the configuration and try again" "ERROR"
}

# Final setup summary
Write-SetupLog "========================================" "SETUP"
Write-SetupLog "MONITORING SETUP COMPLETE" "SUCCESS"
Write-SetupLog "========================================" "SETUP"

Write-SetupLog "Configuration Summary:" "SUCCESS"
Write-SetupLog "  Monitoring Interval: $MonitoringIntervalMinutes minutes" "INFO"
Write-SetupLog "  Alert Email: $AlertEmail" "INFO"
Write-SetupLog "  Scheduled Task: $(if ($SetupScheduledTask) {"ENABLED"} else {"NOT ENABLED"})" "INFO"
Write-SetupLog "  Logs Directory: $logsDir" "INFO"

Write-SetupLog "Files Created:" "SUCCESS"
Write-SetupLog "  $monitoringWrapperPath" "INFO"
Write-SetupLog "  $logRotationScriptPath" "INFO"
Write-SetupLog "  $manualMonitorPath" "INFO"
Write-SetupLog "  $emergencyInfoPath" "INFO"

Write-SetupLog "Next Steps:" "SUCCESS"
Write-SetupLog "  1. Test manual health check: .\manual_health_check.ps1" "INFO"
Write-SetupLog "  2. Verify emergency procedures are accessible" "INFO"
Write-SetupLog "  3. Share emergency contact info with support team" "INFO"
if (-not $SetupScheduledTask) {
    Write-SetupLog "  4. Consider running with -SetupScheduledTask for automation" "INFO"
}

Write-SetupLog "System is ready for holiday monitoring!" "SUCCESS"
Read-Host "Press Enter to exit"
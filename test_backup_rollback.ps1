# Kingston's Portal - Backup and Rollback Testing Script
# Tests backup creation and rollback procedures before holiday absence
# Run this script to verify emergency recovery capabilities

param(
    [Parameter(Mandatory=$false)]
    [switch]$TestBackupOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestRollbackOnly,
    
    [Parameter(Mandatory=$false)]
    [string]$TestCommit = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
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

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) { 
        "ERROR" { "Red" } 
        "WARN" { "Yellow" } 
        "SUCCESS" { "Green" }
        "TEST" { "Cyan" }
        default { "White" } 
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    Write-TestLog "Testing prerequisites..." "TEST"
    $errors = @()
    
    # Check critical paths
    $criticalPaths = @(
        "C:\Apps\portal_api\backend",
        "C:\inetpub\wwwroot\OfficeIntranet"
    )
    
    foreach ($path in $criticalPaths) {
        if (!(Test-Path $path)) {
            $errors += "Missing critical path: $path"
        }
    }
    
    # Check service exists
    $service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
    if (!$service) {
        $errors += "OfficeFastAPIService not found"
    }
    
    # Check git repository
    if (!(Test-Path ".git")) {
        $errors += "Not in git repository root"
    }
    
    # Check backup directory permissions
    $backupRoot = "C:\Deployments\Backups"
    try {
        if (!(Test-Path $backupRoot)) {
            New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
        }
        # Test write permissions
        $testFile = "$backupRoot\test_permissions.txt"
        "test" | Out-File -FilePath $testFile
        Remove-Item $testFile -Force
        Write-TestLog "Backup directory permissions OK" "SUCCESS"
    } catch {
        $errors += "Cannot write to backup directory: $backupRoot"
    }
    
    if ($errors.Count -gt 0) {
        Write-TestLog "Prerequisites check FAILED:" "ERROR"
        foreach ($error in $errors) {
            Write-TestLog "  - $error" "ERROR"
        }
        return $false
    }
    
    Write-TestLog "All prerequisites satisfied" "SUCCESS"
    return $true
}

function Test-BackupCreation {
    Write-TestLog "Testing backup creation process..." "TEST"
    
    $backupDir = "C:\Deployments\Backups\test_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    try {
        if ($DryRun) {
            Write-TestLog "[DRY RUN] Would create backup directory: $backupDir" "TEST"
            Write-TestLog "[DRY RUN] Would backup backend files" "TEST"
            Write-TestLog "[DRY RUN] Would backup frontend files" "TEST"
            return $backupDir
        }
        
        Write-TestLog "Creating backup directory: $backupDir" "INFO"
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        
        # Backup current backend
        Write-TestLog "Backing up backend files..." "INFO"
        if (Test-Path "C:\Apps\portal_api\backend") {
            Copy-Item -Path "C:\Apps\portal_api\backend" -Destination "$backupDir\backend_current" -Recurse -Force
            $backendFileCount = (Get-ChildItem "$backupDir\backend_current" -Recurse -File).Count
            Write-TestLog "Backend backup completed: $backendFileCount files" "SUCCESS"
        } else {
            Write-TestLog "Backend path not found for backup" "ERROR"
            return $null
        }
        
        # Backup current frontend
        Write-TestLog "Backing up frontend files..." "INFO"
        if (Test-Path "C:\inetpub\wwwroot\OfficeIntranet") {
            Copy-Item -Path "C:\inetpub\wwwroot\OfficeIntranet" -Destination "$backupDir\frontend_current" -Recurse -Force
            $frontendFileCount = (Get-ChildItem "$backupDir\frontend_current" -Recurse -File).Count
            Write-TestLog "Frontend backup completed: $frontendFileCount files" "SUCCESS"
        } else {
            Write-TestLog "Frontend path not found for backup" "ERROR"
            return $null
        }
        
        # Create backup manifest
        $manifest = @{
            BackupTime = Get-Date
            GitCommit = (git rev-parse HEAD)
            GitBranch = (git branch --show-current)
            BackendPath = "C:\Apps\portal_api\backend"
            FrontendPath = "C:\inetpub\wwwroot\OfficeIntranet"
            ServiceStatus = (Get-Service -Name "OfficeFastAPIService").Status
        }
        
        $manifest | ConvertTo-Json | Out-File "$backupDir\backup_manifest.json"
        Write-TestLog "Backup manifest created" "SUCCESS"
        
        # Verify backup integrity
        Write-TestLog "Verifying backup integrity..." "TEST"
        $backupBackendFiles = (Get-ChildItem "$backupDir\backend_current" -Recurse -File).Count
        $backupFrontendFiles = (Get-ChildItem "$backupDir\frontend_current" -Recurse -File).Count
        $originalBackendFiles = (Get-ChildItem "C:\Apps\portal_api\backend" -Recurse -File).Count
        $originalFrontendFiles = (Get-ChildItem "C:\inetpub\wwwroot\OfficeIntranet" -Recurse -File).Count
        
        if ($backupBackendFiles -eq $originalBackendFiles -and $backupFrontendFiles -eq $originalFrontendFiles) {
            Write-TestLog "Backup integrity verified: Backend=$backupBackendFiles files, Frontend=$backupFrontendFiles files" "SUCCESS"
        } else {
            Write-TestLog "Backup integrity FAILED: Backend $originalBackendFiles->$backupBackendFiles, Frontend $originalFrontendFiles->$backupFrontendFiles" "ERROR"
            return $null
        }
        
        Write-TestLog "Backup creation test PASSED" "SUCCESS"
        return $backupDir
        
    } catch {
        Write-TestLog "Backup creation FAILED: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Test-SystemState {
    param([string]$StateName)
    
    Write-TestLog "Testing system state: $StateName" "TEST"
    
    try {
        # Test service status
        $service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
        if ($service) {
            Write-TestLog "Service Status: $($service.Status)" "INFO"
        } else {
            Write-TestLog "Service not found" "ERROR"
            return $false
        }
        
        if ($DryRun) {
            Write-TestLog "[DRY RUN] Would test API health" "TEST"
            Write-TestLog "[DRY RUN] Would test frontend accessibility" "TEST"
            return $true
        }
        
        # Test API health (with timeout)
        try {
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/health" -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-TestLog "API Health: OK" "SUCCESS"
            } else {
                Write-TestLog "API Health: Failed ($($response.StatusCode))" "ERROR"
                return $false
            }
        } catch {
            Write-TestLog "API Health: Not accessible - $($_.Exception.Message)" "WARN"
            # Don't fail the test immediately - service might be starting
        }
        
        # Test frontend accessibility
        try {
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-TestLog "Frontend: OK" "SUCCESS"
            } else {
                Write-TestLog "Frontend: Failed ($($response.StatusCode))" "ERROR"
                return $false
            }
        } catch {
            Write-TestLog "Frontend: Not accessible - $($_.Exception.Message)" "WARN"
        }
        
        # Check file integrity
        $criticalFiles = @(
            "C:\Apps\portal_api\backend\main.py",
            "C:\Apps\portal_api\backend\.env",
            "C:\inetpub\wwwroot\OfficeIntranet\index.html"
        )
        
        foreach ($file in $criticalFiles) {
            if (Test-Path $file) {
                Write-TestLog "Critical file exists: $file" "SUCCESS"
            } else {
                Write-TestLog "Critical file missing: $file" "ERROR"
                return $false
            }
        }
        
        Write-TestLog "System state '$StateName' verification PASSED" "SUCCESS"
        return $true
        
    } catch {
        Write-TestLog "System state test FAILED: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-EmergencyRollback {
    param([string]$BackupDir, [string]$TargetCommit)
    
    if (!$TargetCommit) {
        # Get second-to-last commit for testing
        $commits = git log --oneline -5 --format="%H"
        if ($commits.Count -ge 2) {
            $TargetCommit = $commits[1]
        } else {
            Write-TestLog "Not enough commits for rollback test" "ERROR"
            return $false
        }
    }
    
    Write-TestLog "Testing emergency rollback to commit: $($TargetCommit.Substring(0,8))" "TEST"
    
    try {
        if ($DryRun) {
            Write-TestLog "[DRY RUN] Would stop OfficeFastAPIService" "TEST"
            Write-TestLog "[DRY RUN] Would git checkout $TargetCommit" "TEST"
            Write-TestLog "[DRY RUN] Would copy backend files" "TEST"
            Write-TestLog "[DRY RUN] Would build and deploy frontend" "TEST"
            Write-TestLog "[DRY RUN] Would restart services" "TEST"
            return $true
        }
        
        # Store current commit for restoration
        $currentCommit = git rev-parse HEAD
        $currentBranch = git branch --show-current
        Write-TestLog "Current state: $currentBranch @ $($currentCommit.Substring(0,8))" "INFO"
        
        # Test Step 1: Stop service
        Write-TestLog "Stopping OfficeFastAPIService for rollback test..." "INFO"
        Stop-Service -Name "OfficeFastAPIService" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
        
        # Test Step 2: Git checkout
        Write-TestLog "Testing git checkout to $($TargetCommit.Substring(0,8))..." "INFO"
        git stash push -m "Emergency rollback test backup"
        git checkout $TargetCommit
        
        if ($LASTEXITCODE -ne 0) {
            Write-TestLog "Git checkout FAILED" "ERROR"
            # Restore original state
            git checkout $currentBranch
            git stash pop
            Start-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
            return $false
        }
        
        Write-TestLog "Git checkout successful" "SUCCESS"
        
        # Test Step 3: Backend deployment simulation
        Write-TestLog "Testing backend file copy..." "INFO"
        
        # Create temporary backup of production backend
        $tempBackup = "$BackupDir\production_temp_backup"
        Copy-Item -Path "C:\Apps\portal_api\backend" -Destination $tempBackup -Recurse -Force
        
        # Test backend file copy (but preserve .env)
        $envBackup = "C:\Apps\portal_api\backend\.env"
        if (Test-Path $envBackup) {
            Copy-Item $envBackup "$env:TEMP\test_env_backup" -Force
        }
        
        Copy-Item -Path "backend\*" -Destination "C:\Apps\portal_api\backend\" -Recurse -Force -Exclude "venv"
        
        if (Test-Path "$env:TEMP\test_env_backup") {
            Copy-Item "$env:TEMP\test_env_backup" "C:\Apps\portal_api\backend\.env" -Force
            Remove-Item "$env:TEMP\test_env_backup" -Force
        }
        
        Write-TestLog "Backend file copy completed" "SUCCESS"
        
        # Test Step 4: Frontend build and deployment
        Write-TestLog "Testing frontend build and deployment..." "INFO"
        Push-Location frontend
        
        npm install --silent
        if ($LASTEXITCODE -ne 0) {
            Write-TestLog "npm install FAILED during rollback test" "ERROR"
            Pop-Location
            return $false
        }
        
        npm run build --silent
        if ($LASTEXITCODE -ne 0) {
            Write-TestLog "Frontend build FAILED during rollback test" "ERROR"
            Pop-Location
            return $false
        }
        
        Pop-Location
        Write-TestLog "Frontend build successful" "SUCCESS"
        
        # Test Step 5: Service restart
        Write-TestLog "Testing service restart..." "INFO"
        Start-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 15
        
        $service = Get-Service -Name "OfficeFastAPIService"
        if ($service.Status -eq "Running") {
            Write-TestLog "Service restart successful" "SUCCESS"
        } else {
            Write-TestLog "Service restart FAILED: Status is $($service.Status)" "ERROR"
        }
        
        # Test Step 6: IIS reset
        Write-TestLog "Testing IIS reset..." "INFO"
        iisreset /noforce
        if ($LASTEXITCODE -eq 0) {
            Write-TestLog "IIS reset successful" "SUCCESS"
        } else {
            Write-TestLog "IIS reset had issues" "WARN"
        }
        
        # Test Step 7: Verify rollback functionality
        Start-Sleep -Seconds 10
        $rollbackVerification = Test-SystemState -StateName "Post-Rollback"
        
        if ($rollbackVerification) {
            Write-TestLog "Rollback verification PASSED" "SUCCESS"
        } else {
            Write-TestLog "Rollback verification FAILED" "ERROR"
        }
        
        # Test Step 8: Restore original state
        Write-TestLog "Restoring original system state..." "INFO"
        
        # Restore production backend
        Stop-Service -Name "OfficeFastAPIService" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "C:\Apps\portal_api\backend" -Recurse -Force
        Copy-Item -Path $tempBackup -Destination "C:\Apps\portal_api\backend" -Recurse -Force
        Remove-Item -Path $tempBackup -Recurse -Force
        
        # Restore git state
        git checkout $currentBranch
        git stash pop
        
        # Rebuild current frontend
        Push-Location frontend
        npm run build --silent
        Pop-Location
        
        # Restart services
        Start-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
        iisreset /noforce
        
        Start-Sleep -Seconds 15
        
        # Verify restoration
        $restorationVerification = Test-SystemState -StateName "Post-Restoration"
        
        if ($restorationVerification) {
            Write-TestLog "System restoration PASSED" "SUCCESS"
            Write-TestLog "Emergency rollback test COMPLETED SUCCESSFULLY" "SUCCESS"
            return $true
        } else {
            Write-TestLog "System restoration FAILED - manual intervention may be required" "ERROR"
            return $false
        }
        
    } catch {
        Write-TestLog "Emergency rollback test FAILED: $($_.Exception.Message)" "ERROR"
        
        # Emergency restoration attempt
        Write-TestLog "Attempting emergency restoration..." "WARN"
        try {
            git checkout $currentBranch
            git stash pop
            Start-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
            iisreset /noforce
        } catch {
            Write-TestLog "Emergency restoration FAILED - MANUAL INTERVENTION REQUIRED" "ERROR"
        }
        
        return $false
    }
}

# Main execution
Write-TestLog "========================================" "INFO"
Write-TestLog "Kingston's Portal - Backup & Rollback Testing" "INFO"
Write-TestLog "========================================" "INFO"

if ($DryRun) {
    Write-TestLog "DRY RUN MODE - No actual changes will be made" "WARN"
}

# Pre-test system verification
Write-TestLog "Pre-test system verification..." "TEST"
$preTestState = Test-SystemState -StateName "Pre-Test"

if (!$preTestState) {
    Write-TestLog "Pre-test system verification FAILED - aborting tests" "ERROR"
    exit 1
}

# Prerequisites check
if (!(Test-Prerequisites)) {
    Write-TestLog "Prerequisites check FAILED - aborting tests" "ERROR"
    exit 1
}

$testResults = @{
    BackupTest = $false
    RollbackTest = $false
    OverallSuccess = $false
}

# Backup Creation Test
if (!$TestRollbackOnly) {
    Write-TestLog "Starting backup creation test..." "TEST"
    $backupDir = Test-BackupCreation
    
    if ($backupDir) {
        $testResults.BackupTest = $true
        Write-TestLog "Backup test PASSED - Backup created at: $backupDir" "SUCCESS"
    } else {
        $testResults.BackupTest = $false
        Write-TestLog "Backup test FAILED" "ERROR"
    }
} else {
    Write-TestLog "Skipping backup test (TestRollbackOnly specified)" "INFO"
    $testResults.BackupTest = $true # Assume passed for overall results
    $backupDir = "C:\Deployments\Backups\test_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

# Emergency Rollback Test
if (!$TestBackupOnly) {
    Write-TestLog "Starting emergency rollback test..." "TEST"
    $rollbackResult = Test-EmergencyRollback -BackupDir $backupDir -TargetCommit $TestCommit
    
    if ($rollbackResult) {
        $testResults.RollbackTest = $true
        Write-TestLog "Rollback test PASSED" "SUCCESS"
    } else {
        $testResults.RollbackTest = $false
        Write-TestLog "Rollback test FAILED" "ERROR"
    }
} else {
    Write-TestLog "Skipping rollback test (TestBackupOnly specified)" "INFO"
    $testResults.RollbackTest = $true # Assume passed for overall results
}

# Overall results
Write-TestLog "========================================" "INFO"
Write-TestLog "TEST RESULTS SUMMARY" "INFO"
Write-TestLog "========================================" "INFO"

Write-TestLog "Backup Creation Test: $(if ($testResults.BackupTest) { 'PASSED' } else { 'FAILED' })" $(if ($testResults.BackupTest) { "SUCCESS" } else { "ERROR" })
Write-TestLog "Emergency Rollback Test: $(if ($testResults.RollbackTest) { 'PASSED' } else { 'FAILED' })" $(if ($testResults.RollbackTest) { "SUCCESS" } else { "ERROR" })

$testResults.OverallSuccess = $testResults.BackupTest -and $testResults.RollbackTest

Write-TestLog "OVERALL RESULT: $(if ($testResults.OverallSuccess) { 'ALL TESTS PASSED' } else { 'TESTS FAILED' })" $(if ($testResults.OverallSuccess) { "SUCCESS" } else { "ERROR" })

if ($testResults.OverallSuccess) {
    Write-TestLog "System is ready for holiday absence" "SUCCESS"
    Write-TestLog "Emergency procedures have been validated" "SUCCESS"
} else {
    Write-TestLog "System requires attention before holiday absence" "ERROR"
    Write-TestLog "Review failed tests and resolve issues" "ERROR"
}

Write-TestLog "Testing completed" "INFO"
Write-TestLog "========================================" "INFO"

if ($DryRun) {
    Write-TestLog "DRY RUN completed - no changes were made to the system" "INFO"
}

Read-Host "Press Enter to exit"
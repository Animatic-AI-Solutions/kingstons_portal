# Deployment Procedures

## Overview

Kingston's Portal uses a **manual deployment workflow** designed for the 2-developer team environment. The process involves accessing the controller machine and executing PowerShell scripts with Administrator privileges for both standard deployments and emergency rollbacks.

## Standard Deployment Process

### Deployment Architecture

**Production Environment Setup**:
- **Frontend Location**: `C:\inetpub\wwwroot\OfficeIntranet` (IIS-hosted)
- **Backend Location**: `C:\Apps\portal_api\backend` 
- **Service**: `OfficeFastAPIService` (NSSM-managed Windows service)
- **Access Method**: Manual login to controller machine
- **Execution**: PowerShell script with Administrator privileges

### Standard Deployment Script (`deploy_minimal.ps1`)

**Automated Deployment Process**:
```powershell
# Kingston's Portal - Production Deployment Script
# Requires Administrator privileges

# Step 1: Git Pull Latest Changes
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git pull failed" -ForegroundColor Red
    exit 1
}

# Step 2: Install Python Dependencies
Set-Location backend
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt

# Step 3: Install Node.js Dependencies  
Set-Location ..\frontend
npm install

# Step 4: Build Frontend for Production
npm run build  # Outputs to C:\inetpub\wwwroot\OfficeIntranet
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
    exit 1
}

# Step 5: Copy Backend to Production Location
Copy-Item -Path "..\backend\*" -Destination "C:\Apps\portal_api\backend\" -Recurse -Force -Exclude "venv"

# Step 6: Backup and Restore Environment File
if (Test-Path "C:\Apps\portal_api\backend\.env.backup") {
    Copy-Item "C:\Apps\portal_api\backend\.env.backup" "C:\Apps\portal_api\backend\.env" -Force
}

# Step 7: Install Production Dependencies
Push-Location "C:\Apps\portal_api\backend"
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt
Pop-Location

# Step 8: Restart FastAPI Service
Stop-Service -Name "OfficeFastAPIService" -Force
Start-Sleep -Seconds 5
Start-Service -Name "OfficeFastAPIService"

# Step 9: Reset IIS
iisreset

# Step 10: Verify Deployment
Write-Host "Frontend: http://intranet.kingston.local" -ForegroundColor Yellow
Write-Host "Backend API: http://intranet.kingston.local:8001/docs" -ForegroundColor Yellow
```

### Deployment Verification

**Post-Deployment Health Checks**:
```powershell
# Service status verification
$service = Get-Service -Name "OfficeFastAPIService"
if ($service.Status -eq "Running") {
    Write-Host "SUCCESS: FastAPI Service is running" -ForegroundColor Green
} else {
    Write-Host "WARNING: Service status is $($service.Status)" -ForegroundColor Yellow
}

# Connectivity verification
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 10
    Write-Host "Frontend: ACCESSIBLE ($($frontendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Frontend: NOT ACCESSIBLE" -ForegroundColor Red
}

try {
    $backendResponse = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/docs" -TimeoutSec 10  
    Write-Host "Backend API: ACCESSIBLE ($($backendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Backend API: NOT ACCESSIBLE" -ForegroundColor Red
}
```

## Emergency Rollback Procedures

### Rollback Scenarios and Triggers

**When to Rollback**:
- Frontend build introduces critical bugs
- Backend API errors affecting core functionality
- Database connectivity issues
- Authentication system failures
- Performance degradation > 300% of baseline

### Emergency Rollback Script

**Complete System Rollback** (`rollback_emergency.ps1`):
```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$CommitHash,
    [Parameter(Mandatory=$false)]
    [switch]$BackendOnly,
    [Parameter(Mandatory=$false)]
    [switch]$FrontendOnly
)

Write-Host "EMERGENCY ROLLBACK INITIATED" -ForegroundColor Red
Write-Host "Target Commit: $CommitHash" -ForegroundColor Yellow

# Step 1: Create Emergency Backup
$backupDir = "C:\Deployments\Backups\emergency_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force

# Backup current state
Copy-Item -Path "C:\Apps\portal_api\backend" -Destination "$backupDir\backend_current" -Recurse -Force
Copy-Item -Path "C:\inetpub\wwwroot\OfficeIntranet" -Destination "$backupDir\frontend_current" -Recurse -Force

# Step 2: Git Rollback
git stash  # Save uncommitted changes
git checkout $CommitHash
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to checkout commit $CommitHash" -ForegroundColor Red
    exit 1
}

# Step 3: Backend Rollback (if not frontend-only)
if (-not $FrontendOnly) {
    Stop-Service -Name "OfficeFastAPIService" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "backend\*" -Destination "C:\Apps\portal_api\backend\" -Recurse -Force -Exclude "venv"
    
    # Restore environment configuration
    if (Test-Path "C:\Apps\portal_api\backend\.env.backup") {
        Copy-Item "C:\Apps\portal_api\backend\.env.backup" "C:\Apps\portal_api\backend\.env" -Force
    }
    
    Start-Service -Name "OfficeFastAPIService"
}

# Step 4: Frontend Rollback (if not backend-only)
if (-not $BackendOnly) {
    cd frontend
    npm install
    npm run build
    iisreset
}

Write-Host "ROLLBACK COMPLETED" -ForegroundColor Green
Write-Host "Backup available at: $backupDir" -ForegroundColor Yellow
```

### Quick Status Verification

**System Health Check Script** (`check_deployment_status.ps1`):
```powershell
Write-Host "Kingston's Portal - Deployment Status Check" -ForegroundColor Green

# Git status
Write-Host "Current Branch: $(git branch --show-current)" -ForegroundColor Yellow
Write-Host "Latest Commit: $(git log -1 --format='%h - %s (%ci)')" -ForegroundColor Yellow

# Service status
$service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
$serviceColor = if ($service -and $service.Status -eq "Running") { "Green" } else { "Red" }
Write-Host "OfficeFastAPIService: $($service.Status)" -ForegroundColor $serviceColor

# File system verification
$backendExists = Test-Path 'C:\Apps\portal_api\backend'
$frontendExists = Test-Path 'C:\inetpub\wwwroot\OfficeIntranet'
Write-Host "Backend Location: $(if ($backendExists) { 'EXISTS' } else { 'MISSING' })" -ForegroundColor $(if ($backendExists) { "Green" } else { "Red" })
Write-Host "Frontend Location: $(if ($frontendExists) { 'EXISTS' } else { 'MISSING' })" -ForegroundColor $(if ($frontendExists) { "Green" } else { "Red" })

# Environment configuration
$envExists = Test-Path "C:\Apps\portal_api\backend\.env"
Write-Host ".env file: $(if ($envExists) { 'EXISTS' } else { 'MISSING' })" -ForegroundColor $(if ($envExists) { "Green" } else { "Red" })
```

## Deployment Best Practices

### Pre-Deployment Checklist

```markdown
## Development Environment Verification
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Backend starts successfully (`uvicorn main:app --reload`)
- [ ] Database connectivity confirmed
- [ ] Environment variables documented

## Code Quality Verification
- [ ] Pull request approved and merged
- [ ] No linting errors
- [ ] Code follows project conventions
- [ ] Documentation updated for new features
- [ ] Breaking changes documented

## Deployment Preparation
- [ ] Controller machine access confirmed
- [ ] Administrator privileges available
- [ ] Backup strategy confirmed
- [ ] Rollback plan prepared
- [ ] Team coordination completed
```

### Post-Deployment Validation

**Comprehensive System Verification**:
```markdown
## Functional Verification
- [ ] User authentication working
- [ ] Critical business functions operational
- [ ] Database connections stable
- [ ] API endpoints responding correctly
- [ ] Frontend loads without errors

## Performance Verification
- [ ] Page load times acceptable (< 3 seconds)
- [ ] API response times normal (< 2 seconds)
- [ ] Database query performance maintained
- [ ] No memory leaks detected
- [ ] System resources within normal ranges

## Integration Verification
- [ ] External API connections working
- [ ] Email functionality operational
- [ ] File upload/download working
- [ ] Print functionality working
- [ ] Report generation successful
```

## Deployment Scheduling and Communication

### Deployment Windows

**Recommended Deployment Times**:
- **Primary Window**: Tuesday-Thursday, 10:00-16:00 (business hours for immediate issue detection)
- **Emergency Window**: Any time with appropriate team notification
- **Avoid**: Monday mornings, Friday afternoons, end of month (high business activity)

### Communication Protocol

**Deployment Notification Template**:
```markdown
Subject: Kingston's Portal Deployment - [DATE] at [TIME]

## Deployment Schedule
- **Start Time**: [TIME]
- **Expected Duration**: 15-30 minutes
- **Completion Time**: [TIME]

## Changes Being Deployed
- [Brief description of changes]
- [Any user-visible improvements]
- [Bug fixes included]

## Potential Impact
- Brief service interruption during deployment
- Users may need to refresh browser after deployment
- [Any specific user actions required]

## Rollback Plan
- Previous version backup created
- Emergency rollback procedure ready
- [Rollback trigger criteria]

## Contact Information
- Technical Contact: [Contact details]
- Deployment Lead: [Contact details]
```

## Deployment Monitoring and Metrics

### Success Metrics

**Deployment Success Indicators**:
- Deployment script completes without errors
- All services start successfully
- Health check endpoints respond correctly
- User authentication flows work
- Critical business functions operational

### Performance Monitoring

**Post-Deployment Performance Tracking**:
```powershell
# Monitor key performance indicators
$metricsScript = @"
# Page load time measurement
$start = Get-Date
$response = Invoke-WebRequest -Uri "http://intranet.kingston.local"
$loadTime = (Get-Date) - $start
Write-Host "Frontend load time: $($loadTime.TotalSeconds) seconds"

# API response time measurement
$start = Get-Date
$apiResponse = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/docs"
$apiTime = (Get-Date) - $start
Write-Host "API response time: $($apiTime.TotalSeconds) seconds"

# Service resource usage
$service = Get-Process | Where-Object {$_.ProcessName -like "*python*"}
if ($service) {
    Write-Host "Python process memory: $([math]::Round($service.WorkingSet64 / 1MB, 2)) MB"
}
"@
```

This deployment procedure documentation provides comprehensive guidance for safe, reliable deployments while maintaining the ability to quickly recover from issues through systematic rollback procedures.
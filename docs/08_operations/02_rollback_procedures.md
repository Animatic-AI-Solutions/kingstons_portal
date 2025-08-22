# Deployment Rollback Procedures

## Overview

Kingston's Portal deployment rollback procedures provide **rapid recovery mechanisms** for production issues. The process is designed for manual execution by accessing the controller machine and using Windows PowerShell scripts with Administrator privileges.

## Deployment Architecture Understanding

### Current Deployment Process

**Standard Deployment Flow** (`deploy_minimal.ps1`):
```powershell
1. Git pull latest changes
2. Install Python dependencies (backend/venv)  
3. Install Node.js dependencies (frontend)
4. Build frontend for production
5. Copy backend to C:\Apps\portal_api\backend
6. Install production dependencies
7. Restart OfficeFastAPIService
8. Reset IIS
```

**Production Environment**:
- **Frontend Location**: `C:\inetpub\wwwroot\OfficeIntranet` (via npm build)
- **Backend Location**: `C:\Apps\portal_api\backend`
- **Service**: `OfficeFastAPIService` (NSSM-managed)
- **Web Server**: IIS hosting frontend
- **Access Method**: Manual login to controller machine

## Rollback Scenarios

### 1. Frontend Rollback (Build Issues)

**When to Use**:
- Frontend build introduces visual bugs
- JavaScript errors in production
- CSS/styling issues affecting usability
- React routing problems

**Rollback Process**:
```powershell
# Access controller machine as Administrator
# Navigate to project directory

# Option A: Quick Git Rollback
git log --oneline -10  # Identify last working commit
git checkout <last-working-commit>
cd frontend
npm run build
iisreset

# Option B: Frontend-only Rollback
git checkout main~1 -- frontend/  # Rollback frontend code only
cd frontend
npm install  # Ensure dependencies match
npm run build
iisreset
```

### 2. Backend Rollback (API Issues)

**When to Use**:
- API endpoints returning errors
- Database connection issues
- Authentication problems
- Performance degradation

**Rollback Process**:
```powershell
# Access controller machine as Administrator

# Option A: Full Backend Rollback
git log --oneline -10  # Identify last working commit
git checkout <last-working-commit>

# Redeploy backend only
cd backend
Copy-Item -Path ".\*" -Destination "C:\Apps\portal_api\backend\" -Recurse -Force -Exclude "venv"

# Restore environment file (critical)
if (Test-Path "C:\Apps\portal_api\backend\.env.backup") {
    Copy-Item "C:\Apps\portal_api\backend\.env.backup" "C:\Apps\portal_api\backend\.env" -Force
}

# Restart service
Stop-Service -Name "OfficeFastAPIService" -Force
Start-Sleep -Seconds 5
Start-Service -Name "OfficeFastAPIService"

# Verify service status
Get-Service -Name "OfficeFastAPIService"
```

### 3. Database Schema Rollback

**When to Use**:
- Database migration failures
- Schema changes causing application errors
- Data integrity issues

**Rollback Process**:
```powershell
# Option A: Git-based Schema Rollback
git log --oneline --grep="migration\|schema" -10
git checkout <commit-before-schema-change>

# Option B: Manual Database Restoration (if available)
# Connect to PostgreSQL
$env:DATABASE_URL = "postgresql://kingstons_app:password@host:port/kingstons_portal"
psql $env:DATABASE_URL

# Run rollback SQL (if prepared)
# \i rollback_scripts/rollback_v1.2.3.sql

# Option C: Database Backup Restoration
# Restore from most recent backup before deployment
# (Requires database backup procedures to be established)
```

## Emergency Rollback Scripts

### Complete System Rollback Script

Create `rollback_emergency.ps1`:
```powershell
# Emergency Rollback Script for Kingston's Portal
# Run as Administrator on controller machine

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
Write-Host "=====================================" -ForegroundColor Red

# Verify Administrator privileges
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Must run as Administrator" -ForegroundColor Red
    exit 1
}

# Step 1: Backup current state
Write-Host "1. Creating backup of current state..." -ForegroundColor Cyan
$backupDir = "C:\Deployments\Backups\emergency_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup current backend
if (Test-Path "C:\Apps\portal_api\backend") {
    Copy-Item -Path "C:\Apps\portal_api\backend" -Destination "$backupDir\backend_current" -Recurse -Force
}

# Backup current frontend
if (Test-Path "C:\inetpub\wwwroot\OfficeIntranet") {
    Copy-Item -Path "C:\inetpub\wwwroot\OfficeIntranet" -Destination "$backupDir\frontend_current" -Recurse -Force
}

Write-Host "Backup created at: $backupDir" -ForegroundColor Green

# Step 2: Git rollback
Write-Host "2. Rolling back to commit $CommitHash..." -ForegroundColor Cyan
$currentBranch = git branch --show-current
git stash  # Save any uncommitted changes
git checkout $CommitHash

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to checkout commit $CommitHash" -ForegroundColor Red
    git checkout $currentBranch
    exit 1
}

# Step 3: Backend rollback
if (-not $FrontendOnly) {
    Write-Host "3. Rolling back backend..." -ForegroundColor Cyan
    
    # Stop service
    Stop-Service -Name "OfficeFastAPIService" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    
    # Copy backend files
    Copy-Item -Path "backend\*" -Destination "C:\Apps\portal_api\backend\" -Recurse -Force -Exclude "venv"
    
    # Restore .env file if backup exists
    if (Test-Path "C:\Apps\portal_api\backend\.env.backup") {
        Copy-Item "C:\Apps\portal_api\backend\.env.backup" "C:\Apps\portal_api\backend\.env" -Force
    }
    
    # Install dependencies
    Push-Location "C:\Apps\portal_api\backend"
    if (Test-Path "venv") {
        & ".\venv\Scripts\Activate.ps1"
        pip install -r requirements.txt
    }
    Pop-Location
    
    # Start service
    Start-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 10
    
    $service = Get-Service -Name "OfficeFastAPIService"
    Write-Host "Backend service status: $($service.Status)" -ForegroundColor Yellow
}

# Step 4: Frontend rollback  
if (-not $BackendOnly) {
    Write-Host "4. Rolling back frontend..." -ForegroundColor Cyan
    
    cd frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed" -ForegroundColor Red
        exit 1
    }
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
        exit 1
    }
    
    # Reset IIS
    iisreset
    cd ..
}

# Step 5: Verification
Write-Host "5. Verifying rollback..." -ForegroundColor Cyan
Write-Host "Frontend URL: http://intranet.kingston.local" -ForegroundColor Yellow
Write-Host "Backend API: http://intranet.kingston.local:8001/docs" -ForegroundColor Yellow
Write-Host "Service Status:" -ForegroundColor Yellow
Get-Service -Name "OfficeFastAPIService" | Select-Object Name, Status

Write-Host "ROLLBACK COMPLETED" -ForegroundColor Green
Write-Host "Backup available at: $backupDir" -ForegroundColor Yellow
Write-Host "Current commit: $(git rev-parse --short HEAD)" -ForegroundColor Yellow

Read-Host "Press Enter to exit"
```

### Quick Status Check Script

Create `check_deployment_status.ps1`:
```powershell
# Deployment Status Check Script
# Quick verification of system health

Write-Host "Kingston's Portal - Deployment Status Check" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Git status
Write-Host "`n1. Git Status:" -ForegroundColor Cyan
Write-Host "Current Branch: $(git branch --show-current)" -ForegroundColor Yellow
Write-Host "Latest Commit: $(git log -1 --format='%h - %s (%ci)')" -ForegroundColor Yellow
Write-Host "Uncommitted Changes: $((git status --porcelain | Measure-Object).Count)" -ForegroundColor Yellow

# Service status
Write-Host "`n2. Service Status:" -ForegroundColor Cyan
$service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "OfficeFastAPIService: $($service.Status)" -ForegroundColor $(if ($service.Status -eq "Running") { "Green" } else { "Red" })
} else {
    Write-Host "OfficeFastAPIService: Not Found" -ForegroundColor Red
}

# File system status
Write-Host "`n3. Deployment Locations:" -ForegroundColor Cyan
Write-Host "Backend Location: $(if (Test-Path 'C:\Apps\portal_api\backend') { 'EXISTS' } else { 'MISSING' })" -ForegroundColor $(if (Test-Path 'C:\Apps\portal_api\backend') { "Green" } else { "Red" })
Write-Host "Frontend Location: $(if (Test-Path 'C:\inetpub\wwwroot\OfficeIntranet') { 'EXISTS' } else { 'MISSING' })" -ForegroundColor $(if (Test-Path 'C:\inetpub\wwwroot\OfficeIntranet') { "Green" } else { "Red" })

# Environment file status
Write-Host "`n4. Configuration:" -ForegroundColor Cyan
$envExists = Test-Path "C:\Apps\portal_api\backend\.env"
Write-Host ".env file: $(if ($envExists) { 'EXISTS' } else { 'MISSING' })" -ForegroundColor $(if ($envExists) { "Green" } else { "Red" })
if (Test-Path "C:\Apps\portal_api\backend\.env.backup") {
    Write-Host ".env backup: EXISTS" -ForegroundColor Green
}

# Test connectivity (basic)
Write-Host "`n5. Quick Connectivity Test:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 5 -UseBasicParsing
    Write-Host "Frontend: ACCESSIBLE ($($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Frontend: NOT ACCESSIBLE" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/docs" -TimeoutSec 5 -UseBasicParsing  
    Write-Host "Backend API: ACCESSIBLE ($($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Backend API: NOT ACCESSIBLE" -ForegroundColor Red
}

Write-Host "`nStatus check completed." -ForegroundColor Green
```

## Rollback Decision Matrix

### Issue Severity Assessment

| Severity | Impact | Rollback Decision | Timeline |
|----------|--------|-------------------|----------|
| **Critical** | System down, data loss risk | Immediate rollback | < 5 minutes |
| **High** | Major functionality broken | Rollback if no quick fix | < 15 minutes |
| **Medium** | Some features affected | Fix forward or rollback | < 1 hour |
| **Low** | Minor issues, UI problems | Fix forward | Next deployment |

### Rollback vs Fix Forward

**Rollback When**:
- System is completely down
- Security vulnerabilities introduced
- Data integrity at risk
- Quick fix is uncertain
- Multiple systems affected

**Fix Forward When**:
- Issue is minor and isolated
- Fix is well-understood and quick
- Rollback would affect other working features
- Problem was caught early in deployment

## Recovery Procedures

### Post-Rollback Actions

```markdown
## Immediate Actions (0-15 minutes)
- [ ] Verify system functionality
- [ ] Check database connectivity
- [ ] Test critical user workflows
- [ ] Monitor error logs
- [ ] Communicate status to stakeholders

## Short-term Actions (15 minutes - 1 hour)
- [ ] Analyze root cause of deployment failure
- [ ] Document what went wrong
- [ ] Plan fix for next deployment
- [ ] Review rollback effectiveness
- [ ] Update rollback procedures if needed

## Long-term Actions (1+ hours)
- [ ] Implement fix in development environment
- [ ] Test fix thoroughly
- [ ] Prepare improved deployment
- [ ] Review deployment process improvements
- [ ] Update documentation
```

### Rollback Verification Checklist

```markdown
## System Health Verification
- [ ] Frontend loads correctly (http://intranet.kingston.local)
- [ ] Backend API accessible (http://intranet.kingston.local:8001/docs)
- [ ] User authentication working
- [ ] Database connections stable
- [ ] Critical business functions operational

## Data Integrity Verification  
- [ ] Recent data still accessible
- [ ] No data corruption detected
- [ ] Backup systems operational
- [ ] Log files intact

## Performance Verification
- [ ] Response times acceptable
- [ ] Memory usage normal
- [ ] CPU utilization stable
- [ ] No resource leaks detected
```

## Backup and Recovery Integration

### Automated Backup Strategy

**Pre-Deployment Backup**:
```powershell
# Add to beginning of deploy_minimal.ps1
$backupDir = "C:\Deployments\Backups\pre_deploy_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force

# Backup current production state
Copy-Item -Path "C:\Apps\portal_api\backend" -Destination "$backupDir\backend" -Recurse -Force
Copy-Item -Path "C:\inetpub\wwwroot\OfficeIntranet" -Destination "$backupDir\frontend" -Recurse -Force

Write-Host "Pre-deployment backup created: $backupDir" -ForegroundColor Green
```

### Recovery from Backup

```powershell
# Restore from backup
$backupDir = "C:\Deployments\Backups\pre_deploy_20240101_120000"  # Most recent backup

# Stop services
Stop-Service -Name "OfficeFastAPIService" -Force

# Restore backend
Remove-Item -Path "C:\Apps\portal_api\backend" -Recurse -Force
Copy-Item -Path "$backupDir\backend" -Destination "C:\Apps\portal_api\backend" -Recurse -Force

# Restore frontend  
Remove-Item -Path "C:\inetpub\wwwroot\OfficeIntranet" -Recurse -Force
Copy-Item -Path "$backupDir\frontend" -Destination "C:\inetpub\wwwroot\OfficeIntranet" -Recurse -Force

# Restart services
Start-Service -Name "OfficeFastAPIService"
iisreset
```

## Communication During Rollbacks

### Stakeholder Communication Template

```markdown
## Rollback Notification Template

**Subject**: URGENT - Kingston's Portal Rollback Initiated

**Status**: ROLLBACK IN PROGRESS
**Estimated Resolution**: [Time estimate]
**Impact**: [Description of user impact]

**Issue Summary**:
Brief description of the problem that triggered the rollback.

**Actions Taken**:
- Rollback initiated at [timestamp]
- Restoring to previous stable version
- [Additional actions]

**Next Steps**:
- Complete rollback verification
- Root cause analysis
- Communication of resolution

**Contact**: [Technical contact information]

---

## Rollback Completion Notification

**Subject**: RESOLVED - Kingston's Portal Rollback Completed

**Status**: SYSTEM RESTORED
**Resolution Time**: [Duration]

**Summary**:
System has been successfully rolled back to previous stable version.

**Verification**:
- [ ] Frontend operational
- [ ] Backend API functional  
- [ ] User authentication working
- [ ] Data integrity confirmed

**Next Steps**:
- Monitor system stability
- Plan corrective measures for next deployment
- Schedule post-incident review
```

This comprehensive rollback documentation provides the necessary procedures for rapid recovery in the Kingston's Portal production environment, tailored for manual execution by accessing the controller machine.
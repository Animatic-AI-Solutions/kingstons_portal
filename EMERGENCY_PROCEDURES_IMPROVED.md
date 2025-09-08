# 🚨 Kingston's Portal - Enhanced Emergency Procedures
## Holiday Absence Management Guide (IMPROVED VERSION)

**Developer Away:** Friday [Date] to [Return Date]  
**System:** Kingston's Portal Production Environment  
**Location:** Kingston03 Server (192.168.0.223)  
**Version:** Enhanced v2.0

---

## 🆘 EMERGENCY CONTACT HIERARCHY

### **LEVEL 1 - IMMEDIATE TECHNICAL SUPPORT**
- **Primary Contact:** [Backup Administrator Name]
- **Phone:** [Phone Number] (Available 9 AM - 6 PM)
- **Email:** [Email Address]
- **Response Time:** 30 minutes during business hours
- **Expertise:** System administration, service management

### **LEVEL 2 - AFTER-HOURS CRITICAL SUPPORT**
- **Emergency Contact:** [Emergency Contact Name]  
- **Phone:** [Emergency Phone] (24/7 for CRITICAL issues only)
- **Email:** [Emergency Email Address]
- **Response Time:** 2 hours maximum
- **Expertise:** Emergency recovery, system restore

### **LEVEL 3 - BUSINESS ESCALATION**
- **Manager:** [Manager Name]
- **Phone:** [Manager Phone]
- **Email:** [Manager Email]
- **When to Contact:** Extended outages (>4 hours), business impact

### **LEVEL 4 - DEVELOPER EMERGENCY CONTACT**
- **Developer:** [Your Name]
- **Emergency Phone:** [Your Emergency Number] (CRITICAL ONLY)
- **Available:** Limited availability while on holiday
- **Use Only When:** Complete system failure, data loss risk, security breach

---

## 🎯 SEVERITY CLASSIFICATION (CRITICAL IMPROVEMENT)

### **🔴 CRITICAL - Call Level 2 Immediately**
- **Complete system down** (no user access)
- **Data corruption or loss** detected
- **Security breach** suspected
- **Service won't start** after multiple attempts
- **Database connectivity** completely lost
- **Response Required:** Immediate (within 30 minutes)

### **🟡 HIGH - Contact Level 1**
- **Major functionality broken** (users can't perform key tasks)
- **Significant performance degradation** (>10 second response times)
- **API errors** affecting multiple users
- **Single component failure** with workaround available
- **Response Required:** Within 1 hour

### **🟢 MEDIUM - Document and Schedule**
- **Minor UI issues** or display problems
- **Individual user problems** (login issues, permissions)
- **Slow performance** but system functional
- **Non-critical feature not working**
- **Response Required:** Next business day

---

## 🔥 ENHANCED CRITICAL EMERGENCY SCENARIOS

### **1. COMPLETE SYSTEM DOWN**
**Symptoms:** 
- Users get "This site can't be reached" or similar errors
- Both http://intranet.kingston.local AND http://intranet.kingston.local:8001 are inaccessible
- No one can access the system

**ENHANCED IMMEDIATE ACTION:**
```powershell
# STEP 1: Quick System Status Check
Write-Host "=== EMERGENCY SYSTEM CHECK ===" -ForegroundColor Red
Get-Date | Write-Host -ForegroundColor Yellow

# Check service status with detailed output
$service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Service Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq "Running") {"Green"} else {"Red"})
    if ($service.Status -ne "Running") {
        Write-Host "Service is NOT running - attempting restart..." -ForegroundColor Red
    }
} else {
    Write-Host "SERVICE NOT FOUND - This is CRITICAL" -ForegroundColor Red
}

# STEP 2: Enhanced Service Recovery
if ($service -and $service.Status -ne "Running") {
    # Kill any zombie Python processes first
    Write-Host "Cleaning up Python processes..." -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    
    # Attempt service start
    Write-Host "Starting OfficeFastAPIService..." -ForegroundColor Yellow
    Start-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 15
    
    # Verify startup
    $service = Get-Service -Name "OfficeFastAPIService"
    Write-Host "Service Status After Restart: $($service.Status)" -ForegroundColor $(if ($service.Status -eq "Running") {"Green"} else {"Red"})
}

# STEP 3: IIS Reset with verification
Write-Host "Performing IIS Reset..." -ForegroundColor Yellow
iisreset /noforce
Start-Sleep -Seconds 10

# STEP 4: Comprehensive Testing
Write-Host "Testing system accessibility..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest "http://intranet.kingston.local" -TimeoutSec 10 -UseBasicParsing
    Write-Host "Frontend Status: $($frontend.StatusCode) - ACCESSIBLE" -ForegroundColor Green
} catch {
    Write-Host "Frontend Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $backend = Invoke-WebRequest "http://intranet.kingston.local:8001/docs" -TimeoutSec 10 -UseBasicParsing
    Write-Host "Backend Status: $($backend.StatusCode) - ACCESSIBLE" -ForegroundColor Green
} catch {
    Write-Host "Backend Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== END EMERGENCY CHECK ===" -ForegroundColor Red
```

**If Still Down - EMERGENCY ROLLBACK:**
```powershell
# Navigate to project directory
cd C:\path\to\kingstons_portal

# Create emergency backup of current state
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$emergencyBackup = "C:\Deployments\Backups\emergency_$timestamp"
Write-Host "Creating emergency backup: $emergencyBackup" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $emergencyBackup -Force
Copy-Item -Path "C:\Apps\portal_api\backend" -Destination "$emergencyBackup\backend" -Recurse -Force
Copy-Item -Path "C:\inetpub\wwwroot\OfficeIntranet" -Destination "$emergencyBackup\frontend" -Recurse -Force

# Get last known good commit (usually within last 5 commits)
Write-Host "Finding last working commit..." -ForegroundColor Yellow
git log --oneline -5

# Prompt for commit selection
$lastGoodCommit = Read-Host "Enter the commit hash of the last working version (or press Enter to use previous commit)"
if (-not $lastGoodCommit) {
    $lastGoodCommit = git log --format="%H" -n 1 --skip 1  # Get previous commit
}

# Execute emergency rollback
Write-Host "Executing emergency rollback to commit: $($lastGoodCommit.Substring(0,8))" -ForegroundColor Red
.\rollback_emergency.ps1 -CommitHash $lastGoodCommit -Verbose
```

### **2. API ERRORS / DATABASE ISSUES (ENHANCED)**
**Symptoms:**
- Frontend loads but shows errors like "Failed to load data" or "Server Error"
- API endpoints return 500 errors
- Users see "Database connection failed" messages

**ENHANCED DIAGNOSTIC APPROACH:**
```powershell
Write-Host "=== API/DATABASE DIAGNOSTIC ===" -ForegroundColor Cyan

# Test API health endpoint first
try {
    $health = Invoke-WebRequest "http://intranet.kingston.local:8001/api/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "API Health: $($health.StatusCode) - HEALTHY" -ForegroundColor Green
    
    # If health is OK, test data endpoints
    try {
        $clients = Invoke-WebRequest "http://intranet.kingston.local:8001/api/clients?limit=1" -TimeoutSec 10 -UseBasicParsing
        Write-Host "Database Test: $($clients.StatusCode) - CONNECTED" -ForegroundColor Green
        Write-Host "DIAGNOSIS: API and Database are working. Issue may be frontend-specific." -ForegroundColor Yellow
    } catch {
        Write-Host "Database Test: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "DIAGNOSIS: API works but database connection failed." -ForegroundColor Red
        
        # Enhanced database recovery
        Write-Host "Attempting database connection recovery..." -ForegroundColor Yellow
        Stop-Service -Name "OfficeFastAPIService" -Force
        Start-Sleep -Seconds 10
        
        # Check .env file integrity
        $envPath = "C:\Apps\portal_api\backend\.env"
        if (Test-Path $envPath) {
            Write-Host ".env file exists - checking DATABASE_URL..." -ForegroundColor Yellow
            $envContent = Get-Content $envPath | Where-Object {$_ -like "*DATABASE_URL*"}
            if ($envContent) {
                Write-Host "DATABASE_URL found in .env" -ForegroundColor Green
            } else {
                Write-Host "DATABASE_URL missing from .env - CRITICAL ISSUE" -ForegroundColor Red
            }
        } else {
            Write-Host ".env file MISSING - CRITICAL ISSUE" -ForegroundColor Red
        }
        
        Start-Service -Name "OfficeFastAPIService"
        Start-Sleep -Seconds 15
    }
    
} catch {
    Write-Host "API Health: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "DIAGNOSIS: Complete API failure. Service restart required." -ForegroundColor Red
    
    # Full service restart with enhanced monitoring
    Write-Host "Performing enhanced service restart..." -ForegroundColor Yellow
    Stop-Service -Name "OfficeFastAPIService" -Force
    
    # Check for stuck processes
    $pythonProcs = Get-Process | Where-Object {$_.ProcessName -like "*python*"}
    if ($pythonProcs) {
        Write-Host "Found $($pythonProcs.Count) Python processes - terminating..." -ForegroundColor Yellow
        $pythonProcs | Stop-Process -Force
    }
    
    Start-Sleep -Seconds 10
    Start-Service -Name "OfficeFastAPIService"
    Start-Sleep -Seconds 20
    
    # Re-test after restart
    try {
        $healthRetry = Invoke-WebRequest "http://intranet.kingston.local:8001/api/health" -TimeoutSec 15 -UseBasicParsing
        Write-Host "API Health After Restart: $($healthRetry.StatusCode) - RECOVERED" -ForegroundColor Green
    } catch {
        Write-Host "API Health After Restart: STILL FAILED" -ForegroundColor Red
        Write-Host "ESCALATE TO LEVEL 2 SUPPORT IMMEDIATELY" -ForegroundColor Red
    }
}

Write-Host "=== END DIAGNOSTIC ===" -ForegroundColor Cyan
```

### **3. FRONTEND NOT LOADING (ENHANCED)**
**Symptoms:**
- http://intranet.kingston.local shows IIS error page
- Blank white page with no content
- "HTTP Error 404" or similar IIS errors

**ENHANCED RECOVERY PROCEDURE:**
```powershell
Write-Host "=== FRONTEND RECOVERY DIAGNOSTIC ===" -ForegroundColor Magenta

# Step 1: Detailed IIS Analysis
Write-Host "Checking IIS status..." -ForegroundColor Yellow
$iisStatus = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
if ($iisStatus) {
    Write-Host "IIS Service Status: $($iisStatus.Status)" -ForegroundColor $(if ($iisStatus.Status -eq "Running") {"Green"} else {"Red"})
} else {
    Write-Host "IIS Service NOT FOUND - Major system issue" -ForegroundColor Red
}

# Step 2: Check frontend file integrity
$frontendPath = "C:\inetpub\wwwroot\OfficeIntranet"
$indexPath = "$frontendPath\index.html"

Write-Host "Checking frontend files..." -ForegroundColor Yellow
if (Test-Path $frontendPath) {
    $fileCount = (Get-ChildItem $frontendPath -Recurse -File).Count
    Write-Host "Frontend directory exists: $fileCount files found" -ForegroundColor Green
    
    if (Test-Path $indexPath) {
        $indexSize = (Get-Item $indexPath).Length
        Write-Host "index.html exists: $indexSize bytes" -ForegroundColor Green
        
        # Quick content validation
        $indexContent = Get-Content $indexPath -Raw -ErrorAction SilentlyContinue
        if ($indexContent -match "<!DOCTYPE html>" -or $indexContent -match "<html") {
            Write-Host "index.html contains valid HTML" -ForegroundColor Green
        } else {
            Write-Host "index.html appears corrupted or empty" -ForegroundColor Red
            $needsRedeploy = $true
        }
    } else {
        Write-Host "index.html MISSING - frontend deployment corrupted" -ForegroundColor Red
        $needsRedeploy = $true
    }
} else {
    Write-Host "Frontend directory MISSING - complete redeployment needed" -ForegroundColor Red
    $needsRedeploy = $true
}

# Step 3: IIS Reset with validation
Write-Host "Performing IIS reset..." -ForegroundColor Yellow
iisreset /noforce
Start-Sleep -Seconds 10

# Step 4: Test frontend after reset
try {
    $frontendTest = Invoke-WebRequest "http://intranet.kingston.local" -TimeoutSec 10 -UseBasicParsing
    Write-Host "Frontend after IIS reset: $($frontendTest.StatusCode) - WORKING" -ForegroundColor Green
    $needsRedeploy = $false
} catch {
    Write-Host "Frontend after IIS reset: STILL FAILED" -ForegroundColor Red
    $needsRedeploy = $true
}

# Step 5: Emergency frontend redeployment if needed
if ($needsRedeploy) {
    Write-Host "PERFORMING EMERGENCY FRONTEND REDEPLOYMENT" -ForegroundColor Red
    
    # Navigate to project directory
    $projectPath = "C:\path\to\kingstons_portal"  # Update this path
    if (Test-Path $projectPath) {
        Push-Location $projectPath
        
        # Quick build and deploy
        Write-Host "Building frontend..." -ForegroundColor Yellow
        Push-Location frontend
        npm install --silent
        npm run build --silent
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Frontend build successful" -ForegroundColor Green
            
            # Deploy to IIS
            Write-Host "Deploying to IIS..." -ForegroundColor Yellow
            if (Test-Path "C:\inetpub\wwwroot\OfficeIntranet") {
                Remove-Item "C:\inetpub\wwwroot\OfficeIntranet\*" -Recurse -Force
            }
            Copy-Item "dist\*" "C:\inetpub\wwwroot\OfficeIntranet\" -Recurse -Force
            
            iisreset /noforce
            Start-Sleep -Seconds 10
            
            # Final test
            try {
                $finalTest = Invoke-WebRequest "http://intranet.kingston.local" -TimeoutSec 10 -UseBasicParsing
                Write-Host "Frontend redeployment: SUCCESS ($($finalTest.StatusCode))" -ForegroundColor Green
            } catch {
                Write-Host "Frontend redeployment: FAILED - ESCALATE IMMEDIATELY" -ForegroundColor Red
            }
        } else {
            Write-Host "Frontend build FAILED - source code issues" -ForegroundColor Red
        }
        
        Pop-Location
        Pop-Location
    } else {
        Write-Host "Project directory not found at $projectPath" -ForegroundColor Red
        Write-Host "Cannot perform automatic redeployment - ESCALATE" -ForegroundColor Red
    }
}

Write-Host "=== END FRONTEND RECOVERY ===" -ForegroundColor Magenta
```

---

## 🛠️ ENHANCED SELF-DIAGNOSTIC TOOLS

### **Comprehensive Quick Health Check**
```powershell
# Run the enhanced monitoring script
.\monitor_system_health_improved.ps1 -SendAlerts

# Alternative quick manual check
Write-Host "=== QUICK SYSTEM HEALTH CHECK ===" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Yellow

# Service Status
$service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
Write-Host "Service: $(if ($service) { $service.Status } else { "NOT FOUND" })" -ForegroundColor $(if ($service -and $service.Status -eq "Running") {"Green"} else {"Red"})

# Port Tests
$ports = @(80, 8001)
foreach ($port in $ports) {
    $portTest = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    Write-Host "Port $port : $(if ($portTest.TcpTestSucceeded) {"OPEN"} else {"CLOSED"})" -ForegroundColor $(if ($portTest.TcpTestSucceeded) {"Green"} else {"Red"})
}

# Quick URL Tests
$urls = @(
    @{Url="http://intranet.kingston.local"; Name="Frontend"},
    @{Url="http://intranet.kingston.local:8001/docs"; Name="Backend API"}
)

foreach ($urlTest in $urls) {
    try {
        $response = Invoke-WebRequest $urlTest.Url -TimeoutSec 5 -UseBasicParsing
        Write-Host "$($urlTest.Name): $($response.StatusCode) (${response.Headers.'Content-Length'} bytes)" -ForegroundColor Green
    } catch {
        Write-Host "$($urlTest.Name): FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Resource Quick Check
$cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1
$memory = Get-Counter "\Memory\Available MBytes"
Write-Host "CPU: $([math]::Round($cpu.CounterSamples[0].CookedValue, 1))%" -ForegroundColor Yellow
Write-Host "Available Memory: $([math]::Round($memory.CounterSamples[0].CookedValue, 0)) MB" -ForegroundColor Yellow

Write-Host "=== END QUICK CHECK ===" -ForegroundColor Green
```

---

## 🔄 ENHANCED RECOVERY PROCEDURES

### **Smart Service Recovery**
```powershell
function Restart-KingstonsPortalService {
    param([switch]$Force)
    
    Write-Host "=== SMART SERVICE RECOVERY ===" -ForegroundColor Cyan
    
    # Step 1: Assess current state
    $service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Host "Service not found - this requires manual intervention" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Current service status: $($service.Status)" -ForegroundColor Yellow
    
    # Step 2: Smart process cleanup
    $pythonProcesses = Get-Process | Where-Object {$_.ProcessName -like "*python*"}
    if ($pythonProcesses) {
        Write-Host "Found $($pythonProcesses.Count) Python processes:" -ForegroundColor Yellow
        foreach ($proc in $pythonProcesses) {
            Write-Host "  PID $($proc.Id): $($proc.ProcessName) (Memory: $([math]::Round($proc.WorkingSet64/1MB, 1))MB)" -ForegroundColor Yellow
        }
        
        if ($Force -or $service.Status -ne "Running") {
            Write-Host "Terminating Python processes..." -ForegroundColor Yellow
            $pythonProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 5
        }
    }
    
    # Step 3: Service restart with timing
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    if ($service.Status -eq "Running") {
        Write-Host "Stopping service..." -ForegroundColor Yellow
        Stop-Service -Name "OfficeFastAPIService" -Force
    }
    
    Start-Sleep -Seconds 5
    
    Write-Host "Starting service..." -ForegroundColor Yellow
    Start-Service -Name "OfficeFastAPIService"
    
    # Step 4: Startup monitoring
    $maxWaitTime = 60  # seconds
    $waited = 0
    $checkInterval = 5
    
    while ($waited -lt $maxWaitTime) {
        Start-Sleep -Seconds $checkInterval
        $waited += $checkInterval
        
        $service = Get-Service -Name "OfficeFastAPIService"
        Write-Host "After ${waited}s: Service is $($service.Status)" -ForegroundColor Yellow
        
        if ($service.Status -eq "Running") {
            # Test if service is actually responding
            try {
                $response = Invoke-WebRequest "http://intranet.kingston.local:8001/api/health" -TimeoutSec 5 -UseBasicParsing
                $stopwatch.Stop()
                Write-Host "Service fully operational after $($stopwatch.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
                return $true
            } catch {
                Write-Host "Service running but not responding yet..." -ForegroundColor Yellow
            }
        }
    }
    
    $stopwatch.Stop()
    Write-Host "Service restart timed out after $maxWaitTime seconds" -ForegroundColor Red
    return $false
}

# Usage: Restart-KingstonsPortalService -Force
```

---

## 📋 ENHANCED TROUBLESHOOTING DECISION TREE

### **Problem Assessment Workflow**
```
1. Can users access http://intranet.kingston.local?
   ├─ NO → Go to "COMPLETE SYSTEM DOWN" procedure
   └─ YES → Continue to step 2

2. Can users see data/content, or just error messages?
   ├─ ERROR MESSAGES → Go to "API/DATABASE ISSUES" procedure
   └─ SEES CONTENT → Continue to step 3

3. Is the system slow or having intermittent issues?
   ├─ VERY SLOW (>10 sec) → Check resources, restart service
   ├─ INTERMITTENT → Run enhanced monitoring, document patterns
   └─ MINOR ISSUES → Document for developer return

4. Are issues affecting all users or just some?
   ├─ ALL USERS → System-wide issue, follow procedures above
   └─ SOME USERS → Individual user issue, check browser/permissions
```

### **When to Escalate (Enhanced Guidelines)**

**🔴 IMMEDIATE ESCALATION (Level 2 - Critical Support):**
- System down for >15 minutes despite following procedures
- Service won't start after multiple attempts
- "CRITICAL" status from enhanced monitoring script
- Any indication of data corruption or loss
- Security-related errors or suspicious activity

**🟡 ESCALATE WITHIN 1 HOUR (Level 1 - Technical Support):**
- System working but with major issues affecting >50% of users
- Performance severely degraded but system functional
- Repeated service crashes
- "UNHEALTHY" status from monitoring with multiple failed components

**🟢 DOCUMENT AND WAIT (Normal Response):**
- Minor UI issues that don't prevent work
- Single user problems
- Cosmetic issues
- "HEALTHY" status with minor warnings

---

## 📞 ENHANCED COMMUNICATION TEMPLATES

### **Critical Issue Notification**
```
URGENT: Kingston's Portal System Alert

Status: CRITICAL FAILURE
Time: [Current Time]
Duration: [How long system has been down]

ISSUE: [Brief description]

IMMEDIATE IMPACT:
• All users cannot access the portal
• No business functions available
• [Other specific impacts]

ACTIONS TAKEN:
✓ [Action 1 with timestamp]
✓ [Action 2 with timestamp]
✗ [Failed action with details]

CURRENT STATUS: [Working on X, trying Y]

ESTIMATED RESOLUTION: [Time estimate or "Unknown - escalating"]

NEXT STEPS:
• [Next action being attempted]
• [Escalation plan if current action fails]

Contact: [Your contact information]
This message sent: [Timestamp]
```

---

This enhanced version provides much more reliable diagnostics, better error recovery, and clearer escalation procedures. The scripts now include comprehensive error handling and detailed logging for better troubleshooting.
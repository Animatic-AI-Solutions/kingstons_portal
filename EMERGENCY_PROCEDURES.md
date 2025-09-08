# 🚨 Kingston's Portal - Emergency Procedures
## Holiday Absence Management Guide

**Developer Away:** Friday [Date] to [Return Date]  
**System:** Kingston's Portal Production Environment  
**Location:** Kingston03 Server (192.168.0.223)

---

## 🆘 IMMEDIATE EMERGENCY CONTACTS

### System Issues (Business Hours)
- **Primary Contact:** [Backup Administrator Name]
- **Phone:** [Phone Number]
- **Email:** [Email Address]

### Critical System Failure (24/7)
- **Emergency Contact:** [Emergency Contact Name]  
- **Phone:** [Emergency Phone]
- **Email:** [Emergency Email]

### Business Stakeholder
- **Manager:** [Manager Name]
- **Phone:** [Manager Phone]
- **Email:** [Manager Email]

---

## 🔥 CRITICAL EMERGENCY SCENARIOS

### 1. COMPLETE SYSTEM DOWN
**Symptoms:** Users cannot access http://intranet.kingston.local

**IMMEDIATE ACTION:**
```powershell
# Step 1: Check service status (run as Administrator)
Get-Service -Name "OfficeFastAPIService"

# Step 2: If service is stopped, start it
Start-Service -Name "OfficeFastAPIService"

# Step 3: Reset IIS
iisreset

# Step 4: Wait 30 seconds and test
# Frontend: http://intranet.kingston.local  
# Backend: http://intranet.kingston.local:8001/docs
```

**If still down, EMERGENCY ROLLBACK:**
```powershell
# Navigate to project directory
cd C:\path\to\kingstons_portal

# Run emergency rollback (get commit from git log)
git log --oneline -5
.\rollback_emergency.ps1 -CommitHash [LAST_WORKING_COMMIT]
```

### 2. API ERRORS / DATABASE ISSUES
**Symptoms:** Frontend loads but shows errors, API returns 500 errors

**IMMEDIATE ACTION:**
```powershell
# Check API health
Invoke-WebRequest "http://intranet.kingston.local:8001/api/health" -UseBasicParsing

# Check database connectivity
Invoke-WebRequest "http://intranet.kingston.local:8001/api/clients?limit=1" -UseBasicParsing

# If database connection fails, restart service
Stop-Service -Name "OfficeFastAPIService" -Force
Start-Sleep -Seconds 10
Start-Service -Name "OfficeFastAPIService"
```

### 3. FRONTEND NOT LOADING
**Symptoms:** http://intranet.kingston.local shows IIS error or blank page

**IMMEDIATE ACTION:**
```powershell
# Reset IIS
iisreset

# Check if frontend files exist
Test-Path "C:\inetpub\wwwroot\OfficeIntranet\index.html"

# If files missing, redeploy frontend
cd C:\path\to\kingstons_portal\frontend
npm run build
# Copy dist/* to C:\inetpub\wwwroot\OfficeIntranet\
```

---

## 🛠️ SELF-DIAGNOSTIC TOOLS

### Quick Health Check
```powershell
# Run the automated health check
.\monitor_system_health.ps1

# Check deployment status  
.\check_deployment_status.ps1
```

### Manual System Verification
```powershell
# 1. Service Status
Get-Service -Name "OfficeFastAPIService"

# 2. Port Check
Test-NetConnection -ComputerName localhost -Port 8001
Test-NetConnection -ComputerName localhost -Port 80

# 3. File System Check
Test-Path "C:\Apps\portal_api\backend"
Test-Path "C:\Apps\portal_api\backend\.env" 
Test-Path "C:\inetpub\wwwroot\OfficeIntranet"

# 4. Process Check
Get-Process | Where-Object {$_.ProcessName -like "*python*"}
```

---

## 🔄 RECOVERY PROCEDURES

### Service Recovery
```powershell
# If OfficeFastAPIService keeps stopping
Stop-Service -Name "OfficeFastAPIService" -Force
Start-Sleep -Seconds 5

# Check for errors in Event Viewer or service logs
Get-EventLog -LogName Application -Source "OfficeFastAPIService" -Newest 10

# Restart with verbose logging
Start-Service -Name "OfficeFastAPIService"
Start-Sleep -Seconds 10
Get-Service -Name "OfficeFastAPIService"
```

### Database Connection Recovery
```powershell
# Test database connectivity from backend location
cd C:\Apps\portal_api\backend
.\venv\Scripts\Activate.ps1

# Test database connection (if psql is available)
# psql $DATABASE_URL -c "SELECT 1;"

# Check .env file configuration
Get-Content .env | Select-String "DATABASE_URL"
```

### Performance Issues Recovery
```powershell
# Check system resources
Get-Counter "\Processor(_Total)\% Processor Time"
Get-Counter "\Memory\Available MBytes"

# Check for memory leaks
Get-Process python | Sort-Object WorkingSet -Descending

# If high memory usage, restart service
Stop-Service -Name "OfficeFastAPIService" -Force
Start-Sleep -Seconds 10
Start-Service -Name "OfficeFastAPIService"
```

---

## 📋 TROUBLESHOOTING CHECKLIST

### System Down Checklist
- [ ] Check OfficeFastAPIService status
- [ ] Verify ports 80 and 8001 are accessible  
- [ ] Test API health endpoint
- [ ] Check database connectivity
- [ ] Verify critical file paths exist
- [ ] Check system resources (CPU, Memory, Disk)
- [ ] Review Event Viewer for errors
- [ ] Try service restart
- [ ] Try IIS reset
- [ ] If all fails, attempt emergency rollback

### Performance Issues Checklist  
- [ ] Check API response times
- [ ] Monitor CPU usage
- [ ] Monitor memory usage
- [ ] Check disk space
- [ ] Review database query performance
- [ ] Check for memory leaks
- [ ] Consider service restart

### Data Issues Checklist
- [ ] Verify database connectivity
- [ ] Check .env configuration
- [ ] Test API endpoints manually
- [ ] Review application logs
- [ ] Check for database locks
- [ ] Verify data integrity

---

## 🔐 ACCESS INFORMATION

### Server Access
- **Server:** Kingston03 (192.168.0.223)
- **Remote Desktop:** Available on internal network
- **Admin Account:** [Administrator Username]
- **Location:** Physical server at [Location]

### Application Locations
- **Frontend:** `C:\inetpub\wwwroot\OfficeIntranet`
- **Backend:** `C:\Apps\portal_api\backend`
- **Project Source:** `C:\path\to\kingstons_portal` (git repository)
- **Logs:** `C:\Logs\portal_monitoring.log`

### Service Configuration
- **Service Name:** OfficeFastAPIService
- **Port:** 8001
- **Process:** Python running FastAPI
- **Management:** Windows Service (NSSM)

---

## 📞 ESCALATION PROCEDURES

### Severity Levels

#### 🔴 CRITICAL (Immediate Response Required)
- System completely down
- Data loss risk
- Security breach
- **Action:** Call emergency contact immediately

#### 🟡 HIGH (Response within 1 hour)  
- Major functionality broken
- API errors affecting users
- Performance severely degraded
- **Action:** Contact primary support, attempt immediate fixes

#### 🟢 MEDIUM (Response within 4 hours)
- Minor features affected
- Slow performance
- UI issues
- **Action:** Document issue, attempt standard recovery procedures

### Escalation Path
1. **Self-Diagnosis** (0-15 minutes)
   - Run automated health checks
   - Try standard recovery procedures
   - Document all actions taken

2. **Technical Support** (15-30 minutes)
   - Contact backup administrator
   - Provide health check results
   - Follow guided troubleshooting

3. **Emergency Contact** (30+ minutes or critical issues)
   - Contact emergency technical support
   - Provide complete system status
   - Prepare for emergency rollback if needed

4. **Business Stakeholder** (1+ hours or business impact)
   - Notify management of extended outage
   - Provide estimated resolution time
   - Discuss business continuity measures

---

## 📝 INCIDENT DOCUMENTATION

### Required Information to Collect
- **Time of Issue:** [Timestamp]
- **Symptoms Observed:** [Description]
- **Actions Taken:** [Detailed steps]
- **Current Status:** [System state]
- **Health Check Results:** [Output from monitoring script]
- **Error Messages:** [Any error messages seen]
- **Contact Information:** [Who has been notified]

### Documentation Template
```
INCIDENT REPORT - Kingston's Portal
=====================================
Date/Time: [Timestamp]
Severity: [Critical/High/Medium/Low]
Status: [Ongoing/Resolved/Escalated]

SUMMARY:
[Brief description of the issue]

SYMPTOMS:
- [Observable symptoms]
- [User impact]

ACTIONS TAKEN:
1. [Action with timestamp]
2. [Action with timestamp]
3. [Action with timestamp]

CURRENT STATUS:
[Current system state and next steps]

CONTACTS NOTIFIED:
- [Name] at [Time] via [Method]

ADDITIONAL NOTES:
[Any relevant information]
```

---

## 🏥 RECOVERY VALIDATION

### Post-Recovery Checklist
After any recovery action, verify:

- [ ] **Frontend Accessibility**
  - [ ] http://intranet.kingston.local loads correctly
  - [ ] No JavaScript errors in browser console
  - [ ] Navigation works properly

- [ ] **Backend Functionality**  
  - [ ] http://intranet.kingston.local:8001/docs accessible
  - [ ] API health check returns 200 OK
  - [ ] Database queries execute successfully

- [ ] **User Authentication**
  - [ ] Login functionality works
  - [ ] Session management operational
  - [ ] User permissions correct

- [ ] **Core Business Functions**
  - [ ] Client data loading
  - [ ] Portfolio information displaying  
  - [ ] Reports generating successfully
  - [ ] Data entry/editing working

- [ ] **Performance Metrics**
  - [ ] API response times < 5 seconds
  - [ ] Frontend load times < 5 seconds  
  - [ ] System resource usage normal

### Success Criteria
System is considered fully recovered when:
- All checklist items above are verified ✅
- Users can perform their normal daily tasks
- Performance is within acceptable ranges
- No error messages or warnings appear
- System stability maintained for 30+ minutes

---

## 📚 ADDITIONAL RESOURCES

### Log Locations
- **System Monitoring:** `C:\Logs\portal_monitoring.log`
- **Windows Event Log:** Event Viewer → Application logs
- **IIS Logs:** `C:\inetpub\logs\LogFiles\`
- **Application Logs:** Check backend application output

### Useful Commands Reference
```powershell
# Service management
Get-Service -Name "OfficeFastAPIService"
Start-Service -Name "OfficeFastAPIService"  
Stop-Service -Name "OfficeFastAPIService" -Force
Restart-Service -Name "OfficeFastAPIService"

# Network testing
Test-NetConnection -ComputerName localhost -Port 8001
Test-NetConnection -ComputerName localhost -Port 80
Invoke-WebRequest "http://intranet.kingston.local" -UseBasicParsing

# System monitoring  
Get-Counter "\Processor(_Total)\% Processor Time"
Get-Counter "\Memory\Available MBytes"
Get-Process python | Sort-Object WorkingSet -Descending

# File system checks
Test-Path "C:\Apps\portal_api\backend\.env"
Get-ChildItem "C:\inetpub\wwwroot\OfficeIntranet" | Measure-Object
```

### Git Commands (if needed)
```bash
# Check current status
git status
git log --oneline -10

# Emergency rollback
git stash
git checkout [COMMIT_HASH]

# Return to latest
git checkout main
git stash pop
```

---

## ⚠️ IMPORTANT REMINDERS

### DO NOT:
- ❌ Delete or modify `.env` files without backup
- ❌ Stop services without understanding impact  
- ❌ Make code changes during emergencies
- ❌ Restart the server unless absolutely necessary
- ❌ Modify database directly without consulting developer

### DO:
- ✅ Document all actions taken with timestamps
- ✅ Contact appropriate support levels in order
- ✅ Verify system status after any changes
- ✅ Keep stakeholders informed of progress
- ✅ Prioritize system stability over feature fixes

### Emergency Philosophy:
**"Restore service first, investigate cause later"**

The priority during an emergency is to get users back to working status as quickly as possible. Root cause analysis and permanent fixes can wait until the system is stable and users are productive.

---

**Last Updated:** [Date]  
**Prepared for Holiday Period:** [Date Range]  
**Emergency Contact Response Time:** Within 30 minutes during business hours, within 2 hours after hours
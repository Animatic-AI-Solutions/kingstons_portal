# Performance Monitoring and Observability

## Overview

Kingston's Portal implements **lightweight performance monitoring** focused on logging, error tracking, and basic performance indicators. The monitoring strategy prioritizes simplicity and reliability for the 2-developer team environment while providing essential observability into system health and performance.

## Current Monitoring Infrastructure

### Application Logging

**Backend Logging Configuration** (`main.py`):
```python
import logging
import sys

# Configure root logger with environment-based level
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG", "False").lower() == "true" else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Reduce noise from external libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
```

**Logging Distribution Analysis**:
- **140+ logging statements** across backend codebase
- **Primary locations**: Authentication, database operations, API routes
- **Log levels**: DEBUG (development), INFO (production), WARNING/ERROR (issues)

### Performance Indicators

**Current Performance Metrics** (implicitly tracked):

1. **Database Query Performance**
   - Ultra-fast analytics: 67→2 seconds optimization achieved
   - Pre-computed views reduce query complexity
   - Indexed queries for common operations

2. **Frontend Build Performance**
   ```javascript
   // vite.config.js optimization settings
   build: {
     chunkSizeWarningLimit: 1000,        // Monitor large chunks
     reportCompressedSize: true,         // Track bundle compression
     sourcemap: true,                    // Debug capability
     rollupOptions: {
       output: {
         manualChunks: undefined         // Automatic chunk optimization
       }
     }
   }
   ```

3. **Service Availability**
   - Windows service monitoring: `OfficeFastAPIService`
   - IIS frontend hosting availability
   - Manual health checks during deployment

## Monitoring Strategy

### 1. Application Health Monitoring

**Service Level Monitoring**:
```powershell
# Service health check (included in deployment scripts)
$service = Get-Service -Name "OfficeFastAPIService"
if ($service.Status -eq "Running") {
    Write-Host "SUCCESS: Service is running" -ForegroundColor Green
} else {
    Write-Host "WARNING: Service status is $($service.Status)" -ForegroundColor Yellow
}
```

**Endpoint Health Checks**:
```bash
# Basic connectivity verification
curl -f http://intranet.kingston.local/          # Frontend health
curl -f http://intranet.kingston.local:8001/docs # Backend API health
```

### 2. Error Tracking and Alerting

**Backend Error Monitoring**:
```python
# Comprehensive error logging across routes
logger = logging.getLogger(__name__)

try:
    # Business logic
    result = await process_request(data)
except HTTPException as he:
    logger.error(f"HTTP Exception: {str(he)}")
    raise
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
```

**Frontend Error Boundaries**:
```typescript
// ReportErrorBoundary.tsx - Production-ready error handling
class ReportErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Report error:', error, errorInfo);
    // In production, could send to error tracking service
  }
}
```

### 3. Performance Baselines

**Database Performance Benchmarks**:

| Operation | Optimized Performance | Baseline (Before) |
|-----------|----------------------|-------------------|
| Analytics Dashboard | < 2 seconds | 67+ seconds |
| Client Data Bulk Load | < 5 seconds | N/A |
| IRR Calculations | < 3 seconds | N/A |
| Report Generation | < 10 seconds | N/A |

**Frontend Performance Targets**:
```javascript
// Performance budgets (implicit)
{
  "chunkSizeWarning": "1000kb",     // Large chunk warning threshold
  "buildTime": "< 2 minutes",       // Acceptable build time
  "loadTime": "< 3 seconds",        // Page load target
  "bundleSize": "< 5MB total"       // Total bundle size target
}
```

## Monitoring Implementation

### 1. Log Analysis and Monitoring

**Log Collection Strategy**:
```powershell
# Windows Event Log integration (production)
# Logs from OfficeFastAPIService automatically captured
Get-EventLog -LogName Application -Source "Python Service Wrapper" -Newest 50

# File-based logging (development)
# stdout logging captured during development
```

**Key Monitoring Patterns**:
```python
# Authentication monitoring
logger.info(f"Login attempt started for email: {email}")
logger.warning(f"Login failed: Invalid password for email {email}")
logger.info(f"User authenticated via cookie token: {user_id}")

# Performance monitoring
logger.info(f"Analytics dashboard cache hit: {cache_key}")
logger.warning(f"Slow query detected: {query_time}ms")

# Error monitoring
logger.error(f"Database connection failed: {str(error)}")
logger.error(f"Unexpected error in {endpoint}: {str(e)}")
```

### 2. Database Performance Monitoring

**Query Performance Analysis**:
```sql
-- Monitor slow queries (PostgreSQL)
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- Queries taking > 1 second
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Monitor table activity
SELECT schemaname, tablename, seq_tup_read, idx_tup_fetch, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC;
```

**Index Performance Monitoring**:
```sql
-- Current index utilization (from database documentation)
-- Critical indexes for performance:
CREATE INDEX idx_holding_activity_log_timestamp ON holding_activity_log (activity_timestamp);
CREATE INDEX idx_portfolio_fund_valuations_date ON portfolio_fund_valuations (valuation_date);
CREATE INDEX idx_portfolio_irr_values_date ON portfolio_irr_values (date);
CREATE INDEX idx_client_products_client_id ON client_products (client_id);
CREATE INDEX idx_user_page_presence_last_seen ON user_page_presence (last_seen);
```

### 3. System Resource Monitoring

**Resource Monitoring Script**:
```powershell
# system_monitor.ps1 - Basic system health check
Write-Host "Kingston's Portal - System Resource Monitor" -ForegroundColor Green

# CPU Usage
$cpu = Get-WmiObject win32_processor | Measure-Object -property LoadPercentage -Average
Write-Host "CPU Usage: $($cpu.Average)%" -ForegroundColor $(if ($cpu.Average -gt 80) { "Red" } else { "Green" })

# Memory Usage
$mem = Get-WmiObject win32_operatingsystem
$memUsage = [math]::Round((($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize) * 100, 2)
Write-Host "Memory Usage: $memUsage%" -ForegroundColor $(if ($memUsage -gt 80) { "Red" } else { "Green" })

# Disk Space
$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
Write-Host "Disk Usage (C:): $diskUsage%" -ForegroundColor $(if ($diskUsage -gt 80) { "Red" } else { "Green" })

# Service Status
$service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
Write-Host "FastAPI Service: $($service.Status)" -ForegroundColor $(if ($service.Status -eq "Running") { "Green" } else { "Red" })

# Network Connectivity
try {
    $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 5 -UseBasicParsing
    Write-Host "Frontend: ACCESSIBLE" -ForegroundColor Green
} catch {
    Write-Host "Frontend: NOT ACCESSIBLE" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/docs" -TimeoutSec 5 -UseBasicParsing
    Write-Host "Backend API: ACCESSIBLE" -ForegroundColor Green
} catch {
    Write-Host "Backend API: NOT ACCESSIBLE" -ForegroundColor Red
}
```

## Alerting and Notification Strategy

### 1. Critical Issue Detection

**Immediate Alert Conditions**:
- Service stops running (`OfficeFastAPIService` down)
- Database connection failures
- Authentication system failures
- API response time > 30 seconds
- Frontend build failures

**Alert Implementation** (manual monitoring currently):
```powershell
# Critical service monitoring
$service = Get-Service -Name "OfficeFastAPIService"
if ($service.Status -ne "Running") {
    Write-Host "ALERT: FastAPI Service is down!" -ForegroundColor Red
    # Could integrate with email/SMS notification
}

# Database connectivity check
try {
    $dbTest = psql $env:DATABASE_URL -c "SELECT 1;" -t
    if (-not $dbTest) {
        Write-Host "ALERT: Database connectivity issue!" -ForegroundColor Red
    }
} catch {
    Write-Host "ALERT: Database connection failed!" -ForegroundColor Red
}
```

### 2. Performance Degradation Detection

**Performance Alert Thresholds**:
```python
# Backend performance monitoring (in application code)
import time
import logging

logger = logging.getLogger(__name__)

def monitor_performance(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        if execution_time > 5.0:  # Alert threshold: 5 seconds
            logger.warning(f"Slow operation detected: {func.__name__} took {execution_time:.2f}s")
        elif execution_time > 10.0:  # Critical threshold: 10 seconds
            logger.error(f"Critical performance issue: {func.__name__} took {execution_time:.2f}s")
        
        return result
    return wrapper
```

## Monitoring Dashboard Implementation

### 1. Simple Status Dashboard

**Basic HTML Status Page** (could be added to project):
```html
<!-- /status.html - Simple monitoring dashboard -->
<!DOCTYPE html>
<html>
<head>
    <title>Kingston's Portal - System Status</title>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <h1>System Status Dashboard</h1>
    
    <div id="services">
        <h2>Services</h2>
        <div id="frontend-status">Frontend: <span id="frontend-indicator">Loading...</span></div>
        <div id="backend-status">Backend API: <span id="backend-indicator">Loading...</span></div>
    </div>
    
    <div id="performance">
        <h2>Performance Metrics</h2>
        <div>Analytics Dashboard: < 2s (Target)</div>
        <div>Report Generation: < 10s (Target)</div>
    </div>
    
    <script>
        // Simple JavaScript health checks
        async function checkHealth() {
            try {
                const frontendResponse = await fetch('/');
                document.getElementById('frontend-indicator').textContent = 'HEALTHY';
                document.getElementById('frontend-indicator').style.color = 'green';
            } catch (error) {
                document.getElementById('frontend-indicator').textContent = 'DOWN';
                document.getElementById('frontend-indicator').style.color = 'red';
            }
            
            try {
                const backendResponse = await fetch('/api/health');
                document.getElementById('backend-indicator').textContent = 'HEALTHY';
                document.getElementById('backend-indicator').style.color = 'green';
            } catch (error) {
                document.getElementById('backend-indicator').textContent = 'DOWN';
                document.getElementById('backend-indicator').style.color = 'red';
            }
        }
        
        checkHealth();
        setInterval(checkHealth, 30000); // Check every 30 seconds
    </script>
</body>
</html>
```

### 2. Log Analysis Tools

**PowerShell Log Analysis Script**:
```powershell
# analyze_logs.ps1 - Basic log analysis
param(
    [string]$LogPath = "C:\Apps\portal_api\logs\",
    [int]$Hours = 24
)

Write-Host "Log Analysis - Last $Hours hours" -ForegroundColor Green

# Error pattern analysis
$errorPatterns = @(
    "ERROR",
    "CRITICAL",
    "Exception",
    "Failed",
    "Timeout"
)

foreach ($pattern in $errorPatterns) {
    $count = Get-ChildItem $LogPath -Filter "*.log" | Select-String -Pattern $pattern | Measure-Object
    Write-Host "$pattern occurrences: $($count.Count)" -ForegroundColor $(if ($count.Count -gt 10) { "Red" } else { "Yellow" })
}

# Performance pattern analysis
$slowQueries = Get-ChildItem $LogPath -Filter "*.log" | Select-String -Pattern "slow|timeout|performance"
Write-Host "Slow operation warnings: $($slowQueries.Count)" -ForegroundColor $(if ($slowQueries.Count -gt 5) { "Red" } else { "Green" })

# Authentication analysis
$authEvents = Get-ChildItem $LogPath -Filter "*.log" | Select-String -Pattern "Login|Authentication|Token"
Write-Host "Authentication events: $($authEvents.Count)" -ForegroundColor Blue
```

## Performance Monitoring Best Practices

### 1. Proactive Monitoring

**Daily Health Checks**:
```markdown
## Daily System Health Checklist
- [ ] FastAPI Service running
- [ ] Frontend accessible (intranet.kingston.local)
- [ ] Backend API accessible (intranet.kingston.local:8001/docs)
- [ ] Database connectivity confirmed
- [ ] No critical errors in logs
- [ ] System resource usage normal (< 80% CPU, Memory, Disk)
```

**Weekly Performance Review**:
```markdown
## Weekly Performance Assessment
- [ ] Review slow query logs
- [ ] Analyze error patterns
- [ ] Check database index utilization
- [ ] Monitor bundle size growth
- [ ] Assess user feedback for performance issues
```

### 2. Performance Optimization Triggers

**When to Investigate Performance**:
- Response times > 5 seconds consistently
- Error rates > 5% over 1-hour period
- System resource usage > 80% sustained
- User complaints about system slowness
- Database query times > 1 second average

**Optimization Priority Matrix**:

| Impact | Effort | Priority | Action |
|--------|--------|----------|--------|
| High | Low | P0 | Immediate fix |
| High | High | P1 | Plan sprint |
| Low | Low | P2 | Backlog |
| Low | High | P3 | Consider alternatives |

## Integration with Development Workflow

### 1. Performance Testing in Development

**Pre-deployment Performance Checks**:
```bash
# Add to development workflow
npm run build                    # Check build performance
npm test                        # Verify test performance
curl -w "%{time_total}" http://localhost:3000/  # Basic load time test
```

### 2. Production Performance Monitoring

**Post-deployment Verification**:
```powershell
# Include in deploy_minimal.ps1
Write-Host "Performing post-deployment health checks..." -ForegroundColor Cyan

# Basic performance verification
$start = Get-Date
try {
    $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 10
    $loadTime = (Get-Date) - $start
    Write-Host "Frontend load time: $($loadTime.TotalSeconds) seconds" -ForegroundColor Green
} catch {
    Write-Host "Frontend performance check failed" -ForegroundColor Red
}

# API response time check
$start = Get-Date
try {
    $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/docs" -TimeoutSec 10
    $apiTime = (Get-Date) - $start
    Write-Host "API response time: $($apiTime.TotalSeconds) seconds" -ForegroundColor Green
} catch {
    Write-Host "API performance check failed" -ForegroundColor Red
}
```

This performance monitoring strategy provides essential observability for Kingston's Portal while maintaining simplicity appropriate for the 2-developer team environment. The approach focuses on proactive monitoring of critical system health indicators and performance baselines.
# Deployment Process

This document provides a comprehensive overview of the Kingston's Portal deployment architecture and processes for both development and production environments.

## 1. Production Architecture Overview

### Kingston03 Server Environment

**Server Details:**
- **Machine Name:** Kingston03 (Virtual Machine)
- **IP Address:** 192.168.0.223
- **Operating System:** Windows Server
- **Primary Roles:** Internal DNS Server, Web Server (IIS), Application Server (FastAPI)

**DNS Configuration:**
- **DNS Server:** 192.168.0.223 (self-hosted)
- **Domain:** intranet.kingston.local → 192.168.0.223
- **Client Configuration:** All network clients use 192.168.0.223 as primary DNS

### Production Components

#### 1. Frontend (React Static Files via IIS)
- **Web Server:** Internet Information Services (IIS) 10.0
- **Physical Path:** `C:\inetpub\wwwroot\OfficeIntranet`
- **IIS Site Bindings:**
  - Type: `http`
  - IP Address: `*` (All Unassigned)
  - Port: `80`
  - Host Name: `intranet.kingston.local`
- **Default Document:** `index.html`

#### 2. Backend (FastAPI Direct Service)
- **Application:** Python FastAPI application
- **Deployment Method:** Windows Service (via NSSM)
- **Listening Address:** `0.0.0.0:8001`
- **Service Configuration:**
  - Environment Variables: `API_HOST=0.0.0.0`, `API_PORT=8001`
  - Windows Firewall: Inbound TCP rule for port 8001
- **Database:** PostgreSQL database server

#### 3. Client-Side API Communication
- **Architecture:** Direct API calls to FastAPI (bypasses IIS proxy)
- **Environment Detection:** Automatic development/production URL selection
- **Production URL:** `http://intranet.kingston.local:8001/api/`
- **Development URL:** Vite proxy to `localhost:8001`

## 2. Environment-Based Configuration

### Development Environment
```javascript
// Automatic environment detection
const getApiBaseUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
  
  return isDevelopment ? '' : 'http://intranet.kingston.local:8001';
};
```

**Development Setup:**
- **Frontend:** Vite dev server on port 3000
- **Backend:** FastAPI on port 8001
- **API Calls:** Proxied through Vite (empty baseURL)
- **Database:** PostgreSQL (same as production)

### Production Environment
- **Frontend:** IIS static files on port 80
- **Backend:** FastAPI Windows service on port 8001
- **API Calls:** Direct to `http://intranet.kingston.local:8001`
- **Database:** PostgreSQL database server

## 3. Building for Production

### Step 1: Build Frontend Assets
```bash
cd frontend
npm install
npm run build
```

**Build Configuration (vite.config.js):**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Prevents React initialization issues
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        safari10: true,
      },
    },
  }
});
```

### Step 2: Deploy Frontend to IIS
1. **Copy Built Assets:**
   ```bash
   # Copy contents of frontend/dist/ to C:\inetpub\wwwroot\OfficeIntranet
   ```

2. **Configure IIS URL Rewrite (web.config):**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
       <system.webServer>
           <rewrite>
               <rules>
                   <rule name="React_SPA_Fallback" stopProcessing="true">
                       <match url=".*" />
                       <conditions logicalGrouping="MatchAll">
                           <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                           <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                       </conditions>
                       <action type="Rewrite" url="/index.html" />
                   </rule>
               </rules>
           </rewrite>
           <staticContent>
               <mimeMap fileExtension=".json" mimeType="application/json" />
           </staticContent>
           <defaultDocument>
               <files>
                   <add value="index.html" />
               </files>
           </defaultDocument>
       </system.webServer>
   </configuration>
   ```

### Step 3: Deploy Backend as Windows Service
1. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure NSSM Service:**
   ```bash
   # Install NSSM service
   nssm install "Kingston Portal API" python
   nssm set "Kingston Portal API" AppDirectory "C:\path\to\backend"
   nssm set "Kingston Portal API" AppParameters "main.py"
   nssm set "Kingston Portal API" AppEnvironmentExtra "API_HOST=0.0.0.0" "API_PORT=8001"
   nssm start "Kingston Portal API"
   ```

3. **Configure Windows Firewall:**
   ```powershell
   # Allow inbound connections on port 8001
   New-NetFirewallRule -DisplayName "Kingston Portal API" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
   ```

## 4. CORS Configuration

**Backend Configuration (main.py):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://intranet.kingston.local",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)
```

**Key CORS Requirements:**
- **allow_origins:** Explicit list (no wildcards with credentials)
- **allow_credentials:** `True` for authentication headers
- **allow_headers:** `["*"]` (simplified, no response headers)

## 5. Key Architectural Benefits

### 1. **Simplified Routing**
- No Application Request Routing (ARR) complications
- Direct API calls eliminate proxy issues
- Clear separation of concerns

### 2. **Performance Optimization**
- IIS optimized for static file serving
- FastAPI handles API requests directly
- Reduced latency from eliminated proxy layer

### 3. **Environment Consistency**
- Automatic environment detection
- Consistent API base URL handling
- Seamless development-to-production workflow

### 4. **Security & Reliability**
- Explicit CORS configuration
- Windows Firewall protection
- Service-based backend deployment

## 6. Automated Deployment Script

### PowerShell Script: deploy_minimal.ps1

**Prerequisites:**
- PowerShell 5.1 or later
- Administrator privileges
- Git installed and configured
- Python 3.8+ with pip
- Node.js 16+ with npm
- IIS with URL Rewrite module
- NSSM (Non-Sucking Service Manager)
- Virtual environment tools (venv)

**Script Dependencies:**
```powershell
# Required Windows Features
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-UrlRewrite

# Required Software Validation
function Test-Prerequisites {
    $errors = @()
    
    # Check Git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $errors += "Git is not installed or not in PATH"
    }
    
    # Check Python
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        $errors += "Python is not installed or not in PATH"
    }
    
    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $errors += "Node.js is not installed or not in PATH"
    }
    
    # Check NSSM service
    if (-not (Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue)) {
        $errors += "OfficeFastAPIService not configured in NSSM"
    }
    
    return $errors
}
```

**Deployment Phase Timing:**
- **Phase 1:** Git pull (30-60 seconds)
- **Phase 2:** Backend dependencies (2-3 minutes)
- **Phase 3:** Frontend dependencies (1-2 minutes)
- **Phase 4:** Frontend build (45-90 seconds)
- **Phase 5:** Backend deployment (30-45 seconds)
- **Phase 6:** Production dependencies (2-3 minutes)
- **Phase 7:** Service restart (15-30 seconds)
- **Phase 8:** IIS reset (10-20 seconds)

**Total Estimated Time:** 7-11 minutes

### Emergency Contacts Framework

**Primary Contacts:**
```powershell
# Emergency contact configuration in script
$EmergencyContacts = @{
    "PrimaryAdmin" = @{
        "Name" = "System Administrator"
        "Phone" = "+1-XXX-XXX-XXXX"
        "Email" = "admin@kingston.local"
        "Role" = "Primary deployment contact"
    }
    "BackupAdmin" = @{
        "Name" = "Backup Administrator"
        "Phone" = "+1-XXX-XXX-XXXX"
        "Email" = "backup-admin@kingston.local"
        "Role" = "Secondary deployment contact"
    }
    "DeveloperTeam" = @{
        "Name" = "Development Team Lead"
        "Phone" = "+1-XXX-XXX-XXXX"
        "Email" = "dev-team@kingston.local"
        "Role" = "Application troubleshooting"
    }
}

function Send-DeploymentAlert {
    param([string]$Status, [string]$Message)
    # Implementation for emergency notifications
    Write-Host "ALERT: Deployment $Status - $Message" -ForegroundColor Red
    # TODO: Integrate with email/SMS notification system
}
```

## 7. Performance Validation During Deployment

### Automated Performance Checks

```powershell
function Test-PerformanceValidation {
    Write-Host "Running performance validation..." -ForegroundColor Cyan
    
    # Test 1: API Response Time
    $apiUrl = "http://intranet.kingston.local:8001/api/health"
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10
        $stopwatch.Stop()
        
        if ($response.StatusCode -eq 200 -and $stopwatch.ElapsedMilliseconds -lt 2000) {
            Write-Host "✓ API Response Time: $($stopwatch.ElapsedMilliseconds)ms (Acceptable)" -ForegroundColor Green
        } else {
            Write-Host "⚠ API Response Time: $($stopwatch.ElapsedMilliseconds)ms (Slow)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ API Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    # Test 2: Frontend Load Time
    $frontendUrl = "http://intranet.kingston.local"
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 15
        $stopwatch.Stop()
        
        if ($response.StatusCode -eq 200 -and $stopwatch.ElapsedMilliseconds -lt 3000) {
            Write-Host "✓ Frontend Load Time: $($stopwatch.ElapsedMilliseconds)ms (Acceptable)" -ForegroundColor Green
        } else {
            Write-Host "⚠ Frontend Load Time: $($stopwatch.ElapsedMilliseconds)ms (Slow)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Frontend Load Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    # Test 3: Database Connection
    $dbTestUrl = "http://intranet.kingston.local:8001/api/clients?limit=1"
    try {
        $response = Invoke-WebRequest -Uri $dbTestUrl -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Database Connectivity: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ Database Connection Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    return $true
}
```

### 4-User Concurrent Testing During Deployment

```powershell
function Test-ConcurrentUsers {
    Write-Host "Testing concurrent user capacity..." -ForegroundColor Cyan
    
    $testEndpoints = @(
        "http://intranet.kingston.local:8001/api/health",
        "http://intranet.kingston.local:8001/api/clients?limit=5",
        "http://intranet.kingston.local:8001/api/products?limit=5",
        "http://intranet.kingston.local:8001/api/dashboard/summary"
    )
    
    $jobs = @()
    
    # Simulate 4 concurrent users
    for ($i = 1; $i -le 4; $i++) {
        $job = Start-Job -ScriptBlock {
            param($endpoints, $userNumber)
            
            $results = @()
            foreach ($endpoint in $endpoints) {
                $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                try {
                    $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 10
                    $stopwatch.Stop()
                    
                    $results += @{
                        "User" = $userNumber
                        "Endpoint" = $endpoint
                        "Status" = $response.StatusCode
                        "Time" = $stopwatch.ElapsedMilliseconds
                        "Success" = $true
                    }
                } catch {
                    $stopwatch.Stop()
                    $results += @{
                        "User" = $userNumber
                        "Endpoint" = $endpoint
                        "Status" = "Error"
                        "Time" = $stopwatch.ElapsedMilliseconds
                        "Success" = $false
                        "Error" = $_.Exception.Message
                    }
                }
                Start-Sleep -Milliseconds 500  # Brief pause between requests
            }
            return $results
        } -ArgumentList $testEndpoints, $i
        
        $jobs += $job
    }
    
    # Wait for all jobs to complete
    $allResults = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    # Analyze results
    $successCount = ($allResults | Where-Object { $_.Success -eq $true }).Count
    $totalTests = $allResults.Count
    $averageTime = ($allResults | Where-Object { $_.Success -eq $true } | Measure-Object -Property Time -Average).Average
    
    Write-Host "Concurrent Test Results:" -ForegroundColor Cyan
    Write-Host "  Total Tests: $totalTests" -ForegroundColor White
    Write-Host "  Successful: $successCount" -ForegroundColor Green
    Write-Host "  Failed: $($totalTests - $successCount)" -ForegroundColor Red
    Write-Host "  Success Rate: $([math]::Round(($successCount / $totalTests) * 100, 2))%" -ForegroundColor White
    Write-Host "  Average Response Time: $([math]::Round($averageTime, 0))ms" -ForegroundColor White
    
    # Display failed tests
    $failedTests = $allResults | Where-Object { $_.Success -eq $false }
    if ($failedTests.Count -gt 0) {
        Write-Host "Failed Tests:" -ForegroundColor Red
        foreach ($failed in $failedTests) {
            Write-Host "  User $($failed.User): $($failed.Endpoint) - $($failed.Error)" -ForegroundColor Red
        }
    }
    
    # Return success if 90% or more tests passed
    return (($successCount / $totalTests) -ge 0.9)
}
```

## 8. Enhanced Monitoring & Verification

### Production Health Checks
- **Frontend:** `http://intranet.kingston.local/` (React app)
- **Backend API:** `http://intranet.kingston.local:8001/api/health`
- **API Documentation:** `http://intranet.kingston.local:8001/docs`
- **Performance Threshold:** < 2000ms API response, < 3000ms frontend load
- **Concurrent Users:** 4+ simultaneous users with 90%+ success rate

### Development Verification
- **Frontend:** `http://localhost:3000` (Vite dev server)
- **Backend API:** `http://localhost:8001/api/health`
- **API Documentation:** `http://localhost:8001/docs`

### Service Monitoring
```powershell
# Check Windows service status
Get-Service -Name "OfficeFastAPIService"

# Check port binding
netstat -an | findstr :8001

# Check firewall rules
Get-NetFirewallRule -DisplayName "Kingston Portal API"

# Advanced monitoring with performance counters
Get-Counter "\Process(python)\% Processor Time"
Get-Counter "\Process(python)\Working Set"
```

### Deployment Validation Checklist
- [ ] All prerequisites installed and validated
- [ ] Git pull completed successfully (< 60 seconds)
- [ ] Dependencies installed without errors (< 6 minutes total)
- [ ] Frontend build completed (< 90 seconds)
- [ ] Service restart successful (< 30 seconds)
- [ ] IIS reset completed (< 20 seconds)
- [ ] API health check passes (< 2 seconds response)
- [ ] Frontend loads successfully (< 3 seconds)
- [ ] Database connectivity verified
- [ ] 4-user concurrent test achieves 90%+ success rate
- [ ] Performance thresholds met
- [ ] Emergency contacts notified if issues occur

## 9. Environment Variables

### Production Environment (.env)
```bash
# Database Configuration
DATABASE_URL=postgresql://kingstons_app:password@host:port/kingstons_portal
JWT_SECRET=your_production_jwt_secret

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8001

# Security Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours for production
```

### Development Environment (.env)
```bash
# Database Configuration
DATABASE_URL=postgresql://kingstons_app:password@localhost:5432/kingstons_portal
JWT_SECRET=your_development_jwt_secret

# Server Configuration
API_HOST=127.0.0.1
API_PORT=8001

# Security Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=60  # 1 hour for development
```

## 10. Troubleshooting

### Deployment Failure Recovery

#### Failed Performance Validation
- **Symptom:** API response > 2000ms or concurrent test < 90% success
- **Action:** Check system resources, restart services, verify database connections
- **Escalation:** Contact development team if performance issues persist

#### Service Restart Failures
- **Symptom:** OfficeFastAPIService fails to start or stops unexpectedly
- **Action:** Check Python environment, verify .env file, review service logs
- **Recovery:** Rollback to previous working version using git reset

#### Emergency Rollback Procedure
```powershell
# Quick rollback script
git reset --hard HEAD~1  # Rollback to previous commit
.\deploy_minimal.ps1     # Redeploy previous version
```

### Performance Issues During Deployment

### Common Issues

#### Frontend Issues
- **React Router not working:** Verify IIS URL rewrite rules are properly configured
- **Static files not loading:** Check IIS MIME type configuration
- **API calls failing:** Verify environment detection logic

#### Backend Issues
- **Service won't start:** Check NSSM configuration and Python path
- **Port conflicts:** Verify no other services are using port 8001
- **CORS errors:** Check allow_origins configuration matches frontend URL

#### Network Issues
- **DNS resolution:** Verify intranet.kingston.local resolves to 192.168.0.223
- **Firewall blocking:** Check Windows Firewall rules for port 8001
- **Service connectivity:** Test direct API calls to verify FastAPI is running

This deployment architecture provides a robust, scalable solution that leverages IIS for efficient static file serving while maintaining direct API communication for optimal performance. 
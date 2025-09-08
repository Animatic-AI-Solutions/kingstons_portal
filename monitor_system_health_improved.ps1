# Kingston's Portal - Enhanced System Health Monitoring Script
# Improved version with better error handling and reliability
# Run this script periodically or set up as scheduled task

param(
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "C:\Logs\portal_monitoring.log",
    
    [Parameter(Mandatory=$false)]
    [switch]$SendAlerts,
    
    [Parameter(Mandatory=$false)]
    [string]$AlertEmail = "admin@kingston.local",
    
    [Parameter(Mandatory=$false)]
    [int]$MaxRetries = 3,
    
    [Parameter(Mandatory=$false)]
    [int]$RetryDelaySeconds = 5
)

# Global variables for improved error handling
$script:ErrorActionPreference = "SilentlyContinue"
$script:InformationPreference = "Continue"

# Initialize logging with rotation
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    $color = switch ($Level) { 
        "ERROR" { "Red" } 
        "WARN" { "Yellow" } 
        "SUCCESS" { "Green" } 
        "CRITICAL" { "Magenta" }
        default { "White" } 
    }
    Write-Host $logEntry -ForegroundColor $color
    
    try {
        # Ensure log directory exists
        $logDir = Split-Path $LogPath -Parent
        if (!(Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        
        # Log rotation - keep last 10 MB, rotate if larger
        if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt 10MB)) {
            $rotatedLog = $LogPath -replace '\.log$', "_$(Get-Date -Format 'yyyyMMdd').log"
            if (!(Test-Path $rotatedLog)) {
                Move-Item $LogPath $rotatedLog
            }
        }
        
        Add-Content -Path $LogPath -Value $logEntry -ErrorAction Stop
    } catch {
        Write-Warning "Failed to write to log file: $($_.Exception.Message)"
    }
}

# Improved retry mechanism
function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [string]$OperationName,
        [int]$MaxAttempts = $MaxRetries,
        [int]$DelaySeconds = $RetryDelaySeconds
    )
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            Write-Log "[$OperationName] Attempt $attempt of $MaxAttempts" "INFO"
            $result = & $ScriptBlock
            Write-Log "[$OperationName] Success on attempt $attempt" "SUCCESS"
            return $result
        } catch {
            Write-Log "[$OperationName] Attempt $attempt failed: $($_.Exception.Message)" "WARN"
            if ($attempt -eq $MaxAttempts) {
                Write-Log "[$OperationName] All attempts failed" "ERROR"
                throw
            }
            Start-Sleep -Seconds $DelaySeconds
        }
    }
}

# Enhanced system health check with better error isolation
function Test-SystemHealth {
    Write-Log "Starting comprehensive system health check (Enhanced Version)" "INFO"
    $healthReport = @{
        Timestamp = Get-Date
        OverallStatus = "HEALTHY"
        Issues = @()
        Metrics = @{}
        ComponentStatus = @{}
    }
    
    # Component 1: Service Health Check with improved detection
    try {
        Write-Log "Checking OfficeFastAPIService status..." "INFO"
        $service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
        
        if ($service) {
            $healthReport.ComponentStatus["Service"] = "Found"
            if ($service.Status -eq "Running") {
                Write-Log "✓ OfficeFastAPIService is running" "SUCCESS"
                $healthReport.Metrics["ServiceStatus"] = "Running"
                $healthReport.Metrics["ServiceStartTime"] = $service.StartTime
                
                # Check service responsiveness by testing if process exists
                $pythonProcess = Get-Process | Where-Object {$_.ProcessName -like "*python*" -and $_.StartTime -ge $service.StartTime}
                if ($pythonProcess) {
                    Write-Log "✓ Python process found (PID: $($pythonProcess.Id))" "SUCCESS"
                    $healthReport.Metrics["ProcessPID"] = $pythonProcess.Id
                    $healthReport.Metrics["ProcessMemoryMB"] = [math]::Round($pythonProcess.WorkingSet64 / 1MB, 2)
                } else {
                    Write-Log "⚠ Service running but Python process not found" "WARN"
                    $healthReport.Issues += "Service running but process not detectable"
                }
                
            } else {
                Write-Log "✗ OfficeFastAPIService is $($service.Status)" "ERROR"
                $healthReport.Issues += "Service not running: $($service.Status)"
                $healthReport.OverallStatus = "UNHEALTHY"
                $healthReport.Metrics["ServiceStatus"] = $service.Status
                
                # Enhanced service restart with validation
                Write-Log "Attempting intelligent service restart..." "WARN"
                try {
                    # First, check if there are zombie processes
                    $zombieProcesses = Get-Process | Where-Object {$_.ProcessName -like "*python*"}
                    if ($zombieProcesses) {
                        Write-Log "Found $($zombieProcesses.Count) Python processes, cleaning up..." "WARN"
                        $zombieProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 5
                    }
                    
                    # Start service with verification
                    Start-Service -Name "OfficeFastAPIService" -ErrorAction Stop
                    Start-Sleep -Seconds 15  # Increased wait time for service startup
                    
                    $service = Get-Service -Name "OfficeFastAPIService"
                    if ($service.Status -eq "Running") {
                        Write-Log "✓ Service restart successful" "SUCCESS"
                        $healthReport.Metrics["ServiceRestartAttempt"] = "Successful"
                        # Update status since restart worked
                        $healthReport.Metrics["ServiceStatus"] = "Running"
                    } else {
                        Write-Log "✗ Service restart failed - status: $($service.Status)" "ERROR"
                        $healthReport.Issues += "Service restart failed - status: $($service.Status)"
                        $healthReport.Metrics["ServiceRestartAttempt"] = "Failed"
                    }
                } catch {
                    Write-Log "✗ Service restart error: $($_.Exception.Message)" "ERROR"
                    $healthReport.Issues += "Service restart error: $($_.Exception.Message)"
                    $healthReport.Metrics["ServiceRestartAttempt"] = "Error"
                }
            }
        } else {
            Write-Log "✗ OfficeFastAPIService not found" "CRITICAL"
            $healthReport.Issues += "OfficeFastAPIService not found - service may not be installed"
            $healthReport.OverallStatus = "CRITICAL"
            $healthReport.Metrics["ServiceStatus"] = "NotFound"
            $healthReport.ComponentStatus["Service"] = "Missing"
        }
    } catch {
        Write-Log "✗ Service check failed: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "Service check failed: $($_.Exception.Message)"
        $healthReport.ComponentStatus["Service"] = "Error"
    }

    # Component 2: Enhanced API Health Check with detailed validation
    $healthReport.ComponentStatus["API"] = "Testing"
    try {
        Write-Log "Testing API connectivity with enhanced validation..." "INFO"
        
        $apiResult = Invoke-WithRetry -OperationName "API Health Check" -ScriptBlock {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            $stopwatch.Stop()
            return @{ Response = $response; Time = $stopwatch.ElapsedMilliseconds }
        }
        
        if ($apiResult.Response.StatusCode -eq 200) {
            Write-Log "✓ API Health Check: $($apiResult.Response.StatusCode) (${apiResult.Time}ms)" "SUCCESS"
            $healthReport.Metrics["APIStatus"] = "Healthy"
            $healthReport.Metrics["APIResponseTime"] = $apiResult.Time
            $healthReport.ComponentStatus["API"] = "Healthy"
            
            # Enhanced response time analysis
            if ($apiResult.Time -gt 10000) {
                Write-Log "✗ API response extremely slow: ${apiResult.Time}ms" "ERROR"
                $healthReport.Issues += "API response extremely slow: ${apiResult.Time}ms"
                $healthReport.OverallStatus = "UNHEALTHY"
            } elseif ($apiResult.Time -gt 5000) {
                Write-Log "⚠ API response slow: ${apiResult.Time}ms" "WARN"
                $healthReport.Issues += "API response slow: ${apiResult.Time}ms"
            }
            
            # Test API with actual endpoint
            try {
                Write-Log "Testing API functionality with data endpoint..." "INFO"
                $dataTest = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/clients?limit=1" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
                if ($dataTest.StatusCode -eq 200) {
                    Write-Log "✓ API data endpoint functional" "SUCCESS"
                    $healthReport.Metrics["APIDataEndpoint"] = "Functional"
                } else {
                    Write-Log "⚠ API data endpoint returned: $($dataTest.StatusCode)" "WARN"
                    $healthReport.Metrics["APIDataEndpoint"] = "Warning"
                }
            } catch {
                Write-Log "⚠ API data endpoint test failed: $($_.Exception.Message)" "WARN"
                $healthReport.Issues += "API data endpoint not accessible"
                $healthReport.Metrics["APIDataEndpoint"] = "Failed"
            }
            
        } else {
            Write-Log "✗ API Health Check failed: $($apiResult.Response.StatusCode)" "ERROR"
            $healthReport.Issues += "API health check failed: $($apiResult.Response.StatusCode)"
            $healthReport.OverallStatus = "UNHEALTHY"
            $healthReport.Metrics["APIStatus"] = "Unhealthy"
            $healthReport.ComponentStatus["API"] = "Unhealthy"
        }
    } catch {
        Write-Log "✗ API connectivity failed: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "API connectivity failed: $($_.Exception.Message)"
        $healthReport.OverallStatus = "CRITICAL"
        $healthReport.Metrics["APIStatus"] = "Failed"
        $healthReport.ComponentStatus["API"] = "Failed"
    }

    # Component 3: Enhanced Frontend Check with content validation
    $healthReport.ComponentStatus["Frontend"] = "Testing"
    try {
        Write-Log "Testing frontend with content validation..." "INFO"
        
        $frontendResult = Invoke-WithRetry -OperationName "Frontend Check" -ScriptBlock {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
            $stopwatch.Stop()
            return @{ Response = $response; Time = $stopwatch.ElapsedMilliseconds }
        }
        
        if ($frontendResult.Response.StatusCode -eq 200) {
            Write-Log "✓ Frontend accessible: $($frontendResult.Response.StatusCode) (${frontendResult.Time}ms)" "SUCCESS"
            $healthReport.Metrics["FrontendStatus"] = "Accessible"
            $healthReport.Metrics["FrontendResponseTime"] = $frontendResult.Time
            $healthReport.ComponentStatus["Frontend"] = "Accessible"
            
            # Content validation
            if ($frontendResult.Response.Content -match "<!DOCTYPE html>" -or $frontendResult.Response.Content -match "<html") {
                Write-Log "✓ Frontend serving HTML content" "SUCCESS"
                $healthReport.Metrics["FrontendContent"] = "Valid"
            } else {
                Write-Log "⚠ Frontend not serving expected HTML content" "WARN"
                $healthReport.Issues += "Frontend serving unexpected content"
                $healthReport.Metrics["FrontendContent"] = "Unexpected"
            }
            
            if ($frontendResult.Time -gt 8000) {
                Write-Log "⚠ Frontend load time is slow: ${frontendResult.Time}ms" "WARN"
                $healthReport.Issues += "Slow frontend load: ${frontendResult.Time}ms"
            }
        } else {
            Write-Log "✗ Frontend check failed: $($frontendResult.Response.StatusCode)" "ERROR"
            $healthReport.Issues += "Frontend not accessible: $($frontendResult.Response.StatusCode)"
            $healthReport.OverallStatus = "UNHEALTHY"
            $healthReport.Metrics["FrontendStatus"] = "Inaccessible"
            $healthReport.ComponentStatus["Frontend"] = "Failed"
        }
    } catch {
        Write-Log "✗ Frontend connectivity failed: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "Frontend connectivity failed: $($_.Exception.Message)"
        $healthReport.OverallStatus = "UNHEALTHY"
        $healthReport.Metrics["FrontendStatus"] = "Failed"
        $healthReport.ComponentStatus["Frontend"] = "Failed"
    }

    # Component 4: Enhanced System Resource Check with thresholds
    $healthReport.ComponentStatus["Resources"] = "Testing"
    try {
        Write-Log "Checking system resources with enhanced monitoring..." "INFO"
        
        # CPU Usage with multiple samples for accuracy
        $cpuSamples = @()
        for ($i = 0; $i -lt 3; $i++) {
            $cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1 -ErrorAction Stop
            $cpuSamples += $cpu.CounterSamples[0].CookedValue
            if ($i -lt 2) { Start-Sleep -Seconds 1 }
        }
        $cpuUsage = [math]::Round(($cpuSamples | Measure-Object -Average).Average, 2)
        $healthReport.Metrics["CPUUsage"] = $cpuUsage
        
        if ($cpuUsage -gt 90) {
            Write-Log "✗ Critical CPU usage: $cpuUsage%" "CRITICAL"
            $healthReport.Issues += "Critical CPU usage: $cpuUsage%"
            $healthReport.OverallStatus = "CRITICAL"
        } elseif ($cpuUsage -gt 80) {
            Write-Log "⚠ High CPU usage: $cpuUsage%" "WARN"
            $healthReport.Issues += "High CPU usage: $cpuUsage%"
        } else {
            Write-Log "✓ CPU usage: $cpuUsage%" "SUCCESS"
        }
        
        # Enhanced Memory Analysis
        $totalMemory = (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory
        $availableMemory = (Get-Counter "\Memory\Available Bytes" -ErrorAction Stop).CounterSamples[0].CookedValue
        $memoryUsagePercent = [math]::Round((($totalMemory - $availableMemory) / $totalMemory) * 100, 2)
        $totalMemoryGB = [math]::Round($totalMemory / 1GB, 2)
        $availableMemoryGB = [math]::Round($availableMemory / 1GB, 2)
        
        $healthReport.Metrics["MemoryUsage"] = $memoryUsagePercent
        $healthReport.Metrics["TotalMemoryGB"] = $totalMemoryGB
        $healthReport.Metrics["AvailableMemoryGB"] = $availableMemoryGB
        
        if ($memoryUsagePercent -gt 95) {
            Write-Log "✗ Critical memory usage: $memoryUsagePercent% (Available: ${availableMemoryGB}GB)" "CRITICAL"
            $healthReport.Issues += "Critical memory usage: $memoryUsagePercent%"
            $healthReport.OverallStatus = "CRITICAL"
        } elseif ($memoryUsagePercent -gt 85) {
            Write-Log "⚠ High memory usage: $memoryUsagePercent% (Available: ${availableMemoryGB}GB)" "WARN"
            $healthReport.Issues += "High memory usage: $memoryUsagePercent%"
        } else {
            Write-Log "✓ Memory usage: $memoryUsagePercent% (Available: ${availableMemoryGB}GB)" "SUCCESS"
        }
        
        # Enhanced Disk Space Analysis with multiple drives
        $drives = Get-WmiObject -Class Win32_LogicalDisk -ErrorAction Stop | Where-Object {$_.DriveType -eq 3}  # Fixed drives only
        foreach ($drive in $drives) {
            $diskUsagePercent = [math]::Round((($drive.Size - $drive.FreeSpace) / $drive.Size) * 100, 2)
            $freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
            $totalSizeGB = [math]::Round($drive.Size / 1GB, 2)
            
            $healthReport.Metrics["Disk$($drive.DeviceID)Usage"] = $diskUsagePercent
            $healthReport.Metrics["Disk$($drive.DeviceID)FreeGB"] = $freeSpaceGB
            
            if ($diskUsagePercent -gt 95) {
                Write-Log "✗ Critical disk usage $($drive.DeviceID): $diskUsagePercent% (Free: ${freeSpaceGB}GB)" "CRITICAL"
                $healthReport.Issues += "Critical disk usage $($drive.DeviceID): $diskUsagePercent%"
                $healthReport.OverallStatus = "CRITICAL"
            } elseif ($diskUsagePercent -gt 90) {
                Write-Log "⚠ High disk usage $($drive.DeviceID): $diskUsagePercent% (Free: ${freeSpaceGB}GB)" "WARN"
                $healthReport.Issues += "High disk usage $($drive.DeviceID): $diskUsagePercent%"
            } else {
                Write-Log "✓ Disk usage $($drive.DeviceID): $diskUsagePercent% (Free: ${freeSpaceGB}GB)" "SUCCESS"
            }
        }
        
        $healthReport.ComponentStatus["Resources"] = "OK"
        
    } catch {
        Write-Log "✗ Resource check failed: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "Resource check failed: $($_.Exception.Message)"
        $healthReport.ComponentStatus["Resources"] = "Error"
    }

    # Component 5: Enhanced File System Integrity Check
    $healthReport.ComponentStatus["FileSystem"] = "Testing"
    try {
        Write-Log "Checking critical file system paths with validation..." "INFO"
        $criticalPaths = @(
            @{ Path = "C:\Apps\portal_api\backend"; Type = "Directory"; Critical = $true },
            @{ Path = "C:\Apps\portal_api\backend\.env"; Type = "File"; Critical = $true },
            @{ Path = "C:\Apps\portal_api\backend\main.py"; Type = "File"; Critical = $true },
            @{ Path = "C:\inetpub\wwwroot\OfficeIntranet"; Type = "Directory"; Critical = $true },
            @{ Path = "C:\inetpub\wwwroot\OfficeIntranet\index.html"; Type = "File"; Critical = $true }
        )
        
        $missingCritical = 0
        foreach ($pathInfo in $criticalPaths) {
            $path = $pathInfo.Path
            $type = $pathInfo.Type
            $isCritical = $pathInfo.Critical
            
            if (Test-Path $path) {
                if ($type -eq "File") {
                    $fileSize = (Get-Item $path -ErrorAction SilentlyContinue).Length
                    Write-Log "✓ $type exists: $path ($fileSize bytes)" "SUCCESS"
                } else {
                    $itemCount = (Get-ChildItem $path -ErrorAction SilentlyContinue | Measure-Object).Count
                    Write-Log "✓ $type exists: $path ($itemCount items)" "SUCCESS"
                }
            } else {
                if ($isCritical) {
                    Write-Log "✗ Missing critical $type : $path" "CRITICAL"
                    $healthReport.Issues += "Missing critical $type : $path"
                    $healthReport.OverallStatus = "CRITICAL"
                    $missingCritical++
                } else {
                    Write-Log "⚠ Missing optional $type : $path" "WARN"
                    $healthReport.Issues += "Missing optional $type : $path"
                }
            }
        }
        
        if ($missingCritical -eq 0) {
            $healthReport.ComponentStatus["FileSystem"] = "OK"
        } else {
            $healthReport.ComponentStatus["FileSystem"] = "Critical"
        }
        
    } catch {
        Write-Log "✗ File system check failed: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "File system check failed: $($_.Exception.Message)"
        $healthReport.ComponentStatus["FileSystem"] = "Error"
    }

    # Component 6: Enhanced Network Connectivity Check
    $healthReport.ComponentStatus["Network"] = "Testing"
    try {
        Write-Log "Testing network connectivity..." "INFO"
        $portsToCheck = @(
            @{ Port = 80; Service = "IIS/Frontend"; Critical = $true },
            @{ Port = 8001; Service = "FastAPI Backend"; Critical = $true },
            @{ Port = 5432; Service = "PostgreSQL Database"; Critical = $false }  # Database might be remote
        )
        
        foreach ($portInfo in $portsToCheck) {
            $port = $portInfo.Port
            $service = $portInfo.Service
            $isCritical = $portInfo.Critical
            
            try {
                $portCheck = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue -ErrorAction Stop
                if ($portCheck.TcpTestSucceeded) {
                    Write-Log "✓ Port $port accessible ($service)" "SUCCESS"
                } else {
                    if ($isCritical) {
                        Write-Log "✗ Port $port not accessible ($service)" "ERROR"
                        $healthReport.Issues += "Port $port not accessible ($service)"
                        $healthReport.OverallStatus = "UNHEALTHY"
                    } else {
                        Write-Log "⚠ Port $port not accessible ($service) - may be remote" "WARN"
                    }
                }
            } catch {
                Write-Log "⚠ Could not test port $port ($service): $($_.Exception.Message)" "WARN"
            }
        }
        
        $healthReport.ComponentStatus["Network"] = "Tested"
        
    } catch {
        Write-Log "✗ Network check failed: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "Network check failed: $($_.Exception.Message)"
        $healthReport.ComponentStatus["Network"] = "Error"
    }

    # Final Status Determination with Component Summary
    $componentSummary = @{}
    foreach ($component in $healthReport.ComponentStatus.Keys) {
        $status = $healthReport.ComponentStatus[$component]
        if ($componentSummary.ContainsKey($status)) {
            $componentSummary[$status] += 1
        } else {
            $componentSummary[$status] = 1
        }
    }
    
    Write-Log "Component Status Summary:" "INFO"
    foreach ($status in $componentSummary.Keys) {
        Write-Log "  $status : $($componentSummary[$status]) components" "INFO"
    }
    
    return $healthReport
}

# Enhanced email alert function with better formatting
function Send-AlertEmail {
    param([object]$HealthReport)
    
    if (-not $SendAlerts) {
        Write-Log "Alert notifications disabled" "INFO"
        return
    }
    
    try {
        $severity = switch ($HealthReport.OverallStatus) {
            "CRITICAL" { "🚨 CRITICAL ALERT" }
            "UNHEALTHY" { "⚠️ WARNING ALERT" }
            default { "ℹ️ INFO ALERT" }
        }
        
        $subject = "Kingston's Portal $severity - Status: $($HealthReport.OverallStatus)"
        
        $componentStatus = ""
        foreach ($component in $HealthReport.ComponentStatus.Keys) {
            $status = $HealthReport.ComponentStatus[$component]
            $icon = switch ($status) {
                "OK" { "✅" }
                "Healthy" { "✅" }
                "Accessible" { "✅" }
                "Running" { "✅" }
                "Found" { "✅" }
                "Tested" { "ℹ️" }
                "Testing" { "🔄" }
                default { "❌" }
            }
            $componentStatus += "$icon $component : $status`n"
        }
        
        $body = @"
Kingston's Portal System Health Report (Enhanced Monitoring)
Generated: $($HealthReport.Timestamp)
Overall Status: $($HealthReport.OverallStatus)

COMPONENT STATUS:
$componentStatus

ISSUES DETECTED ($($HealthReport.Issues.Count)):
$($HealthReport.Issues -join "`n")

KEY METRICS:
$(($HealthReport.Metrics.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "`n")

Log Location: $LogPath

This is an automated alert from the enhanced monitoring system.
Critical issues require immediate attention.

Response Required: $(if ($HealthReport.OverallStatus -eq "CRITICAL") { "IMMEDIATE" } elseif ($HealthReport.OverallStatus -eq "UNHEALTHY") { "WITHIN 1 HOUR" } else { "ROUTINE" })
"@
        
        Write-Log "ALERT: Would send email to $AlertEmail" "WARN"
        Write-Log "Subject: $subject" "INFO"
        Write-Log "Enhanced alert prepared with component status and metrics" "SUCCESS"
        
        # Enhanced alert would be sent here with proper SMTP configuration
        # Send-MailMessage -To $AlertEmail -Subject $subject -Body $body -SmtpServer "your-smtp-server"
        
    } catch {
        Write-Log "✗ Failed to send enhanced alert email: $($_.Exception.Message)" "ERROR"
    }
}

# Enhanced report generation with component analysis
function Generate-HealthReport {
    param([object]$HealthReport)
    
    $reportPath = "C:\Logs\portal_health_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    
    try {
        # Add summary statistics to report
        $HealthReport.Summary = @{
            TotalComponents = $HealthReport.ComponentStatus.Count
            HealthyComponents = ($HealthReport.ComponentStatus.Values | Where-Object { $_ -in @("OK", "Healthy", "Accessible", "Running") }).Count
            FailedComponents = ($HealthReport.ComponentStatus.Values | Where-Object { $_ -in @("Failed", "Error", "Critical") }).Count
            TotalIssues = $HealthReport.Issues.Count
            ReportVersion = "Enhanced v2.0"
        }
        
        $HealthReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
        Write-Log "Enhanced health report saved: $reportPath" "SUCCESS"
        
        # Also create a human-readable summary
        $summaryPath = $reportPath -replace '\.json$', '_summary.txt'
        $summary = @"
KINGSTON'S PORTAL HEALTH SUMMARY
Generated: $($HealthReport.Timestamp)
Status: $($HealthReport.OverallStatus)

QUICK STATS:
- Total Components Checked: $($HealthReport.Summary.TotalComponents)
- Healthy Components: $($HealthReport.Summary.HealthyComponents)
- Failed Components: $($HealthReport.Summary.FailedComponents)
- Issues Found: $($HealthReport.Summary.TotalIssues)

COMPONENT STATUS:
$((($HealthReport.ComponentStatus.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "`n"))

ISSUES:
$($HealthReport.Issues -join "`n")
"@
        
        $summary | Out-File -FilePath $summaryPath -Encoding UTF8
        Write-Log "Human-readable summary saved: $summaryPath" "SUCCESS"
        
    } catch {
        Write-Log "✗ Failed to save enhanced health report: $($_.Exception.Message)" "ERROR"
    }
}

# Main execution with enhanced error handling
try {
    Write-Log "========================================" "INFO"
    Write-Log "Kingston's Portal Enhanced System Health Monitor" "SUCCESS"
    Write-Log "Version: 2.0 Enhanced for Holiday Absence" "INFO"
    Write-Log "Max Retries: $MaxRetries, Retry Delay: ${RetryDelaySeconds}s" "INFO"
    Write-Log "========================================" "INFO"

    $healthReport = Test-SystemHealth

    Write-Log "========================================" "INFO"
    Write-Log "Enhanced Health Check Summary:" "INFO"
    Write-Log "Overall Status: $($healthReport.OverallStatus)" $(if ($healthReport.OverallStatus -eq "HEALTHY") { "SUCCESS" } elseif ($healthReport.OverallStatus -eq "UNHEALTHY") { "WARN" } else { "CRITICAL" })
    Write-Log "Components Checked: $($healthReport.ComponentStatus.Count)" "INFO"
    Write-Log "Issues Found: $($healthReport.Issues.Count)" "INFO"

    if ($healthReport.Issues.Count -gt 0) {
        Write-Log "Issues Detected:" "WARN"
        for ($i = 0; $i -lt $healthReport.Issues.Count; $i++) {
            Write-Log "  $($i + 1). $($healthReport.Issues[$i])" "WARN"
        }
    }

    Write-Log "Enhanced Metrics Summary:" "INFO"
    foreach ($metric in $healthReport.Metrics.GetEnumerator() | Sort-Object Name) {
        Write-Log "  $($metric.Key): $($metric.Value)" "INFO"
    }

    # Generate detailed report
    Generate-HealthReport -HealthReport $healthReport

    # Send alerts if status is not healthy
    if ($healthReport.OverallStatus -ne "HEALTHY") {
        Send-AlertEmail -HealthReport $healthReport
        Write-Log "System requires attention - status is $($healthReport.OverallStatus)" $(if ($healthReport.OverallStatus -eq "CRITICAL") { "CRITICAL" } else { "WARN" })
    } else {
        Write-Log "System is operating normally - all components healthy" "SUCCESS"
    }

} catch {
    Write-Log "✗ Enhanced health monitoring failed: $($_.Exception.Message)" "CRITICAL"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
} finally {
    Write-Log "Enhanced health check completed" "INFO"
    Write-Log "========================================" "INFO"
}
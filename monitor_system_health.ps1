# Kingston's Portal - System Health Monitoring Script
# Automated monitoring for production stability during administrator absence
# Run this script periodically or set up as scheduled task

param(
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "C:\Logs\portal_monitoring.log",
    
    [Parameter(Mandatory=$false)]
    [switch]$SendAlerts,
    
    [Parameter(Mandatory=$false)]
    [string]$AlertEmail = "admin@kingston.local"
)

# Initialize logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor $(switch ($Level) { "ERROR" { "Red" } "WARN" { "Yellow" } "SUCCESS" { "Green" } default { "White" } })
    
    # Ensure log directory exists
    $logDir = Split-Path $LogPath -Parent
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Add-Content -Path $LogPath -Value $logEntry
}

function Test-SystemHealth {
    Write-Log "Starting comprehensive system health check" "INFO"
    $healthReport = @{
        Timestamp = Get-Date
        OverallStatus = "HEALTHY"
        Issues = @()
        Metrics = @{}
    }
    
    try {
        # 1. Service Health Check
        Write-Log "Checking OfficeFastAPIService status..." "INFO"
        $service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
        
        if ($service) {
            if ($service.Status -eq "Running") {
                Write-Log "✓ OfficeFastAPIService is running" "SUCCESS"
                $healthReport.Metrics["ServiceStatus"] = "Running"
            } else {
                Write-Log "✗ OfficeFastAPIService is $($service.Status)" "ERROR"
                $healthReport.Issues += "Service not running: $($service.Status)"
                $healthReport.OverallStatus = "UNHEALTHY"
                $healthReport.Metrics["ServiceStatus"] = $service.Status
                
                # Attempt to restart service
                Write-Log "Attempting to restart OfficeFastAPIService..." "WARN"
                try {
                    Start-Service -Name "OfficeFastAPIService"
                    Start-Sleep -Seconds 10
                    $service = Get-Service -Name "OfficeFastAPIService"
                    if ($service.Status -eq "Running") {
                        Write-Log "✓ Service restart successful" "SUCCESS"
                        $healthReport.Metrics["ServiceRestartAttempt"] = "Successful"
                    } else {
                        Write-Log "✗ Service restart failed" "ERROR"
                        $healthReport.Issues += "Service restart failed"
                        $healthReport.Metrics["ServiceRestartAttempt"] = "Failed"
                    }
                } catch {
                    Write-Log "✗ Service restart error: $($_.Exception.Message)" "ERROR"
                    $healthReport.Issues += "Service restart error: $($_.Exception.Message)"
                    $healthReport.Metrics["ServiceRestartAttempt"] = "Error"
                }
            }
        } else {
            Write-Log "✗ OfficeFastAPIService not found" "ERROR"
            $healthReport.Issues += "OfficeFastAPIService not found"
            $healthReport.OverallStatus = "CRITICAL"
            $healthReport.Metrics["ServiceStatus"] = "NotFound"
        }

        # 2. API Health Check
        Write-Log "Testing API connectivity..." "INFO"
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/health" -TimeoutSec 10 -UseBasicParsing
            $stopwatch.Stop()
            
            if ($response.StatusCode -eq 200) {
                Write-Log "✓ API Health Check: $($response.StatusCode) (${stopwatch.ElapsedMilliseconds}ms)" "SUCCESS"
                $healthReport.Metrics["APIStatus"] = "Healthy"
                $healthReport.Metrics["APIResponseTime"] = $stopwatch.ElapsedMilliseconds
                
                if ($stopwatch.ElapsedMilliseconds -gt 5000) {
                    Write-Log "⚠ API response time is slow: ${stopwatch.ElapsedMilliseconds}ms" "WARN"
                    $healthReport.Issues += "Slow API response: ${stopwatch.ElapsedMilliseconds}ms"
                }
            } else {
                Write-Log "✗ API Health Check failed: $($response.StatusCode)" "ERROR"
                $healthReport.Issues += "API health check failed: $($response.StatusCode)"
                $healthReport.OverallStatus = "UNHEALTHY"
                $healthReport.Metrics["APIStatus"] = "Unhealthy"
            }
        } catch {
            Write-Log "✗ API connectivity failed: $($_.Exception.Message)" "ERROR"
            $healthReport.Issues += "API connectivity failed"
            $healthReport.OverallStatus = "CRITICAL"
            $healthReport.Metrics["APIStatus"] = "Failed"
        }

        # 3. Frontend Health Check
        Write-Log "Testing frontend availability..." "INFO"
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 10 -UseBasicParsing
            $stopwatch.Stop()
            
            if ($response.StatusCode -eq 200) {
                Write-Log "✓ Frontend accessible: $($response.StatusCode) (${stopwatch.ElapsedMilliseconds}ms)" "SUCCESS"
                $healthReport.Metrics["FrontendStatus"] = "Accessible"
                $healthReport.Metrics["FrontendResponseTime"] = $stopwatch.ElapsedMilliseconds
                
                if ($stopwatch.ElapsedMilliseconds -gt 5000) {
                    Write-Log "⚠ Frontend load time is slow: ${stopwatch.ElapsedMilliseconds}ms" "WARN"
                    $healthReport.Issues += "Slow frontend load: ${stopwatch.ElapsedMilliseconds}ms"
                }
            } else {
                Write-Log "✗ Frontend check failed: $($response.StatusCode)" "ERROR"
                $healthReport.Issues += "Frontend not accessible: $($response.StatusCode)"
                $healthReport.OverallStatus = "UNHEALTHY"
                $healthReport.Metrics["FrontendStatus"] = "Inaccessible"
            }
        } catch {
            Write-Log "✗ Frontend connectivity failed: $($_.Exception.Message)" "ERROR"
            $healthReport.Issues += "Frontend connectivity failed"
            $healthReport.OverallStatus = "UNHEALTHY"
            $healthReport.Metrics["FrontendStatus"] = "Failed"
        }

        # 4. Database Connectivity Test
        Write-Log "Testing database connectivity..." "INFO"
        try {
            $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/clients?limit=1" -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "✓ Database connectivity: OK" "SUCCESS"
                $healthReport.Metrics["DatabaseStatus"] = "Connected"
            } else {
                Write-Log "✗ Database connectivity failed: $($response.StatusCode)" "ERROR"
                $healthReport.Issues += "Database connectivity failed"
                $healthReport.OverallStatus = "UNHEALTHY"
                $healthReport.Metrics["DatabaseStatus"] = "Failed"
            }
        } catch {
            Write-Log "✗ Database test failed: $($_.Exception.Message)" "ERROR"
            $healthReport.Issues += "Database test failed"
            $healthReport.OverallStatus = "CRITICAL"
            $healthReport.Metrics["DatabaseStatus"] = "Error"
        }

        # 5. System Resource Check
        Write-Log "Checking system resources..." "INFO"
        try {
            # CPU Usage
            $cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1
            $cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)
            $healthReport.Metrics["CPUUsage"] = $cpuUsage
            
            if ($cpuUsage -gt 80) {
                Write-Log "⚠ High CPU usage: $cpuUsage%" "WARN"
                $healthReport.Issues += "High CPU usage: $cpuUsage%"
            } else {
                Write-Log "✓ CPU usage: $cpuUsage%" "SUCCESS"
            }
            
            # Memory Usage
            $totalMemory = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
            $availableMemory = (Get-Counter "\Memory\Available Bytes").CounterSamples[0].CookedValue
            $memoryUsagePercent = [math]::Round((($totalMemory - $availableMemory) / $totalMemory) * 100, 2)
            $healthReport.Metrics["MemoryUsage"] = $memoryUsagePercent
            
            if ($memoryUsagePercent -gt 85) {
                Write-Log "⚠ High memory usage: $memoryUsagePercent%" "WARN"
                $healthReport.Issues += "High memory usage: $memoryUsagePercent%"
            } else {
                Write-Log "✓ Memory usage: $memoryUsagePercent%" "SUCCESS"
            }
            
            # Disk Space Check
            $diskC = Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq "C:"}
            $diskUsagePercent = [math]::Round((($diskC.Size - $diskC.FreeSpace) / $diskC.Size) * 100, 2)
            $healthReport.Metrics["DiskUsage"] = $diskUsagePercent
            
            if ($diskUsagePercent -gt 90) {
                Write-Log "⚠ High disk usage: $diskUsagePercent%" "WARN"
                $healthReport.Issues += "High disk usage: $diskUsagePercent%"
            } else {
                Write-Log "✓ Disk usage: $diskUsagePercent%" "SUCCESS"
            }
            
        } catch {
            Write-Log "✗ Resource check failed: $($_.Exception.Message)" "ERROR"
            $healthReport.Issues += "Resource check failed"
        }

        # 6. File System Check
        Write-Log "Checking critical file system paths..." "INFO"
        $criticalPaths = @(
            "C:\Apps\portal_api\backend",
            "C:\Apps\portal_api\backend\.env",
            "C:\inetpub\wwwroot\OfficeIntranet"
        )
        
        foreach ($path in $criticalPaths) {
            if (Test-Path $path) {
                Write-Log "✓ Path exists: $path" "SUCCESS"
            } else {
                Write-Log "✗ Missing critical path: $path" "ERROR"
                $healthReport.Issues += "Missing critical path: $path"
                $healthReport.OverallStatus = "CRITICAL"
            }
        }

        # 7. Port Accessibility Check
        Write-Log "Checking port accessibility..." "INFO"
        $portsToCheck = @(80, 8001)
        foreach ($port in $portsToCheck) {
            $portCheck = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
            if ($portCheck.TcpTestSucceeded) {
                Write-Log "✓ Port $port is accessible" "SUCCESS"
            } else {
                Write-Log "✗ Port $port is not accessible" "ERROR"
                $healthReport.Issues += "Port $port not accessible"
                $healthReport.OverallStatus = "UNHEALTHY"
            }
        }

    } catch {
        Write-Log "✗ Health check error: $($_.Exception.Message)" "ERROR"
        $healthReport.Issues += "Health check error: $($_.Exception.Message)"
        $healthReport.OverallStatus = "ERROR"
    }
    
    return $healthReport
}

function Send-AlertEmail {
    param([object]$HealthReport)
    
    if (-not $SendAlerts) {
        Write-Log "Alert notifications disabled" "INFO"
        return
    }
    
    try {
        $subject = "Kingston's Portal System Alert - Status: $($HealthReport.OverallStatus)"
        $body = @"
Kingston's Portal System Health Report
Generated: $($HealthReport.Timestamp)
Overall Status: $($HealthReport.OverallStatus)

Issues Detected:
$($HealthReport.Issues -join "`n")

System Metrics:
$(($HealthReport.Metrics.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "`n")

Log Location: $LogPath

This is an automated alert. Please check the system immediately if status is UNHEALTHY or CRITICAL.
"@
        
        # Note: Email configuration would need to be set up on the server
        Write-Log "Alert email would be sent to: $AlertEmail" "INFO"
        Write-Log "Subject: $subject" "INFO"
        
        # Placeholder for actual email sending
        # Send-MailMessage -To $AlertEmail -Subject $subject -Body $body -SmtpServer "your-smtp-server"
        
    } catch {
        Write-Log "✗ Failed to send alert email: $($_.Exception.Message)" "ERROR"
    }
}

function Generate-HealthReport {
    param([object]$HealthReport)
    
    $reportPath = "C:\Logs\portal_health_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    
    try {
        $HealthReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
        Write-Log "Health report saved: $reportPath" "INFO"
    } catch {
        Write-Log "✗ Failed to save health report: $($_.Exception.Message)" "ERROR"
    }
}

# Main execution
Write-Log "========================================" "INFO"
Write-Log "Kingston's Portal System Health Monitor" "INFO"
Write-Log "========================================" "INFO"

$healthReport = Test-SystemHealth

Write-Log "========================================" "INFO"
Write-Log "Health Check Summary:" "INFO"
Write-Log "Overall Status: $($healthReport.OverallStatus)" $(if ($healthReport.OverallStatus -eq "HEALTHY") { "SUCCESS" } elseif ($healthReport.OverallStatus -eq "UNHEALTHY") { "WARN" } else { "ERROR" })
Write-Log "Issues Found: $($healthReport.Issues.Count)" "INFO"

if ($healthReport.Issues.Count -gt 0) {
    Write-Log "Issues:" "WARN"
    foreach ($issue in $healthReport.Issues) {
        Write-Log "  - $issue" "WARN"
    }
}

Write-Log "Key Metrics:" "INFO"
foreach ($metric in $healthReport.Metrics.GetEnumerator()) {
    Write-Log "  $($metric.Key): $($metric.Value)" "INFO"
}

# Generate detailed report
Generate-HealthReport -HealthReport $healthReport

# Send alerts if status is not healthy
if ($healthReport.OverallStatus -ne "HEALTHY") {
    Send-AlertEmail -HealthReport $healthReport
    Write-Log "System requires attention - status is $($healthReport.OverallStatus)" "WARN"
} else {
    Write-Log "System is operating normally" "SUCCESS"
}

Write-Log "Health check completed" "INFO"
Write-Log "========================================" "INFO"
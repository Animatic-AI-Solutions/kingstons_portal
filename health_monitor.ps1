# Kingston's Portal - Health Monitor Executive
# Built using proven syntax from test_env_database.ps1
# Comprehensive system health monitoring for production environment

param(
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "C:\Logs\portal_health_monitor.log",
    
    [Parameter(Mandatory=$false)]
    [switch]$SendAlerts,
    
    [Parameter(Mandatory=$false)]
    [string]$AlertEmail = "admin@kingston.local",
    
    [Parameter(Mandatory=$false)]
    [switch]$DetailedOutput
)

# Global health report
$script:healthReport = @{
    Timestamp = Get-Date
    OverallStatus = "HEALTHY"
    Issues = @()
    Metrics = @{}
    ComponentStatus = @{}
    TestResults = @{}
}

# Initialize logging
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
        
        Add-Content -Path $LogPath -Value $logEntry -ErrorAction Stop
    } catch {
        if ($DetailedOutput) {
            Write-Warning "Failed to write to log file: $($_.Exception.Message)"
        }
    }
}

# Function to load .env file variables
function Load-EnvironmentVariables {
    param(
        [string]$EnvFilePath = ".\.env"
    )
    
    Write-Log "Loading environment variables from $EnvFilePath..." "INFO"
    
    if (!(Test-Path $EnvFilePath)) {
        Write-Log "Environment file not found at $EnvFilePath" "ERROR"
        return $null
    }
    
    $envVars = @{}
    
    try {
        Get-Content $EnvFilePath | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value -replace '^["''](.*?)["'']$', '$1'
                $envVars[$key] = $value
                if ($DetailedOutput) {
                    Write-Log "Loaded environment variable: $key" "INFO"
                }
            }
        }
        
        Write-Log "Successfully loaded $($envVars.Count) environment variables" "SUCCESS"
        return $envVars
    } catch {
        Write-Log "Failed to load environment variables: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# Function to test direct database connectivity using .env variables
function Test-DatabaseConnection {
    param([hashtable]$EnvVars)
    
    Write-Log "Testing direct database connectivity..." "INFO"
    
    if (-not $EnvVars -or -not $EnvVars.ContainsKey("DATABASE_URL")) {
        Write-Log "DATABASE_URL not found in environment variables" "ERROR"
        return @{ Success = $false; Error = "DATABASE_URL not configured" }
    }
    
    $databaseUrl = $EnvVars["DATABASE_URL"]
    if ($DetailedOutput) {
        Write-Log "Using DATABASE_URL for connection test" "INFO"
    }
    
    # Parse PostgreSQL connection string
    if ($databaseUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)(\?.+)?") {
        $username = $matches[1]
        $password = $matches[2]
        $hostname = $matches[3]
        $port = $matches[4]
        $database = $matches[5]
        
        if ($DetailedOutput) {
            Write-Log "Parsed connection: $username@$hostname`:$port/$database" "INFO"
        }
        
        # Set password environment variable for psql
        $env:PGPASSWORD = $password
        
        try {
            # Test database connection using psql
            Write-Log "Testing connection with psql..." "INFO"
            $testQuery = "SELECT 1 as test_connection;"
            
            # Use Start-Process to better handle psql execution
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = "psql"
            $psi.Arguments = "-h $hostname -p $port -U $username -d $database -t -c `"$testQuery`""
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true
            
            $process = [System.Diagnostics.Process]::Start($psi)
            $process.WaitForExit(10000)  # 10 second timeout
            
            $stdout = $process.StandardOutput.ReadToEnd()
            $stderr = $process.StandardError.ReadToEnd()
            $exitCode = $process.ExitCode
            
            if ($exitCode -eq 0) {
                Write-Log "Direct database connection successful" "SUCCESS"
                if ($DetailedOutput) {
                    Write-Log "Query result: $stdout" "INFO"
                }
                return @{ Success = $true; ResponseTime = 0 }
            } else {
                Write-Log "Database connection failed with exit code $exitCode" "ERROR"
                if ($DetailedOutput) {
                    Write-Log "Error output: $stderr" "ERROR"
                }
                return @{ Success = $false; Error = "Connection failed with exit code $exitCode" }
            }
        } catch {
            Write-Log "Database connection test failed: $($_.Exception.Message)" "ERROR"
            return @{ Success = $false; Error = $_.Exception.Message }
        } finally {
            # Clean up password environment variable
            $env:PGPASSWORD = $null
        }
    } else {
        Write-Log "Invalid DATABASE_URL format" "ERROR"
        return @{ Success = $false; Error = "Invalid DATABASE_URL format" }
    }
}

# Function to test service status
function Test-ServiceHealth {
    Write-Log "Checking Windows service status..." "INFO"
    
    try {
        $service = Get-Service -Name "OfficeFastAPIService" -ErrorAction SilentlyContinue
        
        if ($service) {
            if ($service.Status -eq "Running") {
                Write-Log "OfficeFastAPIService is running" "SUCCESS"
                $script:healthReport.ComponentStatus["Service"] = "Running"
                $script:healthReport.TestResults["ServiceCheck"] = "PASS"
                return $true
            } else {
                Write-Log "OfficeFastAPIService is not running - Status: $($service.Status)" "ERROR"
                $script:healthReport.Issues += "Service not running: $($service.Status)"
                $script:healthReport.ComponentStatus["Service"] = "Stopped"
                $script:healthReport.TestResults["ServiceCheck"] = "FAIL"
                $script:healthReport.OverallStatus = "UNHEALTHY"
                return $false
            }
        } else {
            Write-Log "OfficeFastAPIService not found on this system" "ERROR"
            $script:healthReport.Issues += "OfficeFastAPIService not found"
            $script:healthReport.ComponentStatus["Service"] = "NotFound"
            $script:healthReport.TestResults["ServiceCheck"] = "FAIL"
            $script:healthReport.OverallStatus = "CRITICAL"
            return $false
        }
    } catch {
        Write-Log "Service check failed: $($_.Exception.Message)" "ERROR"
        $script:healthReport.Issues += "Service check failed: $($_.Exception.Message)"
        $script:healthReport.ComponentStatus["Service"] = "Error"
        $script:healthReport.TestResults["ServiceCheck"] = "ERROR"
        $script:healthReport.OverallStatus = "CRITICAL"
        return $false
    }
}

# Function to test API connectivity
function Test-APIHealth {
    Write-Log "Testing API connectivity..." "INFO"
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/health" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        $stopwatch.Stop()
        
        if ($response.StatusCode -eq 200) {
            Write-Log "API health check successful - Status: $($response.StatusCode)" "SUCCESS"
            $script:healthReport.ComponentStatus["API"] = "Healthy"
            $script:healthReport.TestResults["APICheck"] = "PASS"
            $script:healthReport.Metrics["APIResponseTime"] = $stopwatch.ElapsedMilliseconds
            
            # Test a data endpoint to verify API functionality
            try {
                $dataTest = Invoke-WebRequest -Uri "http://intranet.kingston.local:8001/api/client_groups?limit=1" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
                if ($dataTest.StatusCode -eq 200) {
                    Write-Log "API data endpoint test successful" "SUCCESS"
                    $script:healthReport.TestResults["APIDataTest"] = "PASS"
                } else {
                    Write-Log "API data endpoint returned unexpected status: $($dataTest.StatusCode)" "WARN"
                    $script:healthReport.Issues += "API data endpoint warning"
                    $script:healthReport.TestResults["APIDataTest"] = "WARN"
                }
            } catch {
                Write-Log "API data endpoint test failed: $($_.Exception.Message)" "WARN"
                $script:healthReport.Issues += "API data endpoint not accessible"
                $script:healthReport.TestResults["APIDataTest"] = "FAIL"
            }
            
            return $true
        } else {
            Write-Log "API health check failed - Status: $($response.StatusCode)" "ERROR"
            $script:healthReport.Issues += "API health check failed: $($response.StatusCode)"
            $script:healthReport.ComponentStatus["API"] = "Unhealthy"
            $script:healthReport.TestResults["APICheck"] = "FAIL"
            $script:healthReport.OverallStatus = "UNHEALTHY"
            return $false
        }
    } catch {
        Write-Log "API connectivity failed: $($_.Exception.Message)" "ERROR"
        $script:healthReport.Issues += "API connectivity failed: $($_.Exception.Message)"
        $script:healthReport.ComponentStatus["API"] = "Failed"
        $script:healthReport.TestResults["APICheck"] = "ERROR"
        $script:healthReport.OverallStatus = "CRITICAL"
        return $false
    }
}

# Function to test frontend connectivity
function Test-FrontendHealth {
    Write-Log "Testing frontend connectivity..." "INFO"
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://intranet.kingston.local" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        $stopwatch.Stop()
        
        if ($response.StatusCode -eq 200) {
            Write-Log "Frontend is accessible - Status: $($response.StatusCode)" "SUCCESS"
            $script:healthReport.ComponentStatus["Frontend"] = "Accessible"
            $script:healthReport.TestResults["FrontendCheck"] = "PASS"
            $script:healthReport.Metrics["FrontendResponseTime"] = $stopwatch.ElapsedMilliseconds
            
            # Basic content validation
            if ($response.Content -match "<!DOCTYPE html>" -or $response.Content -match "<html") {
                Write-Log "Frontend serving valid HTML content" "SUCCESS"
                $script:healthReport.TestResults["FrontendContent"] = "PASS"
            } else {
                Write-Log "Frontend not serving expected HTML content" "WARN"
                $script:healthReport.Issues += "Frontend serving unexpected content"
                $script:healthReport.TestResults["FrontendContent"] = "WARN"
            }
            
            return $true
        } else {
            Write-Log "Frontend check failed - Status: $($response.StatusCode)" "ERROR"
            $script:healthReport.Issues += "Frontend not accessible: $($response.StatusCode)"
            $script:healthReport.ComponentStatus["Frontend"] = "Failed"
            $script:healthReport.TestResults["FrontendCheck"] = "FAIL"
            $script:healthReport.OverallStatus = "UNHEALTHY"
            return $false
        }
    } catch {
        Write-Log "Frontend connectivity failed: $($_.Exception.Message)" "ERROR"
        $script:healthReport.Issues += "Frontend connectivity failed: $($_.Exception.Message)"
        $script:healthReport.ComponentStatus["Frontend"] = "Failed"
        $script:healthReport.TestResults["FrontendCheck"] = "ERROR"
        $script:healthReport.OverallStatus = "UNHEALTHY"
        return $false
    }
}

# Function to test system resources
function Test-SystemResources {
    Write-Log "Checking system resources..." "INFO"
    
    try {
        # CPU Usage
        $cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1 -ErrorAction Stop
        $cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)
        $script:healthReport.Metrics["CPUUsage"] = $cpuUsage
        
        if ($cpuUsage -gt 90) {
            Write-Log "CRITICAL: Very high CPU usage - $cpuUsage%" "CRITICAL"
            $script:healthReport.Issues += "Very high CPU usage: $cpuUsage%"
            $script:healthReport.OverallStatus = "CRITICAL"
            $script:healthReport.TestResults["CPUCheck"] = "CRITICAL"
        } elseif ($cpuUsage -gt 80) {
            Write-Log "WARNING: High CPU usage - $cpuUsage%" "WARN"
            $script:healthReport.Issues += "High CPU usage: $cpuUsage%"
            if ($script:healthReport.OverallStatus -eq "HEALTHY") {
                $script:healthReport.OverallStatus = "UNHEALTHY"
            }
            $script:healthReport.TestResults["CPUCheck"] = "WARN"
        } else {
            Write-Log "CPU usage is normal - $cpuUsage%" "SUCCESS"
            $script:healthReport.TestResults["CPUCheck"] = "PASS"
        }
        
        # Memory Usage
        $totalMemory = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
        $availableMemory = (Get-Counter "\Memory\Available Bytes").CounterSamples[0].CookedValue
        $memoryUsagePercent = [math]::Round((($totalMemory - $availableMemory) / $totalMemory) * 100, 2)
        $script:healthReport.Metrics["MemoryUsage"] = $memoryUsagePercent
        
        if ($memoryUsagePercent -gt 95) {
            Write-Log "CRITICAL: Very high memory usage - $memoryUsagePercent%" "CRITICAL"
            $script:healthReport.Issues += "Very high memory usage: $memoryUsagePercent%"
            $script:healthReport.OverallStatus = "CRITICAL"
            $script:healthReport.TestResults["MemoryCheck"] = "CRITICAL"
        } elseif ($memoryUsagePercent -gt 85) {
            Write-Log "WARNING: High memory usage - $memoryUsagePercent%" "WARN"
            $script:healthReport.Issues += "High memory usage: $memoryUsagePercent%"
            if ($script:healthReport.OverallStatus -eq "HEALTHY") {
                $script:healthReport.OverallStatus = "UNHEALTHY"
            }
            $script:healthReport.TestResults["MemoryCheck"] = "WARN"
        } else {
            Write-Log "Memory usage is normal - $memoryUsagePercent%" "SUCCESS"
            $script:healthReport.TestResults["MemoryCheck"] = "PASS"
        }
        
        # Disk space check (C: drive)
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction Stop
        $diskUsagePercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
        $script:healthReport.Metrics["DiskUsage"] = $diskUsagePercent
        
        if ($diskUsagePercent -gt 95) {
            Write-Log "CRITICAL: Very high disk usage - $diskUsagePercent%" "CRITICAL"
            $script:healthReport.Issues += "Very high disk usage: $diskUsagePercent%"
            $script:healthReport.OverallStatus = "CRITICAL"
            $script:healthReport.TestResults["DiskCheck"] = "CRITICAL"
        } elseif ($diskUsagePercent -gt 90) {
            Write-Log "WARNING: High disk usage - $diskUsagePercent%" "WARN"
            $script:healthReport.Issues += "High disk usage: $diskUsagePercent%"
            if ($script:healthReport.OverallStatus -eq "HEALTHY") {
                $script:healthReport.OverallStatus = "UNHEALTHY"
            }
            $script:healthReport.TestResults["DiskCheck"] = "WARN"
        } else {
            Write-Log "Disk usage is normal - $diskUsagePercent%" "SUCCESS"
            $script:healthReport.TestResults["DiskCheck"] = "PASS"
        }
        
        return $true
    } catch {
        Write-Log "System resource check failed: $($_.Exception.Message)" "ERROR"
        $script:healthReport.Issues += "System resource monitoring failed: $($_.Exception.Message)"
        $script:healthReport.TestResults["ResourceCheck"] = "ERROR"
        return $false
    }
}

# Function to send alert emails
function Send-AlertNotification {
    if (-not $SendAlerts) {
        Write-Log "Alert notifications are disabled" "INFO"
        return
    }
    
    $subject = "Kingston's Portal Health Alert - Status: $($script:healthReport.OverallStatus)"
    
    $body = @"
Kingston's Portal System Health Alert
====================================
Generated: $($script:healthReport.Timestamp)
Overall Status: $($script:healthReport.OverallStatus)

COMPONENT STATUS:
"@
    
    foreach ($component in $script:healthReport.ComponentStatus.Keys) {
        $status = $script:healthReport.ComponentStatus[$component]
        $body += "`n- $component`: $status"
    }
    
    $body += "`n`nISSUES DETECTED ($($script:healthReport.Issues.Count)):"
    foreach ($issue in $script:healthReport.Issues) {
        $body += "`n- $issue"
    }
    
    $body += "`n`nSYSTEM METRICS:"
    foreach ($metric in $script:healthReport.Metrics.Keys) {
        $value = $script:healthReport.Metrics[$metric]
        $body += "`n- $metric`: $value"
    }
    
    $body += "`n`nTEST RESULTS:"
    foreach ($test in $script:healthReport.TestResults.Keys) {
        $result = $script:healthReport.TestResults[$test]
        $body += "`n- $test`: $result"
    }
    
    $body += "`n`nLog Location: $LogPath"
    $body += "`n`nThis is an automated alert from Kingston's Portal Health Monitor."
    
    Write-Log "ALERT: Would send email notification to: $AlertEmail" "WARN"
    if ($DetailedOutput) {
        Write-Log "Email Subject: $subject" "INFO"
        Write-Log "Alert prepared with detailed system status" "INFO"
    }
    
    # Uncomment and configure SMTP settings to enable email alerts
    # Send-MailMessage -To $AlertEmail -Subject $subject -Body $body -SmtpServer "your-smtp-server"
}

# Main execution function
function Start-HealthMonitoring {
    Write-Log "========================================" "INFO"
    Write-Log "Kingston's Portal - Health Monitor v2.0" "INFO"
    Write-Log "========================================" "INFO"
    
    $allTestsPassed = $true
    
    # Load environment variables
    $envVars = Load-EnvironmentVariables
    if (-not $envVars) {
        Write-Log "CRITICAL: Failed to load .env configuration file" "CRITICAL"
        $script:healthReport.Issues += "Failed to load .env configuration file"
        $script:healthReport.OverallStatus = "CRITICAL"
        $script:healthReport.TestResults["EnvVarLoad"] = "CRITICAL"
        $allTestsPassed = $false
    } else {
        $script:healthReport.TestResults["EnvVarLoad"] = "PASS"
    }
    
    # Run all health checks
    Write-Log "Running comprehensive health checks..." "INFO"
    
    # 1. Service Health Check
    if (!(Test-ServiceHealth)) {
        $allTestsPassed = $false
    }
    
    # 2. API Health Check
    if (!(Test-APIHealth)) {
        $allTestsPassed = $false
    }
    
    # 3. Frontend Health Check
    if (!(Test-FrontendHealth)) {
        $allTestsPassed = $false
    }
    
    # 4. Database Connectivity Test (only if env vars loaded)
    if ($envVars) {
        Write-Log "Running database connectivity test..." "INFO"
        $dbResult = Test-DatabaseConnection -EnvVars $envVars
        
        if ($dbResult.Success) {
            Write-Log "Database connectivity test successful" "SUCCESS"
            $script:healthReport.ComponentStatus["Database"] = "Connected"
            $script:healthReport.TestResults["DatabaseCheck"] = "PASS"
        } else {
            Write-Log "Database connectivity test failed: $($dbResult.Error)" "ERROR"
            $script:healthReport.Issues += "Database connection failed: $($dbResult.Error)"
            $script:healthReport.ComponentStatus["Database"] = "Failed"
            $script:healthReport.TestResults["DatabaseCheck"] = "FAIL"
            $script:healthReport.OverallStatus = "CRITICAL"
            $allTestsPassed = $false
        }
    } else {
        Write-Log "Database test skipped - environment variables not available" "WARN"
        $script:healthReport.ComponentStatus["Database"] = "Skipped"
        $script:healthReport.TestResults["DatabaseCheck"] = "SKIPPED"
    }
    
    # 5. System Resource Check
    if (!(Test-SystemResources)) {
        $allTestsPassed = $false
    }
    
    # Final status determination
    Write-Log "========================================" "INFO"
    Write-Log "HEALTH CHECK SUMMARY" "INFO"
    Write-Log "========================================" "INFO"
    Write-Log "Overall Status: $($script:healthReport.OverallStatus)" "INFO"
    Write-Log "Total Issues: $($script:healthReport.Issues.Count)" "INFO"
    Write-Log "Tests Run: $($script:healthReport.TestResults.Count)" "INFO"
    
    # Display component status
    Write-Log "Component Status Summary:" "INFO"
    foreach ($component in $script:healthReport.ComponentStatus.Keys) {
        $status = $script:healthReport.ComponentStatus[$component]
        Write-Log "  - $component`: $status" "INFO"
    }
    
    # Display issues if any
    if ($script:healthReport.Issues.Count -gt 0) {
        Write-Log "Issues Detected:" "WARN"
        foreach ($issue in $script:healthReport.Issues) {
            Write-Log "  - $issue" "WARN"
        }
    }
    
    # Send alerts if needed
    if ($script:healthReport.OverallStatus -ne "HEALTHY") {
        Send-AlertNotification
        Write-Log "ATTENTION REQUIRED: System status is $($script:healthReport.OverallStatus)" "WARN"
    } else {
        Write-Log "SUCCESS: All systems are operating normally" "SUCCESS"
    }
    
    Write-Log "========================================" "INFO"
    
    return $allTestsPassed
}

# Script execution
try {
    $success = Start-HealthMonitoring
    
    if ($success -and $script:healthReport.OverallStatus -eq "HEALTHY") {
        Write-Log "Health monitoring completed successfully - All systems healthy" "SUCCESS"
        exit 0
    } else {
        Write-Log "Health monitoring completed with issues - Status: $($script:healthReport.OverallStatus)" "WARN"
        exit 1
    }
    
} catch {
    Write-Log "CRITICAL ERROR: Health monitoring failed: $($_.Exception.Message)" "CRITICAL"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    exit 2
} finally {
    Write-Log "Health monitoring session ended" "INFO"
}
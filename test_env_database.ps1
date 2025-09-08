# Test script to verify .env loading and database connectivity functionality
# Simple test to confirm the fix works before updating main monitoring scripts

param(
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "C:\Logs\test_env_db.log"
)

# Initialize logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    $color = switch ($Level) { 
        "ERROR" { "Red" } 
        "WARN" { "Yellow" } 
        "SUCCESS" { "Green" } 
        default { "White" } 
    }
    Write-Host $logEntry -ForegroundColor $color
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
                Write-Log "Loaded environment variable: $key" "INFO"
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
    Write-Log "Using DATABASE_URL for connection test" "INFO"
    
    # Parse PostgreSQL connection string
    if ($databaseUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)(\?.+)?") {
        $username = $matches[1]
        $password = $matches[2]
        $hostname = $matches[3]
        $port = $matches[4]
        $database = $matches[5]
        
        Write-Log "Parsed connection: $username@$hostname`:$port/$database" "INFO"
        
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
                Write-Log "Query result: $stdout" "INFO"
                return @{ Success = $true; ResponseTime = 0 }
            } else {
                Write-Log "Database connection failed with exit code $exitCode" "ERROR"
                Write-Log "Error output: $stderr" "ERROR"
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

# Main test execution
Write-Log "=== Starting .env and Database Connectivity Test ===" "INFO"

# Load environment variables
$envVars = Load-EnvironmentVariables
if (-not $envVars) {
    Write-Log "FAILED: Could not load .env file" "ERROR"
    exit 1
}

# Test database connection
$dbResult = Test-DatabaseConnection -EnvVars $envVars

if ($dbResult.Success) {
    Write-Log "SUCCESS: All tests passed!" "SUCCESS"
    Write-Log "  - .env file loaded successfully with $($envVars.Count) variables" "SUCCESS"
    Write-Log "  - Database connection successful" "SUCCESS"
    exit 0
} else {
    Write-Log "FAILED: Database connection test failed: $($dbResult.Error)" "ERROR"
    Write-Log "  - .env file loaded successfully with $($envVars.Count) variables" "SUCCESS"
    Write-Log "  - Database connection failed" "ERROR"
    exit 1
}
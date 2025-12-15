# Kingston's Portal - Organized Backup System
# Creates Daily/Weekly/Monthly backups with proper retention policies

param(
    [string]$BackupType = "daily",  # daily, weekly, or monthly
    [string]$Mode = "silent"
)

$ErrorActionPreference = "Continue"

# Configuration
$dbHost = "localhost"
$dbPort = "5432"
$dbUser = "kingstons_app"
$dbName = "kingstons_portal"

# Organized backup structure
$backupBaseDir = "C:\DatabaseBackups\KingstonsPortal"
$dailyDir = "$backupBaseDir\Daily"
$weeklyDir = "$backupBaseDir\Weekly" 
$monthlyDir = "$backupBaseDir\Monthly"
$logFile = "$backupBaseDir\backup_log.txt"

# Create all backup directories
$directories = @($backupBaseDir, $dailyDir, $weeklyDir, $monthlyDir)
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        icacls $dir /grant "Everyone:(OI)(CI)F" /T | Out-Null
    }
}

# Function to write log and console
function Write-BackupLog($message, $color = "White") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - [$BackupType] $message"
    
    try {
        Add-Content -Path $logFile -Value $logEntry -Force
    } catch {
        # Continue if can't write log
    }
    
    if ($Mode -ne "silent") {
        Write-Host $logEntry -ForegroundColor $color
    }
}

# Generate backup filename based on type
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$dateStamp = Get-Date -Format "yyyy-MM-dd"

switch ($BackupType.ToLower()) {
    "daily" {
        $backupFile = "$dailyDir\kingstons_portal_daily_$timestamp.sql"
        $format = "plain"  # Text format for daily
    }
    "weekly" {
        $backupFile = "$weeklyDir\kingstons_portal_weekly_$dateStamp.backup"
        $format = "custom"  # Compressed format for weekly
    }
    "monthly" {
        $monthStamp = Get-Date -Format "yyyy-MM"
        $backupFile = "$monthlyDir\kingstons_portal_monthly_$monthStamp.backup"
        $format = "custom"  # Compressed format for monthly
    }
    default {
        Write-BackupLog "ERROR: Invalid backup type '$BackupType'" "Red"
        exit 1
    }
}

Write-BackupLog "=== Starting $($BackupType.ToUpper()) Database Backup ===" "Cyan"
Write-BackupLog "Backup file: $backupFile" "Gray"
Write-BackupLog "Format: $format" "Gray"

# Load password from .env file (no hardcoded fallback)
$envFile = "C:\Users\kingstonadmin\Documents\kingstons_portal\.env"
$password = $null

if (-not (Test-Path $envFile)) {
    Write-BackupLog "ERROR: .env file not found at $envFile" "Red"
    exit 1
}

try {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line.StartsWith("PGPASSWORD=")) {
            $password = $line.Substring(11).Trim()
            Write-BackupLog "Password loaded from .env file" "Green"
            break
        }
    }
} catch {
    Write-BackupLog "ERROR: Failed to read .env file - $($_.Exception.Message)" "Red"
    exit 1
}

if (-not $password) {
    Write-BackupLog "ERROR: PGPASSWORD not found in .env file" "Red"
    exit 1
}

$env:PGPASSWORD = $password

# Add PostgreSQL to PATH
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)

$pgFound = $false
foreach ($pgPath in $pgPaths) {
    if (Test-Path "$pgPath\pg_dump.exe") {
        $env:PATH = "$pgPath;$env:PATH"
        Write-BackupLog "Using PostgreSQL at: $pgPath" "Green"
        $pgFound = $true
        break
    }
}

if (!$pgFound) {
    Write-BackupLog "ERROR: PostgreSQL tools not found" "Red"
    exit 1
}

try {
    # Test database connection
    Write-BackupLog "Testing database connection..."
    $result = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT 'OK' as status;" -t 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-BackupLog "ERROR: Database connection failed (exit code: $LASTEXITCODE)" "Red"
        exit 1
    }
    
    Write-BackupLog "Database connection successful" "Green"
    
    # Create backup with appropriate format
    Write-BackupLog "Creating $BackupType backup..."
    
    if ($format -eq "plain") {
        & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName --format=plain --clean --create --if-exists --file=$backupFile 2>$null
    } else {
        & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName --format=custom --compress=9 --file=$backupFile 2>$null
    }
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile)) {
        $size = (Get-Item $backupFile).Length
        $sizeMB = [math]::Round($size / 1MB, 2)
        
        if ($size -gt 10KB) {
            Write-BackupLog "SUCCESS: $BackupType backup created ($sizeMB MB)" "Green"
            
            # Handle monthly backup creation from weekly
            if ($BackupType -eq "weekly") {
                $dayOfMonth = (Get-Date).Day
                if ($dayOfMonth -le 7) {  # First week of month
                    $monthlyFile = "$monthlyDir\kingstons_portal_monthly_$(Get-Date -Format 'yyyy-MM').backup"
                    if (!(Test-Path $monthlyFile)) {  # Don't overwrite existing monthly
                        Copy-Item $backupFile $monthlyFile -Force
                        Write-BackupLog "Created monthly backup copy: $monthlyFile" "Cyan"
                    }
                }
            }
            
            # Cleanup old backups based on retention policy
            switch ($BackupType) {
                "daily" {
                    # Keep 7 days of daily backups
                    $cutoffDate = (Get-Date).AddDays(-7)
                    $oldBackups = Get-ChildItem "$dailyDir\*.sql" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
                    foreach ($old in $oldBackups) {
                        Remove-Item $old.FullName -Force -ErrorAction SilentlyContinue
                        Write-BackupLog "Removed old daily backup: $($old.Name)" "Gray"
                    }
                }
                "weekly" {
                    # Keep 4 weeks of weekly backups
                    $cutoffDate = (Get-Date).AddDays(-28)
                    $oldBackups = Get-ChildItem "$weeklyDir\*.backup" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
                    foreach ($old in $oldBackups) {
                        Remove-Item $old.FullName -Force -ErrorAction SilentlyContinue
                        Write-BackupLog "Removed old weekly backup: $($old.Name)" "Gray"
                    }
                }
                "monthly" {
                    # Keep 12 months of monthly backups
                    $cutoffDate = (Get-Date).AddMonths(-12)
                    $oldBackups = Get-ChildItem "$monthlyDir\*.backup" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
                    foreach ($old in $oldBackups) {
                        Remove-Item $old.FullName -Force -ErrorAction SilentlyContinue
                        Write-BackupLog "Removed old monthly backup: $($old.Name)" "Gray"
                    }
                }
            }
            
        } else {
            Write-BackupLog "WARNING: Backup file very small ($size bytes)" "Yellow"
        }
        
    } else {
        Write-BackupLog "ERROR: Backup creation failed (exit code: $LASTEXITCODE)" "Red"
        if (Test-Path $backupFile) {
            Remove-Item $backupFile -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
    
} catch {
    Write-BackupLog "ERROR: $($_.Exception.Message)" "Red"
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-BackupLog "=== $($BackupType.ToUpper()) Backup Completed Successfully ===" "Cyan"

# Show backup summary if interactive
if ($Mode -ne "silent") {
    Write-Host "`nBackup Summary:" -ForegroundColor Yellow
    Write-Host "  Type: $BackupType" -ForegroundColor Gray
    Write-Host "  File: $(Split-Path $backupFile -Leaf)" -ForegroundColor Gray
    Write-Host "  Location: $(Split-Path $backupFile -Parent)" -ForegroundColor Gray
    
    if (Test-Path $backupFile) {
        $sizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
        Write-Host "  Size: $sizeMB MB" -ForegroundColor Gray
    }
}
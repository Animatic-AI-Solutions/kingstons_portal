# =========================================================
# Import Data to Local PostgreSQL - Kingston's Portal
# This script imports all exported data into local PostgreSQL
# =========================================================

Write-Host "Kingston's Portal - Data Import to PostgreSQL" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# PostgreSQL connection settings
$pgHost = "localhost"
$pgPort = "5432"
$pgDatabase = "kingstons_portal"
$pgUser = "kingstons_app"
$pgPassword = "KingstonApp2024!"

# Set PostgreSQL tools path
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
$psqlPath = "$pgPath\psql.exe"

# Verify PostgreSQL tools exist
if (!(Test-Path $psqlPath)) {
    Write-Host "ERROR: psql not found at: $psqlPath" -ForegroundColor Red
    Write-Host "Please check your PostgreSQL installation path." -ForegroundColor Yellow
    exit 1
}

# Data directory
$dataDir = "migration_scripts\migration_data"

# Tables in dependency order (important for foreign key constraints)
$tables = @(
    "profiles",
    "authentication", 
    "session",
    "available_providers",
    "client_groups",
    "product_owners",
    "available_funds",
    "available_portfolios",
    "client_group_product_owners",
    "template_portfolio_generations",
    "available_portfolio_funds",
    "portfolios",
    "client_products",
    "product_owner_products",
    "portfolio_funds",
    "portfolio_fund_valuations",
    "portfolio_valuations",
    "portfolio_fund_irr_values",
    "portfolio_irr_values",
    "holding_activity_log",
    "provider_switch_log",
    "user_page_presence"
)

# Set password environment variable
$env:PGPASSWORD = $pgPassword

Write-Host "`nStep 1: Testing PostgreSQL connection..." -ForegroundColor Cyan
$testResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Connected to local PostgreSQL!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Cannot connect to PostgreSQL!" -ForegroundColor Red
    Write-Host "Error: $testResult" -ForegroundColor Yellow
    Write-Host "`nPlease ensure:" -ForegroundColor Yellow
    Write-Host "- PostgreSQL service is running" -ForegroundColor White
    Write-Host "- Database 'kingstons_portal' exists" -ForegroundColor White
    Write-Host "- User 'kingstons_app' has access" -ForegroundColor White
    exit 1
}

Write-Host "`nStep 2: Clearing existing data (if any)..." -ForegroundColor Cyan
Write-Host "WARNING: This will delete any existing data in the tables!" -ForegroundColor Yellow
$confirmation = Read-Host "Continue? (y/N)"

if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Import cancelled by user." -ForegroundColor Yellow
    exit 0
}

# Disable foreign key constraints temporarily
Write-Host "Disabling foreign key constraints..." -ForegroundColor Yellow
& $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -c "SET session_replication_role = replica;" 2>&1

# Clear all tables in reverse order
$reverseTables = [array]::Reverse($tables.Clone())
foreach ($table in $reverseTables) {
    Write-Host "Clearing table: $table" -ForegroundColor Yellow
    & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -c "TRUNCATE TABLE $table CASCADE;" 2>&1
}

Write-Host "`nStep 3: Importing data..." -ForegroundColor Cyan

$successCount = 0
$errorCount = 0
$skippedCount = 0

foreach ($table in $tables) {
    $fileName = "$table" + "_rows.sql"
    $filePath = "$dataDir\$fileName"
    
    Write-Host "Importing $table..." -ForegroundColor Yellow
    
    if (!(Test-Path $filePath)) {
        Write-Host "  WARNING: File not found - $fileName" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    $fileInfo = Get-Item $filePath
    if ($fileInfo.Length -eq 0) {
        Write-Host "  INFO: Empty file - $table (no data to import)" -ForegroundColor Cyan
        $skippedCount++
        continue
    }
    
    # Check if file contains actual INSERT statements
    $firstLine = Get-Content $filePath -TotalCount 1
    if ($firstLine -notlike "*INSERT INTO*" -and $firstLine -notlike "*insert into*") {
        Write-Host "  INFO: No INSERT statements - $table (no data to import)" -ForegroundColor Cyan
        $skippedCount++
        continue
    }
    
    # Import the data
    $importResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -f $filePath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Count imported rows
        $rowCountResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -c "SELECT COUNT(*) FROM $table;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $rowCount = $rowCountResult.Trim()
            Write-Host "  SUCCESS: $table ($rowCount rows imported)" -ForegroundColor Green
        } else {
            Write-Host "  SUCCESS: $table (import completed)" -ForegroundColor Green
        }
        $successCount++
    } else {
        Write-Host "  ERROR: $table import failed!" -ForegroundColor Red
        Write-Host "    $importResult" -ForegroundColor Gray
        $errorCount++
    }
}

Write-Host "`nStep 4: Re-enabling foreign key constraints..." -ForegroundColor Cyan
& $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -c "SET session_replication_role = DEFAULT;" 2>&1

Write-Host "`nStep 5: Verifying data integrity..." -ForegroundColor Cyan

# Get total row counts
$totalRows = 0
foreach ($table in $tables) {
    $rowCountResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -c "SELECT COUNT(*) FROM $table;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $rowCount = [int]$rowCountResult.Trim()
        $totalRows += $rowCount
        if ($rowCount -gt 0) {
            Write-Host "  $table : $rowCount rows" -ForegroundColor White
        }
    }
}

# Final summary
Write-Host "`nImport Summary:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Tables processed: $($tables.Count)" -ForegroundColor White
Write-Host "Successful imports: $successCount" -ForegroundColor Green
Write-Host "Skipped (empty): $skippedCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor Red
Write-Host "Total rows imported: $totalRows" -ForegroundColor White

# Clean up environment variable
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

if ($errorCount -eq 0) {
    Write-Host "`nSUCCESS: Data migration completed successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Update your backend code to use PostgreSQL instead of Supabase" -ForegroundColor White
    Write-Host "2. Test your application with the local database" -ForegroundColor White
    Write-Host "3. Update environment variables for production" -ForegroundColor White
} else {
    Write-Host "`nWARNING: Migration completed with $errorCount errors!" -ForegroundColor Yellow
    Write-Host "Please review the errors above and fix any issues." -ForegroundColor White
}

Write-Host "`nDatabase connection details:" -ForegroundColor Cyan
Write-Host "Host: $pgHost" -ForegroundColor White
Write-Host "Port: $pgPort" -ForegroundColor White
Write-Host "Database: $pgDatabase" -ForegroundColor White
Write-Host "User: $pgUser" -ForegroundColor White
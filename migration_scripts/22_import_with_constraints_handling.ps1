# =========================================================
# Import Data with Constraint Handling - Kingston's Portal
# This script handles foreign key constraints during import
# =========================================================

Write-Host "Kingston's Portal - Data Import with Constraint Handling" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# PostgreSQL connection settings
$pgHost = "localhost"
$pgPort = "5432"
$pgDatabase = "kingstons_portal"
$pgUser = "kingstons_app"
$pgPassword = "KingstonApp2024!"

# Set PostgreSQL tools path
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
$psqlPath = "$pgPath\psql.exe"

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
    exit 1
}

Write-Host "`nStep 2: Temporarily disable foreign key constraints..." -ForegroundColor Cyan

# Create a script to disable all foreign key constraints
$disableConstraintsSQL = @"
-- Disable all foreign key constraints
DO `$`$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DISABLE TRIGGER ALL;';
    END LOOP;
END`$`$;
"@

$tempFile = "migration_scripts\temp_disable_constraints.sql"
$disableConstraintsSQL | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Disabling foreign key constraints..." -ForegroundColor Yellow
$disableResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -f $tempFile 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not disable constraints - continuing anyway" -ForegroundColor Yellow
    Write-Host "Error: $disableResult" -ForegroundColor Gray
}

Write-Host "`nStep 3: Clearing existing data..." -ForegroundColor Cyan
Write-Host "WARNING: This will delete any existing data in the tables!" -ForegroundColor Yellow
$confirmation = Read-Host "Continue? (y/N)"

if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Import cancelled by user." -ForegroundColor Yellow
    exit 0
}

# Clear all tables
foreach ($table in $tables) {
    Write-Host "Clearing table: $table" -ForegroundColor Yellow
    $deleteResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -c "DELETE FROM $table;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Could not clear $table - $deleteResult" -ForegroundColor Yellow
    }
}

Write-Host "`nStep 4: Importing data..." -ForegroundColor Cyan

$successCount = 0
$errorCount = 0
$skippedCount = 0
$importResults = @()

foreach ($table in $tables) {
    $fileName = "$table" + "_rows.sql"
    $filePath = "$dataDir\$fileName"
    
    Write-Host "Importing $table..." -ForegroundColor Yellow
    
    if (!(Test-Path $filePath)) {
        Write-Host "  WARNING: File not found - $fileName" -ForegroundColor Yellow
        $skippedCount++
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Skipped"
            Rows = 0
            Error = "File not found"
        }
        continue
    }
    
    $fileInfo = Get-Item $filePath
    if ($fileInfo.Length -eq 0) {
        Write-Host "  INFO: Empty file - $table (no data to import)" -ForegroundColor Cyan
        $skippedCount++
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Skipped"
            Rows = 0
            Error = "Empty file"
        }
        continue
    }
    
    # Check if file contains actual INSERT statements
    $firstLine = Get-Content $filePath -TotalCount 1
    if ($firstLine -notlike "*INSERT INTO*" -and $firstLine -notlike "*insert into*") {
        Write-Host "  INFO: No INSERT statements - $table (no data to import)" -ForegroundColor Cyan
        $skippedCount++
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Skipped" 
            Rows = 0
            Error = "No INSERT statements"
        }
        continue
    }
    
    # Get row count before import
    $beforeCountResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -c "SELECT COUNT(*) FROM $table;" 2>&1
    $beforeCount = if ($LASTEXITCODE -eq 0) { [int]$beforeCountResult.Trim() } else { 0 }
    
    # Import the data
    $importResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -f $filePath 2>&1
    
    # Get row count after import
    $afterCountResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -c "SELECT COUNT(*) FROM $table;" 2>&1
    $afterCount = if ($LASTEXITCODE -eq 0) { [int]$afterCountResult.Trim() } else { 0 }
    
    $importedRows = $afterCount - $beforeCount
    
    if ($LASTEXITCODE -eq 0 -and $importedRows -gt 0) {
        Write-Host "  SUCCESS: $table ($importedRows rows imported)" -ForegroundColor Green
        $successCount++
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Success"
            Rows = $importedRows
            Error = ""
        }
    } elseif ($LASTEXITCODE -eq 0 -and $importedRows -eq 0) {
        Write-Host "  WARNING: $table (0 rows imported - possible constraint issues)" -ForegroundColor Yellow
        $errorCount++
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Warning"
            Rows = 0
            Error = "0 rows imported despite successful execution"
        }
    } else {
        Write-Host "  ERROR: $table import failed!" -ForegroundColor Red
        Write-Host "    $importResult" -ForegroundColor Gray
        $errorCount++
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Error"
            Rows = 0
            Error = $importResult
        }
    }
}

Write-Host "`nStep 5: Re-enabling foreign key constraints..." -ForegroundColor Cyan

# Create a script to re-enable all foreign key constraints
$enableConstraintsSQL = @"
-- Re-enable all foreign key constraints
DO `$`$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' ENABLE TRIGGER ALL;';
    END LOOP;
END`$`$;
"@

$tempFile2 = "migration_scripts\temp_enable_constraints.sql"
$enableConstraintsSQL | Out-File -FilePath $tempFile2 -Encoding UTF8

$enableResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -f $tempFile2 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not re-enable constraints" -ForegroundColor Yellow
    Write-Host "Error: $enableResult" -ForegroundColor Gray
}

# Clean up temp files
Remove-Item $tempFile -ErrorAction SilentlyContinue
Remove-Item $tempFile2 -ErrorAction SilentlyContinue

Write-Host "`nStep 6: Final verification..." -ForegroundColor Cyan

# Get total row counts
$totalRows = 0
Write-Host "Final row counts:" -ForegroundColor White
foreach ($table in $tables) {
    $rowCountResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -c "SELECT COUNT(*) FROM $table;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $rowCount = [int]$rowCountResult.Trim()
        $totalRows += $rowCount
        if ($rowCount -gt 0) {
            Write-Host "  $table : $rowCount rows" -ForegroundColor Green
        } else {
            Write-Host "  $table : 0 rows (empty)" -ForegroundColor Yellow
        }
    }
}

# Detailed results
Write-Host "`nDetailed Import Results:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
$importResults | Format-Table -AutoSize

# Final summary
Write-Host "`nImport Summary:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Tables processed: $($tables.Count)" -ForegroundColor White
Write-Host "Successful imports: $successCount" -ForegroundColor Green
Write-Host "Warnings (0 rows): $(($importResults | Where-Object {$_.Status -eq 'Warning'}).Count)" -ForegroundColor Yellow
Write-Host "Skipped (empty): $skippedCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor Red
Write-Host "Total rows imported: $totalRows" -ForegroundColor White

# Clean up environment variable
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

if ($errorCount -eq 0) {
    Write-Host "`nSUCCESS: Data migration completed!" -ForegroundColor Green
} else {
    Write-Host "`nWARNING: Migration completed with issues!" -ForegroundColor Yellow
    Write-Host "Tables with 0 rows may have foreign key constraint issues." -ForegroundColor White
    Write-Host "Check the detailed results above for specific problems." -ForegroundColor White
}
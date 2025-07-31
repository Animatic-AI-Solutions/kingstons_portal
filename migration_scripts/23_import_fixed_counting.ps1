# =========================================================
# Import Data with Fixed Row Counting - Kingston's Portal
# This script handles foreign key constraints and fixes counting issues
# =========================================================

Write-Host "Kingston's Portal - Data Import (Fixed Counting)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

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

Write-Host "`nStep 2: Clearing existing data..." -ForegroundColor Cyan
Write-Host "WARNING: This will delete any existing data in the tables!" -ForegroundColor Yellow
$confirmation = Read-Host "Continue? (y/N)"

if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Import cancelled by user." -ForegroundColor Yellow
    exit 0
}

# Clear all tables in reverse order
$reverseTables = $tables.Clone()
[array]::Reverse($reverseTables)

foreach ($table in $reverseTables) {
    Write-Host "Clearing table: $table" -ForegroundColor Yellow
    $deleteResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -c "DELETE FROM $table;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Could not clear $table" -ForegroundColor Yellow
    }
}

Write-Host "`nStep 3: Importing data..." -ForegroundColor Cyan

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
    Write-Host "  Executing SQL import..." -ForegroundColor Gray
    $importResult = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -f $filePath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Count rows after import (fixed method)
        $countQuery = "SELECT COUNT(*) FROM $table;"
        $rowCountOutput = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -A -c $countQuery 2>&1
        
        # Handle the output properly
        $rowCount = 0
        if ($LASTEXITCODE -eq 0) {
            if ($rowCountOutput -is [array]) {
                # If it's an array, take the first non-empty element
                $cleanOutput = ($rowCountOutput | Where-Object { $_ -and $_.ToString().Trim() -ne "" } | Select-Object -First 1)
                if ($cleanOutput) {
                    $rowCount = [int]$cleanOutput.ToString().Trim()
                }
            } else {
                # If it's a single value
                $rowCount = [int]$rowCountOutput.ToString().Trim()
            }
        }
        
        if ($rowCount -gt 0) {
            Write-Host "  SUCCESS: $table ($rowCount rows imported)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  WARNING: $table (0 rows imported - check for constraint issues)" -ForegroundColor Yellow
            
            # Let's check what's in the SQL file
            $sampleContent = Get-Content $filePath -TotalCount 1
            Write-Host "    First line of SQL: $($sampleContent.Substring(0, [Math]::Min(100, $sampleContent.Length)))..." -ForegroundColor Gray
            
            # Check if there are any constraint violations in the import result
            if ($importResult -like "*ERROR*" -or $importResult -like "*DETAIL*") {
                Write-Host "    Import details: $importResult" -ForegroundColor Gray
            }
        }
        
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = if ($rowCount -gt 0) { "Success" } else { "Warning" }
            Rows = $rowCount
        }
        
    } else {
        Write-Host "  ERROR: $table import failed!" -ForegroundColor Red
        Write-Host "    Error: $importResult" -ForegroundColor Gray
        $errorCount++
        
        $importResults += [PSCustomObject]@{
            Table = $table
            Status = "Error"
            Rows = 0
        }
    }
}

Write-Host "`nStep 4: Final verification..." -ForegroundColor Cyan

# Get total row counts
$totalRows = 0
Write-Host "Final row counts:" -ForegroundColor White
foreach ($table in $tables) {
    $countQuery = "SELECT COUNT(*) FROM $table;"
    $rowCountOutput = & $psqlPath -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -t -A -c $countQuery 2>&1
    
    $rowCount = 0
    if ($LASTEXITCODE -eq 0) {
        if ($rowCountOutput -is [array]) {
            $cleanOutput = ($rowCountOutput | Where-Object { $_ -and $_.ToString().Trim() -ne "" } | Select-Object -First 1)
            if ($cleanOutput) {
                $rowCount = [int]$cleanOutput.ToString().Trim()
            }
        } else {
            $rowCount = [int]$rowCountOutput.ToString().Trim()
        }
        $totalRows += $rowCount
        
        if ($rowCount -gt 0) {
            Write-Host "  $table : $rowCount rows" -ForegroundColor Green
        } else {
            Write-Host "  $table : 0 rows (empty)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  $table : ERROR counting rows" -ForegroundColor Red
    }
}

# Show results table
Write-Host "`nImport Results:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
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

# Specific guidance for tables with 0 rows
$zeroRowTables = $importResults | Where-Object {$_.Status -eq 'Warning' -and $_.Rows -eq 0}
if ($zeroRowTables.Count -gt 0) {
    Write-Host "`nTables with 0 rows imported:" -ForegroundColor Yellow
    foreach ($zeroTable in $zeroRowTables) {
        Write-Host "- $($zeroTable.Table)" -ForegroundColor Yellow
    }
    Write-Host "`nThis might be due to:" -ForegroundColor White
    Write-Host "1. Foreign key constraint violations" -ForegroundColor White
    Write-Host "2. Data type mismatches" -ForegroundColor White
    Write-Host "3. NULL constraint violations" -ForegroundColor White
    Write-Host "4. Unique constraint violations" -ForegroundColor White
}

if ($totalRows -gt 0) {
    Write-Host "`nSUCCESS: $totalRows total rows imported!" -ForegroundColor Green
} else {
    Write-Host "`nWARNING: No data was imported!" -ForegroundColor Red
}
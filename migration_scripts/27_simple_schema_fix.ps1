# Simple Schema Fix Script - No Emojis
# This script checks all tables and adds missing columns based on migration files

Write-Host "Starting Schema Fix..." -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Database connection settings
$env:PGPASSWORD = "KingstonApp2024!"
$psqlCmd = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$connectionArgs = @("-h", "localhost", "-p", "5432", "-U", "kingstons_app", "-d", "kingstons_portal")

# Directory containing migration data files
$migrationDataDir = "migration_scripts\migration_data"

# Tables to check
$tables = @(
    "authentication",
    "available_funds", 
    "available_portfolio_funds",
    "available_portfolios",
    "available_providers",
    "client_group_product_owners",
    "client_groups",
    "client_products",
    "holding_activity_log",
    "portfolio_fund_irr_values",
    "portfolio_fund_valuations", 
    "portfolio_funds",
    "portfolio_irr_values",
    "portfolio_valuations",
    "portfolios",
    "product_owner_products",
    "product_owners",
    "profiles",
    "provider_switch_log",
    "session",
    "template_portfolio_generations",
    "user_page_presence"
)

# Track progress
$totalTables = $tables.Count
$tablesProcessed = 0
$tablesFixed = 0
$totalColumnsAdded = 0

Write-Host "Checking $totalTables tables for missing columns..." -ForegroundColor Yellow

foreach ($table in $tables) {
    $tablesProcessed++
    Write-Host ""
    Write-Host "[$tablesProcessed/$totalTables] Checking table: $table" -ForegroundColor White
    
    # Get local table columns
    $columnQuery = "SELECT column_name FROM information_schema.columns WHERE table_name = '$table' ORDER BY ordinal_position;"
    $localResult = & $psqlCmd @connectionArgs -t -c $columnQuery
    $localColumns = $localResult | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    
    Write-Host "  Local columns: $($localColumns.Count)" -ForegroundColor Gray
    
    # Check migration file
    $migrationFile = "$migrationDataDir\${table}_rows.sql"
    if (-not (Test-Path $migrationFile)) {
        Write-Host "  Migration file not found, skipping..." -ForegroundColor Yellow
        continue
    }
    
    # Get expected columns from migration file
    $firstLine = Get-Content $migrationFile -TotalCount 1
    if ($firstLine -match "INSERT INTO.*?\((.*?)\)\s+VALUES") {
        $columnString = $matches[1]
        $expectedColumns = $columnString -split ',' | ForEach-Object { $_.Trim().Trim('"') }
        
        Write-Host "  Expected columns: $($expectedColumns.Count)" -ForegroundColor Gray
        
        # Find missing columns
        $missingColumns = $expectedColumns | Where-Object { $_ -notin $localColumns }
        
        if ($missingColumns.Count -eq 0) {
            Write-Host "  SUCCESS: Schema matches, no fixes needed" -ForegroundColor Green
        } else {
            Write-Host "  MISSING: $($missingColumns -join ', ')" -ForegroundColor Red
            $tablesFixed++
            
            # Add missing columns
            foreach ($missingCol in $missingColumns) {
                # Determine column type based on common patterns
                $columnType = "TEXT"  # Default fallback
                
                if ($missingCol -eq "updated_at" -or $missingCol -eq "created_at") {
                    $columnType = "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
                }
                elseif ($missingCol -eq "deleted_at") {
                    $columnType = "TIMESTAMPTZ"
                }
                elseif ($missingCol -like "*_id") {
                    $columnType = "BIGINT"
                }
                elseif ($missingCol -like "*_at" -or $missingCol -like "*_date") {
                    $columnType = "TIMESTAMPTZ"
                }
                elseif ($missingCol -like "*_count" -or $missingCol -like "*_number") {
                    $columnType = "INTEGER"
                }
                elseif ($missingCol -like "*_amount" -or $missingCol -like "*_value") {
                    $columnType = "NUMERIC"
                }
                elseif ($missingCol -like "*_flag" -or $missingCol -like "is_*") {
                    $columnType = "BOOLEAN"
                }
                
                # Execute ALTER TABLE
                $alterStatement = "ALTER TABLE $table ADD COLUMN IF NOT EXISTS `"$missingCol`" $columnType;"
                Write-Host "    Adding: $missingCol ($columnType)" -ForegroundColor Yellow
                
                try {
                    $result = & $psqlCmd @connectionArgs -c $alterStatement
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "      SUCCESS" -ForegroundColor Green
                        $totalColumnsAdded++
                    } else {
                        Write-Host "      FAILED: $result" -ForegroundColor Red
                    }
                }
                catch {
                    Write-Host "      EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  Could not parse migration file INSERT statement" -ForegroundColor Yellow
    }
}

# Summary Report
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "SCHEMA FIX SUMMARY" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Results:" -ForegroundColor White
Write-Host "  - Tables processed: $tablesProcessed" -ForegroundColor Gray
Write-Host "  - Tables requiring fixes: $tablesFixed" -ForegroundColor Yellow
Write-Host "  - Total columns added: $totalColumnsAdded" -ForegroundColor Green

if ($totalColumnsAdded -gt 0) {
    Write-Host ""
    Write-Host "SCHEMA FIXES COMPLETED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "  1. Run data import: .\migration_scripts\23_import_fixed_counting.ps1" -ForegroundColor White
    Write-Host "  2. Verify import success" -ForegroundColor White
    Write-Host "  3. Update backend to use PostgreSQL" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ALL SCHEMAS WERE ALREADY CORRECT!" -ForegroundColor Green
    Write-Host "  You can proceed with data import: .\migration_scripts\23_import_fixed_counting.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "Schema fix complete!" -ForegroundColor Green 
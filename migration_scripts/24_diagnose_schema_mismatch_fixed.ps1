# Schema Mismatch Diagnosis Script
# This script compares expected columns from Supabase export files with local PostgreSQL tables

Write-Host "🔍 Starting Schema Mismatch Diagnosis..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Database connection settings
$env:PGPASSWORD = "KingstonApp2024!"
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
$psqlCmd = "$pgPath\psql.exe"
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

# Results storage
$schemaMismatches = @()
$tableResults = @{}

Write-Host "📋 Analyzing tables..." -ForegroundColor Yellow

foreach ($table in $tables) {
    Write-Host ""
    Write-Host "🔍 Analyzing table: $table" -ForegroundColor White
    
    # Get local PostgreSQL table structure
    Write-Host "  📊 Getting local table structure..." -ForegroundColor Gray
    $localColumns = @()
    try {
        $columnQuery = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '$table' ORDER BY ordinal_position;"
        $localResult = & $psqlCmd @connectionArgs -t -c $columnQuery
        
        if ($localResult) {
            $localColumns = $localResult | ForEach-Object {
                $parts = $_.Trim() -split '\|'
                if ($parts.Count -ge 2) {
                    @{
                        name = $parts[0].Trim()
                        type = $parts[1].Trim()
                        nullable = if ($parts.Count -gt 2) { $parts[2].Trim() } else { "YES" }
                    }
                }
            } | Where-Object { $_ -ne $null }
        }
        
        Write-Host "    ✅ Found $($localColumns.Count) columns in local table" -ForegroundColor Green
    }
    catch {
        Write-Host "    ❌ Error getting local table structure: $($_.Exception.Message)" -ForegroundColor Red
        continue
    }
    
    # Check if migration data file exists
    $migrationFile = "$migrationDataDir\${table}_rows.sql"
    if (-not (Test-Path $migrationFile)) {
        Write-Host "    ⚠️ Migration file not found: $migrationFile" -ForegroundColor Yellow
        continue
    }
    
    # Analyze the INSERT statement from migration file
    Write-Host "  📄 Analyzing migration file..." -ForegroundColor Gray
    $expectedColumns = @()
    try {
        $firstLine = Get-Content $migrationFile -TotalCount 1
        if ($firstLine -match "INSERT INTO.*?\((.*?)\)\s+VALUES") {
            $columnString = $matches[1]
            $expectedColumns = $columnString -split ',' | ForEach-Object { $_.Trim().Trim('"') }
            Write-Host "    ✅ Found $($expectedColumns.Count) expected columns in migration file" -ForegroundColor Green
        }
        else {
            Write-Host "    ⚠️ Could not parse INSERT statement from migration file" -ForegroundColor Yellow
            Write-Host "    First line: $firstLine" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "    ❌ Error reading migration file: $($_.Exception.Message)" -ForegroundColor Red
        continue
    }
    
    # Compare columns
    $localColumnNames = $localColumns | ForEach-Object { $_.name }
    $missingColumns = $expectedColumns | Where-Object { $_ -notin $localColumnNames }
    $extraColumns = $localColumnNames | Where-Object { $_ -notin $expectedColumns }
    
    # Store results
    $tableResult = @{
        tableName = $table
        localColumns = $localColumns
        expectedColumns = $expectedColumns
        missingColumns = $missingColumns
        extraColumns = $extraColumns
        hasMismatch = ($missingColumns.Count -gt 0 -or $extraColumns.Count -gt 0)
    }
    $tableResults[$table] = $tableResult
    
    # Report results for this table
    if ($tableResult.hasMismatch) {
        Write-Host "    ❌ SCHEMA MISMATCH DETECTED" -ForegroundColor Red
        
        if ($missingColumns.Count -gt 0) {
            Write-Host "    📋 Missing columns in local table:" -ForegroundColor Yellow
            $missingColumns | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
        }
        
        if ($extraColumns.Count -gt 0) {
            Write-Host "    📋 Extra columns in local table:" -ForegroundColor Cyan
            $extraColumns | ForEach-Object { Write-Host "      - $_" -ForegroundColor Cyan }
        }
        
        $schemaMismatches += $tableResult
    }
    else {
        Write-Host "    ✅ Schema matches" -ForegroundColor Green
    }
}

# Summary Report
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 SCHEMA DIAGNOSIS SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "📈 Overall Results:" -ForegroundColor White
Write-Host "  • Total tables analyzed: $($tables.Count)" -ForegroundColor Gray
$mismatchColor = if ($schemaMismatches.Count -gt 0) { "Red" } else { "Green" }
Write-Host "  • Tables with mismatches: $($schemaMismatches.Count)" -ForegroundColor $mismatchColor
Write-Host "  • Tables matching: $($tables.Count - $schemaMismatches.Count)" -ForegroundColor Green

if ($schemaMismatches.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ TABLES REQUIRING FIXES:" -ForegroundColor Red
    
    foreach ($mismatch in $schemaMismatches) {
        Write-Host ""
        Write-Host "  🔧 Table: $($mismatch.tableName)" -ForegroundColor Yellow
        
        if ($mismatch.missingColumns.Count -gt 0) {
            Write-Host "    Missing columns: $($mismatch.missingColumns -join ', ')" -ForegroundColor Red
        }
        
        if ($mismatch.extraColumns.Count -gt 0) {
            Write-Host "    Extra columns: $($mismatch.extraColumns -join ', ')" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "🔧 NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "  1. Run the fix script: .\migration_scripts\25_fix_schema_mismatches.ps1" -ForegroundColor White
    Write-Host "  2. Retry data import: .\migration_scripts\23_import_fixed_counting.ps1" -ForegroundColor White
    Write-Host "  3. Verify import success" -ForegroundColor White
}
else {
    Write-Host ""
    Write-Host "✅ ALL SCHEMAS MATCH!" -ForegroundColor Green
    Write-Host "  You can proceed with data import: .\migration_scripts\23_import_fixed_counting.ps1" -ForegroundColor White
}

# Export results for the fix script
$resultsFile = "migration_scripts\schema_diagnosis_results.json"
$tableResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsFile -Encoding UTF8
Write-Host ""
Write-Host "💾 Detailed results saved to: $resultsFile" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 Diagnosis complete!" -ForegroundColor Green 
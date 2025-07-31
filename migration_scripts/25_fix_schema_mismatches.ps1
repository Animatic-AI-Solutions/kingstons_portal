# ====================================================================
# Schema Mismatch Fix Script
# ====================================================================
# This script reads the diagnosis results and automatically fixes
# schema mismatches by adding missing columns to local PostgreSQL tables
# ====================================================================

Write-Host "🔧 Starting Schema Mismatch Fix..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Database connection settings
$env:PGPASSWORD = "KingstonApp2024!"
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
$psqlCmd = "$pgPath\psql.exe"
$connectionArgs = @("-h", "localhost", "-p", "5432", "-U", "kingstons_app", "-d", "kingstons_portal")

# Check if diagnosis results exist
$resultsFile = "migration_scripts\schema_diagnosis_results.json"
if (-not (Test-Path $resultsFile)) {
    Write-Host "❌ Diagnosis results file not found: $resultsFile" -ForegroundColor Red
    Write-Host "Please run the diagnosis script first: .\migration_scripts\24_diagnose_schema_mismatch.ps1" -ForegroundColor Yellow
    exit 1
}

# Load diagnosis results
Write-Host "📋 Loading diagnosis results..." -ForegroundColor Yellow
try {
    $diagnosisResults = Get-Content $resultsFile -Raw | ConvertFrom-Json
    Write-Host "✅ Loaded results for $($diagnosisResults.PSObject.Properties.Count) tables" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error loading diagnosis results: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Common column type mappings for Supabase/PostgreSQL
$commonColumnTypes = @{
    'id' = 'BIGINT'
    'created_at' = 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP'
    'updated_at' = 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP'
    'deleted_at' = 'TIMESTAMPTZ'
    'status' = 'TEXT'
    'name' = 'TEXT'
    'description' = 'TEXT'
    'notes' = 'TEXT'
}

# Track overall progress
$totalFixes = 0
$successfulFixes = 0
$failedFixes = 0

Write-Host "`n🔧 Processing schema fixes..." -ForegroundColor Yellow

foreach ($tableName in $diagnosisResults.PSObject.Properties.Name) {
    $tableResult = $diagnosisResults.$tableName
    
    if (-not $tableResult.hasMismatch -or $tableResult.missingColumns.Count -eq 0) {
        Write-Host "✅ Table '$tableName' - No missing columns to add" -ForegroundColor Green
        continue
    }
    
    Write-Host "`n🔧 Fixing table: $tableName" -ForegroundColor White
    Write-Host "  📋 Missing columns: $($tableResult.missingColumns -join ', ')" -ForegroundColor Yellow
    
    # Generate ALTER TABLE statements for missing columns
    $alterStatements = @()
    
    foreach ($missingCol in $tableResult.missingColumns) {
        # Determine column type based on common patterns
        $columnType = "TEXT"  # Default fallback
        
        if ($commonColumnTypes.ContainsKey($missingCol)) {
            $columnType = $commonColumnTypes[$missingCol]
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
        
        $alterStatement = "ALTER TABLE $tableName ADD COLUMN IF NOT EXISTS `"$missingCol`" $columnType;"
        $alterStatements += $alterStatement
        
        Write-Host "    🔧 Adding column: $missingCol ($columnType)" -ForegroundColor Gray
    }
    
    # Execute ALTER statements
    $tableSuccess = $true
    foreach ($statement in $alterStatements) {
        try {
            $totalFixes++
            Write-Host "    🔨 Executing: $statement" -ForegroundColor Gray
            
            $result = & $psqlCmd @connectionArgs -c $statement 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "      ✅ Success" -ForegroundColor Green
                $successfulFixes++
            }
            else {
                Write-Host "      ❌ Failed: $result" -ForegroundColor Red
                $tableSuccess = $false
                $failedFixes++
            }
        }
        catch {
            Write-Host "      ❌ Exception: $($_.Exception.Message)" -ForegroundColor Red
            $tableSuccess = $false
            $failedFixes++
        }
    }
    
    if ($tableSuccess) {
        Write-Host "  ✅ Table '$tableName' fixed successfully" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ Table '$tableName' had some failures" -ForegroundColor Red
    }
}

# Summary Report
Write-Host "`n" -NoNewline
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 SCHEMA FIX SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`n📈 Fix Results:" -ForegroundColor White
Write-Host "  • Total fixes attempted: $totalFixes" -ForegroundColor Gray
Write-Host "  • Successful fixes: $successfulFixes" -ForegroundColor Green
$failedColor = if ($failedFixes -gt 0) { "Red" } else { "Green" }
Write-Host "  • Failed fixes: $failedFixes" -ForegroundColor $failedColor

if ($failedFixes -eq 0) {
    Write-Host "`n✅ ALL SCHEMA FIXES COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "`n🎯 NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "  1. Verify fixes with: .\migration_scripts\24_diagnose_schema_mismatch.ps1" -ForegroundColor White
    Write-Host "  2. Import data with: .\migration_scripts\23_import_fixed_counting.ps1" -ForegroundColor White
    Write-Host "  3. Verify data import success" -ForegroundColor White
}
else {
    Write-Host "`n⚠️ SOME FIXES FAILED" -ForegroundColor Yellow
    Write-Host "Review the error messages above and:" -ForegroundColor White
    Write-Host "  1. Fix any issues manually if needed" -ForegroundColor White
    Write-Host "  2. Re-run diagnosis: .\migration_scripts\24_diagnose_schema_mismatch.ps1" -ForegroundColor White
    Write-Host "  3. Re-run this fix script if needed" -ForegroundColor White
}

# Validate the fixes by running a quick check
Write-Host "`n🔍 Quick validation..." -ForegroundColor Yellow
$validationErrors = 0

foreach ($tableName in $diagnosisResults.PSObject.Properties.Name) {
    $tableResult = $diagnosisResults.$tableName
    
    if ($tableResult.missingColumns.Count -gt 0) {
        # Check if the missing columns now exist
        foreach ($missingCol in $tableResult.missingColumns) {
            try {
                $checkQuery = "SELECT column_name FROM information_schema.columns WHERE table_name = '$tableName' AND column_name = '$missingCol';"
                $result = & $psqlCmd @connectionArgs -t -c $checkQuery
                
                if ($result.Trim()) {
                    Write-Host "  ✅ Column '$tableName.$missingCol' now exists" -ForegroundColor Green
                }
                else {
                    Write-Host "  ❌ Column '$tableName.$missingCol' still missing" -ForegroundColor Red
                    $validationErrors++
                }
            }
            catch {
                Write-Host "  ⚠️ Could not validate '$tableName.$missingCol'" -ForegroundColor Yellow
                $validationErrors++
            }
        }
    }
}

if ($validationErrors -eq 0) {
    Write-Host "`n🎉 All schema fixes validated successfully!" -ForegroundColor Green
}
else {
    Write-Host "`n⚠️ $validationErrors validation issues found" -ForegroundColor Yellow
}

Write-Host "`n🎯 Schema fix process complete!" -ForegroundColor Green 
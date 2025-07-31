# =========================================================
# Verify SQL Exports - Check your exported files
# =========================================================

Write-Host "Kingston's Portal - Export Verification" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

$exportDir = "migration_scripts\migration_data"
$expectedTables = @(
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

Write-Host "`nChecking exported files..." -ForegroundColor Cyan

$foundFiles = @()
$missingFiles = @()
$emptyFiles = @()
$totalSize = 0

foreach ($table in $expectedTables) {
    $fileName = $table + "_rows.sql"
    $filePath = "$exportDir\$fileName"
    
    if (Test-Path $filePath) {
        $fileInfo = Get-Item $filePath
        $fileSize = $fileInfo.Length
        $totalSize += $fileSize
        
        $foundFiles += $table
        
        if ($fileSize -eq 0) {
            $emptyFiles += $table
            Write-Host "  WARNING: $fileName is empty" -ForegroundColor Yellow
        } elseif ($fileSize -lt 100) {
            $sizeText = "$fileSize bytes - Very small"
            Write-Host "  WARNING: $fileName ($sizeText)" -ForegroundColor Yellow
        } else {
            $sizeKB = [math]::Round($fileSize / 1KB, 2)
            $sizeText = "$sizeKB KB"
            Write-Host "  SUCCESS: $fileName ($sizeText)" -ForegroundColor Green
        }
    } else {
        $missingFiles += $table
        Write-Host "  MISSING: $fileName" -ForegroundColor Red
    }
}

# Summary
Write-Host "`nExport Summary:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "Total tables expected: $($expectedTables.Count)" -ForegroundColor White
Write-Host "Files found: $($foundFiles.Count)" -ForegroundColor Green
Write-Host "Files missing: $($missingFiles.Count)" -ForegroundColor Red
Write-Host "Empty files: $($emptyFiles.Count)" -ForegroundColor Yellow
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
Write-Host "Total size: $totalSizeMB MB" -ForegroundColor White

if ($missingFiles.Count -gt 0) {
    Write-Host "`nMissing Files:" -ForegroundColor Red
    foreach ($missing in $missingFiles) {
        Write-Host "   - $missing" -ForegroundColor Yellow
    }
}

if ($emptyFiles.Count -gt 0) {
    Write-Host "`nEmpty Files (may need re-export):" -ForegroundColor Yellow
    foreach ($empty in $emptyFiles) {
        Write-Host "   - $empty" -ForegroundColor Yellow
    }
}

# Check file contents (sample)
Write-Host "`nChecking file contents..." -ForegroundColor Cyan

$sampleFiles = @("profiles", "client_groups", "portfolios")
foreach ($table in $sampleFiles) {
    $fileName = $table + "_rows.sql"
    $filePath = "$exportDir\$fileName"
    
    if ((Test-Path $filePath) -and ((Get-Item $filePath).Length -gt 0)) {
        $firstLine = Get-Content $filePath -TotalCount 1
        if ($firstLine -like "*INSERT INTO*" -or $firstLine -like "*insert into*") {
            Write-Host "  SUCCESS: $fileName contains SQL INSERT statements" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: $fileName may not contain proper SQL format" -ForegroundColor Yellow
            Write-Host "     First line: $firstLine" -ForegroundColor Gray
        }
    }
}

# Final status
Write-Host "`nStatus:" -ForegroundColor Cyan
if ($foundFiles.Count -eq $expectedTables.Count -and $emptyFiles.Count -eq 0) {
    Write-Host "SUCCESS: All exports complete and ready for import!" -ForegroundColor Green
    Write-Host "`nNext step: Run the import script to load data into PostgreSQL" -ForegroundColor White
} elseif ($foundFiles.Count -eq $expectedTables.Count) {
    Write-Host "WARNING: All files present but some are empty - check those tables" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Export incomplete - missing files" -ForegroundColor Red
    Write-Host "Continue exporting the missing tables from Supabase Dashboard" -ForegroundColor White
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Export missing table: user_page_presence" -ForegroundColor White
Write-Host "2. Run this script again to verify" -ForegroundColor White
Write-Host "3. Once all files are ready, I'll create the import script" -ForegroundColor White
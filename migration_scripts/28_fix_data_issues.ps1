# Fix Data Issues Script
# This script fixes the data issues preventing import

Write-Host "Fixing data issues..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Fix available_funds ISIN duplicates and invalid characters
Write-Host "1. Fixing available_funds ISIN issues..." -ForegroundColor Yellow

$fundsFile = "migration_scripts\migration_data\available_funds_rows.sql"
$fundsContent = Get-Content $fundsFile -Raw

# Fix invalid ISIN characters (replace with unique values)
$fundsContent = $fundsContent -replace "????????????", "TEMP_ISIN_001"
$fundsContent = $fundsContent -replace "000000000000", "TEMP_ISIN_002"

# Fix ISIN duplicates by making them unique
$counter = 1
# Handle Royal London Sustainable World Trust duplicate
$fundsContent = $fundsContent -replace "GB00B882H241", { 
    param($match)
    $script:counter++
    if ($script:counter -eq 2) { "GB00B882H241" } else { "GB00B882H242" }
}

# Handle Vanguard Life Strategy 40% duplicate
$counter = 1
$fundsContent = $fundsContent -replace "GB00B3ZHN960", { 
    param($match)
    $script:counter++
    if ($script:counter -eq 2) { "GB00B3ZHN960" } else { "GB00B3ZHN961" }
}

# Handle Vanguard Life Strategy 80% duplicate
$counter = 1
$fundsContent = $fundsContent -replace "GB00B4PQW151", { 
    param($match)
    $script:counter++
    if ($script:counter -eq 2) { "GB00B4PQW151" } else { "GB00B4PQW152" }
}

# Handle Jupiter UK Mid Cap duplicate
$counter = 1
$fundsContent = $fundsContent -replace "GB00B1XG9482", { 
    param($match)
    $script:counter++
    if ($script:counter -eq 2) { "GB00B1XG9482" } else { "GB00B1XG9483" }
}

# Fix whitespace issues in ISINs (remove tabs and extra spaces)
$fundsContent = $fundsContent -replace "`t", ""
$fundsContent = $fundsContent -replace " GB00", "GB00"

# Save fixed funds file
$fundsContent | Out-File -FilePath "${fundsFile}.fixed" -Encoding UTF8
Write-Host "  Fixed available_funds saved as: ${fundsFile}.fixed" -ForegroundColor Green

# Fix client_products apostrophe issues
Write-Host "2. Fixing client_products apostrophe issues..." -ForegroundColor Yellow

$productsFile = "migration_scripts\migration_data\client_products_rows.sql"
$productsContent = Get-Content $productsFile -Raw

# Fix apostrophes by doubling them (SQL escape method)
$productsContent = $productsContent -replace "'([^']*)'s([^']*)'", "'\$1''s\$2'"
$productsContent = $productsContent -replace "Alan's", "Alan''s"
$productsContent = $productsContent -replace "Josie's", "Josie''s"
$productsContent = $productsContent -replace "Andrew's", "Andrew''s"
$productsContent = $productsContent -replace "Ros's", "Ros''s"

# Save fixed products file
$productsContent | Out-File -FilePath "${productsFile}.fixed" -Encoding UTF8
Write-Host "  Fixed client_products saved as: ${productsFile}.fixed" -ForegroundColor Green

# Replace original files with fixed versions
Write-Host "3. Replacing original files with fixed versions..." -ForegroundColor Yellow

Copy-Item "${fundsFile}.fixed" $fundsFile -Force
Copy-Item "${productsFile}.fixed" $productsFile -Force

Write-Host "  Original files updated" -ForegroundColor Green

# Clean up temporary files
Remove-Item "${fundsFile}.fixed" -Force
Remove-Item "${productsFile}.fixed" -Force

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Data fixes completed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. Re-run data import: .\migration_scripts\23_import_fixed_counting.ps1" -ForegroundColor White
Write-Host "  2. Verify all tables import successfully" -ForegroundColor White

Write-Host ""
Write-Host "Fix complete!" -ForegroundColor Green 
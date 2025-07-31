# Corrected Missing Products Analysis Script
# Fixed regex patterns to match the actual SQL format

Write-Host "Analyzing missing products (corrected)..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Read the client_products file to get existing product IDs
Write-Host "1. Reading existing product IDs from client_products..." -ForegroundColor Yellow
$productsFile = "migration_scripts\migration_data\client_products_rows.sql"
$productsContent = Get-Content $productsFile -Raw

# Extract product IDs from client_products - format: ('121', '27', ...)
$existingProductIds = @()
$productMatches = [regex]::Matches($productsContent, "\('(\d+)',")
foreach ($match in $productMatches) {
    $existingProductIds += [int]$match.Groups[1].Value
}

Write-Host "   Found $($existingProductIds.Count) existing products" -ForegroundColor Green
Write-Host "   Sample IDs: $($existingProductIds[0..4] -join ', ')..." -ForegroundColor Gray

# Read the holding_activity_log file to get referenced product IDs
Write-Host "2. Reading referenced product IDs from holding_activity_log..." -ForegroundColor Yellow
$activityFile = "migration_scripts\migration_data\holding_activity_log_rows.sql"
$activityContent = Get-Content $activityFile -Raw

# Extract product IDs from holding_activity_log - format: ('505', '105', '434', ...)
# The product_id is the second field after the id
$referencedProductIds = @()
$activityMatches = [regex]::Matches($activityContent, "\('\d+', '(\d+)',")
foreach ($match in $activityMatches) {
    $productId = [int]$match.Groups[1].Value
    if ($referencedProductIds -notcontains $productId) {
        $referencedProductIds += $productId
    }
}

Write-Host "   Found references to $($referencedProductIds.Count) unique products" -ForegroundColor Green
Write-Host "   Sample IDs: $($referencedProductIds[0..4] -join ', ')..." -ForegroundColor Gray

# Find missing products
$missingProducts = $referencedProductIds | Where-Object { $_ -notin $existingProductIds }
$missingProducts = $missingProducts | Sort-Object

Write-Host "3. Analysis Results:" -ForegroundColor White
Write-Host "   Existing products: $($existingProductIds.Count)" -ForegroundColor Green
Write-Host "   Referenced products: $($referencedProductIds.Count)" -ForegroundColor Yellow
if ($missingProducts.Count -gt 0) {
    Write-Host "   Missing products: $($missingProducts.Count)" -ForegroundColor Red
    Write-Host "   Missing IDs: $($missingProducts -join ', ')" -ForegroundColor Red
} else {
    Write-Host "   Missing products: 0 - All references valid!" -ForegroundColor Green
}

# Count how many activity log entries reference missing products
$missingActivityCount = 0
foreach ($missingId in $missingProducts) {
    $pattern = "\('\d+', '$missingId',"
    $matches = [regex]::Matches($activityContent, $pattern)
    $missingActivityCount += $matches.Count
    Write-Host "   Product ID $missingId has $($matches.Count) activity entries" -ForegroundColor Red
}

Write-Host "4. Impact Assessment:" -ForegroundColor White
Write-Host "   Total activity entries referencing missing products: $missingActivityCount" -ForegroundColor Red

# Save detailed results to file
$resultsFile = "migration_scripts\missing_products_detailed.txt"
@"
Missing Products Analysis Results (Corrected)
============================================
Date: $(Get-Date)

Existing Product IDs ($($existingProductIds.Count)):
$($existingProductIds | Sort-Object)

Referenced Product IDs ($($referencedProductIds.Count)):
$($referencedProductIds | Sort-Object)

Missing Product IDs ($($missingProducts.Count)):
$($missingProducts -join ', ')

Activity Entries Affected: $missingActivityCount

Next Steps:
1. Create the missing client_products entries
2. Retry the holding_activity_log import
3. Verify all data imports successfully
"@ | Out-File $resultsFile -Encoding UTF8

Write-Host "5. Results saved to: $resultsFile" -ForegroundColor Cyan 
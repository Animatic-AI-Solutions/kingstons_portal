# Analyze Missing Products Script
# This script analyzes the data files to find missing product references

Write-Host "Analyzing missing products..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Read the client_products file to get existing product IDs
Write-Host "1. Reading existing product IDs from client_products..." -ForegroundColor Yellow
$productsFile = "migration_scripts\migration_data\client_products_rows.sql"
$productsContent = Get-Content $productsFile -Raw

# Extract product IDs from client_products (looking for INSERT statements)
$existingProductIds = @()
$productMatches = [regex]::Matches($productsContent, "INSERT INTO public\.client_products.*?VALUES\s*\((\d+)")
foreach ($match in $productMatches) {
    $existingProductIds += [int]$match.Groups[1].Value
}

Write-Host "   Found $($existingProductIds.Count) existing products: $($existingProductIds -join ', ')" -ForegroundColor Green

# Read the holding_activity_log file to get referenced product IDs
Write-Host "2. Reading referenced product IDs from holding_activity_log..." -ForegroundColor Yellow
$activityFile = "migration_scripts\migration_data\holding_activity_log_rows.sql"
$activityContent = Get-Content $activityFile -Raw

# Extract product IDs from holding_activity_log (looking for product_id values)
$referencedProductIds = @()
$activityMatches = [regex]::Matches($activityContent, "VALUES\s*\([^,]+,\s*(\d+)")
foreach ($match in $activityMatches) {
    $productId = [int]$match.Groups[1].Value
    if ($referencedProductIds -notcontains $productId) {
        $referencedProductIds += $productId
    }
}

Write-Host "   Found references to $($referencedProductIds.Count) products: $($referencedProductIds -join ', ')" -ForegroundColor Green

# Find missing products
$missingProducts = $referencedProductIds | Where-Object { $_ -notin $existingProductIds }

Write-Host "3. Analysis Results:" -ForegroundColor White
Write-Host "   Existing products: $($existingProductIds.Count)" -ForegroundColor Green
Write-Host "   Referenced products: $($referencedProductIds.Count)" -ForegroundColor Yellow
if ($missingProducts.Count -gt 0) {
    Write-Host "   Missing products: $($missingProducts.Count) - IDs: $($missingProducts -join ', ')" -ForegroundColor Red
} else {
    Write-Host "   Missing products: 0 - All references valid!" -ForegroundColor Green
}

# Save results to file for further analysis
$resultsFile = "migration_scripts\missing_products_analysis.txt"
@"
Missing Products Analysis Results
================================
Date: $(Get-Date)

Existing Product IDs ($($existingProductIds.Count)):
$($existingProductIds -join ', ')

Referenced Product IDs ($($referencedProductIds.Count)):
$($referencedProductIds -join ', ')

Missing Product IDs ($($missingProducts.Count)):
$($missingProducts -join ', ')
"@ | Out-File $resultsFile -Encoding UTF8

Write-Host "4. Results saved to: $resultsFile" -ForegroundColor Cyan 
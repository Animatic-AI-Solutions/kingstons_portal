# Create Missing Products Script
# This script creates placeholder records for missing products referenced in holding_activity_log

Write-Host "Creating missing products..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Database connection settings
$env:PGPASSWORD = "KingstonApp2024!"
$psqlCmd = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$connectionArgs = @("-h", "localhost", "-p", "5432", "-U", "kingstons_app", "-d", "kingstons_portal")

# Missing product IDs and their details
$missingProducts = @(
    @{
        id = 98
        name = "[ARCHIVED] Missing Product 98"
        status = "inactive"
        notes = "Created as placeholder for historical activity data during migration"
    },
    @{
        id = 105
        name = "[ARCHIVED] Missing Product 105" 
        status = "inactive"
        notes = "Created as placeholder for historical activity data during migration"
    },
    @{
        id = 119
        name = "[ARCHIVED] Missing Product 119"
        status = "inactive"
        notes = "Created as placeholder for historical activity data during migration"
    }
)

Write-Host "Creating $($missingProducts.Count) missing products..." -ForegroundColor Yellow

$successCount = 0
$failCount = 0

foreach ($product in $missingProducts) {
    $sql = @"
INSERT INTO client_products (
    id, 
    client_id, 
    product_name, 
    status, 
    start_date, 
    created_at, 
    product_type,
    notes,
    fixed_cost,
    percentage_fee
) VALUES (
    $($product.id),
    1,  -- Default client_id (will be updated if needed)
    '$($product.name)',
    '$($product.status)',
    '2020-01-01',  -- Default start date
    CURRENT_TIMESTAMP,
    'Other',  -- Default product type
    '$($product.notes)',
    0.0,
    0.0
);
"@

    Write-Host "  Creating product ID $($product.id)..." -ForegroundColor Gray
    
    try {
        $result = & $psqlCmd @connectionArgs -c $sql 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    SUCCESS: Product $($product.id) created" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "    FAILED: Product $($product.id) - $result" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "    ERROR: Product $($product.id) - $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`nResults:" -ForegroundColor White
Write-Host "  Products created: $successCount" -ForegroundColor Green
Write-Host "  Failures: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

if ($successCount -eq $missingProducts.Count) {
    Write-Host "`nAll missing products created successfully!" -ForegroundColor Green
    Write-Host "Now you can retry the holding_activity_log import." -ForegroundColor Cyan
} else {
    Write-Host "`nSome products failed to create. Check the errors above." -ForegroundColor Red
} 
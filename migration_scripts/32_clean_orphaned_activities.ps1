# Clean Orphaned Activity Log Entries
# Remove activity entries that reference deleted products (98, 105, 119)

Write-Host "Cleaning orphaned activity log entries..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$activityFile = "migration_scripts\migration_data\holding_activity_log_rows.sql"
$backupFile = "migration_scripts\migration_data\holding_activity_log_rows_backup.sql"
$orphanedProducts = @(98, 105, 119)

# Create backup of original file
Write-Host "1. Creating backup of original file..." -ForegroundColor Yellow
Copy-Item $activityFile $backupFile -Force
Write-Host "   Backup created: $backupFile" -ForegroundColor Green

# Read the file content
Write-Host "2. Reading activity log file..." -ForegroundColor Yellow
$content = Get-Content $activityFile -Raw

# Count original entries
$originalMatches = [regex]::Matches($content, "\('\d+',")
Write-Host "   Original activity entries: $($originalMatches.Count)" -ForegroundColor Gray

# Remove entries for each orphaned product
$cleanedContent = $content
$totalRemoved = 0

foreach ($productId in $orphanedProducts) {
    Write-Host "3. Removing entries for product ID $productId..." -ForegroundColor Yellow
    
    # Pattern to match entire entry for this product_id
    # Format: ('entry_id', '105', 'portfolio_fund_id', 'date', 'type', 'amount', 'created_at'),
    $pattern = "\('\d+', '$productId', '[^']*', '[^']*', '[^']*', '[^']*', '[^']*'\),?\s*"
    
    $matches = [regex]::Matches($cleanedContent, $pattern)
    $removedCount = $matches.Count
    $totalRemoved += $removedCount
    
    # Remove the entries
    $cleanedContent = [regex]::Replace($cleanedContent, $pattern, "")
    
    Write-Host "   Removed $removedCount entries for product $productId" -ForegroundColor Red
}

# Clean up any trailing commas or extra spaces
$cleanedContent = $cleanedContent -replace ",\s*\);", ");"
$cleanedContent = $cleanedContent -replace ",\s*,", ","

# Count remaining entries
$finalMatches = [regex]::Matches($cleanedContent, "\('\d+',")
Write-Host "4. Cleanup Results:" -ForegroundColor White
Write-Host "   Original entries: $($originalMatches.Count)" -ForegroundColor Gray
Write-Host "   Removed entries: $totalRemoved" -ForegroundColor Red
Write-Host "   Remaining entries: $($finalMatches.Count)" -ForegroundColor Green
Write-Host "   Expected remaining: $($originalMatches.Count - $totalRemoved)" -ForegroundColor Gray

# Write cleaned content back to file
Write-Host "5. Writing cleaned file..." -ForegroundColor Yellow
$cleanedContent | Out-File $activityFile -Encoding UTF8 -NoNewline

Write-Host "6. Cleanup Complete!" -ForegroundColor Green
Write-Host "   Cleaned file: $activityFile" -ForegroundColor Cyan
Write-Host "   Backup saved: $backupFile" -ForegroundColor Cyan
Write-Host "   Ready to retry holding_activity_log import" -ForegroundColor Green 
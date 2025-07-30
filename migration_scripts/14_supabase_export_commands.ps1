# =========================================================
# Kingston's Portal - Supabase Data Export Script
# This script exports all data from Supabase using pg_dump
# =========================================================

# IMPORTANT: Replace [YOUR-PASSWORD] with your actual Supabase password
$SUPABASE_CONNECTION = "postgresql://postgres:[hiFGH#1874]@db.oixpqxxnhxtxwkeigjka.supabase.co:5432/postgres"

Write-Host "Kingston's Portal - Supabase Data Export" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Create export directory
$exportDir = "migration_data"
if (!(Test-Path $exportDir)) {
    New-Item -ItemType Directory -Path $exportDir
    Write-Host "Created export directory: $exportDir" -ForegroundColor Yellow
}

# Set timestamp for backup files
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "`nStep 1: Testing Supabase connection..." -ForegroundColor Cyan
# Test connection first
$env:PGPASSWORD = "[hiFGH#1874]"
$testResult = psql $SUPABASE_CONNECTION -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Connection successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Connection failed. Please check your password and connection string." -ForegroundColor Red
    Write-Host "Error: $testResult" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStep 2: Exporting complete database schema and data..." -ForegroundColor Cyan

# Export complete database (schema + data)
$fullExportFile = "$exportDir\kingston_portal_full_backup_$timestamp.sql"
Write-Host "Exporting to: $fullExportFile" -ForegroundColor Yellow

pg_dump $SUPABASE_CONNECTION `
    --schema=public `
    --data-only `
    --inserts `
    --column-inserts `
    --disable-triggers `
    --no-owner `
    --no-privileges `
    --file=$fullExportFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Full database export completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Full export failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 3: Exporting individual tables..." -ForegroundColor Cyan

# Define tables in dependency order (important for import)
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

# Export each table individually
foreach ($table in $tables) {
    Write-Host "Exporting table: $table" -ForegroundColor Yellow
    
    $tableFile = "$exportDir\$table" + "_data.sql"
    
    pg_dump $SUPABASE_CONNECTION `
        --schema=public `
        --data-only `
        --inserts `
        --column-inserts `
        --table=$table `
        --no-owner `
        --no-privileges `
        --file=$tableFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $tableFile).Length
        Write-Host "  ✅ $table exported ($fileSize bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $table export failed!" -ForegroundColor Red
    }
}

Write-Host "`nStep 4: Creating data verification report..." -ForegroundColor Cyan

# Get row counts from Supabase for verification
$verificationFile = "$exportDir\data_verification_$timestamp.txt"
"Kingston's Portal - Data Export Verification Report" | Out-File $verificationFile
"Generated: $(Get-Date)" | Out-File $verificationFile -Append
"=" * 50 | Out-File $verificationFile -Append
"" | Out-File $verificationFile -Append

foreach ($table in $tables) {
    Write-Host "Counting rows in: $table" -ForegroundColor Yellow
    
    $countQuery = "SELECT COUNT(*) FROM $table;"
    $rowCount = psql $SUPABASE_CONNECTION -t -c $countQuery 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $cleanCount = $rowCount.Trim()
        "$table : $cleanCount rows" | Out-File $verificationFile -Append
        Write-Host "  $table : $cleanCount rows" -ForegroundColor Green
    } else {
        "$table : ERROR - Could not count rows" | Out-File $verificationFile -Append
        Write-Host "  $table : ERROR" -ForegroundColor Red
    }
}

Write-Host "`nStep 5: Export Summary" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

$exportFiles = Get-ChildItem $exportDir -Filter "*.sql"
Write-Host "Files created:" -ForegroundColor Yellow
foreach ($file in $exportFiles) {
    $size = [math]::Round($file.Length / 1KB, 2)
    Write-Host "  $($file.Name) ($size KB)" -ForegroundColor White
}

Write-Host "`nVerification report: $verificationFile" -ForegroundColor Yellow

# Clean up environment variable
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "`n🎉 Export completed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Review the verification report to check row counts" -ForegroundColor White
Write-Host "2. Check that all table files were created successfully" -ForegroundColor White
Write-Host "3. Ready to import data into local PostgreSQL!" -ForegroundColor White

Write-Host "`nImportant files created:" -ForegroundColor Cyan
Write-Host "- $fullExportFile (complete backup)" -ForegroundColor White
Write-Host "- Individual table files in $exportDir\" -ForegroundColor White
Write-Host "- $verificationFile (row counts)" -ForegroundColor White
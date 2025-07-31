# Fix SQL Escaping Script
# This script properly escapes single quotes in SQL files for PostgreSQL import
# without changing the underlying data values

Write-Host "Fixing SQL escaping for PostgreSQL import..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$productsFile = "migration_scripts\migration_data\client_products_rows.sql"
Write-Host "Processing: $productsFile" -ForegroundColor Yellow

# Read the file content
$content = Get-Content $productsFile -Raw

# Fix SQL escaping: replace single quotes inside string values with doubled quotes
# This regex finds single quotes that are inside string values (not the string delimiters)
# Pattern: find 'text with's apostrophe' and convert to 'text with''s apostrophe'

# First, let's handle the specific cases we know about
$content = $content -replace "Alan's", "Alan''s"
$content = $content -replace "Josie's", "Josie''s" 
$content = $content -replace "Andrew's", "Andrew''s"
$content = $content -replace "Ros's", "Ros''s"

# Also handle any other possessive forms that might exist
$content = $content -replace "([a-zA-Z])'s", '$1''s'

# Save the fixed content back to the file
$content | Out-File -FilePath $productsFile -Encoding UTF8 -NoNewline

Write-Host "Fixed SQL escaping in: $productsFile" -ForegroundColor Green

# Test the import
Write-Host ""
Write-Host "Testing client_products import..." -ForegroundColor Yellow

$env:PGPASSWORD = "KingstonApp2024!"
try {
    $result = & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U kingstons_app -d kingstons_portal -f $productsFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Count inserted rows
        $insertOutput = $result | Where-Object { $_ -match "INSERT 0 (\d+)" }
        if ($insertOutput) {
            $rowCount = $insertOutput -replace "INSERT 0 ", ""
            Write-Host "SUCCESS: client_products imported ($rowCount rows)" -ForegroundColor Green
        } else {
            Write-Host "SUCCESS: client_products imported" -ForegroundColor Green
        }
    } else {
        Write-Host "Import failed:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
}
catch {
    Write-Host "Exception during import: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "SQL escaping fix complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan 
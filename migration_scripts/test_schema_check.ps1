# Simple test script to check one table's schema
Write-Host "Testing schema for template_portfolio_generations..." -ForegroundColor Cyan

# Database connection settings
$env:PGPASSWORD = "KingstonApp2024!"
$psqlCmd = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$connectionArgs = @("-h", "localhost", "-p", "5432", "-U", "kingstons_app", "-d", "kingstons_portal")

# Get local table structure
Write-Host "Getting local table columns..." -ForegroundColor Yellow
$columnQuery = "SELECT column_name FROM information_schema.columns WHERE table_name = 'template_portfolio_generations' ORDER BY ordinal_position;"
$localResult = & $psqlCmd @connectionArgs -t -c $columnQuery

Write-Host "Local columns found:" -ForegroundColor Green
$localResult | ForEach-Object { Write-Host "  - $($_.Trim())" -ForegroundColor White }

# Check migration file
$migrationFile = "migration_scripts\migration_data\template_portfolio_generations_rows.sql"
if (Test-Path $migrationFile) {
    Write-Host "`nChecking migration file..." -ForegroundColor Yellow
    $firstLine = Get-Content $migrationFile -TotalCount 1
    Write-Host "First line of migration file:" -ForegroundColor Green
    Write-Host $firstLine -ForegroundColor White
    
    if ($firstLine -match "INSERT INTO.*?\((.*?)\)\s+VALUES") {
        $columnString = $matches[1]
        $expectedColumns = $columnString -split ',' | ForEach-Object { $_.Trim().Trim('"') }
        Write-Host "`nExpected columns from migration file:" -ForegroundColor Green
        $expectedColumns | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
        
        # Compare
        $localColumnNames = $localResult | ForEach-Object { $_.Trim() }
        $missingColumns = $expectedColumns | Where-Object { $_ -notin $localColumnNames }
        
        if ($missingColumns.Count -gt 0) {
            Write-Host "`n❌ Missing columns in local table:" -ForegroundColor Red
            $missingColumns | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
        } else {
            Write-Host "`n✅ All columns match!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Migration file not found: $migrationFile" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Cyan 
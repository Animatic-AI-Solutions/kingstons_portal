# Check PostgreSQL Service Status and Connection
# Run this script to verify PostgreSQL is working before testing DBeaver

Write-Host "Checking PostgreSQL Service Status..." -ForegroundColor Green

# Check if PostgreSQL service is running
$service = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "PostgreSQL Service Found: $($service.Name)" -ForegroundColor Cyan
    Write-Host "Status: $($service.Status)" -ForegroundColor $(if($service.Status -eq 'Running') {'Green'} else {'Red'})
    
    if ($service.Status -ne 'Running') {
        Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
        Start-Service $service.Name
        Start-Sleep -Seconds 5
        $service.Refresh()
        Write-Host "New Status: $($service.Status)" -ForegroundColor $(if($service.Status -eq 'Running') {'Green'} else {'Red'})
    }
} else {
    Write-Host "No PostgreSQL service found. Please install PostgreSQL first." -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is listening on port 5432
Write-Host "`nChecking if PostgreSQL is listening on port 5432..." -ForegroundColor Green
$portCheck = netstat -an | findstr ":5432"
if ($portCheck) {
    Write-Host "✅ PostgreSQL is listening on port 5432" -ForegroundColor Green
    Write-Host $portCheck -ForegroundColor Cyan
} else {
    Write-Host "❌ PostgreSQL is not listening on port 5432" -ForegroundColor Red
    Write-Host "This could indicate a configuration issue." -ForegroundColor Yellow
}

# Test database connection using psql
Write-Host "`nTesting database connection..." -ForegroundColor Green
$env:PGPASSWORD = "KingstonApp2024!"

try {
    # Test connection to the database
    $result = psql -h localhost -U kingstons_app -d kingstons_portal -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful!" -ForegroundColor Green
        Write-Host "PostgreSQL Version:" -ForegroundColor Cyan
        Write-Host $result -ForegroundColor White
    } else {
        Write-Host "❌ Database connection failed!" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Yellow
        
        # Check if database exists
        Write-Host "`nChecking if database exists..." -ForegroundColor Yellow
        $dbCheck = psql -h localhost -U postgres -c "\l" 2>&1 | findstr "kingstons_portal"
        
        if ($dbCheck) {
            Write-Host "✅ Database 'kingstons_portal' exists" -ForegroundColor Green
        } else {
            Write-Host "❌ Database 'kingstons_portal' does not exist" -ForegroundColor Red
            Write-Host "Please run the PostgreSQL installation script first." -ForegroundColor Yellow
        }
        
        # Check if user exists
        Write-Host "Checking if user exists..." -ForegroundColor Yellow
        $env:PGPASSWORD = "KingstonPortal2024!"
        $userCheck = psql -h localhost -U postgres -c "\du" 2>&1 | findstr "kingstons_app"
        
        if ($userCheck) {
            Write-Host "✅ User 'kingstons_app' exists" -ForegroundColor Green
        } else {
            Write-Host "❌ User 'kingstons_app' does not exist" -ForegroundColor Red
            Write-Host "Please run the PostgreSQL installation script first." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Error testing connection: $($_.Exception.Message)" -ForegroundColor Red
}

# Clear password from environment
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "`n" -NoNewline
Write-Host "Summary:" -ForegroundColor Green
Write-Host "1. If PostgreSQL service is running and port 5432 is listening," -ForegroundColor White
Write-Host "   then DBeaver should be able to connect." -ForegroundColor White
Write-Host "2. If database connection test passed, your setup is correct." -ForegroundColor White
Write-Host "3. If there are errors, please run the PostgreSQL installation script first." -ForegroundColor White
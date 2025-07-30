# Create Database and User for Kingston's Portal
# Run this if PostgreSQL is already installed but database/user don't exist

Write-Host "Setting up Kingston's Portal database and user..." -ForegroundColor Green

# Function to test postgres connection with different passwords
function Test-PostgresConnection {
    param([string]$password)
    
    $env:PGPASSWORD = $password
    $result = psql -U postgres -h localhost -c "SELECT version();" 2>&1
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
    return $LASTEXITCODE -eq 0
}

# Try common postgres passwords
$commonPasswords = @("", "postgres", "admin", "password", "root")
$postgresPassword = $null

Write-Host "Trying to connect as postgres user..." -ForegroundColor Yellow

foreach ($pwd in $commonPasswords) {
    Write-Host "Trying password: $(if($pwd -eq '') {'(blank)'} else {'***'})" -ForegroundColor Cyan
    
    if (Test-PostgresConnection -password $pwd) {
        $postgresPassword = $pwd
        Write-Host "✅ Connected successfully!" -ForegroundColor Green
        break
    }
}

if ($null -eq $postgresPassword) {
    Write-Host "❌ Could not connect with common passwords." -ForegroundColor Red
    $customPassword = Read-Host "Please enter the postgres user password"
    
    if (Test-PostgresConnection -password $customPassword) {
        $postgresPassword = $customPassword
        Write-Host "✅ Connected with custom password!" -ForegroundColor Green
    } else {
        Write-Host "❌ Authentication failed. Please check your postgres password." -ForegroundColor Red
        exit 1
    }
}

# Now create the database and user
Write-Host "`nCreating database and user..." -ForegroundColor Green
$env:PGPASSWORD = $postgresPassword

$sqlCommands = @"
-- Create database
CREATE DATABASE kingstons_portal;

-- Create user
CREATE USER kingstons_app WITH ENCRYPTED PASSWORD 'KingstonApp2024!';

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE kingstons_portal TO kingstons_app;
"@

# Execute the SQL commands
$sqlCommands | psql -U postgres -h localhost

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database and user created successfully!" -ForegroundColor Green
    
    # Grant schema privileges
    Write-Host "Setting up schema privileges..." -ForegroundColor Yellow
    $schemaCommands = @"
GRANT ALL ON SCHEMA public TO kingstons_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kingstons_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kingstons_app;
"@
    
    $schemaCommands | psql -U postgres -h localhost -d kingstons_portal
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Schema privileges set successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Failed to create database and user." -ForegroundColor Red
    Write-Host "The database or user might already exist." -ForegroundColor Yellow
}

# Test the new connection
Write-Host "`nTesting kingstons_app user connection..." -ForegroundColor Green
$env:PGPASSWORD = "KingstonApp2024!"
$testResult = psql -U kingstons_app -h localhost -d kingstons_portal -c "SELECT current_user, current_database();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ kingstons_app user can connect successfully!" -ForegroundColor Green
    Write-Host "Result: $testResult" -ForegroundColor Cyan
    Write-Host "`n🎉 Setup complete! You can now connect DBeaver with:" -ForegroundColor Green
    Write-Host "   Host: localhost" -ForegroundColor White
    Write-Host "   Port: 5432" -ForegroundColor White
    Write-Host "   Database: kingstons_portal" -ForegroundColor White
    Write-Host "   Username: kingstons_app" -ForegroundColor White
    Write-Host "   Password: KingstonApp2024!" -ForegroundColor White
} else {
    Write-Host "❌ kingstons_app user connection failed." -ForegroundColor Red
    Write-Host "Error: $testResult" -ForegroundColor Yellow
}

# Clean up environment
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
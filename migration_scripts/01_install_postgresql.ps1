# PostgreSQL Installation Script for Kingston's Portal Migration
# Run as Administrator

Write-Host "Installing PostgreSQL 15 for Kingston's Portal..." -ForegroundColor Green

# Download PostgreSQL installer
$postgresUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.5-1-windows-x64.exe"
$installerPath = "$env:TEMP\postgresql-installer.exe"

Write-Host "Downloading PostgreSQL installer..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $postgresUrl -OutFile $installerPath

# Install PostgreSQL silently
Write-Host "Installing PostgreSQL (this may take several minutes)..." -ForegroundColor Yellow
$installArgs = @(
    "--mode", "unattended",
    "--unattendedmodeui", "none",
    "--superpassword", "KingstonPortal2024!",
    "--servicename", "postgresql-kingston",
    "--servicepassword", "KingstonPortal2024!",
    "--serverport", "5432",
    "--locale", "English, United States",
    "--datadir", "C:\PostgreSQL\15\data",
    "--install_runtimes", "0"
)

Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -NoNewWindow

# Add PostgreSQL to PATH
$postgresPath = "C:\Program Files\PostgreSQL\15\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
if ($currentPath -notlike "*$postgresPath*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$postgresPath", "Machine")
    Write-Host "Added PostgreSQL to system PATH" -ForegroundColor Green
}

# Configure Windows Firewall
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "PostgreSQL Kingston Portal" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow

# Create application database and user
Write-Host "Creating database and user..." -ForegroundColor Yellow
$env:PGPASSWORD = "KingstonPortal2024!"

# Wait for PostgreSQL service to start
Start-Sleep -Seconds 30

# Create database and user
psql -U postgres -c "CREATE DATABASE kingstons_portal;"
psql -U postgres -c "CREATE USER kingstons_app WITH ENCRYPTED PASSWORD 'KingstonApp2024!';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kingstons_portal TO kingstons_app;"
psql -U postgres -d kingstons_portal -c "GRANT ALL ON SCHEMA public TO kingstons_app;"
psql -U postgres -d kingstons_portal -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kingstons_app;"
psql -U postgres -d kingstons_portal -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kingstons_app;"

Write-Host "PostgreSQL installation completed successfully!" -ForegroundColor Green
Write-Host "Database: kingstons_portal" -ForegroundColor Cyan
Write-Host "User: kingstons_app" -ForegroundColor Cyan
Write-Host "Port: 5432" -ForegroundColor Cyan

# Clean up installer
Remove-Item $installerPath -Force

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install DBeaver and connect to the database" -ForegroundColor White
Write-Host "2. Configure postgresql.conf for optimal performance" -ForegroundColor White
Write-Host "3. Set up automated backups" -ForegroundColor White 
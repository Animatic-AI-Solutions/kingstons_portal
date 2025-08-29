@echo off
REM ============================================================================
REM KINGSTON'S PORTAL - DAILY DATABASE BACKUP SCRIPT
REM ============================================================================
REM This script should be placed and run on the database server (192.168.0.223)
REM Requires PostgreSQL pg_dump to be installed and accessible
REM ============================================================================

setlocal EnableDelayedExpansion

REM Configuration
set DB_NAME=kingstons_portal
set DB_USER=kingstons_app
set DB_HOST=localhost
set DB_PORT=5432
set BACKUP_BASE_DIR=C:\Database_Backups\KingstonsPortal

REM Create backup directories if they don't exist
if not exist "%BACKUP_BASE_DIR%" mkdir "%BACKUP_BASE_DIR%"
if not exist "%BACKUP_BASE_DIR%\Daily" mkdir "%BACKUP_BASE_DIR%\Daily"
if not exist "%BACKUP_BASE_DIR%\Weekly" mkdir "%BACKUP_BASE_DIR%\Weekly"
if not exist "%BACKUP_BASE_DIR%\Monthly" mkdir "%BACKUP_BASE_DIR%\Monthly"

REM Get current date and time for filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

REM Create backup filename
set BACKUP_FILE=%BACKUP_BASE_DIR%\Daily\kingstons_portal_daily_%timestamp%.sql

echo ============================================================================
echo KINGSTON'S PORTAL DATABASE BACKUP
echo ============================================================================
echo Starting backup at: %date% %time%
echo Database: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo Backup file: %BACKUP_FILE%
echo ============================================================================

REM Set PostgreSQL password (WARNING: This exposes password in process list)
REM For production, consider using .pgpass file instead
set PGPASSWORD=KingstonApp2024!

REM Create the backup
echo Creating database backup...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --verbose --clean --create --if-exists --format=plain --file="%BACKUP_FILE%"

REM Check if backup was successful
if %ERRORLEVEL% EQU 0 (
    echo ============================================================================
    echo BACKUP COMPLETED SUCCESSFULLY!
    echo ============================================================================
    
    REM Get file size
    for %%A in ("%BACKUP_FILE%") do set BACKUP_SIZE=%%~zA
    set /A BACKUP_SIZE_MB=!BACKUP_SIZE!/1024/1024
    echo Backup file size: !BACKUP_SIZE_MB! MB
    
    REM Log success
    echo %date% %time% - Daily backup completed successfully. Size: !BACKUP_SIZE_MB! MB >> "%BACKUP_BASE_DIR%\backup_log.txt"
    
    REM Cleanup old daily backups (keep last 7 days)
    echo Cleaning up old daily backups (keeping last 7)...
    forfiles /p "%BACKUP_BASE_DIR%\Daily" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul
    
) else (
    echo ============================================================================
    echo BACKUP FAILED! Error code: %ERRORLEVEL%
    echo ============================================================================
    
    REM Log failure
    echo %date% %time% - Daily backup FAILED with error code %ERRORLEVEL% >> "%BACKUP_BASE_DIR%\backup_log.txt"
    
    REM Send alert (you can customize this)
    echo ALERT: Database backup failed! Please check the system immediately.
)

REM Clear password from environment
set PGPASSWORD=

echo ============================================================================
echo Backup process completed at: %date% %time%
echo ============================================================================

REM Keep window open if run manually
if /I "%1" NEQ "silent" pause
@echo off
REM ============================================================================
REM KINGSTON'S PORTAL - WEEKLY DATABASE BACKUP SCRIPT
REM ============================================================================
REM This script should be placed and run on the database server (192.168.0.223)
REM Creates compressed weekly backups and maintains monthly archives
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
if not exist "%BACKUP_BASE_DIR%\Weekly" mkdir "%BACKUP_BASE_DIR%\Weekly"
if not exist "%BACKUP_BASE_DIR%\Monthly" mkdir "%BACKUP_BASE_DIR%\Monthly"

REM Get current date for filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "timestamp=%YYYY%-%MM%-%DD%"

REM Create backup filename
set BACKUP_FILE=%BACKUP_BASE_DIR%\Weekly\kingstons_portal_weekly_%timestamp%.backup

echo ============================================================================
echo KINGSTON'S PORTAL WEEKLY DATABASE BACKUP
echo ============================================================================
echo Starting weekly backup at: %date% %time%
echo Database: %DB_NAME%
echo Backup file: %BACKUP_FILE%
echo ============================================================================

REM Set PostgreSQL password
set PGPASSWORD=KingstonApp2024!

REM Create compressed backup using custom format (better for large databases)
echo Creating compressed weekly backup...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --verbose --format=custom --compress=9 --file="%BACKUP_FILE%"

REM Check if backup was successful
if %ERRORLEVEL% EQU 0 (
    echo ============================================================================
    echo WEEKLY BACKUP COMPLETED SUCCESSFULLY!
    echo ============================================================================
    
    REM Get file size
    for %%A in ("%BACKUP_FILE%") do set BACKUP_SIZE=%%~zA
    set /A BACKUP_SIZE_MB=!BACKUP_SIZE!/1024/1024
    echo Backup file size: !BACKUP_SIZE_MB! MB
    
    REM Log success
    echo %date% %time% - Weekly backup completed successfully. Size: !BACKUP_SIZE_MB! MB >> "%BACKUP_BASE_DIR%\backup_log.txt"
    
    REM Check if this is the first week of the month (create monthly backup)
    for /f "tokens=1-3 delims=/" %%a in ('echo %date%') do (
        set day=%%b
    )
    
    REM If day is between 1-7, copy to monthly folder
    if !day! LEQ 7 (
        echo Creating monthly archive copy...
        set MONTHLY_FILE=%BACKUP_BASE_DIR%\Monthly\kingstons_portal_monthly_%YYYY%-%MM%.backup
        copy "%BACKUP_FILE%" "!MONTHLY_FILE!"
        echo Monthly backup created: !MONTHLY_FILE!
        echo %date% %time% - Monthly backup created from weekly backup >> "%BACKUP_BASE_DIR%\backup_log.txt"
    )
    
    REM Cleanup old weekly backups (keep last 4 weeks)
    echo Cleaning up old weekly backups (keeping last 4 weeks)...
    forfiles /p "%BACKUP_BASE_DIR%\Weekly" /s /m *.backup /d -28 /c "cmd /c del @path" 2>nul
    
    REM Cleanup old monthly backups (keep last 12 months)
    echo Cleaning up old monthly backups (keeping last 12 months)...
    forfiles /p "%BACKUP_BASE_DIR%\Monthly" /s /m *.backup /d -365 /c "cmd /c del @path" 2>nul
    
) else (
    echo ============================================================================
    echo WEEKLY BACKUP FAILED! Error code: %ERRORLEVEL%
    echo ============================================================================
    
    REM Log failure
    echo %date% %time% - Weekly backup FAILED with error code %ERRORLEVEL% >> "%BACKUP_BASE_DIR%\backup_log.txt"
    
    REM Send alert
    echo CRITICAL ALERT: Weekly database backup failed! Immediate attention required.
)

REM Clear password from environment
set PGPASSWORD=

echo ============================================================================
echo Weekly backup process completed at: %date% %time%
echo ============================================================================

if /I "%1" NEQ "silent" pause
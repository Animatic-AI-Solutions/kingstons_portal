@echo off
REM ============================================================================
REM KINGSTON'S PORTAL - DATABASE RESTORE SCRIPT
REM ============================================================================
REM This script restores a database backup on the server (192.168.0.223)
REM Usage: database_restore.bat [backup_file_path]
REM ============================================================================

setlocal EnableDelayedExpansion

REM Configuration
set DB_NAME=kingstons_portal
set DB_USER=kingstons_app
set DB_HOST=localhost
set DB_PORT=5432
set BACKUP_BASE_DIR=C:\Database_Backups\KingstonsPortal

echo ============================================================================
echo KINGSTON'S PORTAL DATABASE RESTORE UTILITY
echo ============================================================================
echo WARNING: This will COMPLETELY REPLACE the existing database!
echo ============================================================================

REM Check if backup file was provided as parameter
if "%1"=="" (
    echo Error: No backup file specified!
    echo.
    echo Usage: %0 [backup_file_path]
    echo.
    echo Available backups:
    echo.
    echo DAILY BACKUPS:
    if exist "%BACKUP_BASE_DIR%\Daily\*.sql" (
        dir /b /o-d "%BACKUP_BASE_DIR%\Daily\*.sql" 2>nul | head -n 5
    ) else (
        echo   No daily backups found
    )
    echo.
    echo WEEKLY BACKUPS:
    if exist "%BACKUP_BASE_DIR%\Weekly\*.backup" (
        dir /b /o-d "%BACKUP_BASE_DIR%\Weekly\*.backup" 2>nul | head -n 5
    ) else (
        echo   No weekly backups found
    )
    echo.
    echo MONTHLY BACKUPS:
    if exist "%BACKUP_BASE_DIR%\Monthly\*.backup" (
        dir /b /o-d "%BACKUP_BASE_DIR%\Monthly\*.backup" 2>nul
    ) else (
        echo   No monthly backups found
    )
    echo.
    pause
    exit /b 1
)

set BACKUP_FILE=%1

REM Check if backup file exists
if not exist "%BACKUP_FILE%" (
    echo Error: Backup file not found: %BACKUP_FILE%
    pause
    exit /b 1
)

REM Get file extension to determine restore method
for %%i in ("%BACKUP_FILE%") do set FILE_EXT=%%~xi

echo Selected backup file: %BACKUP_FILE%
echo File extension: %FILE_EXT%
echo.

REM Confirm restore operation
echo ============================================================================
echo FINAL WARNING: This will PERMANENTLY DELETE the current database
echo and restore from backup: %BACKUP_FILE%
echo ============================================================================
echo.
set /p CONFIRM="Type 'YES' to proceed with restore (anything else cancels): "

if /I not "%CONFIRM%"=="YES" (
    echo Restore operation cancelled by user.
    pause
    exit /b 0
)

echo ============================================================================
echo STARTING DATABASE RESTORE
echo ============================================================================
echo Restore started at: %date% %time%

REM Set PostgreSQL password
set PGPASSWORD=KingstonApp2024!

REM Create backup before restore (safety measure)
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"
set SAFETY_BACKUP=%BACKUP_BASE_DIR%\pre_restore_backup_%timestamp%.sql

echo Creating safety backup before restore...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --format=plain --file="%SAFETY_BACKUP%" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Safety backup created: %SAFETY_BACKUP%
) else (
    echo Warning: Could not create safety backup. Continuing with restore...
)

REM Drop existing connections to database
echo Terminating existing database connections...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '%DB_NAME%' AND pid <> pg_backend_pid();" 2>nul

REM Determine restore method based on file extension
if /I "%FILE_EXT%"==".sql" (
    echo Restoring from SQL dump file...
    
    REM Drop and recreate database
    dropdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% 2>nul
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
    
    REM Restore from SQL file
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_FILE%"
    
) else if /I "%FILE_EXT%"==".backup" (
    echo Restoring from custom format backup...
    
    REM Drop and recreate database
    dropdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% 2>nul
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
    
    REM Restore from custom format
    pg_restore -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --verbose "%BACKUP_FILE%"
    
) else (
    echo Error: Unsupported backup file format: %FILE_EXT%
    echo Supported formats: .sql (plain text) or .backup (custom format)
    set PGPASSWORD=
    pause
    exit /b 1
)

REM Check restore result
if %ERRORLEVEL% EQU 0 (
    echo ============================================================================
    echo DATABASE RESTORE COMPLETED SUCCESSFULLY!
    echo ============================================================================
    echo Restored from: %BACKUP_FILE%
    echo Safety backup: %SAFETY_BACKUP%
    echo Completed at: %date% %time%
    
    REM Log successful restore
    echo %date% %time% - Database restored successfully from %BACKUP_FILE% >> "%BACKUP_BASE_DIR%\restore_log.txt"
    
    echo.
    echo IMPORTANT: Please verify the application is working correctly!
    
) else (
    echo ============================================================================
    echo DATABASE RESTORE FAILED! Error code: %ERRORLEVEL%
    echo ============================================================================
    echo.
    echo If you need to recover, you can try restoring from the safety backup:
    echo %SAFETY_BACKUP%
    
    REM Log failed restore
    echo %date% %time% - Database restore FAILED from %BACKUP_FILE% with error %ERRORLEVEL% >> "%BACKUP_BASE_DIR%\restore_log.txt"
)

REM Clear password from environment
set PGPASSWORD=

echo ============================================================================
pause
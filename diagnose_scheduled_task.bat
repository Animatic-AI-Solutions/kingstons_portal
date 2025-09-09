@echo off
REM ============================================================================
REM DIAGNOSTIC SCRIPT FOR SCHEDULED TASK ENVIRONMENT
REM ============================================================================
REM This script will run from the scheduler to diagnose environment issues

setlocal EnableDelayedExpansion

echo ============================================================================
echo SCHEDULED TASK ENVIRONMENT DIAGNOSTIC
echo ============================================================================
echo Current time: %date% %time%
echo Current user: %USERNAME%
echo Current directory: %CD%
echo Script location: %~dp0
echo ============================================================================

REM Log file for diagnostics
set LOG_FILE=%~dp0scheduled_task_diagnostic.log
echo %date% %time% - Starting diagnostic >> "%LOG_FILE%"

echo ENVIRONMENT VARIABLES:
echo USERNAME: %USERNAME% >> "%LOG_FILE%"
echo USERPROFILE: %USERPROFILE% >> "%LOG_FILE%"
echo PATH: %PATH% >> "%LOG_FILE%"
echo APPDATA: %APPDATA% >> "%LOG_FILE%"
echo PROGRAMFILES: %PROGRAMFILES% >> "%LOG_FILE%"

echo ============================================================================
echo 1. CHECKING POSTGRESQL TOOLS
echo ============================================================================

REM Check if pg_dump is in PATH
pg_dump --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ pg_dump found in PATH
    pg_dump --version >> "%LOG_FILE%"
) else (
    echo ✗ pg_dump NOT found in PATH
    echo FAILED: pg_dump not found >> "%LOG_FILE%"
    
    REM Try common PostgreSQL installation paths
    set PG_PATHS=C:\Program Files\PostgreSQL\17\bin;C:\Program Files\PostgreSQL\16\bin;C:\Program Files\PostgreSQL\15\bin;C:\PostgreSQL\bin
    
    echo Searching common PostgreSQL paths...
    for %%P in (%PG_PATHS%) do (
        if exist "%%P\pg_dump.exe" (
            echo Found pg_dump at: %%P
            echo Found pg_dump at: %%P >> "%LOG_FILE%"
            set PG_BIN_PATH=%%P
        )
    )
)

echo ============================================================================
echo 2. CHECKING .ENV FILE
echo ============================================================================

if exist "%~dp0.env" (
    echo ✓ .env file found
    echo .env file found >> "%LOG_FILE%"
    
    REM Load password from .env
    for /f "usebackq tokens=1,2 delims==" %%a in ("%~dp0.env") do (
        if "%%a"=="PGPASSWORD" (
            set PGPASSWORD=%%b
            echo ✓ PGPASSWORD loaded from .env
            echo PGPASSWORD loaded from .env >> "%LOG_FILE%"
        )
        if "%%a"=="DATABASE_URL" (
            echo ✓ DATABASE_URL found
            echo DATABASE_URL found >> "%LOG_FILE%"
        )
    )
) else (
    echo ✗ .env file NOT found at: %~dp0.env
    echo .env file NOT found >> "%LOG_FILE%"
)

echo ============================================================================
echo 3. CHECKING .PGPASS FILE
echo ============================================================================

REM Check for .pgpass in various locations
if exist "%USERPROFILE%\.pgpass" (
    echo ✓ .pgpass found in user profile
    echo .pgpass found in USERPROFILE >> "%LOG_FILE%"
) else if exist "%APPDATA%\.pgpass" (
    echo ✓ .pgpass found in APPDATA
    echo .pgpass found in APPDATA >> "%LOG_FILE%"
) else (
    echo ✗ .pgpass file NOT found
    echo .pgpass NOT found >> "%LOG_FILE%"
)

echo ============================================================================
echo 4. TESTING DATABASE CONNECTION
echo ============================================================================

REM Test database connection
if defined PGPASSWORD (
    echo Testing connection with password from .env...
    psql -h localhost -p 5432 -U kingstons_app -d kingstons_portal -c "SELECT 'CONNECTION_TEST_SUCCESS' as result;" >nul 2>&1
    
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Database connection SUCCESSFUL
        echo Database connection SUCCESSFUL >> "%LOG_FILE%"
    ) else (
        echo ✗ Database connection FAILED (error code: %ERRORLEVEL%)
        echo Database connection FAILED (error code: %ERRORLEVEL%) >> "%LOG_FILE%"
        
        REM Try to get more detailed error
        psql -h localhost -p 5432 -U kingstons_app -d kingstons_portal -c "SELECT 1;" 2>> "%LOG_FILE%"
    )
) else (
    echo ✗ No password available for testing
    echo No password available for testing >> "%LOG_FILE%"
)

echo ============================================================================
echo 5. CHECKING BACKUP DIRECTORIES
echo ============================================================================

set BACKUP_DIR=C:\Database_Backups\KingstonsPortal
if not exist "%BACKUP_DIR%" (
    echo Creating backup directory: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%" 2>nul
    mkdir "%BACKUP_DIR%\Daily" 2>nul
    mkdir "%BACKUP_DIR%\Weekly" 2>nul
    mkdir "%BACKUP_DIR%\Monthly" 2>nul
)

if exist "%BACKUP_DIR%" (
    echo ✓ Backup directory exists: %BACKUP_DIR%
    echo Backup directory exists >> "%LOG_FILE%"
) else (
    echo ✗ Cannot create backup directory
    echo Cannot create backup directory >> "%LOG_FILE%"
)

REM Clear password
set PGPASSWORD=

echo ============================================================================
echo DIAGNOSTIC COMPLETED
echo ============================================================================
echo Results logged to: %LOG_FILE%
echo %date% %time% - Diagnostic completed >> "%LOG_FILE%"

REM Don't pause when run from scheduler
if /I "%1" NEQ "silent" pause
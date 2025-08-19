@echo off
REM Setup script for automated sequence monitoring
REM Run this as Administrator to set up daily sequence monitoring

echo Setting up automated database sequence monitoring...

REM Create the scheduled task
schtasks /create ^
    /tn "Kingston Portal Sequence Monitor" ^
    /tr "python \"C:\Users\jacob\Documents\kingstons_portal\backend\monitor_sequences.py\" --fix" ^
    /sc daily ^
    /st 02:00 ^
    /ru "SYSTEM" ^
    /f

if %errorlevel% equ 0 (
    echo ✅ Successfully created scheduled task
    echo    - Runs daily at 2:00 AM
    echo    - Automatically fixes sequence issues
    echo    - Check logs with: schtasks /query /tn "Kingston Portal Sequence Monitor"
) else (
    echo ❌ Failed to create scheduled task
    echo    Please run this script as Administrator
)

echo.
echo You can also manually run the sequence monitor:
echo   python monitor_sequences.py          (check only)
echo   python monitor_sequences.py --fix    (check and fix)

pause
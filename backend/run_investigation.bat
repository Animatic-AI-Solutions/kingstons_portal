@echo off
echo Activating virtual environment and investigating product 196...
echo.

cd /d "C:\Users\jacob\Documents\kingstons_portal\backend"

if exist "venv\Scripts\activate.bat" (
    echo Found venv, activating...
    call venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    echo Found .venv, activating...
    call .venv\Scripts\activate.bat
) else (
    echo No virtual environment found, running with system Python...
)

echo.
echo Running investigation script...
python investigate_product_196.py

echo.
echo Investigation complete. Press any key to exit...
pause > nul
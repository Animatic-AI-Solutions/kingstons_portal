#!/bin/bash

# Script to start backend and frontend development servers on Linux/macOS

# Navigate to the script's directory to ensure relative paths work
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "Starting Backend Server..."
cd backend
# Activate Python virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Backend virtual environment not found at venv/bin/activate. Please check the path."
    # Optionally exit if venv is critical
    # exit 1 
fi
# Start backend server in the background
# Logs will typically go to the terminal where this script is run, or check uvicorn's logging options
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

echo "Starting Frontend Development Server..."
cd frontend
# Start frontend server in the background
# Logs will typically go to the terminal where this script is run, or check npm/vite's logging options
npm start &
FRONTEND_PID=$!
cd ..

echo "Backend server started in the background (PID: $BACKEND_PID)."
echo "Frontend server started in the background (PID: $FRONTEND_PID)."
echo "You can monitor their output in this terminal or use 'jobs' to manage them."
echo "To stop them, you might need to use 'kill $BACKEND_PID' and 'kill $FRONTEND_PID' or find them via 'ps aux | grep uvicorn' and 'ps aux | grep npm'." 
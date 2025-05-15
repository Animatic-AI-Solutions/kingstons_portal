#!/bin/bash

# Script to build the backend and frontend, including installing dependencies.

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error.
# set -u # Uncomment if you want to be stricter with undefined variables
# The return value of a pipeline is the status of the last command to exit with a non-zero status.
set -o pipefail

# Navigate to the script's directory to ensure relative paths work
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "====================================="
echo "Starting Project Build Process"
echo "====================================="

# --- Backend Build ---
echo ""
echo "-------------------------------------"
echo "Building Backend..."
echo "-------------------------------------"
cd backend

# Check and create/activate Python virtual environment
if [ ! -d "venv" ]; then
    echo "Python virtual environment 'venv' not found. Creating one..."
    if ! python3 -m venv venv; then
        echo "Failed to create Python virtual environment. Please ensure python3 and the 'venv' module are installed and available."
        exit 1
    fi
    echo "Virtual environment created."
fi

echo "Activating Python virtual environment..."
# Check if activate script exists before sourcing
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "ERROR: venv/bin/activate not found. Cannot activate virtual environment."
    exit 1
fi

echo "Installing backend Python dependencies from requirements.txt..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo "Backend dependencies installed."
else
    echo "WARNING: requirements.txt not found in backend directory. Skipping pip install."
fi

# Deactivate virtual environment (optional, as script execution context will end anyway)
# deactivate
# Not all systems have 'deactivate' readily available or it might behave unexpectedly within a script.
# The venv activation is typically scoped to the current shell or subshell.

echo "Backend setup complete."
cd "$SCRIPT_DIR" # Go back to root

# --- Frontend Build ---
echo ""
echo "--------------------------------------"
echo "Building Frontend..."
echo "--------------------------------------"
cd frontend

echo "Installing frontend Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    echo "Found package-lock.json, using 'npm ci' for clean install..."
    npm ci
else
    echo "package-lock.json not found, using 'npm install'..."
    npm install
fi
echo "Frontend dependencies installed."

echo "Building frontend application (npm run build)..."
npm run build
echo "Frontend application built."

echo "Frontend setup complete."
cd "$SCRIPT_DIR" # Go back to root

echo ""
echo "====================================="
echo "Project Build Process Completed Successfully!"
echo "=====================================" 
#!/bin/bash

# Use PORT from environment (for platforms like Render) or fall back to API_PORT
PORT=${PORT:-$API_PORT}

# Use workers from environment
WORKERS=${WORKERS:-1}

# Use timeout from environment
TIMEOUT=${TIMEOUT:-120}

# Verify gunicorn is installed
which gunicorn || { echo "Error: gunicorn not found"; pip install gunicorn; }

# Start gunicorn with the right configuration
echo "Starting server on 0.0.0.0:$PORT with $WORKERS workers and $TIMEOUT seconds timeout"

# List directory contents for debugging
echo "Contents of current directory:"
ls -la

echo "Contents of static_frontend directory:"
ls -la static_frontend || echo "static_frontend directory not found!"

echo "Starting application with DEBUG=$DEBUG..."
exec gunicorn main:app --bind 0.0.0.0:$PORT --workers $WORKERS --timeout $TIMEOUT --log-level debug 
# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package.json and package-lock.json (or yarn.lock)
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
# Using npm ci for reproducible builds if package-lock.json exists
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Build the backend and create the final image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Default environment variables (can be overridden at runtime)
ENV API_HOST=0.0.0.0
ENV API_PORT=8000
ENV WORKERS=4
ENV DEBUG=False

WORKDIR /app

# Install system dependencies if any (e.g., for packages that need compilation)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first to leverage Docker cache
COPY backend/requirements.txt ./backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend code
COPY backend/ ./backend/

# Copy the built frontend assets from the frontend-builder stage
# The frontend assets will be served by the Python backend
COPY --from=frontend-builder /app/frontend/dist ./backend/static_frontend/

# Expose the port the app runs on
# This is just documentation - the actual port is defined by the PORT environment variable or default API_PORT
EXPOSE 8000

# Change to the backend directory
WORKDIR /app/backend

# Create start script that reads environment variables
RUN echo '#!/bin/bash\n\
# Use PORT from environment (for platforms like Render) or fall back to API_PORT\n\
PORT=${PORT:-$API_PORT}\n\
# Use workers from environment\n\
WORKERS=${WORKERS:-4}\n\
# Start gunicorn with the right configuration\n\
echo "Starting server on 0.0.0.0:$PORT with $WORKERS workers"\n\
exec gunicorn -w $WORKERS -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT\n'\
> ./start.sh && chmod +x ./start.sh

# Command to run the application
# The script allows flexible configuration through environment variables
CMD ["./start.sh"] 
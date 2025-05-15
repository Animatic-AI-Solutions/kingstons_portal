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

# Show frontend directory content for debugging
RUN ls -la

# Check Vite config for outDir setting
RUN echo "Checking Vite config for output directory..."
RUN grep -r "outDir\|build\.outDir" --include="*.js" --include="*.ts" ./ || echo "No custom outDir specified, using default."

# Build the frontend with verbose output
RUN npm run build || (echo "Frontend build failed!" && exit 1)

# List top level directories to find build output
RUN echo "Listing directories to locate build output:"
RUN ls -la ./

# Check common output directories
RUN echo "Checking dist directory:" && ls -la dist 2>/dev/null || echo "dist directory not found!"
RUN echo "Checking build directory:" && ls -la build 2>/dev/null || echo "build directory not found!"
RUN echo "Checking output directory:" && ls -la output 2>/dev/null || echo "output directory not found!"

# Check for source map files
RUN echo "Checking for source map files:"
RUN find . -name "*.map" | grep . || echo "No source map files found!"

# Try to detect the build output directory
RUN BUILD_DIR="dist"; \
    if [ -d "dist" ]; then \
      echo "Found standard dist directory."; \
    elif [ -d "build" ]; then \
      echo "Found standard build directory."; \
      BUILD_DIR="build"; \
    else \
      echo "Warning: Could not find standard build directory! Using dist anyway."; \
    fi; \
    echo "BUILD_DIR=$BUILD_DIR" > /app/frontend/build-info.txt

# Show the contents of the identified build directory
RUN cat /app/frontend/build-info.txt

# Stage 2: Build the backend and create the final image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Default environment variables (can be overridden at runtime)
ENV API_HOST=0.0.0.0
ENV API_PORT=8000
# Reduced from 4 to 1 worker
ENV WORKERS=1
# Added 2-minute timeout (in seconds)
ENV TIMEOUT=120
# Set to True for more detailed logging
ENV DEBUG=True

WORKDIR /app

# Install system dependencies if any (e.g., for packages that need compilation)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first to leverage Docker cache
COPY backend/requirements.txt ./backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend code
COPY backend/ ./backend/

# Create static_frontend directory to ensure it exists
RUN mkdir -p ./backend/static_frontend/

# Create a shell script to attempt copying frontend assets
RUN echo '#!/bin/sh' > /app/copy-frontend.sh && \
    echo '# Read the detected build directory from frontend stage' >> /app/copy-frontend.sh && \
    echo 'if [ -f "/app/frontend/build-info.txt" ]; then' >> /app/copy-frontend.sh && \
    echo '  . /app/frontend/build-info.txt' >> /app/copy-frontend.sh && \
    echo '  echo "Using detected build directory: $BUILD_DIR"' >> /app/copy-frontend.sh && \
    echo 'else' >> /app/copy-frontend.sh && \
    echo '  BUILD_DIR="dist"' >> /app/copy-frontend.sh && \
    echo '  echo "No build-info.txt found, defaulting to $BUILD_DIR"' >> /app/copy-frontend.sh && \
    echo 'fi' >> /app/copy-frontend.sh && \
    echo '' >> /app/copy-frontend.sh && \
    echo '# Check for build artifacts in the detected directory' >> /app/copy-frontend.sh && \
    echo 'if [ -d "/app/frontend/$BUILD_DIR" ]; then' >> /app/copy-frontend.sh && \
    echo '  echo "Copying from $BUILD_DIR directory"' >> /app/copy-frontend.sh && \
    echo '  cp -r /app/frontend/$BUILD_DIR/* /app/backend/static_frontend/' >> /app/copy-frontend.sh && \
    echo '  echo "Frontend assets copied successfully."' >> /app/copy-frontend.sh && \
    echo '  # Count and list source map files' >> /app/copy-frontend.sh && \
    echo '  echo "Source map files:"' >> /app/copy-frontend.sh && \
    echo '  find /app/backend/static_frontend -name "*.map" | wc -l' >> /app/copy-frontend.sh && \
    echo '  find /app/backend/static_frontend -name "*.map" | head -5' >> /app/copy-frontend.sh && \
    echo 'else' >> /app/copy-frontend.sh && \
    echo '  echo "WARNING: No frontend build artifacts found in $BUILD_DIR directory"' >> /app/copy-frontend.sh && \
    echo '  # Try other common directories as a fallback' >> /app/copy-frontend.sh && \
    echo '  if [ -d "/app/frontend/dist" ]; then' >> /app/copy-frontend.sh && \
    echo '    echo "Fallback: Copying from dist directory"' >> /app/copy-frontend.sh && \
    echo '    cp -r /app/frontend/dist/* /app/backend/static_frontend/' >> /app/copy-frontend.sh && \
    echo '  elif [ -d "/app/frontend/build" ]; then' >> /app/copy-frontend.sh && \
    echo '    echo "Fallback: Copying from build directory"' >> /app/copy-frontend.sh && \
    echo '    cp -r /app/frontend/build/* /app/backend/static_frontend/' >> /app/copy-frontend.sh && \
    echo '  else' >> /app/copy-frontend.sh && \
    echo '    echo "ERROR: Could not find any build artifacts!"' >> /app/copy-frontend.sh && \
    echo '    echo "<html><body><h1>Frontend assets not available</h1><p>The frontend build could not be located.</p></body></html>" > /app/backend/static_frontend/index.html' >> /app/copy-frontend.sh && \
    echo '  fi' >> /app/copy-frontend.sh && \
    echo 'fi' >> /app/copy-frontend.sh && \
    echo '' >> /app/copy-frontend.sh && \
    echo '# Verify we have an index.html' >> /app/copy-frontend.sh && \
    echo 'if [ ! -f "/app/backend/static_frontend/index.html" ]; then' >> /app/copy-frontend.sh && \
    echo '  echo "ERROR: No index.html found in copied assets!"' >> /app/copy-frontend.sh && \
    echo '  echo "<html><body><h1>Frontend assets incomplete</h1><p>index.html was not found in the build directory.</p></body></html>" > /app/backend/static_frontend/index.html' >> /app/copy-frontend.sh && \
    echo 'fi' >> /app/copy-frontend.sh && \
    echo '' >> /app/copy-frontend.sh && \
    echo '# List the contents of the static_frontend directory' >> /app/copy-frontend.sh && \
    echo 'echo "Contents of /app/backend/static_frontend:"' >> /app/copy-frontend.sh && \
    echo 'ls -la /app/backend/static_frontend/' >> /app/copy-frontend.sh

RUN chmod +x /app/copy-frontend.sh

# Try to copy from the frontend-builder stage
COPY --from=frontend-builder /app/frontend /app/frontend/
RUN /app/copy-frontend.sh

# Clean up source files after copying to save space
RUN rm -rf /app/frontend /app/copy-frontend.sh

# Expose the port the app runs on
# This is just documentation - the actual port is defined by the PORT environment variable or default API_PORT
EXPOSE 8000

# Change to the backend directory
WORKDIR /app/backend

# Create start script that reads environment variables
RUN echo '#!/bin/bash' > ./start.sh && \
    echo '# Use PORT from environment (for platforms like Render) or fall back to API_PORT' >> ./start.sh && \
    echo 'PORT=${PORT:-$API_PORT}' >> ./start.sh && \
    echo '# Use workers from environment' >> ./start.sh && \
    echo 'WORKERS=${WORKERS:-1}' >> ./start.sh && \
    echo '# Use timeout from environment' >> ./start.sh && \
    echo 'TIMEOUT=${TIMEOUT:-120}' >> ./start.sh && \
    echo '# Start gunicorn with the right configuration' >> ./start.sh && \
    echo 'echo "Starting server on 0.0.0.0:$PORT with $WORKERS workers and $TIMEOUT seconds timeout"' >> ./start.sh && \
    echo '# List directory contents for debugging' >> ./start.sh && \
    echo 'echo "Contents of current directory:"' >> ./start.sh && \
    echo 'ls -la' >> ./start.sh && \
    echo 'echo "Contents of static_frontend directory:"' >> ./start.sh && \
    echo 'ls -la static_frontend || echo "static_frontend directory not found!"' >> ./start.sh && \
    echo 'echo "Source map files available:"' >> ./start.sh && \
    echo 'find static_frontend -name "*.map" | wc -l' >> ./start.sh && \
    echo 'echo "Starting application with DEBUG=$DEBUG..."' >> ./start.sh && \
    echo 'echo "Environment variables (sanitized):"' >> ./start.sh && \
    echo 'env | grep -v KEY | grep -v SECRET | grep -v PASSWORD | grep -v TOKEN' >> ./start.sh && \
    echo 'exec gunicorn -w $WORKERS -t $TIMEOUT --log-level debug -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT' >> ./start.sh && \
    chmod +x ./start.sh

# Command to run the application
# The script allows flexible configuration through environment variables
CMD ["./start.sh"] 
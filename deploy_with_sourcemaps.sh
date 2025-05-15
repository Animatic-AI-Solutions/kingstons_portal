#!/bin/bash
# Script to rebuild and deploy with source maps enabled

set -e  # Exit on error

echo "🔍 Rebuilding with source maps enabled..."

# Build the Docker image with an explicit tag
echo "🐳 Building Docker image with source maps..."
docker build -t kingstons-portal:sourcemaps .

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Build succeeded!"
  
  # Echo instructions for deployment
  echo ""
  echo "=================================================="
  echo "🚀 Deployment Instructions:"
  echo "=================================================="
  echo "1. Push your changes to the repository:"
  echo "   git add ."
  echo "   git commit -m 'Added source maps for debugging'"
  echo "   git push origin main"
  echo ""
  echo "2. Render.com will automatically rebuild from your GitHub repository"
  echo "   or you can trigger a manual deploy from the Render dashboard"
  echo ""
  echo "3. Once deployed, you can debug JavaScript errors using browser DevTools"
  echo "   - Open Chrome DevTools (F12)"
  echo "   - Go to Sources tab"
  echo "   - The original source files should be available for debugging"
  echo "=================================================="
else
  echo "❌ Build failed. Please check the error messages above."
fi 
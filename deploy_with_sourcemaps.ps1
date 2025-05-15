# PowerShell script to rebuild and deploy with source maps enabled

Write-Host "🔍 Rebuilding with source maps enabled..." -ForegroundColor Cyan

# Build the Docker image with an explicit tag
Write-Host "🐳 Building Docker image with source maps..." -ForegroundColor Blue
docker build -t kingstons-portal:sourcemaps .

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Build succeeded!" -ForegroundColor Green
  
  # Echo instructions for deployment
  Write-Host ""
  Write-Host "==================================================" -ForegroundColor Yellow
  Write-Host "🚀 Deployment Instructions:" -ForegroundColor Yellow
  Write-Host "==================================================" -ForegroundColor Yellow
  Write-Host "1. Push your changes to the repository:" -ForegroundColor White
  Write-Host "   git add ." -ForegroundColor Gray
  Write-Host "   git commit -m 'Added source maps for debugging'" -ForegroundColor Gray
  Write-Host "   git push origin main" -ForegroundColor Gray
  Write-Host ""
  Write-Host "2. Render.com will automatically rebuild from your GitHub repository" -ForegroundColor White
  Write-Host "   or you can trigger a manual deploy from the Render dashboard" -ForegroundColor White
  Write-Host ""
  Write-Host "3. Once deployed, you can debug JavaScript errors using browser DevTools" -ForegroundColor White
  Write-Host "   - Open Chrome DevTools (F12)" -ForegroundColor Gray
  Write-Host "   - Go to Sources tab" -ForegroundColor Gray
  Write-Host "   - The original source files should be available for debugging" -ForegroundColor Gray
  Write-Host "==================================================" -ForegroundColor Yellow
}
else {
  Write-Host "❌ Build failed. Please check the error messages above." -ForegroundColor Red
} 
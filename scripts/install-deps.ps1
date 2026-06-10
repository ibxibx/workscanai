# Install additional dependencies for WorkScanAI

Write-Host "Installing additional dependencies..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location C:\Users\damya\Projects\workscanai\frontend

# Install dependencies
npm install clsx tailwind-merge

Write-Host "`nDependencies installed successfully!" -ForegroundColor Green
Write-Host "`nYou can now run:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host "`nThen open http://localhost:3000 in your browser" -ForegroundColor Cyan

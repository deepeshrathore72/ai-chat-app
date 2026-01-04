# Database Setup Script for AI Chat Application (Windows)

Write-Host "🚀 Setting up AI Chat Application Database..." -ForegroundColor Cyan

# Check if .env.local exists
if (-not (Test-Path .env.local)) {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "📝 Please copy .env.example to .env.local and fill in your credentials:" -ForegroundColor Yellow
    Write-Host "   Copy-Item .env.example .env.local" -ForegroundColor White
    exit 1
}

# Generate Prisma Client
Write-Host "📦 Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

# Push database schema
Write-Host "🗄️  Pushing database schema..." -ForegroundColor Cyan
npx prisma db push

Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 You're ready to run the application:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor White

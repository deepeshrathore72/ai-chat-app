@echo off
echo ================================
echo AI Chat Application Setup
echo ================================
echo.

echo [1/4] Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found: 
node --version
echo.

echo [2/4] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [3/4] Checking environment configuration...
if not exist .env.local (
    echo WARNING: .env.local not found!
    echo.
    echo Please create .env.local from .env.example and fill in your credentials:
    echo   1. PostgreSQL DATABASE_URL
    echo   2. AUTH_SECRET (generate with: openssl rand -base64 32)
    echo   3. GITHUB_ID and GITHUB_SECRET
    echo   4. OPENAI_API_KEY
    echo.
    echo Press any key to open .env.example...
    pause >nul
    notepad .env.example
    echo.
    echo After configuring .env.local, run this script again.
    pause
    exit /b 1
)
echo .env.local found!
echo.

echo [4/4] Setting up database...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

call npx prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to push database schema
    echo Please check your DATABASE_URL in .env.local
    pause
    exit /b 1
)
echo.

echo ================================
echo Setup Complete! 
echo ================================
echo.
echo To start the application, run:
echo   npm run dev
echo.
echo Then open http://localhost:3000 in your browser
echo.
pause

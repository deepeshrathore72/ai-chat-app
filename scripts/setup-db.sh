#!/bin/bash

# Database Setup Script for AI Chat Application

echo "🚀 Setting up AI Chat Application Database..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "📝 Please copy .env.example to .env.local and fill in your credentials:"
    echo "   cp .env.example .env.local"
    exit 1
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push database schema
echo "🗄️  Pushing database schema..."
npx prisma db push

echo "✅ Database setup complete!"
echo ""
echo "🎉 You're ready to run the application:"
echo "   npm run dev"

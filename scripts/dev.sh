#!/bin/bash
set -e

echo "🚀 Starting development environment..."

# Start Docker services
echo "📦 Starting Docker services..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services..."
sleep 5

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Build shared packages
echo "🔨 Building shared packages..."
npm run build

# Start all apps in parallel
echo "🎯 Starting applications..."
npm run dev
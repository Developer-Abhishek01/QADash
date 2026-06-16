#!/bin/bash
set -e

echo "🐳 Building and starting Docker containers..."
docker-compose build
docker-compose up -d

echo "📊 Container status:"
docker-compose ps
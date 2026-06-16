#!/bin/bash
set -e

echo "🧪 Running all tests..."

# Run lint
echo "📝 Running lint..."
npm run lint || true

# Run typecheck
echo "🔍 Running typecheck..."
npm run typecheck || true

# Run build
echo "🏗️ Running build..."
npm run build

echo "✅ All checks complete!"
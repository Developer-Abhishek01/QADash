#!/bin/bash
set -e

echo "🧹 Cleaning monorepo..."

# Clean all apps
echo "Cleaning apps..."
for app in apps/*; do
  if [ -f "$app/package.json" ]; then
    echo "  Cleaning $app"
    rm -rf "$app/dist" "$app/.next" "$app/node_modules" 2>/dev/null || true
  fi
done

# Clean all packages
echo "Cleaning packages..."
for pkg in packages/*; do
  if [ -f "$pkg/package.json" ]; then
    echo "  Cleaning $pkg"
    rm -rf "$pkg/dist" "$pkg/node_modules" 2>/dev/null || true
  fi
done

# Clean turbo cache
echo "Cleaning turbo cache..."
rm -rf .turbo node_modules

echo "✅ Clean complete!"
#!/bin/bash
# Bun Migration Verification Script
# This script verifies that all bun-related changes work correctly

set -e

echo "🔍 Bun Migration Verification"
echo "=============================="
echo ""

# Check if bun is installed
echo "✓ Checking Bun installation..."
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Install it with:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

BUN_VERSION=$(bun --version)
echo "✓ Bun version: $BUN_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
bun install
echo "✓ Dependencies installed"
echo ""

# Type check
echo "🔍 Running type check..."
bun type-check
echo "✓ Type check passed"
echo ""

# Lint check
echo "🎨 Running linter..."
bun lint
echo "✓ Linting passed"
echo ""

# Run tests
echo "🧪 Running tests..."
bun test
echo "✓ Tests passed"
echo ""

# Format check
echo "💅 Checking code formatting..."
bun format:check
echo "✓ Formatting check passed"
echo ""

# Build
echo "🏗️  Building application..."
bun run build
echo "✓ Build completed"
echo ""

# Verify build output
if [ -d "dist" ]; then
    echo "✓ Build output found in dist/"
else
    echo "❌ Build output not found"
    exit 1
fi

echo ""
echo "✅ All verification checks passed!"
echo "The migration to Bun is complete and working correctly."

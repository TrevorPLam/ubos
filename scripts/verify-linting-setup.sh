#!/bin/bash

# Verification script for P0-FOUND-3: Unified Linting and Formatting Rules
echo "🔍 Verifying ESLint and Prettier setup..."

echo "📝 Checking Prettier configuration..."
if [ -f ".prettierrc" ]; then
    echo "✅ Root .prettierrc exists"
    echo "📄 Contents:"
    cat .prettierrc
else
    echo "❌ Root .prettierrc missing"
    exit 1
fi

echo ""
echo "🔧 Checking ESLint configuration..."
if [ -f "eslint.config.js" ]; then
    echo "✅ Root eslint.config.js exists"
    echo "📄 Configuration uses flat config format"
else
    echo "❌ Root eslint.config.js missing"
    exit 1
fi

echo ""
echo "🗂️  Checking apps/web configuration..."
if [ -f "apps/web/eslint.config.js" ]; then
    echo "✅ apps/web/eslint.config.js exists"
    if [ ! -f "apps/web/prettier.config.js" ]; then
        echo "✅ apps/web/prettier.config.js removed (using root config)"
    else
        echo "❌ apps/web/prettier.config.js still exists"
        exit 1
    fi
else
    echo "❌ apps/web/eslint.config.js missing"
    exit 1
fi

echo ""
echo "📦 Checking package.json scripts..."
if grep -q '"lint": "eslint \."' package.json; then
    echo "✅ Root lint script configured"
else
    echo "❌ Root lint script missing"
    exit 1
fi

if grep -q '"format": "prettier --write \."' package.json; then
    echo "✅ Root format script configured"
else
    echo "❌ Root format script missing"
    exit 1
fi

echo ""
echo "🧪 Running verification commands..."
echo "Note: These commands require dependencies to be installed first"
echo ""
echo "🔍 Checking Prettier formatting:"
echo "  npx prettier --check ."
echo ""
echo "🔧 Checking ESLint:"
echo "  npx eslint ."
echo ""
echo "🔧 Auto-fixing ESLint issues:"
echo "  npx eslint . --fix"
echo ""
echo "📝 Auto-formatting code:"
echo "  npx prettier --write ."

echo ""
echo "✅ All configuration files are in place!"
echo "📋 To complete verification, run the commands above after installing dependencies."

#!/bin/bash

# Setup Secret Scanning Pre-Commit Hook
# Run this script to install secret scanning in your git hooks

echo "🔧 Setting up secret scanning pre-commit hook..."

# Ensure Husky is installed
if [ ! -d ".husky" ]; then
  echo "📦 Installing Husky..."
  npx husky install
fi

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Secret Scanning Pre-Commit Hook
echo "🔍 Running secret scanner..."
tsx scripts/pre-commit-scan.ts
EOF

# Make executable
chmod +x .husky/pre-commit

echo "✅ Secret scanning pre-commit hook installed!"
echo ""
echo "The hook will now run automatically before each commit."
echo "To bypass (NOT RECOMMENDED): git commit --no-verify"
echo ""

#!/bin/bash

# Security Verification Script
# Checks that environment files are properly configured and not exposed

set -e

echo "🔐 Security Verification Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES=0

# Check 1: .env files are in .gitignore
echo "✓ Checking .gitignore configuration..."
if git check-ignore .env >/dev/null 2>&1; then
    echo -e "${GREEN}✓ .env is ignored by git${NC}"
else
    echo -e "${RED}✗ .env is NOT ignored by git - SECURITY RISK!${NC}"
    ISSUES=$((ISSUES+1))
fi

if git check-ignore .env.test >/dev/null 2>&1; then
    echo -e "${GREEN}✓ .env.test is ignored by git${NC}"
else
    echo -e "${RED}✗ .env.test is NOT ignored by git - SECURITY RISK!${NC}"
    ISSUES=$((ISSUES+1))
fi

if git check-ignore .env.production >/dev/null 2>&1; then
    echo -e "${GREEN}✓ .env.production is ignored by git${NC}"
else
    echo -e "${RED}✗ .env.production is NOT ignored by git - SECURITY RISK!${NC}"
    ISSUES=$((ISSUES+1))
fi

echo ""

# Check 2: .env.example is tracked
echo "✓ Checking example files are tracked..."
if git ls-files .env.example >/dev/null 2>&1 || [ ! -f .env.example ]; then
    if [ -f .env.example ]; then
        echo -e "${GREEN}✓ .env.example exists and is tracked${NC}"
    else
        echo -e "${YELLOW}⚠ .env.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env.example is not tracked in git${NC}"
fi

echo ""

# Check 3: No .env files in git
echo "✓ Checking git repository for .env files..."
if git ls-files | grep -q "^\.env$"; then
    echo -e "${RED}✗ .env file is tracked in git repository - SECURITY RISK!${NC}"
    echo -e "${YELLOW}  Run: git rm --cached .env && git commit -m 'Remove .env from git'${NC}"
    ISSUES=$((ISSUES+1))
else
    echo -e "${GREEN}✓ .env is not tracked in repository${NC}"
fi

echo ""

# Check 4: No .env files in git history
echo "✓ Checking git history for .env files..."
if git log --all --full-history -- .env 2>/dev/null | grep -q "commit"; then
    echo -e "${YELLOW}⚠ .env was committed in the past - consider history rewrite${NC}"
    echo -e "${YELLOW}  WARNING: This is a security risk if it contained real secrets${NC}"
else
    echo -e "${GREEN}✓ .env has never been committed${NC}"
fi

echo ""

# Check 5: Environment file exists
echo "✓ Checking for environment configuration..."
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"

    # Check for placeholder values (security risk in production)
    if grep -q "your-super-secret\|change-this\|your_.*_key_here" .env; then
        echo -e "${YELLOW}⚠ .env contains placeholder values - update before production!${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found - copy from .env.example${NC}"
    echo -e "${YELLOW}  Run: cp .env.example .env${NC}"
fi

echo ""

# Check 6: Critical variables are set
if [ -f .env ]; then
    echo "✓ Checking critical environment variables..."

    missing_vars=()

    if ! grep -q "^JWT_SECRET=" .env || grep -q "^JWT_SECRET=$\|^JWT_SECRET=your" .env; then
        missing_vars+=("JWT_SECRET")
    fi

    if ! grep -q "^DATABASE_URL=" .env || grep -q "^DATABASE_URL=$\|^DATABASE_URL=postgresql://.*:.*@localhost" .env; then
        missing_vars+=("DATABASE_URL")
    fi

    if ! grep -q "^REDIS_URL=" .env; then
        missing_vars+=("REDIS_URL")
    fi

    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ Critical variables appear to be configured${NC}"
    else
        echo -e "${YELLOW}⚠ Missing or using default values for: ${missing_vars[*]}${NC}"
        echo -e "${YELLOW}  See docs/ENVIRONMENT_SETUP.md for configuration guide${NC}"
    fi
fi

echo ""

# Check 7: No secrets in tracked files
echo "✓ Scanning for exposed secrets in tracked files..."
if git grep -E "(sk-[a-zA-Z0-9]{20,}|xoxb-[a-zA-Z0-9-]+)" HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' >/dev/null 2>&1; then
    echo -e "${RED}✗ Potential API keys found in source code - SECURITY RISK!${NC}"
    ISSUES=$((ISSUES+1))
else
    echo -e "${GREEN}✓ No obvious secrets in tracked source files${NC}"
fi

echo ""

# Check 8: File permissions
echo "✓ Checking file permissions..."
if [ -f .env ]; then
    perms=$(stat -c '%a' .env 2>/dev/null || stat -f '%A' .env 2>/dev/null || echo "unknown")
    if [ "$perms" = "600" ] || [ "$perms" = "400" ]; then
        echo -e "${GREEN}✓ .env has restrictive permissions ($perms)${NC}"
    else
        echo -e "${YELLOW}⚠ .env has loose permissions ($perms) - consider: chmod 600 .env${NC}"
    fi
fi

echo ""

# Summary
echo "================================"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Found $ISSUES security issue(s) - please fix before deploying${NC}"
    echo ""
    echo "📚 See documentation:"
    echo "  - docs/ENVIRONMENT_SETUP.md"
    echo "  - docs/SECURITY_CHECKLIST.md"
    exit 1
fi

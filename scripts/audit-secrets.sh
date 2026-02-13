#!/bin/bash

#############################################################
# Secrets Security Audit Script
#
# This script checks for:
# - Hardcoded secrets in code
# - Secrets in git history
# - Weak secrets
# - Improperly configured .env files
#############################################################

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 Secrets Security Audit${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#############################################################
# 1. Check for hardcoded secrets in code
#############################################################
echo -e "${BLUE}[1/7]${NC} Checking for hardcoded secrets in source code..."

SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{3,}['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]{10,}['\"]"
    "secret\s*=\s*['\"][^'\"]{10,}['\"]"
    "token\s*=\s*['\"][^'\"]{10,}['\"]"
    "Bearer [A-Za-z0-9_-]{20,}"
    "sk_live_[A-Za-z0-9]{24,}"
    "pk_live_[A-Za-z0-9]{24,}"
    "xoxb-[0-9]{10,}"
    "ghp_[A-Za-z0-9]{36}"
    "gho_[A-Za-z0-9]{36}"
    "-----BEGIN.*PRIVATE KEY-----"
    "AIzaSy[A-Za-z0-9_-]{33}"
    "AKIA[A-Z0-9]{16}"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if results=$(git grep -iE "$pattern" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' 2>/dev/null | grep -v "\.test\." | grep -v "\.example\." || true); then
        if [ -n "$results" ]; then
            echo -e "${RED}❌ Found potential hardcoded secret matching pattern: $pattern${NC}"
            echo "$results" | head -3
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
done

#############################################################
# 2. Check for secrets in git history
#############################################################
echo -e "\n${BLUE}[2/7]${NC} Checking git history for secrets..."

KNOWN_SECRETS=(
    "your-super-secret-jwt-key-change-in-production"
    "your-super-secret-refresh-key-change-in-production"
    "your-super-secret-session-key-change-in-production"
    "workflow_password"
    "redis_password"
    "test-jwt-secret"
    "test-refresh-secret"
    "change-this-secret-in-production"
)

for secret in "${KNOWN_SECRETS[@]}"; do
    if git log --all -S "$secret" --format="%h %s" 2>/dev/null | head -1; then
        echo -e "${RED}❌ Found secret in git history: $secret${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

#############################################################
# 3. Check for .env files in git
#############################################################
echo -e "\n${BLUE}[3/7]${NC} Checking for .env files tracked by git..."

ENV_FILES=$(git ls-files | grep -E "^\.env" || true)
if [ -n "$ENV_FILES" ]; then
    echo -e "${RED}❌ Found .env files tracked by git:${NC}"
    echo "$ENV_FILES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No .env files tracked by git${NC}"
fi

#############################################################
# 4. Check .gitignore configuration
#############################################################
echo -e "\n${BLUE}[4/7]${NC} Checking .gitignore configuration..."

REQUIRED_IGNORES=(
    ".env"
    ".env.local"
    ".env.production"
    ".env.test"
    ".env.transformation"
    "secrets/"
    "*.pem"
    "*.key"
)

for pattern in "${REQUIRED_IGNORES[@]}"; do
    if ! grep -q "^${pattern}$" .gitignore 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Missing in .gitignore: $pattern${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

#############################################################
# 5. Check for weak secrets in environment
#############################################################
echo -e "\n${BLUE}[5/7]${NC} Checking for weak secrets in current environment..."

WEAK_PATTERNS=(
    "password"
    "secret"
    "123456"
    "admin"
    "test"
    "default"
    "change"
    "your-"
)

# Only check if we're in development (don't expose production secrets)
if [ "${NODE_ENV:-development}" = "development" ]; then
    SECRET_VARS=("JWT_SECRET" "JWT_REFRESH_SECRET" "SESSION_SECRET" "ENCRYPTION_MASTER_KEY")

    for var in "${SECRET_VARS[@]}"; do
        if [ -n "${!var}" ]; then
            value="${!var}"
            for weak in "${WEAK_PATTERNS[@]}"; do
                if [[ "$value" =~ $weak ]]; then
                    echo -e "${YELLOW}⚠️  Weak secret detected in $var (contains '$weak')${NC}"
                    ISSUES_FOUND=$((ISSUES_FOUND + 1))
                    break
                fi
            done

            # Check length
            if [ ${#value} -lt 32 ]; then
                echo -e "${YELLOW}⚠️  Short secret in $var (${#value} chars, should be 32+)${NC}"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
        fi
    done
fi

#############################################################
# 6. Check for exposed API keys
#############################################################
echo -e "\n${BLUE}[6/7]${NC} Checking for potentially exposed API keys..."

# Check common API key locations
API_KEY_FILES=(
    ".env"
    ".env.local"
    ".env.development"
    "config.json"
    "credentials.json"
)

for file in "${API_KEY_FILES[@]}"; do
    if [ -f "$file" ] && git ls-files --error-unmatch "$file" 2>/dev/null; then
        echo -e "${RED}❌ API key file tracked by git: $file${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

#############################################################
# 7. Check for secrets in recent commits
#############################################################
echo -e "\n${BLUE}[7/7]${NC} Checking recent commits for secrets..."

# Check last 10 commits
RECENT_COMMITS=$(git log -10 --all --format="%H")

for commit in $RECENT_COMMITS; do
    # Check for common secret-related files
    if git diff-tree --no-commit-id --name-only -r $commit | grep -qE "\.env$|\.pem$|\.key$|credentials|secrets"; then
        echo -e "${YELLOW}⚠️  Commit $commit modified sensitive files${NC}"
        git log -1 --format="%h %s" $commit
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

#############################################################
# Summary
#############################################################
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No security issues found!${NC}"
    echo -e "${GREEN}   All secrets appear to be properly managed.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND potential security issues${NC}"
    echo -e "${YELLOW}   Please review and fix the issues above.${NC}"
    echo -e "${YELLOW}   See SECRETS_MANAGEMENT_URGENT_GUIDE.md for remediation steps.${NC}"
    exit 1
fi

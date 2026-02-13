#!/bin/bash

###########################################################
# Secrets Security Status Checker
#
# Quick status check for secrets management
###########################################################

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Counters
PASS=0
WARN=0
FAIL=0

print_status() {
    local status=$1
    local message=$2

    case $status in
        "pass")
            echo -e "  ${GREEN}✅${NC} $message"
            PASS=$((PASS + 1))
            ;;
        "warn")
            echo -e "  ${YELLOW}⚠️${NC}  $message"
            WARN=$((WARN + 1))
            ;;
        "fail")
            echo -e "  ${RED}❌${NC} $message"
            FAIL=$((FAIL + 1))
            ;;
        "info")
            echo -e "  ${BLUE}ℹ️${NC}  $message"
            ;;
    esac
}

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${BLUE}🔒 Secrets Security Status Check${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

###########################################################
# 1. Check .env files in git
###########################################################
echo -e "${BOLD}1. Git Repository Status${NC}"

ENV_IN_GIT=$(git ls-files | grep -E "^\.env" || true)
if [ -z "$ENV_IN_GIT" ]; then
    print_status "pass" "No .env files tracked by git"
else
    print_status "fail" "Found .env files in git: $(echo $ENV_IN_GIT | tr '\n' ', ')"
fi

# Check for secrets in recent commits
RECENT_ENV_CHANGES=$(git log -5 --oneline --name-only | grep -E "^\.env" || true)
if [ -z "$RECENT_ENV_CHANGES" ]; then
    print_status "pass" "No recent .env file commits"
else
    print_status "warn" "Recent commits modified .env files"
fi

echo ""

###########################################################
# 2. Check .gitignore configuration
###########################################################
echo -e "${BOLD}2. .gitignore Configuration${NC}"

REQUIRED_PATTERNS=(".env" ".env.local" ".env.test" ".env.production")
MISSING_PATTERNS=()

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if grep -q "^${pattern}$" .gitignore 2>/dev/null; then
        print_status "pass" ".gitignore includes: $pattern"
    else
        MISSING_PATTERNS+=("$pattern")
        print_status "fail" ".gitignore missing: $pattern"
    fi
done

echo ""

###########################################################
# 3. Check local environment files
###########################################################
echo -e "${BOLD}3. Local Environment Files${NC}"

if [ -f ".env.local" ]; then
    print_status "pass" ".env.local exists for development"

    # Check permissions
    PERMS=$(stat -c "%a" .env.local 2>/dev/null || stat -f "%A" .env.local 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        print_status "pass" ".env.local has secure permissions (600)"
    else
        print_status "warn" ".env.local permissions: $PERMS (should be 600)"
    fi
else
    print_status "warn" ".env.local not found (run ./scripts/setup-secrets.sh)"
fi

if [ -f ".env" ]; then
    print_status "warn" ".env exists (should not be in repository)"
fi

echo ""

###########################################################
# 4. Check loaded environment variables
###########################################################
echo -e "${BOLD}4. Environment Variables${NC}"

REQUIRED_VARS=("JWT_SECRET" "DATABASE_URL")
OPTIONAL_VARS=("REDIS_URL" "OPENAI_API_KEY")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        # Check if it's a weak/default value
        if echo "${!var}" | grep -qiE "your-|change-|secret|password|test|default"; then
            print_status "warn" "$var loaded but appears to be default/weak"
        else
            # Check length
            if [ ${#!var} -ge 32 ]; then
                print_status "pass" "$var loaded (${#!var} chars)"
            else
                print_status "warn" "$var loaded but short (${#!var} chars, should be 32+)"
            fi
        fi
    else
        print_status "fail" "$var not loaded"
    fi
done

for var in "${OPTIONAL_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        print_status "info" "$var loaded (optional)"
    else
        print_status "info" "$var not loaded (optional)"
    fi
done

echo ""

###########################################################
# 5. Check for hardcoded secrets in code
###########################################################
echo -e "${BOLD}5. Code Security Scan${NC}"

# Quick scan for common patterns
HARDCODED_SECRETS=$(git grep -iE "password\s*=\s*['\"][^'\"]{3,}['\"]" -- '*.ts' '*.tsx' '*.js' | grep -v ".test\." | grep -v ".example" | wc -l | tr -d ' ')

if [ "$HARDCODED_SECRETS" = "0" ]; then
    print_status "pass" "No obvious hardcoded secrets in code"
else
    print_status "fail" "Found $HARDCODED_SECRETS potential hardcoded secrets"
fi

# Check for API keys in code
API_KEYS=$(git grep -iE "api[_-]?key\s*=\s*['\"][A-Za-z0-9]{20,}['\"]" -- '*.ts' '*.tsx' '*.js' | wc -l | tr -d ' ')

if [ "$API_KEYS" = "0" ]; then
    print_status "pass" "No hardcoded API keys found"
else
    print_status "warn" "Found $API_KEYS potential hardcoded API keys"
fi

echo ""

###########################################################
# 6. Check secrets management setup
###########################################################
echo -e "${BOLD}6. Secrets Management Setup${NC}"

# Check for Doppler
if command -v doppler &> /dev/null; then
    print_status "pass" "Doppler CLI installed"

    if doppler whoami &> /dev/null; then
        print_status "pass" "Doppler authenticated"
    else
        print_status "info" "Doppler not logged in (run: doppler login)"
    fi
else
    print_status "info" "Doppler not installed (optional)"
fi

# Check for AWS CLI
if command -v aws &> /dev/null; then
    print_status "info" "AWS CLI installed"

    if aws sts get-caller-identity &> /dev/null 2>&1; then
        print_status "pass" "AWS credentials configured"
    else
        print_status "info" "AWS not configured (optional)"
    fi
else
    print_status "info" "AWS CLI not installed (optional)"
fi

# Check for Vault
if command -v vault &> /dev/null; then
    print_status "info" "HashiCorp Vault installed"
else
    print_status "info" "Vault not installed (optional)"
fi

echo ""

###########################################################
# 7. Check security tools
###########################################################
echo -e "${BOLD}7. Security Tools${NC}"

# Check if audit script exists
if [ -x "./scripts/audit-secrets.sh" ]; then
    print_status "pass" "Audit script available and executable"
else
    print_status "warn" "Audit script not found or not executable"
fi

# Check if setup script exists
if [ -x "./scripts/setup-secrets.sh" ]; then
    print_status "pass" "Setup script available and executable"
else
    print_status "warn" "Setup script not found or not executable"
fi

# Check for pre-commit hooks
if [ -d ".git/hooks" ] && [ -f ".git/hooks/pre-commit" ]; then
    print_status "info" "Pre-commit hooks configured"
else
    print_status "info" "No pre-commit hooks (consider adding)"
fi

echo ""

###########################################################
# 8. Database connectivity
###########################################################
echo -e "${BOLD}8. Database Connectivity${NC}"

if [ -n "$DATABASE_URL" ]; then
    # Try to connect (only if psql is available)
    if command -v psql &> /dev/null; then
        if timeout 5 psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
            print_status "pass" "Database connection successful"
        else
            print_status "warn" "Database connection failed (may not be running)"
        fi
    else
        print_status "info" "psql not available, cannot test connection"
    fi
else
    print_status "info" "DATABASE_URL not set, skipping connection test"
fi

echo ""

###########################################################
# Summary
###########################################################
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Summary${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL=$((PASS + WARN + FAIL))
SCORE=$((PASS * 100 / TOTAL))

echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo ""
echo -e "  ${BOLD}Score: ${SCORE}%${NC}"

if [ $SCORE -ge 90 ]; then
    echo -e "  ${GREEN}${BOLD}Status: EXCELLENT${NC}"
    echo -e "  Your secrets management is in good shape!"
elif [ $SCORE -ge 70 ]; then
    echo -e "  ${YELLOW}${BOLD}Status: GOOD${NC}"
    echo -e "  Some improvements recommended."
elif [ $SCORE -ge 50 ]; then
    echo -e "  ${YELLOW}${BOLD}Status: NEEDS IMPROVEMENT${NC}"
    echo -e "  Several issues need attention."
else
    echo -e "  ${RED}${BOLD}Status: CRITICAL${NC}"
    echo -e "  Immediate action required!"
fi

echo ""

###########################################################
# Recommendations
###########################################################
if [ $FAIL -gt 0 ] || [ $WARN -gt 3 ]; then
    echo -e "${BOLD}Recommended Actions:${NC}"
    echo ""

    if [ -n "$ENV_IN_GIT" ]; then
        echo -e "  1. ${RED}Remove .env files from git:${NC}"
        echo "     git rm --cached .env.test .env.transformation"
        echo "     git commit -m 'Remove tracked .env files'"
        echo ""
    fi

    if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
        echo -e "  2. ${YELLOW}Update .gitignore:${NC}"
        for pattern in "${MISSING_PATTERNS[@]}"; do
            echo "     echo '$pattern' >> .gitignore"
        done
        echo ""
    fi

    if [ ! -f ".env.local" ]; then
        echo -e "  3. ${YELLOW}Setup local development:${NC}"
        echo "     ./scripts/setup-secrets.sh"
        echo ""
    fi

    if [ "$HARDCODED_SECRETS" != "0" ]; then
        echo -e "  4. ${RED}Remove hardcoded secrets:${NC}"
        echo "     ./scripts/audit-secrets.sh"
        echo "     # Review and fix reported issues"
        echo ""
    fi

    echo -e "  5. ${BLUE}Read the full guide:${NC}"
    echo "     cat SECRETS_MANAGEMENT_URGENT_GUIDE.md"
    echo ""
fi

###########################################################
# Next Steps
###########################################################
echo -e "${BOLD}Next Steps:${NC}"
echo ""

if [ ! -x "./scripts/audit-secrets.sh" ]; then
    echo "  • Make scripts executable: chmod +x scripts/*.sh"
fi

if [ ! -f ".env.local" ]; then
    echo "  • Run setup: ./scripts/setup-secrets.sh"
fi

echo "  • Run full audit: ./scripts/audit-secrets.sh"
echo "  • Read guide: SECRETS_MANAGEMENT_URGENT_GUIDE.md"
echo "  • Read summary: SECRETS_SECURITY_SUMMARY.md"
echo ""

# Exit with appropriate code
if [ $FAIL -gt 0 ]; then
    exit 1
elif [ $WARN -gt 5 ]; then
    exit 2
else
    exit 0
fi

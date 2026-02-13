#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           GitHub Templates Validation Script                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1 exists"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌${NC} $1 NOT FOUND"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check file size
check_size() {
    if [ -f "$1" ]; then
        SIZE=$(wc -l < "$1")
        if [ "$SIZE" -gt "$2" ]; then
            echo -e "   ${GREEN}→${NC} Size: $SIZE lines (> $2 minimum)"
        else
            echo -e "   ${YELLOW}⚠${NC} Size: $SIZE lines (< $2 expected)"
        fi
    fi
}

# Function to check YAML frontmatter
check_yaml() {
    if [ -f "$1" ]; then
        if head -1 "$1" | grep -q "^---$"; then
            echo -e "   ${GREEN}→${NC} Valid YAML frontmatter detected"
        else
            echo -e "   ${YELLOW}⚠${NC} No YAML frontmatter found"
        fi
    fi
}

echo "📋 Checking Templates..."
echo "─────────────────────────────────────────────────────────────────"

# Bug Report Template
check_file ".github/ISSUE_TEMPLATE/bug_report.md"
check_size ".github/ISSUE_TEMPLATE/bug_report.md" 100
check_yaml ".github/ISSUE_TEMPLATE/bug_report.md"
echo ""

# Feature Request Template
check_file ".github/ISSUE_TEMPLATE/feature_request.md"
check_size ".github/ISSUE_TEMPLATE/feature_request.md" 150
check_yaml ".github/ISSUE_TEMPLATE/feature_request.md"
echo ""

# Config
check_file ".github/ISSUE_TEMPLATE/config.yml"
check_size ".github/ISSUE_TEMPLATE/config.yml" 20
echo ""

# PR Template
check_file ".github/PULL_REQUEST_TEMPLATE.md"
check_size ".github/PULL_REQUEST_TEMPLATE.md" 250
echo ""

# CODEOWNERS
check_file ".github/CODEOWNERS"
check_size ".github/CODEOWNERS" 200
echo ""

# CI Workflow
check_file ".github/workflows/ci.yml"
echo ""

echo "📚 Checking Documentation..."
echo "─────────────────────────────────────────────────────────────────"

# Documentation files
check_file "GITHUB_TEMPLATES_REPORT.md"
check_size "GITHUB_TEMPLATES_REPORT.md" 700
echo ""

check_file "GITHUB_TEMPLATES_QUICK_START.md"
echo ""

check_file "GITHUB_TEMPLATES_EXAMPLES.md"
check_size "GITHUB_TEMPLATES_EXAMPLES.md" 400
echo ""

check_file "GITHUB_TEMPLATES_SUMMARY.txt"
echo ""

# Summary
echo "═════════════════════════════════════════════════════════════════"
echo "                          SUMMARY                                 "
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "Total Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ ALL TEMPLATES VALIDATED SUCCESSFULLY  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ VALIDATION FAILED                     ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
    exit 1
fi

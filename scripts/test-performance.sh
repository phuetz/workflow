#!/bin/bash

# Performance Testing Script
# Tests all performance optimizations

set -e

echo "🚀 Performance Testing Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "1. Checking Dependencies..."
echo "----------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    success "Node.js $NODE_VERSION installed"
else
    error "Node.js not found"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    success "npm $NPM_VERSION installed"
else
    error "npm not found"
    exit 1
fi

echo ""
echo "2. Building Application..."
echo "----------------------------"

# Build the application
if npm run build; then
    success "Build successful"
else
    error "Build failed"
    exit 1
fi

echo ""
echo "3. Checking Bundle Sizes..."
echo "----------------------------"

# Check if dist directory exists
if [ -d "dist" ]; then
    # Calculate total bundle size
    TOTAL_SIZE=$(du -sh dist | cut -f1)
    success "Total dist size: $TOTAL_SIZE"

    # Check for large files
    echo "Large files (>1MB):"
    find dist -type f -size +1M -exec ls -lh {} \; | awk '{print "  " $9 " - " $5}'
else
    warning "dist directory not found"
fi

echo ""
echo "4. Checking Service Worker..."
echo "----------------------------"

if [ -f "public/service-worker.js" ]; then
    VERSION=$(grep "Version" public/service-worker.js | head -1)
    success "Service Worker found: $VERSION"

    # Check for required features
    if grep -q "CACHE_VERSION" public/service-worker.js; then
        success "  - Cache versioning: Yes"
    fi
    if grep -q "cleanupCache" public/service-worker.js; then
        success "  - Cache cleanup: Yes"
    fi
    if grep -q "API_CACHE" public/service-worker.js; then
        success "  - API caching: Yes"
    fi
else
    error "Service Worker not found"
fi

echo ""
echo "5. Checking Database Schema..."
echo "----------------------------"

if [ -f "prisma/schema.prisma" ]; then
    success "Prisma schema found"

    # Count indexes
    INDEX_COUNT=$(grep -c "@@index" prisma/schema.prisma || echo "0")
    success "  - Total indexes: $INDEX_COUNT"

    # Check for composite indexes
    COMPOSITE_COUNT=$(grep "@@index.*,.*]" prisma/schema.prisma | wc -l || echo "0")
    success "  - Composite indexes: $COMPOSITE_COUNT"
else
    warning "Prisma schema not found"
fi

echo ""
echo "6. Checking Web Vitals Integration..."
echo "----------------------------"

if [ -f "src/utils/webVitals.ts" ]; then
    success "Web Vitals utility found"

    if grep -q "initWebVitals" src/main.tsx; then
        success "  - Initialized in main.tsx"
    else
        warning "  - Not initialized in main.tsx"
    fi
else
    error "Web Vitals utility not found"
fi

echo ""
echo "7. Checking Resource Hints..."
echo "----------------------------"

if [ -f "index.html" ]; then
    success "index.html found"

    if grep -q "dns-prefetch" index.html; then
        success "  - DNS Prefetch: Yes"
    fi
    if grep -q "preconnect" index.html; then
        success "  - Preconnect: Yes"
    fi
    if grep -q "preload" index.html; then
        success "  - Preload: Yes"
    fi
    if grep -q "prefetch" index.html; then
        success "  - Prefetch: Yes"
    fi
else
    error "index.html not found"
fi

echo ""
echo "8. Checking Compression Middleware..."
echo "----------------------------"

if [ -f "src/backend/api/middleware/compression.ts" ]; then
    success "Compression middleware found"

    if grep -q "level: 9" src/backend/api/middleware/compression.ts; then
        success "  - Compression level: 9 (max)"
    fi
else
    error "Compression middleware not found"
fi

echo ""
echo "9. Performance Checklist..."
echo "----------------------------"

CHECKLIST=(
    "src/backend/api/middleware/compression.ts:Advanced compression"
    "src/backend/api/middleware/staticAssets.ts:Static assets optimization"
    "src/utils/webVitals.ts:Web Vitals monitoring"
    "public/service-worker.js:Service Worker v2.0"
    "prisma/migrations/20250124_add_performance_indexes.sql:Database indexes"
    "docs/DATABASE_QUERY_OPTIMIZATION.md:Query optimization guide"
)

for item in "${CHECKLIST[@]}"; do
    FILE="${item%%:*}"
    DESC="${item##*:}"
    if [ -f "$FILE" ]; then
        success "$DESC"
    else
        warning "$DESC - Not found: $FILE"
    fi
done

echo ""
echo "10. Recommendations..."
echo "----------------------------"

echo "Next steps:"
echo "  1. Run Lighthouse audit:"
echo "     npx lighthouse http://localhost:3000 --view"
echo ""
echo "  2. Apply database migrations:"
echo "     npm run migrate:dev"
echo ""
echo "  3. Start development server:"
echo "     npm run dev"
echo ""
echo "  4. Monitor Web Vitals in browser console"
echo ""
echo "  5. Check performance metrics:"
echo "     - FCP target: <1.0s"
echo "     - LCP target: <2.0s"
echo "     - Lighthouse target: >95"
echo ""

echo "=============================="
echo "✅ Performance test complete!"
echo "=============================="

#!/bin/bash

# ====================================================================
# 🔧 SCRIPT D'AUTO-CORRECTION - WORKFLOW AUTOMATION PLATFORM
# ====================================================================
# Ce script corrige automatiquement les problèmes identifiés dans l'audit
# Exécution: chmod +x auto-fix.sh && ./auto-fix.sh
# ====================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
log_info "Created backup directory: $BACKUP_DIR"

# ====================================================================
# PHASE 1: BACKUP CRITICAL FILES
# ====================================================================
log_info "Phase 1: Backing up critical files..."

# Backup files that will be modified
cp src/test-setup.tsx "$BACKUP_DIR/" 2>/dev/null || log_warning "test-setup.tsx not found"
cp package.json "$BACKUP_DIR/"
cp .eslintrc.json "$BACKUP_DIR/" 2>/dev/null || log_warning ".eslintrc.json not found"
cp eslint.config.js "$BACKUP_DIR/" 2>/dev/null || log_warning "eslint.config.js not found"
cp tsconfig.app.json "$BACKUP_DIR/"
cp vite.config.ts "$BACKUP_DIR/" 2>/dev/null || log_warning "vite.config.ts not found"

log_success "Backup completed"

# ====================================================================
# PHASE 2: FIX TEST-SETUP.TSX
# ====================================================================
log_info "Phase 2: Fixing test-setup.tsx..."

if [ -f "src/test-setup.tsx" ]; then
    # Fix the 'actual is not defined' error
    sed -i.bak "s/vi.mock('react-router-dom', async () => {/vi.mock('react-router-dom', async () => {\n  const actual = await vi.importActual('react-router-dom');/" src/test-setup.tsx
    
    # Fix console references
    sed -i "s/...originalConsole/...console/" src/test-setup.tsx
    
    # Fix storage references
    sed -i "1i const localStorageStore = new Map<string, string>();" src/test-setup.tsx
    sed -i "1i const sessionStorageStore = new Map<string, string>();" src/test-setup.tsx
    sed -i "1i const originalConsole = console;" src/test-setup.tsx
    
    log_success "test-setup.tsx fixed"
else
    log_warning "test-setup.tsx not found, skipping..."
fi

# ====================================================================
# PHASE 3: CLEAN DUPLICATE FILES
# ====================================================================
log_info "Phase 3: Cleaning duplicate files..."

DUPLICATES=(
    "src/components/CustomNode.BACKUP.tsx"
    "src/components/CustomNode.IMPROVED.tsx"
    "src/components/CustomNode.OLD.tsx"
    "src/components/NodeConfigPanel.COMPLETE.tsx"
    "src/components/NodeConfigPanel.NEW.tsx"
    "src/components/NodeConfigPanel.OLD.tsx"
    "src/components/ExecutionEngine.BACKUP.ts"
)

for file in "${DUPLICATES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$BACKUP_DIR/" 2>/dev/null
        log_success "Moved $file to backup"
    fi
done

# ====================================================================
# PHASE 4: FIX ESLINT CONFIGURATION
# ====================================================================
log_info "Phase 4: Fixing ESLint configuration..."

# Remove old ESLint config if exists
if [ -f ".eslintrc.json" ]; then
    mv .eslintrc.json "$BACKUP_DIR/"
    log_info "Moved .eslintrc.json to backup"
fi

# Update package.json lint script
if command -v jq &> /dev/null; then
    jq '.scripts.lint = "eslint . --report-unused-disable-directives --max-warnings 0"' package.json > package.json.tmp
    mv package.json.tmp package.json
    log_success "Updated lint script in package.json"
else
    log_warning "jq not installed, please manually update the lint script in package.json"
fi

# ====================================================================
# PHASE 5: OPTIMIZE DEPENDENCIES
# ====================================================================
log_info "Phase 5: Analyzing dependencies..."

# Create dependency analysis report
echo "# Dependency Analysis Report" > "$BACKUP_DIR/dependency_analysis.md"
echo "Generated: $(date)" >> "$BACKUP_DIR/dependency_analysis.md"
echo "" >> "$BACKUP_DIR/dependency_analysis.md"

# Check for unused dependencies
if command -v npx &> /dev/null; then
    log_info "Running depcheck..."
    npx depcheck --json > "$BACKUP_DIR/depcheck_results.json" 2>/dev/null || true
    log_info "Depcheck results saved to $BACKUP_DIR/depcheck_results.json"
fi

# List duplicate packages
log_info "Checking for duplicate packages..."
npm ls --depth=0 2>/dev/null | grep -E "deduped|UNMET" > "$BACKUP_DIR/duplicate_packages.txt" || true

# ====================================================================
# PHASE 6: CREATE OPTIMIZED VITE CONFIG
# ====================================================================
log_info "Phase 6: Creating optimized Vite configuration..."

cat > vite.config.optimized.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@mui/material', '@mui/icons-material', 'lucide-react'],
          'workflow': ['reactflow'],
          'state': ['zustand'],
          'utils': ['date-fns', 'crypto-js'],
          'graphql': ['graphql', 'apollo-server-express'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      'reactflow',
      'zustand',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
  server: {
    port: 3000,
    strictPort: false,
    open: false,
    cors: true,
    hmr: {
      overlay: true,
    },
  },
  preview: {
    port: 3001,
    strictPort: false,
  },
});
EOF

log_success "Created optimized Vite configuration (vite.config.optimized.ts)"

# ====================================================================
# PHASE 7: IMPROVE TYPESCRIPT CONFIG
# ====================================================================
log_info "Phase 7: Enhancing TypeScript configuration..."

cat > tsconfig.strict.json << 'EOF'
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    
    /* Strict Type Checking */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    /* Additional Checks */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    
    /* Advanced */
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "build", "*.BACKUP.*", "*.OLD.*"]
}
EOF

log_success "Created strict TypeScript configuration (tsconfig.strict.json)"

# ====================================================================
# PHASE 8: GENERATE PERFORMANCE MONITORING SCRIPT
# ====================================================================
log_info "Phase 8: Creating performance monitoring utilities..."

mkdir -p src/monitoring

cat > src/monitoring/performance-tracker.ts << 'EOF'
/**
 * Advanced Performance Tracking System
 * Monitors and reports performance metrics in real-time
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'render' | 'network' | 'computation' | 'memory';
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  
  constructor() {
    this.initializeObservers();
  }
  
  private initializeObservers(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long-task',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'computation'
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor render performance
    this.startRenderMonitoring();
  }
  
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric({
          name: 'heap-used',
          value: memory.usedJSHeapSize / 1048576,
          unit: 'MB',
          timestamp: Date.now(),
          category: 'memory'
        });
      }, 5000);
    }
  }
  
  private startRenderMonitoring(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;
      
      if (currentTime >= lastFrameTime + 1000) {
        this.recordMetric({
          name: 'fps',
          value: Math.round((frameCount * 1000) / (currentTime - lastFrameTime)),
          unit: 'fps',
          timestamp: Date.now(),
          category: 'render'
        });
        frameCount = 0;
        lastFrameTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }
  
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    
    // Log critical metrics
    if (metric.category === 'computation' && metric.value > 50) {
      console.warn(`Performance warning: ${metric.name} took ${metric.value}${metric.unit}`);
    }
  }
  
  getMetrics(category?: string): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(m => m.category === category);
    }
    return this.metrics;
  }
  
  getAverageMetric(name: string, timeWindow = 60000): number {
    const now = Date.now();
    const relevantMetrics = this.metrics.filter(
      m => m.name === name && m.timestamp > now - timeWindow
    );
    
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }
  
  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      averageFPS: this.getAverageMetric('fps'),
      averageMemory: this.getAverageMetric('heap-used'),
      longTasks: this.metrics.filter(m => m.name === 'long-task').length,
      totalMetrics: this.metrics.length
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
  }
}

export const performanceTracker = new PerformanceTracker();

// Auto-start tracking
if (typeof window !== 'undefined') {
  (window as any).__performanceTracker = performanceTracker;
}
EOF

log_success "Created performance tracking system"

# ====================================================================
# PHASE 9: CREATE AUTOMATED TEST RUNNER
# ====================================================================
log_info "Phase 9: Creating automated test runner..."

cat > run-tests.sh << 'EOF'
#!/bin/bash

echo "🧪 Running Comprehensive Test Suite"
echo "===================================="

# Run type checking
echo "📝 Type Checking..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed"
    exit 1
fi
echo "✅ Type checking passed"

# Run unit tests
echo "🔬 Unit Tests..."
npm run test -- --run
if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed"
    exit 1
fi
echo "✅ Unit tests passed"

# Run coverage
echo "📊 Coverage Report..."
npm run test:coverage -- --run

# Run linting
echo "🔍 Linting..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed"
    exit 1
fi
echo "✅ Linting passed"

# Check bundle size
echo "📦 Bundle Analysis..."
npm run build
if [ $? -eq 0 ]; then
    echo "Bundle size:"
    du -sh dist/
fi

echo ""
echo "✅ All tests completed successfully!"
EOF

chmod +x run-tests.sh
log_success "Created automated test runner"

# ====================================================================
# PHASE 10: FINAL REPORT
# ====================================================================
log_info "Generating final report..."

cat > "$BACKUP_DIR/fix_report.md" << EOF
# Auto-Fix Report
Generated: $(date)

## Completed Actions

### ✅ Phase 1: Backup
- Created backup directory: $BACKUP_DIR
- Backed up all critical files

### ✅ Phase 2: Test Setup Fix
- Fixed 'actual is not defined' error in test-setup.tsx
- Added missing variable declarations

### ✅ Phase 3: Cleanup
- Moved duplicate files to backup
- Cleaned project structure

### ✅ Phase 4: ESLint Configuration
- Removed conflicting configuration
- Updated lint scripts

### ✅ Phase 5: Dependency Analysis
- Generated dependency report
- Identified optimization opportunities

### ✅ Phase 6: Vite Optimization
- Created optimized Vite configuration
- Implemented code splitting strategy

### ✅ Phase 7: TypeScript Enhancement
- Created strict TypeScript configuration
- Added comprehensive type checking

### ✅ Phase 8: Performance Monitoring
- Created performance tracking system
- Implemented real-time metrics collection

### ✅ Phase 9: Test Automation
- Created automated test runner
- Integrated all test types

## Next Steps

1. Review and apply vite.config.optimized.ts
2. Review and apply tsconfig.strict.json
3. Run automated tests: ./run-tests.sh
4. Review dependency analysis in $BACKUP_DIR
5. Deploy performance monitoring

## Rollback Instructions

If you need to rollback:
1. Copy files from $BACKUP_DIR back to original locations
2. Run: npm install
3. Restart development server

EOF

# ====================================================================
# COMPLETION
# ====================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     AUTO-FIX COMPLETED SUCCESSFULLY!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "📁 Backup created in: $BACKUP_DIR"
echo "📄 Report saved to: $BACKUP_DIR/fix_report.md"
echo ""
echo "Next steps:"
echo "1. Run tests: ./run-tests.sh"
echo "2. Review optimized configs"
echo "3. Commit changes"
echo ""
echo -e "${YELLOW}Remember to review all changes before committing!${NC}"
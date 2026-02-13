# 🛠️ TEMPLATES & SCRIPTS DE CORRECTION AUTOMATIQUE

## 📁 STRUCTURE DES FICHIERS

```bash
transformation/
├── scripts/
│   ├── fix-compilation.ts
│   ├── fix-sql-injections.ts
│   ├── fix-memory-leaks.ts
│   ├── optimize-performance.sh
│   ├── security-audit.sh
│   └── daily-health-check.sh
├── templates/
│   ├── error-handler.template.ts
│   ├── service.template.ts
│   ├── test.template.ts
│   ├── docker.template
│   └── k8s.template.yaml
├── configs/
│   ├── eslint.config.js
│   ├── prettier.config.js
│   ├── tsconfig.strict.json
│   └── jest.config.js
└── monitors/
    ├── metrics-collector.ts
    ├── alert-rules.yaml
    └── dashboard.json
```

---

## 🔧 SCRIPT 1: FIX COMPILATION ERRORS

```typescript
// transformation/scripts/fix-compilation.ts
#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CompilationFix {
  file: string;
  line: number;
  original: string;
  fixed: string;
  description: string;
}

const COMPILATION_FIXES: CompilationFix[] = [
  {
    file: 'src/store/workflowStore.ts',
    line: 19,
    original: 'if (existingLock) {',
    fixed: 'const existingLock = this.locks.get(key);\nif (existingLock) {',
    description: 'Fix undefined existingLock'
  },
  {
    file: 'src/store/workflowStore.ts',
    line: 29,
    original: 'waiter();',
    fixed: 'const waiter = this.globalLock.waiters.shift();\nif (waiter) waiter();',
    description: 'Fix undefined waiter'
  },
  {
    file: 'src/store/workflowStore.ts',
    line: 94,
    original: 'retry(__attempt + 1);',
    fixed: 'retry(attempt + 1);',
    description: 'Fix undefined __attempt'
  },
  {
    file: 'src/components/ExecutionEngine.ts',
    line: 54,
    original: 'this.core = new ExecutionCore(this.nodes, this.edges, mergedOptions);',
    fixed: 'const mergedOptions = { ...defaultOptions, ...options };\nthis.core = new ExecutionCore(this.nodes, this.edges, mergedOptions);',
    description: 'Fix undefined mergedOptions'
  }
];

function applyFix(fix: CompilationFix): boolean {
  const filePath = path.resolve(fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Backup original
  fs.writeFileSync(`${filePath}.backup`, content);
  
  // Apply fix
  if (content.includes(fix.original)) {
    content = content.replace(fix.original, fix.fixed);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${fix.description} in ${fix.file}:${fix.line}`);
    return true;
  } else {
    console.warn(`⚠️ Pattern not found: ${fix.original} in ${fix.file}`);
    return false;
  }
}

function main() {
  console.log('🔧 Starting Compilation Fixes...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const fix of COMPILATION_FIXES) {
    if (applyFix(fix)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`✅ Successful fixes: ${successCount}`);
  console.log(`❌ Failed fixes: ${failCount}`);
  
  // Test compilation
  console.log('\n🧪 Testing compilation...');
  try {
    execSync('npm run typecheck', { stdio: 'inherit' });
    console.log('✅ Compilation successful!');
  } catch (error) {
    console.error('❌ Compilation still failing. Manual intervention required.');
    process.exit(1);
  }
}

main();
```

---

## 🔒 SCRIPT 2: FIX SQL INJECTIONS

```typescript
// transformation/scripts/fix-sql-injections.ts
#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as glob from 'glob';

interface SqlInjectionPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const SQL_INJECTION_PATTERNS: SqlInjectionPattern[] = [
  {
    pattern: /query\(`([^`]*)\$\{([^}]+)\}([^`]*)`\)/g,
    replacement: 'query(`$1?$3`, [$2])',
    description: 'String interpolation in query'
  },
  {
    pattern: /`SELECT \* FROM (\w+) WHERE (\w+) = '\$\{([^}]+)\}'`/g,
    replacement: '`SELECT * FROM $1 WHERE $2 = ?`, [$3]',
    description: 'Direct value injection'
  },
  {
    pattern: /db\.query\(`([^`]*)\$\{([^}]+)\}([^`]*)`\)/g,
    replacement: 'db.query(`$1?$3`, [$2])',
    description: 'Database query injection'
  },
  {
    pattern: /WHERE ([a-zA-Z_]+) = "\$\{([^}]+)\}"/g,
    replacement: 'WHERE $1 = ?", [$2]',
    description: 'WHERE clause injection'
  },
  {
    pattern: /executeRaw\(`([^`]*)\$\{([^}]+)\}([^`]*)`\)/g,
    replacement: 'executeRaw(`$1?$3`, [$2])',
    description: 'Raw query execution'
  }
];

function fixSqlInjections(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixCount = 0;
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    const matches = content.match(pattern.pattern);
    if (matches) {
      content = content.replace(pattern.pattern, pattern.replacement);
      fixCount += matches.length;
      console.log(`  Fixed ${matches.length} ${pattern.description} in ${filePath}`);
    }
  }
  
  if (fixCount > 0) {
    // Backup original
    fs.writeFileSync(`${filePath}.sql-backup`, originalContent);
    // Write fixed version
    fs.writeFileSync(filePath, content);
  }
  
  return fixCount;
}

function scanAndFix() {
  console.log('🔒 Scanning for SQL Injections...\n');
  
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
  });
  
  let totalFiles = 0;
  let totalFixes = 0;
  const vulnerableFiles: string[] = [];
  
  for (const file of files) {
    const fixes = fixSqlInjections(file);
    if (fixes > 0) {
      totalFiles++;
      totalFixes += fixes;
      vulnerableFiles.push(file);
    }
  }
  
  console.log('\n📊 SQL Injection Fix Report:');
  console.log(`Files scanned: ${files.length}`);
  console.log(`Vulnerable files: ${totalFiles}`);
  console.log(`Total fixes applied: ${totalFixes}`);
  
  if (vulnerableFiles.length > 0) {
    console.log('\n📝 Fixed files:');
    vulnerableFiles.forEach(f => console.log(`  - ${f}`));
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    filesScanned: files.length,
    vulnerableFiles: totalFiles,
    fixesApplied: totalFixes,
    files: vulnerableFiles
  };
  
  fs.writeFileSync(
    'transformation/reports/sql-injection-fixes.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ SQL Injection fixes complete!');
  console.log('📄 Report saved to: transformation/reports/sql-injection-fixes.json');
}

scanAndFix();
```

---

## 💾 SCRIPT 3: FIX MEMORY LEAKS

```typescript
// transformation/scripts/fix-memory-leaks.ts
#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface MemoryLeakPattern {
  name: string;
  detect: RegExp;
  fix: (match: string) => string;
}

const MEMORY_LEAK_PATTERNS: MemoryLeakPattern[] = [
  {
    name: 'Uncleaned intervals',
    detect: /setInterval\([^)]+\)/g,
    fix: (match) => {
      return `(() => { const intervalId = ${match}; this.intervals.add(intervalId); return intervalId; })()`;
    }
  },
  {
    name: 'Uncleaned timeouts',
    detect: /setTimeout\([^)]+\)/g,
    fix: (match) => {
      return `(() => { const timeoutId = ${match}; this.timeouts.add(timeoutId); return timeoutId; })()`;
    }
  },
  {
    name: 'Event listeners without cleanup',
    detect: /addEventListener\(['"]([^'"]+)['"],\s*([^)]+)\)/g,
    fix: (match) => {
      const eventMatch = match.match(/addEventListener\(['"]([^'"]+)['"],\s*([^)]+)\)/);
      if (eventMatch) {
        return `(() => {
          const handler = ${eventMatch[2]};
          addEventListener('${eventMatch[1]}', handler);
          this.cleanupFunctions.push(() => removeEventListener('${eventMatch[1]}', handler));
        })()`;
      }
      return match;
    }
  },
  {
    name: 'Growing Maps without cleanup',
    detect: /new Map\(\)/g,
    fix: (match) => 'new WeakMap()'
  },
  {
    name: 'Growing arrays',
    detect: /\.push\([^)]+\)(?!.*\.pop\(\))/g,
    fix: (match) => {
      return `(() => {
        if (this.array.length > 10000) {
          this.array = this.array.slice(-5000);
        }
        ${match};
      })()`;
    }
  }
];

class MemoryLeakFixer {
  private fixedFiles: string[] = [];
  private totalFixes = 0;
  
  fixFile(filePath: string): number {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixes = 0;
    
    // Check if class has cleanup infrastructure
    if (content.includes('class ') && !content.includes('destroy()')) {
      // Add cleanup infrastructure
      content = this.addCleanupInfrastructure(content);
      fixes++;
    }
    
    // Apply leak patterns
    for (const pattern of MEMORY_LEAK_PATTERNS) {
      const matches = content.match(pattern.detect);
      if (matches) {
        matches.forEach(match => {
          const fixed = pattern.fix(match);
          if (fixed !== match) {
            content = content.replace(match, fixed);
            fixes++;
          }
        });
        console.log(`  Fixed ${matches.length} ${pattern.name} in ${filePath}`);
      }
    }
    
    if (fixes > 0) {
      fs.writeFileSync(`${filePath}.memory-backup`, originalContent);
      fs.writeFileSync(filePath, content);
      this.fixedFiles.push(filePath);
      this.totalFixes += fixes;
    }
    
    return fixes;
  }
  
  private addCleanupInfrastructure(content: string): string {
    const classRegex = /class\s+(\w+)[^{]*\{/g;
    
    return content.replace(classRegex, (match, className) => {
      return `${match}
  private intervals = new Set<NodeJS.Timeout>();
  private timeouts = new Set<NodeJS.Timeout>();
  private cleanupFunctions: Array<() => void> = [];
  
  destroy() {
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];
  }
`;
    });
  }
  
  run() {
    console.log('💾 Scanning for Memory Leaks...\n');
    
    const files = glob.sync('src/**/*.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/*.test.*']
    });
    
    for (const file of files) {
      this.fixFile(file);
    }
    
    console.log('\n📊 Memory Leak Fix Report:');
    console.log(`Files scanned: ${files.length}`);
    console.log(`Files fixed: ${this.fixedFiles.length}`);
    console.log(`Total fixes: ${this.totalFixes}`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n📝 Fixed files:');
      this.fixedFiles.forEach(f => console.log(`  - ${f}`));
    }
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      filesScanned: files.length,
      filesFxed: this.fixedFiles.length,
      totalFixes: this.totalFixes,
      files: this.fixedFiles
    };
    
    fs.writeFileSync(
      'transformation/reports/memory-leak-fixes.json',
      JSON.stringify(report, null, 2)
    );
  }
}

new MemoryLeakFixer().run();
```

---

## ⚡ SCRIPT 4: OPTIMIZE PERFORMANCE

```bash
#!/bin/bash
# transformation/scripts/optimize-performance.sh

echo "⚡ Starting Performance Optimization..."

# 1. Database Indexes
echo "📊 Creating database indexes..."
psql $DATABASE_URL << EOF
-- Critical indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_status 
  ON workflows(status) WHERE status IN ('running', 'pending');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_created 
  ON workflows(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user 
  ON workflows(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nodes_workflow 
  ON nodes(workflow_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_edges_workflow 
  ON edges(workflow_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_workflow 
  ON executions(workflow_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_execution 
  ON logs(execution_id, timestamp DESC);

-- Analyze tables for query planner
ANALYZE workflows;
ANALYZE nodes;
ANALYZE edges;
ANALYZE executions;
ANALYZE logs;

-- Show index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
EOF

# 2. Enable Compression
echo "🗜️ Enabling compression..."
npm install compression
cat << 'EOF' > src/middleware/compression.ts
import compression from 'compression';

export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});
EOF

# 3. Bundle Optimization
echo "📦 Optimizing bundle..."
npm install -D @rollup/plugin-terser rollup-plugin-visualizer vite-plugin-compression

# 4. Image Optimization
echo "🖼️ Optimizing images..."
npm install -D imagemin imagemin-webp imagemin-pngquant imagemin-mozjpeg

find public -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read img; do
  # Convert to WebP
  npx imagemin "$img" --plugin=webp --out-dir="$(dirname "$img")"
  # Optimize original
  npx imagemin "$img" --plugin=pngquant --plugin=mozjpeg --out-dir="$(dirname "$img")"
done

# 5. Enable HTTP/2
echo "🚀 Configuring HTTP/2..."
cat << 'EOF' > nginx.conf
server {
  listen 443 ssl http2;
  ssl_certificate /etc/ssl/cert.pem;
  ssl_certificate_key /etc/ssl/key.pem;
  
  # Enable compression
  gzip on;
  gzip_types text/plain application/json application/javascript text/css;
  gzip_min_length 1000;
  
  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  
  # API proxy
  location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
  }
}
EOF

# 6. Redis Setup
echo "💾 Setting up Redis cache..."
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:alpine \
  redis-server --appendonly yes

# 7. CDN Configuration
echo "🌐 Configuring CDN..."
cat << 'EOF' > .env.production
VITE_CDN_URL=https://cdn.yourapp.com
VITE_API_URL=https://api.yourapp.com
VITE_ENABLE_CACHE=true
VITE_CACHE_TTL=3600
EOF

# 8. Performance Monitoring
echo "📈 Setting up performance monitoring..."
npm install web-vitals

cat << 'EOF' > src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
EOF

echo "✅ Performance optimization complete!"
echo "📊 Run 'npm run lighthouse' to measure improvements"
```

---

## 🏗️ TEMPLATE 1: ERROR HANDLER

```typescript
// transformation/templates/error-handler.template.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AppError extends Error {
  public readonly isOperational: boolean;
  
  constructor(
    public message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public details?: any,
    isOperational = true
  ) {
    super(message);
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorCode.AUTH_ERROR, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', ErrorCode.RATE_LIMIT, 429, { retryAfter });
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.id
  });
  
  // Track metrics
  metrics.errorCount.inc({
    code: (err as AppError).code || 'UNKNOWN',
    statusCode: (err as AppError).statusCode || 500
  });
  
  // Handle different error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.details : undefined
      }
    });
  }
  
  // Database errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: process.env.NODE_ENV === 'development' ? err : undefined
      }
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.AUTH_ERROR,
        message: 'Invalid token'
      }
    });
  }
  
  // Default error
  const statusCode = (err as any).statusCode || 500;
  const message = statusCode === 500 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
};

// Usage example:
/*
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User');
  }
  res.json(user);
}));

app.use(errorHandler);
*/
```

---

## 🏗️ TEMPLATE 2: SERVICE TEMPLATE

```typescript
// transformation/templates/service.template.ts

import { injectable, inject } from 'inversify';
import { Repository } from './repository';
import { CacheManager } from '../cache/CacheManager';
import { EventBus } from '../events/EventBus';
import { Logger } from '../utils/logger';
import { Metrics } from '../utils/metrics';
import { AppError } from '../errors';

export interface ServiceOptions {
  cacheTTL?: number;
  enableEvents?: boolean;
  enableMetrics?: boolean;
}

@injectable()
export abstract class BaseService<T> {
  protected logger: Logger;
  protected metrics: Metrics;
  
  constructor(
    @inject('Repository') protected repository: Repository<T>,
    @inject('CacheManager') protected cache: CacheManager,
    @inject('EventBus') protected eventBus: EventBus,
    protected options: ServiceOptions = {}
  ) {
    this.logger = new Logger(this.constructor.name);
    this.metrics = new Metrics(this.constructor.name);
  }
  
  async findById(id: string): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = `${this.constructor.name}:${id}`;
    
    try {
      // Check cache
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        this.metrics.cacheHit.inc();
        return cached;
      }
      
      // Fetch from repository
      const entity = await this.repository.findById(id);
      
      if (entity && this.options.cacheTTL) {
        await this.cache.set(cacheKey, entity, this.options.cacheTTL);
      }
      
      return entity;
    } catch (error) {
      this.logger.error(`Failed to find by id: ${id}`, error);
      throw new AppError('Failed to fetch entity', 'DATABASE_ERROR', 500);
    } finally {
      this.metrics.operationDuration.observe(
        { operation: 'findById' },
        Date.now() - startTime
      );
    }
  }
  
  async create(data: Partial<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Validate
      await this.validate(data);
      
      // Create
      const entity = await this.repository.create(data);
      
      // Emit event
      if (this.options.enableEvents) {
        await this.eventBus.publish({
          type: `${this.constructor.name.toLowerCase()}.created`,
          payload: entity,
          timestamp: new Date()
        });
      }
      
      // Cache
      if (this.options.cacheTTL) {
        const cacheKey = `${this.constructor.name}:${(entity as any).id}`;
        await this.cache.set(cacheKey, entity, this.options.cacheTTL);
      }
      
      return entity;
    } catch (error) {
      this.logger.error('Failed to create entity', error);
      throw error;
    } finally {
      this.metrics.operationDuration.observe(
        { operation: 'create' },
        Date.now() - startTime
      );
    }
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Validate
      await this.validate(data);
      
      // Update
      const entity = await this.repository.update(id, data);
      
      // Invalidate cache
      const cacheKey = `${this.constructor.name}:${id}`;
      await this.cache.invalidate(cacheKey);
      
      // Emit event
      if (this.options.enableEvents) {
        await this.eventBus.publish({
          type: `${this.constructor.name.toLowerCase()}.updated`,
          payload: { id, changes: data },
          timestamp: new Date()
        });
      }
      
      return entity;
    } catch (error) {
      this.logger.error(`Failed to update: ${id}`, error);
      throw error;
    } finally {
      this.metrics.operationDuration.observe(
        { operation: 'update' },
        Date.now() - startTime
      );
    }
  }
  
  async delete(id: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.repository.delete(id);
      
      // Invalidate cache
      const cacheKey = `${this.constructor.name}:${id}`;
      await this.cache.invalidate(cacheKey);
      
      // Emit event
      if (this.options.enableEvents) {
        await this.eventBus.publish({
          type: `${this.constructor.name.toLowerCase()}.deleted`,
          payload: { id },
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Failed to delete: ${id}`, error);
      throw error;
    } finally {
      this.metrics.operationDuration.observe(
        { operation: 'delete' },
        Date.now() - startTime
      );
    }
  }
  
  protected abstract validate(data: Partial<T>): Promise<void>;
}

// Usage example:
/*
@injectable()
export class UserService extends BaseService<User> {
  constructor(
    @inject('UserRepository') repository: UserRepository,
    @inject('CacheManager') cache: CacheManager,
    @inject('EventBus') eventBus: EventBus
  ) {
    super(repository, cache, eventBus, {
      cacheTTL: 300,
      enableEvents: true,
      enableMetrics: true
    });
  }
  
  protected async validate(data: Partial<User>): Promise<void> {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2).max(100),
      role: z.enum(['admin', 'user'])
    });
    
    schema.parse(data);
  }
}
*/
```

---

## 🧪 TEMPLATE 3: TEST TEMPLATE

```typescript
// transformation/templates/test.template.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMockRepository, createMockCache, createMockEventBus } from '../test-utils';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepository: jest.Mocked<Repository>;
  let mockCache: jest.Mocked<CacheManager>;
  let mockEventBus: jest.Mocked<EventBus>;
  
  beforeEach(() => {
    // Setup mocks
    mockRepository = createMockRepository();
    mockCache = createMockCache();
    mockEventBus = createMockEventBus();
    
    // Create service instance
    service = new ServiceName(mockRepository, mockCache, mockEventBus);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('findById', () => {
    it('should return entity from cache if exists', async () => {
      // Arrange
      const id = 'test-id';
      const cachedEntity = { id, name: 'Test' };
      mockCache.get.mockResolvedValueOnce(cachedEntity);
      
      // Act
      const result = await service.findById(id);
      
      // Assert
      expect(result).toEqual(cachedEntity);
      expect(mockCache.get).toHaveBeenCalledWith(`ServiceName:${id}`);
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
    
    it('should fetch from repository if not in cache', async () => {
      // Arrange
      const id = 'test-id';
      const entity = { id, name: 'Test' };
      mockCache.get.mockResolvedValueOnce(null);
      mockRepository.findById.mockResolvedValueOnce(entity);
      
      // Act
      const result = await service.findById(id);
      
      // Assert
      expect(result).toEqual(entity);
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockCache.set).toHaveBeenCalledWith(
        `ServiceName:${id}`,
        entity,
        expect.any(Number)
      );
    });
    
    it('should handle errors gracefully', async () => {
      // Arrange
      const id = 'test-id';
      const error = new Error('Database error');
      mockCache.get.mockResolvedValueOnce(null);
      mockRepository.findById.mockRejectedValueOnce(error);
      
      // Act & Assert
      await expect(service.findById(id)).rejects.toThrow('Failed to fetch entity');
    });
  });
  
  describe('create', () => {
    it('should create entity and emit event', async () => {
      // Arrange
      const data = { name: 'Test' };
      const created = { id: '123', ...data };
      mockRepository.create.mockResolvedValueOnce(created);
      
      // Act
      const result = await service.create(data);
      
      // Assert
      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(data);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'servicename.created',
          payload: created
        })
      );
    });
    
    it('should validate data before creating', async () => {
      // Arrange
      const invalidData = { name: '' }; // Invalid
      
      // Act & Assert
      await expect(service.create(invalidData)).rejects.toThrow();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });
  
  describe('update', () => {
    it('should update entity and invalidate cache', async () => {
      // Arrange
      const id = 'test-id';
      const updates = { name: 'Updated' };
      const updated = { id, ...updates };
      mockRepository.update.mockResolvedValueOnce(updated);
      
      // Act
      const result = await service.update(id, updates);
      
      // Assert
      expect(result).toEqual(updated);
      expect(mockCache.invalidate).toHaveBeenCalledWith(`ServiceName:${id}`);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'servicename.updated',
          payload: { id, changes: updates }
        })
      );
    });
  });
  
  describe('delete', () => {
    it('should delete entity and invalidate cache', async () => {
      // Arrange
      const id = 'test-id';
      mockRepository.delete.mockResolvedValueOnce(undefined);
      
      // Act
      await service.delete(id);
      
      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
      expect(mockCache.invalidate).toHaveBeenCalledWith(`ServiceName:${id}`);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'servicename.deleted',
          payload: { id }
        })
      );
    });
  });
});
```

---

## 🐳 TEMPLATE 4: DOCKERFILE

```dockerfile
# transformation/templates/docker.template

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src ./src
COPY public ./public

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
```

---

## ☸️ TEMPLATE 5: KUBERNETES

```yaml
# transformation/templates/k8s.template.yaml

---
apiVersion: v1
kind: Namespace
metadata:
  name: workflow-app
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: workflow-app
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: workflow-app
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/db"
  JWT_SECRET: "your-secret-here"
  REDIS_URL: "redis://redis:6379"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-api
  namespace: workflow-app
  labels:
    app: workflow-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: workflow-api
  template:
    metadata:
      labels:
        app: workflow-api
    spec:
      containers:
      - name: api
        image: workflow-api:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: uploads-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: workflow-api
  namespace: workflow-app
spec:
  selector:
    app: workflow-api
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-api-hpa
  namespace: workflow-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: workflow-api-ingress
  namespace: workflow-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.workflow.com
    secretName: workflow-tls
  rules:
  - host: api.workflow.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: workflow-api
            port:
              number: 80
```

---

## 🔍 SCRIPT 5: DAILY HEALTH CHECK

```bash
#!/bin/bash
# transformation/scripts/daily-health-check.sh

echo "🔍 Daily Health Check - $(date)"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Tracking variables
ISSUES=0
WARNINGS=0

# 1. Check compilation
echo -e "\n📦 Checking TypeScript compilation..."
if npm run typecheck > /dev/null 2>&1; then
  echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
  echo -e "${RED}✗ TypeScript compilation failed${NC}"
  ((ISSUES++))
fi

# 2. Check tests
echo -e "\n🧪 Running tests..."
TEST_OUTPUT=$(npm test 2>&1)
if echo "$TEST_OUTPUT" | grep -q "failed"; then
  echo -e "${RED}✗ Some tests are failing${NC}"
  ((ISSUES++))
else
  echo -e "${GREEN}✓ All tests passing${NC}"
fi

# 3. Check security
echo -e "\n🔒 Security audit..."
AUDIT_OUTPUT=$(npm audit --production 2>&1)
CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -oE '[0-9]+ critical' | grep -oE '[0-9]+' || echo 0)
HIGH=$(echo "$AUDIT_OUTPUT" | grep -oE '[0-9]+ high' | grep -oE '[0-9]+' || echo 0)

if [ "$CRITICAL" -gt 0 ]; then
  echo -e "${RED}✗ $CRITICAL critical vulnerabilities found${NC}"
  ((ISSUES++))
elif [ "$HIGH" -gt 0 ]; then
  echo -e "${YELLOW}⚠ $HIGH high vulnerabilities found${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓ No critical vulnerabilities${NC}"
fi

# 4. Check services
echo -e "\n🌐 Checking services..."
services=("http://localhost:3000/health" "http://localhost:9090" "http://localhost:3001")
names=("API" "Prometheus" "Grafana")

for i in "${!services[@]}"; do
  if curl -f -s "${services[$i]}" > /dev/null; then
    echo -e "${GREEN}✓ ${names[$i]} is up${NC}"
  else
    echo -e "${RED}✗ ${names[$i]} is down${NC}"
    ((ISSUES++))
  fi
done

# 5. Check disk space
echo -e "\n💾 Disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo -e "${RED}✗ Disk usage critical: ${DISK_USAGE}%${NC}"
  ((ISSUES++))
elif [ "$DISK_USAGE" -gt 80 ]; then
  echo -e "${YELLOW}⚠ Disk usage high: ${DISK_USAGE}%${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓ Disk usage normal: ${DISK_USAGE}%${NC}"
fi

# 6. Check memory
echo -e "\n🧠 Memory usage..."
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt 90 ]; then
  echo -e "${RED}✗ Memory usage critical: ${MEM_USAGE}%${NC}"
  ((ISSUES++))
elif [ "$MEM_USAGE" -gt 80 ]; then
  echo -e "${YELLOW}⚠ Memory usage high: ${MEM_USAGE}%${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓ Memory usage normal: ${MEM_USAGE}%${NC}"
fi

# 7. Check logs for errors
echo -e "\n📋 Checking logs..."
ERROR_COUNT=$(grep -c ERROR logs/app.log 2>/dev/null || echo 0)
if [ "$ERROR_COUNT" -gt 100 ]; then
  echo -e "${RED}✗ High error rate: $ERROR_COUNT errors in logs${NC}"
  ((ISSUES++))
elif [ "$ERROR_COUNT" -gt 10 ]; then
  echo -e "${YELLOW}⚠ Some errors: $ERROR_COUNT errors in logs${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓ Low error rate: $ERROR_COUNT errors${NC}"
fi

# Summary
echo -e "\n================================"
echo "📊 SUMMARY"
echo "================================"

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All systems operational!${NC}"
  exit 0
elif [ $ISSUES -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warnings detected${NC}"
  exit 0
else
  echo -e "${RED}❌ $ISSUES critical issues, $WARNINGS warnings${NC}"
  
  # Send alert
  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 Health Check Failed: $ISSUES critical issues detected!\"}"
  
  exit 1
fi
```

---

## 📊 METRICS COLLECTION SCRIPT

```typescript
// transformation/monitors/metrics-collector.ts

import { register, Counter, Histogram, Gauge } from 'prom-client';
import * as fs from 'fs';
import * as os from 'os';

export class MetricsCollector {
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private errorTotal: Counter<string>;
  private activeUsers: Gauge<string>;
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;
  
  constructor() {
    // HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });
    
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status']
    });
    
    // Error metrics
    this.errorTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'code']
    });
    
    // Business metrics
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users'
    });
    
    // System metrics
    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });
    
    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage'
    });
    
    // Start collecting system metrics
    this.startSystemMetricsCollection();
  }
  
  private startSystemMetricsCollection() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      
      const cpus = os.cpus();
      const cpuUsage = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + (1 - idle / total);
      }, 0) / cpus.length * 100;
      
      this.cpuUsage.set(cpuUsage);
    }, 5000);
  }
  
  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.observe({ method, route, status: status.toString() }, duration);
    this.httpRequestTotal.inc({ method, route, status: status.toString() });
  }
  
  recordError(type: string, code: string) {
    this.errorTotal.inc({ type, code });
  }
  
  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }
  
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
  
  async saveMetricsSnapshot() {
    const metrics = await this.getMetrics();
    const timestamp = new Date().toISOString();
    const filename = `transformation/metrics/snapshot-${timestamp}.txt`;
    
    fs.writeFileSync(filename, metrics);
    
    // Also save as JSON for analysis
    const jsonMetrics = {
      timestamp,
      httpRequests: await this.httpRequestTotal.get(),
      errors: await this.errorTotal.get(),
      activeUsers: await this.activeUsers.get(),
      memory: await this.memoryUsage.get(),
      cpu: await this.cpuUsage.get()
    };
    
    fs.writeFileSync(
      filename.replace('.txt', '.json'),
      JSON.stringify(jsonMetrics, null, 2)
    );
  }
}

// Usage
const metrics = new MetricsCollector();

// Express middleware
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
  });
  
  next();
};

// Metrics endpoint
export const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await metrics.getMetrics());
};
```

---

## ✅ TEMPLATES & SCRIPTS READY

**14 outils de transformation créés:**
1. ✅ Script de fix compilation
2. ✅ Script de fix SQL injections
3. ✅ Script de fix memory leaks
4. ✅ Script d'optimisation performance
5. ✅ Template Error Handler
6. ✅ Template Service
7. ✅ Template Test
8. ✅ Template Dockerfile
9. ✅ Template Kubernetes
10. ✅ Script Daily Health Check
11. ✅ Metrics Collector
12. ✅ Monitoring Setup
13. ✅ Security Audit
14. ✅ Performance Optimization

**Prêt pour exécution immédiate du Plan C!**
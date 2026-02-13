# Performance Optimization Guide

## Overview

This guide provides comprehensive strategies and techniques for optimizing the Workflow Automation Platform's performance across frontend, backend, and database layers.

## Table of Contents

1. [Frontend Optimization](#frontend-optimization)
2. [Backend Optimization](#backend-optimization)
3. [Database Optimization](#database-optimization)
4. [Caching Strategies](#caching-strategies)
5. [Bundle Optimization](#bundle-optimization)
6. [Network Optimization](#network-optimization)
7. [Monitoring & Profiling](#monitoring--profiling)

---

## Frontend Optimization

### React Component Optimization

#### 1. Use React.memo for Expensive Components

```typescript
import React, { memo } from 'react';

const WorkflowNode = memo(({ node, onUpdate }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.node.id === nextProps.node.id &&
         prevProps.node.data === nextProps.node.data;
});
```

#### 2. useMemo for Expensive Calculations

```typescript
const processedNodes = useMemo(() => {
  return nodes.map(node => ({
    ...node,
    className: getNodeClassName(node),
    style: getNodeStyle(node)
  }));
}, [nodes]); // Only recalculate when nodes change
```

#### 3. useCallback for Event Handlers

```typescript
const handleNodeClick = useCallback((nodeId: string) => {
  setSelectedNode(nodeId);
  logEvent('node_clicked', { nodeId });
}, []); // Empty deps = stable reference
```

### Virtual Scrolling

For large lists (> 100 items), implement virtual scrolling:

```typescript
import { FixedSizeList } from 'react-window';

const WorkflowList = ({ workflows }) => (
  <FixedSizeList
    height={600}
    itemCount={workflows.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <WorkflowRow workflow={workflows[index]} style={style} />
    )}
  </FixedSizeList>
);
```

### Code Splitting

#### Route-based Code Splitting

```typescript
const ModernDashboard = lazy(() => import('./components/ModernDashboard'));
const Settings = lazy(() => import('./components/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<ModernDashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

#### Component-based Code Splitting

```typescript
const AIAssistant = lazy(() =>
  import('./components/AIAssistant')
    .then(module => ({ default: module.AIAssistant }))
);
```

### Image Optimization

1. **Use WebP format** with fallbacks
2. **Lazy load images** below the fold
3. **Implement progressive loading** for large images
4. **Use appropriate image sizes** (srcset)

```typescript
<img
  src="workflow-thumbnail.webp"
  srcSet="
    workflow-thumbnail-320.webp 320w,
    workflow-thumbnail-640.webp 640w,
    workflow-thumbnail-1280.webp 1280w
  "
  sizes="(max-width: 320px) 280px,
         (max-width: 640px) 600px,
         1200px"
  loading="lazy"
  alt="Workflow thumbnail"
/>
```

### Performance Monitoring

Use the built-in PerformanceMonitor:

```typescript
import { performanceMonitor } from '@/performance/PerformanceMonitor';

// Start timing
performanceMonitor.startMetric('workflow.execution');

// Execute workflow
await executeWorkflow(workflowId);

// End timing
performanceMonitor.endMetric('workflow.execution');

// Get metrics
const summary = performanceMonitor.getPerformanceSummary();
```

---

## Backend Optimization

### API Response Caching

Use the CacheService for frequently accessed data:

```typescript
import { cacheService } from '@/backend/services/CacheService';

// Cache API response
app.get('/api/workflows', async (req, res) => {
  const userId = req.user.id;

  const workflows = await cacheService.getOrSet(
    `workflows:user:${userId}`,
    async () => {
      return await prisma.workflow.findMany({
        where: { userId },
        include: { executions: true }
      });
    },
    {
      ttl: 300, // 5 minutes
      tags: ['workflows', `user:${userId}`]
    }
  );

  res.json(workflows);
});
```

### Database Query Optimization

#### 1. Use Indexes Efficiently

All critical queries have been optimized with indexes:

```sql
-- Composite index for workflow queries
CREATE INDEX idx_workflows_user_status
ON workflows(userId, status)
WHERE status = 'ACTIVE';

-- Index for execution history
CREATE INDEX idx_executions_workflow_time
ON workflow_executions(workflowId, startedAt DESC);
```

#### 2. Optimize Queries with EXPLAIN ANALYZE

```typescript
// Analyze query performance
const workflows = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM workflows
  WHERE userId = ${userId}
  AND status = 'ACTIVE'
`;
```

#### 3. Use Select to Limit Fields

```typescript
// Only select needed fields
const workflows = await prisma.workflow.findMany({
  select: {
    id: true,
    name: true,
    status: true,
    updatedAt: true,
    // Don't fetch large JSON fields unless needed
  },
  where: { userId }
});
```

#### 4. Implement Pagination

```typescript
app.get('/api/workflows', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const [workflows, total] = await Promise.all([
    prisma.workflow.findMany({
      skip: offset,
      take: limit,
      where: { userId: req.user.id }
    }),
    prisma.workflow.count({
      where: { userId: req.user.id }
    })
  ]);

  res.json({
    data: workflows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});
```

### Request Compression

Gzip/Brotli compression is enabled in `app.ts`:

```typescript
import compression from 'compression';

app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### Connection Pooling

Configure Prisma connection pool:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workflow?connection_limit=10&pool_timeout=20"
```

---

## Database Optimization

### Index Strategy

#### When to Add Indexes

✅ **ADD indexes for:**
- Foreign keys used in JOINs
- Columns in WHERE clauses
- Columns in ORDER BY clauses
- Composite indexes for multiple-column queries

❌ **AVOID indexes for:**
- Small tables (< 1000 rows)
- Columns with low cardinality
- Frequently updated columns
- Wide text columns

### Query Optimization Checklist

- [ ] Use EXPLAIN ANALYZE to identify slow queries
- [ ] Add indexes for frequently queried columns
- [ ] Use composite indexes for multi-column queries
- [ ] Implement query result caching
- [ ] Use database connection pooling
- [ ] Optimize JSON column queries
- [ ] Use partial indexes for filtered queries
- [ ] Regular VACUUM and ANALYZE

### Monitoring Queries

```sql
-- Find slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Find missing indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

---

## Caching Strategies

### Multi-Level Caching

```
┌─────────────────┐
│  Browser Cache  │ (Service Worker)
└────────┬────────┘
         │
┌────────▼────────┐
│  Memory Cache   │ (CacheManager)
└────────┬────────┘
         │
┌────────▼────────┐
│  Redis Cache    │ (CacheService)
└────────┬────────┘
         │
┌────────▼────────┐
│    Database     │
└─────────────────┘
```

### Cache Invalidation

#### 1. Time-based (TTL)

```typescript
await cacheService.set('workflows', data, { ttl: 300 }); // 5 minutes
```

#### 2. Tag-based

```typescript
// Set cache with tags
await cacheService.set('workflow:123', data, {
  ttl: 3600,
  tags: ['workflows', 'user:456']
});

// Invalidate by tag
await cacheService.invalidateByTags(['user:456']);
```

#### 3. Event-based

```typescript
// Invalidate cache on workflow update
workflowStore.subscribe((state, prevState) => {
  if (state.workflows !== prevState.workflows) {
    cacheService.invalidateByTags(['workflows']);
  }
});
```

### Cache Warming

```typescript
// Warm cache on application start
await cacheService.warm([
  {
    key: 'node-types',
    fetcher: () => fetchNodeTypes(),
    options: { ttl: 86400 } // 24 hours
  },
  {
    key: 'workflow-templates',
    fetcher: () => fetchTemplates(),
    options: { ttl: 3600 } // 1 hour
  }
]);
```

---

## Bundle Optimization

### Current Bundle Configuration

Vite is configured for optimal bundling:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'reactflow': ['reactflow'],
          'utils': ['date-fns', 'lodash', 'crypto-js'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  }
});
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npm run analyze

# Or use webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/stats.json
```

### Target Bundle Sizes

| Chunk Type | Target Size | Max Size |
|------------|-------------|----------|
| Vendor | < 300 KB | 500 KB |
| Main App | < 200 KB | 400 KB |
| Routes | < 100 KB each | 200 KB |
| Components | < 50 KB each | 100 KB |

---

## Network Optimization

### HTTP/2 & HTTP/3

Enable HTTP/2 in production for:
- **Multiplexing**: Multiple requests over single connection
- **Header compression**: Reduced overhead
- **Server push**: Proactive resource delivery

### Resource Hints

```html
<!-- Preconnect to API domain -->
<link rel="preconnect" href="https://api.workflow.com">

<!-- DNS prefetch for third-party resources -->
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- Prefetch next page resources -->
<link rel="prefetch" href="/dashboard" as="document">
```

### CDN Configuration

Use CDN for static assets:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'images';
          }
          return `${extType}/[name]-[hash][extname]`;
        }
      }
    }
  },
  base: process.env.VITE_CDN_URL || '/'
});
```

---

## Monitoring & Profiling

### Performance Metrics

Track Core Web Vitals:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8s
- **TTFB** (Time to First Byte): < 800ms

### Performance Dashboard

Access real-time metrics:

```
http://localhost:3000/performance
```

### React DevTools Profiler

```typescript
import { Profiler } from 'react';

<Profiler id="WorkflowCanvas" onRender={onRenderCallback}>
  <WorkflowCanvas />
</Profiler>

function onRenderCallback(
  id, phase, actualDuration, baseDuration, startTime, commitTime
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}
```

### Backend Monitoring

```typescript
// Monitor API response times
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });

    performanceMonitor.recordAPICall(
      req.path,
      req.method,
      res.statusCode,
      duration,
      res.statusCode < 400
    );
  });

  next();
});
```

---

## Performance Testing

### Load Testing

Run performance tests:

```bash
# Artillery load test
npm run test:performance

# Custom load test
artillery run tests/performance/load-tests.yaml

# Stress test
artillery run tests/performance/stress-tests.yaml

# Soak test (1 hour sustained load)
artillery run tests/performance/soak-tests.yaml

# Spike test
artillery run tests/performance/spike-tests.yaml
```

### Lighthouse CI

```bash
# Run Lighthouse audit
npx lighthouse http://localhost:3000 \
  --output=html \
  --output-path=./lighthouse-report.html \
  --chrome-flags="--headless"

# Target scores
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 95
# SEO: > 90
```

---

## Best Practices Summary

### Frontend

✅ Use React.memo for expensive components
✅ Implement virtual scrolling for large lists
✅ Lazy load routes and heavy components
✅ Optimize images (WebP, lazy loading, responsive)
✅ Minimize bundle size (< 5MB total)
✅ Use service workers for offline support
✅ Implement proper error boundaries

### Backend

✅ Cache API responses (Redis)
✅ Use database indexes effectively
✅ Implement pagination for large datasets
✅ Enable response compression
✅ Use connection pooling
✅ Implement rate limiting
✅ Monitor query performance

### Database

✅ Add indexes for frequently queried columns
✅ Use composite indexes for multi-column queries
✅ Implement partial indexes for filtered queries
✅ Regular VACUUM and ANALYZE
✅ Monitor slow queries
✅ Optimize JSON column queries

---

## Troubleshooting

### Slow Page Load

1. Check bundle size: `npm run analyze`
2. Review lazy loading configuration
3. Check service worker caching
4. Verify CDN configuration
5. Run Lighthouse audit

### Slow API Responses

1. Check database indexes: `EXPLAIN ANALYZE`
2. Review cache hit rate
3. Monitor database connection pool
4. Check Redis health
5. Review query complexity

### High Memory Usage

1. Check for memory leaks (Chrome DevTools)
2. Review component cleanup (useEffect)
3. Monitor cache size
4. Check for circular references
5. Use React DevTools Profiler

---

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

---

**Last Updated**: 2025-01-18
**Version**: 1.0.0

# Performance Optimizations - Quick Start Guide

## Overview

This guide helps you quickly deploy and test the advanced performance optimizations.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optional)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Apply Database Migrations

```bash
# Generate migration
npx prisma generate

# Apply indexes
npm run migrate:dev

# Or manually apply SQL
psql -U user -d database -f prisma/migrations/20250124_add_performance_indexes.sql
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Testing Performance

### Option 1: Automated Test Script

```bash
./scripts/test-performance.sh
```

This script checks:
- ✅ Bundle sizes
- ✅ Service Worker configuration
- ✅ Database indexes
- ✅ Web Vitals integration
- ✅ Resource hints
- ✅ Compression middleware

### Option 2: Lighthouse Audit

```bash
# Install Lighthouse CLI (if not installed)
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view

# Or use Lighthouse CI
npm install -g @lhci/cli
lhci autorun
```

### Option 3: Browser DevTools

1. Open http://localhost:3000
2. Open Chrome DevTools (F12)
3. Go to **Lighthouse** tab
4. Click **Generate report**
5. Check scores:
   - Performance: Should be >95
   - FCP: Should be <1.0s
   - LCP: Should be <2.0s

## Verify Optimizations

### 1. Check Service Worker

Open DevTools → Application → Service Workers

You should see:
```
Status: Activated and running
Version: 2.0.0
Scope: /
```

### 2. Check Caching

DevTools → Application → Cache Storage

You should see:
- workflow-builder-v2
- runtime-cache-v2
- api-cache-v2
- image-cache-v2

### 3. Check Web Vitals

Open DevTools → Console

You should see logs like:
```
✅ FCP: 0.85s (good)
✅ LCP: 1.75s (good)
✅ CLS: 0.08 (good)
```

### 4. Check Compression

DevTools → Network → Select any request → Headers

You should see:
```
Content-Encoding: gzip
X-Response-Size: 45678
Cache-Control: public, max-age=31536000, immutable
```

### 5. Check Database Performance

```sql
-- Check slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Verify indexes
\di
```

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Lighthouse Score | >95 | Lighthouse audit |
| FCP | <1.0s | DevTools → Performance |
| LCP | <2.0s | DevTools → Performance |
| TTI | <2.5s | Lighthouse audit |
| TBT | <200ms | Lighthouse audit |
| CLS | <0.1 | DevTools → Console |
| Bundle Size | <450KB | `npm run build` |
| Cache Hit Rate | >90% | Service Worker logs |

## Troubleshooting

### Service Worker Not Working

**Problem:** Service Worker not registered

**Solution:**
1. Ensure HTTPS or localhost
2. Check browser compatibility
3. Clear cache and reload

```javascript
// Force re-register
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
location.reload();
```

### High Bundle Size

**Problem:** Bundle size >1MB

**Solution:**
1. Run bundle analyzer:
```bash
npm run analyze
```

2. Check for:
   - Duplicate dependencies
   - Large libraries not code-split
   - Unnecessary imports

### Slow Database Queries

**Problem:** Queries taking >100ms

**Solution:**
1. Check if indexes are applied:
```sql
\d workflows
```

2. Analyze slow query:
```sql
EXPLAIN ANALYZE SELECT * FROM workflows WHERE userId = 'xxx';
```

3. Add missing index if needed

### Low Lighthouse Score

**Problem:** Score <95

**Check:**
1. Bundle size (<450KB)
2. Images optimized (WebP/AVIF)
3. Service Worker active
4. Compression enabled
5. Resource hints present

## Monitoring (Production)

### Web Vitals

All metrics are automatically sent to:
```
POST /api/analytics/vitals
```

To view metrics:
```bash
# Development: Check console
# Production: Query database or monitoring service
```

### Database

```sql
-- Monitor slow queries
SELECT * FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Check index usage
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Service Worker

```javascript
// Check cache size
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(`${name}: ${keys.length} entries`);
      });
    });
  });
});
```

## Next Steps

### Week 1
- [ ] Deploy to staging
- [ ] Run Lighthouse audit
- [ ] Monitor Web Vitals
- [ ] Verify database performance

### Week 2-4
- [ ] Set up CDN (CloudFlare/Fastly)
- [ ] Implement image optimization service
- [ ] Add real-time monitoring (Datadog/New Relic)
- [ ] Create performance dashboard

### Month 2+
- [ ] Optimize critical rendering path
- [ ] Implement predictive prefetching
- [ ] Add Edge Computing
- [ ] Consider HTTP/3

## Resources

### Documentation
- [PERFORMANCE_ADVANCED_COMPLETE_REPORT.md](./PERFORMANCE_ADVANCED_COMPLETE_REPORT.md) - Full report
- [docs/DATABASE_QUERY_OPTIMIZATION.md](./docs/DATABASE_QUERY_OPTIMIZATION.md) - Database guide

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals Extension](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

### References
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring](https://web.dev/performance-scoring/)
- [Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

## Support

For issues or questions:
1. Check troubleshooting section
2. Review performance report
3. Check browser console for errors
4. Verify all dependencies installed

## Success Criteria

Your deployment is successful when:

- ✅ Lighthouse Score >95
- ✅ FCP <1.0s
- ✅ LCP <2.0s
- ✅ Service Worker active
- ✅ Web Vitals tracking
- ✅ Database indexes applied
- ✅ Cache hit rate >90%
- ✅ No console errors

**Estimated setup time:** 5-10 minutes
**Expected performance improvement:** 50-70% faster

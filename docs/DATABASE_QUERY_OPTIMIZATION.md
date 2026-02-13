# Database Query Optimization Guide

## Overview

This guide covers database optimization strategies for the Workflow Automation Platform.

## Index Strategy

### Composite Indexes

We use composite indexes for common query patterns:

```sql
-- User workflows by status
SELECT * FROM workflows WHERE userId = ? AND status = 'ACTIVE';
-- Index: workflows_userId_status_idx

-- User executions by time
SELECT * FROM workflow_executions WHERE userId = ? ORDER BY startedAt DESC LIMIT 10;
-- Index: workflow_executions_userId_startedAt_idx

-- Workflow execution history
SELECT * FROM workflow_executions WHERE workflowId = ? ORDER BY startedAt DESC;
-- Index: workflow_executions_workflowId_startedAt_idx
```

### Single Column Indexes

For filtering and sorting:
- `createdAt`, `updatedAt`: Time-based queries
- `status`: Status filtering
- `isActive`: Active/inactive filtering

## Query Optimization Patterns

### 1. Use Select to Limit Fields

**Bad:**
```typescript
const workflows = await prisma.workflow.findMany({
  where: { userId }
});
```

**Good:**
```typescript
const workflows = await prisma.workflow.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    status: true,
    createdAt: true,
  }
});
```

### 2. Implement Pagination

**Bad:**
```typescript
const executions = await prisma.workflowExecution.findMany({
  where: { workflowId }
});
```

**Good:**
```typescript
const executions = await prisma.workflowExecution.findMany({
  where: { workflowId },
  take: 20,
  skip: page * 20,
  orderBy: { startedAt: 'desc' }
});
```

### 3. Avoid N+1 Queries

**Bad:**
```typescript
const workflows = await prisma.workflow.findMany();
for (const workflow of workflows) {
  const executions = await prisma.workflowExecution.count({
    where: { workflowId: workflow.id }
  });
}
```

**Good:**
```typescript
const workflows = await prisma.workflow.findMany({
  include: {
    _count: {
      select: { executions: true }
    }
  }
});
```

### 4. Use Aggregations Wisely

```typescript
// Efficient aggregation
const stats = await prisma.workflowExecution.groupBy({
  by: ['status'],
  where: { workflowId },
  _count: { id: true },
  _avg: { duration: true }
});
```

### 5. Connection Pooling

Configure connection pool in `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

## Monitoring Slow Queries

### PostgreSQL

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Reset stats
SELECT pg_stat_statements_reset();
```

### Query Explain

```sql
EXPLAIN ANALYZE
SELECT * FROM workflows
WHERE userId = 'xxx' AND status = 'ACTIVE'
ORDER BY createdAt DESC;
```

## Cache Strategy

### 1. Query Result Caching

Use Redis for frequently accessed data:

```typescript
// Check cache first
const cacheKey = `workflow:${id}`;
let workflow = await redis.get(cacheKey);

if (!workflow) {
  workflow = await prisma.workflow.findUnique({ where: { id } });
  await redis.set(cacheKey, JSON.stringify(workflow), 'EX', 300); // 5 min
}
```

### 2. Invalidation Strategy

```typescript
// Invalidate on update
await prisma.workflow.update({
  where: { id },
  data: updates
});
await redis.del(`workflow:${id}`);
```

## Best Practices

1. **Always use indexes for WHERE clauses**
2. **Limit result sets** - Never fetch all rows
3. **Use cursor-based pagination** for large datasets
4. **Avoid SELECT \*** - Only fetch needed columns
5. **Use transactions** for related updates
6. **Monitor query performance** regularly
7. **Keep connections pooled** - Don't create per request
8. **Use prepared statements** - Prisma does this automatically

## Performance Targets

- **Simple queries**: < 10ms
- **Complex joins**: < 50ms
- **Aggregations**: < 100ms
- **Full-text search**: < 200ms

## Maintenance

### Regular Vacuum

```sql
VACUUM ANALYZE workflows;
VACUUM ANALYZE workflow_executions;
```

### Index Maintenance

```sql
-- Rebuild indexes
REINDEX TABLE workflows;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Statistics Update

```sql
ANALYZE workflows;
ANALYZE workflow_executions;
```

## Troubleshooting

### Slow Queries

1. Check `EXPLAIN ANALYZE` output
2. Verify indexes exist
3. Check table statistics
4. Monitor connection pool

### Connection Issues

1. Increase pool size
2. Add connection timeout
3. Implement retry logic
4. Monitor active connections

### Lock Contention

1. Keep transactions short
2. Use appropriate isolation levels
3. Batch updates when possible
4. Monitor lock waits

## Resources

- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Index Guide](https://www.postgresql.org/docs/current/indexes.html)
- [Query Optimization](https://www.postgresql.org/docs/current/using-explain.html)

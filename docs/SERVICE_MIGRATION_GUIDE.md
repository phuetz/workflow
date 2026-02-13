# Service Migration & Integration Guide

## Overview

This guide documents the migration of all services from in-memory storage to database-backed architecture with integrated security, monitoring, and real-time features.

## Migration Status

### ✅ Completed Components

1. **Service Migration Adapter** (`src/backend/services/ServiceMigrationAdapter.ts`)
   - Dual-mode operation (memory + database)
   - Automatic synchronization
   - Fallback mechanisms
   - Migration statistics

2. **Migrated Services**
   - `WorkflowService.migrated.ts` - Database-backed workflow management
   - `CredentialsService.migrated.ts` - Encrypted credential storage
   - `ExecutionEngine.migrated.ts` - Streaming execution engine

3. **Security Infrastructure**
   - Authentication middleware with JWT and API key support
   - RBAC (Role-Based Access Control)
   - Rate limiting per user
   - Session management
   - Encryption service for sensitive data

4. **Real-time Features**
   - ExecutionStreamingService integration
   - EventBus for lifecycle events
   - WebSocket support for live updates

5. **Monitoring & Observability**
   - Enhanced logging with structured data
   - OpenTelemetry distributed tracing
   - Health checks for all dependencies
   - Prometheus metrics

6. **Database Layer**
   - Prisma ORM with PostgreSQL
   - Repository pattern for data access
   - Connection pooling
   - Migration utilities

## Architecture

### Data Flow

```
┌─────────────────┐
│   API Routes    │
└────────┬────────┘
         │
         ├─> Authentication Middleware
         │   ├─> JWT Validation
         │   ├─> API Key Validation
         │   └─> RBAC Check
         │
         ├─> Rate Limiting
         │
         ├─> Services (Migrated)
         │   ├─> WorkflowService
         │   │   └─> ServiceMigrationAdapter
         │   │       ├─> Memory Cache
         │   │       └─> Database Repository
         │   │
         │   └─> CredentialsService
         │       └─> ServiceMigrationAdapter
         │           ├─> Memory Cache
         │           └─> Encrypted Database Storage
         │
         ├─> Execution Engine
         │   ├─> ExecutionCore
         │   ├─> ExecutionStreamingService
         │   ├─> EventBus
         │   └─> Database Persistence
         │
         └─> Monitoring
             ├─> EnhancedLogger
             ├─> OpenTelemetry Tracer
             └─> Metrics Collector
```

### Migration Modes

Services operate in three modes:

1. **memory-only**: Legacy mode, uses Map-based storage
2. **dual**: Hybrid mode with memory cache + database sync (default for migration)
3. **database-only**: Pure database mode (target state)

## Migration Process

### Phase 1: Preparation

1. **Backup existing data**
   ```bash
   npm run backup
   ```

2. **Setup database**
   ```bash
   # Create database
   createdb workflow_db

   # Run migrations
   npm run migrate:dev

   # Seed initial data (optional)
   npm run seed
   ```

3. **Environment configuration**
   ```bash
   # .env
   DATABASE_URL="postgresql://user:password@localhost:5432/workflow_db"
   JWT_SECRET="your-secret-key"
   ENCRYPTION_KEY="your-encryption-key"
   ```

### Phase 2: Dual-Mode Operation

Start services in dual mode for testing:

```typescript
import { WorkflowService } from './services/WorkflowService.migrated';
import { EventBus } from './backend/services/EventBus';

const eventBus = new EventBus();
const workflowService = WorkflowService.getInstance(eventBus);

// Service now operates in dual mode
// - Reads from database
// - Caches in memory
// - Writes to both
```

### Phase 3: Data Migration

Run the migration script:

```bash
# Preview migration (dry-run)
npm run migrate -- --dry-run

# Execute migration
npm run migrate -- --confirm

# Rollback if needed
npm run migrate -- --rollback
```

### Phase 4: Validation

Verify data integrity:

```typescript
import { validateDatabaseIntegrity } from './backend/database/migration-utils';

const validation = await validateDatabaseIntegrity();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Phase 5: Switch to Database-Only

Once validated, switch to database-only mode:

```typescript
await workflowService.switchToDatabaseOnly();
await credentialsService.switchToDatabaseOnly();

// Monitor performance
const stats = workflowService.getAdapter().getStats();
console.log('Migration stats:', stats);
```

## API Integration

### Adding Authentication to Routes

```typescript
import { Router } from 'express';
import {
  authenticate,
  requireRole,
  requirePermission,
  rateLimit
} from './backend/api/middleware/authentication';

const router = Router();

// Public route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Authenticated route
router.get('/workflows', authenticate, async (req, res) => {
  const workflows = await workflowService.listWorkflows({
    userId: req.user?.id
  });
  res.json({ workflows });
});

// Admin-only route
router.delete('/workflows/:id',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    await workflowService.deleteWorkflow(req.params.id);
    res.json({ success: true });
  }
);

// Permission-based route with rate limiting
router.post('/workflows/:id/execute',
  authenticate,
  requirePermission('workflow.execute'),
  rateLimit({ maxRequests: 10, windowMs: 60000 }),
  async (req, res) => {
    // Execute workflow
  }
);
```

### Real-time Execution Updates

```typescript
import { WebSocketServerManager } from './backend/websocket/WebSocketServer';
import { ExecutionStreamingService } from './backend/services/ExecutionStreamingService';
import { createWorkflowExecutor } from './components/ExecutionEngine.migrated';

// Initialize WebSocket server
const wsServer = new WebSocketServerManager({
  server: httpServer,
  path: '/ws',
  authentication: async (token) => {
    // Validate JWT token
    return jwtService.verify(token);
  }
});

// Initialize streaming service
const streamingService = new ExecutionStreamingService(wsServer);

// Create executor with streaming
const executor = createWorkflowExecutor(
  nodes,
  edges,
  {
    workflowId: 'workflow-123',
    userId: 'user-456',
    enableStreaming: true,
    enablePersistence: true
  },
  streamingService,
  eventBus
);

// Execute with real-time updates
await executor.execute(
  (nodeId) => console.log(`Node ${nodeId} started`),
  (nodeId, input, result) => console.log(`Node ${nodeId} completed`),
  (nodeId, error) => console.log(`Node ${nodeId} failed`)
);
```

### Client-Side WebSocket Connection

```typescript
// Frontend WebSocket client
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  // Subscribe to execution updates
  ws.send(JSON.stringify({
    type: 'execution.subscribe',
    data: { executionId: 'exec-123' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'execution.started':
      console.log('Execution started');
      break;
    case 'execution.node_started':
      console.log('Node started:', message.data.nodeId);
      break;
    case 'execution.node_completed':
      console.log('Node completed:', message.data);
      break;
    case 'execution.completed':
      console.log('Execution completed');
      break;
  }
};
```

## Monitoring & Observability

### Health Checks

```typescript
import { checkRepositoryHealth } from './backend/services/ServiceMigrationAdapter';
import { repositoryManager } from './backend/database/repositories';

// Check all repositories
const health = await repositoryManager.healthCheck();
console.log('Health status:', health);

// Check migration adapters
const adapterHealth = await globalMigrationManager.healthCheck();
console.log('Adapter health:', adapterHealth);
```

### Metrics Collection

```typescript
import { EnhancedLogger } from './backend/monitoring/EnhancedLogger';

const logger = new EnhancedLogger({
  service: 'MyService',
  level: 'info',
  enableConsole: true,
  enableEventBus: true,
  eventBus: eventBus
});

// Structured logging
logger.info('Workflow created', {
  workflowId: 'workflow-123',
  userId: 'user-456',
  nodeCount: 5
});

// Error logging with context
logger.error('Workflow execution failed', {
  workflowId: 'workflow-123',
  error: error.message,
  stack: error.stack
});
```

### Distributed Tracing

```typescript
import { createTracer } from './backend/monitoring/OpenTelemetryTracing';

const tracer = createTracer('workflow-service');

const span = tracer.startSpan('workflow.create');
span.setAttribute('workflow.name', 'My Workflow');

try {
  // Perform operation
  const workflow = await workflowService.createWorkflow({...});
  span.setAttribute('workflow.id', workflow.id);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  span.end();
}
```

## Security Best Practices

### Credential Encryption

All credentials are encrypted at rest using AES-256-GCM:

```typescript
import { EncryptionService } from './backend/security/EncryptionService';

const encryptionService = new EncryptionService();

// Encrypt sensitive data
const encrypted = await encryptionService.encrypt(
  JSON.stringify({ apiKey: 'secret' })
);

// Store encrypted data
await credentialRepository.create({
  userId: 'user-123',
  name: 'API Key',
  type: 'oauth2',
  encryptedData: encrypted
});

// Decrypt when needed
const decrypted = await encryptionService.decrypt(encrypted);
const data = JSON.parse(decrypted);
```

### Rate Limiting

Configure per-route rate limits:

```typescript
router.post('/api/workflows',
  authenticate,
  rateLimit({
    maxRequests: 100,  // 100 requests
    windowMs: 60000    // per minute
  }),
  async (req, res) => {
    // Handle request
  }
);
```

### CSRF Protection

```typescript
import { CSRFProtection } from './backend/security/CSRFProtection';

const csrfProtection = new CSRFProtection();

// Generate CSRF token
const token = await csrfProtection.generateToken(sessionId);

// Validate CSRF token
const valid = await csrfProtection.validateToken(sessionId, token);
```

## Testing

### Unit Tests

```typescript
import { workflowService } from './services/WorkflowService.migrated';

describe('WorkflowService', () => {
  it('should create workflow in database', async () => {
    const workflow = await workflowService.createWorkflow({
      name: 'Test Workflow',
      nodes: [],
      edges: [],
      isActive: true
    });

    expect(workflow.id).toBeDefined();

    // Verify in database
    const dbWorkflow = await workflowRepository.findById(workflow.id);
    expect(dbWorkflow).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Workflow Execution with Streaming', () => {
  it('should stream execution events', async (done) => {
    const events = [];

    streamingService.on('execution.node_started', (event) => {
      events.push(event);
    });

    await executor.execute();

    expect(events.length).toBeGreaterThan(0);
    done();
  });
});
```

## Troubleshooting

### Common Issues

1. **Database Connection Fails**
   ```bash
   # Check connection
   npm run db:check

   # Verify DATABASE_URL
   echo $DATABASE_URL
   ```

2. **Migration Errors**
   ```bash
   # View migration logs
   tail -f logs/migration.log

   # Rollback
   npm run migrate -- --rollback
   ```

3. **High Error Rate**
   ```typescript
   // Check adapter statistics
   const stats = workflowService.getAdapter().getStats();
   const errorRate = stats.errors / (stats.databaseReads + stats.databaseWrites);

   if (errorRate > 0.1) {
     // Switch to memory-only mode temporarily
     workflowService.getAdapter().setMode('memory-only');
   }
   ```

## Performance Optimization

### Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pool settings
  connection_limit = 10
  pool_timeout     = 20
}
```

### Query Optimization

```typescript
// Use includes for eager loading
const workflow = await workflowRepository.findById(id, {
  includeExecutions: true,
  includeVersions: true
});

// Use pagination for large datasets
const workflows = await workflowRepository.findMany({
  page: 1,
  limit: 20,
  orderBy: { createdAt: 'desc' }
});
```

### Caching Strategy

```typescript
// Dual mode provides automatic caching
workflowService.getAdapter().setMode('dual');

// Cache hit from memory
const workflow1 = await workflowService.getWorkflow('id'); // DB read

// Cache hit from memory
const workflow2 = await workflowService.getWorkflow('id'); // Memory read
```

## Next Steps

1. **Monitor Performance**: Track migration statistics and error rates
2. **Gradual Rollout**: Test with subset of users before full migration
3. **Load Testing**: Verify performance under production load
4. **Documentation**: Update API documentation with new endpoints
5. **Training**: Train team on new architecture and tools

## Support

For issues or questions:
- Check logs: `logs/application.log`
- Review metrics: `http://localhost:3000/metrics`
- Health check: `http://localhost:3000/health`

# Quick Start: Service Migration

## TL;DR - What Changed?

All services now use **PostgreSQL database** instead of in-memory Map storage, with:
- ✅ Encrypted credential storage
- ✅ JWT/API key authentication
- ✅ Real-time WebSocket updates
- ✅ Full backward compatibility

## 5-Minute Setup

### 1. Database Setup (2 minutes)

```bash
# Create PostgreSQL database
createdb workflow_db

# Run migrations
npm run migrate:dev

# Verify connection
npm run db:check
```

### 2. Environment Variables (1 minute)

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/workflow_db"
JWT_SECRET="your-secret-key-here"
ENCRYPTION_KEY="your-encryption-key-here"
```

### 3. Start Services (2 minutes)

```bash
# Install dependencies
npm install

# Start backend and frontend
npm run dev
```

## Using Migrated Services

### WorkflowService

```typescript
// Before (old version)
import { workflowService } from './services/WorkflowService';

// After (migrated version)
import { workflowService } from './services/WorkflowService.migrated';

// API remains the same!
const workflow = await workflowService.createWorkflow({
  name: 'My Workflow',
  nodes: [...],
  edges: [...]
}, userId);  // Now requires userId for security
```

### CredentialsService

```typescript
// Credentials are now encrypted automatically
const credential = await credentialsService.createCredential({
  name: 'OpenAI Key',
  type: 'openai',
  data: { apiKey: 'sk-...' }  // Encrypted in database
}, userId);

// List view masks sensitive data
const list = await credentialsService.listCredentials(userId);
// Returns: { apiKey: 'sk-1***********890' }

// Full access with authentication
const full = await credentialsService.getCredential(id, userId);
// Returns: { apiKey: 'sk-1234567890' } (decrypted)
```

### ExecutionEngine with Streaming

```typescript
import { createWorkflowExecutor } from './components/ExecutionEngine.migrated';
import { streamingService } from './backend/services/ExecutionStreamingService';
import { eventBus } from './backend/services/EventBus';

const executor = createWorkflowExecutor(
  nodes, edges,
  {
    workflowId: 'wf-123',
    userId: 'user-456',
    enableStreaming: true,   // WebSocket updates
    enablePersistence: true  // Save to database
  },
  streamingService,
  eventBus
);

// Clients receive real-time updates!
await executor.execute();
```

## Migration Process

### Step 1: Backup (REQUIRED)

```bash
npm run backup
```

### Step 2: Preview Migration

```bash
npm run migrate -- --dry-run
```

### Step 3: Execute Migration

```bash
npm run migrate -- --confirm
```

### Step 4: Verify

```bash
# Check database health
npm run db:health

# Run tests
npm run test
```

## API Authentication

### Using JWT Token

```bash
# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response: { "accessToken": "eyJhbGc..." }

# Use token in requests
curl -X GET http://localhost:3000/api/workflows \
  -H "Authorization: Bearer eyJhbGc..."
```

### Using API Key

```bash
# Create API key
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"name":"My API Key","permissions":["workflow.read","workflow.execute"]}'

# Response: { "apiKey": "wf_live_abc123..." }

# Use API key in requests
curl -X GET http://localhost:3000/api/workflows \
  -H "X-API-Key: wf_live_abc123..."
```

## WebSocket Real-time Updates

### Client Setup

```javascript
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

  console.log('Event:', message.type);
  console.log('Data:', message.data);

  // Update UI with real-time progress
  updateProgressBar(message.data);
};
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Migration Statistics

```typescript
import { workflowService } from './services/WorkflowService.migrated';

const adapter = workflowService.getAdapter();
const stats = adapter.getStats();

console.log('Database reads:', stats.databaseReads);
console.log('Memory reads:', stats.memoryReads);
console.log('Errors:', stats.errors);
```

### Event History

```typescript
import { eventBus } from './backend/services/EventBus';

const events = eventBus.getHistory({
  types: ['workflow.created', 'workflow.updated'],
  since: new Date('2025-01-01')
});

console.log(`Found ${events.length} events`);
```

## Common Issues

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
echo $DATABASE_URL

# Test connection
npm run db:check
```

### Migration Failed

```bash
# Rollback to backup
npm run migrate -- --rollback

# Check logs
tail -f logs/migration.log
```

### Authentication Failed

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Generate new secret if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Performance Tips

### Enable Caching

Services run in **dual mode** by default, caching in memory while syncing to database.

```typescript
// Already enabled by default!
const adapter = workflowService.getAdapter();
console.log('Mode:', adapter.getMode());  // 'dual'
```

### Switch to Database-Only

Once migration is complete and validated:

```typescript
await workflowService.switchToDatabaseOnly();
await credentialsService.switchToDatabaseOnly();

// Frees memory, but slower (no cache)
```

### Connection Pooling

Configure in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  connection_limit = 20
  pool_timeout     = 20
}
```

## Next Steps

1. ✅ Read full guide: `docs/SERVICE_MIGRATION_GUIDE.md`
2. ✅ Run tests: `npm run test`
3. ✅ Review API changes: Check authentication requirements
4. ✅ Setup monitoring: Configure Prometheus/Grafana
5. ✅ Deploy to staging: Test before production

## Support

- **Documentation**: `/docs/SERVICE_MIGRATION_GUIDE.md` (643 lines)
- **Tests**: `/src/__tests__/service-migration.test.ts`
- **Migration Script**: `/scripts/migrate-to-database.ts`
- **Health Check**: `http://localhost:3000/health`

---

**Quick Reference Card**: Print and keep handy!

```
╔══════════════════════════════════════════════════════════╗
║              SERVICE MIGRATION QUICK REF                 ║
╠══════════════════════════════════════════════════════════╣
║ Setup:       npm run migrate:dev                         ║
║ Backup:      npm run backup                              ║
║ Migrate:     npm run migrate -- --confirm                ║
║ Rollback:    npm run migrate -- --rollback               ║
║ Health:      curl localhost:3000/health                  ║
║ Tests:       npm run test                                ║
╠══════════════════════════════════════════════════════════╣
║ Authentication:                                          ║
║   JWT:       Authorization: Bearer <token>               ║
║   API Key:   X-API-Key: <key>                           ║
╠══════════════════════════════════════════════════════════╣
║ WebSocket:   ws://localhost:3001/ws                      ║
║ Database:    postgresql://localhost:5432/workflow_db    ║
╚══════════════════════════════════════════════════════════╝
```

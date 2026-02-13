# Database Persistence Layer Documentation

## Overview

This directory contains the complete database persistence layer for the Workflow Automation Platform. The implementation uses **Prisma ORM** with **PostgreSQL** as the database engine, replacing all in-memory storage with persistent, transactional database operations.

## Architecture

```
src/backend/database/
├── prisma.ts                    # Prisma client configuration & utilities
├── backup.ts                    # Backup and restore functionality
├── migration-utils.ts           # Migration and maintenance utilities
├── repositories/                # Repository pattern implementations
│   ├── index.ts                # Central export of all repositories
│   ├── UserRepository.ts       # User management operations
│   ├── WorkflowRepository.ts   # Workflow CRUD with versioning
│   ├── ExecutionRepository.ts  # Workflow execution tracking
│   ├── CredentialRepository.ts # Encrypted credential storage
│   ├── WebhookRepository.ts    # Webhook and event management
│   └── AnalyticsRepository.ts  # Analytics, metrics, logs, notifications
└── README.md                    # This file
```

## Key Features

### 1. **Repository Pattern**
All database access is abstracted through repositories, providing:
- Type-safe operations with TypeScript
- Consistent error handling
- Automatic transaction management
- Query optimization
- Caching strategies

### 2. **Data Security**
- **Encrypted credentials**: AES-256-GCM encryption for sensitive data
- **Password hashing**: bcrypt with configurable salt rounds
- **SQL injection prevention**: Parameterized queries via Prisma
- **Row-level security**: User ownership validation

### 3. **Transaction Support**
Complex operations use database transactions to ensure data consistency:
```typescript
import { executeInTransaction } from './prisma';

await executeInTransaction(async (tx) => {
  await tx.workflow.create({ data: workflowData });
  await tx.workflowVersion.create({ data: versionData });
});
```

### 4. **Automatic Versioning**
Workflows automatically create versions on significant changes:
- Version history tracking
- Rollback capability
- Audit trail

### 5. **Connection Pooling**
Optimized connection management:
- Min connections: 2
- Max connections: 10
- Automatic reconnection on failure
- Health check endpoints

## Repositories

### UserRepository

Manages user accounts, authentication, and sessions.

```typescript
import { userRepository } from './repositories';

// Create user
const user = await userRepository.create({
  email: 'user@example.com',
  passwordHash: hashedPassword,
  firstName: 'John',
  lastName: 'Doe',
});

// Find user
const user = await userRepository.findByEmail('user@example.com');

// Update user
await userRepository.update(userId, { emailVerified: true });

// Handle authentication
await userRepository.recordFailedLogin(userId);
await userRepository.resetFailedLogins(userId);
const isLocked = await userRepository.isAccountLocked(userId);
```

**Key Features:**
- Email uniqueness enforcement
- Account locking after failed attempts
- Email verification token management
- Password reset tokens
- 2FA support

### WorkflowRepository

Manages workflows with automatic versioning.

```typescript
import { workflowRepository } from './repositories';

// Create workflow
const workflow = await workflowRepository.create({
  name: 'My Workflow',
  nodes: reactFlowNodes,
  edges: reactFlowEdges,
  userId: currentUserId,
});

// Update with version creation
await workflowRepository.update(
  workflowId,
  { name: 'Updated Name' },
  userId,
  true // createVersion
);

// Get versions
const versions = await workflowRepository.getVersions(workflowId);

// Restore specific version
await workflowRepository.restoreVersion(workflowId, versionNumber, userId);

// Export/Import
const exported = await workflowRepository.export(workflowId, userId);
const imported = await workflowRepository.import(exportedData, userId);
```

**Key Features:**
- Automatic version history
- Access control (private, team, public)
- Tag-based organization
- Template system
- Statistics tracking

### ExecutionRepository

Tracks workflow and node executions.

```typescript
import { executionRepository } from './repositories';

// Start execution
const execution = await executionRepository.createExecution({
  workflowId,
  userId,
  trigger: { type: 'manual' },
  input: { data: 'test' },
});

// Track node execution
const nodeExec = await executionRepository.createNodeExecution({
  executionId: execution.id,
  nodeId: 'node-1',
  nodeName: 'HTTP Request',
  nodeType: 'http',
});

// Update on completion
await executionRepository.updateExecution(execution.id, {
  status: 'SUCCESS',
  finishedAt: new Date(),
  output: { result: 'data' },
});

// Get execution timeline
const timeline = await executionRepository.getExecutionTimeline(executionId);

// Retry failed execution
await executionRepository.retryExecution(executionId, userId);
```

**Key Features:**
- Node-level execution tracking
- Automatic duration calculation
- Retry logic with max attempts
- Sub-workflow support
- Timeline visualization

### CredentialRepository

Securely stores encrypted credentials.

```typescript
import { credentialRepository } from './repositories';

// Store credential (auto-encrypted)
const credential = await credentialRepository.create({
  userId,
  name: 'API Key',
  type: 'API_KEY',
  data: {
    apiKey: 'secret_key',
    endpoint: 'https://api.example.com',
  },
});

// Retrieve and decrypt
const decrypted = await credentialRepository.findByIdDecrypted(
  credentialId,
  userId
);
console.log(decrypted.data.apiKey); // Original value

// Validate credential
const isValid = await credentialRepository.isValid(credentialId);

// Rotate encryption key
await credentialRepository.rotateEncryptionKey(oldKey, newKey);
```

**Key Features:**
- AES-256-GCM encryption
- Automatic encryption/decryption
- Expiration management
- Key rotation support
- Type-specific credentials

### WebhookRepository

Manages webhooks and incoming events.

```typescript
import { webhookRepository } from './repositories';

// Create webhook
const webhook = await webhookRepository.create({
  workflowId,
  url: 'https://app.com/webhook/12345',
  method: 'POST',
  secret: 'webhook_secret',
});

// Record incoming event
const event = await webhookRepository.createEvent({
  webhookId: webhook.id,
  eventType: 'user.created',
  payload: { userId: 123 },
  headers: { 'content-type': 'application/json' },
  ipAddress: request.ip,
});

// Process events
const unprocessed = await webhookRepository.getUnprocessedEvents();
for (const event of unprocessed) {
  await processEvent(event);
  await webhookRepository.markEventProcessed(event.id);
}

// Get statistics
const stats = await webhookRepository.getStatistics(webhookId);
```

**Key Features:**
- Unique URL enforcement
- Event queueing
- Processing status tracking
- Trigger statistics
- Secret validation

### AnalyticsRepository

Handles analytics, metrics, audit logs, and notifications.

```typescript
import { analyticsRepository } from './repositories';

// Record workflow analytics
await analyticsRepository.recordWorkflowAnalytics({
  workflowId,
  date: new Date(),
  executions: 10,
  successfulRuns: 8,
  failedRuns: 2,
  avgDuration: 5000,
});

// Get aggregated analytics
const analytics = await analyticsRepository.getAggregatedAnalytics(
  startDate,
  endDate,
  userId
);

// Create audit log
await analyticsRepository.createAuditLog({
  userId,
  action: 'workflow_deleted',
  resource: 'workflow',
  resourceId: workflowId,
  ipAddress: request.ip,
});

// Send notification
await analyticsRepository.createNotification({
  userId,
  type: 'WORKFLOW_COMPLETED',
  title: 'Workflow Finished',
  message: 'Your workflow completed successfully',
  priority: 'NORMAL',
});

// Get user notifications
const { notifications, unreadCount } =
  await analyticsRepository.getNotifications(userId);
```

**Key Features:**
- Time-series analytics
- System metrics tracking
- Comprehensive audit logging
- User notifications
- Automatic cleanup of old data

## Database Utilities

### Backup & Restore

```typescript
import { createBackup, restoreBackup } from './backup';

// Create full backup
const backupFile = await createBackup({
  outputDir: './backups',
  includeData: true,
  compress: true,
});

// Restore from backup
await restoreBackup({
  backupFile: './backups/workflow_backup_2025-01-15.tar.gz',
});

// Export to JSON
await exportToJson('./export.json', ['users', 'workflows']);

// Import from JSON
await importFromJson('./export.json');

// Cleanup old backups
await cleanupOldBackups('./backups', 30); // Keep 30 days
```

### Migration Utilities

```typescript
import {
  migrateInMemoryToDatabase,
  validateDatabaseIntegrity,
  fixDatabaseIssues,
  getDatabaseStatistics,
} from './migration-utils';

// Migrate from Map-based storage
await migrateInMemoryToDatabase({
  users: inMemoryUsersMap,
  workflows: inMemoryWorkflowsMap,
});

// Validate integrity
const { valid, errors, warnings } = await validateDatabaseIntegrity();

// Fix common issues
await fixDatabaseIssues();

// Get statistics
const stats = await getDatabaseStatistics();
```

## Configuration

### Environment Variables

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_TIMEOUT=30000

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
ENCRYPTION_ALGORITHM=aes-256-gcm
HASH_SALT_ROUNDS=12
```

### Prisma Schema

The schema is defined in `prisma/schema.prisma` and includes:
- User management (users, teams, sessions, API keys)
- Workflow management (workflows, versions, shares, comments)
- Execution tracking (executions, node executions)
- Credentials (encrypted storage)
- Webhooks (webhooks, events)
- Analytics (workflow analytics, system metrics, audit logs, notifications)
- File management

## Migrations

### Running Migrations

```bash
# Development - create and apply migration
npm run migrate:dev

# Production - apply pending migrations
npm run migrate

# Generate Prisma Client
npx prisma generate

# Reset database (CAUTION)
npx prisma migrate reset
```

### Creating Migrations

1. Modify `prisma/schema.prisma`
2. Run `npm run migrate:dev`
3. Name your migration descriptively
4. Verify migration SQL in `prisma/migrations/`

## Performance Optimization

### Indexes

All critical queries have indexes:
- User email (unique)
- Workflow userId, status, visibility
- Execution workflowId, userId, status, startedAt
- Credentials userId, type
- Webhooks URL (unique), workflowId
- Analytics workflowId, date

### Query Optimization

```typescript
// Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
  },
});

// Use include for relations
const workflow = await prisma.workflow.findUnique({
  where: { id },
  include: {
    user: true,
    executions: {
      take: 10,
      orderBy: { startedAt: 'desc' },
    },
  },
});

// Use pagination
const { workflows } = await workflowRepository.findByUser(userId, {
  skip: 0,
  limit: 50,
});
```

### Connection Pooling

Prisma automatically manages connection pooling. Monitor with:

```typescript
import { getDatabaseStats } from './prisma';

const stats = await getDatabaseStats();
console.log(stats);
```

## Testing

Run database tests:

```bash
# All repository tests
npm run test src/__tests__/database/

# Specific test file
npm run test src/__tests__/database/repositories.test.ts

# With coverage
npm run test:coverage
```

## Monitoring

### Health Checks

```typescript
import { checkDatabaseHealth } from './prisma';
import { repositoryManager } from './repositories';

// Simple health check
const healthy = await checkDatabaseHealth();

// Comprehensive check
const checks = await repositoryManager.healthCheck();
console.log(checks);
// {
//   database: true,
//   user: true,
//   workflow: true,
//   execution: true,
//   credential: true,
//   webhook: true,
//   analytics: true
// }
```

### Cleanup Tasks

Schedule regular cleanup:

```typescript
import { cleanupExpiredRecords } from './prisma';
import { credentialRepository, webhookRepository } from './repositories';

// Run daily
setInterval(async () => {
  await cleanupExpiredRecords();
  await credentialRepository.deactivateExpiredCredentials();
  await webhookRepository.deleteOldEvents(30);
}, 24 * 60 * 60 * 1000);
```

## Best Practices

1. **Always use repositories**: Never access Prisma directly from services
2. **Use transactions**: For operations that modify multiple tables
3. **Validate input**: Before database operations
4. **Handle errors**: Catch and log database errors appropriately
5. **Monitor performance**: Use Prisma's query logging in development
6. **Regular backups**: Automate daily backups
7. **Test migrations**: Always test in staging before production
8. **Connection limits**: Don't exceed pool size
9. **Cleanup old data**: Implement retention policies
10. **Security**: Never log sensitive data (passwords, API keys)

## Troubleshooting

### Connection Issues

```typescript
import { connectWithRetry } from './prisma';

// Retry connection with backoff
await connectWithRetry(5, 2000); // 5 attempts, 2s delay
```

### Migration Failures

```bash
# View migration status
npx prisma migrate status

# Resolve migration conflicts
npx prisma migrate resolve --applied <migration-name>

# Reset and reapply (development only)
npx prisma migrate reset
```

### Performance Issues

```bash
# Optimize database
npm run studio

# In Prisma Studio:
# - Check table sizes
# - Verify indexes
# - Review slow queries
```

## Future Enhancements

- [ ] Read replicas for scaling reads
- [ ] Query result caching (Redis)
- [ ] Soft delete for all entities
- [ ] Database sharding for multi-tenancy
- [ ] Advanced analytics with time-series database
- [ ] Real-time subscriptions with GraphQL
- [ ] Automated performance tuning
- [ ] Cross-database support (MySQL, SQLite)

## Support

For issues or questions:
1. Check Prisma documentation: https://www.prisma.io/docs
2. Review existing issues in repository
3. Contact development team

## License

MIT License - see LICENSE file for details

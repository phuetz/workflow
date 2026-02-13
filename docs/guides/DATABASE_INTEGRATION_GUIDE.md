# Database Integration Guide

## Quick Start

This guide helps you migrate existing services from in-memory storage (Maps/Sets) to the new Prisma-based database layer.

## Step 1: Import the New Repositories

### Before (Old In-Memory)
```typescript
import { userRepository } from '../database/userRepository';
import { workflowRepository } from '../database/workflowRepository';
```

### After (New Prisma-Based)
```typescript
import {
  userRepository,
  workflowRepository,
  executionRepository,
  credentialRepository,
  webhookRepository,
  analyticsRepository,
} from '../database/repositories';
```

## Step 2: Update User Operations

### Authentication Service Example

```typescript
// src/backend/auth/AuthManager.ts

// OLD CODE (Map-based)
class AuthManager {
  private users: Map<string, User> = new Map();

  async login(email: string, password: string) {
    const userId = this.emailIndex.get(email.toLowerCase());
    const user = this.users.get(userId);
    // ...
  }
}

// NEW CODE (Prisma-based)
import { userRepository } from '../database/repositories';
import bcrypt from 'bcryptjs';

class AuthManager {
  async login(email: string, password: string) {
    // Find user from database
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (await userRepository.isAccountLocked(user.id)) {
      throw new Error('Account is locked');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await userRepository.recordFailedLogin(user.id);
      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on success
    await userRepository.resetFailedLogins(user.id);

    return user;
  }

  async register(data: CreateUserInput) {
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user in database
    return await userRepository.create({
      ...data,
      passwordHash,
    });
  }
}
```

## Step 3: Update Workflow Operations

### Workflow Service Example

```typescript
// src/backend/services/workflowService.ts

import { workflowRepository } from '../database/repositories';

class WorkflowService {
  // Create workflow with automatic versioning
  async createWorkflow(userId: string, data: CreateWorkflowInput) {
    return await workflowRepository.create({
      ...data,
      userId,
    });
  }

  // Update workflow (creates version if significant change)
  async updateWorkflow(
    workflowId: string,
    userId: string,
    data: UpdateWorkflowInput,
    createVersion = false
  ) {
    return await workflowRepository.update(
      workflowId,
      data,
      userId,
      createVersion
    );
  }

  // Get user workflows with filtering
  async getUserWorkflows(userId: string, filters?: WorkflowFilter) {
    return await workflowRepository.findByUser(userId, {
      limit: 50,
      filter: filters,
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Duplicate workflow
  async duplicateWorkflow(workflowId: string, userId: string) {
    return await workflowRepository.duplicate(workflowId, userId);
  }

  // Export workflow
  async exportWorkflow(workflowId: string, userId: string) {
    return await workflowRepository.export(workflowId, userId);
  }
}
```

## Step 4: Update Execution Tracking

### Execution Engine Example

```typescript
// src/components/ExecutionEngine.ts

import { executionRepository, analyticsRepository } from '../database/repositories';

class WorkflowExecutor {
  async executeWorkflow(workflowId: string, userId: string, input?: any) {
    // Create execution record
    const execution = await executionRepository.createExecution({
      workflowId,
      userId,
      trigger: { type: 'manual', timestamp: new Date() },
      input,
    });

    try {
      // Update to running
      await executionRepository.updateExecution(execution.id, {
        status: ExecutionStatus.RUNNING,
      });

      // Execute nodes
      for (const node of workflow.nodes) {
        const nodeExec = await executionRepository.createNodeExecution({
          executionId: execution.id,
          nodeId: node.id,
          nodeName: node.data.label,
          nodeType: node.type,
        });

        try {
          const result = await this.executeNode(node);

          await executionRepository.updateNodeExecution(nodeExec.id, {
            status: ExecutionStatus.SUCCESS,
            finishedAt: new Date(),
            output: result,
          });
        } catch (error) {
          await executionRepository.updateNodeExecution(nodeExec.id, {
            status: ExecutionStatus.FAILED,
            finishedAt: new Date(),
            error: { message: error.message },
          });
          throw error;
        }
      }

      // Mark execution as successful
      await executionRepository.updateExecution(execution.id, {
        status: ExecutionStatus.SUCCESS,
        finishedAt: new Date(),
        output: finalOutput,
      });

      // Record analytics
      await analyticsRepository.recordWorkflowAnalytics({
        workflowId,
        date: new Date(),
        executions: 1,
        successfulRuns: 1,
        failedRuns: 0,
        avgDuration: execution.duration || 0,
      });

      return execution;
    } catch (error) {
      // Mark execution as failed
      await executionRepository.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        finishedAt: new Date(),
        error: { message: error.message, stack: error.stack },
      });

      // Record analytics
      await analyticsRepository.recordWorkflowAnalytics({
        workflowId,
        date: new Date(),
        executions: 1,
        successfulRuns: 0,
        failedRuns: 1,
      });

      throw error;
    }
  }
}
```

## Step 5: Update Credential Management

### Credentials Service Example

```typescript
// src/backend/services/credentialService.ts

import { credentialRepository } from '../database/repositories';

class CredentialService {
  // Store credential (automatically encrypted)
  async createCredential(userId: string, data: CreateCredentialInput) {
    return await credentialRepository.create({
      userId,
      ...data,
    });
  }

  // Get decrypted credential for use
  async getCredentialForExecution(credentialId: string, userId: string) {
    // Returns decrypted data
    const credential = await credentialRepository.findByIdDecrypted(
      credentialId,
      userId
    );

    if (!credential) {
      throw new Error('Credential not found');
    }

    // Validate not expired
    if (!(await credentialRepository.isValid(credentialId))) {
      throw new Error('Credential has expired');
    }

    // Mark as used
    await credentialRepository.markAsUsed(credentialId);

    return credential.data;
  }

  // List user credentials (encrypted data not included)
  async getUserCredentials(userId: string) {
    return await credentialRepository.findByUser(userId);
  }
}
```

## Step 6: Update API Routes

### Example Route Updates

```typescript
// src/backend/api/routes/workflows.ts

import { Router } from 'express';
import { workflowRepository, analyticsRepository } from '../../database/repositories';

const router = Router();

// Get user workflows
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { status, tags, search } = req.query;

    const result = await workflowRepository.findByUser(userId, {
      skip: Number(req.query.skip) || 0,
      limit: Number(req.query.limit) || 50,
      filter: {
        status: status as WorkflowStatus,
        tags: tags ? (tags as string).split(',') : undefined,
        search: search as string,
      },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create workflow
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const workflow = await workflowRepository.create({
      ...req.body,
      userId,
    });

    // Log audit trail
    await analyticsRepository.createAuditLog({
      userId,
      action: 'workflow_created',
      resource: 'workflow',
      resourceId: workflow.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update workflow
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { createVersion, ...updates } = req.body;

    const workflow = await workflowRepository.update(
      id,
      updates,
      userId,
      createVersion
    );

    await analyticsRepository.createAuditLog({
      userId,
      action: 'workflow_updated',
      resource: 'workflow',
      resourceId: id,
      details: { createVersion, fields: Object.keys(updates) },
      ipAddress: req.ip,
    });

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow versions
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await workflowRepository.getVersions(req.params.id);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Step 7: Environment Configuration

Create `.env` file with database configuration:

```bash
# Database
DATABASE_URL=postgresql://workflow_user:password@localhost:5432/workflow_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_TIMEOUT=30000

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here
ENCRYPTION_ALGORITHM=aes-256-gcm
HASH_SALT_ROUNDS=12
```

## Step 8: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npm run migrate:dev

# Seed database (optional)
npm run seed
```

## Step 9: Update Server Initialization

```typescript
// src/backend/api/server.ts

import { connectWithRetry, disconnectDatabase } from './database/prisma';

async function startServer() {
  try {
    // Connect to database
    await connectWithRetry(5, 2000);
    console.log('✅ Database connected');

    // Start Express server
    const app = express();
    // ... configure app

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, closing server...');
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

## Step 10: Add Health Checks

```typescript
// src/backend/api/routes/health.ts

import { checkDatabaseHealth } from '../../database/prisma';
import { repositoryManager } from '../../database/repositories';

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    database: await checkDatabaseHealth(),
    repositories: await repositoryManager.healthCheck(),
  };

  const allHealthy = health.database &&
    Object.values(health.repositories).every(v => v === true);

  res.status(allHealthy ? 200 : 503).json(health);
});
```

## Common Patterns

### Pattern 1: Transaction for Multi-Table Operations

```typescript
import { executeInTransaction } from '../database/prisma';

async function complexOperation(userId: string) {
  return await executeInTransaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { /* ... */ },
    });

    await tx.auditLog.create({
      data: { /* ... */ },
    });

    return user;
  });
}
```

### Pattern 2: Pagination

```typescript
async function getWorkflows(page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize;

  return await workflowRepository.findByUser(userId, {
    skip,
    limit: pageSize,
    orderBy: { createdAt: 'desc' },
  });
}
```

### Pattern 3: Filtering and Search

```typescript
async function searchWorkflows(query: string, filters: WorkflowFilter) {
  return await workflowRepository.findByUser(userId, {
    filter: {
      search: query,
      status: filters.status,
      tags: filters.tags,
    },
  });
}
```

### Pattern 4: Error Handling

```typescript
async function safeOperation() {
  try {
    const result = await workflowRepository.create(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'Duplicate entry' };
      }
    }
    throw error; // Re-throw unexpected errors
  }
}
```

## Testing

```typescript
// __tests__/integration.test.ts

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { connectWithRetry, disconnectDatabase } from '../database/prisma';
import { userRepository } from '../database/repositories';

describe('Integration Tests', () => {
  beforeAll(async () => {
    await connectWithRetry();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should create and find user', async () => {
    const user = await userRepository.create({
      email: 'test@example.com',
      passwordHash: 'hashed',
    });

    const found = await userRepository.findById(user.id);
    expect(found).toBeDefined();
    expect(found?.email).toBe('test@example.com');
  });
});
```

## Migration Checklist

- [ ] Import new repositories
- [ ] Replace Map/Set operations with repository calls
- [ ] Add proper error handling
- [ ] Update tests
- [ ] Configure environment variables
- [ ] Run migrations
- [ ] Test in development environment
- [ ] Set up backups
- [ ] Monitor performance
- [ ] Deploy to production

## Troubleshooting

### Issue: Connection Errors
```typescript
// Use retry logic
import { connectWithRetry } from './database/prisma';
await connectWithRetry(5, 2000); // 5 retries, 2s delay
```

### Issue: Transaction Timeout
```typescript
// Increase timeout in prisma.ts
datasources: {
  db: {
    url: process.env.DATABASE_URL + '?connect_timeout=30'
  }
}
```

### Issue: Migration Conflicts
```bash
# Check migration status
npx prisma migrate status

# Resolve conflicts
npx prisma migrate resolve --applied <migration-name>
```

## Support

For questions or issues:
1. Check the Database README: `src/backend/database/README.md`
2. Review implementation report: `DATABASE_IMPLEMENTATION_REPORT.md`
3. Contact the development team

## Additional Resources

- Prisma Documentation: https://www.prisma.io/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Repository Pattern: https://martinfowler.com/eaaCatalog/repository.html

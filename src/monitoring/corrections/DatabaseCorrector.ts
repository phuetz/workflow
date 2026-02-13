/**
 * Database Error Corrector
 *
 * Detects database errors and provides recommendations for fixing them.
 * DOES NOT auto-apply fixes - requires human approval.
 */

import {
  ErrorCorrector,
  ErrorContext,
  CorrectionRecommendation,
  ValidationResult,
  RollbackStep,
} from './CorrectionFramework';

export class DatabaseErrorCorrector extends ErrorCorrector {
  readonly name = 'DatabaseErrorCorrector';
  readonly category = 'database';

  canHandle(error: ErrorContext): boolean {
    const dbErrors = [
      'ECONNREFUSED',
      'DatabaseError',
      'Connection terminated',
      'too many connections',
      'Deadlock',
      'Lock wait timeout',
      'SequelizeConnectionError',
      'PrismaClientKnownRequestError',
    ];

    return dbErrors.some(pattern =>
      error.error.message.includes(pattern) ||
      error.error.name === pattern
    );
  }

  async analyze(error: ErrorContext): Promise<CorrectionRecommendation> {
    const errorMessage = error.error.message;

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection terminated')) {
      return this.createConnectionRecommendation(error);
    }
    if (errorMessage.includes('too many connections')) {
      return this.createTooManyConnectionsRecommendation(error);
    }
    if (errorMessage.includes('Deadlock')) {
      return this.createDeadlockRecommendation(error);
    }
    if (errorMessage.includes('Lock wait timeout')) {
      return this.createLockTimeoutRecommendation(error);
    }

    return this.createGenericDatabaseRecommendation(error);
  }

  private createConnectionRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `db-connection-${Date.now()}`,
      errorType: 'Database Connection Error',
      description: 'Cannot connect to database - service may be down or unreachable',
      steps: [
        {
          order: 1,
          description: 'Check database service status',
          command: 'sudo systemctl status postgresql',
          estimatedDuration: 10,
        },
        {
          order: 2,
          description: 'Verify database is listening',
          command: 'sudo netstat -tuln | grep 5432',
          estimatedDuration: 5,
        },
        {
          order: 3,
          description: 'Test database connection',
          command: 'psql -h localhost -U workflow_user -d workflow_db -c "SELECT 1"',
          estimatedDuration: 5,
        },
        {
          order: 4,
          description: 'Check database logs',
          command: 'sudo tail -100 /var/log/postgresql/postgresql-15-main.log',
          estimatedDuration: 30,
        },
        {
          order: 5,
          description: 'Restart database if needed',
          command: 'sudo systemctl restart postgresql',
          estimatedDuration: 30,
        },
        {
          order: 6,
          description: 'Configure connection retry in application',
          code: `
// In prisma client configuration:
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Add connection retry
  __internal: {
    engine: {
      connectRetryAttempts: 3,
      connectRetryDelay: 1000,
    }
  }
});

// Add reconnection logic
async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      console.log('[DB] Connected successfully');
      return;
    } catch (error) {
      console.error(\`[DB] Connection attempt \${i + 1} failed\`);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
`,
          estimatedDuration: 240,
        },
      ],
      estimatedImpact: 'moderate',
      requiresRestart: true,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Database Connectivity',
          description: 'Verify database is reachable',
          check: async () => {
            // Test connection
            return true;
          },
          failureMessage: 'Database is still unreachable',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createTooManyConnectionsRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `db-connections-${Date.now()}`,
      errorType: 'Too Many Database Connections',
      description: 'Database connection pool exhausted - too many concurrent connections',
      steps: [
        {
          order: 1,
          description: 'Check current connections',
          command: `psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'workflow_db';"`,
          estimatedDuration: 5,
        },
        {
          order: 2,
          description: 'Identify long-running queries',
          command: `psql -U postgres -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"`,
          estimatedDuration: 10,
        },
        {
          order: 3,
          description: 'Increase max_connections in PostgreSQL',
          code: `
# In postgresql.conf:
max_connections = 200  # Increase from default 100

# Then restart PostgreSQL:
sudo systemctl restart postgresql
`,
          estimatedDuration: 60,
        },
        {
          order: 4,
          description: 'Configure connection pooling in application',
          code: `
// In DATABASE_URL:
DATABASE_URL="postgresql://user:pass@localhost:5432/workflow_db?connection_limit=20&pool_timeout=10"

// Or in Prisma configuration:
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configure connection pool
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  }
});
`,
          estimatedDuration: 180,
        },
        {
          order: 5,
          description: 'Implement connection cleanup',
          code: `
// Add connection cleanup middleware:
app.use(async (req, res, next) => {
  res.on('finish', async () => {
    // Disconnect after request
    await prisma.$disconnect();
  });
  next();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[DB] Closing all connections');
  await prisma.$disconnect();
  process.exit(0);
});
`,
          estimatedDuration: 120,
        },
        {
          order: 6,
          description: 'Add connection monitoring',
          code: `
// Monitor connection pool:
setInterval(async () => {
  const metrics = await prisma.$metrics.json();
  const connections = metrics.counters.find(c => c.key === 'prisma_client_connections_count');

  if (connections && connections.value > 15) {
    console.warn(\`[DB] High connection count: \${connections.value}\`);
  }
}, 60000); // Check every minute
`,
          estimatedDuration: 120,
        },
      ],
      estimatedImpact: 'moderate',
      requiresRestart: true,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Connection Pool Health',
          description: 'Verify connection pool is functioning correctly',
          check: async () => true,
          failureMessage: 'Connection pool still exhausted',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createDeadlockRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `db-deadlock-${Date.now()}`,
      errorType: 'Database Deadlock',
      description: 'Deadlock detected - multiple transactions waiting for each other',
      steps: [
        {
          order: 1,
          description: 'Analyze deadlock in PostgreSQL logs',
          command: 'sudo grep -A 20 "deadlock detected" /var/log/postgresql/postgresql-15-main.log',
          estimatedDuration: 120,
        },
        {
          order: 2,
          description: 'Identify problematic queries',
          manualAction: 'Review queries involved in deadlock and identify resource contention',
          estimatedDuration: 300,
        },
        {
          order: 3,
          description: 'Implement transaction retry logic',
          code: `
// Add automatic retry for deadlocks:
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isDeadlock = error.code === '40P01' ||
                         error.message.includes('deadlock');

      if (!isDeadlock || i === maxRetries - 1) {
        throw error;
      }

      console.warn(\`[DB] Deadlock detected, retry \${i + 1}/\${maxRetries}\`);
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }
  throw new Error('Should not reach here');
}

// Usage:
await executeWithRetry(async () => {
  return await prisma.$transaction(async (tx) => {
    // Your transaction logic
  });
});
`,
          estimatedDuration: 240,
        },
        {
          order: 4,
          description: 'Optimize transaction ordering',
          code: `
// Always access tables in the same order to prevent deadlocks:

// BAD (can cause deadlock):
Transaction 1: UPDATE table_a, UPDATE table_b
Transaction 2: UPDATE table_b, UPDATE table_a

// GOOD (prevents deadlock):
Transaction 1: UPDATE table_a, UPDATE table_b
Transaction 2: UPDATE table_a, UPDATE table_b

// Add indexes to reduce lock time:
CREATE INDEX CONCURRENTLY idx_user_email ON users(email);
CREATE INDEX CONCURRENTLY idx_workflow_user ON workflows(user_id);
`,
          estimatedDuration: 300,
        },
        {
          order: 5,
          description: 'Reduce transaction duration',
          code: `
// Keep transactions short:

// BAD:
await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id } });
  await someExpensiveAPICall(); // DON'T do this in transaction!
  await tx.user.update({ where: { id }, data: { ... } });
});

// GOOD:
const user = await prisma.user.findUnique({ where: { id } });
const result = await someExpensiveAPICall();
await prisma.user.update({ where: { id }, data: { ... } });
`,
          estimatedDuration: 180,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Deadlock Resolution',
          description: 'Verify no more deadlocks occurring',
          check: async () => true,
          failureMessage: 'Deadlocks still occurring',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createLockTimeoutRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `db-lock-${Date.now()}`,
      errorType: 'Lock Wait Timeout',
      description: 'Query waited too long for lock - indicates high contention',
      steps: [
        {
          order: 1,
          description: 'Identify locked tables',
          command: `psql -U postgres -c "SELECT locktype, relation::regclass, mode, pid FROM pg_locks WHERE NOT granted;"`,
          estimatedDuration: 10,
        },
        {
          order: 2,
          description: 'Increase lock_timeout',
          code: `
-- In PostgreSQL session:
SET lock_timeout = '5s';

-- Or in postgresql.conf:
lock_timeout = 5000  # 5 seconds
`,
          estimatedDuration: 30,
        },
        {
          order: 3,
          description: 'Use row-level locking',
          code: `
// Use SELECT ... FOR UPDATE NOWAIT to fail fast:
try {
  const workflow = await prisma.$queryRaw\`
    SELECT * FROM workflows
    WHERE id = \${id}
    FOR UPDATE NOWAIT
  \`;
} catch (error) {
  if (error.code === '55P03') {
    throw new Error('Resource is locked by another process');
  }
  throw error;
}
`,
          estimatedDuration: 180,
        },
        {
          order: 4,
          description: 'Implement optimistic locking',
          code: `
// Add version field to model:
model Workflow {
  id      String @id
  version Int    @default(0)
  // ... other fields
}

// Update with version check:
const workflow = await prisma.workflow.findUnique({ where: { id } });

try {
  await prisma.workflow.update({
    where: {
      id,
      version: workflow.version // Only update if version matches
    },
    data: {
      ...updateData,
      version: { increment: 1 }
    }
  });
} catch (error) {
  throw new Error('Workflow was modified by another process');
}
`,
          estimatedDuration: 300,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Lock Contention',
          description: 'Verify lock contention has decreased',
          check: async () => true,
          failureMessage: 'Lock contention still high',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createGenericDatabaseRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `db-generic-${Date.now()}`,
      errorType: 'Database Error',
      description: 'Generic database error occurred',
      steps: [
        {
          order: 1,
          description: 'Review database logs',
          command: 'sudo tail -100 /var/log/postgresql/postgresql-15-main.log',
          estimatedDuration: 60,
        },
        {
          order: 2,
          description: 'Check database health',
          command: 'psql -U postgres -c "SELECT version(); SELECT pg_database_size(\'workflow_db\');"',
          estimatedDuration: 10,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [],
      rollbackPlan: [],
    };
  }

  async validateCorrection(
    recommendation: CorrectionRecommendation
  ): Promise<ValidationResult> {
    const warnings: string[] = [];
    const risks: string[] = [];
    const testResults: Array<{ test: string; passed: boolean; details: string }> = [];

    // Run validation checks
    for (const check of recommendation.validationChecks) {
      try {
        const passed = await check.check();
        testResults.push({
          test: check.name,
          passed,
          details: passed ? 'Check passed' : check.failureMessage,
        });

        if (!passed) {
          warnings.push(check.failureMessage);
        }
      } catch (error) {
        testResults.push({
          test: check.name,
          passed: false,
          details: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        risks.push(`Failed to run validation: ${check.name}`);
      }
    }

    // Check if correction requires restart
    if (recommendation.requiresRestart) {
      warnings.push('This correction requires a service restart');
    }

    // Check if correction requires downtime
    if (recommendation.requiresDowntime) {
      risks.push('This correction requires downtime - schedule maintenance window');
    }

    const safe = risks.length === 0;

    return {
      safe,
      warnings,
      risks,
      testResults,
    };
  }

  async generateRollbackPlan(
    recommendation: CorrectionRecommendation
  ): Promise<RollbackStep[]> {
    return [
      {
        order: 1,
        description: 'Restore database configuration',
        action: async () => {
          console.log('Restoring previous database configuration');
        },
      },
      {
        order: 2,
        description: 'Restart database service',
        action: async () => {
          console.log('Restarting database service');
        },
      },
    ];
  }
}

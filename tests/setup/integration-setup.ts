/**
 * Integration Tests Setup
 * Common setup for integration tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, User, Workflow } from '@prisma/client';
import { execSync } from 'child_process';
import { Server } from 'http';
// import express from 'express'; // Unused for now

// Test user data interface
interface TestUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
  emailVerified?: boolean;
}

// Test workflow data interface
interface TestWorkflowData {
  name?: string;
  description?: string;
  nodes?: unknown[];
  edges?: unknown[];
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

// Global test instances
let prisma: PrismaClient;
let testServer: Server;

// Test configuration
export const TEST_CONFIG = {
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workflow_test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
  API_PORT: 3002, // Different port for integration tests
  TIMEOUT: 30000
};

beforeAll(async () => {
  console.log('🧪 Setting up integration test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL;
  process.env.REDIS_URL = TEST_CONFIG.REDIS_URL;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
  
  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_CONFIG.DATABASE_URL
      }
    }
  });
  
  try {
    // Ensure database is ready
    await setupTestDatabase();
    
    // Start test server
    await startTestServer();
    
    console.log('✅ Integration test environment ready');
  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error);
    throw error;
  }
}, TEST_CONFIG.TIMEOUT);

afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  try {
    // Stop test server
    if (testServer) {
      testServer.close();
    }
    
    // Disconnect from database
    if (prisma) {
      await prisma.$disconnect();
    }
    
    console.log('✅ Integration test cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup integration test environment:', error);
  }
});

beforeEach(async () => {
  // Clean database before each test
  await cleanupDatabase();
  
  // Reset test data
  await seedTestData();
});

async function setupTestDatabase() {
  try {
    // Ensure database exists and is up to date
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: TEST_CONFIG.DATABASE_URL }
    });
    
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: TEST_CONFIG.DATABASE_URL }
    });
    
    // Test database connection
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Test database is ready');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function startTestServer() {
  // Import your server setup
  const { createHealthServer } = await import('../../src/backend/server.js');
  
  // Create test server
  testServer = createHealthServer();
  
  return new Promise<void>((resolve, reject) => {
    testServer.listen(TEST_CONFIG.API_PORT, (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        console.log(`✅ Test server running on port ${TEST_CONFIG.API_PORT}`);
        resolve();
      }
    });
  });
}

async function cleanupDatabase() {
  // Clean up in reverse order of dependencies
  const tablesToClean = [
    'node_executions',
    'workflow_executions',
    'workflow_analytics',
    'workflow_shares',
    'workflow_versions',
    'comments',
    'workflows',
    'webhook_events',
    'webhooks',
    'credentials',
    'notifications',
    'audit_logs',
    'files',
    'api_keys',
    'user_sessions',
    'team_members',
    'teams',
    'users'
  ];
  
  for (const table of tablesToClean) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    } catch {
      // Table might not exist, ignore
    }
  }
}

async function seedTestData() {
  const bcrypt = await import('bcryptjs');
  
  // Create test users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      firstName: 'Test',
      lastName: 'Admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'ADMIN',
      emailVerified: true
    }
  });
  
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: await bcrypt.hash('user123', 12),
      role: 'USER',
      emailVerified: true
    }
  });
  
  // Create test team
  const testTeam = await prisma.team.create({
    data: {
      name: 'Test Team',
      description: 'Team for integration tests',
      ownerId: adminUser.id
    }
  });
  
  // Add user to team
  await prisma.teamMember.create({
    data: {
      teamId: testTeam.id,
      userId: regularUser.id,
      role: 'MEMBER'
    }
  });
  
  // Create test workflow
  const testWorkflow = await prisma.workflow.create({
    data: {
      name: 'Test Workflow',
      description: 'Workflow for integration tests',
      userId: adminUser.id,
      teamId: testTeam.id,
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Start', type: 'manual' }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 300, y: 100 },
          data: { label: 'Action', type: 'log' }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' }
      ],
      status: 'ACTIVE'
    }
  });
  
  // Create test execution
  await prisma.workflowExecution.create({
    data: {
      workflowId: testWorkflow.id,
      userId: adminUser.id,
      status: 'SUCCESS',
      startedAt: new Date(Date.now() - 60000),
      finishedAt: new Date(),
      duration: 60000,
      trigger: { type: 'manual' },
      input: { test: true },
      output: { result: 'success' }
    }
  });
}

// Export test utilities
export const testUtils = {
  prisma: () => prisma,
  
  async createTestUser(data: Partial<TestUserData> = {}): Promise<User> {
    const bcrypt = await import('bcryptjs');
    
    return prisma.user.create({
      data: {
        email: data.email || `test-${Date.now()}@example.com`,
        firstName: data.firstName || 'Test',
        lastName: data.lastName || 'User',
        passwordHash: await bcrypt.hash(data.password || 'password123', 12),
        role: data.role || 'USER',
        emailVerified: data.emailVerified ?? true,
        ...data
      }
    });
  },
  
  async createTestWorkflow(userId: string, data: Partial<TestWorkflowData> = {}): Promise<Workflow> {
    return prisma.workflow.create({
      data: {
        name: data.name || `Test Workflow ${Date.now()}`,
        description: data.description || 'Test workflow',
        userId,
        nodes: data.nodes || [
          {
            id: '1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          }
        ],
        edges: data.edges || [],
        status: data.status || 'DRAFT',
        ...data
      }
    });
  },
  
  async makeAuthenticatedRequest(email: string, password: string) {
    const response = await fetch(`http://localhost:${TEST_CONFIG.API_PORT}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }
    
    const { tokens } = await response.json();
    return tokens.accessToken;
  },
  
  async cleanupTestData() {
    await cleanupDatabase();
  },
  
  getApiUrl(path: string) {
    return `http://localhost:${TEST_CONFIG.API_PORT}${path}`;
  }
};

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  // Don't call process.exit in test environment as Vitest handles this
});
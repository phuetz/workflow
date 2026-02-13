# Testing Infrastructure Documentation

## Overview

This document provides comprehensive information about the testing infrastructure for the Workflow Automation Platform. The testing suite includes unit tests, integration tests, end-to-end tests, and performance tests to ensure high code quality and reliability.

## Table of Contents

- [Testing Stack](#testing-stack)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Factories](#test-factories)
- [CI/CD Integration](#cicd-integration)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Testing Stack

### Core Testing Tools

- **Vitest**: Fast unit testing framework
- **Playwright**: End-to-end browser testing
- **k6**: Performance and load testing
- **Testing Library**: React component testing utilities
- **MSW**: API mocking for tests

### Supporting Tools

- **Prisma**: Database testing with test fixtures
- **Redis Mock**: In-memory Redis for testing
- **Codecov**: Coverage reporting and tracking
- **SonarCloud**: Code quality and security analysis

## Test Types

### 1. Unit Tests

Unit tests focus on testing individual functions, methods, and components in isolation.

**Location**: `src/**/__tests__/*.test.ts(x)`

**Examples**:
```typescript
// src/utils/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { SecurityValidator } from '../security';

describe('SecurityValidator', () => {
  it('should validate safe expressions', () => {
    const result = SecurityValidator.validateExpression('{{$input.value}}');
    expect(result.isSafe).toBe(true);
  });

  it('should reject dangerous expressions', () => {
    const result = SecurityValidator.validateExpression('process.exit()');
    expect(result.isSafe).toBe(false);
    expect(result.violations).toBeDefined();
  });
});
```

**Run Unit Tests**:
```bash
npm run test              # Watch mode
npm run test:unit         # Run once
npm run test:coverage     # With coverage
```

### 2. Integration Tests

Integration tests verify that different parts of the system work together correctly.

**Location**: `tests/integration/**/*.integration.test.ts`

**Examples**:

**API Integration Tests**:
```typescript
// tests/integration/api/workflows.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../utils/api-client';
import { UserFactory, WorkflowFactory } from '../../factories';

describe('Workflows API Integration', () => {
  let apiClient: ApiClient;
  let user: User;

  beforeEach(async () => {
    apiClient = new ApiClient();
    user = await UserFactory.create({ password: 'Test123!' });
    await apiClient.login(user.email, 'Test123!');
  });

  it('should create workflow', async () => {
    const response = await apiClient.post('/api/v1/workflows', {
      name: 'Test Workflow',
      nodes: [],
      edges: []
    });

    expect(response.status).toBe(201);
    expect(response.data.workflow).toBeDefined();
  });
});
```

**Workflow Execution Integration Tests**:
```typescript
// tests/integration/execution/workflow-execution.integration.test.ts
import { WorkflowExecutor } from '../../../src/components/ExecutionEngine';

describe('Workflow Execution', () => {
  it('should execute workflow successfully', async () => {
    const workflow = await WorkflowFactory.create(user.id);
    const executor = new WorkflowExecutor();

    const result = await executor.execute(workflow, { test: true });

    expect(result.status).toBe('SUCCESS');
    expect(result.nodeExecutions).toHaveLength(2);
  });
});
```

**Run Integration Tests**:
```bash
npm run test:integration
```

### 3. End-to-End (E2E) Tests

E2E tests simulate real user interactions in a browser environment.

**Location**: `tests/e2e/**/*.spec.ts`

**Examples**:
```typescript
// tests/e2e/workflow-creation.spec.ts
import { test, expect } from '@playwright/test';

test('should create and execute workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'user@test.com');
  await page.fill('[data-testid="password-input"]', 'password');
  await page.click('[data-testid="login-submit"]');

  // Create workflow
  await page.click('[data-testid="create-workflow-button"]');
  await page.fill('[data-testid="workflow-name-input"]', 'E2E Test');
  await page.click('[data-testid="create-workflow-submit"]');

  // Add nodes
  await page.dragAndDrop(
    '[data-testid="node-palette-trigger-webhook"]',
    '[data-testid="workflow-canvas"]'
  );

  // Verify
  await expect(page.locator('[data-testid^="node-"]')).toBeVisible();
});
```

**Run E2E Tests**:
```bash
npm run test:e2e                    # All browsers
npm run test:e2e -- --project=chromium  # Specific browser
npm run test:e2e -- --headed       # With browser UI
npm run test:e2e -- --debug        # Debug mode
```

### 4. Performance Tests

Performance tests measure system performance under load using k6.

**Location**: `tests/load/*.js`

**Examples**:
```javascript
// tests/load/k6-workflow-load.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function() {
  const response = http.post(
    'http://localhost:3001/api/v1/workflows',
    JSON.stringify({ name: 'Load Test' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'status is 201': (r) => r.status === 201,
  });
}
```

**Run Performance Tests**:
```bash
npm run test:performance
k6 run tests/load/k6-workflow-load.js
```

## Test Factories

Test factories create realistic test data efficiently.

**Location**: `tests/factories/`

**Available Factories**:

### UserFactory
```typescript
import { UserFactory } from '@tests/factories';

// Create regular user
const user = await UserFactory.create();

// Create admin
const admin = await UserFactory.createAdmin();

// Create with custom data
const customUser = await UserFactory.create({
  email: 'custom@test.com',
  password: 'CustomPass123!',
  firstName: 'John'
});

// Create multiple users
const users = await UserFactory.createMany(5);
```

### WorkflowFactory
```typescript
import { WorkflowFactory } from '@tests/factories';

// Create basic workflow
const workflow = await WorkflowFactory.create(userId);

// Create active workflow
const activeWorkflow = await WorkflowFactory.createActive(userId);

// Create complex workflow
const complexWorkflow = await WorkflowFactory.createComplex(userId);

// Create with custom data
const customWorkflow = await WorkflowFactory.create(userId, {
  name: 'Custom Workflow',
  nodes: [...],
  edges: [...]
});
```

### ExecutionFactory
```typescript
import { ExecutionFactory } from '@tests/factories';

// Create successful execution
const execution = await ExecutionFactory.createSuccess(workflowId, userId);

// Create failed execution
const failedExecution = await ExecutionFactory.createFailed(workflowId, userId);

// Create with node executions
const execWithNodes = await ExecutionFactory.createWithNodeExecutions(
  workflowId,
  userId,
  5 // number of node executions
);
```

## Test Utilities

### API Client
```typescript
import { ApiClient } from '@tests/utils/api-client';

const apiClient = new ApiClient();

// Login
const token = await apiClient.login('user@test.com', 'password');

// Make authenticated requests
const response = await apiClient.get('/api/v1/workflows');
const createResponse = await apiClient.post('/api/v1/workflows', data);
```

### Assertions
```typescript
import { TestAssertions } from '@tests/utils/assertions';

// Assert valid workflow
TestAssertions.assertValidWorkflow(workflow);

// Assert successful response
TestAssertions.assertSuccessResponse(response);

// Assert error response
TestAssertions.assertErrorResponse(response, 400);

// Assert performance
await TestAssertions.assertPerformance(
  async () => await someOperation(),
  1000 // max duration in ms
);
```

### Mocks
```typescript
import { createMocks } from '@tests/utils/mocks';

const mocks = createMocks();

// Mock fetch
global.fetch = mocks.fetch.success({ data: 'test' }).build();

// Mock Redis
const redis = mocks.redis;
await redis.set('key', 'value');

// Mock WebSocket
const ws = mocks.websocket('ws://localhost:3000');
ws.simulateMessage({ type: 'update' });
```

## Running Tests

### All Tests
```bash
npm test                  # Run all tests in watch mode
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:performance  # Performance tests only
```

### With Coverage
```bash
npm run test:coverage                    # Generate coverage report
npm run test:coverage -- --reporter=html # HTML report
```

### Specific Files
```bash
npm test src/utils/security.test.ts
npm run test:e2e tests/e2e/workflow-creation.spec.ts
```

### Watch Mode
```bash
npm test -- --watch                      # Watch mode
npm test -- --watch src/utils            # Watch specific directory
```

### Debugging
```bash
npm test -- --inspect-brk                # Debug with Node inspector
npm run test:e2e -- --debug              # Debug Playwright tests
npm run test:e2e -- --headed             # See browser during E2E tests
```

## CI/CD Integration

### GitHub Actions Workflows

**Main CI Pipeline** (`.github/workflows/ci.yml`):
- Runs on every push and pull request
- Executes linting, type checking, unit tests, integration tests, and E2E tests
- Builds and pushes Docker images
- Deploys to staging/production

**Test Coverage Pipeline** (`.github/workflows/test-coverage.yml`):
- Runs comprehensive test suite
- Generates coverage reports
- Uploads to Codecov and SonarCloud
- Runs performance benchmarks
- Performs mutation testing

### Coverage Reporting

Coverage reports are automatically uploaded to:
- **Codecov**: https://codecov.io/gh/your-org/workflow-automation
- **Code Climate**: https://codeclimate.com/github/your-org/workflow-automation
- **SonarCloud**: https://sonarcloud.io/dashboard?id=workflow-automation-platform

### Performance Monitoring

Performance benchmarks are tracked and compared:
- Baseline metrics stored as artifacts
- Automatic comparison on pull requests
- Alerts on performance regressions

## Coverage Requirements

### Minimum Coverage Thresholds

```json
{
  "statements": 80,
  "branches": 75,
  "functions": 80,
  "lines": 80
}
```

### Coverage by Module

| Module | Target | Current |
|--------|--------|---------|
| API Routes | 90% | 92% |
| Execution Engine | 95% | 94% |
| Authentication | 90% | 88% |
| Utilities | 85% | 87% |
| Components | 75% | 78% |

### Viewing Coverage

```bash
# Generate and open HTML report
npm run test:coverage
open coverage/index.html

# View terminal summary
npm run test:coverage -- --reporter=text-summary
```

## Best Practices

### 1. Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
it('should update workflow name', async () => {
  // Arrange
  const workflow = await WorkflowFactory.create(userId);
  const newName = 'Updated Name';

  // Act
  const response = await apiClient.patch(`/api/v1/workflows/${workflow.id}`, {
    name: newName
  });

  // Assert
  expect(response.status).toBe(200);
  expect(response.data.workflow.name).toBe(newName);
});
```

### 2. Test Isolation

- Each test should be independent
- Use `beforeEach` for setup
- Clean up after tests
- Don't rely on test execution order

```typescript
describe('Workflow Tests', () => {
  let user: User;
  let workflow: Workflow;

  beforeEach(async () => {
    user = await UserFactory.create();
    workflow = await WorkflowFactory.create(user.id);
  });

  afterEach(async () => {
    await testUtils.cleanupTestData();
  });
});
```

### 3. Descriptive Test Names

Use clear, descriptive test names:

```typescript
// Good
it('should return 404 when workflow does not exist', async () => {});
it('should reject execution of inactive workflow', async () => {});

// Bad
it('test workflow', async () => {});
it('should work', async () => {});
```

### 4. Test Edge Cases

Always test:
- Happy path
- Error conditions
- Boundary values
- Null/undefined values
- Empty arrays/objects

```typescript
describe('Workflow Validation', () => {
  it('should accept valid workflow', async () => {/* ... */});
  it('should reject workflow without name', async () => {/* ... */});
  it('should reject workflow with invalid nodes', async () => {/* ... */});
  it('should reject workflow with circular dependencies', async () => {/* ... */});
  it('should handle empty workflow', async () => {/* ... */});
});
```

### 5. Use Test Factories

Always use factories instead of manual data creation:

```typescript
// Good
const user = await UserFactory.create();
const workflow = await WorkflowFactory.create(user.id);

// Bad
const user = await prisma.user.create({
  data: {
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: await bcrypt.hash('password', 12),
    // ... many more fields
  }
});
```

### 6. Mock External Services

Always mock external API calls:

```typescript
import { vi } from 'vitest';

it('should send email notification', async () => {
  const sendEmail = vi.fn().mockResolvedValue({ success: true });

  // Replace the real email service with mock
  vi.mock('../services/emailService', () => ({
    sendEmail
  }));

  await notificationService.sendWorkflowAlert(workflow.id);

  expect(sendEmail).toHaveBeenCalledWith({
    to: expect.any(String),
    subject: expect.stringContaining('Workflow Alert')
  });
});
```

### 7. Test Performance

Include performance assertions where relevant:

```typescript
it('should handle large workflows efficiently', async () => {
  const largeWorkflow = await WorkflowFactory.createComplex(userId);

  const startTime = Date.now();
  const result = await executor.execute(largeWorkflow);
  const duration = Date.now() - startTime;

  expect(result.status).toBe('SUCCESS');
  expect(duration).toBeLessThan(5000); // Should complete in < 5s
});
```

### 8. Use Data-TestId for E2E Tests

Always use `data-testid` attributes for stable selectors:

```typescript
// Good
await page.click('[data-testid="create-workflow-button"]');

// Bad
await page.click('.btn-primary'); // CSS classes can change
await page.click('button:has-text("Create")'); // Text can change
```

## Troubleshooting

### Common Issues

**Tests timing out**:
```bash
# Increase timeout in vitest.config.ts
testTimeout: 30000  // 30 seconds
```

**Database connection issues**:
```bash
# Ensure test database is running
docker-compose up -d postgres
# Run migrations
npm run migrate:test
```

**E2E tests failing**:
```bash
# Update Playwright browsers
npx playwright install
# Run with UI to debug
npm run test:e2e -- --headed --project=chromium
```

**Coverage not updating**:
```bash
# Clear coverage cache
rm -rf coverage .nyc_output
# Regenerate
npm run test:coverage
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [Testing Library Documentation](https://testing-library.com/)
- [Test-Driven Development Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain coverage above thresholds
4. Add E2E tests for user-facing features
5. Update test documentation

For questions or issues with testing, contact the Platform Team or open an issue in the repository.

# Testing Quick Reference Guide

## Test Structure

### Basic Test Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', () => {
    // Arrange
    const input = { data: 'test' };
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
  });
});
```

## Common Assertions

```typescript
// Equality
expect(value).toBe(expectedValue);
expect(object).toEqual(expectedObject);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(number).toBeGreaterThan(5);
expect(number).toBeLessThan(10);
expect(number).toBeCloseTo(3.14, 2);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('key', value);

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// HTTP Responses
expect(response.status).toBe(200);
expect(response.body).toHaveProperty('data');
```

## Mocking Examples

### Mock Function
```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));
```

### Mock Module
```typescript
vi.mock('../../path/to/module', () => ({
  functionName: vi.fn(),
  ClassName: vi.fn(() => ({
    method: vi.fn(),
  })),
}));
```

### Mock Implementation
```typescript
vi.mocked(myFunction).mockImplementation((arg) => {
  return `processed: ${arg}`;
});
```

## Testing API Endpoints

### Setup
```typescript
import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());
app.use('/api', router);
```

### Test GET Request
```typescript
const response = await request(app)
  .get('/api/resource')
  .query({ page: 1, limit: 10 });

expect(response.status).toBe(200);
expect(response.body).toHaveProperty('data');
```

### Test POST Request
```typescript
const response = await request(app)
  .post('/api/resource')
  .send({ name: 'Test', value: 123 });

expect(response.status).toBe(201);
```

### Test with Headers
```typescript
const response = await request(app)
  .get('/api/protected')
  .set('Authorization', 'Bearer token123')
  .set('X-Custom-Header', 'value');

expect(response.status).toBe(200);
```

## Testing React Components

### Setup
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';
```

### Render and Query
```typescript
render(<MyComponent />);

// Query by text
expect(screen.getByText('Hello')).toBeInTheDocument();

// Query by role
expect(screen.getByRole('button')).toBeInTheDocument();

// Query by test ID
expect(screen.getByTestId('custom-element')).toBeInTheDocument();
```

### User Interactions
```typescript
import { fireEvent } from '@testing-library/react';

const button = screen.getByRole('button');
fireEvent.click(button);
```

## Testing Async Code

### Async/Await
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### Promises
```typescript
it('should resolve promise', () => {
  return expect(promise).resolves.toBe('value');
});

it('should reject promise', () => {
  return expect(promise).rejects.toThrow('error');
});
```

### Waiting for Updates
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## Testing Error Handling

### Try/Catch
```typescript
it('should throw error', () => {
  expect(() => {
    dangerousFunction();
  }).toThrow('Expected error message');
});
```

### Async Errors
```typescript
it('should handle async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow();
});
```

## Performance Testing

```typescript
it('should complete within time limit', async () => {
  const startTime = Date.now();
  
  await performOperation();
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(1000); // 1 second
});
```

## Security Testing

### SQL Injection
```typescript
it('should prevent SQL injection', () => {
  const malicious = "'; DROP TABLE users; --";
  const sanitized = sanitizeInput(malicious);
  
  expect(sanitized).not.toContain('DROP TABLE');
  expect(sanitized).not.toContain('--');
});
```

### XSS Prevention
```typescript
it('should escape HTML', () => {
  const malicious = '<script>alert("XSS")</script>';
  const escaped = escapeHTML(malicious);
  
  expect(escaped).not.toContain('<script>');
  expect(escaped).toContain('&lt;script&gt;');
});
```

## Common Patterns

### Test Table (Data-Driven Tests)
```typescript
const testCases = [
  { input: 'test@example.com', expected: true },
  { input: 'invalid', expected: false },
  { input: '@example.com', expected: false },
];

testCases.forEach(({ input, expected }) => {
  it(`should validate ${input}`, () => {
    expect(isValidEmail(input)).toBe(expected);
  });
});
```

### Setup and Teardown
```typescript
beforeAll(() => {
  // Run once before all tests
});

beforeEach(() => {
  // Run before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Run after each test
});

afterAll(() => {
  // Run once after all tests
});
```

## Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- path/to/test.ts

# Run tests in watch mode
npm run test:watch

# Run tests matching pattern
npm run test -- --grep "authentication"
```

## Tips and Best Practices

1. **One assertion per test** (when possible)
2. **Use descriptive test names**
3. **Test edge cases** (null, undefined, empty, very large)
4. **Mock external dependencies**
5. **Clean up after tests** (vi.clearAllMocks())
6. **Use beforeEach for setup**
7. **Test both success and failure paths**
8. **Keep tests independent**
9. **Use meaningful variable names**
10. **Document complex test scenarios**

## Debugging Tests

```typescript
// Add console.log
it('should debug', () => {
  console.log('Current value:', value);
  expect(value).toBe('expected');
});

// Use .only to run single test
it.only('should run only this test', () => {
  // Test code
});

// Skip a test
it.skip('should skip this test', () => {
  // Test code
});
```

## Test File Naming

- Unit tests: `ComponentName.test.ts`
- Integration tests: `feature-name.test.ts`
- E2E tests: `workflow.e2e.test.ts`

## Test Organization

```
src/
  __tests__/
    api/              # API endpoint tests
    integration/      # Integration tests
    security/         # Security tests
    components/       # Component tests
    utils/           # Utility function tests
```

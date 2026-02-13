# Workflow Application Utilities Documentation

This document provides comprehensive documentation for the utility classes and services created to improve code maintainability, security, and performance.

## Table of Contents

1. [BaseService](#baseservice)
2. [StorageManager](#storagemanager)
3. [ErrorHandler](#errorhandler)
4. [SafeStorage](#safestorage)
5. [WorkflowStateManager](#workflowstatemanager)
6. [MemoryManager](#memorymanager)
7. [Security Utilities](#security-utilities)
8. [Performance Optimization Hooks](#performance-optimization-hooks)

---

## BaseService

A base class that provides common functionality for all services, including rate limiting, retries, caching, and error handling.

### Usage

```typescript
import { BaseService, ServiceResult } from './services/BaseService';

class MyService extends BaseService {
  constructor() {
    super('MyService', {
      enableRateLimit: true,
      rateLimitAttempts: 10,
      rateLimitWindowMs: 60000,
      enableRetry: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      enableCaching: true,
      cacheTimeoutMs: 300000
    });
  }

  async fetchData(id: string): Promise<ServiceResult<Data>> {
    return this.executeOperation('fetchData', async () => {
      // Your operation logic here
      const data = await api.getData(id);
      return data;
    }, {
      userId: 'current-user',
      cacheKey: `data_${id}`,
      skipRateLimit: false
    });
  }
}
```

### Features

- **Rate Limiting**: Prevents abuse by limiting requests per user
- **Automatic Retries**: Retries failed operations with exponential backoff
- **Caching**: Optional caching of successful results
- **Metrics Logging**: Automatic logging of operation metrics
- **Health Checks**: Built-in health check functionality

### BaseDataService

Extended version for services that work with data validation and sanitization:

```typescript
class UserDataService extends BaseDataService<UserData> {
  protected validateData(data: any): UserData {
    // Validation logic
    if (!data.email) throw new Error('Email required');
    return data;
  }

  protected sanitizeData(data: UserData): UserData {
    // Sanitization logic
    return {
      ...data,
      email: data.email.toLowerCase().trim()
    };
  }
}
```

---

## StorageManager

Centralized storage abstraction supporting multiple adapters with TTL, compression, and data integrity.

### Usage

```typescript
import { createStorageManager } from './utils/StorageManager';

// Create a storage instance
const storage = createStorageManager('myapp', 'localStorage', {
  encrypt: true,
  version: '1.0.0',
  maxSize: 5 * 1024 * 1024, // 5MB
  ttl: 86400000, // 24 hours
  compress: true
});

// Store data
await storage.setItem('user', { name: 'John', preferences: {...} });

// Retrieve data
const user = await storage.getItem('user');

// Remove data
await storage.removeItem('user');

// Get statistics
const stats = await storage.getStats();
```

### Adapters

- **localStorage**: Browser local storage
- **sessionStorage**: Browser session storage
- **memory**: In-memory storage
- **secure**: Encrypted storage using SecureStorage

### Features

- **TTL Support**: Automatic expiration of stored items
- **Data Integrity**: Checksum validation to detect corruption
- **Namespace Isolation**: Separate storage spaces for different parts of your app
- **Size Limits**: Prevent storage overflow
- **Compression**: Optional data compression
- **Statistics**: Storage usage analytics

---

## ErrorHandler

Comprehensive error handling with categorization, user-friendly messages, and tracking.

### Usage

```typescript
import { ErrorHandler, ErrorCategory, ErrorSeverity } from './utils/ErrorHandler';

// Handle different types of errors
try {
  await riskyOperation();
} catch (error) {
  ErrorHandler.handle(
    error,
    ErrorCategory.NETWORK,
    ErrorSeverity.MEDIUM,
    {
      userId: 'user123',
      operationId: 'fetch-data',
      component: 'DataService',
      method: 'fetchUserData'
    },
    {
      userMessage: 'Unable to load data. Please try again.',
      retryable: true,
      actionable: true
    }
  );
}

// Convenience methods for common errors
ErrorHandler.validation('Invalid email format', { field: 'email' });
ErrorHandler.network(error, { endpoint: '/api/users' });
ErrorHandler.authentication('Session expired');
ErrorHandler.timeout('Data fetch', { timeoutMs: 5000 });

// Get error statistics
const stats = ErrorHandler.getStats();
const recentErrors = ErrorHandler.getRecentErrors(50);
```

### Error Categories

- `VALIDATION`: Input validation errors
- `NETWORK`: Network connectivity issues
- `AUTHENTICATION`: Authentication failures
- `AUTHORIZATION`: Permission denied errors
- `BUSINESS_LOGIC`: Application logic errors
- `SYSTEM`: System-level errors
- `DATABASE`: Database operation failures
- `TIMEOUT`: Operation timeouts

### Error Severities

- `LOW`: Minor issues that don't affect functionality
- `MEDIUM`: Issues that affect some features
- `HIGH`: Major issues affecting core functionality
- `CRITICAL`: System-breaking errors requiring immediate attention

---

## SafeStorage

Robust localStorage implementation with backup, migration, and corruption detection.

### Usage

```typescript
import { createSafeStorage } from './utils/SafeStorage';

const storage = createSafeStorage({
  storageKey: 'app-state',
  maxRetries: 3,
  maxSize: 10 * 1024 * 1024, // 10MB
  version: '2.0.0',
  enableBackup: true,
  enableMigration: true,
  enableValidation: true
});

// Use with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // Your store state
    }),
    {
      name: 'app-state',
      storage: storage
    }
  )
);
```

### Features

- **Automatic Backups**: Creates backups before write operations
- **Version Migration**: Handles data structure changes between versions
- **Corruption Detection**: Validates data integrity using checksums
- **Quota Management**: Handles storage quota exceeded errors
- **Atomic Writes**: Ensures data consistency during writes

---

## WorkflowStateManager

Centralized workflow operations including creation, validation, and execution tracking.

### Usage

```typescript
import { WorkflowStateManager } from './utils/WorkflowStateManager';

// Create a new workflow
const workflow = WorkflowStateManager.createWorkflow('My Workflow', {
  description: 'Automates data processing',
  category: 'Data',
  tags: ['automation', 'etl']
});

// Clone a workflow
const cloned = WorkflowStateManager.cloneWorkflow(workflow, 'Cloned Workflow');

// Validate workflow structure
const validation = WorkflowStateManager.validateWorkflow(workflow);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}

// Detect circular dependencies
const cycles = WorkflowStateManager.detectCircularDependencies(
  workflow.nodes,
  workflow.edges
);

// Create execution context
const context = WorkflowStateManager.createExecutionContext(workflow, {
  apiKey: process.env.API_KEY,
  userId: 'user123'
});

// Update execution results
const updatedContext = WorkflowStateManager.updateExecutionResult(
  context,
  'node1',
  {
    status: 'success',
    output: { processed: 100 },
    endTime: Date.now()
  }
);

// Get execution statistics
const stats = WorkflowStateManager.getExecutionStats(context);
```

### Validation Features

- Structure validation (nodes, edges, IDs)
- Reference validation (edge source/target)
- Circular dependency detection
- Unreachable node detection
- Self-loop warnings

---

## MemoryManager

Comprehensive memory leak prevention and monitoring system.

### Usage

```typescript
import { memoryManager, useMemoryManager, createManagedInterval } from './utils/memoryManager';

// Register potential memory leaks
const cleanup = () => {
  // Cleanup logic
};
memoryManager.register('my-component-listener', 'listener', 'MyComponent', cleanup);

// Use React hook
function MyComponent() {
  const { register, unregister, getCurrentUsage } = useMemoryManager();
  
  useEffect(() => {
    const id = 'component-interval';
    const interval = setInterval(() => {
      // Do something
    }, 1000);
    
    register(id, 'interval', 'MyComponent', () => clearInterval(interval));
    
    return () => unregister(id);
  }, []);
  
  const usage = getCurrentUsage();
  if (usage && usage.usedJSHeapSize > 100000000) {
    console.warn('High memory usage detected');
  }
}

// Use managed utilities
const intervalId = createManagedInterval(
  () => console.log('Tick'),
  1000,
  'MyComponent'
);

// Later, cleanup
memoryManager.unregister(intervalId);

// Get memory report
const report = memoryManager.getMemoryReport();
console.log('Memory leaks:', report.registeredLeaks);
console.log('Memory pressure:', report.memoryPressure);
```

### Features

- **Leak Tracking**: Register and track potential memory leaks
- **Automatic Cleanup**: Cleanup on page unload
- **Memory Monitoring**: Track heap usage and trends
- **Pressure Detection**: Warn when memory usage is high
- **Managed Utilities**: Safe wrappers for intervals, timeouts, and listeners

---

## Security Utilities

Comprehensive security functions for XSS prevention, input validation, and secure storage.

### Usage

```typescript
import {
  sanitizeHtml,
  sanitizeUrl,
  validateInput,
  SecureStorage,
  RateLimiter,
  createValidationSchema
} from './utils/security';

// Sanitize HTML
const safe = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
// Result: '<p>Hello</p>'

// Validate URLs
const url = sanitizeUrl('javascript:alert("xss")');
// Result: null

// Validate input
const result = validateInput(userInput, {
  type: 'email',
  required: true,
  maxLength: 100
});
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}

// Secure storage
SecureStorage.setItem('api-key', { key: 'secret123' });
const apiKey = SecureStorage.getItem('api-key');

// Rate limiting
if (RateLimiter.isAllowed('user123', 10, 60000)) {
  // Process request
} else {
  // Rate limit exceeded
}

// Create validation schema
const userSchema = createValidationSchema({
  email: { type: 'email', required: true },
  age: { type: 'number', minValue: 18 },
  name: { type: 'string', required: true, maxLength: 50 }
});

const validation = userSchema(userData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Security Features

- **XSS Prevention**: Removes malicious scripts and event handlers
- **URL Validation**: Blocks dangerous protocols
- **Input Validation**: Type checking with sanitization
- **Secure Storage**: Encrypted localStorage with obfuscation
- **Rate Limiting**: Prevent abuse with configurable limits
- **CSP Headers**: Content Security Policy generation

---

## Performance Optimization Hooks

React hooks for monitoring and optimizing component performance.

### Usage

```typescript
import {
  useOptimizedCallback,
  useOptimizedMemo,
  useDebouncedState,
  useEfficientList
} from './hooks/usePerformanceOptimization';

function MyComponent() {
  // Optimized callback with performance monitoring
  const handleClick = useOptimizedCallback(
    (value: string) => {
      // Complex operation
      return processData(value);
    },
    [dependency],
    'handleClick' // Debug name for monitoring
  );

  // Optimized memo with performance tracking
  const expensiveValue = useOptimizedMemo(
    () => {
      // Expensive computation
      return calculateExpensiveValue(data);
    },
    [data],
    'expensiveValue'
  );

  // Debounced state for search input
  const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('', 300);
  
  useEffect(() => {
    // Only search when debounced value changes
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  // Efficient list management
  const messageList = useEfficientList<Message>([], 1000);
  
  const addMessage = (msg: Message) => {
    messageList.addItem(msg); // Automatically limits size
  };

  return (
    <div>
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search (debounced)..."
      />
      
      <div>
        {messageList.items.map(msg => (
          <div key={msg.id}>{msg.text}</div>
        ))}
      </div>
      
      {messageList.isFull && (
        <div>Message limit reached</div>
      )}
    </div>
  );
}
```

### Performance Features

- **Execution Time Monitoring**: Warns about slow operations
- **Render Count Tracking**: Helps identify unnecessary re-renders
- **Automatic Debouncing**: Reduces rapid state updates
- **Memory-Efficient Lists**: Automatic size limiting for large lists

---

## Best Practices

### Error Handling

```typescript
try {
  const result = await service.operation();
  if (!result.success) {
    ErrorHandler.handle(
      result.error,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { operation: 'service.operation' }
    );
  }
} catch (error) {
  ErrorHandler.system(error, { component: 'MyComponent' });
}
```

### Memory Management

```typescript
// Always cleanup in useEffect
useEffect(() => {
  const id = memoryManager.register(
    'my-subscription',
    'subscription',
    'MyComponent',
    () => subscription.unsubscribe()
  );
  
  return () => memoryManager.unregister(id);
}, []);
```

### Storage Operations

```typescript
// Always handle storage failures
const saveData = async (data: any) => {
  const success = await storage.setItem('data', data);
  if (!success) {
    // Handle storage failure
    ErrorHandler.handle(
      'Storage operation failed',
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH
    );
  }
};
```

### Security

```typescript
// Always validate and sanitize user input
const processUserInput = (input: string) => {
  const validation = validateInput(input, {
    type: 'string',
    maxLength: 1000,
    pattern: /^[a-zA-Z0-9\s]+$/
  });
  
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  return sanitizeHtml(validation.sanitizedValue);
};
```

---

## Migration Guide

### Migrating to BaseService

Before:
```typescript
class MyService {
  async getData() {
    try {
      return await api.get('/data');
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
```

After:
```typescript
class MyService extends BaseService {
  constructor() {
    super('MyService');
  }
  
  async getData() {
    return this.executeOperation('getData', () => api.get('/data'));
  }
}
```

### Migrating to StorageManager

Before:
```typescript
localStorage.setItem('user', JSON.stringify(userData));
const user = JSON.parse(localStorage.getItem('user') || '{}');
```

After:
```typescript
const storage = createStorageManager('app');
await storage.setItem('user', userData);
const user = await storage.getItem('user', {});
```

### Migrating to ErrorHandler

Before:
```typescript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  alert('Something went wrong');
}
```

After:
```typescript
try {
  await operation();
} catch (error) {
  const appError = ErrorHandler.handle(
    error,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM,
    { operation: 'myOperation' },
    { userMessage: 'Unable to complete operation' }
  );
  
  showUserNotification(appError.userMessage);
}
```

---

## Performance Considerations

1. **BaseService Caching**: Enable caching only for idempotent operations
2. **StorageManager Compression**: Use compression for large objects, not small frequent updates
3. **MemoryManager**: Register only long-lived resources, not short-lived ones
4. **Security Validation**: Cache validation schemas for repeated use
5. **Error Tracking**: Implement error sampling in production to avoid memory growth

---

## Troubleshooting

### Common Issues

1. **Storage Quota Exceeded**
   - Use `storage.cleanup()` to remove expired items
   - Reduce `maxSize` configuration
   - Clear old data periodically

2. **Memory Leaks Still Occurring**
   - Check if all resources are registered with MemoryManager
   - Ensure cleanup functions are properly implemented
   - Use browser DevTools to identify unregistered leaks

3. **Rate Limiting Too Restrictive**
   - Adjust `rateLimitAttempts` and `rateLimitWindowMs`
   - Implement user-specific limits
   - Consider implementing token bucket algorithm

4. **Validation Performance**
   - Cache validation schemas
   - Use simple patterns over complex regex
   - Validate only changed fields in forms

---

## Future Enhancements

1. **BaseService**: Add circuit breaker pattern
2. **StorageManager**: Add IndexedDB adapter
3. **ErrorHandler**: Add error reporting service integration
4. **MemoryManager**: Add heap snapshot analysis
5. **Security**: Add CSP violation reporting
6. **Performance Hooks**: Add React DevTools integration
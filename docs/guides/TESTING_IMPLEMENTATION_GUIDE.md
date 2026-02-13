# Testing Implementation Guide - Quick Start

## Overview
This guide helps you implement the missing tests identified in the audit. Start with CRITICAL items.

## Testing Infrastructure Setup

### 1. Test Database Configuration
```typescript
// .env.test
DATABASE_URL="postgresql://test:test@localhost:5432/workflow_test"
REDIS_URL="redis://localhost:6379/1"
```

### 2. Test Setup File Template
```typescript
// src/__tests__/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

beforeAll(async () => {
  // Run migrations
  await prisma.$executeRawUnsafe('BEGIN')
})

afterEach(async () => {
  // Rollback each test
  await prisma.$executeRawUnsafe('ROLLBACK')
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

## TIER 1 TESTS (Critical - Do First)

### 1. Authentication Tests
**File**: `/src/__tests__/backend/auth/AuthManager.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { AuthManager } from '@/backend/auth/AuthManager'

describe('AuthManager', () => {
  let authManager: AuthManager

  beforeEach(() => {
    authManager = new AuthManager()
  })

  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      const result = await authManager.login('user@example.com', 'password123')
      expect(result.token).toBeDefined()
      expect(result.user).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      await expect(
        authManager.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials')
    })

    it('should handle non-existent user', async () => {
      await expect(
        authManager.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('User not found')
    })
  })

  describe('validateToken', () => {
    it('should validate correct token', async () => {
      const login = await authManager.login('user@example.com', 'password123')
      const valid = await authManager.validateToken(login.token)
      expect(valid).toBe(true)
    })

    it('should reject expired token', async () => {
      const expiredToken = 'eyJ...' // Manually create expired JWT
      const valid = await authManager.validateToken(expiredToken)
      expect(valid).toBe(false)
    })
  })

  describe('refreshToken', () => {
    it('should issue new token with valid refresh token', async () => {
      const login = await authManager.login('user@example.com', 'password123')
      const newToken = await authManager.refreshToken(login.refreshToken)
      expect(newToken).toBeDefined()
      expect(newToken).not.toBe(login.token)
    })
  })

  describe('logout', () => {
    it('should invalidate token on logout', async () => {
      const login = await authManager.login('user@example.com', 'password123')
      await authManager.logout(login.token)
      const valid = await authManager.validateToken(login.token)
      expect(valid).toBe(false)
    })
  })
})
```

### 2. Encryption Service Tests
**File**: `/src/__tests__/backend/security/EncryptionService.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { EncryptionService } from '@/backend/security/EncryptionService'

describe('EncryptionService', () => {
  const encryptionService = new EncryptionService()
  const testData = 'sensitive data'
  const encryptionKey = 'my-secret-key-32-characters-long'

  describe('encrypt/decrypt', () => {
    it('should encrypt data', async () => {
      const encrypted = await encryptionService.encrypt(testData, encryptionKey)
      expect(encrypted).not.toBe(testData)
      expect(encrypted.length).toBeGreaterThan(testData.length)
    })

    it('should decrypt encrypted data', async () => {
      const encrypted = await encryptionService.encrypt(testData, encryptionKey)
      const decrypted = await encryptionService.decrypt(encrypted, encryptionKey)
      expect(decrypted).toBe(testData)
    })

    it('should fail with wrong key', async () => {
      const encrypted = await encryptionService.encrypt(testData, encryptionKey)
      await expect(
        encryptionService.decrypt(encrypted, 'wrong-key')
      ).rejects.toThrow()
    })

    it('should handle large data', async () => {
      const largeData = 'x'.repeat(10000)
      const encrypted = await encryptionService.encrypt(largeData, encryptionKey)
      const decrypted = await encryptionService.decrypt(encrypted, encryptionKey)
      expect(decrypted).toBe(largeData)
    })
  })

  describe('hash', () => {
    it('should generate consistent hash', async () => {
      const hash1 = await encryptionService.hash(testData)
      const hash2 = await encryptionService.hash(testData)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different data', async () => {
      const hash1 = await encryptionService.hash('data1')
      const hash2 = await encryptionService.hash('data2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateKey', () => {
    it('should generate random key', async () => {
      const key1 = await encryptionService.generateKey()
      const key2 = await encryptionService.generateKey()
      expect(key1).not.toBe(key2)
      expect(key1.length).toBeGreaterThanOrEqual(32)
    })
  })
})
```

### 3. Database Repository Tests
**File**: `/src/__tests__/backend/database/UserRepository.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserRepository } from '@/backend/database/repositories/UserRepository'
import { PrismaClient } from '@prisma/client'

describe('UserRepository', () => {
  let userRepo: UserRepository
  let prisma: PrismaClient

  beforeEach(async () => {
    prisma = new PrismaClient()
    userRepo = new UserRepository(prisma)
    // Clean up test data
    await prisma.user.deleteMany({})
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  describe('create', () => {
    it('should create user', async () => {
      const user = await userRepo.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User'
      })
      expect(user.id).toBeDefined()
      expect(user.email).toBe('test@example.com')
    })

    it('should reject duplicate email', async () => {
      await userRepo.create({
        email: 'test@example.com',
        password: 'password',
        name: 'User 1'
      })
      await expect(
        userRepo.create({
          email: 'test@example.com',
          password: 'password',
          name: 'User 2'
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find user by id', async () => {
      const created = await userRepo.create({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User'
      })
      const found = await userRepo.findById(created.id)
      expect(found).toBeDefined()
      expect(found?.email).toBe('test@example.com')
    })

    it('should return null for non-existent user', async () => {
      const found = await userRepo.findById('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update user', async () => {
      const created = await userRepo.create({
        email: 'test@example.com',
        password: 'password',
        name: 'Original Name'
      })
      const updated = await userRepo.update(created.id, {
        name: 'Updated Name'
      })
      expect(updated.name).toBe('Updated Name')
    })
  })

  describe('delete', () => {
    it('should delete user', async () => {
      const created = await userRepo.create({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User'
      })
      await userRepo.delete(created.id)
      const found = await userRepo.findById(created.id)
      expect(found).toBeNull()
    })
  })
})
```

### 4. API Endpoint Tests
**File**: `/src/__tests__/backend/api/credentials.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '@/backend/server'
import type { Server } from 'http'

describe('Credentials API', () => {
  let server: Server
  let baseUrl: string

  beforeAll((done) => {
    server = createServer()
    server.listen(0, 'localhost', () => {
      const addr = server.address()
      baseUrl = `http://localhost:${(addr as any).port}`
      done()
    })
  })

  afterAll((done) => {
    server.close(done)
  })

  describe('POST /api/credentials', () => {
    it('should create credential', async () => {
      const response = await fetch(`${baseUrl}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'Test Credential',
          type: 'api_key',
          data: {
            apiKey: 'secret-key'
          }
        })
      })
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()
    })

    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test',
          type: 'api_key'
        })
      })
      expect(response.status).toBe(401)
    })

    it('should validate credential data', async () => {
      const response = await fetch(`${baseUrl}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'Test',
          type: 'invalid_type'
        })
      })
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/credentials/:id', () => {
    it('should get credential', async () => {
      // First create credential
      const createRes = await fetch(`${baseUrl}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'Test',
          type: 'api_key',
          data: { apiKey: 'secret' }
        })
      })
      const credential = await createRes.json()

      // Get it
      const response = await fetch(`${baseUrl}/api/credentials/${credential.id}`, {
        headers: { 'Authorization': 'Bearer test-token' }
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(credential.id)
    })

    it('should return 404 for non-existent credential', async () => {
      const response = await fetch(`${baseUrl}/api/credentials/nonexistent`, {
        headers: { 'Authorization': 'Bearer test-token' }
      })
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/credentials/:id', () => {
    it('should delete credential', async () => {
      // Create credential
      const createRes = await fetch(`${baseUrl}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'Test',
          type: 'api_key',
          data: { apiKey: 'secret' }
        })
      })
      const credential = await createRes.json()

      // Delete it
      const deleteRes = await fetch(`${baseUrl}/api/credentials/${credential.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      })
      expect(deleteRes.status).toBe(204)

      // Verify deleted
      const getRes = await fetch(`${baseUrl}/api/credentials/${credential.id}`, {
        headers: { 'Authorization': 'Bearer test-token' }
      })
      expect(getRes.status).toBe(404)
    })
  })
})
```

## TIER 2 TESTS (High Priority)

### 5. Queue Manager Tests
**File**: `/src/__tests__/backend/queue/QueueManager.test.ts`

```typescript
describe('QueueManager', () => {
  // Test job enqueueing
  it('should enqueue job')
  
  // Test job dequeuing
  it('should dequeue job')
  
  // Test retry logic
  it('should retry failed job with backoff')
  
  // Test concurrent processing
  it('should process multiple jobs concurrently')
  
  // Test dead letter queue
  it('should move to dead letter queue after max retries')
  
  // Test job timeout
  it('should timeout job after specified duration')
})
```

### 6. Component Tests
**File**: `/src/__tests__/components/CredentialsManager.test.tsx`

```typescript
describe('CredentialsManager', () => {
  // Test credential listing
  it('should display list of credentials')
  
  // Test add credential
  it('should add new credential via form')
  
  // Test edit credential
  it('should edit existing credential')
  
  // Test delete credential
  it('should delete credential with confirmation')
  
  // Test credential testing
  it('should test credential validity')
  
  // Test error handling
  it('should display error when API fails')
})
```

## Quick Testing Checklist

### For Each Service/Component, Test:
- [ ] Happy path (success case)
- [ ] Error cases (invalid input, API failure)
- [ ] Edge cases (empty data, null values)
- [ ] Concurrency (parallel operations)
- [ ] Timeout handling
- [ ] Authorization/authentication
- [ ] Data validation
- [ ] State changes
- [ ] Side effects
- [ ] Cleanup/teardown

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- src/__tests__/backend/auth/AuthManager.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test -- --watch

# UI mode
npm run test:ui
```

## Coverage Targets

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Authentication | 10% | 95% | CRITICAL |
| Database Layer | 5% | 90% | CRITICAL |
| Security | 15% | 95% | CRITICAL |
| API Endpoints | 23% | 90% | HIGH |
| Components | 28% | 80% | HIGH |
| Services | 3% | 85% | HIGH |
| Utils | 20% | 90% | MEDIUM |
| **Overall** | **7%** | **85%** | **CRITICAL** |

## Documentation

See:
- `/TESTING_COVERAGE_AUDIT.md` - Complete audit
- `/TESTING_GAPS_DETAILED.md` - Detailed file-by-file gaps
- This file for implementation guide


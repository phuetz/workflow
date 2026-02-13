import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryStore } from '../memory/MemoryStore';
import { UserProfileManager } from '../memory/UserProfileManager';
import { ContextManager } from '../memory/ContextManager';
import { MemorySearch } from '../memory/MemorySearch';
import {
  CreateMemoryRequest,
  MemoryType,
  PruneStrategy,
} from '../types/memory';

describe('MemoryStore', () => {
  let memoryStore: MemoryStore;

  beforeEach(() => {
    memoryStore = new MemoryStore({
      provider: 'in-memory',
      compression: { enabled: true, minSize: 1024, algorithm: 'gzip', level: 6 },
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        batchSize: 100,
        cache: true,
      },
      pruning: {
        enabled: true,
        schedule: '0 2 * * *',
        criteria: { maxAge: 90 * 24 * 60 * 60 * 1000, minImportance: 0.1, strategy: 'combined' },
        notifications: true,
      },
      caching: { enabled: true, ttl: 3600, maxSize: 100, strategy: 'lru' },
    });
  });

  afterEach(async () => {
    await memoryStore.clear();
  });

  describe('Memory Storage', () => {
    it('should store a memory successfully', async () => {
      const request: CreateMemoryRequest = {
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory content',
        type: 'conversation',
        importance: 0.8,
        metadata: { source: 'test' },
        tags: ['test', 'conversation'],
      };

      const memory = await memoryStore.store(request);

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe(request.content);
      expect(memory.userId).toBe(request.userId);
      expect(memory.agentId).toBe(request.agentId);
      expect(memory.importance).toBe(request.importance);
      expect(memory.type).toBe(request.type);
      expect(memory.embedding).toBeDefined();
      expect(memory.embedding.length).toBe(1536);
    });

    it('should auto-calculate importance if not provided', async () => {
      const request: CreateMemoryRequest = {
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory without importance',
        type: 'preference',
      };

      const memory = await memoryStore.store(request);

      expect(memory.importance).toBeGreaterThan(0);
      expect(memory.importance).toBeLessThanOrEqual(1);
    });

    it('should validate required fields', async () => {
      const invalidRequest: any = {
        userId: 'user123',
        // Missing agentId and content
        type: 'conversation',
      };

      await expect(memoryStore.store(invalidRequest)).rejects.toThrow();
    });

    it('should generate unique IDs for each memory', async () => {
      const request: CreateMemoryRequest = {
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
      };

      const memory1 = await memoryStore.store(request);
      const memory2 = await memoryStore.store(request);

      expect(memory1.id).not.toBe(memory2.id);
    });
  });

  describe('Memory Retrieval', () => {
    it('should retrieve memories by ID', async () => {
      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
      });

      const retrieved = await memoryStore.retrieve([stored.id]);

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(stored.id);
      expect(retrieved[0].content).toBe(stored.content);
    });

    it('should track access count and last accessed', async () => {
      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
      });

      const initialAccessCount = stored.accessCount;

      await memoryStore.retrieve([stored.id]);
      await memoryStore.retrieve([stored.id]);

      const [retrieved] = await memoryStore.retrieve([stored.id]);

      expect(retrieved.accessCount).toBe(initialAccessCount + 3);
      expect(retrieved.lastAccessed.getTime()).toBeGreaterThan(stored.lastAccessed.getTime());
    });

    it('should not return expired memories', async () => {
      const pastDate = new Date(Date.now() - 1000);

      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Expired memory',
        type: 'conversation',
        expiresAt: pastDate,
      });

      const retrieved = await memoryStore.retrieve([stored.id]);

      expect(retrieved).toHaveLength(0);
    });
  });

  describe('Memory Search', () => {
    beforeEach(async () => {
      // Create test memories
      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Machine learning algorithms',
        type: 'conversation',
        importance: 0.9,
        tags: ['ml', 'ai'],
      });

      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Data preprocessing steps',
        type: 'workflow',
        importance: 0.7,
        tags: ['data', 'preprocessing'],
      });

      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Model training process',
        type: 'conversation',
        importance: 0.8,
        tags: ['ml', 'training'],
      });

      await memoryStore.store({
        userId: 'user456',
        agentId: 'agent456',
        content: 'Different user memory',
        type: 'conversation',
        importance: 0.6,
      });
    });

    it('should search memories by query text', async () => {
      const result = await memoryStore.search({
        query: 'machine learning',
        userId: 'user123',
        agentId: 'agent456',
      });

      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should filter by user ID', async () => {
      const result = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        limit: 100,
      });

      expect(result.memories.every((m) => m.userId === 'user123')).toBe(true);
    });

    it('should filter by type', async () => {
      const result = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        type: 'conversation',
        limit: 100,
      });

      expect(result.memories.every((m) => m.type === 'conversation')).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        tags: ['ml'],
        limit: 100,
      });

      expect(result.memories.length).toBe(2);
      expect(result.memories.every((m) => m.metadata.tags?.includes('ml'))).toBe(true);
    });

    it('should filter by importance range', async () => {
      const result = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        minImportance: 0.8,
        limit: 100,
      });

      expect(result.memories.every((m) => m.importance >= 0.8)).toBe(true);
    });

    it('should sort by relevance', async () => {
      const result = await memoryStore.search({
        query: 'machine learning model training',
        userId: 'user123',
        agentId: 'agent456',
        sortBy: 'relevance',
      });

      // Check that results are sorted by score
      for (let i = 0; i < result.memories.length - 1; i++) {
        expect(result.memories[i].score).toBeGreaterThanOrEqual(
          result.memories[i + 1].score
        );
      }
    });

    it('should respect limit parameter', async () => {
      const result = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        limit: 2,
      });

      expect(result.memories.length).toBeLessThanOrEqual(2);
    });

    it('should search with time range', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        timeRange: {
          start: hourAgo,
          end: now,
        },
      });

      expect(result.memories.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Update', () => {
    it('should update memory content', async () => {
      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Original content',
        type: 'conversation',
      });

      const updated = await memoryStore.update({
        id: stored.id,
        content: 'Updated content',
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.version).toBe(stored.version + 1);
      expect(updated.embedding).not.toEqual(stored.embedding);
    });

    it('should update importance', async () => {
      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
        importance: 0.5,
      });

      const updated = await memoryStore.update({
        id: stored.id,
        importance: 0.9,
      });

      expect(updated.importance).toBe(0.9);
    });

    it('should update metadata', async () => {
      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
        metadata: { key: 'value1' },
      });

      const updated = await memoryStore.update({
        id: stored.id,
        metadata: { key: 'value2', newKey: 'newValue' },
      });

      expect(updated.metadata.key).toBe('value2');
      expect(updated.metadata.newKey).toBe('newValue');
    });
  });

  describe('Memory Deletion', () => {
    it('should delete a memory', async () => {
      const stored = await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
      });

      const deleted = await memoryStore.delete(stored.id);
      expect(deleted).toBe(true);

      const retrieved = await memoryStore.retrieve([stored.id]);
      expect(retrieved).toHaveLength(0);
    });

    it('should return false when deleting non-existent memory', async () => {
      const deleted = await memoryStore.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Memory Pruning', () => {
    beforeEach(async () => {
      // Create memories with different ages and importance
      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Old, low importance',
        type: 'conversation',
        importance: 0.2,
      });

      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Recent, high importance',
        type: 'preference',
        importance: 0.9,
      });
    });

    it('should prune memories by importance', async () => {
      const result = await memoryStore.prune({
        minImportance: 0.5,
        strategy: 'importance',
      });

      expect(result.deleted).toBe(1);
      expect(result.preserved).toBeGreaterThan(0);
    });

    it('should dry run without deleting', async () => {
      const beforeCount = (await memoryStore.search({ userId: 'user123', agentId: 'agent456', limit: 100 })).total;

      const result = await memoryStore.prune({
        minImportance: 0.5,
        strategy: 'importance',
        dryRun: true,
      });

      const afterCount = (await memoryStore.search({ userId: 'user123', agentId: 'agent456', limit: 100 })).total;

      expect(result.deleted).toBeGreaterThan(0);
      expect(afterCount).toBe(beforeCount);
    });

    it('should preserve specific types', async () => {
      const result = await memoryStore.prune({
        minImportance: 0.5,
        preserveTypes: ['preference'],
      });

      const remaining = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        type: 'preference',
        limit: 100,
      });

      expect(remaining.total).toBeGreaterThan(0);
    });
  });

  describe('Memory Health', () => {
    it('should report healthy status with low usage', async () => {
      const health = await memoryStore.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.totalMemories).toBeGreaterThanOrEqual(0);
      expect(health.utilizationPercent).toBeLessThan(100);
    });

    it('should provide recommendations when needed', async () => {
      // Create many low-importance memories
      for (let i = 0; i < 100; i++) {
        await memoryStore.store({
          userId: 'user123',
          agentId: 'agent456',
          content: `Low importance memory ${i}`,
          type: 'conversation',
          importance: 0.1,
        });
      }

      const health = await memoryStore.getHealth();

      if (health.status !== 'healthy') {
        expect(health.recommendations.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('UserProfileManager', () => {
  let memoryStore: MemoryStore;
  let profileManager: UserProfileManager;

  beforeEach(() => {
    memoryStore = new MemoryStore();
    profileManager = new UserProfileManager(memoryStore);
  });

  afterEach(async () => {
    await memoryStore.clear();
    await profileManager.shutdown();
  });

  describe('Profile Management', () => {
    it('should create a new user profile', async () => {
      const profile = await profileManager.getProfile('user123', 'agent456');

      expect(profile.userId).toBe('user123');
      expect(profile.agentId).toBe('agent456');
      expect(profile.preferences).toBeDefined();
      expect(profile.statistics).toBeDefined();
      expect(profile.patterns).toEqual([]);
      expect(profile.commonWorkflows).toEqual([]);
    });

    it('should return existing profile on subsequent calls', async () => {
      const profile1 = await profileManager.getProfile('user123', 'agent456');
      const profile2 = await profileManager.getProfile('user123', 'agent456');

      expect(profile1.createdAt).toEqual(profile2.createdAt);
      expect(profile1.version).toBe(profile2.version);
    });

    it('should update preferences', async () => {
      const updated = await profileManager.updatePreferences('user123', 'agent456', {
        language: 'fr',
        timezone: 'Europe/Paris',
      });

      expect(updated.preferences.language).toBe('fr');
      expect(updated.preferences.timezone).toBe('Europe/Paris');
      expect(updated.version).toBe(2);
    });
  });

  describe('Behavioral Learning', () => {
    it('should learn from workflow execution', async () => {
      await profileManager.learnFromBehavior('user123', 'agent456', {
        type: 'workflow_execution',
        data: {
          workflowId: 'wf-123',
          nodes: ['http', 'transform', 'email'],
          executionTime: 5000,
          success: true,
        },
      });

      const profile = await profileManager.getProfile('user123', 'agent456');

      expect(profile.statistics.totalWorkflows).toBe(1);
      expect(profile.statistics.totalExecutions).toBe(1);
      expect(profile.commonWorkflows.length).toBe(1);
    });

    it('should track node usage', async () => {
      await profileManager.learnFromBehavior('user123', 'agent456', {
        type: 'node_usage',
        data: {
          nodeType: 'http-request',
          config: { timeout: 30000 },
        },
      });

      const profile = await profileManager.getProfile('user123', 'agent456');

      expect(profile.statistics.mostUsedNodes['http-request']).toBe(1);
    });

    it('should learn error patterns', async () => {
      await profileManager.learnFromBehavior('user123', 'agent456', {
        type: 'error_handling',
        data: {
          errorType: 'NetworkError',
          resolution: 'retry',
        },
      });

      const profile = await profileManager.getProfile('user123', 'agent456');

      expect(profile.statistics.errorPatterns['NetworkError']).toBe(1);
      expect(profile.patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Suggestions', () => {
    it('should generate workflow suggestions', async () => {
      // Create workflow pattern
      for (let i = 0; i < 10; i++) {
        await profileManager.learnFromBehavior('user123', 'agent456', {
          type: 'workflow_execution',
          data: {
            workflowId: 'common-workflow',
            nodes: ['trigger', 'filter', 'action'],
            executionTime: 1000,
            success: true,
          },
        });
      }

      const suggestions = await profileManager.getSuggestions('user123', 'agent456');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('workflow');
    });

    it('should respect confidence threshold', async () => {
      const profile = await profileManager.getProfile('user123', 'agent456');

      // Update privacy to disable memory
      await profileManager.updatePrivacySettings('user123', 'agent456', {
        memoryEnabled: false,
      });

      const suggestions = await profileManager.getSuggestions('user123', 'agent456');

      expect(suggestions.length).toBe(0);
    });
  });

  describe('Feedback Loop', () => {
    it('should adjust learning rate based on feedback', async () => {
      const beforeProfile = await profileManager.getProfile('user123', 'agent456');
      const beforeRate = beforeProfile.statistics.learningRate;

      await profileManager.recordFeedback('user123', 'agent456', {
        type: 'positive',
        comment: 'Helpful suggestion',
      });

      const afterProfile = await profileManager.getProfile('user123', 'agent456');
      const afterRate = afterProfile.statistics.learningRate;

      expect(afterRate).toBeGreaterThan(beforeRate);
    });
  });

  describe('GDPR Compliance', () => {
    it('should export user data', async () => {
      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
      });

      const exported = await profileManager.exportUserData('user123', 'agent456');

      expect(exported.profile).toBeDefined();
      expect(exported.memories).toBeDefined();
      expect(exported.analytics).toBeDefined();
    });

    it('should delete all user data', async () => {
      await memoryStore.store({
        userId: 'user123',
        agentId: 'agent456',
        content: 'Test memory',
        type: 'conversation',
      });

      await profileManager.deleteUserData('user123', 'agent456');

      const memories = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
      });

      expect(memories.total).toBe(0);
    });
  });
});

describe('ContextManager', () => {
  let memoryStore: MemoryStore;
  let contextManager: ContextManager;

  beforeEach(() => {
    memoryStore = new MemoryStore();
    contextManager = new ContextManager(memoryStore);
  });

  afterEach(async () => {
    await memoryStore.clear();
    await contextManager.shutdown();
  });

  describe('Context Creation', () => {
    it('should create a new context session', async () => {
      const context = await contextManager.getContext('session123', 'user123', 'agent456');

      expect(context.sessionId).toBe('session123');
      expect(context.userId).toBe('user123');
      expect(context.agentId).toBe('agent456');
      expect(context.shortTermMemory).toEqual([]);
      expect(context.workingMemory).toEqual([]);
      expect(context.conversationHistory).toEqual([]);
    });

    it('should return existing context on subsequent calls', async () => {
      const context1 = await contextManager.getContext('session123', 'user123', 'agent456');
      const context2 = await contextManager.getContext('session123', 'user123', 'agent456');

      expect(context1.createdAt).toEqual(context2.createdAt);
    });
  });

  describe('Conversation Management', () => {
    it('should add conversation turns', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.addConversationTurn('session123', {
        role: 'user',
        content: 'Hello, agent!',
      });

      await contextManager.addConversationTurn('session123', {
        role: 'agent',
        content: 'Hello! How can I help you?',
      });

      const stats = contextManager.getStats('session123');

      expect(stats?.conversationTurns).toBe(2);
    });

    it('should maintain conversation order', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.addConversationTurn('session123', {
        role: 'user',
        content: 'First message',
      });

      await contextManager.addConversationTurn('session123', {
        role: 'agent',
        content: 'Second message',
      });

      const llmContext = await contextManager.buildLLMContext('session123');

      expect(llmContext.messages[0].content).toBe('First message');
      expect(llmContext.messages[1].content).toBe('Second message');
    });
  });

  describe('Working Memory', () => {
    it('should set and get working memory', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.setWorkingMemory('session123', 'testKey', 'testValue');

      const value = await contextManager.getWorkingMemory('session123', 'testKey');

      expect(value).toBe('testValue');
    });

    it('should support TTL on working memory', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.setWorkingMemory('session123', 'tempKey', 'tempValue', {
        ttl: 100, // 100ms
      });

      const immediate = await contextManager.getWorkingMemory('session123', 'tempKey');
      expect(immediate).toBe('tempValue');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const expired = await contextManager.getWorkingMemory('session123', 'tempKey');
      expect(expired).toBeUndefined();
    });

    it('should clear working memory', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.setWorkingMemory('session123', 'key1', 'value1');
      await contextManager.setWorkingMemory('session123', 'key2', 'value2');

      await contextManager.clearWorkingMemory('session123', 'key1');

      const value1 = await contextManager.getWorkingMemory('session123', 'key1');
      const value2 = await contextManager.getWorkingMemory('session123', 'key2');

      expect(value1).toBeUndefined();
      expect(value2).toBe('value2');
    });
  });

  describe('Task Management', () => {
    it('should set and update active task', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.setActiveTask('session123', {
        taskId: 'task123',
        type: 'workflow_execution',
        metadata: {},
      });

      await contextManager.updateTaskProgress('session123', 50);

      const stats = contextManager.getStats('session123');

      expect(stats?.activeTask).toBe('task123');
    });
  });

  describe('Context Persistence', () => {
    it('should persist context to long-term memory', async () => {
      await contextManager.getContext('session123', 'user123', 'agent456');

      await contextManager.addConversationTurn('session123', {
        role: 'user',
        content: 'Important conversation',
      });

      await contextManager.persistContext('session123');

      const memories = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
      });

      expect(memories.total).toBeGreaterThan(0);
    });
  });
});

describe('MemorySearch', () => {
  let memoryStore: MemoryStore;
  let memorySearch: MemorySearch;

  beforeEach(async () => {
    memoryStore = new MemoryStore();
    memorySearch = new MemorySearch(memoryStore);

    // Create test data
    await memoryStore.store({
      userId: 'user123',
      agentId: 'agent456',
      content: 'Machine learning algorithms',
      type: 'conversation',
      importance: 0.9,
      tags: ['ml', 'ai'],
    });
  });

  afterEach(async () => {
    await memoryStore.clear();
  });

  describe('Semantic Search', () => {
    it('should perform semantic search', async () => {
      const result = await memorySearch.search({
        query: 'AI and ML',
        userId: 'user123',
        agentId: 'agent456',
      });

      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should cache search results', async () => {
      const query = {
        query: 'machine learning',
        userId: 'user123',
        agentId: 'agent456',
      };

      const result1 = await memorySearch.search(query);
      const result2 = await memorySearch.search(query);

      // Second search should be faster (cached)
      expect(result2.executionTime).toBeLessThanOrEqual(result1.executionTime);
    });

    it('should find similar memories', async () => {
      const memories = await memoryStore.search({
        userId: 'user123',
        agentId: 'agent456',
        limit: 1,
      });

      const similar = await memorySearch.findSimilar(memories.memories[0].id);

      expect(Array.isArray(similar)).toBe(true);
    });
  });

  describe('Temporal Search', () => {
    it('should search memories from today', async () => {
      const result = await memorySearch.searchTemporal(
        {
          userId: 'user123',
          agentId: 'agent456',
        },
        'today'
      );

      expect(result.memories.every(m => {
        const today = new Date();
        const memDate = new Date(m.timestamp);
        return memDate.getDate() === today.getDate();
      })).toBe(true);
    });
  });

  describe('Search Analytics', () => {
    it('should track search analytics', async () => {
      await memorySearch.search({
        query: 'test query',
        userId: 'user123',
        agentId: 'agent456',
      });

      const analytics = memorySearch.getAnalytics('user123', 'agent456');

      expect(analytics.totalSearches).toBeGreaterThan(0);
      expect(analytics.avgExecutionTime).toBeGreaterThan(0);
    });
  });
});

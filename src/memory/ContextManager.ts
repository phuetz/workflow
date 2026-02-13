import {
  ContextState,
  WorkingMemoryItem,
  ContextWindow,
  ContextItem,
  TaskContext,
  ConversationTurn,
  Memory,
  MemoryType,
} from '../types/memory';
import { MemoryStore } from './MemoryStore';
import { EventEmitter } from 'events';

/**
 * ContextManager - Manage short-term, long-term, and working memory for agents
 *
 * Features:
 * - Short-term memory (current session)
 * - Long-term memory (historical, from MemoryStore)
 * - Working memory (active task data)
 * - Context window management with token limits
 * - Conversation history tracking
 * - Cross-session context persistence
 */
export class ContextManager extends EventEmitter {
  private contexts: Map<string, ContextState> = new Map();
  private memoryStore: MemoryStore;
  private config: ContextManagerConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    memoryStore: MemoryStore,
    config: Partial<ContextManagerConfig> = {}
  ) {
    super();
    this.memoryStore = memoryStore;
    this.config = {
      maxSessionDuration: 3600000, // 1 hour
      contextWindowSize: 10,
      maxTokens: 4096,
      contextStrategy: 'sliding',
      persistSessions: true,
      cleanupInterval: 300000, // 5 minutes
      autoSummarize: true,
      summarizationThreshold: 0.7,
      ...config,
    };

    this.startCleanup();
  }

  /**
   * Create or get a context session
   */
  async getContext(
    sessionId: string,
    userId: string,
    agentId: string
  ): Promise<ContextState> {
    // Check if session exists
    if (this.contexts.has(sessionId)) {
      const context = this.contexts.get(sessionId)!;
      context.lastActivity = new Date();
      return context;
    }

    // Load from persistence if enabled
    if (this.config.persistSessions) {
      const persisted = await this.loadPersistedContext(sessionId);
      if (persisted) {
        this.contexts.set(sessionId, persisted);
        return persisted;
      }
    }

    // Create new context
    const context: ContextState = {
      sessionId,
      userId,
      agentId,
      shortTermMemory: [],
      workingMemory: [],
      contextWindow: {
        size: 0,
        maxSize: this.config.contextWindowSize,
        tokens: 0,
        maxTokens: this.config.maxTokens,
        items: [],
        strategy: this.config.contextStrategy,
      },
      conversationHistory: [],
      variables: {},
      state: {},
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.config.maxSessionDuration),
    };

    this.contexts.set(sessionId, context);
    this.emit('context:created', { sessionId, userId, agentId });

    return context;
  }

  /**
   * Add message to conversation history
   */
  async addConversationTurn(
    sessionId: string,
    turn: Omit<ConversationTurn, 'id' | 'timestamp'>
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    const conversationTurn: ConversationTurn = {
      id: this.generateId(),
      timestamp: new Date(),
      ...turn,
    };

    context.conversationHistory.push(conversationTurn);
    context.lastActivity = new Date();

    // Add to context window
    await this.addToContextWindow(context, {
      content: turn.content,
      type: 'message',
      priority: 0.8,
    });

    // Store as short-term memory
    await this.addShortTermMemory(context, {
      content: turn.content,
      type: 'conversation',
      importance: 0.6,
      metadata: {
        role: turn.role,
        conversationId: sessionId,
      },
    });

    this.emit('conversation:turn', { sessionId, turn: conversationTurn });
  }

  /**
   * Add to working memory
   */
  async setWorkingMemory(
    sessionId: string,
    key: string,
    value: unknown,
    options: {
      type?: WorkingMemoryItem['type'];
      priority?: number;
      ttl?: number;
    } = {}
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    // Remove existing item with same key
    context.workingMemory = context.workingMemory.filter((item) => item.key !== key);

    const item: WorkingMemoryItem = {
      id: this.generateId(),
      key,
      value,
      type: options.type || 'variable',
      priority: options.priority || 0.5,
      ttl: options.ttl,
      createdAt: new Date(),
      lastAccessed: new Date(),
    };

    context.workingMemory.push(item);
    context.lastActivity = new Date();

    this.emit('working:set', { sessionId, key, type: item.type });
  }

  /**
   * Get from working memory
   */
  async getWorkingMemory<T = unknown>(
    sessionId: string,
    key: string
  ): Promise<T | undefined> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return undefined;
    }

    const item = context.workingMemory.find((item) => item.key === key);

    if (!item) {
      return undefined;
    }

    // Check TTL
    if (item.ttl) {
      const age = Date.now() - item.createdAt.getTime();
      if (age > item.ttl) {
        // Remove expired item
        context.workingMemory = context.workingMemory.filter(
          (i) => i.key !== key
        );
        return undefined;
      }
    }

    item.lastAccessed = new Date();
    return item.value as T;
  }

  /**
   * Clear working memory
   */
  async clearWorkingMemory(sessionId: string, key?: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return;
    }

    if (key) {
      context.workingMemory = context.workingMemory.filter(
        (item) => item.key !== key
      );
    } else {
      context.workingMemory = [];
    }

    this.emit('working:cleared', { sessionId, key });
  }

  /**
   * Set active task context
   */
  async setActiveTask(
    sessionId: string,
    task: Omit<TaskContext, 'startedAt' | 'state' | 'progress'>
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    context.activeTask = {
      ...task,
      startedAt: new Date(),
      state: 'running',
      progress: 0,
    };

    context.lastActivity = new Date();
    this.emit('task:started', { sessionId, taskId: task.taskId });
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(
    sessionId: string,
    progress: number,
    state?: TaskContext['state']
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context || !context.activeTask) {
      return;
    }

    context.activeTask.progress = Math.min(100, Math.max(0, progress));

    if (state) {
      context.activeTask.state = state;
    }

    context.lastActivity = new Date();
    this.emit('task:progress', { sessionId, progress, state });
  }

  /**
   * Get relevant long-term memories for context
   */
  async getLongTermContext(
    sessionId: string,
    query?: string,
    limit = 5
  ): Promise<Memory[]> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return [];
    }

    // Build search query
    const searchQuery = query || context.conversationHistory
      .slice(-3)
      .map((turn) => turn.content)
      .join(' ');

    // Search long-term memory
    const results = await this.memoryStore.search({
      query: searchQuery,
      userId: context.userId,
      agentId: context.agentId,
      type: ['conversation', 'preference', 'workflow', 'pattern'],
      minImportance: 0.5,
      limit,
    });

    return results.memories;
  }

  /**
   * Build complete context for LLM
   */
  async buildLLMContext(
    sessionId: string,
    includeHistory = true,
    includeLongTerm = true
  ): Promise<{
    messages: Array<{ role: string; content: string }>;
    memories: Memory[];
    variables: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    const messages: Array<{ role: string; content: string }> = [];

    // Add conversation history
    if (includeHistory) {
      const historyLimit = Math.min(
        context.conversationHistory.length,
        this.config.contextWindowSize
      );

      for (const turn of context.conversationHistory.slice(-historyLimit)) {
        messages.push({
          role: turn.role,
          content: turn.content,
        });
      }
    }

    // Get relevant long-term memories
    let longTermMemories: Memory[] = [];
    if (includeLongTerm) {
      longTermMemories = await this.getLongTermContext(sessionId);
    }

    // Collect variables from working memory
    const variables: Record<string, unknown> = {};
    for (const item of context.workingMemory) {
      if (item.type === 'variable') {
        variables[item.key] = item.value;
      }
    }

    return {
      messages,
      memories: [...context.shortTermMemory, ...longTermMemories],
      variables: { ...context.variables, ...variables },
      metadata: {
        sessionId: context.sessionId,
        activeTask: context.activeTask,
        contextWindowSize: context.contextWindow.size,
        conversationLength: context.conversationHistory.length,
      },
    };
  }

  /**
   * Summarize and compress context
   */
  async summarizeContext(sessionId: string): Promise<string> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    // Simple summarization - in production, use LLM
    const recentTurns = context.conversationHistory.slice(-10);
    const summary = recentTurns
      .map((turn) => `${turn.role}: ${turn.content.substring(0, 100)}...`)
      .join('\n');

    // Store summary as long-term memory
    await this.memoryStore.store({
      userId: context.userId,
      agentId: context.agentId,
      content: `Session summary: ${summary}`,
      type: 'conversation',
      importance: 0.7,
      metadata: {
        sessionId,
        summarizedAt: new Date().toISOString(),
        turnCount: recentTurns.length,
      },
    });

    this.emit('context:summarized', { sessionId });

    return summary;
  }

  /**
   * Persist context to long-term storage
   */
  async persistContext(sessionId: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return;
    }

    // Store short-term memories to long-term
    for (const memory of context.shortTermMemory) {
      if (memory.importance >= 0.6) {
        // Promote to long-term
        await this.memoryStore.store({
          userId: context.userId,
          agentId: context.agentId,
          content: memory.content,
          type: memory.type,
          importance: memory.importance,
          metadata: {
            ...memory.metadata,
            sessionId,
            promotedFrom: 'short-term',
          },
        });
      }
    }

    // Store conversation summary
    if (context.conversationHistory.length > 5) {
      await this.summarizeContext(sessionId);
    }

    this.emit('context:persisted', { sessionId });
  }

  /**
   * Clear a context session
   */
  async clearContext(sessionId: string, persist = true): Promise<void> {
    if (persist) {
      await this.persistContext(sessionId);
    }

    this.contexts.delete(sessionId);
    this.emit('context:cleared', { sessionId });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, agentId?: string): Promise<ContextState[]> {
    const sessions: ContextState[] = [];

    for (const context of this.contexts.values()) {
      if (context.userId === userId) {
        if (!agentId || context.agentId === agentId) {
          sessions.push(context);
        }
      }
    }

    return sessions;
  }

  /**
   * Get context statistics
   */
  getStats(sessionId: string): {
    conversationTurns: number;
    shortTermMemories: number;
    workingMemoryItems: number;
    contextWindowUsage: number;
    tokenUsage: number;
    activeTask?: string;
  } | null {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return null;
    }

    return {
      conversationTurns: context.conversationHistory.length,
      shortTermMemories: context.shortTermMemory.length,
      workingMemoryItems: context.workingMemory.length,
      contextWindowUsage:
        (context.contextWindow.size / context.contextWindow.maxSize) * 100,
      tokenUsage:
        (context.contextWindow.tokens / context.contextWindow.maxTokens) * 100,
      activeTask: context.activeTask?.taskId,
    };
  }

  // Private helper methods

  private async addShortTermMemory(
    context: ContextState,
    memory: Omit<Memory, 'id' | 'userId' | 'agentId' | 'timestamp' | 'embedding' | 'version' | 'compressed' | 'accessCount' | 'lastAccessed'>
  ): Promise<void> {
    const fullMemory: Memory = {
      id: this.generateId(),
      userId: context.userId,
      agentId: context.agentId,
      timestamp: new Date(),
      embedding: [], // Simplified - in production, generate real embedding
      version: 1,
      compressed: false,
      accessCount: 0,
      lastAccessed: new Date(),
      ...memory,
    };

    context.shortTermMemory.push(fullMemory);

    // Limit short-term memory size
    const maxShortTerm = 20;
    if (context.shortTermMemory.length > maxShortTerm) {
      // Promote important memories to long-term
      const toPromote = context.shortTermMemory
        .filter((m) => m.importance >= 0.7)
        .slice(0, 5);

      for (const mem of toPromote) {
        await this.memoryStore.store({
          userId: context.userId,
          agentId: context.agentId,
          content: mem.content,
          type: mem.type,
          importance: mem.importance,
          metadata: {
            ...mem.metadata,
            promotedFrom: 'short-term',
          },
        });
      }

      // Remove oldest memories
      context.shortTermMemory = context.shortTermMemory.slice(-maxShortTerm);
    }
  }

  private async addToContextWindow(
    context: ContextState,
    item: Omit<ContextItem, 'id' | 'tokens' | 'timestamp'>
  ): Promise<void> {
    // Estimate tokens (simplified - 4 chars per token)
    const tokens = Math.ceil(item.content.length / 4);

    const contextItem: ContextItem = {
      id: this.generateId(),
      tokens,
      timestamp: new Date(),
      ...item,
    };

    // Check if adding would exceed limits
    while (
      context.contextWindow.size >= context.contextWindow.maxSize ||
      context.contextWindow.tokens + tokens > context.contextWindow.maxTokens
    ) {
      await this.evictFromContextWindow(context);
    }

    context.contextWindow.items.push(contextItem);
    context.contextWindow.size++;
    context.contextWindow.tokens += tokens;
  }

  private async evictFromContextWindow(context: ContextState): Promise<void> {
    if (context.contextWindow.items.length === 0) return;

    let indexToRemove = 0;

    switch (context.contextWindow.strategy) {
      case 'sliding':
        // Remove oldest
        indexToRemove = 0;
        break;

      case 'priority':
        // Remove lowest priority
        let lowestPriority = Infinity;
        context.contextWindow.items.forEach((item, idx) => {
          if (item.priority < lowestPriority) {
            lowestPriority = item.priority;
            indexToRemove = idx;
          }
        });
        break;

      case 'summarize':
        // Summarize old items and keep summary
        if (context.contextWindow.items.length > 5) {
          const toSummarize = context.contextWindow.items.slice(0, 3);
          const summary = toSummarize
            .map((item) => item.content.substring(0, 50))
            .join('; ');

          // Add summary
          const summaryTokens = Math.ceil(summary.length / 4);
          context.contextWindow.items.push({
            id: this.generateId(),
            content: `Summary: ${summary}`,
            type: 'data',
            tokens: summaryTokens,
            priority: 0.8,
            timestamp: new Date(),
          });

          // Remove summarized items
          context.contextWindow.items.splice(0, 3);
          context.contextWindow.size -= 2;

          return;
        }
        indexToRemove = 0;
        break;
    }

    const removed = context.contextWindow.items.splice(indexToRemove, 1)[0];
    if (removed) {
      context.contextWindow.size--;
      context.contextWindow.tokens -= removed.tokens;
    }
  }

  private async loadPersistedContext(
    sessionId: string
  ): Promise<ContextState | null> {
    // In production, load from database
    // For now, return null
    return null;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, context] of this.contexts.entries()) {
      // Check expiration
      if (context.expiresAt && context.expiresAt.getTime() < now) {
        expiredSessions.push(sessionId);
        continue;
      }

      // Check inactivity
      const inactiveMs = now - context.lastActivity.getTime();
      if (inactiveMs > this.config.maxSessionDuration) {
        expiredSessions.push(sessionId);
      }
    }

    // Clear expired sessions
    for (const sessionId of expiredSessions) {
      await this.clearContext(sessionId, this.config.persistSessions);
    }

    if (expiredSessions.length > 0) {
      this.emit('cleanup:complete', { cleared: expiredSessions.length });
    }
  }

  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Persist all active contexts
    for (const sessionId of this.contexts.keys()) {
      await this.persistContext(sessionId);
    }

    this.contexts.clear();
  }
}

// Configuration interface
interface ContextManagerConfig {
  maxSessionDuration: number;
  contextWindowSize: number;
  maxTokens: number;
  contextStrategy: 'sliding' | 'summarize' | 'priority';
  persistSessions: boolean;
  cleanupInterval: number;
  autoSummarize: boolean;
  summarizationThreshold: number;
}

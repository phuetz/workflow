/**
 * Copilot Memory for AI Copilot Studio
 *
 * Provides personalization through:
 * 1. User preference storage
 * 2. Conversation history tracking
 * 3. Pattern learning
 * 4. Context persistence
 * 5. Custom shortcut management
 */

import {
  CopilotMemory,
  UserPreferences,
  ConversationHistory,
  LearnedPattern,
  ConversationTurn
} from './types/copilot';
import { logger } from '../services/SimpleLogger';

/**
 * Memory storage interface
 */
interface MemoryStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * In-memory storage (can be replaced with database)
 */
class InMemoryStorage implements MemoryStorage {
  private storage: Map<string, any> = new Map();

  async get(key: string): Promise<any> {
    return this.storage.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }
}

/**
 * Copilot memory manager for personalization
 */
export class CopilotMemoryManager {
  private storage: MemoryStorage;
  private memoryCache: Map<string, CopilotMemory> = new Map();
  private patternThreshold: number = 3; // Minimum frequency to consider pattern

  constructor(storage?: MemoryStorage) {
    this.storage = storage || new InMemoryStorage();
  }

  /**
   * Get or create memory for user
   */
  async getMemory(userId: string): Promise<CopilotMemory> {
    // Check cache first
    if (this.memoryCache.has(userId)) {
      return this.memoryCache.get(userId)!;
    }

    // Load from storage
    const stored = await this.storage.get(`memory:${userId}`);

    if (stored) {
      this.memoryCache.set(userId, stored);
      return stored;
    }

    // Create new memory
    const memory: CopilotMemory = {
      userId,
      preferences: this.getDefaultPreferences(),
      history: [],
      learnedPatterns: [],
      favoriteTemplates: [],
      customShortcuts: {},
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    await this.saveMemory(memory);
    return memory;
  }

  /**
   * Save memory to storage
   */
  async saveMemory(memory: CopilotMemory): Promise<void> {
    memory.lastUpdated = new Date();
    this.memoryCache.set(memory.userId, memory);
    await this.storage.set(`memory:${memory.userId}`, memory);
    logger.info(`Memory saved for user: ${memory.userId}`);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const memory = await this.getMemory(userId);
    memory.preferences = { ...memory.preferences, ...preferences };
    await this.saveMemory(memory);
  }

  /**
   * Add conversation to history
   */
  async addConversation(userId: string, conversation: ConversationHistory): Promise<void> {
    const memory = await this.getMemory(userId);

    // Add conversation
    memory.history.push(conversation);

    // Keep only last 50 conversations
    if (memory.history.length > 50) {
      memory.history = memory.history.slice(-50);
    }

    // Learn patterns from conversation
    await this.learnFromConversation(memory, conversation);

    await this.saveMemory(memory);
  }

  /**
   * Get conversation history
   */
  async getHistory(userId: string, limit: number = 10): Promise<ConversationHistory[]> {
    const memory = await this.getMemory(userId);
    return memory.history.slice(-limit);
  }

  /**
   * Add favorite template
   */
  async addFavoriteTemplate(userId: string, templateId: string): Promise<void> {
    const memory = await this.getMemory(userId);

    if (!memory.favoriteTemplates.includes(templateId)) {
      memory.favoriteTemplates.push(templateId);
      await this.saveMemory(memory);
    }
  }

  /**
   * Remove favorite template
   */
  async removeFavoriteTemplate(userId: string, templateId: string): Promise<void> {
    const memory = await this.getMemory(userId);
    memory.favoriteTemplates = memory.favoriteTemplates.filter(t => t !== templateId);
    await this.saveMemory(memory);
  }

  /**
   * Add custom shortcut
   */
  async addShortcut(userId: string, shortcut: string, expansion: any): Promise<void> {
    const memory = await this.getMemory(userId);
    memory.customShortcuts[shortcut] = expansion;
    await this.saveMemory(memory);
  }

  /**
   * Get shortcut expansion
   */
  async getShortcut(userId: string, shortcut: string): Promise<any | undefined> {
    const memory = await this.getMemory(userId);
    return memory.customShortcuts[shortcut];
  }

  /**
   * Get learned patterns
   */
  async getPatterns(userId: string, minConfidence: number = 0.6): Promise<LearnedPattern[]> {
    const memory = await this.getMemory(userId);
    return memory.learnedPatterns.filter(p => p.confidence >= minConfidence);
  }

  /**
   * Get suggestions based on memory
   */
  async getSuggestions(userId: string, context: string): Promise<string[]> {
    const memory = await this.getMemory(userId);
    const suggestions: string[] = [];

    // Suggest based on patterns
    for (const pattern of memory.learnedPatterns) {
      if (context.toLowerCase().includes(pattern.pattern.toLowerCase())) {
        suggestions.push(pattern.pattern);
      }
    }

    // Suggest favorite templates
    if (context.toLowerCase().includes('template') || context.toLowerCase().includes('create')) {
      suggestions.push(...memory.favoriteTemplates.map(t => `Use template: ${t}`));
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Clear user memory
   */
  async clearMemory(userId: string): Promise<void> {
    await this.storage.delete(`memory:${userId}`);
    this.memoryCache.delete(userId);
    logger.info(`Memory cleared for user: ${userId}`);
  }

  /**
   * Export memory for user
   */
  async exportMemory(userId: string): Promise<CopilotMemory> {
    return await this.getMemory(userId);
  }

  /**
   * Import memory for user
   */
  async importMemory(memory: CopilotMemory): Promise<void> {
    await this.saveMemory(memory);
  }

  /**
   * Get memory statistics
   */
  async getStatistics(userId: string): Promise<{
    totalConversations: number;
    completedWorkflows: number;
    averageSatisfaction: number;
    totalPatterns: number;
    favoriteTemplatesCount: number;
    customShortcutsCount: number;
  }> {
    const memory = await this.getMemory(userId);

    const completedConversations = memory.history.filter(h => h.outcome === 'completed');
    const satisfactionScores = memory.history
      .filter(h => h.satisfaction !== undefined)
      .map(h => h.satisfaction!);

    return {
      totalConversations: memory.history.length,
      completedWorkflows: completedConversations.length,
      averageSatisfaction:
        satisfactionScores.length > 0
          ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
          : 0,
      totalPatterns: memory.learnedPatterns.length,
      favoriteTemplatesCount: memory.favoriteTemplates.length,
      customShortcutsCount: Object.keys(memory.customShortcuts).length
    };
  }

  /**
   * Learn patterns from conversation
   */
  private async learnFromConversation(
    memory: CopilotMemory,
    conversation: ConversationHistory
  ): Promise<void> {
    if (conversation.outcome !== 'completed') {
      return;
    }

    // Extract patterns from successful conversations
    for (const turn of conversation.turns) {
      const userMessage = turn.userMessage.toLowerCase();

      // Look for repeated phrases
      const existingPattern = memory.learnedPatterns.find(p =>
        userMessage.includes(p.pattern) || p.pattern.includes(userMessage.substring(0, 20))
      );

      if (existingPattern) {
        // Increment frequency
        existingPattern.frequency++;
        existingPattern.lastUsed = new Date();
        existingPattern.confidence = Math.min(1, existingPattern.frequency / 10);
      } else if (userMessage.length > 10 && userMessage.length < 100) {
        // Create new pattern
        memory.learnedPatterns.push({
          id: this.generateId(),
          pattern: userMessage,
          frequency: 1,
          lastUsed: new Date(),
          context: {
            intent: turn.intent.intent,
            parameters: turn.extractedParameters
          },
          confidence: 0.1
        });
      }
    }

    // Keep only patterns above threshold
    memory.learnedPatterns = memory.learnedPatterns.filter(
      p => p.frequency >= this.patternThreshold
    );

    // Keep only top 100 patterns
    if (memory.learnedPatterns.length > 100) {
      memory.learnedPatterns.sort((a, b) => b.frequency - a.frequency);
      memory.learnedPatterns = memory.learnedPatterns.slice(0, 100);
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      verbosity: 'normal',
      autoSuggest: true,
      confirmActions: true,
      preferredNodes: [],
      avoidedNodes: [],
      skillLevel: 'intermediate'
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const copilotMemory = new CopilotMemoryManager();

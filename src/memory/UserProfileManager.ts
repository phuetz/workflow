import {
  UserProfile,
  UserPreferences,
  UserPattern,
  WorkflowPattern,
  UserStatistics,
  LearningEvent,
  PrivacySettings,
  Suggestion,
  FeedbackRecord,
  PersonalizationConfig,
} from '../types/memory';
import { MemoryStore } from './MemoryStore';
import { EventEmitter } from 'events';

/**
 * UserProfileManager - Learn and maintain user preferences and patterns
 *
 * Features:
 * - Learn user preferences over time
 * - Track common workflows and patterns
 * - Generate personalized suggestions
 * - Privacy-first design with opt-in/opt-out
 * - GDPR-compliant data handling
 */
export class UserProfileManager extends EventEmitter {
  private profiles: Map<string, UserProfile> = new Map();
  private memoryStore: MemoryStore;
  private config: PersonalizationConfig;
  private learningInterval?: NodeJS.Timeout;

  constructor(
    memoryStore: MemoryStore,
    config: Partial<PersonalizationConfig> = {}
  ) {
    super();
    this.memoryStore = memoryStore;
    this.config = {
      enabled: true,
      learningRate: 0.1,
      adaptationSpeed: 'medium',
      suggestionThreshold: 0.7,
      patternRecognition: true,
      behavioralAnalysis: true,
      feedbackLoop: true,
      ...config,
    };

    if (this.config.enabled) {
      this.startLearning();
    }
  }

  /**
   * Get or create user profile
   */
  async getProfile(userId: string, agentId: string): Promise<UserProfile> {
    const key = `${userId}:${agentId}`;

    if (this.profiles.has(key)) {
      return this.profiles.get(key)!;
    }

    // Create new profile
    const profile: UserProfile = {
      userId,
      agentId,
      preferences: this.getDefaultPreferences(),
      patterns: [],
      commonWorkflows: [],
      statistics: this.getDefaultStatistics(),
      learningHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.profiles.set(key, profile);
    this.emit('profile:created', { userId, agentId });

    return profile;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    agentId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId, agentId);

    profile.preferences = {
      ...profile.preferences,
      ...updates,
    };

    profile.updatedAt = new Date();
    profile.version++;

    // Record learning event
    this.recordLearningEvent(profile, {
      type: 'preference',
      description: `Updated preferences: ${Object.keys(updates).join(', ')}`,
      impact: 0.5,
      metadata: { updates },
    });

    this.emit('preferences:updated', { userId, agentId, updates });

    return profile;
  }

  /**
   * Learn from user behavior
   */
  async learnFromBehavior(
    userId: string,
    agentId: string,
    behavior: {
      type: 'workflow_execution' | 'node_usage' | 'error_handling' | 'interaction';
      data: Record<string, unknown>;
    }
  ): Promise<void> {
    if (!this.config.behavioralAnalysis) return;

    const profile = await this.getProfile(userId, agentId);

    switch (behavior.type) {
      case 'workflow_execution':
        await this.learnWorkflowPattern(profile, behavior.data);
        break;
      case 'node_usage':
        await this.learnNodePreference(profile, behavior.data);
        break;
      case 'error_handling':
        await this.learnErrorPattern(profile, behavior.data);
        break;
      case 'interaction':
        await this.learnInteractionPattern(profile, behavior.data);
        break;
    }

    profile.updatedAt = new Date();
  }

  /**
   * Generate personalized suggestions
   */
  async getSuggestions(
    userId: string,
    agentId: string,
    context?: Record<string, unknown>
  ): Promise<Suggestion[]> {
    const profile = await this.getProfile(userId, agentId);
    const suggestions: Suggestion[] = [];

    // Check privacy settings
    if (!profile.preferences.privacySettings?.memoryEnabled) {
      return suggestions;
    }

    // Workflow suggestions based on patterns
    const workflowSuggestions = await this.generateWorkflowSuggestions(
      profile,
      context
    );
    suggestions.push(...workflowSuggestions);

    // Node suggestions based on usage patterns
    const nodeSuggestions = await this.generateNodeSuggestions(profile, context);
    suggestions.push(...nodeSuggestions);

    // Optimization suggestions
    const optimizationSuggestions = await this.generateOptimizationSuggestions(
      profile
    );
    suggestions.push(...optimizationSuggestions);

    // Filter by confidence threshold
    return suggestions.filter(
      (s) => s.confidence >= this.config.suggestionThreshold
    );
  }

  /**
   * Record user feedback on suggestions
   */
  async recordFeedback(
    userId: string,
    agentId: string,
    feedback: Omit<FeedbackRecord, 'id' | 'userId' | 'timestamp'>
  ): Promise<void> {
    if (!this.config.feedbackLoop) return;

    const profile = await this.getProfile(userId, agentId);

    const record: FeedbackRecord = {
      id: this.generateId(),
      userId,
      timestamp: new Date(),
      ...feedback,
    };

    // Adjust learning rate based on feedback
    const impact = feedback.type === 'positive' ? 0.1 : -0.1;
    profile.statistics.learningRate = Math.max(
      0.01,
      Math.min(1.0, profile.statistics.learningRate + impact)
    );

    // Record learning event
    this.recordLearningEvent(profile, {
      type: 'feedback',
      description: `User feedback: ${feedback.type}`,
      impact: Math.abs(impact),
      metadata: { feedback },
    });

    this.emit('feedback:recorded', { userId, agentId, feedback: record });
  }

  /**
   * Get user statistics
   */
  async getStatistics(userId: string, agentId: string): Promise<UserStatistics> {
    const profile = await this.getProfile(userId, agentId);
    return profile.statistics;
  }

  /**
   * Export user data (GDPR)
   */
  async exportUserData(userId: string, agentId: string): Promise<{
    profile: UserProfile;
    memories: unknown[];
    analytics: Record<string, unknown>;
  }> {
    const profile = await this.getProfile(userId, agentId);

    // Get all user memories
    const memoriesResult = await this.memoryStore.search({
      userId,
      agentId,
      limit: 10000,
    });

    return {
      profile,
      memories: memoriesResult.memories,
      analytics: {
        totalMemories: memoriesResult.total,
        patterns: profile.patterns.length,
        commonWorkflows: profile.commonWorkflows.length,
        statistics: profile.statistics,
      },
    };
  }

  /**
   * Delete all user data (GDPR)
   */
  async deleteUserData(userId: string, agentId: string): Promise<void> {
    const key = `${userId}:${agentId}`;

    // Delete profile
    this.profiles.delete(key);

    // Delete all memories
    const memoriesResult = await this.memoryStore.search({
      userId,
      agentId,
      limit: 10000,
    });

    for (const memory of memoriesResult.memories) {
      await this.memoryStore.delete(memory.id);
    }

    this.emit('data:deleted', { userId, agentId });
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    agentId: string,
    settings: Partial<PrivacySettings>
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId, agentId);

    profile.preferences.privacySettings = {
      ...profile.preferences.privacySettings,
      ...settings,
    } as PrivacySettings;

    // If memory disabled, clear memory data
    if (settings.memoryEnabled === false) {
      await this.deleteUserData(userId, agentId);
    }

    profile.updatedAt = new Date();
    this.emit('privacy:updated', { userId, agentId, settings });

    return profile;
  }

  /**
   * Get common workflow patterns
   */
  async getCommonWorkflows(
    userId: string,
    agentId: string,
    limit = 10
  ): Promise<WorkflowPattern[]> {
    const profile = await this.getProfile(userId, agentId);

    return profile.commonWorkflows
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get user patterns
   */
  async getPatterns(
    userId: string,
    agentId: string,
    type?: UserPattern['type']
  ): Promise<UserPattern[]> {
    const profile = await this.getProfile(userId, agentId);

    let patterns = profile.patterns;

    if (type) {
      patterns = patterns.filter((p) => p.type === type);
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  // Private helper methods

  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      timezone: 'UTC',
      notificationSettings: {
        email: true,
        slack: false,
        webhook: false,
        inApp: true,
        frequency: 'realtime',
      },
      workflowDefaults: {
        retryAttempts: 3,
        timeout: 30000,
        errorHandling: 'retry',
        loggingLevel: 'normal',
      },
      uiPreferences: {
        theme: 'auto',
        compactMode: false,
        showHints: true,
        autoSave: true,
        gridSnap: true,
        animationsEnabled: true,
      },
      privacySettings: {
        dataCollection: true,
        analytics: true,
        memoryEnabled: true,
        retentionDays: 90,
        shareData: false,
        gdprConsent: false,
      },
    };
  }

  private getDefaultStatistics(): UserStatistics {
    return {
      totalWorkflows: 0,
      totalExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      mostUsedNodes: {},
      errorPatterns: {},
      activeHours: [],
      preferredDays: [],
      learningRate: this.config.learningRate,
    };
  }

  private async learnWorkflowPattern(
    profile: UserProfile,
    data: Record<string, unknown>
  ): Promise<void> {
    const workflowId = data.workflowId as string;
    const nodes = (data.nodes as string[]) || [];
    const executionTime = (data.executionTime as number) || 0;
    const success = (data.success as boolean) || false;

    // Update statistics
    profile.statistics.totalWorkflows++;
    profile.statistics.totalExecutions++;

    if (success) {
      const currentTotal = profile.statistics.successRate * (profile.statistics.totalExecutions - 1);
      profile.statistics.successRate = (currentTotal + 1) / profile.statistics.totalExecutions;
    }

    // Update average execution time
    const currentAvg = profile.statistics.avgExecutionTime * (profile.statistics.totalExecutions - 1);
    profile.statistics.avgExecutionTime = (currentAvg + executionTime) / profile.statistics.totalExecutions;

    // Track workflow pattern
    const existingPattern = profile.commonWorkflows.find(
      (p) => p.nodes.join(',') === nodes.join(',')
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = new Date();

      // Update success rate
      const totalRuns = existingPattern.frequency;
      const currentSuccessTotal = existingPattern.successRate * (totalRuns - 1);
      existingPattern.successRate = (currentSuccessTotal + (success ? 1 : 0)) / totalRuns;

      // Update avg execution time
      const currentAvgTotal = existingPattern.avgExecutionTime * (totalRuns - 1);
      existingPattern.avgExecutionTime = (currentAvgTotal + executionTime) / totalRuns;
    } else {
      profile.commonWorkflows.push({
        id: this.generateId(),
        name: workflowId,
        nodes,
        frequency: 1,
        successRate: success ? 1 : 0,
        avgExecutionTime: executionTime,
        lastUsed: new Date(),
        tags: [],
      });
    }

    // Limit to top 100 patterns
    if (profile.commonWorkflows.length > 100) {
      profile.commonWorkflows.sort((a, b) => b.frequency - a.frequency);
      profile.commonWorkflows = profile.commonWorkflows.slice(0, 100);
    }
  }

  private async learnNodePreference(
    profile: UserProfile,
    data: Record<string, unknown>
  ): Promise<void> {
    const nodeType = data.nodeType as string;

    if (!nodeType) return;

    // Track node usage
    if (!profile.statistics.mostUsedNodes[nodeType]) {
      profile.statistics.mostUsedNodes[nodeType] = 0;
    }
    profile.statistics.mostUsedNodes[nodeType]++;

    // Update workflow defaults if applicable
    if (data.config) {
      const config = data.config as Record<string, unknown>;

      // Learn timeout preferences
      if (config.timeout && typeof config.timeout === 'number') {
        const currentAvg = profile.preferences.workflowDefaults?.timeout || 30000;
        const newAvg = currentAvg * 0.9 + config.timeout * 0.1;

        if (profile.preferences.workflowDefaults) {
          profile.preferences.workflowDefaults.timeout = Math.round(newAvg);
        }
      }
    }
  }

  private async learnErrorPattern(
    profile: UserProfile,
    data: Record<string, unknown>
  ): Promise<void> {
    const errorType = data.errorType as string;
    const resolution = data.resolution as string;

    if (!errorType) return;

    // Track error patterns
    if (!profile.statistics.errorPatterns[errorType]) {
      profile.statistics.errorPatterns[errorType] = 0;
    }
    profile.statistics.errorPatterns[errorType]++;

    // Learn error handling preferences
    if (resolution) {
      const pattern: UserPattern = {
        id: this.generateId(),
        type: 'error',
        pattern: `${errorType}:${resolution}`,
        frequency: 1,
        confidence: 0.5,
        lastSeen: new Date(),
        metadata: { errorType, resolution },
      };

      const existing = profile.patterns.find(
        (p) => p.pattern === pattern.pattern
      );

      if (existing) {
        existing.frequency++;
        existing.confidence = Math.min(1.0, existing.confidence + 0.1);
        existing.lastSeen = new Date();
      } else {
        profile.patterns.push(pattern);
      }
    }
  }

  private async learnInteractionPattern(
    profile: UserProfile,
    data: Record<string, unknown>
  ): Promise<void> {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Track active hours
    if (!profile.statistics.activeHours.includes(hour)) {
      profile.statistics.activeHours.push(hour);
    }

    // Track preferred days
    if (!profile.statistics.preferredDays.includes(day)) {
      profile.statistics.preferredDays.push(day);
    }

    // Learn UI preferences
    if (data.uiAction) {
      const action = data.uiAction as string;

      // Example: Learn if user prefers compact mode
      if (action === 'toggle_compact_mode' && profile.preferences.uiPreferences) {
        profile.preferences.uiPreferences.compactMode = data.enabled as boolean;
      }
    }
  }

  private async generateWorkflowSuggestions(
    profile: UserProfile,
    context?: Record<string, unknown>
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Suggest commonly used workflows
    for (const pattern of profile.commonWorkflows.slice(0, 3)) {
      if (pattern.frequency > 5 && pattern.successRate > 0.8) {
        suggestions.push({
          id: this.generateId(),
          type: 'workflow',
          title: `Use ${pattern.name} workflow`,
          description: `This workflow has a ${(pattern.successRate * 100).toFixed(0)}% success rate and you've used it ${pattern.frequency} times`,
          confidence: pattern.successRate * 0.9,
          impact: 'medium',
          source: 'pattern',
          metadata: { patternId: pattern.id },
          createdAt: new Date(),
        });
      }
    }

    return suggestions;
  }

  private async generateNodeSuggestions(
    profile: UserProfile,
    context?: Record<string, unknown>
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Get top 5 most used nodes
    const topNodes = Object.entries(profile.statistics.mostUsedNodes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [nodeType, count] of topNodes) {
      if (count > 10) {
        suggestions.push({
          id: this.generateId(),
          type: 'node',
          title: `Consider using ${nodeType}`,
          description: `You've successfully used this node ${count} times`,
          confidence: Math.min(0.95, count / 100),
          impact: 'low',
          source: 'preference',
          metadata: { nodeType, usageCount: count },
          createdAt: new Date(),
        });
      }
    }

    return suggestions;
  }

  private async generateOptimizationSuggestions(
    profile: UserProfile
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Suggest optimizations based on patterns
    if (profile.statistics.avgExecutionTime > 60000) {
      // > 1 minute avg
      suggestions.push({
        id: this.generateId(),
        type: 'optimization',
        title: 'Optimize workflow execution time',
        description: `Your average execution time is ${Math.round(profile.statistics.avgExecutionTime / 1000)}s. Consider parallelizing tasks.`,
        confidence: 0.8,
        impact: 'high',
        source: 'pattern',
        metadata: { avgTime: profile.statistics.avgExecutionTime },
        createdAt: new Date(),
      });
    }

    if (profile.statistics.successRate < 0.8) {
      suggestions.push({
        id: this.generateId(),
        type: 'optimization',
        title: 'Improve error handling',
        description: `Your success rate is ${(profile.statistics.successRate * 100).toFixed(0)}%. Consider adding retry logic or error workflows.`,
        confidence: 0.85,
        impact: 'high',
        source: 'pattern',
        metadata: { successRate: profile.statistics.successRate },
        createdAt: new Date(),
      });
    }

    return suggestions;
  }

  private recordLearningEvent(
    profile: UserProfile,
    event: Omit<LearningEvent, 'id' | 'timestamp' | 'applied'>
  ): void {
    const learningEvent: LearningEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      applied: true,
      ...event,
    };

    profile.learningHistory.push(learningEvent);

    // Keep only last 100 events
    if (profile.learningHistory.length > 100) {
      profile.learningHistory = profile.learningHistory.slice(-100);
    }
  }

  private startLearning(): void {
    // Periodic pattern analysis every 5 minutes
    this.learningInterval = setInterval(() => {
      this.analyzeAllProfiles();
    }, 5 * 60 * 1000);
  }

  private async analyzeAllProfiles(): Promise<void> {
    for (const profile of this.profiles.values()) {
      if (!profile.preferences.privacySettings?.memoryEnabled) continue;

      // Analyze patterns and update confidence scores
      for (const pattern of profile.patterns) {
        const age = Date.now() - pattern.lastSeen.getTime();
        const daysSinceLastSeen = age / (1000 * 60 * 60 * 24);

        // Decay confidence if pattern not seen recently
        if (daysSinceLastSeen > 30) {
          pattern.confidence = Math.max(0.1, pattern.confidence * 0.95);
        }
      }

      // Remove low-confidence patterns
      profile.patterns = profile.patterns.filter((p) => p.confidence > 0.2);
    }
  }

  private generateId(): string {
    return `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.learningInterval) {
      clearInterval(this.learningInterval);
    }
  }
}

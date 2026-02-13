/**
 * Prompt Registry
 * Central repository for managing prompt templates with versioning and analytics
 */

import { logger } from '../../services/SimpleLogger';
import type {
  PromptTemplate,
  Variable,
  Example,
} from '../types/llmops';

export interface SearchFilters {
  tags?: string[];
  status?: PromptTemplate['status'];
  author?: string;
  nameContains?: string;
  minQualityScore?: number;
}

export interface PromptAnalytics {
  promptId: string;
  totalUses: number;
  avgLatency: number;
  avgCost: number;
  avgQualityScore: number;
  usageOverTime: {
    date: Date;
    count: number;
  }[];
  topUsers: {
    userId: string;
    count: number;
  }[];
}

export class PromptRegistry {
  private prompts: Map<string, PromptTemplate> = new Map();
  private analytics: Map<string, PromptAnalytics> = new Map();

  /**
   * Create new prompt template
   */
  async create(
    data: Omit<PromptTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'analytics'>
  ): Promise<PromptTemplate> {
    const prompt: PromptTemplate = {
      ...data,
      id: this.generatePromptId(),
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      analytics: {
        totalUses: 0,
        avgLatency: 0,
        avgCost: 0,
        avgQualityScore: 0,
      },
    };

    this.prompts.set(prompt.id, prompt);

    // Initialize analytics
    this.analytics.set(prompt.id, {
      promptId: prompt.id,
      totalUses: 0,
      avgLatency: 0,
      avgCost: 0,
      avgQualityScore: 0,
      usageOverTime: [],
      topUsers: [],
    });

    logger.debug(`[PromptRegistry] Created prompt: ${prompt.id} (${prompt.name})`);
    return prompt;
  }

  /**
   * Get prompt by ID
   */
  get(promptId: string): PromptTemplate | undefined {
    return this.prompts.get(promptId);
  }

  /**
   * Get prompt by name
   */
  getByName(name: string): PromptTemplate | undefined {
    return Array.from(this.prompts.values()).find((p) => p.name === name);
  }

  /**
   * Update prompt template
   */
  async update(
    promptId: string,
    updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>
  ): Promise<PromptTemplate> {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const updated: PromptTemplate = {
      ...prompt,
      ...updates,
      updatedAt: new Date(),
      previousVersion: prompt.version,
      version: this.incrementVersion(prompt.version),
    };

    this.prompts.set(promptId, updated);

    logger.debug(`[PromptRegistry] Updated prompt: ${promptId} (v${updated.version})`);
    return updated;
  }

  /**
   * Delete prompt
   */
  async delete(promptId: string): Promise<void> {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    this.prompts.delete(promptId);
    this.analytics.delete(promptId);

    logger.debug(`[PromptRegistry] Deleted prompt: ${promptId}`);
  }

  /**
   * Archive prompt (soft delete)
   */
  async archive(promptId: string): Promise<PromptTemplate> {
    return this.update(promptId, { status: 'archived' });
  }

  /**
   * Activate prompt
   */
  async activate(promptId: string): Promise<PromptTemplate> {
    return this.update(promptId, { status: 'active' });
  }

  /**
   * Search prompts with filters
   */
  search(filters: SearchFilters): PromptTemplate[] {
    let results = Array.from(this.prompts.values());

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((p) =>
        filters.tags!.some((tag) => p.tags.includes(tag))
      );
    }

    // Filter by status
    if (filters.status) {
      results = results.filter((p) => p.status === filters.status);
    }

    // Filter by author
    if (filters.author) {
      results = results.filter((p) => p.author === filters.author);
    }

    // Filter by name
    if (filters.nameContains) {
      const query = filters.nameContains.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    // Filter by quality score
    if (filters.minQualityScore !== undefined) {
      results = results.filter(
        (p) =>
          p.analytics &&
          p.analytics.avgQualityScore >= filters.minQualityScore!
      );
    }

    return results;
  }

  /**
   * List all prompts
   */
  list(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Get active prompts
   */
  getActive(): PromptTemplate[] {
    return this.search({ status: 'active' });
  }

  /**
   * Get prompts by tag
   */
  getByTags(tags: string[]): PromptTemplate[] {
    return this.search({ tags });
  }

  /**
   * Get prompts by author
   */
  getByAuthor(author: string): PromptTemplate[] {
    return this.search({ author });
  }

  /**
   * Clone prompt
   */
  async clone(promptId: string, newName: string): Promise<PromptTemplate> {
    const original = this.prompts.get(promptId);
    if (!original) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const cloned = await this.create({
      ...original,
      name: newName,
      status: 'draft',
      previousVersion: undefined,
    });

    logger.debug(`[PromptRegistry] Cloned prompt: ${promptId} -> ${cloned.id}`);
    return cloned;
  }

  /**
   * Record prompt usage
   */
  recordUsage(
    promptId: string,
    metrics: {
      latency: number;
      cost: number;
      qualityScore?: number;
      userId?: string;
    }
  ): void {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      return;
    }

    const analytics = this.analytics.get(promptId);
    if (!analytics) {
      return;
    }

    // Update counters
    analytics.totalUses++;

    // Update averages (running average)
    analytics.avgLatency =
      (analytics.avgLatency * (analytics.totalUses - 1) + metrics.latency) /
      analytics.totalUses;

    analytics.avgCost =
      (analytics.avgCost * (analytics.totalUses - 1) + metrics.cost) /
      analytics.totalUses;

    if (metrics.qualityScore !== undefined) {
      analytics.avgQualityScore =
        (analytics.avgQualityScore * (analytics.totalUses - 1) +
          metrics.qualityScore) /
        analytics.totalUses;
    }

    // Update usage over time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntry = analytics.usageOverTime.find(
      (entry) => entry.date.getTime() === today.getTime()
    );

    if (todayEntry) {
      todayEntry.count++;
    } else {
      analytics.usageOverTime.push({
        date: today,
        count: 1,
      });

      // Keep last 30 days
      if (analytics.usageOverTime.length > 30) {
        analytics.usageOverTime.shift();
      }
    }

    // Update top users
    if (metrics.userId) {
      const userEntry = analytics.topUsers.find((u) => u.userId === metrics.userId);
      if (userEntry) {
        userEntry.count++;
      } else {
        analytics.topUsers.push({
          userId: metrics.userId,
          count: 1,
        });
      }

      // Sort and keep top 10
      analytics.topUsers.sort((a, b) => b.count - a.count);
      analytics.topUsers = analytics.topUsers.slice(0, 10);
    }

    // Update prompt analytics
    prompt.analytics = {
      totalUses: analytics.totalUses,
      avgLatency: analytics.avgLatency,
      avgCost: analytics.avgCost,
      avgQualityScore: analytics.avgQualityScore,
    };
  }

  /**
   * Get prompt analytics
   */
  getAnalytics(promptId: string): PromptAnalytics | undefined {
    return this.analytics.get(promptId);
  }

  /**
   * Get top prompts by usage
   */
  getTopByUsage(limit: number = 10): PromptTemplate[] {
    return Array.from(this.prompts.values())
      .sort(
        (a, b) =>
          (b.analytics?.totalUses || 0) - (a.analytics?.totalUses || 0)
      )
      .slice(0, limit);
  }

  /**
   * Get top prompts by quality
   */
  getTopByQuality(limit: number = 10): PromptTemplate[] {
    return Array.from(this.prompts.values())
      .filter((p) => p.analytics && p.analytics.totalUses > 0)
      .sort(
        (a, b) =>
          (b.analytics?.avgQualityScore || 0) -
          (a.analytics?.avgQualityScore || 0)
      )
      .slice(0, limit);
  }

  /**
   * Validate prompt template
   */
  validate(prompt: Partial<PromptTemplate>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!prompt.name || prompt.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!prompt.template || prompt.template.trim() === '') {
      errors.push('Template is required');
    }

    // Check variables
    if (prompt.template && prompt.variables) {
      const templateVars = this.extractVariables(prompt.template);
      const declaredVars = new Set(prompt.variables.map((v) => v.name));

      // Check for undeclared variables
      for (const varName of templateVars) {
        if (!declaredVars.has(varName)) {
          errors.push(`Variable {{${varName}}} used but not declared`);
        }
      }

      // Check for unused variables
      for (const variable of prompt.variables) {
        if (!templateVars.has(variable.name)) {
          errors.push(`Variable ${variable.name} declared but not used`);
        }
      }
    }

    // Check model config
    if (prompt.modelConfig) {
      if (
        prompt.modelConfig.temperature < 0 ||
        prompt.modelConfig.temperature > 2
      ) {
        errors.push('Temperature must be between 0 and 2');
      }

      if (prompt.modelConfig.maxTokens < 1) {
        errors.push('Max tokens must be positive');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract variables from template
   */
  private extractVariables(template: string): Set<string> {
    const variables = new Set<string>();
    const regex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return variables;
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Generate unique prompt ID
   */
  private generatePromptId(): string {
    return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export prompts to JSON
   */
  export(): string {
    const prompts = Array.from(this.prompts.values());
    return JSON.stringify(prompts, null, 2);
  }

  /**
   * Import prompts from JSON
   */
  import(json: string): number {
    const prompts: PromptTemplate[] = JSON.parse(json);
    let imported = 0;

    for (const prompt of prompts) {
      this.prompts.set(prompt.id, prompt);
      imported++;
    }

    logger.debug(`[PromptRegistry] Imported ${imported} prompts`);
    return imported;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    active: number;
    draft: number;
    archived: number;
    totalUses: number;
    avgQuality: number;
  } {
    const prompts = Array.from(this.prompts.values());

    return {
      total: prompts.length,
      active: prompts.filter((p) => p.status === 'active').length,
      draft: prompts.filter((p) => p.status === 'draft').length,
      archived: prompts.filter((p) => p.status === 'archived').length,
      totalUses: prompts.reduce(
        (sum, p) => sum + (p.analytics?.totalUses || 0),
        0
      ),
      avgQuality:
        prompts.reduce(
          (sum, p) => sum + (p.analytics?.avgQualityScore || 0),
          0
        ) / prompts.length,
    };
  }
}

/**
 * MCP Prompt Registry
 * Manages registration and execution of MCP prompts
 */

import type {
  MCPPrompt,
  MCPPromptArgument,
  MCPPromptMessage,
  MCPGetPromptParams,
  MCPGetPromptResult,
} from '../types/mcp';
import { logger } from '../services/SimpleLogger';

export interface MCPPromptDefinition {
  prompt: MCPPrompt;
  handler: (args: Record<string, string>) => Promise<MCPGetPromptResult>;
  version?: string;
  deprecated?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MCPPromptRegistryConfig {
  namespace?: string;
  versioning?: boolean;
  validation?: boolean;
  monitoring?: boolean;
}

export class MCPPromptRegistry {
  private config: MCPPromptRegistryConfig;
  private prompts = new Map<string, MCPPromptDefinition>();
  private executionStats = new Map<string, { calls: number; errors: number; totalTime: number }>();

  constructor(config: MCPPromptRegistryConfig = {}) {
    this.config = {
      namespace: '',
      versioning: false,
      validation: true,
      monitoring: true,
      ...config,
    };
  }

  /**
   * Register a prompt
   */
  registerPrompt(definition: MCPPromptDefinition): void {
    const promptName = this.getPromptName(definition.prompt.name, definition.version);

    // Validate prompt definition
    if (this.config.validation) {
      this.validatePromptDefinition(definition);
    }

    // Check for duplicates
    if (this.prompts.has(promptName)) {
      throw new Error(`Prompt already registered: ${promptName}`);
    }

    this.prompts.set(promptName, definition);

    // Initialize stats
    if (this.config.monitoring) {
      this.executionStats.set(promptName, { calls: 0, errors: 0, totalTime: 0 });
    }

    logger.debug(`Registered MCP prompt: ${promptName}`);
  }

  /**
   * Unregister a prompt
   */
  unregisterPrompt(name: string, version?: string): void {
    const promptName = this.getPromptName(name, version);

    if (!this.prompts.has(promptName)) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    this.prompts.delete(promptName);
    this.executionStats.delete(promptName);

    logger.debug(`Unregistered MCP prompt: ${promptName}`);
  }

  /**
   * Get a prompt definition
   */
  getPrompt(name: string, version?: string): MCPPromptDefinition | undefined {
    const promptName = this.getPromptName(name, version);
    return this.prompts.get(promptName);
  }

  /**
   * List all prompts
   */
  listPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values())
      .filter((def) => !def.deprecated)
      .map((def) => def.prompt);
  }

  /**
   * Execute a prompt (get prompt messages)
   */
  async executePrompt(params: MCPGetPromptParams): Promise<MCPGetPromptResult> {
    const promptName = this.getPromptName(params.name);
    const definition = this.prompts.get(promptName);

    if (!definition) {
      throw new Error(`Prompt not found: ${params.name}`);
    }

    // Check if deprecated
    if (definition.deprecated) {
      logger.warn(`Prompt is deprecated: ${params.name}`);
    }

    // Validate arguments
    if (this.config.validation && definition.prompt.arguments) {
      const validation = this.validateArguments(definition.prompt.arguments, params.arguments || {});
      if (!validation.valid) {
        throw new Error(`Invalid arguments: ${validation.errors?.join(', ')}`);
      }
    }

    // Execute prompt handler
    const startTime = Date.now();
    try {
      const result = await definition.handler(params.arguments || {});

      // Update stats
      if (this.config.monitoring) {
        const stats = this.executionStats.get(promptName);
        if (stats) {
          stats.calls++;
          stats.totalTime += Date.now() - startTime;
        }
      }

      return result;
    } catch (error) {
      // Update error stats
      if (this.config.monitoring) {
        const stats = this.executionStats.get(promptName);
        if (stats) {
          stats.errors++;
        }
      }

      throw error;
    }
  }

  /**
   * Validate prompt definition
   */
  private validatePromptDefinition(definition: MCPPromptDefinition): void {
    if (!definition.prompt.name) {
      throw new Error('Prompt name is required');
    }

    if (!definition.handler) {
      throw new Error('Prompt handler is required');
    }

    if (typeof definition.handler !== 'function') {
      throw new Error('Prompt handler must be a function');
    }
  }

  /**
   * Validate prompt arguments
   */
  private validateArguments(
    schema: MCPPromptArgument[],
    args: Record<string, string>
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check required arguments
    for (const arg of schema) {
      if (arg.required && !(arg.name in args)) {
        errors.push(`Missing required argument: ${arg.name}`);
      }
    }

    // Check for unknown arguments
    const knownArgs = new Set(schema.map(a => a.name));
    for (const key of Object.keys(args)) {
      if (!knownArgs.has(key)) {
        errors.push(`Unknown argument: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get prompt name with namespace and version
   */
  private getPromptName(name: string, version?: string): string {
    let promptName = name;

    if (this.config.namespace) {
      promptName = `${this.config.namespace}.${name}`;
    }

    if (this.config.versioning && version) {
      promptName = `${promptName}@${version}`;
    }

    return promptName;
  }

  /**
   * Get execution statistics
   */
  getStats(name?: string): Record<string, { calls: number; errors: number; avgTime: number }> {
    const stats: Record<string, { calls: number; errors: number; avgTime: number }> = {};

    for (const [promptName, promptStats] of this.executionStats.entries()) {
      if (name && !promptName.includes(name)) continue;

      stats[promptName] = {
        calls: promptStats.calls,
        errors: promptStats.errors,
        avgTime: promptStats.calls > 0 ? promptStats.totalTime / promptStats.calls : 0,
      };
    }

    return stats;
  }

  /**
   * Search prompts by tag
   */
  searchByTag(tag: string): MCPPrompt[] {
    return Array.from(this.prompts.values())
      .filter((def) => def.tags?.includes(tag) && !def.deprecated)
      .map((def) => def.prompt);
  }

  /**
   * Search prompts by name pattern
   */
  searchByName(pattern: string): MCPPrompt[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.prompts.values())
      .filter((def) => regex.test(def.prompt.name) && !def.deprecated)
      .map((def) => def.prompt);
  }

  /**
   * Mark prompt as deprecated
   */
  deprecatePrompt(name: string, version?: string): void {
    const promptName = this.getPromptName(name, version);
    const definition = this.prompts.get(promptName);

    if (!definition) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    definition.deprecated = true;
  }

  /**
   * Clear all prompts
   */
  clear(): void {
    this.prompts.clear();
    this.executionStats.clear();
  }

  /**
   * Get prompt count
   */
  count(): number {
    return this.prompts.size;
  }

  /**
   * Check if prompt exists
   */
  has(name: string, version?: string): boolean {
    const promptName = this.getPromptName(name, version);
    return this.prompts.has(promptName);
  }

  /**
   * Get configuration
   */
  getConfig(): MCPPromptRegistryConfig {
    return { ...this.config };
  }
}

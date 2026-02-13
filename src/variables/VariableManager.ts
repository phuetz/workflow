/**
 * Variable Manager
 * Central manager for workflow variables
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import { getVariableStorage, VariableStorage } from './VariableStorage';
import type { Variable, WorkflowVariable, VariableFilter, VariableScope, VariableType, VariableChangeEvent } from '../types/variables';

export interface VariableManagerConfig {
  enableCache?: boolean;
  cacheTTL?: number;
  maxVariablesPerScope?: number;
  allowOverwrites?: boolean;
}

export class VariableManager {
  private storage: VariableStorage;
  private config: Required<VariableManagerConfig>;
  private cache: Map<string, { variable: Variable; timestamp: number }>;
  private listeners: Array<(event: VariableChangeEvent) => void>;

  constructor(config: VariableManagerConfig = {}) {
    this.storage = getVariableStorage();
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 300000, // 5 minutes
      maxVariablesPerScope: config.maxVariablesPerScope ?? 1000,
      allowOverwrites: config.allowOverwrites ?? true
    };
    this.cache = new Map();
    this.listeners = [];

    logger.info('VariableManager initialized', this.config);
  }

  /**
   * Create new variable
   */
  async createVariable(data: {
    name: string;
    value: any;
    type: VariableType;
    scope: VariableScope;
    description?: string;
    tags?: string[];
    createdBy?: string;
  }): Promise<Variable> {
    // Check if variable already exists
    const existing = await this.storage.get(data.name, data.scope as 'global' | 'workflow' | 'execution');
    if (existing && !this.config.allowOverwrites) {
      throw new Error(`Variable ${data.name} already exists in scope ${data.scope}`);
    }

    // Check max variables limit
    const count = await this.getVariableCount(data.scope);
    if (count >= this.config.maxVariablesPerScope) {
      throw new Error(`Maximum variables per scope reached (${this.config.maxVariablesPerScope})`);
    }

    // Create or update variable
    const variable = existing
      ? await this.storage.update(existing.id, { ...data })
      : await this.storage.set(data);

    // Update cache
    if (this.config.enableCache) {
      this.cacheVariable(variable);
    }

    // Notify listeners
    this.notifyListeners({
      type: existing ? 'updated' : 'created',
      variable: variable as WorkflowVariable,
      previousValue: existing?.value,
      timestamp: new Date()
    });

    return variable;
  }

  /**
   * Get variable by name
   */
  async getVariable(name: string, scope?: VariableScope): Promise<Variable | null> {
    // Check cache first
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(name, scope);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.variable;
      }
    }

    // Get from storage
    const variable = await this.storage.get(name, scope as 'global' | 'workflow' | 'execution' | undefined);

    // Cache result
    if (variable && this.config.enableCache) {
      this.cacheVariable(variable);
    }

    return variable;
  }

  /**
   * Get variable value
   */
  async getVariableValue(name: string, scope?: VariableScope): Promise<any> {
    const variable = await this.getVariable(name, scope);
    return variable?.value;
  }

  /**
   * Set variable value
   */
  async setVariableValue(name: string, value: any, scope?: VariableScope): Promise<Variable> {
    const variable = await this.getVariable(name, scope);

    if (!variable) {
      // Create new variable
      return this.createVariable({
        name,
        value,
        type: this.inferType(value),
        scope: scope || 'global'
      });
    }

    // Update existing variable
    const updated = await this.storage.update(variable.id, { value });

    // Update cache
    if (this.config.enableCache) {
      this.cacheVariable(updated);
    }

    // Notify listeners
    this.notifyListeners({
      type: 'updated',
      variable: updated as WorkflowVariable,
      previousValue: variable.value,
      timestamp: new Date()
    });

    return updated;
  }

  /**
   * Update variable
   */
  async updateVariable(id: string, updates: Partial<Variable>): Promise<Variable> {
    const variable = await this.storage.update(id, updates);

    // Update cache
    if (this.config.enableCache) {
      this.cacheVariable(variable);
    }

    // Notify listeners
    this.notifyListeners({
      type: 'updated',
      variable: variable as WorkflowVariable,
      timestamp: new Date()
    });

    return variable;
  }

  /**
   * Delete variable
   */
  async deleteVariable(id: string): Promise<boolean> {
    // Get variable before deletion for event
    const variables = await this.storage.list();
    const variable = variables.find(v => v.id === id);

    const deleted = await this.storage.delete(id);

    if (deleted && variable) {
      // Remove from cache
      if (this.config.enableCache) {
        const cacheKey = this.getCacheKey(variable.name, variable.scope);
        this.cache.delete(cacheKey);
      }

      // Notify listeners
      this.notifyListeners({
        type: 'deleted',
        variable: variable as WorkflowVariable,
        timestamp: new Date()
      });
    }

    return deleted;
  }

  /**
   * List variables
   */
  async listVariables(filter?: VariableFilter): Promise<Variable[]> {
    return this.storage.list(filter);
  }

  /**
   * Clear all variables
   */
  async clearAll(scope?: VariableScope): Promise<void> {
    if (scope) {
      const variables = await this.storage.list({ scope });
      for (const variable of variables) {
        await this.deleteVariable(variable.id);
      }
    } else {
      await this.storage.clear();
      this.cache.clear();
    }
  }

  /**
   * Get variable count
   */
  private async getVariableCount(scope: VariableScope): Promise<number> {
    const variables = await this.storage.list({ scope });
    return variables.length;
  }

  /**
   * Cache variable
   */
  private cacheVariable(variable: Variable): void {
    const cacheKey = this.getCacheKey(variable.name, variable.scope);
    this.cache.set(cacheKey, {
      variable,
      timestamp: Date.now()
    });
  }

  /**
   * Get cache key
   */
  private getCacheKey(name: string, scope?: VariableScope): string {
    return scope ? `${scope}:${name}` : `global:${name}`;
  }

  /**
   * Infer variable type from value
   */
  private inferType(value: any): VariableType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'any';
  }

  /**
   * Add change listener
   */
  addEventListener(listener: (event: VariableChangeEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove change listener
   */
  removeEventListener(listener: (event: VariableChangeEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: VariableChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in variable change listener:', error);
      }
    }
  }

  /**
   * Export variables
   */
  async exportVariables(scope?: VariableScope): Promise<string> {
    const variables = await this.storage.list(scope ? { scope: [scope] } : undefined);
    return JSON.stringify(variables, null, 2);
  }

  /**
   * Import variables
   */
  async importVariables(json: string): Promise<number> {
    try {
      const variables = JSON.parse(json) as Variable[];
      let count = 0;

      for (const variable of variables) {
        await this.storage.set({
          name: variable.name,
          value: variable.value,
          type: variable.type,
          scope: variable.scope,
          description: variable.description,
          tags: variable.tags,
          createdBy: variable.createdBy
        });
        count++;
      }

      logger.info(`Imported ${count} variables`);
      return count;
    } catch (error) {
      logger.error('Failed to import variables:', error);
      throw new Error('Invalid variable import data');
    }
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{
    total: number;
    byScope: Record<VariableScope, number>;
    byType: Record<VariableType, number>;
  }> {
    const variables = await this.storage.list();

    const byScope: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const variable of variables) {
      byScope[variable.scope] = (byScope[variable.scope] || 0) + 1;
      byType[variable.type] = (byType[variable.type] || 0) + 1;
    }

    return {
      total: variables.length,
      byScope: byScope as Record<VariableScope, number>,
      byType: byType as Record<VariableType, number>
    };
  }
}

// Export singleton instance
let managerInstance: VariableManager | null = null;

export function getVariableManager(config?: VariableManagerConfig): VariableManager {
  if (!managerInstance) {
    managerInstance = new VariableManager(config);
  }
  return managerInstance;
}

export function resetVariableManager(): void {
  managerInstance = null;
}

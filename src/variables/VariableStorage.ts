/**
 * Variable Storage
 * Handles persistence of variables
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import type { Variable, VariableFilter, VariableScope } from '../types/variables';

export class VariableStorage {
  private storage: Storage;
  private storageKey = 'workflow_variables';
  private cache: Map<string, Variable>;

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    } as Storage);

    this.cache = new Map();
    this.loadFromStorage();
  }

  /**
   * Load variables from storage
   */
  private loadFromStorage(): void {
    try {
      const data = this.storage.getItem(this.storageKey);
      if (data) {
        const variables: Variable[] = JSON.parse(data);
        for (const variable of variables) {
          this.cache.set(variable.id, variable);
        }
        logger.info(`Loaded ${variables.length} variables from storage`);
      }
    } catch (error) {
      logger.error('Failed to load variables from storage:', error);
    }
  }

  /**
   * Save variables to storage
   */
  private saveToStorage(): void {
    try {
      const variables = Array.from(this.cache.values());
      this.storage.setItem(this.storageKey, JSON.stringify(variables));
    } catch (error) {
      logger.error('Failed to save variables to storage:', error);
    }
  }

  /**
   * Get variable by name
   */
  async get(name: string, scope?: VariableScope): Promise<Variable | null> {
    const variables = Array.from(this.cache.values());
    for (const variable of variables) {
      if (variable.name === name && (!scope || variable.scope === scope)) {
        return variable;
      }
    }
    return null;
  }

  /**
   * Set variable
   */
  async set(variable: Omit<Variable, 'id' | 'createdAt' | 'updatedAt'>): Promise<Variable> {
    const id = this.generateId();
    const now = new Date();

    const newVariable: Variable = {
      ...variable,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.cache.set(id, newVariable);
    this.saveToStorage();

    logger.info(`Variable saved: ${newVariable.name}`);
    return newVariable;
  }

  /**
   * Update variable
   */
  async update(id: string, update: Partial<Variable>): Promise<Variable> {
    const variable = this.cache.get(id);
    if (!variable) {
      throw new Error(`Variable not found: ${id}`);
    }

    const updated: Variable = {
      ...variable,
      ...update,
      id: variable.id, // prevent ID change
      createdAt: variable.createdAt, // prevent createdAt change
      updatedAt: new Date()
    };

    this.cache.set(id, updated);
    this.saveToStorage();

    logger.info(`Variable updated: ${updated.name}`);
    return updated;
  }

  /**
   * Delete variable
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.cache.delete(id);
    if (deleted) {
      this.saveToStorage();
      logger.info(`Variable deleted: ${id}`);
    }
    return deleted;
  }

  /**
   * List variables
   */
  async list(filter?: VariableFilter): Promise<Variable[]> {
    let variables = Array.from(this.cache.values());

    if (filter) {
      if (filter.scope) {
        const scopes = Array.isArray(filter.scope) ? filter.scope : [filter.scope];
        variables = variables.filter(v => scopes.includes(v.scope));
      }

      if (filter.tags && filter.tags.length > 0) {
        variables = variables.filter(v =>
          v.tags?.some(tag => filter.tags!.includes(tag))
        );
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        variables = variables.filter(v =>
          v.name.toLowerCase().includes(search) ||
          v.description?.toLowerCase().includes(search)
        );
      }
    }

    return variables;
  }

  /**
   * Check if variable exists
   */
  async exists(name: string, scope?: VariableScope): Promise<boolean> {
    const variable = await this.get(name, scope);
    return variable !== null;
  }

  /**
   * Clear all variables
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.storage.removeItem(this.storageKey);
    logger.info('All variables cleared');
  }

  /**
   * Get count
   */
  async count(): Promise<number> {
    return this.cache.size;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
let storageInstance: VariableStorage | null = null;

export function getVariableStorage(): VariableStorage {
  if (!storageInstance) {
    storageInstance = new VariableStorage();
  }
  return storageInstance;
}

export function resetVariableStorage(): void {
  storageInstance = null;
}

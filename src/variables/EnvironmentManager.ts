/**
 * Environment Manager
 * Manages environment variables and configurations
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import type { EnvironmentVariable } from '../types/variables';

// Interface for example environment variable definitions
interface ExampleEnvironmentVariable {
  key: string;
  value?: string;
  description?: string;
  required?: boolean;
}

export class EnvironmentManager {
  private variables: Map<string, string>;
  private required: Set<string>;

  constructor() {
    this.variables = new Map();
    this.required = new Set();
    this.loadEnvironmentVariables();
  }

  /**
   * Load environment variables from process.env
   */
  private loadEnvironmentVariables(): void {
    // In browser, we can't access process.env directly
    // Variables should be injected during build or via window object

    if (typeof process !== 'undefined' && process.env) {
      // Node.js environment
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          this.variables.set(key, value);
        }
      }
      logger.info(`Loaded ${this.variables.size} environment variables`);
    } else if (typeof window !== 'undefined') {
      // Browser environment - check for injected env variables
      const windowEnv = (window as any).__ENV__;
      if (windowEnv) {
        for (const [key, value] of Object.entries(windowEnv)) {
          if (typeof value === 'string') {
            this.variables.set(key, value);
          }
        }
        logger.info(`Loaded ${this.variables.size} environment variables from window`);
      }
    }
  }

  /**
   * Get environment variable
   */
  get(key: string, defaultValue?: string): string | undefined {
    const value = this.variables.get(key);

    if (value === undefined && defaultValue !== undefined) {
      return defaultValue;
    }

    if (value === undefined && this.required.has(key)) {
      logger.warn(`Required environment variable missing: ${key}`);
    }

    return value;
  }

  /**
   * Set environment variable (runtime only)
   */
  set(key: string, value: string): void {
    this.variables.set(key, value);
    logger.debug(`Environment variable set: ${key}`);
  }

  /**
   * Check if variable exists
   */
  has(key: string): boolean {
    return this.variables.has(key);
  }

  /**
   * Delete environment variable (runtime only)
   */
  delete(key: string): boolean {
    return this.variables.delete(key);
  }

  /**
   * Get all environment variables
   */
  getAll(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of this.variables.entries()) {
      env[key] = value;
    }
    return env;
  }

  /**
   * Get all keys
   */
  getKeys(): string[] {
    return Array.from(this.variables.keys());
  }

  /**
   * Mark variable as required
   */
  markRequired(key: string): void {
    this.required.add(key);
  }

  /**
   * Mark multiple variables as required
   */
  markRequiredMany(keys: string[]): void {
    for (const key of keys) {
      this.required.add(key);
    }
  }

  /**
   * Validate required variables are present
   */
  validate(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const key of this.required) {
      if (!this.variables.has(key)) {
        missing.push(key);
      }
    }

    const valid = missing.length === 0;

    if (!valid) {
      logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return { valid, missing };
  }

  /**
   * Parse .env file content
   */
  parseEnvFile(content: string): Map<string, string> {
    const variables = new Map<string, string>();
    const lines = content.split('\n');

    for (let line of lines) {
      // Remove comments
      const commentIndex = line.indexOf('#');
      if (commentIndex >= 0) {
        line = line.substring(0, commentIndex);
      }

      // Trim whitespace
      line = line.trim();

      // Skip empty lines
      if (!line) continue;

      // Parse KEY=VALUE
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }

        // Handle escape sequences
        value = value.replace(/\\n/g, '\n')
                     .replace(/\\r/g, '\r')
                     .replace(/\\t/g, '\t')
                     .replace(/\\\\/g, '\\');

        variables.set(key, value);
      }
    }

    return variables;
  }

  /**
   * Load from .env file content
   */
  loadFromEnvFile(content: string): number {
    const parsed = this.parseEnvFile(content);
    let count = 0;

    for (const [key, value] of parsed) {
      this.variables.set(key, value);
      count++;
    }

    logger.info(`Loaded ${count} variables from .env file`);
    return count;
  }

  /**
   * Export to .env file format
   */
  exportToEnvFile(keys?: string[]): string {
    const lines: string[] = [];
    const exportKeys = keys || Array.from(this.variables.keys());

    for (const key of exportKeys) {
      const value = this.variables.get(key);
      if (value !== undefined) {
        // Escape special characters
        let escapedValue = value
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');

        // Quote if contains spaces or special chars
        if (/[\s#"]/.test(escapedValue)) {
          escapedValue = `"${escapedValue.replace(/"/g, '\\"')}"`;
        }

        lines.push(`${key}=${escapedValue}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get variable with type conversion
   */
  getString(key: string, defaultValue?: string): string {
    return this.get(key, defaultValue) || '';
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key);
    if (value === undefined) return defaultValue ?? 0;
    const num = Number(value);
    return isNaN(num) ? (defaultValue ?? 0) : num;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue ?? false;
    return value.toLowerCase() === 'true' || value === '1';
  }

  getArray(key: string, separator: string = ',', defaultValue?: string[]): string[] {
    const value = this.get(key);
    if (value === undefined) return defaultValue ?? [];
    return value.split(separator).map(v => v.trim()).filter(Boolean);
  }

  getJSON<T = any>(key: string, defaultValue?: T): T | undefined {
    const value = this.get(key);
    if (value === undefined) return defaultValue;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn(`Failed to parse JSON for env var ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Clear all environment variables (runtime only)
   */
  clear(): void {
    this.variables.clear();
    this.required.clear();
    logger.info('All environment variables cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    required: number;
    missing: number;
  } {
    const { missing } = this.validate();

    return {
      total: this.variables.size,
      required: this.required.size,
      missing: missing.length
    };
  }

  /**
   * Create example .env file
   */
  createExampleEnv(variables: ExampleEnvironmentVariable[]): string {
    const lines: string[] = [
      '# Environment Variables',
      '# Copy this file to .env and fill in your values',
      ''
    ];

    for (const variable of variables) {
      if (variable.description) {
        lines.push(`# ${variable.description}`);
      }
      if (variable.required) {
        lines.push(`# Required`);
      }
      lines.push(`${variable.key}=${variable.value || ''}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Export singleton instance
let envManagerInstance: EnvironmentManager | null = null;

export function getEnvironmentManager(): EnvironmentManager {
  if (!envManagerInstance) {
    envManagerInstance = new EnvironmentManager();
  }
  return envManagerInstance;
}

export function resetEnvironmentManager(): void {
  envManagerInstance = null;
}

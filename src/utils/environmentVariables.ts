/**
 * Environment Variables Manager
 * Manage environment-specific variables for workflows (n8n-like)
 */

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  encrypted?: boolean;
  description?: string;
}

export type Environment = 'development' | 'staging' | 'production';

class EnvironmentVariablesManager {
  private variables: Map<string, Map<Environment, EnvironmentVariable>> = new Map();
  private currentEnvironment: Environment = 'development';

  constructor() {
    this.loadFromStorage();
    this.detectEnvironment();
  }

  /**
   * Set environment variable
   */
  set(key: string, value: string, options?: {
    type?: EnvironmentVariable['type'];
    description?: string;
    environment?: Environment;
    encrypted?: boolean;
  }): void {
    const env = options?.environment || this.currentEnvironment;

    if (!this.variables.has(key)) {
      this.variables.set(key, new Map());
    }

    const envVars = this.variables.get(key)!;

    const variable: EnvironmentVariable = {
      key,
      value: options?.encrypted ? this.encrypt(value) : value,
      type: options?.type || 'string',
      encrypted: options?.encrypted,
      description: options?.description
    };

    envVars.set(env, variable);
    this.saveToStorage();
  }

  /**
   * Get environment variable
   */
  get(key: string, environment?: Environment): string | null {
    const env = environment || this.currentEnvironment;
    const envVars = this.variables.get(key);

    if (!envVars) return null;

    const variable = envVars.get(env);
    if (!variable) return null;

    return variable.encrypted ? this.decrypt(variable.value) : variable.value;
  }

  /**
   * Get typed environment variable
   */
  getTyped(key: string, environment?: Environment): any {
    const value = this.get(key, environment);
    if (value === null) return null;

    const env = environment || this.currentEnvironment;
    const variable = this.variables.get(key)?.get(env);

    if (!variable) return value;

    switch (variable.type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Delete environment variable
   */
  delete(key: string, environment?: Environment): void {
    if (environment) {
      this.variables.get(key)?.delete(environment);
    } else {
      this.variables.delete(key);
    }
    this.saveToStorage();
  }

  /**
   * Get all variables for current environment
   */
  getAll(environment?: Environment): Record<string, any> {
    const env = environment || this.currentEnvironment;
    const result: Record<string, any> = {};

    for (const [key, envVars] of this.variables.entries()) {
      const variable = envVars.get(env);
      if (variable) {
        result[key] = this.getTyped(key, env);
      }
    }

    return result;
  }

  /**
   * Get all variables (all environments)
   */
  getAllEnvironments(): Map<string, Map<Environment, EnvironmentVariable>> {
    return this.variables;
  }

  /**
   * Set current environment
   */
  setEnvironment(environment: Environment): void {
    this.currentEnvironment = environment;
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * Import variables from object
   */
  import(variables: Record<string, string>, environment?: Environment): void {
    for (const [key, value] of Object.entries(variables)) {
      this.set(key, value, { environment });
    }
  }

  /**
   * Export variables as object
   */
  export(environment?: Environment): Record<string, string> {
    const env = environment || this.currentEnvironment;
    const result: Record<string, string> = {};

    for (const [key, envVars] of this.variables.entries()) {
      const variable = envVars.get(env);
      if (variable) {
        result[key] = variable.encrypted ? this.decrypt(variable.value) : variable.value;
      }
    }

    return result;
  }

  /**
   * Import from .env format
   */
  importEnvFile(content: string, environment?: Environment): void {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        this.set(key, value, { environment });
      }
    }
  }

  /**
   * Export to .env format
   */
  exportEnvFile(environment?: Environment): string {
    const env = environment || this.currentEnvironment;
    const lines: string[] = [
      `# Environment: ${env}`,
      `# Generated: ${new Date().toISOString()}`,
      ''
    ];

    for (const [key, envVars] of this.variables.entries()) {
      const variable = envVars.get(env);
      if (variable) {
        if (variable.description) {
          lines.push(`# ${variable.description}`);
        }

        const value = variable.encrypted ? this.decrypt(variable.value) : variable.value;
        const quotedValue = value.includes(' ') || value.includes('#') ? `"${value}"` : value;

        lines.push(`${key}=${quotedValue}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): void {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        this.currentEnvironment = 'development';
      } else if (hostname.includes('staging')) {
        this.currentEnvironment = 'staging';
      } else {
        this.currentEnvironment = 'production';
      }
    }

    // Override with environment variable if set
    const envVar = import.meta.env.VITE_APP_ENV as Environment;
    if (envVar) {
      this.currentEnvironment = envVar;
    }
  }

  /**
   * Simple encryption (in production, use proper encryption)
   */
  private encrypt(value: string): string {
    // Simplified encryption - in production use crypto.subtle or similar
    return btoa(value);
  }

  /**
   * Simple decryption
   */
  private decrypt(value: string): string {
    // Simplified decryption
    try {
      return atob(value);
    } catch {
      return value;
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('environment_variables');
      if (stored) {
        const data = JSON.parse(stored);
        this.variables = new Map(
          Object.entries(data).map(([key, envMap]: [string, any]) => [
            key,
            new Map(Object.entries(envMap))
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load environment variables:', error);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data: Record<string, Record<Environment, EnvironmentVariable>> = {};

      for (const [key, envMap] of this.variables.entries()) {
        data[key] = Object.fromEntries(envMap) as Record<Environment, EnvironmentVariable>;
      }

      localStorage.setItem('environment_variables', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save environment variables:', error);
    }
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.variables.clear();
    this.saveToStorage();
  }
}

// Singleton instance
export const envManager = new EnvironmentVariablesManager();

/**
 * Shorthand function to get environment variable
 */
export function env(key: string, defaultValue?: string): string {
  return envManager.get(key) || defaultValue || '';
}

/**
 * Common environment variables
 */
export const CommonEnvVars = {
  // API
  API_BASE_URL: 'API_BASE_URL',
  API_KEY: 'API_KEY',
  API_SECRET: 'API_SECRET',

  // Database
  DATABASE_URL: 'DATABASE_URL',
  DATABASE_NAME: 'DATABASE_NAME',

  // Authentication
  AUTH_SECRET: 'AUTH_SECRET',
  JWT_SECRET: 'JWT_SECRET',
  OAUTH_CLIENT_ID: 'OAUTH_CLIENT_ID',
  OAUTH_CLIENT_SECRET: 'OAUTH_CLIENT_SECRET',

  // External services
  SMTP_HOST: 'SMTP_HOST',
  SMTP_PORT: 'SMTP_PORT',
  SMTP_USER: 'SMTP_USER',
  SMTP_PASSWORD: 'SMTP_PASSWORD',

  REDIS_URL: 'REDIS_URL',
  RABBITMQ_URL: 'RABBITMQ_URL',

  // Cloud providers
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_REGION: 'AWS_REGION',

  // Monitoring
  SENTRY_DSN: 'SENTRY_DSN',
  ANALYTICS_KEY: 'ANALYTICS_KEY'
};

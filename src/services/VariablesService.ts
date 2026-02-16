/**
 * Variables and Environment Service
 * Manages workflow variables, environments, and secrets
 */

import { BaseService } from './BaseService';
import { logger } from './SimpleLogger';
import type {
  WorkflowVariable,
  Environment,
  VariableContext,
  Variable,
  VariableSuggestion,
  ValidationResult,
  Secret,
  VariableGroup,
  VariableHistory,
  VariableUsage,
  VariableExport,
  EnvironmentSync,
  VariableFilters,
  VariablesService as IVariablesService,
  VariableType,
  VariableScope
} from '../types/variables';

export class VariablesService extends BaseService implements IVariablesService {
  private static instance: VariablesService;
  protected logger = logger;
  private variables: Map<string, WorkflowVariable> = new Map();
  private environments: Map<string, Environment> = new Map();
  private secrets: Map<string, Secret> = new Map();
  private groups: Map<string, VariableGroup> = new Map();
  private history: VariableHistory[] = [];
  private usage: Map<string, VariableUsage[]> = new Map();
  private syncs: Map<string, EnvironmentSync> = new Map();
  private defaultEnvironmentId: string = 'default';

  private constructor() {
    super('VariablesService');
    this.initializeDefaults();
  }

  static getInstance(): VariablesService {
    if (!VariablesService.instance) {
      VariablesService.instance = new VariablesService();
    }
    return VariablesService.instance;
  }

  private initializeDefaults() {
    // Create default environment
    const defaultEnv: Environment = {
      id: 'default',
      name: 'Default',
      description: 'Default environment',
      isDefault: true,
      variables: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
    this.environments.set(defaultEnv.id, defaultEnv);

    // Create common global variables
    const commonVariables: Omit<WorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'BASE_URL',
        value: typeof (globalThis as any).window !== 'undefined' && typeof (globalThis as any).window.location !== 'undefined'
          ? (globalThis as any).window.location.origin
          : 'http://localhost:3000',
        type: 'string',
        scope: 'global',
        description: 'Base URL of the application',
        createdBy: 'system'
      },
      {
        name: 'API_TIMEOUT',
        value: 30000,
        type: 'number',
        scope: 'global',
        description: 'Default API timeout in milliseconds',
        createdBy: 'system'
      },
      {
        name: 'DEBUG_MODE',
        value: false,
        type: 'boolean',
        scope: 'global',
        description: 'Enable debug mode',
        createdBy: 'system'
      },
      {
        name: 'TIMEZONE',
        value: Intl.DateTimeFormat().resolvedOptions().timeZone,
        type: 'string',
        scope: 'global',
        description: 'System timezone',
        createdBy: 'system'
      }
    ];

    commonVariables.forEach(varData => {
      const variable: WorkflowVariable = {
        ...varData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.variables.set(variable.id, variable);
    });
  }

  async createVariable(
    variable: Omit<WorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WorkflowVariable> {
    this.logger.info('Creating variable', { name: variable.name, scope: variable.scope });

    // Validate variable name
    if (!this.isValidVariableName(variable.name)) {
      throw new Error('Invalid variable name. Use only letters, numbers, and underscores.');
    }

    // Check for duplicates
    const existing = Array.from(this.variables.values()).find(
      v => v.name === variable.name && v.scope === variable.scope
    );
    if (existing) {
      throw new Error(`Variable ${variable.name} already exists in scope ${variable.scope}`);
    }

    const newVariable: WorkflowVariable = {
      ...variable,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Encrypt if marked as secret
    if (variable.type === 'secret' || variable.encrypted) {
      newVariable.value = await this.encryptValue(newVariable.value);
      newVariable.encrypted = true;
    }

    this.variables.set(newVariable.id, newVariable);
    
    // Track history
    this.addHistory({
      variableId: newVariable.id,
      previousValue: null,
      newValue: newVariable.value,
      changedBy: newVariable.createdBy,
      changedAt: new Date(),
      reason: 'Variable created'
    });

    return newVariable;
  }

  async updateVariable(id: string, updates: Partial<WorkflowVariable>): Promise<void> {
    const variable = this.variables.get(id);
    if (!variable) {
      throw new Error(`Variable ${id} not found`);
    }

    const previousValue = variable.value;
    const updatedVariable: WorkflowVariable = {
      ...variable,
      ...updates,
      id: variable.id, // Prevent ID change
      createdAt: variable.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

    // Handle encryption
    if (updatedVariable.type === 'secret' || updatedVariable.encrypted) {
      if (updates.value !== undefined && updates.value !== previousValue) {
        updatedVariable.value = await this.encryptValue(updates.value);
      }
    }

    this.variables.set(id, updatedVariable);

    // Track history
    if (updates.value !== undefined && updates.value !== previousValue) {
      this.addHistory({
        variableId: id,
        previousValue,
        newValue: updates.value,
        changedBy: updates.createdBy || 'unknown',
        changedAt: new Date(),
        reason: 'Variable updated'
      });
    }
  }

  async deleteVariable(id: string): Promise<void> {
    const variable = this.variables.get(id);
    if (!variable) {
      throw new Error(`Variable ${id} not found`);
    }

    // Check usage
    const usage = this.usage.get(id) || [];
    if (usage.length > 0) {
      throw new Error(`Cannot delete variable. It is used in ${usage.length} workflows.`);
    }

    this.variables.delete(id);

    // Remove from groups
    this.groups.forEach(group => {
      group.variables = group.variables.filter(v => v !== id);
    });
  }

  async getVariable(id: string): Promise<WorkflowVariable | null> {
    return this.variables.get(id) || null;
  }

  async listVariables(filters?: VariableFilters): Promise<WorkflowVariable[]> {
    let variables = Array.from(this.variables.values());

    if (filters) {
      if (filters.scope?.length) {
        variables = variables.filter(v => filters.scope!.includes(v.scope));
      }
      if (filters.type?.length) {
        variables = variables.filter(v => filters.type!.includes(v.type));
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        variables = variables.filter(v =>
          v.name.toLowerCase().includes(search) ||
          v.description?.toLowerCase().includes(search)
        );
      }
      if (!filters.includeSecrets) {
        variables = variables.filter(v => v.type !== 'secret' && !v.encrypted);
      }
    }

    return variables;
  }

  async createEnvironment(
    environment: Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Environment> {
    this.logger.info('Creating environment', { name: environment.name });

    const newEnvironment: Environment = {
      ...environment,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // If this is the only environment or marked as default, make it default
    if (environment.isDefault || this.environments.size === 0) {
      // Remove default from others
      this.environments.forEach(env => {
        env.isDefault = false;
      });
      newEnvironment.isDefault = true;
      this.defaultEnvironmentId = newEnvironment.id;
    }

    this.environments.set(newEnvironment.id, newEnvironment);
    return newEnvironment;
  }

  async updateEnvironment(id: string, updates: Partial<Environment>): Promise<void> {
    const environment = this.environments.get(id);
    if (!environment) {
      throw new Error(`Environment ${id} not found`);
    }

    const updatedEnvironment: Environment = {
      ...environment,
      ...updates,
      id: environment.id,
      createdAt: environment.createdAt,
      updatedAt: new Date()
    };

    if (updates.isDefault) {
      // Remove default from others
      this.environments.forEach(env => {
        env.isDefault = false;
      });
      updatedEnvironment.isDefault = true;
      this.defaultEnvironmentId = id;
    }

    this.environments.set(id, updatedEnvironment);
  }

  async deleteEnvironment(id: string): Promise<void> {
    const environment = this.environments.get(id);
    if (!environment) {
      throw new Error(`Environment ${id} not found`);
    }

    if (environment.isDefault) {
      throw new Error('Cannot delete default environment');
    }

    this.environments.delete(id);
  }

  async getEnvironment(id: string): Promise<Environment | null> {
    return this.environments.get(id) || null;
  }

  async listEnvironments(): Promise<Environment[]> {
    return Array.from(this.environments.values());
  }

  async setDefaultEnvironment(id: string): Promise<void> {
    const environment = this.environments.get(id);
    if (!environment) {
      throw new Error(`Environment ${id} not found`);
    }

    this.environments.forEach(env => {
      env.isDefault = false;
    });

    environment.isDefault = true;
    this.defaultEnvironmentId = id;
  }

  async resolveVariable(name: string, context: VariableContext): Promise<unknown> {
    this.logger.debug('Resolving variable', { name, context });

    // Check additional variables first
    if (context.additionalVariables && name in context.additionalVariables) {
      return context.additionalVariables[name];
    }

    // Find variable by name and scope
    // Priority order: workflow > environment > user > team > global
    const scopePriority: VariableScope[] = ['workflow', 'environment', 'user', 'team', 'global'];

    for (const scope of scopePriority) {
      const variable = Array.from(this.variables.values()).find(v => v.name === name && v.scope === scope);
      if (variable) {
        // Check scope-specific conditions
        if (scope === 'workflow' && variable.id !== context.workflowId) continue;
        if (scope === 'user' && variable.createdBy !== context.user) continue;
        if (scope === 'team' && variable.createdBy !== context.team) continue;

        // Check environment-specific overrides
        const environment = this.environments.get(context.environment || this.defaultEnvironmentId);
        if (environment) {
          const envVar = environment.variables.find(v => v.variableId === variable.id);
          if (envVar) {
            return envVar.value;
          }
        }

        // Decrypt if needed
        if (variable.encrypted) {
          return await this.decryptValue(String(variable.value));
        }

        return variable.value;
      }
    }

    // Check system variables
    const systemVars = this.getSystemVariables(context);
    if (name in systemVars) {
      return systemVars[name];
    }

    throw new Error(`Variable ${name} not found`);
  }

  async resolveExpression(expression: string, context: VariableContext): Promise<unknown> {
    this.logger.debug('Resolving expression', { expression, context });

    // Simple variable reference: {{variableName}}
    const simpleVarMatch = expression.match(/^\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}$/);
    if (simpleVarMatch) {
      return this.resolveVariable(simpleVarMatch[1], context);
    }

    // Complex expression with multiple variables
    let resolved = expression;
    const varMatches = Array.from(expression.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g));
    for (const match of varMatches) {
      const varName = match[1];
      try {
        const value = await this.resolveVariable(varName, context);
        resolved = resolved.replace(match[0], String(value));
      } catch (error) {
        this.logger.warn('Failed to resolve variable in expression', { varName, error });
      }
    }

    // If it's a JavaScript expression, evaluate it safely
    if (expression.includes('${') || expression.includes('return')) {
      try {
        const vars = Array.from(this.variables.values());
        const varObj: Record<string, unknown> = {};
        for (const v of vars) {
          varObj[v.name] = v.value;
        }

        // SECURITY: Use safe expression evaluation instead of Function constructor
        // to prevent code injection attacks
        const safeResult = this.safeEvaluateExpression(expression, varObj);
        return safeResult;
      } catch (error) {
        this.logger.error('Failed to evaluate expression', { expression, error });
        throw new Error('Invalid expression');
      }
    }

    return resolved;
  }

  validateExpression(expression: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      usedVariables: []
    };

    // Extract variable references
    const varMatches = Array.from(expression.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g));
    for (const match of varMatches) {
      result.usedVariables.push(match[1]);
    }

    // Check for syntax errors
    const openBrackets = (expression.match(/\{\{/g) || []).length;
    const closeBrackets = (expression.match(/\}\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      result.valid = false;
      result.errors.push({
        position: 0,
        message: 'Mismatched brackets',
        suggestion: 'Ensure all {{ have matching }}'
      });
    }

    // Check for invalid variable names
    result.usedVariables.forEach((varName) => {
      // index parameter not needed
      if (!this.isValidVariableName(varName)) {
        result.valid = false;
        result.errors.push({
          position: expression.indexOf(varName),
          message: `Invalid variable name: ${varName}`,
          suggestion: 'Use only letters, numbers, and underscores'
        });
      }
    });

    return result;
  }

  async getAvailableVariables(context: VariableContext): Promise<Variable[]> {
    const available: Variable[] = [];
    const variables = Array.from(this.variables.values());

    for (const variable of variables) {
      // Check if variable is accessible in context
      if (this.isVariableAccessible(variable, context)) {
        const value = variable.encrypted ? await this.decryptValue(String(variable.value)) : variable.value;
        available.push({
          id: variable.id,
          name: variable.name,
          value,
          type: variable.type,
          scope: variable.scope,
          description: variable.description,
          createdAt: variable.createdAt,
          updatedAt: variable.updatedAt,
          createdBy: variable.createdBy,
          source: `${variable.scope}:${variable.id}`
        });
      }
    }

    // Add system variables
    const systemVars = this.getSystemVariables(context);
    Object.entries(systemVars).forEach(([name, value]) => {
      const now = new Date();
      available.push({
        id: `system:${name}`,
        name,
        value,
        type: this.detectType(value),
        scope: 'global',
        description: `System variable: ${name}`,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        source: 'system'
      });
    });

    return available;
  }

  async getSuggestions(partial: string, context: VariableContext): Promise<VariableSuggestion[]> {
    const suggestions: VariableSuggestion[] = [];
    const available = await this.getAvailableVariables(context);

    for (const variable of available) {
      const score = this.calculateSuggestionScore(variable.name, partial.toLowerCase());
      if (score > 0) {
        suggestions.push({
          name: variable.name,
          type: variable.type,
          description: variable.description,
          example: `{{${variable.name}}}`,
          category: variable.scope,
          score
        });
      }
    }

    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 10); // Return top 10
  }

  async createSecret(
    secret: Omit<Secret, 'id' | 'lastSynced' | 'status'>
  ): Promise<Secret> {
    const newSecret: Secret = {
      ...secret,
      id: this.generateId(),
      status: 'active',
      lastSynced: new Date()
    };

    this.secrets.set(newSecret.id, newSecret);
    
    // Create corresponding variable
    await this.createVariable({
      name: secret.name,
      value: secret.reference,
      type: 'secret',
      scope: 'global',
      description: `Secret from ${secret.provider}`,
      encrypted: true,
      createdBy: 'system'
    });

    return newSecret;
  }

  async syncSecret(id: string): Promise<void> {
    const secret = this.secrets.get(id);
    if (!secret) {
      throw new Error(`Secret ${id} not found`);
    }

    // Simulate secret sync based on provider
    this.logger.info('Syncing secret', { id, provider: secret.provider });

    // In real implementation, this would connect to external secret providers
    secret.lastSynced = new Date();
    secret.status = 'active';
  }

  async rotateSecret(id: string): Promise<void> {
    const secret = this.secrets.get(id);
    if (!secret) {
      throw new Error(`Secret ${id} not found`);
    }

    this.logger.info('Rotating secret', { id });

    // In real implementation, this would trigger secret rotation
    // Update the reference and sync
    secret.reference = `${secret.reference}-rotated-${Date.now()}`;
    await this.syncSecret(id);
  }

  async createVariableGroup(
    group: Omit<VariableGroup, 'id'>
  ): Promise<VariableGroup> {
    const newGroup: VariableGroup = {
      ...group,
      id: this.generateId()
    };

    // Validate all variables exist
    for (const varId of group.variables) {
      if (!this.variables.has(varId)) {
        throw new Error(`Variable ${varId} not found`);
      }
    }

    this.groups.set(newGroup.id, newGroup);
    return newGroup;
  }

  async applyTemplate(templateId: string, targetScope: VariableScope): Promise<WorkflowVariable[]> {
    // In real implementation, this would load templates
    const createdVariables: WorkflowVariable[] = [];

    // Example template application
    const templateVars = [
      { name: 'API_KEY', type: 'secret' as VariableType, value: '' },
      { name: 'API_URL', type: 'string' as VariableType, value: 'https://api.example.com' },
      { name: 'RETRY_COUNT', type: 'number' as VariableType, value: 3 }
    ];

    for (const varDef of templateVars) {
      const variable = await this.createVariable({
        ...varDef,
        scope: targetScope,
        description: `From template ${templateId}`,
        createdBy: 'template'
      });
      createdVariables.push(variable);
    }

    return createdVariables;
  }

  async getVariableHistory(variableId: string): Promise<VariableHistory[]> {
    return this.history.filter(h => h.variableId === variableId);
  }

  async getVariableUsage(variableId: string): Promise<VariableUsage[]> {
    return this.usage.get(variableId) || [];
  }

  async exportVariables(environmentId?: string): Promise<VariableExport> {
    const environment = environmentId ? this.environments.get(environmentId) : undefined;
    const variables = environmentId
      ? Array.from(this.variables.values()).filter(v =>
          environment?.variables.some(ev => ev.variableId === v.id)
        )
      : Array.from(this.variables.values());

    const exportData: VariableExport = {
      version: '1.0.0',
      exportedAt: new Date(),
      environment: environment?.name,
      variables: variables.map(v => ({
        name: v.name,
        type: v.type,
        scope: v.scope,
        value: v.encrypted ? undefined : v.value, // Don't export encrypted values
        description: v.description,
        encrypted: v.encrypted || false
      })),
      groups: Array.from(this.groups.values()),
      templates: [] // Would include templates in real implementation
    };

    return exportData;
  }

  async importVariables(data: VariableExport, targetEnvironment?: string): Promise<void> {
    this.logger.info('Importing variables', {
      variableCount: data.variables.length,
      targetEnvironment
    });

    for (const varData of data.variables) {
      try {
        // Check if variable already exists
        const existing = Array.from(this.variables.values()).find(
          v => v.name === varData.name && v.scope === varData.scope
        );

        if (existing) {
          // Update existing variable
          await this.updateVariable(existing.id, {
            value: varData.value as string | number | boolean | object | undefined,
            description: varData.description
          });
        } else {
          // Create new variable
          await this.createVariable({
            name: varData.name,
            value: (varData.value as string | number | boolean | object) || '',
            type: varData.type,
            scope: varData.scope,
            description: varData.description,
            encrypted: varData.encrypted,
            createdBy: 'import'
          });
        }
      } catch (error) {
        this.logger.error('Failed to import variable', {
          variable: varData.name,
          error
        });
      }
    }
  }

  async createEnvironmentSync(
    sync: Omit<EnvironmentSync, 'id' | 'lastSync' | 'status'>
  ): Promise<EnvironmentSync> {
    const newSync: EnvironmentSync = {
      ...sync,
      id: this.generateId(),
      status: 'active',
      lastSync: undefined
    };

    this.syncs.set(newSync.id, newSync);
    
    // Schedule if automatic
    if (sync.syncType === 'automatic' || sync.syncType === 'scheduled') {
      // Would set up scheduling in real implementation
    }

    return newSync;
  }

  async syncEnvironments(syncId: string): Promise<void> {
    const sync = this.syncs.get(syncId);
    if (!sync) {
      throw new Error(`Sync ${syncId} not found`);
    }

    this.logger.info('Syncing environments', { syncId });

    try {
      const sourceEnv = this.environments.get(sync.sourceEnvironment);
      if (!sourceEnv) {
        throw new Error('Source environment not found');
      }

      for (const targetEnvId of sync.targetEnvironments) {
        const targetEnv = this.environments.get(targetEnvId);
        if (!targetEnv) continue;

        // Copy variables
        for (const envVar of sourceEnv.variables) {
          const variable = this.variables.get(envVar.variableId);
          if (!variable) continue;

          // Apply filters
          if (sync.variableFilters && !sync.variableFilters.includes(variable.name)) {
            continue;
          }

          // Skip secrets if not included
          if (!sync.includeSecrets && (variable.type === 'secret' || variable.encrypted)) {
            continue;
          }

          // Update target environment
          const existingIndex = targetEnv.variables.findIndex(
            v => v.variableId === envVar.variableId
          );

          if (existingIndex >= 0) {
            targetEnv.variables[existingIndex] = { ...envVar };
          } else {
            targetEnv.variables.push({ ...envVar });
          }
        }

        await this.updateEnvironment(targetEnvId, targetEnv);
      }

      sync.lastSync = new Date();
      sync.status = 'active';
    } catch (error) {
      sync.status = 'error';
      throw error;
    }
  }

  // Private helper methods
  private isValidVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private isVariableAccessible(variable: WorkflowVariable, context: VariableContext): boolean {
    switch (variable.scope) {
      case 'global':
        return true;
      case 'workflow':
        return variable.id === context.workflowId;
      case 'user':
        return variable.createdBy === context.user;
      case 'team':
        return variable.createdBy === context.team;
      case 'environment': {
        // Check if variable is in current environment
        const env = this.environments.get(context.environment || this.defaultEnvironmentId);
        return env ? env.variables.some(v => v.variableId === variable.id) : false;
      }
      default:
        return false;
    }
  }

  private getSystemVariables(context: VariableContext): Record<string, unknown> {
    const now = new Date();
    return {
      $now: now.toISOString(),
      $timestamp: now.getTime(),
      $date: now.toDateString(),
      $time: now.toTimeString(),
      $workflowId: context.workflowId,
      $executionId: context.executionId || null,
      $nodeId: context.nodeId || null,
      $environment: context.environment,
      $user: context.user,
      $random: Math.random(),
      $uuid: this.generateId()
    };
  }

  private detectType(value: unknown): VariableType {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    return 'json';
  }

  private calculateSuggestionScore(name: string, searchTerm: string): number {
    const nameLower = name.toLowerCase();

    // Exact match
    if (nameLower === searchTerm) return 100;

    // Starts with
    if (nameLower.startsWith(searchTerm)) return 80;

    // Contains
    if (nameLower.includes(searchTerm)) return 60;

    // Fuzzy match
    let score = 0;
    let searchIndex = 0;
    for (let i = 0; i < nameLower.length && searchIndex < searchTerm.length; i++) {
      if (nameLower[i] === searchTerm[searchIndex]) {
        score += 10;
        searchIndex++;
      }
    }

    return searchIndex === searchTerm.length ? score : 0;
  }

  /**
   * SECURITY: Safe expression evaluation without using Function constructor
   * Uses a whitelist approach with simple math and string operations only
   */
  private safeEvaluateExpression(expression: string, variables: Record<string, unknown>): unknown {
    // Remove 'return' if present
    const expr = expression.replace(/^return\s+/, '').trim();

    // Handle template literals ${...}
    if (expr.includes('${')) {
      return expr.replace(/\$\{([^}]+)\}/g, (_, key) => {
        const trimmedKey = key.trim();
        if (trimmedKey in variables) {
          return String(variables[trimmedKey]);
        }
        return '';
      });
    }

    // Simple variable reference
    if (expr in variables) {
      return variables[expr];
    }

    // Simple math operations (safe)
    const mathMatch = expr.match(/^(\w+)\s*([+\-*/])\s*(\w+|\d+(?:\.\d+)?)$/);
    if (mathMatch) {
      const [, left, op, right] = mathMatch;
      const leftVal = left in variables ? Number(variables[left]) : Number(left);
      const rightVal = right in variables ? Number(variables[right]) : Number(right);

      if (!isNaN(leftVal) && !isNaN(rightVal)) {
        switch (op) {
          case '+': return leftVal + rightVal;
          case '-': return leftVal - rightVal;
          case '*': return leftVal * rightVal;
          case '/': return rightVal !== 0 ? leftVal / rightVal : 0;
        }
      }
    }

    // String concatenation with +
    const concatMatch = expr.match(/^['"]([^'"]*)['"]\s*\+\s*(\w+)$/);
    if (concatMatch) {
      const [, str, varName] = concatMatch;
      if (varName in variables) {
        return str + String(variables[varName]);
      }
    }

    // Return expression as-is if no pattern matches
    return expr;
  }

  // Encryption key - in production, this should come from environment/secrets manager
  private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'workflow-default-key-change-in-prod';

  private async encryptValue(value: unknown): Promise<string> {
    // Use AES-256-GCM encryption via Web Crypto API or fallback
    const jsonValue = JSON.stringify(value);

    try {
      // Generate a random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonValue);

      // Create key from password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.encryptionKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('workflow-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      // Combine IV and encrypted data, then base64 encode
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...Array.from(combined)));
    } catch {
      // Fallback for environments without Web Crypto API
      // Use a simple XOR cipher (not secure, but better than plain base64)
      const keyBytes = this.encryptionKey.split('').map(c => c.charCodeAt(0));
      const encrypted = jsonValue.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ keyBytes[i % keyBytes.length])
      ).join('');
      return 'xor:' + btoa(encrypted);
    }
  }

  private async decryptValue(encrypted: string): Promise<unknown> {
    try {
      // Check for XOR fallback format
      if (encrypted.startsWith('xor:')) {
        const keyBytes = this.encryptionKey.split('').map(c => c.charCodeAt(0));
        const decoded = atob(encrypted.substring(4));
        const decrypted = decoded.split('').map((c, i) =>
          String.fromCharCode(c.charCodeAt(0) ^ keyBytes[i % keyBytes.length])
        ).join('');
        return JSON.parse(decrypted);
      }

      const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.encryptionKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('workflow-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch {
      // If decryption fails, try parsing as plain JSON (backward compatibility)
      try {
        return JSON.parse(atob(encrypted));
      } catch {
        return encrypted;
      }
    }
  }

  private addHistory(entry: Omit<VariableHistory, 'id'>): void {
    const historyEntry: VariableHistory = {
      ...entry,
      id: this.generateId()
    };
    this.history.push(historyEntry);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
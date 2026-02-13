/**
 * Global Variables System
 * Manage shared variables across workflows with encryption and versioning
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Types
export interface GlobalVariable {
  id: string;
  key: string;
  value: any;
  type: VariableType;
  scope: VariableScope;
  description?: string;
  encrypted?: boolean;
  metadata?: VariableMetadata;
  permissions?: VariablePermissions;
  validation?: VariableValidation;
  history?: VariableHistory[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type VariableType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'json' 
  | 'array' 
  | 'date' 
  | 'secret' 
  | 'credential'
  | 'expression'
  | 'template';

export type VariableScope = 
  | 'global' 
  | 'workspace' 
  | 'project' 
  | 'workflow' 
  | 'user' 
  | 'team'
  | 'environment';

export interface VariableMetadata {
  version: number;
  locked?: boolean;
  deprecated?: boolean;
  deprecationMessage?: string;
  expiresAt?: Date;
  ttl?: number;
  source?: string;
  references?: string[];
  dependencies?: string[];
}

export interface VariablePermissions {
  read: string[];
  write: string[];
  delete: string[];
  admin: string[];
  inherit?: boolean;
}

export interface VariableValidation {
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface VariableHistory {
  id: string;
  variableId: string;
  previousValue: any;
  newValue: any;
  changedBy: string;
  changedAt: Date;
  reason?: string;
  metadata?: any;
}

export interface VariableGroup {
  id: string;
  name: string;
  description?: string;
  variables: string[];
  scope: VariableScope;
  permissions?: VariablePermissions;
  metadata?: any;
}

export interface VariableEnvironment {
  id: string;
  name: string;
  description?: string;
  variables: Map<string, any>;
  parent?: string;
  active: boolean;
  priority: number;
}

export interface VariableQuery {
  key?: string | RegExp;
  type?: VariableType | VariableType[];
  scope?: VariableScope | VariableScope[];
  tags?: string[];
  encrypted?: boolean;
  locked?: boolean;
  deprecated?: boolean;
  createdBy?: string;
  updatedAfter?: Date;
  updatedBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: VariableSortOptions;
}

export interface VariableSortOptions {
  field: 'key' | 'type' | 'scope' | 'createdAt' | 'updatedAt';
  order: 'asc' | 'desc';
}

export interface VariableImportOptions {
  overwrite?: boolean;
  merge?: boolean;
  validate?: boolean;
  encrypt?: boolean;
  scope?: VariableScope;
  prefix?: string;
  transform?: (variable: GlobalVariable) => GlobalVariable;
}

export interface VariableExportOptions {
  decrypt?: boolean;
  includeHistory?: boolean;
  includeMetadata?: boolean;
  filter?: (variable: GlobalVariable) => boolean;
  format?: 'json' | 'yaml' | 'env' | 'ini';
}

export interface VariableReference {
  variableId: string;
  workflowId?: string;
  nodeId?: string;
  field?: string;
  type: 'read' | 'write';
  lastAccessed: Date;
}

export interface VariableTemplate {
  id: string;
  name: string;
  description?: string;
  variables: VariableDefinition[];
  category?: string;
  tags?: string[];
}

export interface VariableDefinition {
  key: string;
  type: VariableType;
  defaultValue?: any;
  required?: boolean;
  description?: string;
  validation?: VariableValidation;
}

export interface VariableChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'locked' | 'unlocked';
  variable: GlobalVariable;
  previousValue?: any;
  userId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface VariableAccessLog {
  id: string;
  variableId: string;
  userId: string;
  action: 'read' | 'write' | 'delete';
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export interface VariableEncryption {
  algorithm: string;
  keyId: string;
  iv?: string;
  authTag?: string;
  metadata?: any;
}

export interface VariableCache {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

// Main System Class
export class GlobalVariablesSystem extends EventEmitter {
  private static instance: GlobalVariablesSystem;
  private variables: Map<string, GlobalVariable> = new Map();
  private groups: Map<string, VariableGroup> = new Map();
  private environments: Map<string, VariableEnvironment> = new Map();
  private templates: Map<string, VariableTemplate> = new Map();
  private references: Map<string, Set<VariableReference>> = new Map();
  private accessLogs: VariableAccessLog[] = [];
  private cache: VariableCache;
  private encryptionKey?: Buffer;
  private currentEnvironment?: string;
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly MAX_ACCESS_LOGS = 10000;

  private constructor() {
    super();
    this.cache = new InMemoryVariableCache();
    this.initializeDefaultEnvironments();
    this.initializeDefaultTemplates();
    this.startCleanupScheduler();
  }

  public static getInstance(): GlobalVariablesSystem {
    if (!GlobalVariablesSystem.instance) {
      GlobalVariablesSystem.instance = new GlobalVariablesSystem();
    }
    return GlobalVariablesSystem.instance;
  }

  // Variable Management
  public async createVariable(
    key: string,
    value: any,
    options: Partial<GlobalVariable> = {}
  ): Promise<GlobalVariable> {
    try {
      // Check if variable exists
      if (this.variables.has(key)) {
        throw new Error(`Variable with key "${key}" already exists`);
      }

      // Validate variable
      if (options.validation) {
        const validationResult = this.validateValue(value, options.validation);
        if (validationResult !== true) {
          throw new Error(`Validation failed: ${validationResult}`);
        }
      }

      // Encrypt if needed
      let processedValue = value;
      if (options.encrypted || options.type === 'secret') {
        processedValue = await this.encryptValue(value);
      }

      // Create variable
      const variable: GlobalVariable = {
        id: this.generateId(),
        key,
        value: processedValue,
        type: options.type || this.detectType(value),
        scope: options.scope || 'global',
        description: options.description,
        encrypted: options.encrypted || options.type === 'secret',
        metadata: options.metadata || { version: 1 },
        permissions: options.permissions,
        validation: options.validation,
        history: [],
        tags: options.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: options.createdBy,
        updatedBy: options.updatedBy
      };

      // Store variable
      this.variables.set(key, variable);
      
      // Update cache
      this.cache.set(key, value, variable.metadata?.ttl);

      // Emit event
      this.emit('variable:created', {
        type: 'created',
        variable,
        userId: options.createdBy,
        timestamp: new Date()
      } as VariableChangeEvent);

      // Log access
      this.logAccess({
        variableId: variable.id,
        userId: options.createdBy || 'system',
        action: 'write',
        success: true
      });

      return variable;
    } catch (error) {
      this.emit('variable:error', { action: 'create', key, error });
      throw error;
    }
  }

  public async updateVariable(
    key: string,
    value: any,
    options: { userId?: string; reason?: string } = {}
  ): Promise<GlobalVariable> {
    try {
      const variable = this.variables.get(key);
      if (!variable) {
        throw new Error(`Variable with key "${key}" not found`);
      }

      // Check if locked
      if (variable.metadata?.locked) {
        throw new Error(`Variable "${key}" is locked and cannot be updated`);
      }

      // Check permissions
      if (!this.hasPermission(variable, 'write', options.userId)) {
        throw new Error(`No permission to update variable "${key}"`);
      }

      // Validate new value
      if (variable.validation) {
        const validationResult = this.validateValue(value, variable.validation);
        if (validationResult !== true) {
          throw new Error(`Validation failed: ${validationResult}`);
        }
      }

      // Store history
      if (!variable.history) variable.history = [];
      variable.history.push({
        id: this.generateId(),
        variableId: variable.id,
        previousValue: variable.value,
        newValue: value,
        changedBy: options.userId || 'system',
        changedAt: new Date(),
        reason: options.reason
      });

      // Limit history size
      if (variable.history.length > this.MAX_HISTORY_SIZE) {
        variable.history = variable.history.slice(-this.MAX_HISTORY_SIZE);
      }

      // Encrypt if needed
      let processedValue = value;
      if (variable.encrypted) {
        processedValue = await this.encryptValue(value);
      }

      // Update variable
      const previousValue = variable.value;
      variable.value = processedValue;
      variable.updatedAt = new Date();
      variable.updatedBy = options.userId;
      if (variable.metadata) {
        variable.metadata.version = (variable.metadata.version || 1) + 1;
      }

      // Update cache
      this.cache.set(key, value, variable.metadata?.ttl);

      // Emit event
      this.emit('variable:updated', {
        type: 'updated',
        variable,
        previousValue,
        userId: options.userId,
        timestamp: new Date()
      } as VariableChangeEvent);

      // Log access
      this.logAccess({
        variableId: variable.id,
        userId: options.userId || 'system',
        action: 'write',
        success: true
      });

      return variable;
    } catch (error) {
      this.emit('variable:error', { action: 'update', key, error });
      throw error;
    }
  }

  public async getVariable(
    key: string,
    options: { userId?: string; decrypt?: boolean } = {}
  ): Promise<any> {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const variable = this.variables.get(key);
      if (!variable) {
        throw new Error(`Variable with key "${key}" not found`);
      }

      // Check permissions
      if (!this.hasPermission(variable, 'read', options.userId)) {
        throw new Error(`No permission to read variable "${key}"`);
      }

      // Check if expired
      if (variable.metadata?.expiresAt && new Date() > variable.metadata.expiresAt) {
        throw new Error(`Variable "${key}" has expired`);
      }

      // Decrypt if needed
      let value = variable.value;
      if (variable.encrypted && options.decrypt !== false) {
        value = await this.decryptValue(value);
      }

      // Process expression type
      if (variable.type === 'expression') {
        value = await this.evaluateExpression(value, options);
      }

      // Process template type
      if (variable.type === 'template') {
        value = await this.processTemplate(value, options);
      }

      // Update cache
      this.cache.set(key, value, variable.metadata?.ttl);

      // Log access
      this.logAccess({
        variableId: variable.id,
        userId: options.userId || 'system',
        action: 'read',
        success: true
      });

      return value;
    } catch (error) {
      this.emit('variable:error', { action: 'get', key, error });
      throw error;
    }
  }

  public async deleteVariable(
    key: string,
    options: { userId?: string } = {}
  ): Promise<void> {
    try {
      const variable = this.variables.get(key);
      if (!variable) {
        throw new Error(`Variable with key "${key}" not found`);
      }

      // Check if locked
      if (variable.metadata?.locked) {
        throw new Error(`Variable "${key}" is locked and cannot be deleted`);
      }

      // Check permissions
      if (!this.hasPermission(variable, 'delete', options.userId)) {
        throw new Error(`No permission to delete variable "${key}"`);
      }

      // Check references
      const references = this.references.get(variable.id);
      if (references && references.size > 0) {
        throw new Error(`Variable "${key}" is referenced by ${references.size} workflows`);
      }

      // Delete from storage
      this.variables.delete(key);
      this.cache.delete(key);
      this.references.delete(variable.id);

      // Emit event
      this.emit('variable:deleted', {
        type: 'deleted',
        variable,
        userId: options.userId,
        timestamp: new Date()
      } as VariableChangeEvent);

      // Log access
      this.logAccess({
        variableId: variable.id,
        userId: options.userId || 'system',
        action: 'delete',
        success: true
      });
    } catch (error) {
      this.emit('variable:error', { action: 'delete', key, error });
      throw error;
    }
  }

  // Bulk Operations
  public async getVariables(query: VariableQuery = {}): Promise<GlobalVariable[]> {
    let results = Array.from(this.variables.values());

    // Apply filters
    if (query.key) {
      if (query.key instanceof RegExp) {
        const keyRegex = query.key;
        results = results.filter(v => keyRegex.test(v.key));
      } else {
        results = results.filter(v => v.key.includes(query.key as string));
      }
    }

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      results = results.filter(v => types.includes(v.type));
    }

    if (query.scope) {
      const scopes = Array.isArray(query.scope) ? query.scope : [query.scope];
      results = results.filter(v => scopes.includes(v.scope));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(v => 
        query.tags!.some(tag => v.tags?.includes(tag))
      );
    }

    if (query.encrypted !== undefined) {
      results = results.filter(v => v.encrypted === query.encrypted);
    }

    if (query.locked !== undefined) {
      results = results.filter(v => v.metadata?.locked === query.locked);
    }

    if (query.deprecated !== undefined) {
      results = results.filter(v => v.metadata?.deprecated === query.deprecated);
    }

    if (query.createdBy) {
      results = results.filter(v => v.createdBy === query.createdBy);
    }

    if (query.updatedAfter) {
      results = results.filter(v => v.updatedAt > query.updatedAfter!);
    }

    if (query.updatedBefore) {
      results = results.filter(v => v.updatedAt < query.updatedBefore!);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(v => 
        v.key.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower) ||
        v.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (query.sort) {
      results.sort((a, b) => {
        const aVal = a[query.sort!.field];
        const bVal = b[query.sort!.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return query.sort!.order === 'asc' ? comparison : -comparison;
      });
    }

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  public async setVariables(
    variables: { key: string; value: any; options?: Partial<GlobalVariable> }[],
    options: { userId?: string } = {}
  ): Promise<GlobalVariable[]> {
    const results: GlobalVariable[] = [];
    
    for (const variable of variables) {
      try {
        const existing = this.variables.get(variable.key);
        let result: GlobalVariable;
        
        if (existing) {
          result = await this.updateVariable(variable.key, variable.value, options);
        } else {
          result = await this.createVariable(
            variable.key,
            variable.value,
            { ...variable.options, createdBy: options.userId }
          );
        }
        
        results.push(result);
      } catch (error) {
        this.emit('variable:error', { 
          action: 'setVariables', 
          key: variable.key, 
          error 
        });
      }
    }
    
    return results;
  }

  // Environment Management
  public async createEnvironment(
    name: string,
    options: Partial<VariableEnvironment> = {}
  ): Promise<VariableEnvironment> {
    if (this.environments.has(name)) {
      throw new Error(`Environment "${name}" already exists`);
    }

    const environment: VariableEnvironment = {
      id: this.generateId(),
      name,
      description: options.description,
      variables: new Map(),
      parent: options.parent,
      active: options.active ?? false,
      priority: options.priority ?? 0
    };

    this.environments.set(name, environment);
    
    this.emit('environment:created', { environment });
    
    return environment;
  }

  public async switchEnvironment(name: string): Promise<void> {
    const environment = this.environments.get(name);
    if (!environment) {
      throw new Error(`Environment "${name}" not found`);
    }

    // Deactivate current environment
    if (this.currentEnvironment) {
      const current = this.environments.get(this.currentEnvironment);
      if (current) current.active = false;
    }

    // Activate new environment
    environment.active = true;
    this.currentEnvironment = name;

    // Clear cache to reflect environment change
    this.cache.clear();

    this.emit('environment:switched', { 
      from: this.currentEnvironment, 
      to: name 
    });
  }

  public async setEnvironmentVariable(
    environment: string,
    key: string,
    value: any
  ): Promise<void> {
    const env = this.environments.get(environment);
    if (!env) {
      throw new Error(`Environment "${environment}" not found`);
    }

    env.variables.set(key, value);
    
    // Clear cache for this variable
    this.cache.delete(key);
    
    this.emit('environment:variable:set', { 
      environment, 
      key, 
      value 
    });
  }

  public async getEnvironmentVariable(
    key: string,
    environment?: string
  ): Promise<any> {
    const targetEnv = environment || this.currentEnvironment;
    if (!targetEnv) {
      return this.getVariable(key);
    }

    const env = this.environments.get(targetEnv);
    if (!env) {
      throw new Error(`Environment "${targetEnv}" not found`);
    }

    // Check environment variables
    if (env.variables.has(key)) {
      return env.variables.get(key);
    }

    // Check parent environment
    if (env.parent) {
      return this.getEnvironmentVariable(key, env.parent);
    }

    // Fall back to global variable
    return this.getVariable(key);
  }

  // Group Management
  public async createGroup(
    name: string,
    variables: string[],
    options: Partial<VariableGroup> = {}
  ): Promise<VariableGroup> {
    if (this.groups.has(name)) {
      throw new Error(`Group "${name}" already exists`);
    }

    // Validate that all variables exist
    for (const key of variables) {
      if (!this.variables.has(key)) {
        throw new Error(`Variable "${key}" not found`);
      }
    }

    const group: VariableGroup = {
      id: this.generateId(),
      name,
      description: options.description,
      variables,
      scope: options.scope || 'global',
      permissions: options.permissions,
      metadata: options.metadata
    };

    this.groups.set(name, group);
    
    this.emit('group:created', { group });
    
    return group;
  }

  public async getGroup(name: string): Promise<Map<string, any>> {
    const group = this.groups.get(name);
    if (!group) {
      throw new Error(`Group "${name}" not found`);
    }

    const variables = new Map<string, any>();
    
    for (const key of group.variables) {
      try {
        const value = await this.getVariable(key);
        variables.set(key, value);
      } catch (error) {
        // Skip variables that can't be accessed
      }
    }
    
    return variables;
  }

  // Import/Export
  public async importVariables(
    data: string | Buffer | GlobalVariable[],
    options: VariableImportOptions = {}
  ): Promise<GlobalVariable[]> {
    let variables: GlobalVariable[];
    
    // Parse input data
    if (typeof data === 'string') {
      try {
        variables = JSON.parse(data);
      } catch {
        // Try to parse as .env format
        variables = this.parseEnvFormat(data);
      }
    } else if (Buffer.isBuffer(data)) {
      variables = JSON.parse(data.toString());
    } else {
      variables = data;
    }

    const imported: GlobalVariable[] = [];
    
    for (let variable of variables) {
      // Apply prefix if specified
      if (options.prefix) {
        variable.key = `${options.prefix}${variable.key}`;
      }

      // Apply transformation if specified
      if (options.transform) {
        variable = options.transform(variable);
      }

      // Apply scope override if specified
      if (options.scope) {
        variable.scope = options.scope;
      }

      // Handle existing variables
      const existing = this.variables.get(variable.key);
      if (existing) {
        if (options.overwrite) {
          await this.updateVariable(variable.key, variable.value);
        } else if (options.merge) {
          // Merge logic for complex types
          if (variable.type === 'json' && existing.type === 'json') {
            const merged = { ...existing.value, ...variable.value };
            await this.updateVariable(variable.key, merged);
          }
        }
      } else {
        await this.createVariable(variable.key, variable.value, variable);
      }
      
      imported.push(variable);
    }
    
    this.emit('variables:imported', { count: imported.length });
    
    return imported;
  }

  public async exportVariables(
    options: VariableExportOptions = {}
  ): Promise<string> {
    let variables = Array.from(this.variables.values());
    
    // Apply filter if specified
    if (options.filter) {
      variables = variables.filter(options.filter);
    }

    // Process variables for export
    const exported = await Promise.all(
      variables.map(async (variable) => {
        const exported: any = { ...variable };
        
        // Decrypt if requested
        if (variable.encrypted && options.decrypt) {
          exported.value = await this.decryptValue(variable.value);
        }

        // Remove history if not requested
        if (!options.includeHistory) {
          delete exported.history;
        }

        // Remove metadata if not requested
        if (!options.includeMetadata) {
          delete exported.metadata;
        }

        return exported;
      })
    );

    // Format output
    switch (options.format) {
      case 'yaml':
        return this.formatAsYaml(exported);
      case 'env':
        return this.formatAsEnv(exported);
      case 'ini':
        return this.formatAsIni(exported);
      default:
        return JSON.stringify(exported, null, 2);
    }
  }

  // Template Management
  public async createTemplate(
    name: string,
    variables: VariableDefinition[],
    options: Partial<VariableTemplate> = {}
  ): Promise<VariableTemplate> {
    if (this.templates.has(name)) {
      throw new Error(`Template "${name}" already exists`);
    }

    const template: VariableTemplate = {
      id: this.generateId(),
      name,
      description: options.description,
      variables,
      category: options.category,
      tags: options.tags || []
    };

    this.templates.set(name, template);
    
    this.emit('template:created', { template });
    
    return template;
  }

  public async applyTemplate(
    templateName: string,
    values: { [key: string]: any } = {},
    options: { prefix?: string; scope?: VariableScope } = {}
  ): Promise<GlobalVariable[]> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const created: GlobalVariable[] = [];
    
    for (const definition of template.variables) {
      const key = options.prefix 
        ? `${options.prefix}${definition.key}`
        : definition.key;
      
      const value = values[definition.key] ?? definition.defaultValue;
      
      if (definition.required && value === undefined) {
        throw new Error(`Required variable "${definition.key}" not provided`);
      }

      if (value !== undefined) {
        const variable = await this.createVariable(key, value, {
          type: definition.type,
          description: definition.description,
          validation: definition.validation,
          scope: options.scope
        });
        
        created.push(variable);
      }
    }
    
    this.emit('template:applied', { 
      template: templateName, 
      count: created.length 
    });
    
    return created;
  }

  // Reference Tracking
  public addReference(
    variableId: string,
    reference: Omit<VariableReference, 'variableId'>
  ): void {
    if (!this.references.has(variableId)) {
      this.references.set(variableId, new Set());
    }
    
    this.references.get(variableId)!.add({
      ...reference,
      variableId,
      lastAccessed: new Date()
    });
  }

  public getReferences(variableId: string): VariableReference[] {
    const refs = this.references.get(variableId);
    return refs ? Array.from(refs) : [];
  }

  public removeReference(
    variableId: string,
    workflowId: string,
    nodeId?: string
  ): void {
    const refs = this.references.get(variableId);
    if (refs) {
      refs.forEach(ref => {
        if (ref.workflowId === workflowId && 
            (!nodeId || ref.nodeId === nodeId)) {
          refs.delete(ref);
        }
      });
    }
  }

  // Security & Encryption
  public setEncryptionKey(key: string | Buffer): void {
    this.encryptionKey = typeof key === 'string' 
      ? Buffer.from(key, 'hex') 
      : key;
  }

  private async encryptValue(value: any): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv
    );

    const input = JSON.stringify(value);
    let encrypted = cipher.update(input, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = (cipher as any).getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private async decryptValue(encrypted: string): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const buffer = Buffer.from(encrypted, 'base64');
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const data = buffer.slice(32);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv
    );
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }

  // Validation
  private validateValue(
    value: any,
    validation: VariableValidation
  ): boolean | string {
    if (validation.required && value === undefined) {
      return validation.message || 'Value is required';
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return validation.message || `Value must match pattern: ${validation.pattern}`;
      }
    }

    if (validation.min !== undefined && typeof value === 'number') {
      if (value < validation.min) {
        return validation.message || `Value must be >= ${validation.min}`;
      }
    }

    if (validation.max !== undefined && typeof value === 'number') {
      if (value > validation.max) {
        return validation.message || `Value must be <= ${validation.max}`;
      }
    }

    if (validation.minLength !== undefined && typeof value === 'string') {
      if (value.length < validation.minLength) {
        return validation.message || `Length must be >= ${validation.minLength}`;
      }
    }

    if (validation.maxLength !== undefined && typeof value === 'string') {
      if (value.length > validation.maxLength) {
        return validation.message || `Length must be <= ${validation.maxLength}`;
      }
    }

    if (validation.enum && validation.enum.length > 0) {
      if (!validation.enum.includes(value)) {
        return validation.message || `Value must be one of: ${validation.enum.join(', ')}`;
      }
    }

    if (validation.custom) {
      const result = validation.custom(value);
      if (result !== true) {
        return typeof result === 'string' ? result : validation.message || 'Custom validation failed';
      }
    }

    return true;
  }

  // Helper Methods
  private detectType(value: any): VariableType {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  private hasPermission(
    variable: GlobalVariable,
    action: 'read' | 'write' | 'delete',
    userId?: string
  ): boolean {
    if (!variable.permissions || !userId) return true;
    
    const allowedUsers = variable.permissions[action] || [];
    const adminUsers = variable.permissions.admin || [];
    
    return allowedUsers.includes(userId) || 
           allowedUsers.includes('*') ||
           adminUsers.includes(userId);
  }

  private generateId(): string {
    return `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logAccess(log: Omit<VariableAccessLog, 'id' | 'timestamp'>): void {
    const accessLog: VariableAccessLog = {
      ...log,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    this.accessLogs.push(accessLog);
    
    // Limit access log size
    if (this.accessLogs.length > this.MAX_ACCESS_LOGS) {
      this.accessLogs = this.accessLogs.slice(-this.MAX_ACCESS_LOGS);
    }
    
    this.emit('variable:accessed', accessLog);
  }

  private async evaluateExpression(
    expression: string,
    context: any
  ): Promise<any> {
    // Safe expression evaluation
    // This would integrate with the expression engine
    return expression;
  }

  private async processTemplate(
    template: string,
    context: any
  ): Promise<string> {
    // Template processing
    // Replace {{variable}} with actual values
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });
  }

  // Format Converters
  private parseEnvFormat(data: string): GlobalVariable[] {
    const lines = data.split('\n');
    const variables: GlobalVariable[] = [];
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        variables.push({
          id: this.generateId(),
          key: key.trim(),
          value: value.replace(/^["']|["']$/g, ''),
          type: 'string',
          scope: 'global',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    return variables;
  }

  private formatAsEnv(variables: GlobalVariable[]): string {
    return variables
      .map(v => `${v.key}="${v.value}"`)
      .join('\n');
  }

  private formatAsYaml(variables: GlobalVariable[]): string {
    // Simple YAML formatting
    return variables
      .map(v => `${v.key}: ${JSON.stringify(v.value)}`)
      .join('\n');
  }

  private formatAsIni(variables: GlobalVariable[]): string {
    const grouped: { [scope: string]: GlobalVariable[] } = {};
    
    for (const variable of variables) {
      if (!grouped[variable.scope]) {
        grouped[variable.scope] = [];
      }
      grouped[variable.scope].push(variable);
    }
    
    let result = '';
    for (const [scope, vars] of Object.entries(grouped)) {
      result += `[${scope}]\n`;
      result += vars.map(v => `${v.key}=${v.value}`).join('\n');
      result += '\n\n';
    }
    
    return result;
  }

  // Initialization
  private initializeDefaultEnvironments(): void {
    this.createEnvironment('development', {
      description: 'Development environment',
      priority: 1
    });
    
    this.createEnvironment('staging', {
      description: 'Staging environment',
      priority: 2
    });
    
    this.createEnvironment('production', {
      description: 'Production environment',
      priority: 3
    });
  }

  private initializeDefaultTemplates(): void {
    // Database connection template
    this.createTemplate('database', [
      { key: 'DB_HOST', type: 'string', required: true },
      { key: 'DB_PORT', type: 'number', defaultValue: 5432 },
      { key: 'DB_NAME', type: 'string', required: true },
      { key: 'DB_USER', type: 'string', required: true },
      { key: 'DB_PASSWORD', type: 'secret', required: true }
    ], {
      description: 'Database connection variables',
      category: 'database'
    });

    // API configuration template
    this.createTemplate('api', [
      { key: 'API_BASE_URL', type: 'string', required: true },
      { key: 'API_KEY', type: 'secret', required: true },
      { key: 'API_TIMEOUT', type: 'number', defaultValue: 30000 },
      { key: 'API_RETRY_COUNT', type: 'number', defaultValue: 3 }
    ], {
      description: 'API configuration variables',
      category: 'api'
    });
  }

  private startCleanupScheduler(): void {
    // Clean up expired variables every hour
    setInterval(() => {
      const now = new Date();
      const expired: string[] = [];

      for (const [key, variable] of Array.from(this.variables.entries())) {
        if (variable.metadata?.expiresAt && variable.metadata.expiresAt < now) {
          expired.push(key);
        }
      }

      for (const key of expired) {
        this.deleteVariable(key).catch(error => {
          this.emit('variable:error', {
            action: 'cleanup',
            key,
            error
          });
        });
      }
    }, 60 * 60 * 1000);
  }
}

// Cache Implementation
class InMemoryVariableCache implements VariableCache {
  private cache: Map<string, { value: any; expires?: Date }> = new Map();

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (item.expires && item.expires < new Date()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: any, ttl?: number): void {
    const item: any = { value };
    
    if (ttl) {
      item.expires = new Date(Date.now() + ttl * 1000);
    }
    
    this.cache.set(key, item);
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expires && item.expires < new Date()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export default GlobalVariablesSystem.getInstance();
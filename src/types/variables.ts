/**
 * Workflow Variables and Environment Types
 * System for managing workflow variables, environments, and secrets
 */

export interface WorkflowVariable {
  id: string;
  name: string;
  value: string | number | boolean | object;
  type: VariableType;
  scope: VariableScope;
  description?: string;
  encrypted?: boolean;
  validationRule?: string;
  defaultValue?: unknown;
  required?: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type VariableType = 'string' | 'number' | 'boolean' | 'json' | 'secret' | 'file' | 'date' | 'array' | 'object' | 'null' | 'any';

export type VariableScope = 'global' | 'workflow' | 'environment' | 'user' | 'team' | 'execution';

export interface Environment {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  variables: EnvironmentVariable[];
  parentEnvironment?: string; // for inheritance
  restrictions?: EnvironmentRestrictions;
  deploymentTargets?: DeploymentTarget[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EnvironmentVariable {
  variableId: string;
  value: unknown;
  overridden: boolean;
  source: 'environment' | 'inherited' | 'default';
}

export interface EnvironmentRestrictions {
  allowedUsers?: string[];
  allowedTeams?: string[];
  allowedWorkflows?: string[];
  ipWhitelist?: string[];
  timeRestrictions?: TimeRestriction[];
  maxExecutions?: number;
  requiresApproval?: boolean;
}

export interface TimeRestriction {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  daysOfWeek: number[]; // 0-6
  timezone: string;
}

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'production' | 'staging' | 'development' | 'custom';
  url?: string;
  credentials?: Record<string, string>;
  autoSync: boolean;
}

export interface VariableGroup {
  id: string;
  name: string;
  description?: string;
  variables: string[]; // variable IDs
  permissions: VariablePermissions;
  tags: string[];
}

export interface VariablePermissions {
  read: string[]; // user/team IDs
  write: string[]; // user/team IDs
  delete: string[]; // user/team IDs
  share: string[]; // user/team IDs
}

export interface Secret {
  id: string;
  name: string;
  provider: SecretProvider;
  reference: string; // external reference (e.g., AWS secret name)
  metadata: Record<string, unknown>;
  lastSynced?: Date;
  status: 'active' | 'expired' | 'error';
  expiresAt?: Date;
}

export type SecretProvider = 'aws_secrets' | 'azure_keyvault' | 'google_secret' | 'hashicorp_vault' | 'local';

export interface VariableTemplate {
  id: string;
  name: string;
  description: string;
  variables: Array<{
    name: string;
    type: VariableType;
    defaultValue?: unknown;
    required: boolean;
    description?: string;
    validationRule?: string;
  }>;
  category: string;
  icon?: string;
}

export interface VariableUsage {
  variableId: string;
  workflowId: string;
  nodeId: string;
  field: string;
  lastUsed: Date;
  usageCount: number;
}

export interface VariableHistory {
  id: string;
  variableId: string;
  previousValue: unknown;
  newValue: unknown;
  changedBy: string;
  changedAt: Date;
  reason?: string;
  environment?: string;
}

export interface VariableValidation {
  type: ValidationType;
  rule: string;
  errorMessage?: string;
}

export type ValidationType = 'regex' | 'range' | 'length' | 'custom' | 'enum';

export interface VariableResolver {
  resolve(expression: string, context: VariableContext): Promise<unknown>;
  validateExpression(expression: string): ValidationResult;
  getAvailableVariables(context: VariableContext): Variable[];
  getSuggestions(partial: string, context: VariableContext): VariableSuggestion[];
}

export interface VariableContext {
  workflowId: string;
  nodeId?: string;
  executionId?: string;
  environment: string;
  user: string;
  team?: string;
  additionalVariables?: Record<string, unknown>;
}

export interface Variable {
  id: string;
  name: string;
  value: unknown;
  type: VariableType;
  scope: VariableScope;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  source?: string;
}

export interface VariableSuggestion {
  name: string;
  type: VariableType;
  description?: string;
  example?: string;
  category?: string;
  score: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    position: number;
    message: string;
    suggestion?: string;
  }>;
  warnings: Array<{
    position: number;
    message: string;
  }>;
  usedVariables: string[];
}

export interface EnvironmentSync {
  id: string;
  sourceEnvironment: string;
  targetEnvironments: string[];
  syncType: 'manual' | 'automatic' | 'scheduled';
  includeSecrets: boolean;
  variableFilters?: string[];
  lastSync?: Date;
  nextSync?: Date;
  status: 'active' | 'paused' | 'error';
}

export interface VariableExport {
  version: string;
  exportedAt: Date;
  environment?: string;
  variables: Array<{
    name: string;
    type: VariableType;
    scope: VariableScope;
    value?: unknown; // excluded for secrets
    description?: string;
    encrypted: boolean;
  }>;
  groups?: VariableGroup[];
  templates?: VariableTemplate[];
}

export interface VariablesService {
  // Variable Management
  createVariable(variable: Omit<WorkflowVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowVariable>;
  updateVariable(id: string, updates: Partial<WorkflowVariable>): Promise<void>;
  deleteVariable(id: string): Promise<void>;
  getVariable(id: string): Promise<WorkflowVariable | null>;
  listVariables(filters?: VariableFilters): Promise<WorkflowVariable[]>;
  
  // Environment Management
  createEnvironment(environment: Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Environment>;
  updateEnvironment(id: string, updates: Partial<Environment>): Promise<void>;
  deleteEnvironment(id: string): Promise<void>;
  getEnvironment(id: string): Promise<Environment | null>;
  listEnvironments(): Promise<Environment[]>;
  setDefaultEnvironment(id: string): Promise<void>;
  
  // Variable Resolution
  resolveVariable(name: string, context: VariableContext): Promise<unknown>;
  resolveExpression(expression: string, context: VariableContext): Promise<unknown>;
  validateExpression(expression: string): ValidationResult;
  
  // Secrets Management
  createSecret(secret: Omit<Secret, 'id' | 'lastSynced' | 'status'>): Promise<Secret>;
  syncSecret(id: string): Promise<void>;
  rotateSecret(id: string): Promise<void>;
  
  // Groups and Templates
  createVariableGroup(group: Omit<VariableGroup, 'id'>): Promise<VariableGroup>;
  applyTemplate(templateId: string, targetScope: VariableScope): Promise<WorkflowVariable[]>;
  
  // History and Audit
  getVariableHistory(variableId: string): Promise<VariableHistory[]>;
  getVariableUsage(variableId: string): Promise<VariableUsage[]>;
  
  // Import/Export
  exportVariables(environmentId?: string): Promise<VariableExport>;
  importVariables(data: VariableExport, targetEnvironment?: string): Promise<void>;
  
  // Environment Sync
  createEnvironmentSync(sync: Omit<EnvironmentSync, 'id' | 'lastSync' | 'status'>): Promise<EnvironmentSync>;
  syncEnvironments(syncId: string): Promise<void>;
}

export interface VariableFilters {
  scope?: VariableScope | VariableScope[];
  type?: VariableType[];
  environment?: string;
  search?: string;
  tags?: string[];
  includeSecrets?: boolean;
}

// Alias for VariableManager compatibility
export type VariableFilter = VariableFilters;

// Variable change event for listeners
export interface VariableChangeEvent {
  type: 'created' | 'updated' | 'deleted';
  variable: Variable;
  previousValue?: unknown;
  timestamp: Date;
}
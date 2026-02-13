/**
 * Environment Management Types
 * Support for dev/staging/prod environments
 */

export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TESTING = 'testing',
}

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  config: EnvironmentConfig;
}

export interface EnvironmentConfig {
  // Environment-specific variables
  variables: Record<string, string>;

  // Environment-specific credentials mapping
  // Maps credential IDs from source env to target env
  credentialMappings: Record<string, string>;

  // Base URL for webhooks and callbacks
  baseUrl?: string;

  // Feature flags per environment
  features?: Record<string, boolean>;

  // Rate limits per environment
  rateLimits?: {
    maxExecutionsPerMinute: number;
    maxConcurrentExecutions: number;
  };

  // Notification settings per environment
  notifications?: {
    onError?: boolean;
    onSuccess?: boolean;
    channels?: string[]; // email, slack, etc.
  };
}

export interface WorkflowPromotion {
  id: string;
  workflowId: string;
  workflowName: string;
  sourceEnvId: string;
  targetEnvId: string;
  promotedBy: string;
  promotedAt: Date;
  status: PromotionStatus;
  changes?: WorkflowPromotionChanges;
  rollbackInfo?: RollbackInfo;
}

export enum PromotionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export interface WorkflowPromotionChanges {
  // Credentials that need to be remapped
  credentialChanges: Array<{
    nodeId: string;
    nodeName: string;
    sourceCredentialId: string;
    targetCredentialId?: string;
    credentialType: string;
  }>;

  // Variables that need to be updated
  variableChanges: Array<{
    variableName: string;
    sourceValue: string;
    targetValue?: string;
  }>;

  // Nodes that reference environment-specific configs
  environmentSpecificNodes: string[];
}

export interface RollbackInfo {
  previousVersion?: string;
  previousWorkflowData?: any;
  canRollback: boolean;
  rollbackBy?: string;
  rollbackAt?: Date;
}

export interface EnvironmentCredential {
  id: string;
  environmentId: string;
  credentialId: string;
  credentialName: string;
  credentialType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentWorkflow {
  id: string;
  workflowId: string;
  environmentId: string;
  version: string;
  isActive: boolean;
  deployedAt: Date;
  deployedBy: string;
  status: 'active' | 'inactive' | 'draft';
}

export interface CreateEnvironmentRequest {
  name: string;
  type: EnvironmentType;
  description?: string;
  config?: Partial<EnvironmentConfig>;
}

export interface UpdateEnvironmentRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  config?: Partial<EnvironmentConfig>;
}

export interface PromoteWorkflowRequest {
  workflowId: string;
  sourceEnvId: string;
  targetEnvId: string;
  credentialMappings?: Record<string, string>;
  variableMappings?: Record<string, string>;
  validateOnly?: boolean; // Preview changes without promoting
}

export interface PromoteWorkflowResponse {
  success: boolean;
  promotionId?: string;
  changes?: WorkflowPromotionChanges;
  warnings?: string[];
  errors?: string[];
}

export interface EnvironmentComparisonResult {
  sourceEnv: Environment;
  targetEnv: Environment;
  workflowDifferences: Array<{
    workflowId: string;
    workflowName: string;
    existsInSource: boolean;
    existsInTarget: boolean;
    versionDifference?: {
      sourceVersion: string;
      targetVersion: string;
    };
  }>;
  credentialDifferences: Array<{
    credentialId: string;
    credentialName: string;
    existsInSource: boolean;
    existsInTarget: boolean;
  }>;
  variableDifferences: Array<{
    key: string;
    sourceValue?: string;
    targetValue?: string;
    isDifferent: boolean;
  }>;
}

export interface EnvironmentSyncRequest {
  sourceEnvId: string;
  targetEnvId: string;
  syncWorkflows?: boolean;
  syncCredentials?: boolean;
  syncVariables?: boolean;
  dryRun?: boolean;
}

export interface EnvironmentSyncResult {
  success: boolean;
  workflowsSynced: number;
  credentialsSynced: number;
  variablesSynced: number;
  errors: string[];
  warnings: string[];
}

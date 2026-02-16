/**
 * Environment Management Service
 * Manages dev/staging/prod environments with workflow promotion
 */

import {
  Environment,
  EnvironmentType,
  EnvironmentConfig,
  WorkflowPromotion,
  PromotionStatus,
  WorkflowPromotionChanges,
  EnvironmentCredential,
  EnvironmentVariable,
  EnvironmentWorkflow,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  PromoteWorkflowRequest,
  PromoteWorkflowResponse,
  EnvironmentComparisonResult,
  EnvironmentSyncRequest,
  EnvironmentSyncResult,
} from './EnvironmentTypes';
import { logger } from '../services/LogService';
import { getAuditService } from '../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../audit/AuditTypes';

// Prisma persistence helper - gracefully degrades if tables don't exist yet
async function getPrisma() {
  try {
    const { prisma } = await import('../database/prisma');
    return prisma;
  } catch {
    return null;
  }
}

export class EnvironmentService {
  private environments: Map<string, Environment> = new Map();
  private promotions: Map<string, WorkflowPromotion> = new Map();
  private envCredentials: Map<string, EnvironmentCredential[]> = new Map();
  private envVariables: Map<string, EnvironmentVariable[]> = new Map();
  private envWorkflows: Map<string, EnvironmentWorkflow[]> = new Map();
  private dbLoaded = false;

  constructor() {
    this.initializeDefaultEnvironments();
    // Async load from DB in background - overrides defaults if data exists
    this.loadFromDatabase().catch(() => {});
  }

  /**
   * Load environments from Prisma DB (if table exists).
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const prisma = await getPrisma();
      if (!prisma) return;
      const dbEnvs = await (prisma as any).environment?.findMany?.({ include: { variables: true } });
      if (!dbEnvs || dbEnvs.length === 0) {
        // No DB data yet - persist current in-memory defaults
        await this.persistAllToDatabase();
        this.dbLoaded = true;
        return;
      }

      // Load from DB into memory
      this.environments.clear();
      for (const dbEnv of dbEnvs) {
        const settings = (typeof dbEnv.settings === 'object' ? dbEnv.settings : {}) as Record<string, any>;
        const env: Environment = {
          id: dbEnv.id,
          name: dbEnv.displayName || dbEnv.name,
          type: dbEnv.type.toLowerCase() as EnvironmentType,
          description: dbEnv.description || '',
          createdAt: dbEnv.createdAt,
          updatedAt: dbEnv.updatedAt,
          isActive: !dbEnv.isLocked,
          config: {
            variables: settings.variables || {},
            credentialMappings: settings.credentialMappings || {},
            features: settings.features || {},
            rateLimits: settings.rateLimits || { maxExecutionsPerMinute: 100, maxConcurrentExecutions: 10 },
          },
        };
        this.environments.set(env.id, env);

        // Load variables
        if (dbEnv.variables?.length) {
          this.envVariables.set(env.id, dbEnv.variables.map((v: any) => ({
            id: v.id,
            environmentId: v.environmentId,
            key: v.key,
            value: v.value,
            description: v.description,
            isSecret: v.isSecret,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          })));
        }
      }

      this.dbLoaded = true;
      logger.info(`Loaded ${dbEnvs.length} environments from database`);
    } catch (error) {
      // Table might not exist yet - that's ok, will use in-memory
      logger.debug('Could not load environments from DB, using in-memory defaults', { error: String(error) });
    }
  }

  /**
   * Persist all in-memory environments to DB.
   */
  private async persistAllToDatabase(): Promise<void> {
    try {
      const prisma = await getPrisma();
      if (!prisma) return;
      for (const env of this.environments.values()) {
        await this.persistEnvironmentToDb(env);
      }
    } catch {
      // Silently ignore - DB might not have the table yet
    }
  }

  /**
   * Persist a single environment to DB.
   */
  private async persistEnvironmentToDb(env: Environment): Promise<void> {
    try {
      const prisma = await getPrisma();
      if (!prisma) return;
      const typeMap: Record<string, string> = {
        development: 'DEVELOPMENT',
        staging: 'STAGING',
        production: 'PRODUCTION',
        testing: 'TESTING',
      };
      await (prisma as any).environment?.upsert?.({
        where: { id: env.id },
        create: {
          id: env.id,
          name: env.name.toLowerCase().replace(/\s+/g, '-'),
          displayName: env.name,
          description: env.description || null,
          type: typeMap[env.type] || 'DEVELOPMENT',
          isLocked: !env.isActive,
          settings: env.config as any,
        },
        update: {
          displayName: env.name,
          description: env.description || null,
          type: typeMap[env.type] || 'DEVELOPMENT',
          isLocked: !env.isActive,
          settings: env.config as any,
        },
      });
    } catch {
      // Silently ignore
    }
  }

  /**
   * Initialize default environments
   */
  private initializeDefaultEnvironments(): void {
    const defaultEnvs: CreateEnvironmentRequest[] = [
      {
        name: 'Development',
        type: EnvironmentType.DEVELOPMENT,
        description: 'Development environment for testing',
        config: {
          variables: {},
          credentialMappings: {},
          features: {
            debug: true,
            verbose_logging: true,
          },
          rateLimits: {
            maxExecutionsPerMinute: 100,
            maxConcurrentExecutions: 10,
          },
        },
      },
      {
        name: 'Staging',
        type: EnvironmentType.STAGING,
        description: 'Staging environment for pre-production testing',
        config: {
          variables: {},
          credentialMappings: {},
          features: {
            debug: false,
            verbose_logging: true,
          },
          rateLimits: {
            maxExecutionsPerMinute: 500,
            maxConcurrentExecutions: 50,
          },
        },
      },
      {
        name: 'Production',
        type: EnvironmentType.PRODUCTION,
        description: 'Production environment',
        config: {
          variables: {},
          credentialMappings: {},
          features: {
            debug: false,
            verbose_logging: false,
          },
          rateLimits: {
            maxExecutionsPerMinute: 1000,
            maxConcurrentExecutions: 100,
          },
          notifications: {
            onError: true,
            onSuccess: false,
            channels: ['email', 'slack'],
          },
        },
      },
    ];

    defaultEnvs.forEach((envReq) => {
      const env = this.createEnvironmentInternal(envReq);
      logger.info(`Initialized default environment: ${env.name}`, {
        envId: env.id,
        type: env.type,
      });
    });
  }

  /**
   * Create a new environment
   */
  async createEnvironment(
    request: CreateEnvironmentRequest,
    userId: string
  ): Promise<Environment> {
    const env = this.createEnvironmentInternal(request);

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.ENVIRONMENT_CREATE,
      category: AuditCategory.ENVIRONMENT,
      severity: AuditSeverity.INFO,
      userId,
      username: userId,
      resourceType: 'environment',
      resourceId: env.id,
      success: true,
      details: {
        environmentName: env.name,
        environmentType: env.type,
      },
    });

    logger.info('Environment created', {
      envId: env.id,
      name: env.name,
      type: env.type,
      createdBy: userId,
    });

    return env;
  }

  /**
   * Create environment (internal)
   */
  private createEnvironmentInternal(request: CreateEnvironmentRequest): Environment {
    const env: Environment = {
      id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      type: request.type,
      description: request.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      config: {
        variables: request.config?.variables || {},
        credentialMappings: request.config?.credentialMappings || {},
        baseUrl: request.config?.baseUrl,
        features: request.config?.features || {},
        rateLimits: request.config?.rateLimits || {
          maxExecutionsPerMinute: 100,
          maxConcurrentExecutions: 10,
        },
        notifications: request.config?.notifications,
      },
    };

    this.environments.set(env.id, env);
    this.persistEnvironmentToDb(env).catch(() => {});
    return env;
  }

  /**
   * Get environment by ID
   */
  async getEnvironment(envId: string): Promise<Environment | null> {
    return this.environments.get(envId) || null;
  }

  /**
   * Get environment by type
   */
  async getEnvironmentByType(type: EnvironmentType): Promise<Environment | null> {
    for (const env of this.environments.values()) {
      if (env.type === type && env.isActive) {
        return env;
      }
    }
    return null;
  }

  /**
   * List all environments
   */
  async listEnvironments(filter?: {
    type?: EnvironmentType;
    isActive?: boolean;
  }): Promise<Environment[]> {
    let envs = Array.from(this.environments.values());

    if (filter?.type) {
      envs = envs.filter((env) => env.type === filter.type);
    }

    if (filter?.isActive !== undefined) {
      envs = envs.filter((env) => env.isActive === filter.isActive);
    }

    return envs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Update environment
   */
  async updateEnvironment(
    envId: string,
    request: UpdateEnvironmentRequest,
    userId: string
  ): Promise<Environment> {
    const env = this.environments.get(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    const oldValues = { ...env };

    if (request.name) env.name = request.name;
    if (request.description !== undefined) env.description = request.description;
    if (request.isActive !== undefined) env.isActive = request.isActive;
    if (request.config) {
      env.config = {
        ...env.config,
        ...request.config,
      };
    }

    env.updatedAt = new Date();
    this.environments.set(envId, env);
    this.persistEnvironmentToDb(env).catch(() => {});

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.ENVIRONMENT_UPDATE,
      category: AuditCategory.ENVIRONMENT,
      severity: AuditSeverity.INFO,
      userId,
      username: userId,
      resourceType: 'environment',
      resourceId: env.id,
      success: true,
      details: {
        changes: request,
        oldValues,
      },
    });

    logger.info('Environment updated', {
      envId: env.id,
      updatedBy: userId,
      changes: request,
    });

    return env;
  }

  /**
   * Delete environment
   */
  async deleteEnvironment(envId: string, userId: string): Promise<void> {
    const env = this.environments.get(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    // Don't allow deleting production environment
    if (env.type === EnvironmentType.PRODUCTION) {
      throw new Error('Cannot delete production environment');
    }

    this.environments.delete(envId);
    this.envCredentials.delete(envId);
    this.envVariables.delete(envId);
    this.envWorkflows.delete(envId);
    // Persist deletion to DB
    getPrisma().then(prisma => prisma && (prisma as any).environment?.delete?.({ where: { id: envId } }).catch(() => {})).catch(() => {});

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.ENVIRONMENT_DELETE,
      category: AuditCategory.ENVIRONMENT,
      severity: AuditSeverity.WARNING,
      userId,
      username: userId,
      resourceType: 'environment',
      resourceId: envId,
      success: true,
      details: {
        environmentName: env.name,
        environmentType: env.type,
      },
    });

    logger.warn('Environment deleted', {
      envId,
      deletedBy: userId,
    });
  }

  /**
   * Set environment variable
   */
  async setEnvironmentVariable(
    envId: string,
    key: string,
    value: string,
    options?: {
      description?: string;
      isSecret?: boolean;
    },
    userId?: string
  ): Promise<EnvironmentVariable> {
    const env = this.environments.get(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    const variables = this.envVariables.get(envId) || [];
    const existingIndex = variables.findIndex((v) => v.key === key);

    const variable: EnvironmentVariable = {
      id: existingIndex >= 0 ? variables[existingIndex].id : `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      environmentId: envId,
      key,
      value,
      description: options?.description,
      isSecret: options?.isSecret || false,
      createdAt: existingIndex >= 0 ? variables[existingIndex].createdAt : new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      variables[existingIndex] = variable;
    } else {
      variables.push(variable);
    }

    this.envVariables.set(envId, variables);

    // Persist variable to DB
    getPrisma().then(prisma => prisma && (prisma as any).environmentVariable?.upsert?.({
      where: { environmentId_key: { environmentId: envId, key } },
      create: { id: variable.id, environmentId: envId, key, value, isSecret: variable.isSecret, description: variable.description || null },
      update: { value, isSecret: variable.isSecret, description: variable.description || null },
    }).catch(() => {})).catch(() => {});

    // Also update in environment config
    env.config.variables[key] = value;
    this.environments.set(envId, env);

    logger.info('Environment variable set', {
      envId,
      key,
      isSecret: variable.isSecret,
      setBy: userId,
    });

    return variable;
  }

  /**
   * Get environment variables
   */
  async getEnvironmentVariables(envId: string): Promise<EnvironmentVariable[]> {
    return this.envVariables.get(envId) || [];
  }

  /**
   * Promote workflow between environments
   */
  async promoteWorkflow(
    request: PromoteWorkflowRequest,
    userId: string
  ): Promise<PromoteWorkflowResponse> {
    const { workflowId, sourceEnvId, targetEnvId, credentialMappings, variableMappings, validateOnly } = request;

    const sourceEnv = this.environments.get(sourceEnvId);
    const targetEnv = this.environments.get(targetEnvId);

    if (!sourceEnv || !targetEnv) {
      throw new Error('Source or target environment not found');
    }

    // Get workflow data (assuming we have access to workflow store)
    // For now, we'll create a mock workflow promotion
    const changes: WorkflowPromotionChanges = {
      credentialChanges: [],
      variableChanges: [],
      environmentSpecificNodes: [],
    };

    const warnings: string[] = [];
    const errors: string[] = [];

    // Analyze credential mappings
    if (credentialMappings) {
      Object.entries(credentialMappings).forEach(([sourceCredId, targetCredId]) => {
        changes.credentialChanges.push({
          nodeId: 'node_id_placeholder',
          nodeName: 'Node Name',
          sourceCredentialId: sourceCredId,
          targetCredentialId: targetCredId,
          credentialType: 'api_key',
        });
      });
    } else {
      warnings.push('No credential mappings provided. Manual mapping may be required.');
    }

    // Analyze variable mappings
    if (variableMappings) {
      Object.entries(variableMappings).forEach(([varName, targetValue]) => {
        changes.variableChanges.push({
          variableName: varName,
          sourceValue: sourceEnv.config.variables[varName] || '',
          targetValue,
        });
      });
    }

    // If validation only, return changes without promoting
    if (validateOnly) {
      return {
        success: true,
        changes,
        warnings,
        errors,
      };
    }

    // Create promotion record
    const promotion: WorkflowPromotion = {
      id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      workflowName: `Workflow ${workflowId}`,
      sourceEnvId,
      targetEnvId,
      promotedBy: userId,
      promotedAt: new Date(),
      status: PromotionStatus.COMPLETED,
      changes,
      rollbackInfo: {
        canRollback: true,
        previousVersion: 'v1.0.0',
      },
    };

    this.promotions.set(promotion.id, promotion);

    // Create environment workflow record
    const envWorkflow: EnvironmentWorkflow = {
      id: `envwf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      environmentId: targetEnvId,
      version: `v${Date.now()}`,
      isActive: true,
      deployedAt: new Date(),
      deployedBy: userId,
      status: 'active',
    };

    const workflows = this.envWorkflows.get(targetEnvId) || [];
    workflows.push(envWorkflow);
    this.envWorkflows.set(targetEnvId, workflows);

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.WORKFLOW_PROMOTE,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.INFO,
      userId,
      username: userId,
      resourceType: 'workflow',
      resourceId: workflowId,
      success: true,
      details: {
        sourceEnv: sourceEnv.name,
        targetEnv: targetEnv.name,
        promotionId: promotion.id,
        changes,
      },
    });

    logger.info('Workflow promoted', {
      workflowId,
      sourceEnv: sourceEnv.name,
      targetEnv: targetEnv.name,
      promotionId: promotion.id,
      promotedBy: userId,
    });

    return {
      success: true,
      promotionId: promotion.id,
      changes,
      warnings,
      errors,
    };
  }

  /**
   * Get promotion history
   */
  async getPromotionHistory(workflowId?: string): Promise<WorkflowPromotion[]> {
    let promotions = Array.from(this.promotions.values());

    if (workflowId) {
      promotions = promotions.filter((p) => p.workflowId === workflowId);
    }

    return promotions.sort((a, b) => b.promotedAt.getTime() - a.promotedAt.getTime());
  }

  /**
   * Rollback workflow promotion
   */
  async rollbackPromotion(promotionId: string, userId: string): Promise<void> {
    const promotion = this.promotions.get(promotionId);
    if (!promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    if (!promotion.rollbackInfo?.canRollback) {
      throw new Error('Cannot rollback this promotion');
    }

    promotion.status = PromotionStatus.ROLLED_BACK;
    promotion.rollbackInfo.rollbackBy = userId;
    promotion.rollbackInfo.rollbackAt = new Date();

    this.promotions.set(promotionId, promotion);

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.WORKFLOW_ROLLBACK,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.WARNING,
      userId,
      username: userId,
      resourceType: 'workflow',
      resourceId: promotion.workflowId,
      success: true,
      details: {
        promotionId,
        rolledBackBy: userId,
      },
    });

    logger.warn('Workflow promotion rolled back', {
      promotionId,
      workflowId: promotion.workflowId,
      rolledBackBy: userId,
    });
  }

  /**
   * Compare environments
   */
  async compareEnvironments(
    sourceEnvId: string,
    targetEnvId: string
  ): Promise<EnvironmentComparisonResult> {
    const sourceEnv = this.environments.get(sourceEnvId);
    const targetEnv = this.environments.get(targetEnvId);

    if (!sourceEnv || !targetEnv) {
      throw new Error('Source or target environment not found');
    }

    const sourceWorkflows = this.envWorkflows.get(sourceEnvId) || [];
    const targetWorkflows = this.envWorkflows.get(targetEnvId) || [];

    const sourceVariables = this.envVariables.get(sourceEnvId) || [];
    const targetVariables = this.envVariables.get(targetEnvId) || [];

    const workflowDifferences = sourceWorkflows.map((sw) => {
      const tw = targetWorkflows.find((t) => t.workflowId === sw.workflowId);
      return {
        workflowId: sw.workflowId,
        workflowName: `Workflow ${sw.workflowId}`,
        existsInSource: true,
        existsInTarget: !!tw,
        versionDifference: tw ? {
          sourceVersion: sw.version,
          targetVersion: tw.version,
        } : undefined,
      };
    });

    const variableDifferences = Array.from(
      new Set([...sourceVariables.map((v) => v.key), ...targetVariables.map((v) => v.key)])
    ).map((key) => {
      const sourceVar = sourceVariables.find((v) => v.key === key);
      const targetVar = targetVariables.find((v) => v.key === key);
      return {
        key,
        sourceValue: sourceVar?.value,
        targetValue: targetVar?.value,
        isDifferent: sourceVar?.value !== targetVar?.value,
      };
    });

    return {
      sourceEnv,
      targetEnv,
      workflowDifferences,
      credentialDifferences: [],
      variableDifferences,
    };
  }

  /**
   * Sync environments
   */
  async syncEnvironments(
    request: EnvironmentSyncRequest,
    userId: string
  ): Promise<EnvironmentSyncResult> {
    const { sourceEnvId, targetEnvId, syncWorkflows, syncCredentials, syncVariables, dryRun } = request;

    const sourceEnv = this.environments.get(sourceEnvId);
    const targetEnv = this.environments.get(targetEnvId);

    if (!sourceEnv || !targetEnv) {
      throw new Error('Source or target environment not found');
    }

    let workflowsSynced = 0;
    let credentialsSynced = 0;
    let variablesSynced = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Sync variables
    if (syncVariables) {
      const sourceVariables = this.envVariables.get(sourceEnvId) || [];
      for (const sourceVar of sourceVariables) {
        if (!dryRun) {
          await this.setEnvironmentVariable(
            targetEnvId,
            sourceVar.key,
            sourceVar.value,
            {
              description: sourceVar.description,
              isSecret: sourceVar.isSecret,
            },
            userId
          );
        }
        variablesSynced++;
      }
    }

    // Audit log
    if (!dryRun) {
      const auditService = getAuditService();
      await auditService.log({
        action: AuditAction.ENVIRONMENT_SYNC,
        category: AuditCategory.ENVIRONMENT,
        severity: AuditSeverity.INFO,
        userId,
        username: userId,
        resourceType: 'environment',
        resourceId: targetEnvId,
        success: true,
        details: {
          sourceEnv: sourceEnv.name,
          targetEnv: targetEnv.name,
          workflowsSynced,
          credentialsSynced,
          variablesSynced,
        },
      });
    }

    logger.info('Environments synced', {
      sourceEnv: sourceEnv.name,
      targetEnv: targetEnv.name,
      dryRun,
      workflowsSynced,
      credentialsSynced,
      variablesSynced,
    });

    return {
      success: true,
      workflowsSynced,
      credentialsSynced,
      variablesSynced,
      errors,
      warnings,
    };
  }

  /**
   * Get workflows in environment
   */
  async getEnvironmentWorkflows(envId: string): Promise<EnvironmentWorkflow[]> {
    return this.envWorkflows.get(envId) || [];
  }

  /**
   * Get active environment for workflow execution
   */
  async getActiveEnvironment(): Promise<Environment> {
    // In production, use production environment
    // Otherwise, use development
    const prodEnv = await this.getEnvironmentByType(EnvironmentType.PRODUCTION);
    if (prodEnv && prodEnv.isActive && process.env.NODE_ENV === 'production') {
      return prodEnv;
    }

    const devEnv = await this.getEnvironmentByType(EnvironmentType.DEVELOPMENT);
    if (devEnv) {
      return devEnv;
    }

    // Fallback to first active environment
    const envs = await this.listEnvironments({ isActive: true });
    if (envs.length === 0) {
      throw new Error('No active environment found');
    }

    return envs[0];
  }
}

// Singleton instance
let environmentServiceInstance: EnvironmentService | null = null;

export function getEnvironmentService(): EnvironmentService {
  if (!environmentServiceInstance) {
    environmentServiceInstance = new EnvironmentService();
    logger.info('Environment service initialized');
  }

  return environmentServiceInstance;
}

export function initializeEnvironmentService(): EnvironmentService {
  if (environmentServiceInstance) {
    logger.warn('Environment service already initialized');
    return environmentServiceInstance;
  }

  environmentServiceInstance = new EnvironmentService();
  logger.info('Environment service initialized');
  return environmentServiceInstance;
}

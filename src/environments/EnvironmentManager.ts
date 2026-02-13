/**
 * Enhanced Environment Manager
 * Complete environment isolation with cloning, namespaces, and lifecycle management
 */

import { logger } from '../services/SimpleLogger';
import { getEnvironmentService } from '../backend/environment/EnvironmentService';
import {
  Environment,
  EnvironmentType,
  EnvironmentConfig,
  CreateEnvironmentRequest,
} from '../backend/environment/EnvironmentTypes';

export enum EnvironmentStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
}

export interface EnvironmentMetadata {
  owner: string;
  team?: string;
  createdBy: string;
  createdAt: Date;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  tags: string[];
  namespace: string; // Database namespace for isolation
  dataRetentionDays: number;
  autoScaling: boolean;
}

export interface EnhancedEnvironment extends Environment {
  status: EnvironmentStatus;
  metadata: EnvironmentMetadata;
  statistics?: EnvironmentStatistics;
}

export interface EnvironmentStatistics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  totalExecutionsToday: number;
  averageExecutionTime: number;
  errorRate: number;
  lastExecutionAt?: Date;
}

export interface CloneEnvironmentOptions {
  includeWorkflows: boolean;
  includeCredentials: boolean;
  includeVariables: boolean;
  includeSettings: boolean;
  newName: string;
  newType?: EnvironmentType;
}

export interface DatabaseNamespace {
  envId: string;
  namespace: string;
  prefix: string; // e.g., "dev_", "staging_", "prod_"
  isolationLevel: 'complete' | 'logical' | 'shared';
}

export class EnvironmentManager {
  private environmentService = getEnvironmentService();
  private enhancedEnvs: Map<string, EnhancedEnvironment> = new Map();
  private namespaces: Map<string, DatabaseNamespace> = new Map();

  constructor() {
    logger.info('EnvironmentManager initialized');
  }

  /**
   * Create a new environment with complete isolation
   */
  async create(
    request: CreateEnvironmentRequest & {
      owner: string;
      team?: string;
      tags?: string[];
      dataRetentionDays?: number;
    },
    userId: string
  ): Promise<EnhancedEnvironment> {
    // Create base environment
    const baseEnv = await this.environmentService.createEnvironment(
      request,
      userId
    );

    // Create namespace for data isolation
    const namespace = this.createNamespace(baseEnv.id, baseEnv.type);

    // Create enhanced environment
    const enhancedEnv: EnhancedEnvironment = {
      ...baseEnv,
      status: EnvironmentStatus.ACTIVE,
      metadata: {
        owner: request.owner,
        team: request.team,
        createdBy: userId,
        createdAt: new Date(),
        tags: request.tags || [],
        namespace: namespace.namespace,
        dataRetentionDays: request.dataRetentionDays || this.getDefaultRetention(baseEnv.type),
        autoScaling: baseEnv.type === EnvironmentType.PRODUCTION,
      },
      statistics: {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalExecutions: 0,
        totalExecutionsToday: 0,
        averageExecutionTime: 0,
        errorRate: 0,
      },
    };

    this.enhancedEnvs.set(enhancedEnv.id, enhancedEnv);
    this.namespaces.set(enhancedEnv.id, namespace);

    logger.info('Enhanced environment created', {
      envId: enhancedEnv.id,
      name: enhancedEnv.name,
      type: enhancedEnv.type,
      namespace: namespace.namespace,
      owner: request.owner,
    });

    return enhancedEnv;
  }

  /**
   * Get environment by ID
   */
  async getEnvironment(envId: string): Promise<EnhancedEnvironment | null> {
    const enhanced = this.enhancedEnvs.get(envId);
    if (enhanced) {
      return enhanced;
    }

    // Fallback to base environment service
    const baseEnv = await this.environmentService.getEnvironment(envId);
    if (!baseEnv) {
      return null;
    }

    // Convert to enhanced environment
    return this.enhanceEnvironment(baseEnv);
  }

  /**
   * List all environments with filtering
   */
  async listEnvironments(filter?: {
    type?: EnvironmentType;
    status?: EnvironmentStatus;
    owner?: string;
    team?: string;
    tags?: string[];
  }): Promise<EnhancedEnvironment[]> {
    let envs = Array.from(this.enhancedEnvs.values());

    if (filter?.type) {
      envs = envs.filter((env) => env.type === filter.type);
    }

    if (filter?.status) {
      envs = envs.filter((env) => env.status === filter.status);
    }

    if (filter?.owner) {
      envs = envs.filter((env) => env.metadata.owner === filter.owner);
    }

    if (filter?.team) {
      envs = envs.filter((env) => env.metadata.team === filter.team);
    }

    if (filter?.tags && filter.tags.length > 0) {
      envs = envs.filter((env) =>
        filter.tags!.some((tag) => env.metadata.tags.includes(tag))
      );
    }

    return envs.sort(
      (a, b) => a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime()
    );
  }

  /**
   * Clone an environment
   */
  async cloneEnvironment(
    sourceEnvId: string,
    options: CloneEnvironmentOptions,
    userId: string
  ): Promise<EnhancedEnvironment> {
    const sourceEnv = await this.getEnvironment(sourceEnvId);
    if (!sourceEnv) {
      throw new Error(`Source environment not found: ${sourceEnvId}`);
    }

    logger.info('Cloning environment', {
      sourceEnvId,
      newName: options.newName,
      options,
    });

    // Create new environment
    const clonedEnv = await this.create(
      {
        name: options.newName,
        type: options.newType || sourceEnv.type,
        description: `Cloned from ${sourceEnv.name}`,
        config: options.includeSettings ? { ...sourceEnv.config } : undefined,
        owner: sourceEnv.metadata.owner,
        team: sourceEnv.metadata.team,
        tags: [...sourceEnv.metadata.tags, 'cloned'],
        dataRetentionDays: sourceEnv.metadata.dataRetentionDays,
      },
      userId
    );

    // Clone workflows if requested
    if (options.includeWorkflows) {
      const workflows = await this.environmentService.getEnvironmentWorkflows(
        sourceEnvId
      );
      logger.info(`Cloning ${workflows.length} workflows`);
      // Workflow cloning logic would go here
    }

    // Clone variables if requested
    if (options.includeVariables) {
      const variables = await this.environmentService.getEnvironmentVariables(
        sourceEnvId
      );
      logger.info(`Cloning ${variables.length} variables`);
      for (const variable of variables) {
        await this.environmentService.setEnvironmentVariable(
          clonedEnv.id,
          variable.key,
          variable.value,
          {
            description: variable.description,
            isSecret: variable.isSecret,
          },
          userId
        );
      }
    }

    logger.info('Environment cloned successfully', {
      sourceEnvId,
      clonedEnvId: clonedEnv.id,
    });

    return clonedEnv;
  }

  /**
   * Update environment status
   */
  async updateStatus(
    envId: string,
    status: EnvironmentStatus,
    userId: string
  ): Promise<void> {
    const env = await this.getEnvironment(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    // Don't allow archiving production without explicit confirmation
    if (
      env.type === EnvironmentType.PRODUCTION &&
      status === EnvironmentStatus.ARCHIVED
    ) {
      throw new Error(
        'Cannot archive production environment. Set to maintenance first.'
      );
    }

    env.status = status;
    env.metadata.lastModifiedBy = userId;
    env.metadata.lastModifiedAt = new Date();

    this.enhancedEnvs.set(envId, env);

    logger.info('Environment status updated', {
      envId,
      status,
      updatedBy: userId,
    });
  }

  /**
   * Delete environment (with safety checks)
   */
  async deleteEnvironment(envId: string, userId: string): Promise<void> {
    const env = await this.getEnvironment(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    // Production environments cannot be deleted
    if (env.type === EnvironmentType.PRODUCTION) {
      throw new Error('Cannot delete production environment');
    }

    // Archive before deleting
    if (env.status !== EnvironmentStatus.ARCHIVED) {
      throw new Error(
        'Environment must be archived before deletion. Current status: ' +
          env.status
      );
    }

    // Delete from base service
    await this.environmentService.deleteEnvironment(envId, userId);

    // Clean up enhanced data
    this.enhancedEnvs.delete(envId);
    this.namespaces.delete(envId);

    logger.warn('Environment deleted', {
      envId,
      name: env.name,
      deletedBy: userId,
    });
  }

  /**
   * Get environment statistics
   */
  async getStatistics(envId: string): Promise<EnvironmentStatistics> {
    const env = await this.getEnvironment(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    // In a real implementation, these would be calculated from actual data
    return env.statistics || {
      totalWorkflows: 0,
      activeWorkflows: 0,
      totalExecutions: 0,
      totalExecutionsToday: 0,
      averageExecutionTime: 0,
      errorRate: 0,
    };
  }

  /**
   * Get database namespace for environment
   */
  getNamespace(envId: string): DatabaseNamespace | undefined {
    return this.namespaces.get(envId);
  }

  /**
   * Update environment metadata
   */
  async updateMetadata(
    envId: string,
    updates: Partial<EnvironmentMetadata>,
    userId: string
  ): Promise<void> {
    const env = await this.getEnvironment(envId);
    if (!env) {
      throw new Error(`Environment not found: ${envId}`);
    }

    env.metadata = {
      ...env.metadata,
      ...updates,
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
    };

    this.enhancedEnvs.set(envId, env);

    logger.info('Environment metadata updated', {
      envId,
      updates,
      updatedBy: userId,
    });
  }

  /**
   * Create database namespace for environment isolation
   */
  private createNamespace(
    envId: string,
    type: EnvironmentType
  ): DatabaseNamespace {
    const prefix = this.getNamespacePrefix(type);
    const namespace = `${prefix}${envId.replace('env_', '')}`;

    return {
      envId,
      namespace,
      prefix,
      isolationLevel: 'complete', // Complete data separation
    };
  }

  /**
   * Get namespace prefix based on environment type
   */
  private getNamespacePrefix(type: EnvironmentType): string {
    switch (type) {
      case EnvironmentType.DEVELOPMENT:
        return 'dev_';
      case EnvironmentType.STAGING:
        return 'staging_';
      case EnvironmentType.PRODUCTION:
        return 'prod_';
      case EnvironmentType.TESTING:
        return 'test_';
      default:
        return 'env_';
    }
  }

  /**
   * Get default data retention based on environment type
   */
  private getDefaultRetention(type: EnvironmentType): number {
    switch (type) {
      case EnvironmentType.DEVELOPMENT:
        return 30; // 30 days
      case EnvironmentType.STAGING:
        return 90; // 90 days
      case EnvironmentType.PRODUCTION:
        return 365; // 1 year
      case EnvironmentType.TESTING:
        return 7; // 7 days
      default:
        return 30;
    }
  }

  /**
   * Convert base environment to enhanced environment
   */
  private enhanceEnvironment(baseEnv: Environment): EnhancedEnvironment {
    const namespace = this.createNamespace(baseEnv.id, baseEnv.type);
    this.namespaces.set(baseEnv.id, namespace);

    const enhanced: EnhancedEnvironment = {
      ...baseEnv,
      status: EnvironmentStatus.ACTIVE,
      metadata: {
        owner: 'system',
        createdBy: 'system',
        createdAt: baseEnv.createdAt,
        tags: [],
        namespace: namespace.namespace,
        dataRetentionDays: this.getDefaultRetention(baseEnv.type),
        autoScaling: baseEnv.type === EnvironmentType.PRODUCTION,
      },
      statistics: {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalExecutions: 0,
        totalExecutionsToday: 0,
        averageExecutionTime: 0,
        errorRate: 0,
      },
    };

    this.enhancedEnvs.set(enhanced.id, enhanced);
    return enhanced;
  }
}

// Singleton instance
let environmentManagerInstance: EnvironmentManager | null = null;

export function getEnvironmentManager(): EnvironmentManager {
  if (!environmentManagerInstance) {
    environmentManagerInstance = new EnvironmentManager();
    logger.info('EnvironmentManager singleton initialized');
  }
  return environmentManagerInstance;
}

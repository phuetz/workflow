/**
 * Environment Manager System
 * Manage different environments (dev, staging, production) for workflows
 */

import { Workflow } from '../types/workflowTypes';
import { logger } from '../services/SimpleLogger';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export type EnvironmentType = 'development' | 'staging' | 'production' | 'custom';

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  description?: string;
  config: EnvironmentConfig;
  variables: Record<string, any>;
  secrets: Record<string, string>;
  credentials: Record<string, CredentialConfig>;
  features: FeatureFlags;
  deployments: DeploymentRecord[];
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentConfig {
  apiUrl?: string;
  databaseUrl?: string;
  redisUrl?: string;
  logLevel?: string;
  maxWorkers?: number;
  timeout?: number;
  retryAttempts?: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  monitoring?: {
    enabled: boolean;
    provider?: string;
    config?: any;
  };
  backup?: {
    enabled: boolean;
    frequency?: string;
    retention?: number;
  };
  security?: {
    encryption: boolean;
    mfa: boolean;
    ipWhitelist?: string[];
  };
}

export interface CredentialConfig {
  id: string;
  name: string;
  type: string;
  encrypted: boolean;
  value?: string;
  reference?: string; // Reference to external secret manager
}

export interface FeatureFlags {
  [key: string]: boolean | string | number;
}

export interface DeploymentRecord {
  id: string;
  workflowId: string;
  version: string;
  deployedBy: string;
  deployedAt: Date;
  status: 'success' | 'failed' | 'rollback';
  duration: number;
  logs?: string[];
}

export interface EnvironmentPromotion {
  id: string;
  sourceEnv: string;
  targetEnv: string;
  workflowId: string;
  version: string;
  promotedBy: string;
  promotedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvals?: Array<{
    approver: string;
    approved: boolean;
    timestamp: Date;
    comments?: string;
  }>;
  tests?: TestResult[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface EnvironmentVariable {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  encrypted?: boolean;
  description?: string;
}

export class EnvironmentManager extends EventEmitter {
  private environments: Map<string, Environment> = new Map();
  private currentEnvironment: string = 'development';
  private promotions: Map<string, EnvironmentPromotion> = new Map();
  private encryptionKey: string;

  constructor() {
    super();
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.initializeDefaultEnvironments();
  }

  /**
   * Initialize default environments
   */
  private initializeDefaultEnvironments(): void {
    // Development environment
    this.createEnvironment({
      name: 'development',
      type: 'development',
      description: 'Development environment for testing',
      config: {
        apiUrl: 'http://localhost:3000',
        databaseUrl: 'postgresql://localhost/workflow_dev',
        logLevel: 'debug',
        maxWorkers: 2,
        timeout: 60000,
        retryAttempts: 1,
        monitoring: {
          enabled: false
        },
        security: {
          encryption: false,
          mfa: false
        }
      },
      variables: {
        DEBUG: true,
        NODE_ENV: 'development'
      },
      secrets: {},
      credentials: {},
      features: {
        debugMode: true,
        hotReload: true,
        testMode: true
      }
    });

    // Staging environment
    this.createEnvironment({
      name: 'staging',
      type: 'staging',
      description: 'Staging environment for pre-production testing',
      config: {
        apiUrl: 'https://staging.api.example.com',
        databaseUrl: 'postgresql://staging.db.example.com/workflow',
        logLevel: 'info',
        maxWorkers: 4,
        timeout: 30000,
        retryAttempts: 3,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerHour: 5000
        },
        monitoring: {
          enabled: true,
          provider: 'datadog'
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          retention: 7
        },
        security: {
          encryption: true,
          mfa: false
        }
      },
      variables: {
        NODE_ENV: 'staging'
      },
      secrets: {},
      credentials: {},
      features: {
        debugMode: false,
        hotReload: false,
        testMode: true
      }
    });

    // Production environment
    this.createEnvironment({
      name: 'production',
      type: 'production',
      description: 'Production environment',
      config: {
        apiUrl: 'https://api.example.com',
        databaseUrl: 'postgresql://prod.db.example.com/workflow',
        logLevel: 'warn',
        maxWorkers: 10,
        timeout: 15000,
        retryAttempts: 5,
        rateLimit: {
          requestsPerMinute: 1000,
          requestsPerHour: 50000
        },
        monitoring: {
          enabled: true,
          provider: 'datadog',
          config: {
            apiKey: '***',
            appKey: '***'
          }
        },
        backup: {
          enabled: true,
          frequency: 'hourly',
          retention: 30
        },
        security: {
          encryption: true,
          mfa: true,
          ipWhitelist: []
        }
      },
      variables: {
        NODE_ENV: 'production'
      },
      secrets: {},
      credentials: {},
      features: {
        debugMode: false,
        hotReload: false,
        testMode: false
      }
    });
  }

  /**
   * Create new environment
   */
  createEnvironment(params: Omit<Environment, 'id' | 'createdAt' | 'updatedAt' | 'deployments' | 'status'>): Environment {
    const environment: Environment = {
      ...params,
      id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deployments: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.environments.set(environment.name, environment);
    
    this.emit('environment-created', environment);
    
    logger.info(`Created environment: ${environment.name}`);
    
    return environment;
  }

  /**
   * Get environment by name
   */
  getEnvironment(name: string): Environment | undefined {
    return this.environments.get(name);
  }

  /**
   * Get all environments
   */
  getAllEnvironments(): Environment[] {
    return Array.from(this.environments.values());
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    const env = this.environments.get(this.currentEnvironment);
    if (!env) {
      throw new Error(`Current environment ${this.currentEnvironment} not found`);
    }
    return env;
  }

  /**
   * Switch environment
   */
  switchEnvironment(name: string): void {
    const environment = this.environments.get(name);
    
    if (!environment) {
      throw new Error(`Environment ${name} not found`);
    }
    
    const previousEnv = this.currentEnvironment;
    this.currentEnvironment = name;
    
    // Apply environment configuration
    this.applyEnvironmentConfig(environment);
    
    this.emit('environment-switched', {
      from: previousEnv,
      to: name,
      environment
    });
    
    logger.info(`Switched to environment: ${name}`);
  }

  /**
   * Apply environment configuration
   */
  private applyEnvironmentConfig(environment: Environment): void {
    // Set environment variables
    for (const [key, value] of Object.entries(environment.variables)) {
      process.env[key] = String(value);
    }
    
    // Apply feature flags
    global.FEATURE_FLAGS = environment.features;
    
    // Configure logging
    if (environment.config.logLevel) {
      logger.setLevel(environment.config.logLevel as any);
    }
  }

  /**
   * Update environment variable
   */
  setVariable(
    environmentName: string,
    key: string,
    value: any,
    options?: { encrypted?: boolean; description?: string }
  ): void {
    const environment = this.environments.get(environmentName);
    
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    if (options?.encrypted) {
      value = this.encrypt(String(value));
    }
    
    environment.variables[key] = value;
    environment.updatedAt = new Date();
    
    this.emit('variable-updated', {
      environment: environmentName,
      key,
      encrypted: options?.encrypted
    });
  }

  /**
   * Set secret
   */
  setSecret(environmentName: string, key: string, value: string): void {
    const environment = this.environments.get(environmentName);
    
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    // Always encrypt secrets
    environment.secrets[key] = this.encrypt(value);
    environment.updatedAt = new Date();
    
    this.emit('secret-updated', {
      environment: environmentName,
      key
    });
  }

  /**
   * Get decrypted secret
   */
  getSecret(environmentName: string, key: string): string | undefined {
    const environment = this.environments.get(environmentName);
    
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    const encrypted = environment.secrets[key];
    
    if (!encrypted) {
      return undefined;
    }
    
    return this.decrypt(encrypted);
  }

  /**
   * Set credential
   */
  setCredential(environmentName: string, credential: CredentialConfig): void {
    const environment = this.environments.get(environmentName);
    
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    if (credential.value && credential.encrypted) {
      credential.value = this.encrypt(credential.value);
    }
    
    environment.credentials[credential.id] = credential;
    environment.updatedAt = new Date();
    
    this.emit('credential-updated', {
      environment: environmentName,
      credentialId: credential.id
    });
  }

  /**
   * Deploy workflow to environment
   */
  async deployWorkflow(
    workflow: Workflow,
    targetEnvironment: string,
    options?: {
      version?: string;
      deployedBy?: string;
      runTests?: boolean;
    }
  ): Promise<DeploymentRecord> {
    const environment = this.environments.get(targetEnvironment);
    
    if (!environment) {
      throw new Error(`Environment ${targetEnvironment} not found`);
    }
    
    if (environment.status !== 'active') {
      throw new Error(`Environment ${targetEnvironment} is not active`);
    }
    
    const deploymentId = `deploy_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      // Run pre-deployment tests if required
      if (options?.runTests) {
        const testResults = await this.runDeploymentTests(workflow, environment);
        
        if (testResults.some(t => !t.passed)) {
          throw new Error('Pre-deployment tests failed');
        }
      }
      
      // Simulate deployment process
      await this.performDeployment(workflow, environment);
      
      const deployment: DeploymentRecord = {
        id: deploymentId,
        workflowId: workflow.id,
        version: options?.version || '1.0.0',
        deployedBy: options?.deployedBy || 'system',
        deployedAt: new Date(),
        status: 'success',
        duration: Date.now() - startTime
      };
      
      environment.deployments.push(deployment);
      environment.updatedAt = new Date();
      
      this.emit('workflow-deployed', {
        deployment,
        environment: targetEnvironment
      });
      
      logger.info(`Deployed workflow ${workflow.id} to ${targetEnvironment}`);
      
      return deployment;
    } catch (error) {
      const deployment: DeploymentRecord = {
        id: deploymentId,
        workflowId: workflow.id,
        version: options?.version || '1.0.0',
        deployedBy: options?.deployedBy || 'system',
        deployedAt: new Date(),
        status: 'failed',
        duration: Date.now() - startTime,
        logs: [(error as Error).message]
      };
      
      environment.deployments.push(deployment);
      
      throw error;
    }
  }

  /**
   * Perform actual deployment
   */
  private async performDeployment(workflow: Workflow, environment: Environment): Promise<void> {
    // Simulate deployment steps
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, would:
    // 1. Upload workflow to environment
    // 2. Update database
    // 3. Restart services if needed
    // 4. Verify deployment
  }

  /**
   * Run deployment tests
   */
  private async runDeploymentTests(workflow: Workflow, environment: Environment): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    // Simulate running tests
    tests.push({
      name: 'Workflow validation',
      passed: true,
      duration: 100
    });
    
    tests.push({
      name: 'Node connectivity',
      passed: true,
      duration: 200
    });
    
    tests.push({
      name: 'Performance test',
      passed: true,
      duration: 500
    });
    
    return tests;
  }

  /**
   * Promote workflow between environments
   */
  async promoteWorkflow(
    workflowId: string,
    sourceEnv: string,
    targetEnv: string,
    options?: {
      version?: string;
      promotedBy?: string;
      requireApproval?: boolean;
    }
  ): Promise<EnvironmentPromotion> {
    const source = this.environments.get(sourceEnv);
    const target = this.environments.get(targetEnv);
    
    if (!source || !target) {
      throw new Error('Source or target environment not found');
    }
    
    // Check environment hierarchy
    if (!this.canPromote(source.type, target.type)) {
      throw new Error(`Cannot promote from ${source.type} to ${target.type}`);
    }
    
    const promotion: EnvironmentPromotion = {
      id: `promo_${Date.now()}`,
      sourceEnv,
      targetEnv,
      workflowId,
      version: options?.version || '1.0.0',
      promotedBy: options?.promotedBy || 'system',
      promotedAt: new Date(),
      status: options?.requireApproval ? 'pending' : 'approved',
      approvals: [],
      tests: []
    };
    
    this.promotions.set(promotion.id, promotion);
    
    if (!options?.requireApproval) {
      // Auto-approve and execute promotion
      await this.executePromotion(promotion);
    } else {
      this.emit('promotion-pending', promotion);
    }
    
    return promotion;
  }

  /**
   * Check if promotion is allowed
   */
  private canPromote(sourceType: EnvironmentType, targetType: EnvironmentType): boolean {
    const hierarchy = ['development', 'staging', 'production'];
    const sourceIndex = hierarchy.indexOf(sourceType);
    const targetIndex = hierarchy.indexOf(targetType);
    
    // Can only promote forward in hierarchy
    return sourceIndex >= 0 && targetIndex >= 0 && targetIndex > sourceIndex;
  }

  /**
   * Execute promotion
   */
  private async executePromotion(promotion: EnvironmentPromotion): Promise<void> {
    promotion.status = 'completed';
    
    // In real implementation would:
    // 1. Get workflow from source environment
    // 2. Run tests
    // 3. Deploy to target environment
    // 4. Verify deployment
    
    this.emit('promotion-completed', promotion);
    
    logger.info(`Promoted workflow ${promotion.workflowId} from ${promotion.sourceEnv} to ${promotion.targetEnv}`);
  }

  /**
   * Approve promotion
   */
  approvePromotion(promotionId: string, approver: string, comments?: string): void {
    const promotion = this.promotions.get(promotionId);
    
    if (!promotion) {
      throw new Error('Promotion not found');
    }
    
    promotion.approvals?.push({
      approver,
      approved: true,
      timestamp: new Date(),
      comments
    });
    
    promotion.status = 'approved';
    
    // Execute promotion
    this.executePromotion(promotion);
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(environmentName: string, deploymentId: string): Promise<void> {
    const environment = this.environments.get(environmentName);
    
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    const deployment = environment.deployments.find(d => d.id === deploymentId);
    
    if (!deployment) {
      throw new Error('Deployment not found');
    }
    
    deployment.status = 'rollback';
    
    this.emit('deployment-rollback', {
      environment: environmentName,
      deployment
    });
    
    logger.info(`Rolled back deployment ${deploymentId} in ${environmentName}`);
  }

  /**
   * Clone environment
   */
  cloneEnvironment(sourceName: string, targetName: string): Environment {
    const source = this.environments.get(sourceName);
    
    if (!source) {
      throw new Error(`Source environment ${sourceName} not found`);
    }
    
    const cloned = this.createEnvironment({
      name: targetName,
      type: 'custom',
      description: `Cloned from ${sourceName}`,
      config: { ...source.config },
      variables: { ...source.variables },
      secrets: { ...source.secrets },
      credentials: { ...source.credentials },
      features: { ...source.features }
    });
    
    this.emit('environment-cloned', {
      source: sourceName,
      target: targetName
    });
    
    return cloned;
  }

  /**
   * Encrypt value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt value
   */
  private decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Export environment configuration
   */
  exportEnvironment(name: string): string {
    const environment = this.environments.get(name);
    
    if (!environment) {
      throw new Error(`Environment ${name} not found`);
    }
    
    // Remove sensitive data
    const exported = {
      ...environment,
      secrets: undefined,
      credentials: Object.keys(environment.credentials)
    };
    
    return JSON.stringify(exported, null, 2);
  }

  /**
   * Import environment configuration
   */
  importEnvironment(data: string): Environment {
    const imported = JSON.parse(data);
    
    return this.createEnvironment({
      name: imported.name,
      type: imported.type,
      description: imported.description,
      config: imported.config,
      variables: imported.variables,
      secrets: {},
      credentials: {},
      features: imported.features
    });
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(environmentName: string, limit?: number): DeploymentRecord[] {
    const environment = this.environments.get(environmentName);
    
    if (!environment) {
      throw new Error(`Environment ${environmentName} not found`);
    }
    
    const deployments = [...environment.deployments].reverse();
    
    return limit ? deployments.slice(0, limit) : deployments;
  }

  /**
   * Get environment statistics
   */
  getStatistics(environmentName?: string): any {
    if (environmentName) {
      const environment = this.environments.get(environmentName);
      
      if (!environment) {
        throw new Error(`Environment ${environmentName} not found`);
      }
      
      return {
        totalDeployments: environment.deployments.length,
        successfulDeployments: environment.deployments.filter(d => d.status === 'success').length,
        failedDeployments: environment.deployments.filter(d => d.status === 'failed').length,
        averageDeploymentTime: environment.deployments.reduce((sum, d) => sum + d.duration, 0) / environment.deployments.length || 0,
        lastDeployment: environment.deployments[environment.deployments.length - 1]
      };
    }
    
    // Global statistics
    const stats: any = {
      totalEnvironments: this.environments.size,
      activeEnvironments: Array.from(this.environments.values()).filter(e => e.status === 'active').length,
      totalDeployments: 0,
      totalPromotions: this.promotions.size
    };

    for (const env of Array.from(this.environments.values())) {
      stats.totalDeployments += env.deployments.length;
    }
    
    return stats;
  }
}

// Extend global namespace for feature flags
declare global {
  var FEATURE_FLAGS: FeatureFlags;
}

// Export singleton instance
export const environmentManager = new EnvironmentManager();
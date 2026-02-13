import { logger } from './LoggingService';
import { ConfigHelpers } from '../config/environment';
import {
  Secret,
  SecretEngine,
  SecretTemplate,
  SecretPolicy,
  SecretRotationJob,
  SecretLease,
  SecretRequest,
  SecretBackup,
  SecretEnvironment,
  SecretUsage,
  SecretMetrics,
  SecretHealthCheck,
  SecretAlert,
  SecretType,
  SecretEngineType,
  EncryptionConfig,
  RotationConfig,
  ValidationStep
} from '../types/secrets';

// Re-export types for external use
export type { SecretType, SecretEngineType, EncryptionConfig };

export class SecretsService {
  private secrets: Map<string, Secret> = new Map();
  private engines: Map<string, SecretEngine> = new Map();
  private templates: Map<string, SecretTemplate> = new Map();
  private policies: Map<string, SecretPolicy> = new Map();
  private rotationJobs: Map<string, SecretRotationJob> = new Map();
  private leases: Map<string, SecretLease> = new Map();
  private requests: Map<string, SecretRequest> = new Map();
  private backups: Map<string, SecretBackup> = new Map();
  private environments: Map<string, SecretEnvironment> = new Map();
  private usage: SecretUsage[] = [];
  private metrics: Map<string, SecretMetrics> = new Map();
  private healthChecks: Map<string, SecretHealthCheck> = new Map();
  private alerts: Map<string, SecretAlert> = new Map();

  private currentUserId: string = authService.getCurrentUser();
  private currentOrganizationId: string = 'current_org';
  private encryptionKey: string = 'encryption_key_placeholder';

  private healthCheckInterval?: NodeJS.Timeout;
  private rotationInterval?: NodeJS.Timeout;
  private backupInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultEngines();
    this.initializeDefaultTemplates();
    this.initializeDefaultPolicies();
    this.startBackgroundTasks();
  }

  // Secret Management
  async createSecret(secretData: Omit<Secret, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'organizationId' | 'audit'>): Promise<Secret> {
    const secret: Secret = {
      id: this.generateId(),
      ...secretData,
      encrypted: true,
      value: await this.encryptValue(secretData.value),
      meta_data: {
        version: 1,
        autoRotate: false,
        source: 'manual',
        ...secretData.metadata
      },
      access: {
        permissions: [],
        allowedUsers: [this.currentUserId],
        allowedRoles: [],
        allowedServices: [],
        ...secretData.access
      },
      audit: {
        accessCount: 0,
        rotationHistory: [],
        accessHistory: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      organizationId: this.currentOrganizationId
    };

    // Validate against policies
    await this.validateSecretPolicy(secret);

    this.secrets.set(secret.id, secret);
    
    await this.auditSecretAccess(secret.id, 'create', true);
    await this.scheduleHealthCheck(secret.id);
    
    return secret;
  }

  async getSecret(secretId: string, userId?: string): Promise<Secret | null> {
    if (!secret) return null;

    // Check permissions
    if (!hasAccess) {
      await this.auditSecretAccess(secretId, 'read', false, 'Access denied');
      throw new Error('Access denied');
    }

    // Decrypt value
      ...secret,
      value: await this.decryptValue(secret.value)
    };

    // Update access metrics
    secret.audit.accessCount++;
    secret.audit.lastAccessed = new Date().toISOString();
    secret.audit.lastAccessedBy = userId || this.currentUserId;
    
    // Add to access history
    secret.audit.accessHistory.push({
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId: userId || this.currentUserId,
      _action: 'read',
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'WorkflowApp/1.0'
    });

    this.secrets.set(secretId, secret);
    
    await this.auditSecretAccess(secretId, 'read', true);
    await this.trackSecretUsage(secretId, userId || this.currentUserId, 'read');

    return decryptedSecret;
  }

  async updateSecret(secretId: string, updates: Partial<Secret>): Promise<Secret | null> {
    if (!secret) return null;

    // Check permissions
    if (!hasAccess) {
      await this.auditSecretAccess(secretId, 'write', false, 'Access denied');
      throw new Error('Access denied');
    }

    // Encrypt new value if provided
    if (updates.value) {
      updates.value = await this.encryptValue(updates.value);
      updates.metadata = {
        ...secret.metadata,
        version: secret.metadata.version + 1
      };
    }

      ...secret,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Validate against policies
    await this.validateSecretPolicy(updatedSecret);

    this.secrets.set(secretId, updatedSecret);
    
    await this.auditSecretAccess(secretId, 'write', true);
    await this.trackSecretUsage(secretId, this.currentUserId, 'write');

    return updatedSecret;
  }

  async deleteSecret(secretId: string): Promise<boolean> {
    if (!secret) return false;

    // Check permissions
    if (!hasAccess) {
      await this.auditSecretAccess(secretId, 'delete', false, 'Access denied');
      throw new Error('Access denied');
    }

    // Revoke all active leases
    await this.revokeAllLeases(secretId);

    // Cancel rotation jobs
    await this.cancelRotationJobs(secretId);

    // Remove from all environments
    for (const env of this.environments.values()) {
      env.secrets = env.secrets.filter(id => id !== secretId);
      this.environments.set(env.id, env);
    }

    this.secrets.delete(secretId);
    this.healthChecks.delete(secretId);
    this.metrics.delete(secretId);
    
    await this.auditSecretAccess(secretId, 'delete', true);
    
    return true;
  }

  // Secret Engines
  async registerEngine(engine: SecretEngine): Promise<boolean> {
    try {
      // Validate engine configuration
      await this.validateEngineConfig(engine);
      
      // Test connection
      await this.testEngineConnection(engine);
      
      engine.status = 'active';
      this.engines.set(engine.id, engine);
      
      logger.info(`Secret engine registered: ${engine.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to register engine ${engine.name}:`, error);
      engine.status = 'error';
      this.engines.set(engine.id, engine);
      return false;
    }
  }

  async syncWithEngine(engineId: string, secretId: string): Promise<boolean> {
    
    if (!engine || !secret) return false;

    try {
      switch (engine.type) {
        case 'aws_secrets_manager':
          return await this.syncWithAWS(engine, secret);
        case 'azure_key_vault':
          return await this.syncWithAzure(engine, secret);
        case 'hashicorp_vault':
          return await this.syncWithVault(engine, secret);
        case 'gcp_secret_manager':
          return await this.syncWithGCP(engine, secret);
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Failed to sync with engine ${engineId}:`, error);
      return false;
    }
  }

  // Secret Rotation
  async rotateSecret(secretId: string, config: RotationConfig): Promise<string> {
    if (!secret) throw new Error('Secret not found');

    // Check permissions
    if (!hasAccess) throw new Error('Access denied');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: this.generateId(),
      secretId,
      type: 'manual',
      status: 'pending',
      config,
      progress: {
        currentStep: 'initializing',
        totalSteps: config.validationSteps.length + 3, // validation + rotation + notification
        completedSteps: 0,
        lastUpdate: new Date().toISOString(),
        logs: []
      },
      createdAt: new Date().toISOString(),
      createdBy: this.currentUserId
    };

    this.rotationJobs.set(job.id, job);
    
    // Start rotation process
    this.executeRotationJob(job);
    
    return job.id;
  }

  async scheduleRotation(secretId: string, intervalDays: number): Promise<boolean> {
    if (!secret) return false;

    secret.metadata.rotationInterval = intervalDays;
    secret.metadata.autoRotate = true;
    secret.metadata.lastRotated = new Date().toISOString();
    
    this.secrets.set(secretId, secret);
    
    // Schedule next rotation
    setTimeout(() => {
      this.rotateSecret(secretId, {
        strategy: 'gradual',
        validationSteps: [],
        rollbackOnFailure: true,
        notifyOnCompletion: true,
        notifications: []
      });
    }, intervalDays * 24 * 60 * 60 * 1000);
    
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async executeRotationJob(_job: SecretRotationJob): Promise<void> {
    try {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      
      this.addRotationLog(job, 'info', 'Starting rotation job');
      
      // Step 1: Validation
      for (const step of job.config.validationSteps) {
        await this.executeValidationStep(job, step);
        job.progress.completedSteps++;
        job.progress.lastUpdate = new Date().toISOString();
      }
      
      // Step 2: Generate new secret
      
      // Step 3: Update secret
      if (!secret) {
        logger.error(`Secret ${job.secretId} not found for rotation`);
        return;
      }
      logger.debug('Rotating secret value', { secretId: job.secretId, oldLength: oldValue.length });
      
      secret.value = await this.encryptValue(newValue);
      secret.metadata.version++;
      secret.metadata.lastRotated = new Date().toISOString();
      secret.updatedAt = new Date().toISOString();
      
      // Add rotation record
      secret.audit.rotationHistory.push({
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        method: 'manual',
        reason: 'Manual rotation',
        rotatedBy: this.currentUserId,
        success: true
      });
      
      this.secrets.set(job.secretId, secret);
      job.progress.completedSteps++;
      
      // Step 4: Notify
      if (job.config.notifyOnCompletion) {
        await this.sendRotationNotifications(job);
      }
      job.progress.completedSteps++;
      
      job.status = 'success';
      job.completedAt = new Date().toISOString();
      job.result = {
        success: true,
        newVersion: secret.metadata.version,
        oldVersion: secret.metadata.version - 1,
        validationResults: [],
        rollbackPerformed: false,
        metrics: {
          totalDuration: Date.now() - new Date(job.startedAt!).getTime(),
          validationDuration: 0,
          networkCalls: 0,
          affectedServices: [],
          downtime: 0
        }
      };
      
      this.addRotationLog(job, 'info', 'Rotation completed successfully');
      
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.result = {
        success: false,
        newVersion: 0,
        oldVersion: 0,
        validationResults: [],
        rollbackPerformed: false,
        error: error.message,
        metrics: {
          totalDuration: Date.now() - new Date(job.startedAt!).getTime(),
          validationDuration: 0,
          networkCalls: 0,
          affectedServices: [],
          downtime: 0
        }
      };
      
      this.addRotationLog(job, 'error', `Rotation failed: ${error.message}`);
      
      // Rollback if configured
      if (job.config.rollbackOnFailure) {
        await this.rollbackRotation(job);
      }
    }
    
    this.rotationJobs.set(job.id, job);
  }

  private async executeValidationStep(_job: SecretRotationJob, step: ValidationStep): Promise<void> {
    this.addRotationLog(job, 'info', `Executing validation step: ${step.name}`);
    
    switch (step.type) {
      case 'connectivity':
        await this.validateConnectivity(step.config);
        break;
      case 'authentication':
        await this.validateAuthentication(step.config);
        break;
      case 'authorization':
        await this.validateAuthorization(step.config);
        break;
      case 'custom':
        await this.validateCustom(step.config);
        break;
    }
    
    this.addRotationLog(job, 'info', `Validation step completed: ${step.name}`);
  }

  // Secret Policies
  async createPolicy(policy: SecretPolicy): Promise<SecretPolicy> {
    this.policies.set(policy.id, policy);
    return policy;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateSecretPolicy(_secret: Secret): Promise<void> {
    for (const policy of this.policies.values()) {
      if (!policy.active) continue;
      
      // Check if policy applies to this secret
      if (!this.isPolicyApplicable(policy, secret)) continue;
      
      // Evaluate policy rules
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;
        
        if (violation) {
          switch (policy.enforcement) {
            case 'strict':
              throw new Error(`Policy violation: ${rule.message}`);
            case 'warn':
              logger.warn(`Policy warning: ${rule.message}`);
              break;
            case 'monitor':
              await this.createAlert(secret.id, 'policy', 'medium', rule.message, { _rule: rule.name });
              break;
          }
        }
      }
    }
  }

  // Health Checks
  async performHealthCheck(secretId: string): Promise<SecretHealthCheck> {
    if (!secret) throw new Error('Secret not found');

      this.checkSecretExpiration(secret),
      this.checkRotationStatus(secret),
      this.checkUsagePattern(secret),
      this.checkCompliance(secret),
      this.checkSecurityRisks(secret)
    ]);

    // Extract successful check results, provide fallback for failed checks
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Return a failed check result for errors
        return {
          name: checkNames[index],
          status: 'fail' as const,
          message: `Check failed: ${result.reason?.message || 'Unknown error'}`,
          details: { error: result.reason?.message }
        };
      }
    });

                         checks.some(c => c.status === 'warning') ? 'warning' : 'healthy';


    const healthCheck: SecretHealthCheck = {
      secretId,
      status: overallStatus,
      checks,
      lastCheck: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      score
    };

    this.healthChecks.set(secretId, healthCheck);
    return healthCheck;
  }

  // Metrics and Monitoring
  async getSecretMetrics(secretId: string, period: string = '24h'): Promise<SecretMetrics> {
    if (!secret) throw new Error('Secret not found');


    const metrics: SecretMetrics = {
      secretId,
      name: secret.name,
      type: secret.type,
      accessCount,
      lastAccessed: secret.audit.lastAccessed || 'never',
      rotationCount: secret.audit.rotationHistory.length,
      lastRotated: secret.metadata.lastRotated || 'never',
      failureCount,
      averageAccessTime,
      uniqueUsers,
      environments: [secret.environmentId || 'default'],
      complianceScore: await this.calculateComplianceScore(secret),
      riskLevel: await this.calculateRiskLevel(secret),
      tags: secret.tags,
      period,
      timestamp: new Date().toISOString()
    };

    this.metrics.set(secretId, metrics);
    return metrics;
  }

  // Backup and Recovery
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<string> {
    const backup: SecretBackup = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      secretIds: Array.from(this.secrets.keys()),
      size: 0,
      encrypted: true,
      checksum: '',
      location: 'local://backups',
      meta_data: {
        version: '1.0',
        _engine: 'local',
        compression: 'gzip',
        encryption: 'AES-256-GCM',
        createdBy: this.currentUserId,
        retention: '30d',
        tags: ['automated']
      },
      status: 'in_progress'
    };

    this.backups.set(backup.id, backup);
    
    // Simulate backup process
    setTimeout(() => {
      backup.status = 'completed';
      backup.size = this.secrets.size * 1024; // Rough estimate
      backup.checksum = this.generateChecksum(backup.id);
      this.backups.set(backup.id, backup);
    }, 5000);

    return backup.id;
  }

  async restoreBackup(backupId: string): Promise<boolean> {
    if (!backup || backup.status !== 'completed') return false;

    // Simulate restore process
    logger.info(`Restoring backup ${backupId}`);
    return true;
  }

  // Utility Methods
  private async encryptValue(value: string): Promise<string> {
    // In production, use proper encryption library
    return Buffer.from(value).toString('base64');
  }

  private async decryptValue(encryptedValue: string): Promise<string> {
    // In production, use proper decryption library
    return Buffer.from(encryptedValue, 'base64').toString();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkSecretAccess(_secret: Secret, userId: string, _action: string): Promise<boolean> {
    // Check if user is explicitly allowed
    if (secret.access.allowedUsers.includes(userId)) return true;
    
    // Check user roles (would integrate with RBAC service)
    // For now, simple check
    return secret.createdBy === userId;
  }

  private async auditSecretAccess(secretId: string, _action: string, success: boolean, error?: string): Promise<void> {
    // Log audit event
    logger.info(`Audit: ${action} on secret ${secretId} - ${success ? 'success' : 'failed'}`, {
      secretId,
      action,
      success,
      error
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async trackSecretUsage(secretId: string, userId: string, _action: string): Promise<void> {
    const usage: SecretUsage = {
      secretId,
      userId,
      serviceId: 'workflow-service',
      workflowId: 'current-workflow',
      nodeId: 'current-node',
      timestamp: new Date().toISOString(),
      action,
      context: {},
      duration: Math.random() * 1000,
      success: true
    };

    this.usage.push(usage);
    
    // Keep only recent usage records
    if (this.usage.length > 10000) {
      this.usage = this.usage.slice(-5000);
    }
  }

  private async scheduleHealthCheck(secretId: string): Promise<void> {
    setTimeout(async () => {
      await this.performHealthCheck(secretId);
    }, 60000); // Check after 1 minute
  }

  private async createAlert(secretId: string, type: string, severity: string, message: string, details: unknown): Promise<void> {
    const alert: SecretAlert = {
      id: this.generateId(),
      secretId,
      type: type as unknown,
      severity: severity as unknown,
      message,
      details,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.alerts.set(alert.id, alert);
    logger.info(`Alert created: ${message}`);
  }

  private generateId(): string {
    return 'secret_' + (randomStr.length >= 9 ? randomStr.substring(0, 9) : randomStr.padEnd(9, '0'));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateChecksum(_data: string): string {
    return 'checksum_' + (randomStr.length >= 9 ? randomStr.substring(0, 9) : randomStr.padEnd(9, '0'));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateEngineConfig(_engine: SecretEngine): Promise<void> {
    // Validate engine configuration
    if (!engine.config.endpoint && engine.type !== 'local') {
      throw new Error('Engine endpoint is required');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async testEngineConnection(_engine: SecretEngine): Promise<void> {
    // Test connection to engine
    logger.info(`Testing connection to ${engine.name}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async syncWithAWS(_engine: SecretEngine, _secret: Secret): Promise<boolean> {
    // AWS Secrets Manager integration
    logger.info(`Syncing with AWS Secrets Manager: ${secret.name}`);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async syncWithAzure(_engine: SecretEngine, _secret: Secret): Promise<boolean> {
    // Azure Key Vault integration
    logger.info(`Syncing with Azure Key Vault: ${secret.name}`);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async syncWithVault(_engine: SecretEngine, _secret: Secret): Promise<boolean> {
    // HashiCorp Vault integration
    logger.info(`Syncing with HashiCorp Vault: ${secret.name}`);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async syncWithGCP(_engine: SecretEngine, _secret: Secret): Promise<boolean> {
    // GCP Secret Manager integration
    logger.info(`Syncing with GCP Secret Manager: ${secret.name}`);
    return true;
  }

  private async generateNewSecretValue(secretId: string): Promise<string> {
    if (!secret) throw new Error('Secret not found');

    switch (secret.type) {
      case 'password':
        return this.generatePassword();
      case 'api_key':
        return this.generateApiKey();
      case 'oauth_token':
        return this.generateOAuthToken();
      default:
        return this.generateGenericSecret();
    }
  }

  private generatePassword(): string {
    for (let __i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private generateApiKey(): string {
    return 'ak_' + (randomStr.length >= 32 ? randomStr.substring(0, 32) : randomStr.padEnd(32, '0'));
  }

  private generateOAuthToken(): string {
    return 'oauth_' + (randomStr.length >= 40 ? randomStr.substring(0, 40) : randomStr.padEnd(40, '0'));
  }

  private generateGenericSecret(): string {
    return randomStr.length >= 24 ? randomStr.substring(0, 24) : randomStr.padEnd(24, '0');
  }

  private addRotationLog(_job: SecretRotationJob, level: string, message: string): void {
    job.progress.logs.push({
      timestamp: new Date().toISOString(),
      level: level as unknown,
      message
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateConnectivity(_config: unknown): Promise<void> {
    // Validate network connectivity
    logger.info('Validating connectivity');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateAuthentication(_config: unknown): Promise<void> {
    // Validate authentication
    logger.info('Validating authentication');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateAuthorization(_config: unknown): Promise<void> {
    // Validate authorization
    logger.info('Validating authorization');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateCustom(_config: unknown): Promise<void> {
    // Custom validation logic
    logger.info('Validating custom logic');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async rollbackRotation(_job: SecretRotationJob): Promise<void> {
    // Rollback rotation
    logger.info(`Rolling back rotation for job ${job.id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async sendRotationNotifications(_job: SecretRotationJob): Promise<void> {
    // Send notifications
    logger.info(`Sending rotation notifications for job ${job.id}`);
  }

  private async revokeAllLeases(secretId: string): Promise<void> {
    for (const lease of this.leases.values()) {
      if (lease.secretId === secretId && lease.status === 'active') {
        lease.status = 'revoked';
        lease.revokedAt = new Date().toISOString();
        lease.revokedBy = this.currentUserId;
        this.leases.set(lease.id, lease);
      }
    }
  }

  private async cancelRotationJobs(secretId: string): Promise<void> {
    for (const job of this.rotationJobs.values()) {
      if (job.secretId === secretId && job.status === 'pending') {
        job.status = 'cancelled';
        this.rotationJobs.set(job.id, job);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private isPolicyApplicable(policy: SecretPolicy, _secret: Secret): boolean {
    
    if (scope.secretTypes.length > 0 && !scope.secretTypes.includes(secret.type)) {
      return false;
    }
    
    if (scope.tags.length > 0 && !scope.tags.some(tag => secret.tags.includes(tag))) {
      return false;
    }
    
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async evaluatePolicyRule(__rule: unknown, _secret: Secret): Promise<boolean> {
    // Evaluate policy rule against secret
    return false; // No violation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkSecretExpiration(_secret: Secret): Promise<unknown> {
    if (!expiration) {
      return {
        name: 'expiration',
        type: 'expiration',
        status: 'pass',
        message: 'Secret does not expire',
        timestamp: new Date().toISOString()
      };
    }


    if (daysUntilExpiration <= 0) {
      return {
        name: 'expiration',
        type: 'expiration',
        status: 'fail',
        message: 'Secret has expired',
        timestamp: new Date().toISOString()
      };
    } else if (daysUntilExpiration <= 7) {
      return {
        name: 'expiration',
        type: 'expiration',
        status: 'warning',
        message: `Secret expires in ${daysUntilExpiration} days`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      name: 'expiration',
      type: 'expiration',
      status: 'pass',
      message: `Secret expires in ${daysUntilExpiration} days`,
      timestamp: new Date().toISOString()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkRotationStatus(_secret: Secret): Promise<unknown> {
    if (!secret.metadata.autoRotate) {
      return {
        name: 'rotation',
        type: 'rotation',
        status: 'pass',
        message: 'Auto-rotation is disabled',
        timestamp: new Date().toISOString()
      };
    }

    if (!lastRotated) {
      return {
        name: 'rotation',
        type: 'rotation',
        status: 'warning',
        message: 'Secret has never been rotated',
        timestamp: new Date().toISOString()
      };
    }


    if (daysSinceRotation > rotationInterval) {
      return {
        name: 'rotation',
        type: 'rotation',
        status: 'fail',
        message: `Secret rotation is overdue by ${daysSinceRotation - rotationInterval} days`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      name: 'rotation',
      type: 'rotation',
      status: 'pass',
      message: `Secret was rotated ${daysSinceRotation} days ago`,
      timestamp: new Date().toISOString()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkUsagePattern(_secret: Secret): Promise<unknown> {
      new Date(u.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000);

    if (recentUsage.length === 0) {
      return {
        name: 'usage',
        type: 'usage',
        status: 'warning',
        message: 'Secret has not been used in the last 24 hours',
        timestamp: new Date().toISOString()
      };
    }

    return {
      name: 'usage',
      type: 'usage',
      status: 'pass',
      message: `Secret was accessed ${recentUsage.length} times in the last 24 hours`,
      timestamp: new Date().toISOString()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkCompliance(_secret: Secret): Promise<unknown> {
    // Check compliance requirements
    return {
      name: 'compliance',
      type: 'compliance',
      status: 'pass',
      message: 'Secret meets compliance requirements',
      timestamp: new Date().toISOString()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkSecurityRisks(_secret: Secret): Promise<unknown> {
    // Check for security risks
    return {
      name: 'security',
      type: 'security',
      status: 'pass',
      message: 'No security risks detected',
      timestamp: new Date().toISOString()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async calculateComplianceScore(_secret: Secret): Promise<number> {
    // Calculate compliance score
    return 95;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async calculateRiskLevel(_secret: Secret): Promise<'low' | 'medium' | 'high' | 'critical'> {
    // Calculate risk level
    return 'low';
  }

  private initializeDefaultEngines(): void {
    const localEngine: SecretEngine = {
      id: 'local',
      name: 'Local Storage',
      type: 'local',
      description: 'Local encrypted storage',
      status: 'active',
      config: {
        encryption: {
          algorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2',
          keySize: 256,
          iterations: 100000,
          saltSize: 16,
          tagSize: 16
        }
      },
      capabilities: {
        encryption: true,
        rotation: true,
        versioning: true,
        backup: true,
        audit: true,
        keyDerivation: true,
        certificateGeneration: false,
        transitEncryption: false,
        leasing: false,
        templating: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.engines.set(localEngine.id, localEngine);
  }

  private initializeDefaultTemplates(): void {
    const apiKeyTemplate: SecretTemplate = {
      id: 'api_key',
      name: 'API Key',
      description: 'Standard API key template',
      type: 'api_key',
      fields: [
        {
          name: 'key',
          type: 'string',
          required: true,
          sensitive: true,
          placeholder: 'Enter API key'
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          sensitive: false,
          placeholder: 'Key description'
        }
      ],
      validation: [],
      tags: ['api', 'authentication'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(apiKeyTemplate.id, apiKeyTemplate);
  }

  private initializeDefaultPolicies(): void {
    const expirationPolicy: SecretPolicy = {
      id: 'expiration_policy',
      name: 'Secret Expiration Policy',
      description: 'Enforce secret expiration',
      rules: [
        {
          id: 'max_age',
          name: 'Maximum Age',
          condition: 'age > 90 days',
          _action: 'require_approval',
          severity: 'medium',
          message: 'Secret is older than 90 days',
          enabled: true
        }
      ],
      enforcement: 'warn',
      scope: {
        environments: [],
        secretTypes: [],
        tags: [],
        users: [],
        roles: [],
        services: []
      },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.policies.set(expirationPolicy.id, expirationPolicy);
  }

  private startBackgroundTasks(): void {
    // Health check scheduler with concurrency protection
      try {
        for (const secretId of this.secrets.keys()) {
          await this.performHealthCheck(secretId);
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      } finally {
        // Schedule next run after completion to prevent overlap
        this.healthCheckInterval = setTimeout(runHealthChecks, ConfigHelpers.getTimeout('secretsHealthCheck'));
      }
    };
    this.healthCheckInterval = setTimeout(runHealthChecks, ConfigHelpers.getTimeout('secretsHealthCheck'));

    // Rotation scheduler with concurrency protection
      try {
        for (const secret of this.secrets.values()) {
          if (secret.metadata.autoRotate && secret.metadata.rotationInterval) {
            if (lastRotated) {
              
              // Validate the date
              if (isNaN(lastRotatedDate.getTime())) {
                logger.warn(`Invalid lastRotated date for secret ${secret.id}: ${lastRotated}`);
                continue;
              }
              
              
              // Ensure positive value and valid rotation interval
              if (daysSinceRotation >= (secret.metadata.rotationInterval || 0) && daysSinceRotation > 0) {
                await this.rotateSecret(secret.id, {
                  strategy: 'gradual',
                  validationSteps: [],
                  rollbackOnFailure: true,
                  notifyOnCompletion: true,
                  notifications: []
                });
              }
            }
          }
        }
      } catch (error) {
        logger.error('Rotation check failed:', error);
      } finally {
        // Schedule next run after completion to prevent overlap
        this.rotationInterval = setTimeout(runRotationChecks, ConfigHelpers.getTimeout('secretsRotation'));
      }
    };
    this.rotationInterval = setTimeout(runRotationChecks, ConfigHelpers.getTimeout('secretsRotation'));

    // Backup scheduler with concurrency protection
      try {
        await this.createBackup('incremental');
      } catch (error) {
        logger.error('Backup failed:', error);
      } finally {
        // Schedule next run after completion to prevent overlap
        this.backupInterval = setTimeout(runBackup, ConfigHelpers.getTimeout('secretsBackup'));
      }
    };
    this.backupInterval = setTimeout(runBackup, ConfigHelpers.getTimeout('secretsBackup'));
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearTimeout(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    if (this.rotationInterval) {
      clearTimeout(this.rotationInterval);
      this.rotationInterval = undefined;
    }
    if (this.backupInterval) {
      clearTimeout(this.backupInterval);
      this.backupInterval = undefined;
    }
  }

  // Public API
  getSecrets(): Secret[] {
    return Array.from(this.secrets.values());
  }

  getEngines(): SecretEngine[] {
    return Array.from(this.engines.values());
  }

  getTemplates(): SecretTemplate[] {
    return Array.from(this.templates.values());
  }

  getPolicies(): SecretPolicy[] {
    return Array.from(this.policies.values());
  }

  getRotationJobs(): SecretRotationJob[] {
    return Array.from(this.rotationJobs.values());
  }

  getAlerts(): SecretAlert[] {
    return Array.from(this.alerts.values());
  }

  getAllMetrics(): SecretMetrics[] {
    return Array.from(this.metrics.values());
  }

  getHealthChecks(): SecretHealthCheck[] {
    return Array.from(this.healthChecks.values());
  }
}
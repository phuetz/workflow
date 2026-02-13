/**
 * Environment RBAC (Role-Based Access Control)
 * Environment-specific permissions and access control
 */

import { logger } from '../services/SimpleLogger';
import { getEnvironmentManager, EnhancedEnvironment } from './EnvironmentManager';
import { EnvironmentType } from '../backend/environment/EnvironmentTypes';
import { Role, Permission } from '../backend/auth/RBACService';

export enum EnvironmentPermission {
  // Environment management
  ENV_VIEW = 'env:view',
  ENV_CREATE = 'env:create',
  ENV_UPDATE = 'env:update',
  ENV_DELETE = 'env:delete',
  ENV_CLONE = 'env:clone',

  // Workflow operations per environment
  ENV_WORKFLOW_VIEW = 'env:workflow:view',
  ENV_WORKFLOW_EXECUTE = 'env:workflow:execute',
  ENV_WORKFLOW_DEPLOY = 'env:workflow:deploy',
  ENV_WORKFLOW_DELETE = 'env:workflow:delete',

  // Credential operations per environment
  ENV_CREDENTIAL_VIEW = 'env:credential:view',
  ENV_CREDENTIAL_USE = 'env:credential:use',
  ENV_CREDENTIAL_CREATE = 'env:credential:create',
  ENV_CREDENTIAL_UPDATE = 'env:credential:update',
  ENV_CREDENTIAL_DELETE = 'env:credential:delete',

  // Promotion operations
  ENV_PROMOTE_REQUEST = 'env:promote:request',
  ENV_PROMOTE_APPROVE = 'env:promote:approve',
  ENV_PROMOTE_ROLLBACK = 'env:promote:rollback',

  // Environment variables
  ENV_VAR_VIEW = 'env:var:view',
  ENV_VAR_CREATE = 'env:var:create',
  ENV_VAR_UPDATE = 'env:var:update',
  ENV_VAR_DELETE = 'env:var:delete',

  // Audit and monitoring
  ENV_AUDIT_VIEW = 'env:audit:view',
  ENV_METRICS_VIEW = 'env:metrics:view',
}

export enum EnvironmentRole {
  // Global roles
  ADMIN = 'admin',
  OPERATOR = 'operator',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',

  // Environment-specific roles
  ENV_OWNER = 'env:owner',
  ENV_MAINTAINER = 'env:maintainer',
  ENV_CONTRIBUTOR = 'env:contributor',
  ENV_READER = 'env:reader',
}

export interface EnvironmentRoleDefinition {
  role: EnvironmentRole;
  permissions: EnvironmentPermission[];
  description: string;
  applicableEnvironments: EnvironmentType[];
}

export interface UserEnvironmentAccess {
  userId: string;
  environmentId: string;
  roles: EnvironmentRole[];
  customPermissions: EnvironmentPermission[];
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

export interface EnvironmentAPIKey {
  id: string;
  name: string;
  environmentId: string;
  key: string; // Hashed
  permissions: EnvironmentPermission[];
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

export class EnvironmentRBAC {
  private envManager = getEnvironmentManager();
  private roleDefinitions: Map<EnvironmentRole, EnvironmentRoleDefinition> = new Map();
  private userAccess: Map<string, UserEnvironmentAccess[]> = new Map(); // userId -> access grants
  private apiKeys: Map<string, EnvironmentAPIKey> = new Map();

  constructor() {
    this.initializeRoleDefinitions();
  }

  /**
   * Initialize role definitions
   */
  private initializeRoleDefinitions(): void {
    // Admin - Full access to all environments
    this.roleDefinitions.set(EnvironmentRole.ADMIN, {
      role: EnvironmentRole.ADMIN,
      permissions: Object.values(EnvironmentPermission),
      description: 'Full access to all environments and operations',
      applicableEnvironments: Object.values(EnvironmentType),
    });

    // Operator - All environments, read + execute
    this.roleDefinitions.set(EnvironmentRole.OPERATOR, {
      role: EnvironmentRole.OPERATOR,
      permissions: [
        EnvironmentPermission.ENV_VIEW,
        EnvironmentPermission.ENV_WORKFLOW_VIEW,
        EnvironmentPermission.ENV_WORKFLOW_EXECUTE,
        EnvironmentPermission.ENV_CREDENTIAL_VIEW,
        EnvironmentPermission.ENV_CREDENTIAL_USE,
        EnvironmentPermission.ENV_VAR_VIEW,
        EnvironmentPermission.ENV_AUDIT_VIEW,
        EnvironmentPermission.ENV_METRICS_VIEW,
        EnvironmentPermission.ENV_PROMOTE_ROLLBACK,
      ],
      description: 'Read-only access to all environments with execution rights',
      applicableEnvironments: Object.values(EnvironmentType),
    });

    // Developer - Dev + Staging access, limited production
    this.roleDefinitions.set(EnvironmentRole.DEVELOPER, {
      role: EnvironmentRole.DEVELOPER,
      permissions: [
        EnvironmentPermission.ENV_VIEW,
        EnvironmentPermission.ENV_WORKFLOW_VIEW,
        EnvironmentPermission.ENV_WORKFLOW_EXECUTE,
        EnvironmentPermission.ENV_WORKFLOW_DEPLOY,
        EnvironmentPermission.ENV_CREDENTIAL_VIEW,
        EnvironmentPermission.ENV_CREDENTIAL_USE,
        EnvironmentPermission.ENV_CREDENTIAL_CREATE,
        EnvironmentPermission.ENV_VAR_VIEW,
        EnvironmentPermission.ENV_VAR_CREATE,
        EnvironmentPermission.ENV_VAR_UPDATE,
        EnvironmentPermission.ENV_PROMOTE_REQUEST,
        EnvironmentPermission.ENV_METRICS_VIEW,
      ],
      description: 'Full access to dev/staging, read-only for production',
      applicableEnvironments: [
        EnvironmentType.DEVELOPMENT,
        EnvironmentType.STAGING,
        EnvironmentType.TESTING,
      ],
    });

    // Viewer - Read-only access
    this.roleDefinitions.set(EnvironmentRole.VIEWER, {
      role: EnvironmentRole.VIEWER,
      permissions: [
        EnvironmentPermission.ENV_VIEW,
        EnvironmentPermission.ENV_WORKFLOW_VIEW,
        EnvironmentPermission.ENV_CREDENTIAL_VIEW,
        EnvironmentPermission.ENV_VAR_VIEW,
        EnvironmentPermission.ENV_METRICS_VIEW,
      ],
      description: 'Read-only access to all environments',
      applicableEnvironments: Object.values(EnvironmentType),
    });

    // Environment Owner - Full control of specific environment
    this.roleDefinitions.set(EnvironmentRole.ENV_OWNER, {
      role: EnvironmentRole.ENV_OWNER,
      permissions: Object.values(EnvironmentPermission).filter((p) =>
        p.startsWith('env:')
      ),
      description: 'Full control of a specific environment',
      applicableEnvironments: Object.values(EnvironmentType),
    });

    // Environment Maintainer - Manage workflows and credentials
    this.roleDefinitions.set(EnvironmentRole.ENV_MAINTAINER, {
      role: EnvironmentRole.ENV_MAINTAINER,
      permissions: [
        EnvironmentPermission.ENV_VIEW,
        EnvironmentPermission.ENV_UPDATE,
        EnvironmentPermission.ENV_WORKFLOW_VIEW,
        EnvironmentPermission.ENV_WORKFLOW_EXECUTE,
        EnvironmentPermission.ENV_WORKFLOW_DEPLOY,
        EnvironmentPermission.ENV_CREDENTIAL_VIEW,
        EnvironmentPermission.ENV_CREDENTIAL_USE,
        EnvironmentPermission.ENV_CREDENTIAL_CREATE,
        EnvironmentPermission.ENV_CREDENTIAL_UPDATE,
        EnvironmentPermission.ENV_VAR_VIEW,
        EnvironmentPermission.ENV_VAR_CREATE,
        EnvironmentPermission.ENV_VAR_UPDATE,
        EnvironmentPermission.ENV_PROMOTE_REQUEST,
        EnvironmentPermission.ENV_AUDIT_VIEW,
        EnvironmentPermission.ENV_METRICS_VIEW,
      ],
      description: 'Manage workflows and credentials in environment',
      applicableEnvironments: Object.values(EnvironmentType),
    });

    logger.info('Environment RBAC role definitions initialized');
  }

  /**
   * Grant access to user for environment
   */
  async grantAccess(
    userId: string,
    environmentId: string,
    roles: EnvironmentRole[],
    grantedBy: string,
    options?: {
      customPermissions?: EnvironmentPermission[];
      expiresAt?: Date;
    }
  ): Promise<UserEnvironmentAccess> {
    const env = await this.envManager.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    const access: UserEnvironmentAccess = {
      userId,
      environmentId,
      roles,
      customPermissions: options?.customPermissions || [],
      grantedAt: new Date(),
      grantedBy,
      expiresAt: options?.expiresAt,
    };

    const userAccessList = this.userAccess.get(userId) || [];

    // Remove existing access for this environment
    const filtered = userAccessList.filter((a) => a.environmentId !== environmentId);
    filtered.push(access);

    this.userAccess.set(userId, filtered);

    logger.info('Environment access granted', {
      userId,
      environmentId,
      roles,
      grantedBy,
    });

    return access;
  }

  /**
   * Revoke access from user for environment
   */
  async revokeAccess(
    userId: string,
    environmentId: string,
    revokedBy: string
  ): Promise<void> {
    const userAccessList = this.userAccess.get(userId) || [];
    const filtered = userAccessList.filter((a) => a.environmentId !== environmentId);

    this.userAccess.set(userId, filtered);

    logger.info('Environment access revoked', {
      userId,
      environmentId,
      revokedBy,
    });
  }

  /**
   * Check if user has permission for environment
   */
  async hasPermission(
    userId: string,
    environmentId: string,
    permission: EnvironmentPermission
  ): Promise<boolean> {
    const access = await this.getUserAccess(userId, environmentId);
    if (!access) {
      return false;
    }

    // Check if access is expired
    if (access.expiresAt && access.expiresAt < new Date()) {
      logger.warn('Environment access expired', {
        userId,
        environmentId,
        expiresAt: access.expiresAt,
      });
      return false;
    }

    // Check custom permissions first
    if (access.customPermissions.includes(permission)) {
      return true;
    }

    // Check role permissions
    for (const role of access.roles) {
      const roleDef = this.roleDefinitions.get(role);
      if (roleDef && roleDef.permissions.includes(permission)) {
        // Check if role is applicable to environment type
        const env = await this.envManager.getEnvironment(environmentId);
        if (env && roleDef.applicableEnvironments.includes(env.type)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    environmentId: string,
    permissions: EnvironmentPermission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, environmentId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    environmentId: string,
    permissions: EnvironmentPermission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, environmentId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get user's access for environment
   */
  async getUserAccess(
    userId: string,
    environmentId: string
  ): Promise<UserEnvironmentAccess | null> {
    const userAccessList = this.userAccess.get(userId) || [];
    return userAccessList.find((a) => a.environmentId === environmentId) || null;
  }

  /**
   * List all environments user has access to
   */
  async listUserEnvironments(userId: string): Promise<string[]> {
    const userAccessList = this.userAccess.get(userId) || [];
    return userAccessList
      .filter((a) => !a.expiresAt || a.expiresAt > new Date())
      .map((a) => a.environmentId);
  }

  /**
   * Get user's effective permissions for environment
   */
  async getUserPermissions(
    userId: string,
    environmentId: string
  ): Promise<EnvironmentPermission[]> {
    const access = await this.getUserAccess(userId, environmentId);
    if (!access) {
      return [];
    }

    const permissions = new Set<EnvironmentPermission>(access.customPermissions);

    // Add role permissions
    for (const role of access.roles) {
      const roleDef = this.roleDefinitions.get(role);
      if (roleDef) {
        const env = await this.envManager.getEnvironment(environmentId);
        if (env && roleDef.applicableEnvironments.includes(env.type)) {
          roleDef.permissions.forEach((p) => permissions.add(p));
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Create environment-specific API key
   */
  async createAPIKey(
    environmentId: string,
    name: string,
    permissions: EnvironmentPermission[],
    createdBy: string,
    options?: {
      expiresAt?: Date;
    }
  ): Promise<EnvironmentAPIKey> {
    const env = await this.envManager.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    const key = this.generateAPIKey();
    const hashedKey = this.hashAPIKey(key);

    const apiKey: EnvironmentAPIKey = {
      id: `envkey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      environmentId,
      key: hashedKey,
      permissions,
      createdAt: new Date(),
      createdBy,
      expiresAt: options?.expiresAt,
      isActive: true,
    };

    this.apiKeys.set(apiKey.id, apiKey);

    logger.info('Environment API key created', {
      keyId: apiKey.id,
      name,
      environmentId,
      permissions: permissions.length,
      createdBy,
    });

    // Return the actual key only once
    return {
      ...apiKey,
      key, // Unhashed key for one-time retrieval
    };
  }

  /**
   * Validate API key and get permissions
   */
  async validateAPIKey(
    key: string,
    environmentId: string
  ): Promise<EnvironmentAPIKey | null> {
    const hashedKey = this.hashAPIKey(key);

    for (const apiKey of this.apiKeys.values()) {
      if (
        apiKey.key === hashedKey &&
        apiKey.environmentId === environmentId &&
        apiKey.isActive
      ) {
        // Check expiry
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          logger.warn('API key expired', {
            keyId: apiKey.id,
            expiresAt: apiKey.expiresAt,
          });
          return null;
        }

        // Update last used
        apiKey.lastUsedAt = new Date();
        this.apiKeys.set(apiKey.id, apiKey);

        return apiKey;
      }
    }

    return null;
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string, revokedBy: string): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      throw new Error(`API key not found: ${keyId}`);
    }

    apiKey.isActive = false;
    this.apiKeys.set(keyId, apiKey);

    logger.info('API key revoked', {
      keyId,
      revokedBy,
    });
  }

  /**
   * List API keys for environment
   */
  async listAPIKeys(environmentId: string): Promise<EnvironmentAPIKey[]> {
    return Array.from(this.apiKeys.values())
      .filter((k) => k.environmentId === environmentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get audit trail for user access
   */
  async getAccessAuditTrail(
    userId: string,
    environmentId?: string
  ): Promise<
    Array<{
      userId: string;
      environmentId: string;
      action: string;
      timestamp: Date;
      details: any;
    }>
  > {
    // In a real implementation, retrieve from audit service
    // For now, return empty array
    return [];
  }

  /**
   * Generate API key
   */
  private generateAPIKey(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'wfenv_';
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Hash API key (simplified)
   */
  private hashAPIKey(key: string): string {
    // In a real implementation, use proper hashing (bcrypt, etc.)
    return Buffer.from(key).toString('base64');
  }

  /**
   * Get role definition
   */
  getRoleDefinition(role: EnvironmentRole): EnvironmentRoleDefinition | undefined {
    return this.roleDefinitions.get(role);
  }

  /**
   * List all role definitions
   */
  listRoleDefinitions(): EnvironmentRoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }
}

// Singleton
let environmentRBACInstance: EnvironmentRBAC | null = null;

export function getEnvironmentRBAC(): EnvironmentRBAC {
  if (!environmentRBACInstance) {
    environmentRBACInstance = new EnvironmentRBAC();
    logger.info('EnvironmentRBAC singleton initialized');
  }
  return environmentRBACInstance;
}

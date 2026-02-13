/**
 * Credential Isolation Layer
 * Ensures complete isolation between environment credentials with zero leakage
 */

import { logger } from '../services/SimpleLogger';
import {
  getEnvironmentCredentials,
  Credential,
} from './EnvironmentCredentials';
import { getEnvironmentManager } from './EnvironmentManager';
import { EnvironmentType } from '../backend/environment/EnvironmentTypes';

export interface IsolationPolicy {
  environmentId: string;
  allowCrossEnvironmentAccess: boolean;
  allowInheritance: boolean;
  allowMappings: boolean;
  readOnlyForNonOwners: boolean;
  requireApprovalForChanges: boolean;
}

export interface AccessContext {
  userId: string;
  userRole: string;
  environmentId: string;
  requestedCredentialId: string;
  operation: 'read' | 'write' | 'delete' | 'rotate';
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  requiresApproval?: boolean;
  auditLevel: 'low' | 'medium' | 'high';
}

export class CredentialIsolation {
  private credentials = getEnvironmentCredentials();
  private envManager = getEnvironmentManager();
  private policies: Map<string, IsolationPolicy> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default isolation policies
   */
  private initializeDefaultPolicies(): void {
    // Development: Permissive
    const devPolicy: IsolationPolicy = {
      environmentId: 'development',
      allowCrossEnvironmentAccess: false,
      allowInheritance: true,
      allowMappings: true,
      readOnlyForNonOwners: false,
      requireApprovalForChanges: false,
    };

    // Staging: Moderate
    const stagingPolicy: IsolationPolicy = {
      environmentId: 'staging',
      allowCrossEnvironmentAccess: false,
      allowInheritance: true,
      allowMappings: true,
      readOnlyForNonOwners: true,
      requireApprovalForChanges: false,
    };

    // Production: Strict
    const prodPolicy: IsolationPolicy = {
      environmentId: 'production',
      allowCrossEnvironmentAccess: false,
      allowInheritance: false,
      allowMappings: true,
      readOnlyForNonOwners: true,
      requireApprovalForChanges: true,
    };

    this.policies.set('development', devPolicy);
    this.policies.set('staging', stagingPolicy);
    this.policies.set('production', prodPolicy);

    logger.info('Default credential isolation policies initialized');
  }

  /**
   * Check if access is allowed
   */
  async checkAccess(context: AccessContext): Promise<AccessDecision> {
    logger.debug('Checking credential access', {
      userId: context.userId,
      environmentId: context.environmentId,
      credentialId: context.requestedCredentialId,
      operation: context.operation,
    });

    // 1. Check if credential exists
    const credential = await this.credentials.getCredential(
      context.requestedCredentialId,
      context.environmentId
    );

    if (!credential) {
      return {
        allowed: false,
        reason: 'Credential not found or not accessible in this environment',
        auditLevel: 'medium',
      };
    }

    // 2. Check environment isolation
    if (credential.environmentId !== context.environmentId) {
      const isolationCheck = await this.checkEnvironmentIsolation(
        credential,
        context
      );
      if (!isolationCheck.allowed) {
        return isolationCheck;
      }
    }

    // 3. Check operation-specific permissions
    const operationCheck = await this.checkOperationPermission(
      credential,
      context
    );
    if (!operationCheck.allowed) {
      return operationCheck;
    }

    // 4. Check if credential is expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return {
        allowed: false,
        reason: 'Credential has expired',
        auditLevel: 'low',
      };
    }

    // 5. Check if credential is active
    if (!credential.isActive) {
      return {
        allowed: false,
        reason: 'Credential is not active',
        auditLevel: 'low',
      };
    }

    // 6. Check policy-based restrictions
    const policyCheck = await this.checkPolicy(credential, context);
    if (!policyCheck.allowed) {
      return policyCheck;
    }

    // Access granted
    logger.info('Credential access granted', {
      userId: context.userId,
      credentialId: context.requestedCredentialId,
      operation: context.operation,
    });

    return {
      allowed: true,
      reason: 'Access granted',
      auditLevel: this.determineAuditLevel(context),
    };
  }

  /**
   * Check environment isolation
   */
  private async checkEnvironmentIsolation(
    credential: Credential,
    context: AccessContext
  ): Promise<AccessDecision> {
    const policy = this.policies.get(credential.environmentId);

    if (!policy) {
      return {
        allowed: false,
        reason: 'No isolation policy found for credential environment',
        auditLevel: 'high',
      };
    }

    // Check if cross-environment access is allowed
    if (!policy.allowCrossEnvironmentAccess) {
      // Check if credential is inherited
      if (
        policy.allowInheritance &&
        credential.metadata.inheritedFrom === context.environmentId
      ) {
        return {
          allowed: true,
          reason: 'Credential inherited from parent environment',
          auditLevel: 'low',
        };
      }

      return {
        allowed: false,
        reason: 'Cross-environment access not allowed',
        auditLevel: 'high',
      };
    }

    return {
      allowed: true,
      reason: 'Cross-environment access permitted',
      auditLevel: 'medium',
    };
  }

  /**
   * Check operation permission
   */
  private async checkOperationPermission(
    credential: Credential,
    context: AccessContext
  ): Promise<AccessDecision> {
    const env = await this.envManager.getEnvironment(context.environmentId);
    if (!env) {
      return {
        allowed: false,
        reason: 'Environment not found',
        auditLevel: 'high',
      };
    }

    // Production credentials are read-only for non-admins
    if (env.type === EnvironmentType.PRODUCTION) {
      if (context.operation !== 'read') {
        // Check if user is admin (simplified - in real system, check RBAC)
        const isAdmin = context.userRole === 'admin' || context.userRole === 'super_admin';
        if (!isAdmin) {
          return {
            allowed: false,
            reason: 'Production credentials are read-only for non-administrators',
            auditLevel: 'high',
          };
        }

        // Admins need approval for destructive operations
        if (context.operation === 'delete') {
          return {
            allowed: true,
            reason: 'Admin access granted but requires approval',
            requiresApproval: true,
            auditLevel: 'high',
          };
        }
      }
    }

    // Check ownership for write operations
    if (context.operation !== 'read') {
      if (credential.createdBy !== context.userId) {
        const policy = this.policies.get(context.environmentId);
        if (policy?.readOnlyForNonOwners) {
          // Check if user is admin
          const isAdmin = context.userRole === 'admin' || context.userRole === 'super_admin';
          if (!isAdmin) {
            return {
              allowed: false,
              reason: 'Only credential owner or admins can modify credentials',
              auditLevel: 'medium',
            };
          }
        }
      }
    }

    return {
      allowed: true,
      reason: 'Operation permitted',
      auditLevel: 'low',
    };
  }

  /**
   * Check policy-based restrictions
   */
  private async checkPolicy(
    credential: Credential,
    context: AccessContext
  ): Promise<AccessDecision> {
    const policy = this.policies.get(context.environmentId);

    if (!policy) {
      return {
        allowed: true,
        reason: 'No policy restrictions',
        auditLevel: 'low',
      };
    }

    // Check if changes require approval
    if (policy.requireApprovalForChanges && context.operation !== 'read') {
      return {
        allowed: true,
        reason: 'Operation requires approval',
        requiresApproval: true,
        auditLevel: 'high',
      };
    }

    return {
      allowed: true,
      reason: 'Policy check passed',
      auditLevel: 'low',
    };
  }

  /**
   * Validate credential access across environments
   */
  async validateCrossEnvironmentAccess(
    sourceEnvId: string,
    targetEnvId: string,
    credentialId: string,
    userId: string
  ): Promise<AccessDecision> {
    logger.info('Validating cross-environment credential access', {
      sourceEnvId,
      targetEnvId,
      credentialId,
      userId,
    });

    // Get source credential
    const sourceCred = await this.credentials.getCredential(
      credentialId,
      sourceEnvId
    );

    if (!sourceCred) {
      return {
        allowed: false,
        reason: 'Credential not found in source environment',
        auditLevel: 'medium',
      };
    }

    // Check if mapping exists
    const mappedCred = await this.credentials.getMappedCredential(
      credentialId,
      sourceEnvId,
      targetEnvId
    );

    if (!mappedCred) {
      return {
        allowed: false,
        reason: 'No credential mapping found for target environment',
        auditLevel: 'medium',
      };
    }

    // Verify target credential is accessible
    const targetAccess = await this.checkAccess({
      userId,
      userRole: 'user',
      environmentId: targetEnvId,
      requestedCredentialId: mappedCred.id,
      operation: 'read',
    });

    return targetAccess;
  }

  /**
   * Detect credential leakage
   */
  async detectLeakage(environmentId: string): Promise<{
    hasLeakage: boolean;
    issues: Array<{
      credentialId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> {
    logger.info('Scanning for credential leakage', { environmentId });

    const issues: Array<{
      credentialId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    const credentials = await this.credentials.listCredentials(environmentId, {
      includeExpired: true,
    });

    for (const credential of credentials) {
      // Check for credentials without expiry in test environments
      const env = await this.envManager.getEnvironment(environmentId);
      if (
        env &&
        (env.type === EnvironmentType.DEVELOPMENT ||
          env.type === EnvironmentType.TESTING)
      ) {
        if (!credential.expiresAt) {
          issues.push({
            credentialId: credential.id,
            issue: 'Test credential without expiry date',
            severity: 'medium',
          });
        }
      }

      // Check for expired credentials still active
      if (credential.expiresAt && credential.expiresAt < new Date()) {
        if (credential.isActive) {
          issues.push({
            credentialId: credential.id,
            issue: 'Expired credential is still active',
            severity: 'high',
          });
        }
      }

      // Check for credentials with high usage but no rotation policy
      if (credential.metadata.usageCount > 100) {
        if (!credential.metadata.rotationPolicy?.enabled) {
          issues.push({
            credentialId: credential.id,
            issue: 'High-usage credential without rotation policy',
            severity: 'medium',
          });
        }
      }
    }

    logger.info('Credential leakage scan completed', {
      environmentId,
      issuesFound: issues.length,
    });

    return {
      hasLeakage: issues.length > 0,
      issues,
    };
  }

  /**
   * Audit credential access
   */
  async auditAccess(
    context: AccessContext,
    decision: AccessDecision,
    result: 'granted' | 'denied'
  ): Promise<void> {
    logger.info('Credential access audit', {
      userId: context.userId,
      environmentId: context.environmentId,
      credentialId: context.requestedCredentialId,
      operation: context.operation,
      result,
      reason: decision.reason,
      auditLevel: decision.auditLevel,
    });

    // In a real implementation, store audit logs in database
  }

  /**
   * Get isolation policy for environment
   */
  getPolicy(environmentId: string): IsolationPolicy | undefined {
    return this.policies.get(environmentId);
  }

  /**
   * Update isolation policy
   */
  async updatePolicy(
    environmentId: string,
    updates: Partial<IsolationPolicy>,
    userId: string
  ): Promise<IsolationPolicy> {
    const existing = this.policies.get(environmentId);

    const updated: IsolationPolicy = {
      ...(existing || {
        environmentId,
        allowCrossEnvironmentAccess: false,
        allowInheritance: false,
        allowMappings: false,
        readOnlyForNonOwners: false,
        requireApprovalForChanges: false,
      }),
      ...updates,
    };

    this.policies.set(environmentId, updated);

    logger.info('Isolation policy updated', {
      environmentId,
      updates,
      userId,
    });

    return updated;
  }

  /**
   * Determine audit level based on context
   */
  private determineAuditLevel(
    context: AccessContext
  ): 'low' | 'medium' | 'high' {
    if (context.operation === 'delete' || context.operation === 'rotate') {
      return 'high';
    }

    if (context.operation === 'write') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate isolation report
   */
  async generateIsolationReport(environmentId: string): Promise<{
    environmentId: string;
    totalCredentials: number;
    inheritedCredentials: number;
    expiredCredentials: number;
    policy: IsolationPolicy | undefined;
    leakageIssues: number;
    recommendations: string[];
  }> {
    const credentials = await this.credentials.listCredentials(environmentId, {
      includeInherited: true,
      includeExpired: true,
    });

    const inherited = credentials.filter((c) => c.metadata.inheritedFrom).length;
    const expired = credentials.filter(
      (c) => c.expiresAt && c.expiresAt < new Date()
    ).length;

    const leakage = await this.detectLeakage(environmentId);
    const policy = this.getPolicy(environmentId);

    const recommendations: string[] = [];

    if (leakage.hasLeakage) {
      recommendations.push('Address credential leakage issues immediately');
    }

    if (expired > 0) {
      recommendations.push(`Deactivate ${expired} expired credentials`);
    }

    if (!policy?.requireApprovalForChanges) {
      recommendations.push('Consider enabling approval requirement for credential changes');
    }

    return {
      environmentId,
      totalCredentials: credentials.length,
      inheritedCredentials: inherited,
      expiredCredentials: expired,
      policy,
      leakageIssues: leakage.issues.length,
      recommendations,
    };
  }
}

// Singleton
let credentialIsolationInstance: CredentialIsolation | null = null;

export function getCredentialIsolation(): CredentialIsolation {
  if (!credentialIsolationInstance) {
    credentialIsolationInstance = new CredentialIsolation();
    logger.info('CredentialIsolation singleton initialized');
  }
  return credentialIsolationInstance;
}

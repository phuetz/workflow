/**
 * Environment-Specific Credentials Manager
 * Manages credentials with complete isolation per environment
 */

import { logger } from '../services/SimpleLogger';
import { getEnvironmentManager, EnhancedEnvironment } from './EnvironmentManager';
import { EnvironmentType } from '../backend/environment/EnvironmentTypes';

export interface Credential {
  id: string;
  name: string;
  type: string; // api_key, oauth2, basic_auth, etc.
  environmentId: string;
  data: Record<string, any>; // Encrypted credential data
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  expiresAt?: Date;
  isActive: boolean;
  metadata: CredentialMetadata;
}

export interface CredentialMetadata {
  tags: string[];
  usageCount: number;
  lastUsedAt?: Date;
  rotationPolicy?: RotationPolicy;
  inheritedFrom?: string; // Source environment ID if inherited
}

export interface RotationPolicy {
  enabled: boolean;
  intervalDays: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
}

export interface CredentialMapping {
  sourceEnvId: string;
  targetEnvId: string;
  sourceCredentialId: string;
  targetCredentialId: string;
  createdAt: Date;
  createdBy: string;
}

export interface CredentialInheritance {
  childEnvId: string;
  parentEnvId: string;
  credentialId: string;
  inheritedAt: Date;
  canOverride: boolean;
}

export class EnvironmentCredentials {
  private credentials: Map<string, Credential> = new Map();
  private mappings: Map<string, CredentialMapping[]> = new Map(); // envId -> mappings
  private inheritance: Map<string, CredentialInheritance[]> = new Map(); // childEnvId -> inheritances
  private envManager = getEnvironmentManager();

  /**
   * Create credential in environment
   */
  async createCredential(
    environmentId: string,
    data: {
      name: string;
      type: string;
      data: Record<string, any>;
      description?: string;
      expiresAt?: Date;
      tags?: string[];
      rotationPolicy?: RotationPolicy;
    },
    userId: string
  ): Promise<Credential> {
    const env = await this.envManager.getEnvironment(environmentId);
    if (!env) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    // Apply auto-expiry for test credentials
    let expiresAt = data.expiresAt;
    if (
      env.type === EnvironmentType.DEVELOPMENT ||
      env.type === EnvironmentType.TESTING
    ) {
      if (!expiresAt) {
        // Auto-expire test credentials after 30 days
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        logger.info('Auto-expiry applied to test credential', {
          environmentId,
          expiresAt,
        });
      }
    }

    const credential: Credential = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      type: data.type,
      environmentId,
      data: this.encryptData(data.data), // Encrypt sensitive data
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      expiresAt,
      isActive: true,
      metadata: {
        tags: data.tags || [],
        usageCount: 0,
        rotationPolicy: data.rotationPolicy,
      },
    };

    this.credentials.set(credential.id, credential);

    logger.info('Credential created', {
      credentialId: credential.id,
      name: credential.name,
      type: credential.type,
      environmentId,
      createdBy: userId,
    });

    return credential;
  }

  /**
   * Get credential by ID
   */
  async getCredential(
    credentialId: string,
    environmentId: string
  ): Promise<Credential | null> {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return null;
    }

    // Verify credential belongs to environment or is inherited
    if (credential.environmentId !== environmentId) {
      const inherited = await this.isInherited(credentialId, environmentId);
      if (!inherited) {
        logger.warn('Credential access denied - not in environment', {
          credentialId,
          environmentId,
        });
        return null;
      }
    }

    // Check if expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      logger.warn('Credential expired', {
        credentialId,
        expiresAt: credential.expiresAt,
      });
      return null;
    }

    // Update usage stats
    credential.metadata.usageCount++;
    credential.metadata.lastUsedAt = new Date();
    this.credentials.set(credentialId, credential);

    return credential;
  }

  /**
   * List credentials in environment
   */
  async listCredentials(
    environmentId: string,
    filter?: {
      type?: string;
      includeInherited?: boolean;
      includeExpired?: boolean;
    }
  ): Promise<Credential[]> {
    let credentials = Array.from(this.credentials.values()).filter(
      (c) => c.environmentId === environmentId
    );

    // Include inherited credentials if requested
    if (filter?.includeInherited) {
      const inheritances = this.inheritance.get(environmentId) || [];
      for (const inheritance of inheritances) {
        const inheritedCred = this.credentials.get(inheritance.credentialId);
        if (inheritedCred) {
          credentials.push({
            ...inheritedCred,
            metadata: {
              ...inheritedCred.metadata,
              inheritedFrom: inheritance.parentEnvId,
            },
          });
        }
      }
    }

    // Filter by type
    if (filter?.type) {
      credentials = credentials.filter((c) => c.type === filter.type);
    }

    // Filter expired credentials
    if (!filter?.includeExpired) {
      const now = new Date();
      credentials = credentials.filter(
        (c) => !c.expiresAt || c.expiresAt > now
      );
    }

    return credentials.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Update credential
   */
  async updateCredential(
    credentialId: string,
    updates: {
      name?: string;
      data?: Record<string, any>;
      description?: string;
      expiresAt?: Date;
      isActive?: boolean;
      tags?: string[];
    },
    userId: string,
    environmentId: string
  ): Promise<Credential> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Verify ownership
    if (credential.environmentId !== environmentId) {
      throw new Error('Cannot update credential from different environment');
    }

    // Production credentials are read-only for non-admins
    const env = await this.envManager.getEnvironment(environmentId);
    if (env?.type === EnvironmentType.PRODUCTION) {
      logger.warn('Production credential update attempted', {
        credentialId,
        userId,
      });
      // In a real system, check if user is admin here
    }

    if (updates.name) credential.name = updates.name;
    if (updates.data) credential.data = this.encryptData(updates.data);
    if (updates.description !== undefined)
      credential.description = updates.description;
    if (updates.expiresAt !== undefined) credential.expiresAt = updates.expiresAt;
    if (updates.isActive !== undefined) credential.isActive = updates.isActive;
    if (updates.tags) credential.metadata.tags = updates.tags;

    credential.updatedAt = new Date();
    this.credentials.set(credentialId, credential);

    logger.info('Credential updated', {
      credentialId,
      updates,
      userId,
    });

    return credential;
  }

  /**
   * Delete credential
   */
  async deleteCredential(
    credentialId: string,
    environmentId: string,
    userId: string
  ): Promise<void> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Verify ownership
    if (credential.environmentId !== environmentId) {
      throw new Error('Cannot delete credential from different environment');
    }

    // Check if credential is in use
    if (credential.metadata.usageCount > 0) {
      logger.warn('Deleting credential that has been used', {
        credentialId,
        usageCount: credential.metadata.usageCount,
      });
    }

    this.credentials.delete(credentialId);

    logger.info('Credential deleted', {
      credentialId,
      environmentId,
      userId,
    });
  }

  /**
   * Create credential mapping between environments
   */
  async createMapping(
    sourceEnvId: string,
    targetEnvId: string,
    sourceCredentialId: string,
    targetCredentialId: string,
    userId: string
  ): Promise<CredentialMapping> {
    // Verify both credentials exist
    const sourceCred = await this.getCredential(sourceCredentialId, sourceEnvId);
    const targetCred = await this.getCredential(targetCredentialId, targetEnvId);

    if (!sourceCred || !targetCred) {
      throw new Error('Source or target credential not found');
    }

    // Verify credentials are of the same type
    if (sourceCred.type !== targetCred.type) {
      logger.warn('Mapping credentials of different types', {
        sourceType: sourceCred.type,
        targetType: targetCred.type,
      });
    }

    const mapping: CredentialMapping = {
      sourceEnvId,
      targetEnvId,
      sourceCredentialId,
      targetCredentialId,
      createdAt: new Date(),
      createdBy: userId,
    };

    const mappings = this.mappings.get(sourceEnvId) || [];
    mappings.push(mapping);
    this.mappings.set(sourceEnvId, mappings);

    logger.info('Credential mapping created', {
      sourceEnvId,
      targetEnvId,
      sourceCredentialId,
      targetCredentialId,
    });

    return mapping;
  }

  /**
   * Get mapped credential
   */
  async getMappedCredential(
    sourceCredentialId: string,
    sourceEnvId: string,
    targetEnvId: string
  ): Promise<Credential | null> {
    const mappings = this.mappings.get(sourceEnvId) || [];
    const mapping = mappings.find(
      (m) =>
        m.sourceCredentialId === sourceCredentialId &&
        m.targetEnvId === targetEnvId
    );

    if (!mapping) {
      return null;
    }

    return await this.getCredential(mapping.targetCredentialId, targetEnvId);
  }

  /**
   * Setup credential inheritance
   */
  async setupInheritance(
    parentEnvId: string,
    childEnvId: string,
    credentialId: string,
    canOverride: boolean = true,
    userId: string
  ): Promise<CredentialInheritance> {
    // Verify credential exists in parent
    const credential = await this.getCredential(credentialId, parentEnvId);
    if (!credential) {
      throw new Error(`Credential not found in parent environment`);
    }

    const inheritance: CredentialInheritance = {
      childEnvId,
      parentEnvId,
      credentialId,
      inheritedAt: new Date(),
      canOverride,
    };

    const inheritances = this.inheritance.get(childEnvId) || [];
    inheritances.push(inheritance);
    this.inheritance.set(childEnvId, inheritances);

    logger.info('Credential inheritance setup', {
      parentEnvId,
      childEnvId,
      credentialId,
      canOverride,
    });

    return inheritance;
  }

  /**
   * Check if credential is inherited
   */
  private async isInherited(
    credentialId: string,
    environmentId: string
  ): Promise<boolean> {
    const inheritances = this.inheritance.get(environmentId) || [];
    return inheritances.some((i) => i.credentialId === credentialId);
  }

  /**
   * Override inherited credential
   */
  async overrideInheritedCredential(
    childEnvId: string,
    credentialId: string,
    newData: Record<string, any>,
    userId: string
  ): Promise<Credential> {
    const inheritances = this.inheritance.get(childEnvId) || [];
    const inheritance = inheritances.find((i) => i.credentialId === credentialId);

    if (!inheritance) {
      throw new Error('Credential is not inherited');
    }

    if (!inheritance.canOverride) {
      throw new Error('Credential override not allowed');
    }

    const parentCred = await this.getCredential(
      credentialId,
      inheritance.parentEnvId
    );
    if (!parentCred) {
      throw new Error('Parent credential not found');
    }

    // Create new credential in child environment
    return await this.createCredential(
      childEnvId,
      {
        name: `${parentCred.name} (Override)`,
        type: parentCred.type,
        data: newData,
        description: `Override of inherited credential from ${inheritance.parentEnvId}`,
      },
      userId
    );
  }

  /**
   * Rotate credential
   */
  async rotateCredential(
    credentialId: string,
    environmentId: string,
    newData: Record<string, any>,
    userId: string
  ): Promise<Credential> {
    const credential = await this.getCredential(credentialId, environmentId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Update credential data
    credential.data = this.encryptData(newData);
    credential.updatedAt = new Date();

    // Update rotation metadata
    if (credential.metadata.rotationPolicy) {
      credential.metadata.rotationPolicy.lastRotatedAt = new Date();
      const nextRotation = new Date();
      nextRotation.setDate(
        nextRotation.getDate() +
          credential.metadata.rotationPolicy.intervalDays
      );
      credential.metadata.rotationPolicy.nextRotationAt = nextRotation;
    }

    this.credentials.set(credentialId, credential);

    logger.info('Credential rotated', {
      credentialId,
      userId,
    });

    return credential;
  }

  /**
   * Get credentials due for rotation
   */
  async getCredentialsDueForRotation(
    environmentId: string
  ): Promise<Credential[]> {
    const credentials = await this.listCredentials(environmentId);
    const now = new Date();

    return credentials.filter((c) => {
      if (!c.metadata.rotationPolicy?.enabled) return false;
      if (!c.metadata.rotationPolicy.nextRotationAt) return false;
      return c.metadata.rotationPolicy.nextRotationAt <= now;
    });
  }

  /**
   * Encrypt credential data (placeholder)
   */
  private encryptData(data: Record<string, any>): Record<string, any> {
    // In a real implementation, use proper encryption
    // For now, just return the data as-is
    return { ...data };
  }

  /**
   * Decrypt credential data (placeholder)
   */
  private decryptData(data: Record<string, any>): Record<string, any> {
    // In a real implementation, use proper decryption
    return { ...data };
  }
}

// Singleton
let environmentCredentialsInstance: EnvironmentCredentials | null = null;

export function getEnvironmentCredentials(): EnvironmentCredentials {
  if (!environmentCredentialsInstance) {
    environmentCredentialsInstance = new EnvironmentCredentials();
    logger.info('EnvironmentCredentials singleton initialized');
  }
  return environmentCredentialsInstance;
}

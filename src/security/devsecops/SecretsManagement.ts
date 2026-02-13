/**
 * Secrets Management System
 *
 * Enterprise-grade secrets management orchestrator with:
 * - Encrypted storage with versioning
 * - Multi-provider integration (Vault, AWS, Azure, GCP, Kubernetes)
 * - Secret rotation with zero-downtime capability
 * - Advanced access control with JIT (Just-In-Time) access
 * - Comprehensive audit logging and compliance reporting
 * - Code scanning and breach detection
 *
 * @module security/devsecops/SecretsManagement
 */

import { randomBytes, createCipheriv, createDecipheriv, createHmac } from 'crypto';
import { promisify } from 'util';
import { scrypt } from 'crypto';

// Import from extracted modules
import {
  SecretType,
  AccessLevel,
  SecretMetadata,
  EncryptedSecretEntry,
  SecretAccessRecord,
  RotationPolicy,
  JITAccessRequest,
  BreachDetectionResult,
  ComplianceReport
} from './secrets/types';

import { SecretProvider, initializeProviders } from './secrets/SecretProviders';
import { SecretScanner } from './secrets/SecretScanner';
import { SecretRotator } from './secrets/SecretRotator';
import { SecretValidator } from './secrets/SecretValidator';
import { JITAccessManager } from './secrets/JITAccessManager';

const scryptAsync = promisify(scrypt);

// Re-export types for backward compatibility
export {
  SecretType,
  AccessLevel,
  SecretMetadata,
  EncryptedSecretEntry,
  SecretAccessRecord,
  RotationPolicy,
  JITAccessRequest,
  BreachDetectionResult,
  ComplianceReport
} from './secrets/types';

export type { SecretProviderConfig, ApprovalEntry, AccessAnomaly } from './secrets/types';

/**
 * Main Secrets Management System
 */
export class SecretsManagement {
  private readonly localStore: Map<string, EncryptedSecretEntry> = new Map();
  private readonly auditLog: SecretAccessRecord[] = [];
  private readonly encryptionKeyVersion: string = 'v1';
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private secretProviders: Map<string, SecretProvider> = new Map();
  private encryptionKey: Buffer | null = null;

  // Composed modules
  private readonly scanner: SecretScanner;
  private readonly rotator: SecretRotator;
  private readonly validator: SecretValidator;
  private readonly jitManager: JITAccessManager;

  constructor(private masterKey: string = process.env.SECRETS_MASTER_KEY || '') {
    if (!masterKey) {
      throw new Error('SECRETS_MASTER_KEY environment variable is required');
    }
    this.secretProviders = initializeProviders();
    this.scanner = new SecretScanner();
    this.rotator = new SecretRotator();
    this.validator = new SecretValidator();
    this.jitManager = new JITAccessManager();
  }

  /**
   * Derive encryption key from master key
   */
  private async deriveEncryptionKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }
    const salt = Buffer.from(this.encryptionKeyVersion + 'salt');
    this.encryptionKey = (await scryptAsync(this.masterKey, salt, 32)) as Buffer;
    return this.encryptionKey;
  }

  /**
   * Encrypt a secret value
   */
  private async encryptSecret(
    value: string
  ): Promise<{ encryptedValue: string; iv: string; authTag: string }> {
    const key = await this.deriveEncryptionKey();
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(value, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { encryptedValue: encrypted, iv: iv.toString('hex'), authTag };
  }

  /**
   * Decrypt a secret value
   */
  private async decryptSecret(encrypted: string, iv: string, authTag: string): Promise<string> {
    const key = await this.deriveEncryptionKey();
    const decipher = createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  /**
   * Generate checksum for integrity verification
   */
  private generateChecksum(value: string): string {
    return createHmac('sha256', this.masterKey).update(value).digest('hex');
  }

  /**
   * Generate unique secret ID
   */
  private generateSecretId(): string {
    return `secret_${randomBytes(12).toString('hex')}`;
  }

  /**
   * Log secret access for audit trail
   */
  private async logAccess(
    record: Omit<SecretAccessRecord, 'approved' | 'approvedBy'>
  ): Promise<void> {
    this.auditLog.push({ ...record, approved: true } as SecretAccessRecord);
  }

  /**
   * Store a secret with encryption
   */
  async storeSecret(
    name: string,
    value: string,
    type: SecretType,
    metadata: Partial<SecretMetadata> = {},
    provider: 'local' | 'vault' | 'aws' | 'azure' | 'gcp' | 'kubernetes' = 'local',
    userId: string = 'system'
  ): Promise<SecretMetadata> {
    const id = this.generateSecretId();
    const now = new Date();
    const { encryptedValue, iv, authTag } = await this.encryptSecret(value);
    const checksum = this.generateChecksum(value);

    const secretMetadata: SecretMetadata = {
      id,
      name,
      type,
      description: metadata.description || '',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      version: 1,
      isActive: true,
      encryptionKeyVersion: this.encryptionKeyVersion,
      tags: metadata.tags || {},
      expiresAt: metadata.expiresAt,
      rotationPolicy: metadata.rotationPolicy,
      ...metadata
    };

    const entry: EncryptedSecretEntry = {
      id,
      metadata: secretMetadata,
      encryptedValue,
      iv,
      authTag,
      checksum,
      version: 1
    };

    if (provider === 'local') {
      this.localStore.set(id, entry);
    } else {
      const secretProvider = this.secretProviders.get(provider);
      if (!secretProvider) {
        throw new Error(`Secret provider not configured: ${provider}`);
      }
      await secretProvider.storeSecret(entry);
    }

    await this.logAccess({
      secretId: id,
      accessedBy: userId,
      accessedAt: now,
      accessLevel: AccessLevel.OWNER,
      action: 'write',
      ipAddress: 'internal',
      userAgent: 'SecretsManagement'
    });

    if (secretMetadata.rotationPolicy?.autoRotate) {
      this.rotator.scheduleRotation(id, secretMetadata.rotationPolicy, async () => {
        console.log(`Auto-rotation triggered for secret: ${id}`);
      });
    }

    return secretMetadata;
  }

  /**
   * Retrieve a secret (requires access control)
   */
  async getSecret(
    secretId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    requestReason?: string
  ): Promise<{ value: string; metadata: SecretMetadata } | null> {
    const accessLevel = this.validator.checkAccess(
      secretId,
      userId,
      this.localStore,
      this.jitManager.getAllRequests()
    );
    if (accessLevel === AccessLevel.NONE) {
      throw new Error(`Access denied to secret: ${secretId}`);
    }

    const now = new Date();
    await this.logAccess({
      secretId,
      accessedBy: userId,
      accessedAt: now,
      accessLevel,
      action: 'read',
      ipAddress,
      userAgent,
      reason: requestReason
    });

    await this.validator.detectAccessAnomaly(secretId, userId, ipAddress, this.auditLog);

    const entry = this.localStore.get(secretId);
    if (!entry) {
      return null;
    }

    const value = await this.decryptSecret(entry.encryptedValue, entry.iv, entry.authTag);

    if (!this.validator.verifyIntegrity(value, entry.checksum, (v) => this.generateChecksum(v))) {
      throw new Error('Secret integrity verification failed');
    }

    return { value, metadata: entry.metadata };
  }

  /**
   * Request Just-In-Time access
   */
  async requestJITAccess(
    secretId: string,
    userId: string,
    durationMinutes: number,
    reason: string,
    justification: string,
    approvers: string[]
  ): Promise<JITAccessRequest> {
    return this.jitManager.requestAccess(
      secretId,
      userId,
      durationMinutes,
      reason,
      justification,
      approvers
    );
  }

  /**
   * Approve JIT access request
   */
  async approveJITAccess(
    requestId: string,
    approverId: string,
    comment?: string
  ): Promise<JITAccessRequest> {
    return this.jitManager.approveAccess(requestId, approverId, comment);
  }

  /**
   * Rotate a secret
   */
  async rotateSecret(
    secretId: string,
    newValue: string,
    userId: string,
    reason: string = 'scheduled_rotation'
  ): Promise<SecretMetadata> {
    const entry = this.localStore.get(secretId);
    if (!entry) {
      throw new Error(`Secret not found: ${secretId}`);
    }

    const { encryptedValue, iv, authTag } = await this.encryptSecret(newValue);
    const checksum = this.generateChecksum(newValue);

    await this.rotator.rotateSecret(
      entry,
      encryptedValue,
      iv,
      authTag,
      checksum,
      userId,
      (record) => this.logAccess(record),
      reason
    );

    return entry.metadata;
  }

  /**
   * Scan code for exposed secrets
   */
  async scanForExposedSecrets(
    content: string,
    fileName: string,
    _userId: string
  ): Promise<BreachDetectionResult[]> {
    return this.scanner.scanForExposedSecrets(content, fileName, this.localStore);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    _userId: string
  ): Promise<ComplianceReport> {
    return this.scanner.generateComplianceReport(
      startDate,
      endDate,
      this.localStore,
      this.auditLog
    );
  }
}

export default SecretsManagement;

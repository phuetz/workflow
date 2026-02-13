/**
 * Vault Service Types
 * Contains all interfaces and types for the vault system
 */

export interface VaultConfig {
  encryptionKey?: string;
  algorithm?: string;
  keyDerivationRounds?: number;
  maxSecretSize?: number;
  autoRotateKeys?: boolean;
  rotationInterval?: number;
  auditLogging?: boolean;
}

export interface SecretMetadata {
  created: Date;
  modified: Date;
  createdBy: string;
  modifiedBy: string;
  version: number;
  tags: string[];
  expiresAt?: Date;
}

export interface SecretPermissions {
  read: string[];
  write: string[];
  delete: string[];
}

export interface Secret {
  id: string;
  name: string;
  value: string;
  encrypted: boolean;
  metadata: SecretMetadata;
  permissions: SecretPermissions;
}

export interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
  algorithm: string;
  timestamp: number;
}

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'rotate' | 'export' | 'import';

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: AuditAction;
  secretId: string;
  secretName: string;
  userId: string;
  userIp?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogInput {
  action: AuditAction;
  secretId: string;
  secretName: string;
  userId: string;
  userIp?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  userId?: string;
  secretId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
}

export interface SecretCreateOptions {
  tags?: string[];
  expiresAt?: Date;
  permissions?: SecretPermissions;
}

export interface SecretSearchQuery {
  name?: string;
  tags?: string[];
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ExportBundle {
  version: string;
  algorithm: string;
  iv: string;
  authTag: string;
  data: string;
  timestamp: number;
  exportedBy: string;
}

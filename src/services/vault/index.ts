/**
 * Vault Module
 * Barrel export for all vault-related components
 */

// Export types
export * from './types';

// Export components
export { EncryptionHandler } from './EncryptionHandler';
export { SecretStorage } from './SecretStorage';
export { AccessControl, type PermissionAction } from './AccessControl';
export { AuditLogger } from './AuditLogger';

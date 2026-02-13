/**
 * Federation Module Barrel Export
 */

// Types
export * from './types';

// Sub-modules
export { TrustStore } from './TrustStore';
export { IdentityMapper } from './IdentityMapper';
export { SessionManager } from './SessionManager';
export type { SessionManagerConfig } from './SessionManager';
export { SAMLProvider } from './SAMLProvider';
export { OIDCProvider } from './OIDCProvider';
export { SCIMHandler } from './SCIMHandler';
export { AuditLogger } from './AuditLogger';
export type { AuditEvent } from './AuditLogger';

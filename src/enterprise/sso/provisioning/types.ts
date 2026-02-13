/**
 * User Provisioning Types
 * Type definitions for SCIM 2.0 compliant user provisioning
 */

// ============================================================================
// SCIM Types
// ============================================================================

export interface SCIMUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
  };
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  title?: string;
  userType?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active?: boolean;
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  addresses?: Array<{
    formatted?: string;
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    type?: string;
  }>;
  photos?: Array<{
    value: string;
    type?: string;
  }>;
  groups?: Array<{
    value: string;
    $ref?: string;
    display?: string;
  }>;
  roles?: Array<{
    value: string;
    display?: string;
    type?: string;
    primary?: boolean;
  }>;
  entitlements?: Array<{
    value: string;
    display?: string;
    type?: string;
  }>;
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: {
    employeeNumber?: string;
    costCenter?: string;
    organization?: string;
    division?: string;
    department?: string;
    manager?: {
      value?: string;
      $ref?: string;
      displayName?: string;
    };
  };
  meta?: {
    resourceType?: string;
    created?: string;
    lastModified?: string;
    location?: string;
    version?: string;
  };
}

export interface SCIMGroup {
  schemas: string[];
  id?: string;
  externalId?: string;
  displayName: string;
  members?: Array<{
    value: string;
    $ref?: string;
    display?: string;
  }>;
  meta?: {
    resourceType?: string;
    created?: string;
    lastModified?: string;
    location?: string;
  };
}

// ============================================================================
// Local Types
// ============================================================================

export interface LocalUser {
  id: string;
  externalId?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  title?: string;
  department?: string;
  organization?: string;
  manager?: string;
  employeeNumber?: string;
  phone?: string;
  photoUrl?: string;
  role: string;
  permissions: string[];
  groups: string[];
  status: 'active' | 'inactive' | 'suspended' | 'pending_deletion';
  locale?: string;
  timezone?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  provisionedBy?: string;
  provisionedAt?: Date;
  deprovisionedAt?: Date;
  deprovisionReason?: string;
}

export interface LocalGroup {
  id: string;
  externalId?: string;
  name: string;
  displayName: string;
  description?: string;
  role?: string;
  permissions: string[];
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AttributeMapping {
  source: string;
  target: string;
  transform?: (value: any) => any;
  required?: boolean;
  defaultValue?: any;
}

export interface ProvisioningConfig {
  enabled: boolean;
  mode: 'push' | 'pull' | 'bidirectional';

  // SCIM settings
  scimEndpoint?: string;
  scimToken?: string;
  scimVersion: '1.1' | '2.0';

  // Sync settings
  syncInterval: number; // milliseconds
  batchSize: number;
  maxRetries: number;
  retryDelay: number; // milliseconds

  // Lifecycle settings
  autoProvision: boolean;
  autoDeprovision: boolean;
  deprovisionDelay: number; // days before hard delete
  suspendBeforeDelete: boolean;

  // Data retention
  retainUserData: boolean;
  dataRetentionDays: number;
  archiveOnDelete: boolean;

  // Conflict resolution
  conflictResolution: 'source_wins' | 'target_wins' | 'newest_wins' | 'manual';

  // Attribute mapping
  attributeMappings: AttributeMapping[];
  groupMappings: Record<string, string>; // external group -> local role

  // HR integrations
  hrIntegrations: HRIntegrationConfig[];
}

export interface HRIntegrationConfig {
  type: 'workday' | 'bamboohr' | 'sap' | 'adp' | 'oracle_hcm' | 'custom';
  enabled: boolean;
  endpoint: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  syncFields: string[];
  customHeaders?: Record<string, string>;
}

// ============================================================================
// Result Types
// ============================================================================

export interface ProvisioningResult {
  success: boolean;
  userId?: string;
  action: 'create' | 'update' | 'disable' | 'delete' | 'restore';
  source: string;
  details?: string;
  error?: string;
  timestamp: Date;
}

export interface SyncResult {
  startTime: Date;
  endTime: Date;
  duration: number;
  totalProcessed: number;
  created: number;
  updated: number;
  disabled: number;
  deleted: number;
  errors: number;
  conflicts: number;
  details: ProvisioningResult[];
}

export interface ConflictRecord {
  id: string;
  userId: string;
  sourceData: Partial<LocalUser>;
  targetData: Partial<LocalUser>;
  conflictFields: string[];
  resolution?: 'source' | 'target' | 'merged' | 'pending';
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  userId: string;
  performedBy: string;
  source: string;
  details: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface BulkOperation {
  id: string;
  type: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successRecords: number;
  failedRecords: number;
  startedAt?: Date;
  completedAt?: Date;
  errors: Array<{ record: number; error: string }>;
  resultUrl?: string;
}

// ============================================================================
// Default Attribute Mappings
// ============================================================================

export const DEFAULT_ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
  { source: 'userName', target: 'username', required: true },
  { source: 'emails[0].value', target: 'email', required: true },
  { source: 'name.givenName', target: 'firstName' },
  { source: 'name.familyName', target: 'lastName' },
  { source: 'displayName', target: 'displayName' },
  { source: 'title', target: 'title' },
  { source: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.department', target: 'department' },
  { source: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.organization', target: 'organization' },
  { source: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.employeeNumber', target: 'employeeNumber' },
  { source: 'phoneNumbers[0].value', target: 'phone' },
  { source: 'photos[0].value', target: 'photoUrl' },
  { source: 'locale', target: 'locale' },
  { source: 'timezone', target: 'timezone' },
  { source: 'active', target: 'status', transform: (v) => v ? 'active' : 'inactive' },
];

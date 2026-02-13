/**
 * LDAP & Active Directory Type Definitions
 * Comprehensive type system for LDAP integration
 */

export interface LDAPConfig {
  enabled: boolean;
  url: string; // ldaps://ad.company.com:636
  baseDN: string; // dc=company,dc=com
  bindDN: string; // cn=admin,dc=company,dc=com
  bindPassword: string;

  // Connection settings
  timeout?: number; // milliseconds (default: 5000)
  connectTimeout?: number; // milliseconds (default: 10000)
  idleTimeout?: number; // milliseconds (default: 300000)
  reconnect?: boolean; // auto-reconnect on disconnect (default: true)

  // TLS/SSL settings
  tlsOptions?: {
    rejectUnauthorized?: boolean;
    ca?: string[]; // CA certificates
    cert?: string; // Client certificate
    key?: string; // Client key
  };

  // Search settings
  searchFilter?: string; // (&(objectClass=user)(sAMAccountName={{username}}))
  searchScope?: 'base' | 'one' | 'sub'; // default: 'sub'
  searchAttributes?: string[]; // Attributes to retrieve

  // Group settings
  groupBaseDN?: string; // ou=groups,dc=company,dc=com
  groupSearchFilter?: string; // (objectClass=group)
  groupMemberAttribute?: string; // member (AD) or memberUid (OpenLDAP)

  // User attributes mapping
  userAttributes?: {
    username?: string; // sAMAccountName (AD) or uid (OpenLDAP)
    email?: string; // mail
    firstName?: string; // givenName
    lastName?: string; // sn
    displayName?: string; // displayName
    memberOf?: string; // memberOf
    department?: string; // department
    title?: string; // title
    phone?: string; // telephoneNumber
    manager?: string; // manager
  };

  // Group mapping
  groupMapping?: Record<string, string>; // LDAP group DN -> app role

  // Connection pool settings
  poolSize?: number; // default: 5
  poolMaxIdleTime?: number; // milliseconds (default: 300000)
}

export interface ActiveDirectoryConfig extends LDAPConfig {
  domain?: string; // COMPANY
  domainController?: string; // dc01.company.com
  globalCatalogServer?: string; // gc._msdcs.company.com

  // AD-specific settings
  userAccountControl?: {
    enabled?: boolean; // Check if account is enabled
    passwordExpired?: boolean; // Check if password is expired
    locked?: boolean; // Check if account is locked
  };

  // Nested group settings
  nestedGroups?: boolean; // Support nested groups (default: true)
  maxNestedDepth?: number; // Maximum depth for nested groups (default: 10)

  // Multi-domain support
  trustedDomains?: string[]; // List of trusted domains
}

export interface LDAPUser {
  dn: string; // Distinguished Name
  uid: string; // User ID
  username: string; // Username (sAMAccountName or uid)
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  department?: string;
  title?: string;
  phone?: string;
  manager?: string;
  memberOf?: string[]; // Group DNs
  groups?: string[]; // Group names
  attributes?: Record<string, any>; // Raw LDAP attributes

  // AD-specific
  userAccountControl?: number;
  accountEnabled?: boolean;
  passwordExpired?: boolean;
  accountLocked?: boolean;
  lastLogon?: Date;
  pwdLastSet?: Date;
}

export interface LDAPGroup {
  dn: string; // Distinguished Name
  cn: string; // Common Name
  name: string; // Group name
  description?: string;
  members?: string[]; // Member DNs
  memberOf?: string[]; // Parent group DNs
  attributes?: Record<string, any>; // Raw LDAP attributes
}

export interface LDAPSearchOptions {
  filter: string; // LDAP filter
  scope?: 'base' | 'one' | 'sub'; // Search scope
  attributes?: string[]; // Attributes to retrieve
  sizeLimit?: number; // Maximum number of entries
  timeLimit?: number; // Time limit in seconds
  paged?: boolean; // Use paged results
  pageSize?: number; // Page size for paged results
}

export interface LDAPSearchResult {
  entries: any[];
  referrals?: string[];
}

export interface LDAPAuthResult {
  success: boolean;
  user?: LDAPUser;
  groups?: string[];
  error?: string;
  errorCode?: string;
}

export interface LDAPConnectionPool {
  size: number;
  active: number;
  idle: number;
  waiting: number;
}

export interface LDAPConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  failedConnections: number;
  reconnections: number;
  averageResponseTime: number; // milliseconds
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface GroupMappingRule {
  ldapGroup: string; // LDAP group DN or CN
  appRole: string; // Application role
  priority?: number; // Priority (higher = more important)
  condition?: (user: LDAPUser) => boolean; // Additional condition
}

export interface UserProvisioningConfig {
  enabled: boolean;
  autoCreate?: boolean; // Auto-create users on first login
  autoUpdate?: boolean; // Auto-update user attributes on login
  autoDeactivate?: boolean; // Auto-deactivate users removed from LDAP

  // Default values for new users
  defaultRole?: string;
  defaultStatus?: 'active' | 'inactive' | 'suspended';
  defaultPermissions?: string[];

  // Attribute sync settings
  syncAttributes?: string[]; // Attributes to sync
  syncOnLogin?: boolean; // Sync on every login
  syncInterval?: number; // Background sync interval (milliseconds)

  // Deactivation settings
  deactivateOnMissingUser?: boolean; // Deactivate if user not found in LDAP
  deactivateOnDisabledAccount?: boolean; // Deactivate if AD account is disabled
  deactivateDelay?: number; // Delay before deactivation (milliseconds)
}

export interface UserSyncResult {
  totalUsers: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: number;
  duration: number; // milliseconds
  details?: {
    createdUsers?: string[];
    updatedUsers?: string[];
    deactivatedUsers?: string[];
    errors?: Array<{ user: string; error: string }>;
  };
}

export interface MultiAuthConfig {
  strategies: AuthStrategy[];
  fallback?: boolean; // Try next strategy on failure
  priority?: 'order' | 'user-preference'; // Strategy selection
  defaultStrategy?: string;
}

export interface AuthStrategy {
  name: string;
  type: 'ldap' | 'saml' | 'oauth2' | 'local';
  enabled: boolean;
  priority?: number;
  config?: any;
}

export interface AuthenticationContext {
  username: string;
  password?: string;
  strategy?: string; // Preferred strategy
  domain?: string; // For multi-domain AD
  attributes?: Record<string, any>; // Additional context
}

export interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    role: string;
    permissions: string[];
    groups?: string[];
    attributes?: Record<string, any>;
  };
  strategy?: string; // Strategy used
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  errorCode?: string;
}

// Error codes
export enum LDAPErrorCode {
  SUCCESS = '0',
  OPERATIONS_ERROR = '1',
  PROTOCOL_ERROR = '2',
  TIME_LIMIT_EXCEEDED = '3',
  SIZE_LIMIT_EXCEEDED = '4',
  AUTH_METHOD_NOT_SUPPORTED = '7',
  STRONGER_AUTH_REQUIRED = '8',
  INVALID_CREDENTIALS = '49',
  INSUFFICIENT_ACCESS_RIGHTS = '50',
  BUSY = '51',
  UNAVAILABLE = '52',
  UNWILLING_TO_PERFORM = '53',
  CONSTRAINT_VIOLATION = '19',
  INVALID_DN_SYNTAX = '34',
  NO_SUCH_OBJECT = '32',
  ALREADY_EXISTS = '68',
  UNDEFINED_ATTRIBUTE_TYPE = '17',
  INAPPROPRIATE_MATCHING = '18',
  OTHER = '80',
  SERVER_DOWN = '81',
  LOCAL_ERROR = '82',
  ENCODING_ERROR = '83',
  DECODING_ERROR = '84',
  TIMEOUT = '85',
  AUTH_UNKNOWN = '86',
  FILTER_ERROR = '87',
  USER_CANCELLED = '88',
  PARAM_ERROR = '89',
  NO_MEMORY = '90',
  CONNECT_ERROR = '91',
  NOT_SUPPORTED = '92',
  CONTROL_NOT_FOUND = '93',
  NO_RESULTS_RETURNED = '94',
  MORE_RESULTS_TO_RETURN = '95',
  CLIENT_LOOP = '96',
  REFERRAL_LIMIT_EXCEEDED = '97'
}

// Event types
export interface LDAPClientEvents {
  connect: () => void;
  disconnect: (error?: Error) => void;
  error: (error: Error) => void;
  timeout: () => void;
  reconnect: () => void;
  idle: () => void;
}

// Performance metrics
export interface LDAPPerformanceMetrics {
  authenticationTime: number; // Average auth time (ms)
  searchTime: number; // Average search time (ms)
  bindTime: number; // Average bind time (ms)
  connectionTime: number; // Average connection time (ms)
  totalRequests: number;
  successRate: number; // Percentage
  errorRate: number; // Percentage
  cacheHitRate?: number; // If caching is enabled
}

// Cache configuration
export interface LDAPCacheConfig {
  enabled: boolean;
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache entries
  strategy?: 'lru' | 'lfu' | 'fifo'; // Cache eviction strategy
}

// Audit logging
export interface LDAPAuditLog {
  timestamp: Date;
  event: 'auth' | 'search' | 'bind' | 'modify' | 'add' | 'delete';
  username?: string;
  dn?: string;
  success: boolean;
  duration: number; // milliseconds
  error?: string;
  errorCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

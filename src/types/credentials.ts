/**
 * Credentials Type Definitions
 * PROJET SAUVÉ - Phase 5.2: Credentials Manager
 */

/**
 * Credential types
 */
export type CredentialType =
  | 'api_key'
  | 'basic_auth'
  | 'oauth2'
  | 'oauth1'
  | 'bearer_token'
  | 'custom';

/**
 * OAuth2 grant types
 */
export type OAuth2GrantType =
  | 'authorization_code'
  | 'client_credentials'
  | 'refresh_token'
  | 'password';

/**
 * Credential status
 */
export type CredentialStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'error';

/**
 * Base credential interface
 */
export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  status: CredentialStatus;
  data: Record<string, any>;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date;
  lastTestedAt?: Date;
  testStatus?: 'success' | 'failed';
  testError?: string;
}

/**
 * API Key credential
 */
export interface ApiKeyCredential extends Credential {
  type: 'api_key';
  data: {
    apiKey: string;
    headerName?: string;
    prefix?: string;
  };
}

/**
 * Basic Auth credential
 */
export interface BasicAuthCredential extends Credential {
  type: 'basic_auth';
  data: {
    username: string;
    password: string;
  };
}

/**
 * Bearer Token credential
 */
export interface BearerTokenCredential extends Credential {
  type: 'bearer_token';
  data: {
    token: string;
  };
}

/**
 * OAuth2 credential
 */
export interface OAuth2Credential extends Credential {
  type: 'oauth2';
  data: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
    scope?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    redirectUri?: string;
    grantType: OAuth2GrantType;
    state?: string;
    codeVerifier?: string;
    codeChallenge?: string;
  };
}

/**
 * OAuth1 credential
 */
export interface OAuth1Credential extends Credential {
  type: 'oauth1';
  data: {
    consumerKey: string;
    consumerSecret: string;
    accessToken?: string;
    accessTokenSecret?: string;
    requestTokenUrl?: string;
    authorizeUrl?: string;
    accessTokenUrl?: string;
    signatureMethod?: 'HMAC-SHA1' | 'PLAINTEXT';
  };
}

/**
 * Custom credential
 */
export interface CustomCredential extends Credential {
  type: 'custom';
  data: Record<string, any>;
}

/**
 * Credential filter
 */
export interface CredentialFilter {
  type?: CredentialType;
  status?: CredentialStatus;
  tags?: string[];
  search?: string;
  createdBy?: string;
}

/**
 * Credential encryption options
 */
export interface EncryptionOptions {
  algorithm?: 'aes-256-gcm' | 'aes-256-cbc';
  keyDerivation?: 'pbkdf2' | 'scrypt';
  iterations?: number;
  saltLength?: number;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag?: string;
  salt?: string;
  algorithm: string;
}

/**
 * OAuth2 authorization parameters
 */
export interface OAuth2AuthParams {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  responseType?: 'code' | 'token';
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  accessType?: 'online' | 'offline';
  prompt?: 'none' | 'consent' | 'select_account';
}

/**
 * OAuth2 token response
 */
export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth2 configuration
 */
export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string;
  grantType: OAuth2GrantType;
  usePKCE?: boolean;
}

/**
 * Credential test result
 */
export interface CredentialTestResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp: Date;
  responseTime?: number;
}

/**
 * Credential usage tracking
 */
export interface CredentialUsage {
  credentialId: string;
  workflowId?: string;
  nodeId?: string;
  executionId?: string;
  usedAt: Date;
  success: boolean;
  error?: string;
}

/**
 * Credential change event
 */
export interface CredentialChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'tested';
  credential: Credential;
  previousValue?: any;
  timestamp: Date;
}

/**
 * Credential template
 */
export interface CredentialTemplate {
  id: string;
  name: string;
  type: CredentialType;
  description: string;
  fields: CredentialField[];
  testEndpoint?: string;
  documentationUrl?: string;
  icon?: string;
}

/**
 * Credential field definition
 */
export interface CredentialField {
  name: string;
  label: string;
  type: 'string' | 'password' | 'url' | 'number' | 'boolean' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Credential share settings
 */
export interface CredentialShareSettings {
  credentialId: string;
  sharedWith: string[];
  permissions: ('read' | 'use' | 'update' | 'delete')[];
  expiresAt?: Date;
}

/**
 * Credential export format
 */
export interface CredentialExport {
  version: string;
  exportedAt: Date;
  credentials: Array<{
    name: string;
    type: CredentialType;
    description?: string;
    tags?: string[];
    data: Record<string, any>;
  }>;
}

/**
 * Credential import options
 */
export interface CredentialImportOptions {
  overwrite?: boolean;
  skipInvalid?: boolean;
  validateOnly?: boolean;
}

/**
 * Credential validation result
 */
export interface CredentialValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors?: Record<string, string[]>;
}

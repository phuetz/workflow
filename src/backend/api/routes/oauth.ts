/**
 * OAuth2 API Routes
 * Handles OAuth 2.0 authorization flows for multiple providers
 * Integrates with credential storage for secure token management
 *
 * SECURITY FEATURES:
 * - OAuth state stored in Redis with TTL (prevents CSRF attacks)
 * - Cryptographically secure state generation
 * - Single-use state tokens (deleted after validation)
 * - Automatic state expiration cleanup
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { oauth2Service } from '../../auth/OAuth2Service';
import { encryptionService, EncryptedData } from '../../security/EncryptionService';
import { logger } from '../../../services/SimpleLogger';
import { prisma } from '../../database/prisma';
import { authHandler, AuthRequest } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { CredentialType } from '@prisma/client';
import { cacheLayer as cacheService } from '../../../services/CacheLayer';

// Session data structure for OAuth2
interface SessionData {
  pkceVerifier?: string;
  oauthState?: string;
  oauthProvider?: string;
  oauthUserId?: string;
  oauthRedirectUri?: string;
  oauth2Credentials?: {
    [provider: string]: {
      encrypted: EncryptedData;
      userInfo?: OAuth2UserInfo;
      connectedAt?: string;
      lastRefreshed?: string;
    };
  };
}

// Type for Request with OAuth session
type RequestWithSession = Request & {
  session?: SessionData;
};

// OAuth provider configuration
interface OAuthProviderConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  revokeUrl?: string;
  defaultScopes: string[];
  availableScopes: {
    scope: string;
    description: string;
    required?: boolean;
  }[];
  supportsPKCE: boolean;
  supportsRefreshToken: boolean;
  configured: boolean;
}

// OAuth user info
interface OAuth2UserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: string;
  raw?: Record<string, unknown>;
}

// ============================================
// SECURITY: Redis-based OAuth State Storage
// ============================================

/**
 * OAuth state data structure stored in Redis
 */
interface OAuthStateData {
  provider: string;
  userId: string;
  codeVerifier?: string;
  redirectUri?: string;
  scopes: string[];
  usePKCE: boolean;
  createdAt: number;
}

// State expiration time (10 minutes)
const STATE_EXPIRATION_MS = 10 * 60 * 1000;
const STATE_TTL_SECONDS = Math.ceil(STATE_EXPIRATION_MS / 1000);

// Cache namespace for OAuth states
const OAUTH_STATE_NAMESPACE = 'oauth_state';

/**
 * Generate a cryptographically secure OAuth state token
 * Uses 32 bytes of random data for high entropy
 */
function generateSecureState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store OAuth state in Redis with automatic expiration
 * This prevents CSRF attacks and ensures states are cleaned up automatically
 */
async function storeOAuthState(state: string, data: OAuthStateData): Promise<void> {
  await cacheService.set(state, data, {
    ttl: STATE_TTL_SECONDS,
    namespace: OAUTH_STATE_NAMESPACE,
    tags: [`oauth:user:${data.userId}`, `oauth:provider:${data.provider}`]
  });

  logger.debug('OAuth state stored in Redis', {
    state: state.substring(0, 8) + '...',
    provider: data.provider,
    userId: data.userId,
    ttlSeconds: STATE_TTL_SECONDS
  });
}

/**
 * Retrieve and delete OAuth state from Redis (single-use)
 * Returns null if state not found or expired
 */
async function consumeOAuthState(state: string): Promise<OAuthStateData | null> {
  const data = await cacheService.get<OAuthStateData>(state, {
    namespace: OAUTH_STATE_NAMESPACE
  });

  if (data) {
    // Delete state immediately after retrieval (single-use token)
    await cacheService.delete(state, OAUTH_STATE_NAMESPACE);

    logger.debug('OAuth state consumed and deleted', {
      state: state.substring(0, 8) + '...',
      provider: data.provider
    });
  }

  return data;
}

/**
 * Validate OAuth state exists without consuming it (for logging/debugging)
 */
async function validateOAuthStateExists(state: string): Promise<boolean> {
  const data = await cacheService.get<OAuthStateData>(state, {
    namespace: OAUTH_STATE_NAMESPACE
  });
  return data !== null;
}

const router = Router();

/**
 * Provider configurations with detailed scope information
 */
const PROVIDER_CONFIGS: Record<string, Omit<OAuthProviderConfig, 'configured'>> = {
  google: {
    name: 'google',
    displayName: 'Google',
    description: 'Connect with Google services (Gmail, Drive, Calendar, Sheets)',
    icon: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    defaultScopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    availableScopes: [
      { scope: 'https://www.googleapis.com/auth/userinfo.email', description: 'View email address', required: true },
      { scope: 'https://www.googleapis.com/auth/userinfo.profile', description: 'View basic profile info', required: true },
      { scope: 'https://www.googleapis.com/auth/drive.file', description: 'View and manage files created by this app' },
      { scope: 'https://www.googleapis.com/auth/drive', description: 'Full access to Google Drive' },
      { scope: 'https://www.googleapis.com/auth/calendar', description: 'Full access to Google Calendar' },
      { scope: 'https://www.googleapis.com/auth/calendar.readonly', description: 'Read-only access to Calendar' },
      { scope: 'https://www.googleapis.com/auth/spreadsheets', description: 'Full access to Google Sheets' },
      { scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', description: 'Read-only access to Sheets' },
      { scope: 'https://www.googleapis.com/auth/gmail.send', description: 'Send emails on your behalf' },
      { scope: 'https://www.googleapis.com/auth/gmail.readonly', description: 'Read email messages' }
    ],
    supportsPKCE: true,
    supportsRefreshToken: true
  },
  github: {
    name: 'github',
    displayName: 'GitHub',
    description: 'Connect with GitHub for repository access and automation',
    icon: 'github',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    revokeUrl: 'https://api.github.com/applications/{client_id}/token',
    defaultScopes: ['user', 'repo'],
    availableScopes: [
      { scope: 'user', description: 'Read user profile data', required: true },
      { scope: 'user:email', description: 'Access user email addresses' },
      { scope: 'repo', description: 'Full access to repositories' },
      { scope: 'public_repo', description: 'Access public repositories only' },
      { scope: 'repo:status', description: 'Access commit status' },
      { scope: 'repo_deployment', description: 'Access deployment status' },
      { scope: 'gist', description: 'Create and modify gists' },
      { scope: 'workflow', description: 'Update GitHub Actions workflows' },
      { scope: 'admin:org', description: 'Full organization access' },
      { scope: 'read:org', description: 'Read organization data' }
    ],
    supportsPKCE: false, // GitHub doesn't support PKCE yet
    supportsRefreshToken: true
  },
  slack: {
    name: 'slack',
    displayName: 'Slack',
    description: 'Connect with Slack for messaging and channel automation',
    icon: 'slack',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com/api/users.identity',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    defaultScopes: ['chat:write', 'users:read'],
    availableScopes: [
      { scope: 'chat:write', description: 'Send messages as the app', required: true },
      { scope: 'users:read', description: 'View users in workspace', required: true },
      { scope: 'users:read.email', description: 'View email addresses' },
      { scope: 'channels:read', description: 'View public channel info' },
      { scope: 'channels:history', description: 'View messages in public channels' },
      { scope: 'channels:join', description: 'Join public channels' },
      { scope: 'files:write', description: 'Upload and modify files' },
      { scope: 'files:read', description: 'View files shared in channels' },
      { scope: 'reactions:write', description: 'Add emoji reactions' },
      { scope: 'im:write', description: 'Send direct messages' }
    ],
    supportsPKCE: false,
    supportsRefreshToken: true
  },
  microsoft: {
    name: 'microsoft',
    displayName: 'Microsoft',
    description: 'Connect with Microsoft 365 services (Outlook, OneDrive, Teams)',
    icon: 'microsoft',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    revokeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
    defaultScopes: ['openid', 'profile', 'email', 'User.Read'],
    availableScopes: [
      { scope: 'openid', description: 'Sign in and read profile', required: true },
      { scope: 'profile', description: 'View basic profile', required: true },
      { scope: 'email', description: 'View email address', required: true },
      { scope: 'User.Read', description: 'Read user profile', required: true },
      { scope: 'Mail.Send', description: 'Send emails' },
      { scope: 'Mail.Read', description: 'Read emails' },
      { scope: 'Mail.ReadWrite', description: 'Read and write emails' },
      { scope: 'Files.ReadWrite', description: 'Access OneDrive files' },
      { scope: 'Files.ReadWrite.All', description: 'Access all files' },
      { scope: 'Calendars.ReadWrite', description: 'Access calendars' },
      { scope: 'Calendars.Read', description: 'Read calendars' },
      { scope: 'Team.ReadBasic.All', description: 'Read Teams info' }
    ],
    supportsPKCE: true,
    supportsRefreshToken: true
  },
  hubspot: {
    name: 'hubspot',
    displayName: 'HubSpot',
    description: 'Connect with HubSpot CRM for contacts, deals, and marketing',
    icon: 'hubspot',
    authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    userInfoUrl: 'https://api.hubapi.com/oauth/v1/access-tokens/',
    defaultScopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    availableScopes: [
      { scope: 'crm.objects.contacts.read', description: 'Read contacts', required: true },
      { scope: 'crm.objects.contacts.write', description: 'Create and update contacts' },
      { scope: 'crm.objects.companies.read', description: 'Read companies' },
      { scope: 'crm.objects.companies.write', description: 'Create and update companies' },
      { scope: 'crm.objects.deals.read', description: 'Read deals' },
      { scope: 'crm.objects.deals.write', description: 'Create and update deals' },
      { scope: 'sales-email-read', description: 'Read sales email activity' },
      { scope: 'forms', description: 'Access forms' },
      { scope: 'tickets', description: 'Access support tickets' }
    ],
    supportsPKCE: false,
    supportsRefreshToken: true
  },
  shopify: {
    name: 'shopify',
    displayName: 'Shopify',
    description: 'Connect with Shopify for e-commerce automation',
    icon: 'shopify',
    authorizationUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    defaultScopes: ['read_products', 'read_orders'],
    availableScopes: [
      { scope: 'read_products', description: 'Read products', required: true },
      { scope: 'write_products', description: 'Create and update products' },
      { scope: 'read_orders', description: 'Read orders', required: true },
      { scope: 'write_orders', description: 'Create and update orders' },
      { scope: 'read_customers', description: 'Read customers' },
      { scope: 'write_customers', description: 'Create and update customers' },
      { scope: 'read_inventory', description: 'Read inventory' },
      { scope: 'write_inventory', description: 'Update inventory' },
      { scope: 'read_fulfillments', description: 'Read fulfillments' },
      { scope: 'write_fulfillments', description: 'Create fulfillments' }
    ],
    supportsPKCE: false,
    supportsRefreshToken: false
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    description: 'Connect with LinkedIn for professional networking',
    icon: 'linkedin',
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    defaultScopes: ['openid', 'profile', 'email'],
    availableScopes: [
      { scope: 'openid', description: 'OpenID Connect', required: true },
      { scope: 'profile', description: 'Read basic profile', required: true },
      { scope: 'email', description: 'Read email address', required: true },
      { scope: 'w_member_social', description: 'Post and share content' }
    ],
    supportsPKCE: true,
    supportsRefreshToken: true
  },
  salesforce: {
    name: 'salesforce',
    displayName: 'Salesforce',
    description: 'Connect with Salesforce CRM',
    icon: 'salesforce',
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
    revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
    defaultScopes: ['api', 'refresh_token', 'offline_access'],
    availableScopes: [
      { scope: 'api', description: 'Access Salesforce API', required: true },
      { scope: 'refresh_token', description: 'Obtain refresh tokens', required: true },
      { scope: 'offline_access', description: 'Access data offline' },
      { scope: 'full', description: 'Full access to account' },
      { scope: 'chatter_api', description: 'Access Chatter feeds' }
    ],
    supportsPKCE: true,
    supportsRefreshToken: true
  },
  notion: {
    name: 'notion',
    displayName: 'Notion',
    description: 'Connect with Notion for workspace automation',
    icon: 'notion',
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    defaultScopes: [],
    availableScopes: [
      { scope: 'read_content', description: 'Read pages and databases' },
      { scope: 'write_content', description: 'Create and edit content' },
      { scope: 'read_user', description: 'Read user information' }
    ],
    supportsPKCE: false,
    supportsRefreshToken: false
  },
  dropbox: {
    name: 'dropbox',
    displayName: 'Dropbox',
    description: 'Connect with Dropbox for file storage',
    icon: 'dropbox',
    authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    userInfoUrl: 'https://api.dropboxapi.com/2/users/get_current_account',
    revokeUrl: 'https://api.dropboxapi.com/2/auth/token/revoke',
    defaultScopes: [],
    availableScopes: [
      { scope: 'account_info.read', description: 'Read account info' },
      { scope: 'files.content.read', description: 'Read file content' },
      { scope: 'files.content.write', description: 'Write files' },
      { scope: 'files.metadata.read', description: 'Read file metadata' },
      { scope: 'files.metadata.write', description: 'Update file metadata' }
    ],
    supportsPKCE: true,
    supportsRefreshToken: true
  }
};

/**
 * GET /api/oauth/providers
 * Get list of all supported OAuth2 providers with their configurations
 */
router.get('/providers', (req: Request, res: Response) => {
  const providers = Object.entries(PROVIDER_CONFIGS).map(([key, config]) => ({
    ...config,
    configured: oauth2Service.isProviderConfigured(key)
  }));

  // Sort by configured first, then alphabetically
  providers.sort((a, b) => {
    if (a.configured !== b.configured) {
      return a.configured ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  res.json({
    success: true,
    providers,
    count: providers.length,
    configuredCount: providers.filter(p => p.configured).length
  });
});

/**
 * GET /api/oauth/providers/:provider
 * Get detailed configuration for a specific provider
 */
router.get('/providers/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;
  const config = PROVIDER_CONFIGS[provider];

  if (!config) {
    return res.status(404).json({
      success: false,
      error: `Provider '${provider}' not found`
    });
  }

  res.json({
    success: true,
    provider: {
      ...config,
      configured: oauth2Service.isProviderConfigured(provider)
    }
  });
});

/**
 * GET /api/oauth/authorize/:provider
 * Initiate OAuth2 authorization flow - returns redirect URL
 */
router.get('/authorize/:provider', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { provider } = req.params;
  const { scope, use_pkce, redirect_uri, response_mode } = req.query;

  // Validate provider
  if (!oauth2Service.isProviderConfigured(provider)) {
    const providerConfig = PROVIDER_CONFIGS[provider];
    if (!providerConfig) {
      throw new ApiError(404, `OAuth2 provider '${provider}' not found`);
    }
    throw new ApiError(400, `OAuth2 provider '${provider}' is not configured. Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET environment variables.`);
  }

  const userId = authReq.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Parse scopes if provided
  let scopes: string[] | undefined;
  if (scope) {
    if (typeof scope === 'string') {
      scopes = scope.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Determine if PKCE should be used
  const providerConfig = PROVIDER_CONFIGS[provider];
  const usePKCE = use_pkce === 'true' || (providerConfig?.supportsPKCE && use_pkce !== 'false');

  // Generate cryptographically secure state for CSRF protection
  const secureState = generateSecureState();

  // Generate authorization URL with our secure state
  const { url, codeVerifier } = await oauth2Service.getAuthorizationUrl(provider, {
    scope: scopes,
    usePKCE,
    state: secureState // Pass our secure state to be included in the URL
  });

  // Store state in Redis with automatic TTL expiration
  await storeOAuthState(secureState, {
    provider,
    userId,
    codeVerifier,
    redirectUri: typeof redirect_uri === 'string' ? redirect_uri : undefined,
    scopes: scopes || PROVIDER_CONFIGS[provider]?.defaultScopes || [],
    usePKCE,
    createdAt: Date.now()
  });

  logger.info('OAuth2 authorization initiated', {
    provider,
    userId,
    state: secureState.substring(0, 8) + '...',
    usePKCE,
    scopeCount: scopes?.length,
    storage: 'redis'
  });

  // Return redirect URL or redirect based on response_mode
  if (response_mode === 'json') {
    res.json({
      success: true,
      authorizationUrl: url,
      state: secureState,
      expiresIn: STATE_EXPIRATION_MS / 1000
    });
  } else {
    res.redirect(url);
  }
}));

/**
 * GET /api/oauth/callback/:provider
 * Handle OAuth2 callback from provider, exchange code for tokens, store encrypted
 */
router.get('/callback/:provider', asyncHandler(async (req: RequestWithSession, res: Response) => {
  const { provider } = req.params;
  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors from provider
  if (error) {
    logger.error('OAuth2 provider returned error', {
      provider,
      error,
      error_description
    });
    return res.redirect(`/credentials?error=${encodeURIComponent(error as string)}&provider=${provider}`);
  }

  // Validate required parameters
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Authorization code is required'
    });
  }

  if (!state || typeof state !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'State parameter is required for CSRF protection'
    });
  }

  // Validate state (CSRF protection) - retrieve and delete from Redis (single-use)
  const stateData = await consumeOAuthState(state);
  if (!stateData) {
    logger.warn('OAuth2 security: State not found or expired (potential CSRF attack)', {
      state: state.substring(0, 8) + '...',
      provider,
      ip: req.ip || (req.socket?.remoteAddress)
    });
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired state parameter. Please try again.'
    });
  }

  // Validate provider matches
  if (stateData.provider !== provider) {
    logger.warn('OAuth2 security: Provider mismatch (potential CSRF attack)', {
      expected: stateData.provider,
      received: provider,
      state: state.substring(0, 8) + '...',
      ip: req.ip || (req.socket?.remoteAddress)
    });
    return res.status(400).json({
      success: false,
      error: 'Provider mismatch in OAuth callback'
    });
  }

  // State already consumed by consumeOAuthState (single-use token)

  try {
    // Exchange code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(provider, code, state);

    // Get user info
    let userInfo: OAuth2UserInfo | undefined;
    try {
      const rawUserInfo = await oauth2Service.getUserInfo(provider, tokens.accessToken);
      userInfo = {
        id: rawUserInfo.id,
        email: rawUserInfo.email,
        name: rawUserInfo.name,
        picture: rawUserInfo.picture,
        provider,
        raw: rawUserInfo as unknown as Record<string, unknown>
      };
    } catch (err) {
      logger.warn('Failed to fetch user info', { provider, error: err });
      // Continue anyway - user info is optional
    }

    // Encrypt tokens for storage
    const encryptedTokens = await encryptionService.encryptOAuth2Tokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tokenType: tokens.tokenType
    });

    // Store credential in database
    const credentialData = {
      accessToken: '[ENCRYPTED]',
      refreshToken: tokens.refreshToken ? '[ENCRYPTED]' : undefined,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
      userInfo: userInfo ? {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      } : undefined,
      encryptedTokens: encryptedTokens
    };

    // Create or update credential in database
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId: stateData.userId,
        type: CredentialType.OAUTH2,
        name: { contains: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth` }
      }
    });

    let credential;
    const credentialName = userInfo?.email
      ? `${PROVIDER_CONFIGS[provider]?.displayName || provider} (${userInfo.email})`
      : `${PROVIDER_CONFIGS[provider]?.displayName || provider} OAuth`;

    if (existingCredential) {
      // Update existing credential
      credential = await prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          name: credentialName,
          data: JSON.stringify(credentialData),
          isActive: true,
          expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new credential
      credential = await prisma.credential.create({
        data: {
          name: credentialName,
          type: CredentialType.OAUTH2,
          description: `OAuth2 connection to ${PROVIDER_CONFIGS[provider]?.displayName || provider}`,
          data: JSON.stringify(credentialData),
          userId: stateData.userId,
          isActive: true,
          expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null
        }
      });
    }

    logger.info('OAuth2 credential stored successfully', {
      provider,
      userId: stateData.userId,
      credentialId: credential.id,
      hasRefreshToken: !!tokens.refreshToken,
      userEmail: userInfo?.email
    });

    // Redirect back to credentials page with success message
    const redirectUri = stateData.redirectUri || '/credentials';
    res.redirect(`${redirectUri}?provider=${provider}&status=connected&credentialId=${credential.id}`);
  } catch (error) {
    logger.error('OAuth2 callback error', { provider, error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.redirect(`/credentials?error=${encodeURIComponent(errorMessage)}&provider=${provider}`);
  }
}));

/**
 * POST /api/oauth/refresh/:credentialId
 * Force refresh OAuth2 access token for a specific credential
 */
router.post('/refresh/:credentialId', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { credentialId } = req.params;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Find credential
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Check credential type
  if (credential.type !== CredentialType.OAUTH2) {
    throw new ApiError(400, 'This credential is not an OAuth2 credential');
  }

  // Parse stored data
  let storedData: {
    encryptedTokens: EncryptedData;
    userInfo?: OAuth2UserInfo;
    scope?: string;
  };

  try {
    storedData = JSON.parse(credential.data);
  } catch {
    throw new ApiError(500, 'Failed to parse credential data');
  }

  // Decrypt tokens
  const tokens = await encryptionService.decryptOAuth2Tokens(storedData.encryptedTokens);

  if (!tokens.refreshToken) {
    throw new ApiError(400, 'No refresh token available. Please re-authorize.');
  }

  // Determine provider from credential name
  const providerMatch = Object.keys(PROVIDER_CONFIGS).find(p =>
    credential.name.toLowerCase().includes(p.toLowerCase())
  );

  if (!providerMatch) {
    throw new ApiError(400, 'Could not determine OAuth provider for this credential');
  }

  // Refresh the access token
  const newTokens = await oauth2Service.refreshAccessToken(providerMatch, tokens.refreshToken);

  // Encrypt new tokens
  const encryptedTokens = await encryptionService.encryptOAuth2Tokens({
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresAt: newTokens.expiresAt,
    scope: newTokens.scope,
    tokenType: newTokens.tokenType
  });

  // Update credential
  const updatedData = {
    ...storedData,
    encryptedTokens,
    accessToken: '[ENCRYPTED]',
    refreshToken: newTokens.refreshToken ? '[ENCRYPTED]' : undefined,
    expiresAt: newTokens.expiresAt,
    scope: newTokens.scope,
    tokenType: newTokens.tokenType,
    lastRefreshed: new Date().toISOString()
  };

  await prisma.credential.update({
    where: { id: credentialId },
    data: {
      data: JSON.stringify(updatedData),
      expiresAt: newTokens.expiresAt ? new Date(newTokens.expiresAt) : null,
      updatedAt: new Date()
    }
  });

  logger.info('OAuth2 token refreshed successfully', {
    provider: providerMatch,
    credentialId,
    expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000)
  });

  res.json({
    success: true,
    credentialId,
    expiresAt: newTokens.expiresAt,
    expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000),
    message: 'Token refreshed successfully'
  });
}));

/**
 * DELETE /api/oauth/revoke/:credentialId
 * Revoke OAuth2 tokens and delete credential
 */
router.delete('/revoke/:credentialId', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { credentialId } = req.params;
  const { deleteCredential = true } = req.query;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Find credential
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Check credential type
  if (credential.type !== CredentialType.OAUTH2) {
    throw new ApiError(400, 'This credential is not an OAuth2 credential');
  }

  // Parse stored data
  let storedData: {
    encryptedTokens: EncryptedData;
  };

  try {
    storedData = JSON.parse(credential.data);
  } catch {
    throw new ApiError(500, 'Failed to parse credential data');
  }

  // Determine provider from credential name
  const providerMatch = Object.keys(PROVIDER_CONFIGS).find(p =>
    credential.name.toLowerCase().includes(p.toLowerCase())
  );

  let revokeAccessSuccess = false;
  let revokeRefreshSuccess = false;

  if (providerMatch && oauth2Service.isProviderConfigured(providerMatch)) {
    try {
      // Decrypt tokens
      const tokens = await encryptionService.decryptOAuth2Tokens(storedData.encryptedTokens);

      // Revoke tokens at provider
      if (tokens.refreshToken) {
        revokeRefreshSuccess = await oauth2Service.revokeToken(
          providerMatch,
          tokens.refreshToken,
          'refresh_token'
        );
      }

      revokeAccessSuccess = await oauth2Service.revokeToken(
        providerMatch,
        tokens.accessToken,
        'access_token'
      );
    } catch (err) {
      logger.warn('Failed to revoke tokens at provider', { provider: providerMatch, error: err });
      // Continue with deletion even if revocation fails
    }
  }

  // Delete or deactivate credential
  if (deleteCredential === 'true' || deleteCredential === true) {
    await prisma.credential.delete({
      where: { id: credentialId }
    });
  } else {
    await prisma.credential.update({
      where: { id: credentialId },
      data: { isActive: false }
    });
  }

  logger.info('OAuth2 credential revoked', {
    provider: providerMatch,
    credentialId,
    deleted: deleteCredential === 'true' || deleteCredential === true,
    revokeAccessSuccess,
    revokeRefreshSuccess
  });

  res.json({
    success: true,
    message: 'OAuth2 credential revoked successfully',
    revokeAccessSuccess,
    revokeRefreshSuccess,
    deleted: deleteCredential === 'true' || deleteCredential === true
  });
}));

/**
 * GET /api/oauth/credentials
 * List all OAuth2 credentials for the authenticated user
 */
router.get('/credentials', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId,
      type: CredentialType.OAUTH2
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
      data: true
    }
  });

  // Parse stored data to extract user info and status
  const enhancedCredentials = credentials.map(cred => {
    let userInfo: OAuth2UserInfo | undefined;
    let needsRefresh = false;
    let isExpired = false;
    let provider = 'unknown';

    try {
      const data = JSON.parse(cred.data);
      userInfo = data.userInfo;

      if (data.expiresAt) {
        isExpired = Date.now() >= data.expiresAt;
        needsRefresh = oauth2Service.needsRefresh(data.expiresAt);
      }

      // Determine provider from name
      const providerMatch = Object.keys(PROVIDER_CONFIGS).find(p =>
        cred.name.toLowerCase().includes(p.toLowerCase())
      );
      if (providerMatch) {
        provider = providerMatch;
      }
    } catch {
      // Ignore parse errors
    }

    return {
      id: cred.id,
      name: cred.name,
      description: cred.description,
      provider,
      providerDisplayName: PROVIDER_CONFIGS[provider]?.displayName || provider,
      isActive: cred.isActive,
      userInfo: userInfo ? {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      } : undefined,
      expiresAt: cred.expiresAt,
      lastUsedAt: cred.lastUsedAt,
      needsRefresh,
      isExpired,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    };
  });

  res.json({
    success: true,
    credentials: enhancedCredentials,
    count: enhancedCredentials.length
  });
}));

/**
 * GET /api/oauth/credentials/:credentialId/status
 * Check OAuth2 credential status
 */
router.get('/credentials/:credentialId/status', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { credentialId } = req.params;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Find credential
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Check credential type
  if (credential.type !== CredentialType.OAUTH2) {
    throw new ApiError(400, 'This credential is not an OAuth2 credential');
  }

  // Parse stored data
  let storedData: {
    encryptedTokens: EncryptedData;
    userInfo?: OAuth2UserInfo;
    expiresAt?: number;
    scope?: string;
    lastRefreshed?: string;
  };

  try {
    storedData = JSON.parse(credential.data);
  } catch {
    throw new ApiError(500, 'Failed to parse credential data');
  }

  // Determine provider
  const providerMatch = Object.keys(PROVIDER_CONFIGS).find(p =>
    credential.name.toLowerCase().includes(p.toLowerCase())
  );

  // Decrypt tokens to check expiration
  const tokens = await encryptionService.decryptOAuth2Tokens(storedData.encryptedTokens);

  const expiresAt = tokens.expiresAt || 0;
  const isExpired = Date.now() >= expiresAt;
  const needsRefresh = oauth2Service.needsRefresh(expiresAt);

  res.json({
    success: true,
    credentialId,
    provider: providerMatch,
    providerDisplayName: providerMatch ? PROVIDER_CONFIGS[providerMatch]?.displayName : undefined,
    isActive: credential.isActive,
    connected: credential.isActive && !isExpired,
    userInfo: storedData.userInfo ? {
      email: storedData.userInfo.email,
      name: storedData.userInfo.name,
      picture: storedData.userInfo.picture
    } : undefined,
    expiresAt,
    expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
    needsRefresh,
    isExpired,
    hasRefreshToken: !!tokens.refreshToken,
    scope: tokens.scope,
    lastRefreshed: storedData.lastRefreshed,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt
  });
}));

/**
 * POST /api/oauth/credentials/:credentialId/test
 * Test OAuth2 credential by making an API call
 */
router.post('/credentials/:credentialId/test', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { credentialId } = req.params;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Find credential
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new ApiError(404, 'Credential not found');
  }

  // Check ownership
  if (credential.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  // Check credential type
  if (credential.type !== CredentialType.OAUTH2) {
    throw new ApiError(400, 'This credential is not an OAuth2 credential');
  }

  // Parse stored data
  let storedData: {
    encryptedTokens: EncryptedData;
  };

  try {
    storedData = JSON.parse(credential.data);
  } catch {
    throw new ApiError(500, 'Failed to parse credential data');
  }

  // Decrypt tokens
  const tokens = await encryptionService.decryptOAuth2Tokens(storedData.encryptedTokens);

  // Check if expired
  if (tokens.expiresAt && Date.now() >= tokens.expiresAt) {
    res.json({
      success: false,
      error: 'Token expired. Please refresh.',
      needsRefresh: true,
      hasRefreshToken: !!tokens.refreshToken
    });
    return;
  }

  // Determine provider
  const providerMatch = Object.keys(PROVIDER_CONFIGS).find(p =>
    credential.name.toLowerCase().includes(p.toLowerCase())
  );

  if (!providerMatch) {
    throw new ApiError(400, 'Could not determine OAuth provider for this credential');
  }

  try {
    // Test by fetching user info
    const userInfo = await oauth2Service.getUserInfo(providerMatch, tokens.accessToken);

    // Update last used
    await prisma.credential.update({
      where: { id: credentialId },
      data: { lastUsedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'OAuth2 credential is valid',
      userInfo: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      },
      expiresIn: tokens.expiresAt ? Math.floor((tokens.expiresAt - Date.now()) / 1000) : undefined
    });
  } catch (error) {
    logger.error('OAuth2 credential test failed', { credentialId, provider: providerMatch, error });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.json({
      success: false,
      error: errorMessage,
      needsRefresh: errorMessage.includes('401') || errorMessage.includes('Unauthorized')
    });
  }
}));

// Legacy routes for backward compatibility
// These redirect to the new endpoint structure

/**
 * GET /api/oauth/:provider/authorize (legacy)
 */
router.get('/:provider/authorize', authHandler, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { provider } = req.params;

  // Check if this is a valid provider name (not a reserved word)
  const reservedWords = ['providers', 'credentials', 'authorize', 'callback', 'refresh', 'revoke'];
  if (reservedWords.includes(provider)) {
    return next();
  }

  // Redirect to new format
  const queryString = Object.entries(req.query)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  res.redirect(`/api/oauth/authorize/${provider}${queryString ? '?' + queryString : ''}`);
}));

/**
 * GET /api/oauth/:provider/callback (legacy)
 */
router.get('/:provider/callback', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { provider } = req.params;

  // Check if this is a valid provider name
  const reservedWords = ['providers', 'credentials', 'authorize', 'callback', 'refresh', 'revoke'];
  if (reservedWords.includes(provider)) {
    return next();
  }

  // Redirect to new format
  const queryString = Object.entries(req.query)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  res.redirect(`/api/oauth/callback/${provider}${queryString ? '?' + queryString : ''}`);
}));

/**
 * POST /api/oauth/:provider/refresh (legacy)
 */
router.post('/:provider/refresh', authHandler, asyncHandler(async (req: RequestWithSession, res: Response, next: NextFunction) => {
  const { provider } = req.params;
  const { credentialId } = req.body;

  // Check if this is a valid provider name
  const reservedWords = ['providers', 'credentials', 'authorize', 'callback', 'refresh', 'revoke'];
  if (reservedWords.includes(provider)) {
    return next();
  }

  // If credentialId is provided, use the new endpoint
  if (credentialId) {
    res.redirect(307, `/api/oauth/refresh/${credentialId}`);
    return;
  }

  // Legacy session-based refresh
  if (!oauth2Service.isProviderConfigured(provider)) {
    return res.status(400).json({
      success: false,
      error: `OAuth2 provider '${provider}' is not configured`
    });
  }

  const encryptedCredential = req.session?.oauth2Credentials?.[provider]?.encrypted;
  if (!encryptedCredential) {
    return res.status(404).json({
      success: false,
      error: 'No OAuth2 credential found. Please use the new credential-based endpoints.'
    });
  }

  const tokens = await encryptionService.decryptOAuth2Tokens(encryptedCredential);

  if (!tokens.refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'No refresh token available. Please re-authorize.'
    });
  }

  const newTokens = await oauth2Service.refreshAccessToken(provider, tokens.refreshToken);
  const newEncryptedTokens = await encryptionService.encryptOAuth2Tokens(newTokens);

  if (req.session?.oauth2Credentials) {
    req.session.oauth2Credentials[provider].encrypted = newEncryptedTokens;
    req.session.oauth2Credentials[provider].lastRefreshed = new Date().toISOString();
  }

  res.json({
    success: true,
    expiresAt: newTokens.expiresAt,
    expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000)
  });
}));

/**
 * DELETE /api/oauth/:provider/revoke (legacy)
 */
router.delete('/:provider/revoke', authHandler, asyncHandler(async (req: RequestWithSession, res: Response, next: NextFunction) => {
  const { provider } = req.params;
  const { credentialId } = req.body;

  // Check if this is a valid provider name
  const reservedWords = ['providers', 'credentials', 'authorize', 'callback', 'refresh', 'revoke'];
  if (reservedWords.includes(provider)) {
    return next();
  }

  // If credentialId is provided, use the new endpoint
  if (credentialId) {
    res.redirect(307, `/api/oauth/revoke/${credentialId}`);
    return;
  }

  // Legacy session-based revoke
  if (!oauth2Service.isProviderConfigured(provider)) {
    return res.status(400).json({
      success: false,
      error: `OAuth2 provider '${provider}' is not configured`
    });
  }

  const encryptedCredential = req.session?.oauth2Credentials?.[provider]?.encrypted;
  if (!encryptedCredential) {
    return res.status(404).json({
      success: false,
      error: 'No OAuth2 credential found for this provider'
    });
  }

  const tokens = await encryptionService.decryptOAuth2Tokens(encryptedCredential);

  const revokeRefreshSuccess = tokens.refreshToken
    ? await oauth2Service.revokeToken(provider, tokens.refreshToken, 'refresh_token')
    : true;

  const revokeAccessSuccess = await oauth2Service.revokeToken(provider, tokens.accessToken, 'access_token');

  if (req.session?.oauth2Credentials) {
    delete req.session.oauth2Credentials[provider];
  }

  res.json({
    success: true,
    message: 'OAuth2 credential revoked successfully',
    revokeRefreshSuccess,
    revokeAccessSuccess
  });
}));

/**
 * GET /api/oauth/:provider/status (legacy)
 */
router.get('/:provider/status', authHandler, asyncHandler(async (req: RequestWithSession, res: Response, next: NextFunction) => {
  const { provider } = req.params;

  // Check if this is a valid provider name
  const reservedWords = ['providers', 'credentials', 'authorize', 'callback', 'refresh', 'revoke'];
  if (reservedWords.includes(provider)) {
    return next();
  }

  if (!oauth2Service.isProviderConfigured(provider)) {
    return res.status(400).json({
      success: false,
      error: `OAuth2 provider '${provider}' is not configured`
    });
  }

  const credential = req.session?.oauth2Credentials?.[provider];
  if (!credential) {
    return res.json({
      connected: false,
      provider,
      message: 'Use credential-based endpoints for persistent OAuth connections'
    });
  }

  const tokens = await encryptionService.decryptOAuth2Tokens(credential.encrypted);

  const expiresAt = tokens.expiresAt || 0;
  const needsRefresh = oauth2Service.needsRefresh(expiresAt);
  const isExpired = Date.now() >= expiresAt;

  res.json({
    connected: true,
    provider,
    userInfo: credential.userInfo,
    connectedAt: credential.connectedAt,
    expiresAt,
    expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
    needsRefresh,
    isExpired,
    hasRefreshToken: !!tokens.refreshToken
  });
}));

export default router;

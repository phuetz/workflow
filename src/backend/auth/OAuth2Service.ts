/**
 * OAuth2 Service - Multi-provider OAuth 2.0 implementation
 * Supports: Google, Microsoft, GitHub, Slack, Salesforce
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import { encryptionService } from '../security/EncryptionService';

export interface OAuth2Provider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
  idToken?: string;
}

export interface OAuth2AuthorizationRequest {
  provider: string;
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  scope: string;
  createdAt: number;
}

export interface OAuth2UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
}

export class OAuth2Service {
  private providers: Map<string, OAuth2Provider> = new Map();
  private pendingRequests: Map<string, OAuth2AuthorizationRequest> = new Map();
  private readonly stateExpirationMs = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize OAuth2 providers from environment variables
   */
  private initializeProviders(): void {
    // Google OAuth2
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.providers.set('google', {
        name: 'Google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar'
        ],
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback'
      });
    }

    // Microsoft OAuth2
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      this.providers.set('microsoft', {
        name: 'Microsoft',
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: [
          'openid',
          'profile',
          'email',
          'User.Read',
          'Mail.Send',
          'Files.ReadWrite',
          'Calendars.ReadWrite'
        ],
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/oauth/microsoft/callback'
      });
    }

    // GitHub OAuth2
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.providers.set('github', {
        name: 'GitHub',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['user', 'repo', 'workflow'],
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/oauth/github/callback'
      });
    }

    // Slack OAuth2
    if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
      this.providers.set('slack', {
        name: 'Slack',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        userInfoUrl: 'https://slack.com/api/users.identity',
        scopes: [
          'chat:write',
          'channels:read',
          'channels:history',
          'users:read',
          'files:write'
        ],
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/slack/callback'
      });
    }

    // Salesforce OAuth2
    if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET) {
      this.providers.set('salesforce', {
        name: 'Salesforce',
        authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
        tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
        userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
        scopes: ['api', 'refresh_token', 'offline_access'],
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        redirectUri: process.env.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/api/oauth/salesforce/callback'
      });
    }

    logger.info(`Initialized ${this.providers.size} OAuth2 providers`, {
      providers: Array.from(this.providers.keys())
    });
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  async getAuthorizationUrl(
    providerName: string,
    options?: {
      scope?: string[];
      state?: string;
      usePKCE?: boolean;
    }
  ): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth2 provider '${providerName}' not configured`);
    }

    // Generate secure random state
    const state = options?.state || this.generateState();

    // Determine scopes
    const scopes = options?.scope && options.scope.length > 0
      ? options.scope
      : provider.scopes;

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline', // Request refresh token
      prompt: 'consent' // Force consent to get refresh token
    });

    // PKCE support for enhanced security
    let codeVerifier: string | undefined;
    if (options?.usePKCE) {
      codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    // Store pending request
    this.pendingRequests.set(state, {
      provider: providerName,
      state,
      codeVerifier,
      redirectUri: provider.redirectUri,
      scope: scopes.join(' '),
      createdAt: Date.now()
    });

    // Clean up expired requests
    this.cleanupExpiredRequests();

    const authUrl = `${provider.authorizationUrl}?${params.toString()}`;

    logger.info('Generated OAuth2 authorization URL', {
      provider: providerName,
      state,
      scopes: scopes.length
    });

    return { url: authUrl, state, codeVerifier };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    providerName: string,
    code: string,
    state: string
  ): Promise<OAuth2Tokens> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth2 provider '${providerName}' not configured`);
    }

    // Validate state
    const pendingRequest = this.pendingRequests.get(state);
    if (!pendingRequest) {
      throw new Error('Invalid or expired OAuth2 state');
    }

    if (pendingRequest.provider !== providerName) {
      throw new Error('Provider mismatch in OAuth2 callback');
    }

    // Remove used state
    this.pendingRequests.delete(state);

    // Prepare token request
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: provider.redirectUri,
      client_id: provider.clientId,
      client_secret: provider.clientSecret
    });

    // Add PKCE verifier if used
    if (pendingRequest.codeVerifier) {
      params.append('code_verifier', pendingRequest.codeVerifier);
    }

    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OAuth2 token exchange failed', {
          provider: providerName,
          status: response.status,
          error: errorText
        });
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
        id_token?: string;
      };

      // Calculate expiration time
      const expiresIn = data.expires_in || 3600;
      const expiresAt = Date.now() + (expiresIn * 1000);

      const tokens: OAuth2Tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        scope: data.scope || pendingRequest.scope,
        tokenType: data.token_type || 'Bearer',
        idToken: data.id_token
      };

      logger.info('Successfully exchanged code for tokens', {
        provider: providerName,
        hasRefreshToken: !!tokens.refreshToken,
        expiresIn
      });

      return tokens;
    } catch (error) {
      logger.error('Error exchanging authorization code', {
        provider: providerName,
        error
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    providerName: string,
    refreshToken: string
  ): Promise<OAuth2Tokens> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth2 provider '${providerName}' not configured`);
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: provider.clientId,
      client_secret: provider.clientSecret
    });

    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OAuth2 token refresh failed', {
          provider: providerName,
          status: response.status,
          error: errorText
        });
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
        id_token?: string;
      };

      const expiresIn = data.expires_in || 3600;
      const expiresAt = Date.now() + (expiresIn * 1000);

      const tokens: OAuth2Tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
        expiresAt,
        scope: data.scope || '',
        tokenType: data.token_type || 'Bearer',
        idToken: data.id_token
      };

      logger.info('Successfully refreshed access token', {
        provider: providerName,
        expiresIn
      });

      return tokens;
    } catch (error) {
      logger.error('Error refreshing access token', {
        provider: providerName,
        error
      });
      throw error;
    }
  }

  /**
   * Revoke OAuth2 token
   */
  async revokeToken(
    providerName: string,
    token: string,
    tokenTypeHint: 'access_token' | 'refresh_token' = 'refresh_token'
  ): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth2 provider '${providerName}' not configured`);
    }

    // Revocation endpoints vary by provider
    const revocationUrls: Record<string, string> = {
      google: 'https://oauth2.googleapis.com/revoke',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
      github: 'https://api.github.com/applications/{client_id}/token',
      slack: 'https://slack.com/api/auth.revoke',
      salesforce: 'https://login.salesforce.com/services/oauth2/revoke'
    };

    const revocationUrl = revocationUrls[providerName];
    if (!revocationUrl) {
      logger.warn(`No revocation endpoint for provider '${providerName}'`);
      return false;
    }

    try {
      const params = new URLSearchParams({
        token,
        token_type_hint: tokenTypeHint
      });

      const response = await fetch(revocationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const success = response.ok;
      logger.info('Token revocation attempt', {
        provider: providerName,
        success,
        status: response.status
      });

      return success;
    } catch (error) {
      logger.error('Error revoking token', {
        provider: providerName,
        error
      });
      return false;
    }
  }

  /**
   * Get user info from OAuth2 provider
   */
  async getUserInfo(
    providerName: string,
    accessToken: string
  ): Promise<OAuth2UserInfo> {
    const provider = this.providers.get(providerName);
    if (!provider || !provider.userInfoUrl) {
      throw new Error(`User info not available for provider '${providerName}'`);
    }

    try {
      const response = await fetch(provider.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const data = await response.json() as {
        id?: string;
        sub?: string;
        user_id?: string;
        email?: string;
        userPrincipalName?: string;
        emailAddress?: string;
        name?: string;
        displayName?: string;
        login?: string;
        picture?: string;
        avatar_url?: string;
        image_url?: string;
      };

      // Normalize user info across providers
      const userInfo: OAuth2UserInfo = {
        id: data.id || data.sub || data.user_id || '',
        email: data.email || data.userPrincipalName || data.emailAddress || '',
        name: data.name || data.displayName || data.login || '',
        picture: data.picture || data.avatar_url || data.image_url,
        provider: providerName
      };

      return userInfo;
    } catch (error) {
      logger.error('Error fetching user info', {
        provider: providerName,
        error
      });
      throw error;
    }
  }

  /**
   * Check if token needs refresh (expires in < 5 minutes)
   */
  needsRefresh(expiresAt: number): boolean {
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return Date.now() + bufferTime >= expiresAt;
  }

  /**
   * Validate provider configuration
   */
  isProviderConfigured(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): Array<{ name: string; displayName: string }> {
    return Array.from(this.providers.entries()).map(([key, provider]) => ({
      name: key,
      displayName: provider.name
    }));
  }

  // Private helper methods

  /**
   * Generate secure random state
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  /**
   * Clean up expired pending requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [state, request] of Array.from(this.pendingRequests.entries())) {
      if (now - request.createdAt > this.stateExpirationMs) {
        this.pendingRequests.delete(state);
      }
    }
  }
}

// Singleton instance
export const oauth2Service = new OAuth2Service();

/**
 * OAuth2 Service
 * Complete OAuth2 implementation for Google, GitHub, Microsoft
 */

import { logger } from './SimpleLogger';
import { prisma } from './PrismaService';
import { jwtService } from '../backend/auth/jwt';
import * as crypto from 'crypto';

interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

interface OAuth2User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  emailVerified?: boolean;
}

interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export class OAuth2Service {
  private providers: Map<string, OAuth2Config> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Google OAuth2
    if (process.env.VITE_GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.providers.set('google', {
        clientId: process.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/callback/google`,
        scope: ['openid', 'email', 'profile'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
      });
    }

    // GitHub OAuth2
    if (process.env.VITE_GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.providers.set('github', {
        clientId: process.env.VITE_GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.APP_URL}/auth/callback/github`,
        scope: ['user:email'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user'
      });
    }

    // Microsoft OAuth2
    if (process.env.VITE_MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      this.providers.set('microsoft', {
        clientId: process.env.VITE_MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.APP_URL}/auth/callback/microsoft`,
        scope: ['openid', 'email', 'profile'],
        authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
      });
    }

    logger.info(`🔐 OAuth2 providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Generate OAuth2 authorization URL
   */
  public generateAuthUrl(provider: string, options?: {
    state?: string;
    scopes?: string[];
    prompt?: string;
  }): string {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    const state = options?.state || this.generateSecureState();
    const scopes = options?.scopes || config.scope;
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: options?.prompt || 'consent'
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    logger.info(`🔗 Generated OAuth2 URL for ${provider}`, {
      provider,
      scopes: scopes.join(','),
      state
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  public async exchangeCodeForToken(
    provider: string,
    code: string,
    state?: string
  ): Promise<OAuth2TokenResponse> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
      const tokenData = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();

      logger.info(`✅ Token exchange successful for ${provider}`, {
        provider,
        hasRefreshToken: !!tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in
      });

      return tokenResponse;
    } catch (error) {
      logger.error(`❌ Token exchange failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get user information from OAuth2 provider
   */
  public async getUserInfo(provider: string, accessToken: string): Promise<OAuth2User> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
      const response = await fetch(config.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Workflow-Platform/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User info request failed: ${response.status} ${errorText}`);
      }

      const userData = await response.json();
      const normalizedUser = this.normalizeUserData(provider, userData as Record<string, unknown>);

      logger.info(`✅ User info retrieved for ${provider}`, {
        provider,
        userId: normalizedUser.id,
        email: normalizedUser.email
      });

      return normalizedUser;
    } catch (error) {
      logger.error(`❌ Failed to get user info from ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  public async refreshToken(
    provider: string,
    refreshToken: string
  ): Promise<OAuth2TokenResponse> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
      const tokenData = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();

      logger.info(`✅ Token refresh successful for ${provider}`);
      return tokenResponse;
    } catch (error) {
      logger.error(`❌ Token refresh failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Handle complete OAuth2 flow
   */
  public async handleCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{
    user: unknown;
    tokens: unknown;
    isNewUser: boolean;
  }> {
    try {
      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForToken(provider, code, state);

      // Get user information
      const oauthUser = await this.getUserInfo(provider, tokenResponse.access_token);

      // Find or create user in database
      const client = prisma();
      let user = await client.user.findUnique({
        where: { email: oauthUser.email }
      });

      let isNewUser = false;

      if (!user) {
        // Create new user
        user = await client.user.create({
          data: {
            email: oauthUser.email,
            firstName: oauthUser.firstName,
            lastName: oauthUser.lastName,
            profilePicture: oauthUser.profilePicture,
            emailVerified: oauthUser.emailVerified || true,
            passwordHash: '', // OAuth users don't have passwords
            role: 'USER',
            status: 'ACTIVE',
            preferences: {
              authProvider: provider,
              theme: 'light',
              notifications: {
                email: true,
                browser: true
              }
            }
          }
        });
        isNewUser = true;

        logger.info(`👤 New OAuth user created: ${user.email} via ${provider}`);
      } else {
        // Update existing user
        user = await client.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            profilePicture: oauthUser.profilePicture || user.profilePicture,
            emailVerified: true
          }
        });

        logger.info(`👤 Existing OAuth user logged in: ${user.email} via ${provider}`);
      }

      // Generate JWT tokens
      const jwtTokens = await jwtService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: this.getPermissionsForRole(user.role)
      });

      // Store OAuth tokens securely (optional)
      await this.storeOAuthTokens(user.id, provider, tokenResponse);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          profilePicture: user.profilePicture,
          emailVerified: user.emailVerified,
          permissions: this.getPermissionsForRole(user.role)
        },
        tokens: {
          accessToken: jwtTokens.accessToken,
          refreshToken: jwtTokens.refreshToken,
          expiresIn: jwtTokens.expiresIn,
          tokenType: 'Bearer'
        },
        isNewUser
      };
    } catch (error) {
      logger.error(`❌ OAuth callback failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Revoke OAuth2 tokens
   */
  public async revokeTokens(provider: string, accessToken: string): Promise<void> {
    const revokeUrls: Record<string, string> = {
      google: 'https://oauth2.googleapis.com/revoke',
      github: 'https://api.github.com/applications/revoke',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
    };

    const revokeUrl = revokeUrls[provider];
    if (!revokeUrl) {
      logger.warn(`No revoke URL configured for provider: ${provider}`);
      return;
    }

    try {
      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ token: accessToken })
      });

      if (response.ok) {
        logger.info(`✅ OAuth tokens revoked for ${provider}`);
      } else {
        logger.warn(`⚠️ Token revocation may have failed for ${provider}: ${response.status}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to revoke tokens for ${provider}:`, error);
    }
  }

  private normalizeUserData(provider: string, userData: Record<string, unknown>): OAuth2User {
    switch (provider) {
      case 'google':
        return {
          id: userData.id as string,
          email: userData.email as string,
          firstName: userData.given_name as string,
          lastName: userData.family_name as string,
          profilePicture: userData.picture as string,
          emailVerified: userData.email_verified as boolean
        };

      case 'github':
        return {
          id: (userData.id as number).toString(),
          email: userData.email as string,
          firstName: (userData.name as string)?.split(' ')[0],
          lastName: (userData.name as string)?.split(' ').slice(1).join(' '),
          profilePicture: userData.avatar_url as string,
          emailVerified: true // GitHub emails are considered verified
        };

      case 'microsoft':
        return {
          id: userData.id as string,
          email: (userData.mail || userData.userPrincipalName) as string,
          firstName: userData.givenName as string,
          lastName: userData.surname as string,
          profilePicture: undefined, // Microsoft Graph requires additional call
          emailVerified: true
        };

      default:
        throw new Error(`Unknown OAuth2 provider: ${provider}`);
    }
  }

  private async storeOAuthTokens(
    userId: string,
    provider: string,
    tokens: OAuth2TokenResponse
  ): Promise<void> {
    try {
      const client = prisma();

      const tokenData = JSON.stringify({
        provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000)
      });

      // Find existing OAuth credential for this user
      const existingCredential = await client.credential.findFirst({
        where: {
          userId,
          type: 'OAUTH2',
          name: `${provider} OAuth2`
        }
      });

      if (existingCredential) {
        // Update existing credential
        await client.credential.update({
          where: { id: existingCredential.id },
          data: {
            data: tokenData,
            lastUsedAt: new Date()
          }
        });
      } else {
        // Create new credential
        await client.credential.create({
          data: {
            userId,
            name: `${provider} OAuth2`,
            type: 'OAUTH2',
            data: tokenData,
            description: `OAuth2 tokens for ${provider}`
          }
        });
      }
    } catch (error) {
      logger.error('Failed to store OAuth tokens:', error);
      // Non-critical error, don't throw
    }
  }

  private getPermissionsForRole(role: string): string[] {
    const permissions = {
      ADMIN: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share', 'workflow.publish',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete',
        'user.create', 'user.read', 'user.update', 'user.delete',
        'system.admin', 'audit.read'
      ],
      USER: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete'
      ],
      VIEWER: [
        'workflow.read', 'credential.read'
      ]
    };

    return permissions[role as keyof typeof permissions] || [];
  }

  private generateSecureState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  public isProviderConfigured(provider: string): boolean {
    return this.providers.has(provider);
  }
}

// Export singleton instance
export const oauth2Service = new OAuth2Service();
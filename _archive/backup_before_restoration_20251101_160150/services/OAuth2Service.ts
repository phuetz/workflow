/**
 * OAuth2 Service
 * Complete OAuth2 implementation for Google, GitHub, Microsoft
 */

import { logger } from './LoggingService';
import { prisma } from './PrismaService';
import { jwtService } from '../backend/auth/jwt';
import crypto from 'crypto';

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
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: options?.prompt || 'consent'
    });

    
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
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      });

        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
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
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Workflow-Platform/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`User info request failed: ${response.status} ${errorText}`);
      }


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
    if (!config) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }

    try {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenData.toString()
      });

      if (!response.ok) {
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
      
      // Get user information
      
      // Find or create user in database
        where: { email: oauthUser.email }
      });


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
      google: 'https://oauth2.googleapis.com/revoke',
      github: 'https://api.github.com/applications/revoke',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
    };

    if (!revokeUrl) {
      logger.warn(`No revoke URL configured for provider: ${provider}`);
      return;
    }

    try {
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
          id: userData.id,
          email: userData.email,
          firstName: userData.given_name,
          lastName: userData.family_name,
          profilePicture: userData.picture,
          emailVerified: userData.email_verified
        };
      
      case 'github':
        return {
          id: userData.id.toString(),
          email: userData.email,
          firstName: userData.name?.split(' ')[0],
          lastName: userData.name?.split(' ').slice(1).join(' '),
          profilePicture: userData.avatar_url,
          emailVerified: true // GitHub emails are considered verified
        };
      
      case 'microsoft':
        return {
          id: userData.id,
          email: userData.mail || userData.userPrincipalName,
          firstName: userData.givenName,
          lastName: userData.surname,
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
      
      // Store encrypted OAuth tokens (optional feature)
      await client.credential.upsert({
        where: {
          userId_type: {
            userId,
            type: 'OAUTH2'
          }
        },
        update: {
          data: JSON.stringify({
            provider,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000)
          }),
          lastUsedAt: new Date()
        },
        create: {
          userId,
          name: `${provider} OAuth2`,
          type: 'OAUTH2',
          data: JSON.stringify({
            provider,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000)
          }),
          description: `OAuth2 tokens for ${provider}`
        }
      });
    } catch (error) {
      logger.error('Failed to store OAuth tokens:', error);
      // Non-critical error, don't throw
    }
  }

  private getPermissionsForRole(role: string): string[] {
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
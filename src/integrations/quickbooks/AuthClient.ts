/**
 * QuickBooks Authentication Manager
 * Handles OAuth2 authentication flow for QuickBooks Online
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import type { QuickBooksAuth } from './types';

/**
 * Authentication Manager for QuickBooks OAuth2
 */
export class AuthManager {
  private auth: QuickBooksAuth;
  private tokenRefreshTimer?: NodeJS.Timeout;

  constructor(auth: QuickBooksAuth) {
    this.auth = auth;
    this.scheduleTokenRefresh();
  }

  public updateAuth(auth: QuickBooksAuth): void {
    this.auth = { ...this.auth, ...auth };
    this.scheduleTokenRefresh();
  }

  public async getAuthorizationUrl(state?: string): Promise<string> {
    const baseUrl = this.auth.environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const params = new URLSearchParams({
      client_id: this.auth.clientId,
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: this.auth.redirectUri,
      response_type: 'code',
      state: state || crypto.randomBytes(16).toString('hex')
    });

    return `${baseUrl}/oauth2/v1/authorize?${params}`;
  }

  public async exchangeAuthorizationCode(code: string, realmId: string): Promise<void> {
    // Implementation would make actual API call
    // Simulated for demonstration
    this.auth.accessToken = 'access_' + crypto.randomBytes(32).toString('hex');
    this.auth.refreshToken = 'refresh_' + crypto.randomBytes(32).toString('hex');
    this.auth.realmId = realmId;
    this.auth.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    this.scheduleTokenRefresh();
  }

  public async refreshAccessToken(): Promise<void> {
    if (!this.auth.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Implementation would make actual API call
    // Simulated for demonstration
    this.auth.accessToken = 'access_' + crypto.randomBytes(32).toString('hex');
    this.auth.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    this.scheduleTokenRefresh();
  }

  public async revokeToken(): Promise<void> {
    // Implementation would make actual API call
    this.auth.accessToken = undefined;
    this.auth.refreshToken = undefined;
    this.auth.tokenExpiry = undefined;

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (this.auth.tokenExpiry && this.auth.refreshToken) {
      const refreshTime = this.auth.tokenExpiry.getTime() - Date.now() - 300000; // 5 minutes before expiry
      if (refreshTime > 0) {
        this.tokenRefreshTimer = setTimeout(() => {
          this.refreshAccessToken().catch((err) => logger.error('Error', err));
        }, refreshTime);
      }
    }
  }

  public getAccessToken(): string | undefined {
    return this.auth.accessToken;
  }

  public getRealmId(): string | undefined {
    return this.auth.realmId;
  }

  public getEnvironment(): 'sandbox' | 'production' {
    return this.auth.environment;
  }
}

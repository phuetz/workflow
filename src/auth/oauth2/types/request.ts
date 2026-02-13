/**
 * OAuth2 Request/Response Types
 * Authorization and token request types
 */

import type { GrantType, ResponseType } from './basic';

/**
 * Authorization Request
 */
export interface AuthorizationRequest {
  responseType: ResponseType;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  nonce?: string;
  display?: 'page' | 'popup' | 'touch' | 'wap';
  prompt?: 'none' | 'login' | 'consent' | 'select_account';
  maxAge?: number;
  uiLocales?: string;
  idTokenHint?: string;
  loginHint?: string;
  acrValues?: string;
  responseMode?: 'query' | 'fragment' | 'form_post' | 'web_message';
  codeChallenge?: string;
  codeChallengeMethod?: 'plain' | 'S256';
  claims?: any;
  claimsLocales?: string;
  request?: string;
  requestUri?: string;
  registration?: any;
}

/**
 * Token Request
 */
export interface TokenRequest {
  grantType: GrantType;
  code?: string;
  redirectUri?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  scope?: string;
  username?: string;
  password?: string;
  codeVerifier?: string;
  deviceCode?: string;
  assertion?: string;
  clientAssertion?: string;
  clientAssertionType?: string;
}

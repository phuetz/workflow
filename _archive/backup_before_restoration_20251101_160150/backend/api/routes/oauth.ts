/**
 * OAuth2 API Routes
 * Handles OAuth 2.0 authorization flows for multiple providers
 */

import express, { Request, Response, NextFunction } from 'express';
import { oauth2Service } from '../../auth/OAuth2Service';
import { encryptionService } from '../../security/EncryptionService';
import { logger } from '../../../services/LoggingService';

const router = express.Router();

/**
 * GET /api/oauth/:provider/authorize
 * Start OAuth2 authorization flow
 */
router.get('/:provider/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const { scope, use_pkce } = req.query;

    // Validate provider
    if (!oauth2Service.isProviderConfigured(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth2 provider '${provider}' is not configured`
      });
    }

    // Parse scopes if provided
    const scopes = scope
      ? (typeof scope === 'string' ? scope.split(',') : [])
      : undefined;

    // Generate authorization URL
    const { url, state, codeVerifier } = await oauth2Service.getAuthorizationUrl(provider, {
      scope: scopes,
      usePKCE: use_pkce === 'true'
    });

    // Store code verifier in session if PKCE is used
    if (codeVerifier && req.session) {
      req.session.pkceVerifier = codeVerifier;
    }

    // Store state in session for validation
    if (req.session) {
      req.session.oauthState = state;
      req.session.oauthProvider = provider;
    }

    logger.info('OAuth2 authorization initiated', {
      provider,
      state,
      usePKCE: !!codeVerifier
    });

    // Redirect to provider's authorization page
    res.redirect(url);
  } catch (error) {
    logger.error('OAuth2 authorization error', error);
    next(error);
  }
});

/**
 * GET /api/oauth/:provider/callback
 * Handle OAuth2 callback from provider
 */
router.get('/:provider/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error('OAuth2 provider returned error', {
        provider,
        error,
        error_description
      });
      return res.redirect(`/credentials?error=${encodeURIComponent(error as string)}`);
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
        error: 'State parameter is required'
      });
    }

    // Validate state matches session (CSRF protection)
    if (req.session?.oauthState !== state) {
      logger.warn('OAuth2 state mismatch', {
        provider,
        expectedState: req.session?.oauthState,
        receivedState: state
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter (CSRF protection)'
      });
    }

    // Validate provider matches session
    if (req.session?.oauthProvider !== provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider mismatch'
      });
    }

    // Exchange code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(provider, code, state);

    // Get user info
    let userInfo;
    try {
      userInfo = await oauth2Service.getUserInfo(provider, tokens.accessToken);
    } catch (error) {
      logger.warn('Failed to fetch user info', { provider, error });
      // Continue anyway - user info is optional
    }

    // Encrypt tokens before storing
    const encryptedTokens = await encryptionService.encryptOAuth2Tokens(tokens);

    // Store encrypted tokens in session/database
    // In production, this would be stored in database associated with user
    if (req.session) {
      req.session.oauth2Credentials = req.session.oauth2Credentials || {};
      req.session.oauth2Credentials[provider] = {
        encrypted: encryptedTokens,
        userInfo,
        connectedAt: new Date().toISOString()
      };
    }

    // Clean up session
    delete req.session.oauthState;
    delete req.session.oauthProvider;
    delete req.session.pkceVerifier;

    logger.info('OAuth2 authorization completed successfully', {
      provider,
      userEmail: userInfo?.email,
      hasRefreshToken: !!tokens.refreshToken
    });

    // Redirect back to credentials page with success message
    res.redirect(`/credentials?provider=${provider}&status=connected`);
  } catch (error) {
    logger.error('OAuth2 callback error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.redirect(`/credentials?error=${encodeURIComponent(errorMessage)}`);
  }
});

/**
 * POST /api/oauth/:provider/refresh
 * Refresh OAuth2 access token
 */
router.post('/:provider/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const { credentialId } = req.body;

    // Validate provider
    if (!oauth2Service.isProviderConfigured(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth2 provider '${provider}' is not configured`
      });
    }

    // Get encrypted tokens from session/database
    const encryptedCredential = req.session?.oauth2Credentials?.[provider]?.encrypted;
    if (!encryptedCredential) {
      return res.status(404).json({
        success: false,
        error: 'No OAuth2 credential found for this provider'
      });
    }

    // Decrypt tokens
    const tokens = await encryptionService.decryptOAuth2Tokens(encryptedCredential);

    // Check if refresh token exists
    if (!tokens.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token available. Please re-authorize.'
      });
    }

    // Refresh the access token
    const newTokens = await oauth2Service.refreshAccessToken(provider, tokens.refreshToken);

    // Encrypt new tokens
    const newEncryptedTokens = await encryptionService.encryptOAuth2Tokens(newTokens);

    // Update stored tokens
    if (req.session?.oauth2Credentials) {
      req.session.oauth2Credentials[provider].encrypted = newEncryptedTokens;
      req.session.oauth2Credentials[provider].lastRefreshed = new Date().toISOString();
    }

    logger.info('OAuth2 token refreshed successfully', {
      provider,
      expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000)
    });

    res.json({
      success: true,
      expiresAt: newTokens.expiresAt,
      expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000)
    });
  } catch (error) {
    logger.error('OAuth2 token refresh error', error);
    next(error);
  }
});

/**
 * DELETE /api/oauth/:provider/revoke
 * Revoke OAuth2 access
 */
router.delete('/:provider/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;

    // Validate provider
    if (!oauth2Service.isProviderConfigured(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth2 provider '${provider}' is not configured`
      });
    }

    // Get encrypted tokens from session/database
    const encryptedCredential = req.session?.oauth2Credentials?.[provider]?.encrypted;
    if (!encryptedCredential) {
      return res.status(404).json({
        success: false,
        error: 'No OAuth2 credential found for this provider'
      });
    }

    // Decrypt tokens
    const tokens = await encryptionService.decryptOAuth2Tokens(encryptedCredential);

    // Revoke tokens at provider
    const revokeRefreshSuccess = tokens.refreshToken
      ? await oauth2Service.revokeToken(provider, tokens.refreshToken, 'refresh_token')
      : true;

    const revokeAccessSuccess = await oauth2Service.revokeToken(provider, tokens.accessToken, 'access_token');

    // Remove from session/database
    if (req.session?.oauth2Credentials) {
      delete req.session.oauth2Credentials[provider];
    }

    logger.info('OAuth2 credential revoked', {
      provider,
      revokeRefreshSuccess,
      revokeAccessSuccess
    });

    res.json({
      success: true,
      message: 'OAuth2 credential revoked successfully',
      revokeRefreshSuccess,
      revokeAccessSuccess
    });
  } catch (error) {
    logger.error('OAuth2 revoke error', error);
    next(error);
  }
});

/**
 * GET /api/oauth/:provider/status
 * Check OAuth2 connection status
 */
router.get('/:provider/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;

    // Validate provider
    if (!oauth2Service.isProviderConfigured(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth2 provider '${provider}' is not configured`
      });
    }

    // Check if credential exists
    const credential = req.session?.oauth2Credentials?.[provider];
    if (!credential) {
      return res.json({
        connected: false,
        provider
      });
    }

    // Decrypt tokens to check expiration
    const tokens = await encryptionService.decryptOAuth2Tokens(credential.encrypted);

    const needsRefresh = oauth2Service.needsRefresh(tokens.expiresAt);
    const isExpired = Date.now() >= tokens.expiresAt;

    res.json({
      connected: true,
      provider,
      userInfo: credential.userInfo,
      connectedAt: credential.connectedAt,
      expiresAt: tokens.expiresAt,
      expiresIn: Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000)),
      needsRefresh,
      isExpired,
      hasRefreshToken: !!tokens.refreshToken
    });
  } catch (error) {
    logger.error('OAuth2 status check error', error);
    next(error);
  }
});

/**
 * GET /api/oauth/providers
 * Get list of configured OAuth2 providers
 */
router.get('/providers', (req: Request, res: Response) => {
  const providers = oauth2Service.getConfiguredProviders();

  res.json({
    success: true,
    providers,
    count: providers.length
  });
});

/**
 * POST /api/oauth/:provider/test
 * Test OAuth2 credential
 */
router.post('/:provider/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;

    // Validate provider
    if (!oauth2Service.isProviderConfigured(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth2 provider '${provider}' is not configured`
      });
    }

    // Get encrypted tokens
    const encryptedCredential = req.session?.oauth2Credentials?.[provider]?.encrypted;
    if (!encryptedCredential) {
      return res.status(404).json({
        success: false,
        error: 'No OAuth2 credential found for this provider'
      });
    }

    // Decrypt tokens
    const tokens = await encryptionService.decryptOAuth2Tokens(encryptedCredential);

    // Check if token is expired
    if (Date.now() >= tokens.expiresAt) {
      return res.json({
        success: false,
        error: 'Token expired. Please refresh.',
        needsRefresh: true
      });
    }

    // Test by fetching user info
    const userInfo = await oauth2Service.getUserInfo(provider, tokens.accessToken);

    res.json({
      success: true,
      message: 'OAuth2 credential is valid',
      userInfo,
      expiresIn: Math.floor((tokens.expiresAt - Date.now()) / 1000)
    });
  } catch (error) {
    logger.error('OAuth2 test error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;

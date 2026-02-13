/**
 * Authentication Routes
 * Handles login, registration, token management, and OAuth2 authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { authService } from '../../auth/AuthService';
import { oauth2Service, OAuth2Tokens } from '../../auth/OAuth2Service';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { authHandler, AuthRequest } from '../middleware/auth';
import { logger } from '../../../services/SimpleLogger';
import { validate, schemas } from '../middleware/validation';
import { prisma } from '../../database/prisma';
import { jwtService } from '../../auth/jwt';
import { PasswordHashingService } from '../../auth/PasswordHashingService';
import { Role, UserStatus } from '@prisma/client';

const router = Router();

// Auth API info endpoint
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Authentication API',
    endpoints: [
      'POST /api/auth/login - User login',
      'POST /api/auth/register - User registration',
      'POST /api/auth/refresh - Refresh access token',
      'POST /api/auth/logout - User logout',
      'GET /api/auth/me - Get current user info',
      'PUT /api/auth/password - Change password',
      'POST /api/auth/forgot-password - Request password reset',
      'POST /api/auth/reset-password - Reset password with token',
      'GET /api/auth/oauth/providers - List configured OAuth providers',
      'GET /api/auth/oauth/:provider - Initiate OAuth login flow',
      'GET /api/auth/oauth/:provider/callback - OAuth callback handler',
      'POST /api/auth/oauth/callback - Alternative OAuth callback (POST)',
      'POST /api/auth/oauth/refresh - Refresh OAuth provider tokens',
      'DELETE /api/auth/oauth/:provider - Disconnect OAuth provider',
      'GET /api/auth/oauth/:provider/status - Check OAuth connection status'
    ]
  });
}));

// Login
router.post('/login', validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await authService.login({ email, password });

    res.json({
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    throw new ApiError(401, error instanceof Error ? error.message : 'Login failed');
  }
}));

// Register
router.post('/register', validate(schemas.register), asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const result = await authService.register({
      email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined
    });

    res.status(201).json({
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Registration failed');
  }
}));

// Refresh token endpoint
router.post('/refresh', validate(schemas.refreshToken), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // Validate JWT format (3 segments separated by dots)
  if (refreshToken.split('.').length !== 3) {
    throw new ApiError(400, 'Invalid refresh token format');
  }

  try {
    const tokens = await authService.refreshTokens(refreshToken);

    res.json({
      tokens,
      expiresIn: tokens.expiresIn
    });

  } catch (error) {
    logger.error('Token refresh failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, 'Token refresh failed');
  }
}));

// Logout endpoint
router.post('/logout', authHandler, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  try {
    const refreshToken = req.body.refreshToken;
    await authService.logout(authReq.user!.id, refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.warn('Logout warning:', {
      userId: authReq.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  }
}));

// Get current user
router.get('/me', authHandler, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  res.json({ user: authReq.user });
}));

// Change password
router.post('/change-password', authHandler, validate(schemas.changePassword), asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const { currentPassword, newPassword } = req.body;

  try {
    await authService.changePassword(authReq.user!.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Password change failed');
  }
}));

// Request password reset
router.post('/reset-password', validate(schemas.resetPassword), asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    await authService.requestPasswordReset(email);
    res.json({ success: true });
  } catch {
    // Always return success to prevent email enumeration
    res.json({ success: true });
  }
}));

// Confirm password reset
router.post('/confirm-reset', validate(schemas.confirmReset), asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    await authService.resetPassword(token, newPassword);
    res.json({ success: true });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Password reset failed');
  }
}));

// Verify email
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Verification token is required');
  }

  try {
    await authService.verifyEmail(token);
    res.json({ success: true });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Email verification failed');
  }
}));

// Resend verification email
router.post('/resend-verification', authHandler, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  try {
    await authService.resendVerificationEmail(userId);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    logger.error('Failed to resend verification email', { userId, error });
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to send verification email');
  }
}));

// ============================================================================
// OAuth2 Authentication Routes
// ============================================================================

/**
 * In-memory state store for OAuth2 CSRF protection
 * In production, use Redis for distributed systems
 */
const oauthStateStore = new Map<string, {
  provider: string;
  codeVerifier?: string;
  redirectUri?: string;
  createdAt: number;
}>();

// State expiration time (10 minutes)
const OAUTH_STATE_EXPIRATION_MS = 10 * 60 * 1000;

// Clean up expired OAuth states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of Array.from(oauthStateStore.entries())) {
    if (now - data.createdAt > OAUTH_STATE_EXPIRATION_MS) {
      oauthStateStore.delete(state);
    }
  }
}, 60 * 1000); // Check every minute

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier (S256)
 */
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate secure random state for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Get permissions based on role
 */
function getPermissionsForRole(role: Role): string[] {
  const permissions: Record<Role, string[]> = {
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
  return permissions[role] || [];
}

/**
 * GET /api/auth/oauth/providers
 * Get list of configured OAuth2 providers available for authentication
 */
router.get('/oauth/providers', asyncHandler(async (req, res) => {
  const configuredProviders = oauth2Service.getConfiguredProviders();

  res.json({
    success: true,
    providers: configuredProviders,
    count: configuredProviders.length
  });
}));

/**
 * GET /api/auth/oauth/:provider
 * Initiate OAuth2 authorization flow for authentication
 * Returns redirect URL or redirects directly based on response_mode query param
 */
router.get('/oauth/:provider', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { redirect_uri, response_mode, use_pkce } = req.query;

  // Validate provider is configured
  if (!oauth2Service.isProviderConfigured(provider)) {
    throw new ApiError(400, `OAuth provider '${provider}' is not configured. Please set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET environment variables.`);
  }

  // Determine if PKCE should be used (recommended for security)
  const usePKCE = use_pkce !== 'false';

  try {
    // Generate authorization URL with PKCE if supported
    const { url, state, codeVerifier } = await oauth2Service.getAuthorizationUrl(provider, {
      usePKCE
    });

    // Store state with code verifier for callback validation
    oauthStateStore.set(state, {
      provider,
      codeVerifier,
      redirectUri: typeof redirect_uri === 'string' ? redirect_uri : undefined,
      createdAt: Date.now()
    });

    logger.info('OAuth2 authentication initiated', {
      provider,
      state: state.substring(0, 8) + '...',
      usePKCE
    });

    // Return JSON or redirect based on response_mode
    if (response_mode === 'json') {
      res.json({
        success: true,
        authorizationUrl: url,
        state,
        expiresIn: OAUTH_STATE_EXPIRATION_MS / 1000
      });
    } else {
      res.redirect(url);
    }
  } catch (error) {
    logger.error('Failed to initiate OAuth flow', { provider, error });
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to initiate OAuth flow');
  }
}));

/**
 * GET /api/auth/oauth/:provider/callback
 * Handle OAuth2 callback - exchange code for tokens and authenticate/register user
 */
router.get('/oauth/:provider/callback', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors from provider
  if (error) {
    logger.error('OAuth2 provider returned error', {
      provider,
      error,
      error_description
    });

    // Redirect to frontend with error
    const errorMessage = encodeURIComponent(error_description as string || error as string || 'OAuth authentication failed');
    return res.redirect(`/login?error=${errorMessage}&provider=${provider}`);
  }

  // Validate required parameters
  if (!code || typeof code !== 'string') {
    throw new ApiError(400, 'Authorization code is required');
  }

  if (!state || typeof state !== 'string') {
    throw new ApiError(400, 'State parameter is required for CSRF protection');
  }

  // Validate state (CSRF protection)
  const stateData = oauthStateStore.get(state);
  if (!stateData) {
    logger.warn('OAuth2 state not found or expired', { state: state.substring(0, 8) + '...' });
    return res.redirect('/login?error=' + encodeURIComponent('Invalid or expired session. Please try again.'));
  }

  // Validate provider matches
  if (stateData.provider !== provider) {
    logger.warn('OAuth2 provider mismatch', {
      expected: stateData.provider,
      received: provider
    });
    return res.redirect('/login?error=' + encodeURIComponent('Provider mismatch in OAuth callback'));
  }

  // Remove state after validation (single use)
  oauthStateStore.delete(state);

  try {
    // Exchange authorization code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(provider, code, state);

    // Get user info from provider
    const userInfo = await oauth2Service.getUserInfo(provider, tokens.accessToken);

    if (!userInfo.email) {
      throw new ApiError(400, 'Could not retrieve email from OAuth provider. Please ensure email scope is granted.');
    }

    // Find or create user based on OAuth profile
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email.toLowerCase() }
    });

    let isNewUser = false;

    if (!user) {
      // Create new user from OAuth profile
      isNewUser = true;

      // Generate a random secure password (user won't use it directly)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordService = PasswordHashingService.getInstance();
      const passwordHash = await passwordService.hash(randomPassword);

      user = await prisma.user.create({
        data: {
          email: userInfo.email.toLowerCase(),
          passwordHash,
          firstName: userInfo.name?.split(' ')[0] || null,
          lastName: userInfo.name?.split(' ').slice(1).join(' ') || null,
          role: Role.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true, // OAuth emails are pre-verified
          oauthProvider: provider,
          oauthProviderId: userInfo.id,
          avatarUrl: userInfo.picture || null,
          preferences: {},
          lastLoginAt: new Date()
        }
      });

      logger.info('New user created via OAuth', {
        userId: user.id,
        email: user.email,
        provider
      });
    } else {
      // Update existing user with OAuth info if not already set
      const updateData: {
        lastLoginAt: Date;
        oauthProvider?: string;
        oauthProviderId?: string;
        avatarUrl?: string | null;
        emailVerified?: boolean;
      } = {
        lastLoginAt: new Date()
      };

      if (!user.oauthProvider) {
        updateData.oauthProvider = provider;
        updateData.oauthProviderId = userInfo.id;
      }

      if (!user.avatarUrl && userInfo.picture) {
        updateData.avatarUrl = userInfo.picture;
      }

      if (!user.emailVerified) {
        updateData.emailVerified = true;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      logger.info('Existing user logged in via OAuth', {
        userId: user.id,
        email: user.email,
        provider
      });
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return res.redirect('/login?error=' + encodeURIComponent('Account is not active'));
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      return res.redirect('/login?error=' + encodeURIComponent('Account is temporarily locked'));
    }

    // Generate JWT tokens for authenticated session
    const permissions = getPermissionsForRole(user.role);
    const jwtTokens = await jwtService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      permissions
    });

    // Create session in database
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: jwtTokens.refreshToken.split('.')[2], // Store signature part
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    // Reset failed login attempts on successful OAuth login
    if (user.failedLoginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });
    }

    logger.info('OAuth authentication successful', {
      userId: user.id,
      provider,
      isNewUser
    });

    // Redirect to frontend with tokens
    // In production, consider using httpOnly cookies instead
    const redirectUri = stateData.redirectUri || '/dashboard';
    const separator = redirectUri.includes('?') ? '&' : '?';

    res.redirect(`${redirectUri}${separator}oauth_success=true&access_token=${encodeURIComponent(jwtTokens.accessToken)}&refresh_token=${encodeURIComponent(jwtTokens.refreshToken)}&provider=${provider}&is_new=${isNewUser}`);
  } catch (error) {
    logger.error('OAuth2 callback error', { provider, error });
    const errorMessage = error instanceof Error ? error.message : 'OAuth authentication failed';
    res.redirect(`/login?error=${encodeURIComponent(errorMessage)}&provider=${provider}`);
  }
}));

/**
 * POST /api/auth/oauth/callback
 * Alternative callback handler for POST requests (some providers use POST)
 */
router.post('/oauth/callback', asyncHandler(async (req, res) => {
  const { code, state, provider, error, error_description } = req.body;

  // Handle OAuth errors from provider
  if (error) {
    logger.error('OAuth2 provider returned error (POST)', {
      provider,
      error,
      error_description
    });
    throw new ApiError(400, error_description || error || 'OAuth authentication failed');
  }

  // Validate required parameters
  if (!code) {
    throw new ApiError(400, 'Authorization code is required');
  }

  if (!state) {
    throw new ApiError(400, 'State parameter is required for CSRF protection');
  }

  if (!provider) {
    throw new ApiError(400, 'Provider is required');
  }

  // Validate state (CSRF protection)
  const stateData = oauthStateStore.get(state);
  if (!stateData) {
    logger.warn('OAuth2 state not found or expired (POST)', { state: state.substring(0, 8) + '...' });
    throw new ApiError(400, 'Invalid or expired session. Please try again.');
  }

  // Validate provider matches
  if (stateData.provider !== provider) {
    logger.warn('OAuth2 provider mismatch (POST)', {
      expected: stateData.provider,
      received: provider
    });
    throw new ApiError(400, 'Provider mismatch in OAuth callback');
  }

  // Remove state after validation (single use)
  oauthStateStore.delete(state);

  try {
    // Exchange authorization code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(provider, code, state);

    // Get user info from provider
    const userInfo = await oauth2Service.getUserInfo(provider, tokens.accessToken);

    if (!userInfo.email) {
      throw new ApiError(400, 'Could not retrieve email from OAuth provider');
    }

    // Find or create user based on OAuth profile
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email.toLowerCase() }
    });

    let isNewUser = false;

    if (!user) {
      // Create new user from OAuth profile
      isNewUser = true;

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordService = PasswordHashingService.getInstance();
      const passwordHash = await passwordService.hash(randomPassword);

      user = await prisma.user.create({
        data: {
          email: userInfo.email.toLowerCase(),
          passwordHash,
          firstName: userInfo.name?.split(' ')[0] || null,
          lastName: userInfo.name?.split(' ').slice(1).join(' ') || null,
          role: Role.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          oauthProvider: provider,
          oauthProviderId: userInfo.id,
          avatarUrl: userInfo.picture || null,
          preferences: {},
          lastLoginAt: new Date()
        }
      });

      logger.info('New user created via OAuth (POST)', {
        userId: user.id,
        email: user.email,
        provider
      });
    } else {
      // Update existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...((!user.oauthProvider) && { oauthProvider: provider, oauthProviderId: userInfo.id }),
          ...((!user.avatarUrl && userInfo.picture) && { avatarUrl: userInfo.picture }),
          ...(!user.emailVerified && { emailVerified: true })
        }
      });

      logger.info('Existing user logged in via OAuth (POST)', {
        userId: user.id,
        email: user.email,
        provider
      });
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(403, 'Account is not active');
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new ApiError(403, 'Account is temporarily locked');
    }

    // Generate JWT tokens
    const permissions = getPermissionsForRole(user.role);
    const jwtTokens = await jwtService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      permissions
    });

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: jwtTokens.refreshToken.split('.')[2],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Reset failed login attempts
    if (user.failedLoginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });
    }

    logger.info('OAuth authentication successful (POST)', {
      userId: user.id,
      provider,
      isNewUser
    });

    // Return tokens in response
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.toLowerCase(),
        avatarUrl: user.avatarUrl
      },
      tokens: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        expiresIn: jwtTokens.expiresIn
      },
      provider,
      isNewUser
    });
  } catch (error) {
    logger.error('OAuth2 callback error (POST)', { provider, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error instanceof Error ? error.message : 'OAuth authentication failed');
  }
}));

/**
 * POST /api/auth/oauth/refresh
 * Refresh OAuth2 tokens for a connected provider
 */
router.post('/oauth/refresh', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { provider, refreshToken } = req.body;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!provider) {
    throw new ApiError(400, 'Provider is required');
  }

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  // Validate provider is configured
  if (!oauth2Service.isProviderConfigured(provider)) {
    throw new ApiError(400, `OAuth provider '${provider}' is not configured`);
  }

  try {
    // Refresh the access token using the provider's token endpoint
    const newTokens = await oauth2Service.refreshAccessToken(provider, refreshToken);

    logger.info('OAuth tokens refreshed successfully', {
      userId,
      provider,
      expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000)
    });

    res.json({
      success: true,
      tokens: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        expiresIn: Math.floor((newTokens.expiresAt - Date.now()) / 1000),
        scope: newTokens.scope,
        tokenType: newTokens.tokenType
      }
    });
  } catch (error) {
    logger.error('Failed to refresh OAuth tokens', { userId, provider, error });
    throw new ApiError(401, 'Failed to refresh OAuth tokens. Please re-authenticate.');
  }
}));

/**
 * DELETE /api/auth/oauth/:provider
 * Disconnect OAuth provider from user account
 */
router.delete('/oauth/:provider', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { provider } = req.params;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if this is the user's OAuth provider
  if (user.oauthProvider !== provider) {
    throw new ApiError(400, `Account is not connected to ${provider}`);
  }

  // Don't allow disconnecting if it's the only auth method and no password is set
  // In this implementation, all users have a password hash (even OAuth users have a random one)
  // So we just clear the OAuth fields

  await prisma.user.update({
    where: { id: userId },
    data: {
      oauthProvider: null,
      oauthProviderId: null
    }
  });

  logger.info('OAuth provider disconnected', {
    userId,
    provider
  });

  res.json({
    success: true,
    message: `Successfully disconnected ${provider} from your account`
  });
}));

/**
 * GET /api/auth/oauth/:provider/status
 * Check OAuth connection status for a provider
 */
router.get('/oauth/:provider/status', authHandler, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { provider } = req.params;
  const userId = authReq.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Check if provider is configured
  const isConfigured = oauth2Service.isProviderConfigured(provider);

  // Get user's OAuth connection
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      oauthProvider: true,
      oauthProviderId: true,
      email: true,
      avatarUrl: true
    }
  });

  const isConnected = user?.oauthProvider === provider;

  res.json({
    success: true,
    provider,
    isConfigured,
    isConnected,
    ...(isConnected && {
      connection: {
        providerId: user?.oauthProviderId,
        email: user?.email,
        avatarUrl: user?.avatarUrl
      }
    })
  });
}));

export const authRouter = router;
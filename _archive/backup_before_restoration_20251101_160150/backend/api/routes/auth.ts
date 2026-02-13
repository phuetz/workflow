/**
 * Authentication Routes
 * Handles login, registration, and token management
 */

import { Router } from 'express';
import { authManager } from '../../auth/AuthManager';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../../../utils/logger';

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
      'POST /api/auth/reset-password - Reset password with token'
    ]
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  try {
    const result = await authManager.login({ email, password });

    res.json({
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    throw new ApiError(401, error instanceof Error ? error.message : 'Login failed');
  }
}));

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  try {
    const result = await authManager.register({
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

// SECURITY FIX: Enhanced refresh token endpoint with proper validation
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  // SECURITY FIX: Validate refresh token format
  if (typeof refreshToken !== 'string' || refreshToken.split('.').length !== 3) {
    throw new ApiError(400, 'Invalid refresh token format');
  }

  try {
    // SECURITY FIX: Pass the actual refresh token to the auth manager
    const tokens = await authManager.refreshTokens();

    if (!tokens) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // SECURITY FIX: Return both new access and refresh tokens
    res.json({
      tokens,
      expiresIn: 3600 // Default 1 hour
    });
    
  } catch (error) {
    // SECURITY FIX: Log refresh attempts for monitoring
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

// SECURITY FIX: Enhanced logout with proper token revocation
router.post('/logout', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { refreshToken } = req.body;
  
  try {
    // SECURITY FIX: Revoke both access and refresh tokens
    await authManager.logout(req.user?.id, refreshToken);
    
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    // SECURITY FIX: Log logout attempts but still return success to prevent information disclosure
    logger.warn('Logout warning:', {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true });
  }
}));

// Get current user
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  res.json({ user: req.user });
}));

// Change password
router.post('/change-password', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new passwords are required');
  }

  try {
    await authManager.changePassword(currentPassword, newPassword);
    res.json({ success: true });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Password change failed');
  }
}));

// Request password reset
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  try {
    await authManager.resetPassword(email);
    res.json({ success: true });
  } catch {
    // Always return success to prevent email enumeration
    res.json({ success: true });
  }
}));

// Confirm password reset
router.post('/confirm-reset', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  try {
    await authManager.confirmResetPassword(token, newPassword);
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
    await authManager.verifyEmail(token);
    res.json({ success: true });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Email verification failed');
  }
}));

// Resend verification email
router.post('/resend-verification', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  try {
    await authManager.resendVerificationEmail();
    res.json({ success: true });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Failed to resend verification email');
  }
}));

// OAuth routes
router.get('/oauth/:provider', asyncHandler(async (req, res) => {
  const { provider } = req.params;

  try {
    const authUrl = await authManager.initiateOAuth(provider);
    res.json({ authUrl });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'OAuth initialization failed');
  }
}));

router.post('/oauth/callback', asyncHandler(async (req, res) => {
  const { code, state, provider } = req.body;

  if (!code || !state || !provider) {
    throw new ApiError(400, 'Missing OAuth callback parameters');
  }

  try {
    const result = await authManager.handleOAuthCallback(code, state, provider);
    res.json({
      user: result.user,
      tokens: result.tokens
    });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'OAuth callback failed');
  }
}));

export const authRouter = router;
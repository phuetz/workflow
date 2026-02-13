/**
 * SSO Authentication Routes
 * SAML 2.0 single sign-on endpoints
 */

import express from 'express';
import passport from 'passport';
import { getSSOService } from '../../auth/SSOService';
import { logger } from '../../services/LogService';
import { jwtService } from '../../auth/jwt';
import { requireAdmin } from '../../middleware/authorization';

// Type for SAML user profile
interface SAMLUser {
  id: string;
  email: string;
  role?: string;
  permissions?: string[];
}

// Type for SSO service with optional SLO support
interface SSOServiceWithSLO {
  getSingleLogoutUrl?: () => string | undefined;
}

const router = express.Router();

/**
 * Initiate SAML login
 * GET /api/sso/saml/login
 */
router.get('/saml/login', (req, res, next) => {
  const ssoService = getSSOService();

  if (!ssoService.isEnabled()) {
    return res.status(404).json({
      error: 'SSO is not enabled',
    });
  }

  if (ssoService.getProvider() !== 'saml') {
    return res.status(400).json({
      error: 'SAML is not configured as SSO provider',
    });
  }

  passport.authenticate('saml', {
    session: false,
  })(req, res, next);
});

/**
 * SAML assertion consumer service (callback)
 * POST /api/sso/saml/callback
 */
router.post('/saml/callback', (req, res, next) => {
  passport.authenticate('saml', {
    session: false,
  }, (err: Error | null, user: SAMLUser | false, info: Record<string, unknown>) => {
    if (err) {
      logger.error('SAML authentication error', { error: err.message });
      return res.redirect(`/login?error=${encodeURIComponent('SSO authentication failed')}`);
    }

    if (!user) {
      logger.warn('SAML authentication failed: no user', { info });
      return res.redirect('/login?error=sso_failed');
    }

    // Generate JWT tokens for the authenticated user
    jwtService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      permissions: user.permissions || ['workflows:read', 'workflows:write', 'executions:read']
    }).then(tokens => {
      logger.info('SAML authentication successful', {
        userId: user.id,
        email: user.email,
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to application with access token
      res.redirect(`/?token=${tokens.accessToken}`);
    }).catch(error => {
      logger.error('Failed to generate JWT tokens', { error: error instanceof Error ? error.message : String(error) });
      res.redirect('/login?error=token_generation_failed');
    });
  })(req, res, next);
});

/**
 * SAML metadata endpoint
 * GET /api/sso/saml/metadata
 */
router.get('/saml/metadata', (req, res) => {
  try {
    const ssoService = getSSOService();

    if (!ssoService.isEnabled() || ssoService.getProvider() !== 'saml') {
      return res.status(404).json({
        error: 'SAML is not configured',
      });
    }

    const metadata = ssoService.generateMetadata();

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    logger.error('Failed to generate SAML metadata', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to generate metadata',
    });
  }
});

/**
 * SAML logout
 * GET /api/sso/saml/logout
 */
router.get('/saml/logout', (req, res) => {
  try {
    const ssoService = getSSOService();

    // Clear auth cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Get the current user's token from header and revoke it
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);
    if (token) {
      jwtService.verifyToken(token).then(payload => {
        if (payload) {
          jwtService.revokeToken(payload.jti);
          logger.info('User logged out via SAML', { userId: payload.sub });
        }
      });
    }

    if (!ssoService.isEnabled()) {
      return res.redirect('/login');
    }

    // If SAML Single Logout (SLO) is configured, initiate SLO
    const sloUrl = (ssoService as unknown as SSOServiceWithSLO).getSingleLogoutUrl?.();
    if (sloUrl) {
      return res.redirect(sloUrl);
    }

    // Otherwise redirect to login
    res.redirect('/login');
  } catch (error) {
    logger.error('SAML logout error', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.redirect('/login');
  }
});

/**
 * Get SSO status and configuration
 * GET /api/sso/status
 */
router.get('/status', (req, res) => {
  try {
    const ssoService = getSSOService();

    res.json({
      enabled: ssoService.isEnabled(),
      provider: ssoService.getProvider(),
    });
  } catch (error) {
    logger.error('Failed to get SSO status', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get SSO status',
    });
  }
});

/**
 * Update SSO configuration (admin only)
 * PUT /api/sso/config
 */
router.put('/config', requireAdmin, (req, res) => {
  try {
    const ssoService = getSSOService();
    ssoService.updateConfig(req.body);

    res.json({
      success: true,
      message: 'SSO configuration updated',
    });
  } catch (error) {
    logger.error('Failed to update SSO config', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to update SSO configuration',
    });
  }
});

export default router;

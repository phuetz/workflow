/**
 * SSO Authentication Routes
 * SAML 2.0 single sign-on endpoints
 */

import express from 'express';
import passport from 'passport';
import { getSSOService } from '../../auth/SSOService';
import { logger } from '../../services/LogService';

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
  }, (err, user, info) => {
    if (err) {
      logger.error('SAML authentication error', { error: err.message });
      return res.redirect(`/login?error=${encodeURIComponent('SSO authentication failed')}`);
    }

    if (!user) {
      logger.warn('SAML authentication failed: no user', { info });
      return res.redirect('/login?error=sso_failed');
    }

    // TODO: Generate JWT token and set session
    logger.info('SAML authentication successful', {
      userId: user.id,
      email: user.email,
    });

    // Redirect to application with token
    const token = 'jwt_token_here'; // Generate actual JWT
    res.redirect(`/?token=${token}`);
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

    if (!ssoService.isEnabled()) {
      return res.redirect('/login');
    }

    // TODO: Implement SAML logout
    // For now, just redirect
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
router.put('/config', (req, res) => {
  try {
    // TODO: Add admin auth middleware

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

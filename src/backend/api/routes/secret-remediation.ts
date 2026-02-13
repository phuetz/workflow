/**
 * Secret Remediation API Routes
 *
 * Provides endpoints for automatic and semi-automatic secret remediation
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { getRemediationEngine, RemediationStrategy } from '../../../security/SecretRemediationEngine';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../services/LogService';

const router = Router();
const prisma = new PrismaClient();
const remediationEngine = getRemediationEngine();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Helper type for async route handlers with auth
type AsyncHandler = (req: AuthRequest, res: Response) => Promise<void>;
const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req as AuthRequest, res)).catch(next);
};

/**
 * GET /api/security/remediation/suggestions/:secretId
 * Get remediation suggestions for a detected secret
 */
router.get('/suggestions/:secretId', asyncHandler(async (req, res) => {
  try {
    const { secretId } = req.params;

    const secret = await prisma.detectedSecret.findUnique({
      where: { id: secretId }
    });

    if (!secret) {
      res.status(404).json({ error: 'Secret not found' });
      return;
    }

    const suggestions = remediationEngine.getSuggestions(
      secret.patternName,
      secret.file
    );

    res.json({
      secretId,
      secret: {
        file: secret.file,
        line: secret.line,
        patternName: secret.patternName,
        severity: secret.severity
      },
      suggestions
    });

  } catch (error) {
    logger.error('Failed to get suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}));

/**
 * POST /api/security/remediation/remediate
 * Execute remediation for a detected secret
 */
router.post('/remediate', asyncHandler(async (req, res) => {
  try {
    const {
      secretId,
      strategy,
      createPR = false,
      autoCommit = false
    } = req.body;

    // Validate strategy
    if (!Object.values(RemediationStrategy).includes(strategy)) {
      res.status(400).json({ error: 'Invalid remediation strategy' });
      return;
    }

    // Get secret details
    const secret = await prisma.detectedSecret.findUnique({
      where: { id: secretId }
    });

    if (!secret) {
      res.status(404).json({ error: 'Secret not found' });
      return;
    }

    // Execute remediation
    const result = await remediationEngine.remediate({
      secretId,
      file: secret.file,
      line: secret.line,
      match: secret.match,
      patternName: secret.patternName,
      strategy,
      createPR,
      autoCommit
    });

    // If successful, create PR if requested
    if (result.success && createPR) {
      try {
        const prUrl = await remediationEngine.createRemediationPR(
          secretId,
          result.changes,
          result.rotationInstructions || ''
        );
        result.pullRequestUrl = prUrl;
      } catch (error) {
        logger.error('Failed to create PR:', error);
        // Don't fail the whole remediation, just note it
        result.pullRequestUrl = undefined;
      }
    }

    // Update secret status
    if (result.success) {
      await prisma.detectedSecret.update({
        where: { id: secretId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: req.user?.id,
          notes: `Auto-remediated using ${strategy} strategy`
        }
      });
    }

    // Log remediation action
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        action: 'SECRET_REMEDIATION',
        resource: 'SECURITY',
        resourceId: secretId,
        details: {
          strategy,
          success: result.success,
          changes: result.changes,
          createPR
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: result.success,
      result
    });

  } catch (error) {
    logger.error('Failed to remediate secret:', error);
    res.status(500).json({
      error: 'Remediation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/security/remediation/batch
 * Batch remediate multiple secrets
 */
router.post('/batch', asyncHandler(async (req, res) => {
  try {
    const { secretIds, strategy, createPR = false } = req.body;

    if (!Array.isArray(secretIds) || secretIds.length === 0) {
      res.status(400).json({ error: 'secretIds must be a non-empty array' });
      return;
    }

    if (!Object.values(RemediationStrategy).includes(strategy)) {
      res.status(400).json({ error: 'Invalid remediation strategy' });
      return;
    }

    const results = [];

    // Batch fetch all secrets at once to avoid N+1 query
    const secrets = await prisma.detectedSecret.findMany({
      where: { id: { in: secretIds } }
    });
    const secretsMap = new Map(secrets.map(s => [s.id, s]));

    // Track successfully remediated secrets for batch update
    const successfulRemediations: string[] = [];

    for (const secretId of secretIds) {
      try {
        const secret = secretsMap.get(secretId);

        if (!secret) {
          results.push({
            secretId,
            success: false,
            error: 'Secret not found'
          });
          continue;
        }

        const result = await remediationEngine.remediate({
          secretId,
          file: secret.file,
          line: secret.line,
          match: secret.match,
          patternName: secret.patternName,
          strategy,
          createPR: false, // Only create one PR at the end
          autoCommit: false
        });

        if (result.success) {
          successfulRemediations.push(secretId);
        }

        results.push({
          secretId,
          success: result.success,
          changes: result.changes,
          error: result.error
        });

      } catch (error) {
        results.push({
          secretId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Batch update all successfully remediated secrets
    if (successfulRemediations.length > 0) {
      await prisma.detectedSecret.updateMany({
        where: { id: { in: successfulRemediations } },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: req.user?.id,
          notes: `Batch auto-remediated using ${strategy} strategy`
        }
      });
    }

    // Create a single PR for all changes if requested
    let prUrl;
    if (createPR) {
      const allChanges = results
        .filter(r => r.success)
        .flatMap(r => r.changes || []);

      if (allChanges.length > 0) {
        try {
          prUrl = await remediationEngine.createRemediationPR(
            `batch-${Date.now()}`,
            allChanges,
            'Multiple secrets remediated. See individual changes for rotation instructions.'
          );
        } catch (error) {
          logger.error('Failed to create batch PR:', error);
        }
      }
    }

    res.json({
      total: secretIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      pullRequestUrl: prUrl
    });

  } catch (error) {
    logger.error('Failed to batch remediate:', error);
    res.status(500).json({ error: 'Batch remediation failed' });
  }
}));

/**
 * POST /api/security/remediation/preview
 * Preview remediation changes without applying them
 */
router.post('/preview', asyncHandler(async (req, res) => {
  try {
    const { secretId, strategy } = req.body;

    if (!Object.values(RemediationStrategy).includes(strategy)) {
      res.status(400).json({ error: 'Invalid remediation strategy' });
      return;
    }

    const secret = await prisma.detectedSecret.findUnique({
      where: { id: secretId }
    });

    if (!secret) {
      res.status(404).json({ error: 'Secret not found' });
      return;
    }

    // Get suggestions which include steps
    const suggestions = remediationEngine.getSuggestions(
      secret.patternName,
      secret.file
    );

    const selectedSuggestion = suggestions.find(s => s.strategy === strategy);

    if (!selectedSuggestion) {
      res.status(404).json({ error: 'Strategy not available for this secret' });
      return;
    }

    res.json({
      secretId,
      strategy,
      suggestion: selectedSuggestion,
      preview: {
        file: secret.file,
        line: secret.line,
        currentValue: secret.match,
        rotationRequired: true
      }
    });

  } catch (error) {
    logger.error('Failed to preview remediation:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
}));

/**
 * GET /api/security/remediation/rotation-guide/:patternName
 * Get rotation guide for a secret type
 */
router.get('/rotation-guide/:patternName', asyncHandler(async (req, res) => {
  try {
    const { patternName } = req.params;

    // This would typically fetch from a knowledge base
    // For now, return basic rotation instructions
    const guide = {
      patternName: decodeURIComponent(patternName),
      urgency: 'critical',
      estimatedTime: '10-30 minutes',
      steps: [
        {
          title: 'Revoke the exposed secret',
          description: 'Immediately revoke or deactivate the exposed secret at its source',
          priority: 'critical'
        },
        {
          title: 'Generate new secret',
          description: 'Create a new secret/key with the same permissions',
          priority: 'critical'
        },
        {
          title: 'Update applications',
          description: 'Update all applications and environments using the old secret',
          priority: 'high'
        },
        {
          title: 'Monitor for unauthorized access',
          description: 'Review audit logs for any suspicious activity during exposure period',
          priority: 'high'
        },
        {
          title: 'Document the incident',
          description: 'Document what was exposed, for how long, and remediation actions taken',
          priority: 'medium'
        }
      ],
      resources: [
        {
          title: 'Secret Rotation Best Practices',
          url: '/docs/security/secret-rotation'
        },
        {
          title: 'Incident Response Playbook',
          url: '/docs/security/incident-response'
        }
      ]
    };

    res.json(guide);

  } catch (error) {
    logger.error('Failed to get rotation guide:', error);
    res.status(500).json({ error: 'Failed to fetch rotation guide' });
  }
}));

export default router;

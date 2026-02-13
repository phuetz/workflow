/**
 * Secret Scanning API Routes
 *
 * Provides endpoints for secret scanning dashboard and management
 */

import { Router, Response, RequestHandler } from 'express';
import { getSecretScanner } from '../../../security/SecretScanner';
import { PrismaClient } from '@prisma/client';
import { authHandler, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const scanner = getSecretScanner();

// Helper type for async route handlers with auth
type AsyncHandler = (req: AuthRequest, res: Response) => Promise<void>;
const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req as AuthRequest, res)).catch(next);
};

/**
 * GET /api/security/secret-scanning/stats
 * Get dashboard statistics
 */
router.get('/stats', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const scans = await prisma.secretScan.findMany({
      orderBy: { timestamp: 'desc' }
    });

    const secrets = await prisma.detectedSecret.findMany();

    const stats = {
      totalScans: scans.length,
      totalSecretsFound: secrets.length,
      activeSecrets: secrets.filter(s => s.status === 'OPEN').length,
      resolvedSecrets: secrets.filter(s => s.status === 'RESOLVED').length,
      falsePositives: secrets.filter(s => s.status === 'FALSE_POSITIVE').length,
      averageScanTime: scans.length > 0
        ? scans.reduce((sum, s) => sum + (s.duration || 0), 0) / scans.length
        : 0,
      lastScanTime: scans[0]?.timestamp || null,
      scanPassRate: scans.length > 0
        ? (scans.filter(s => s.passed).length / scans.length) * 100
        : 100
    };

    res.json(stats);
  } catch (error) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}));

/**
 * GET /api/security/secret-scanning/recent-scans
 * Get recent scan results
 */
router.get('/recent-scans', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const scans = await prisma.secretScan.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    res.json(scans);
  } catch (error) {
    console.error('Failed to get recent scans:', error);
    res.status(500).json({ error: 'Failed to fetch recent scans' });
  }
}));

/**
 * GET /api/security/secret-scanning/active-secrets
 * Get all active (unresolved) secrets
 */
router.get('/active-secrets', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const statusParam = req.query.status as string || 'OPEN';
    const statusUpper = statusParam.toUpperCase();

    const whereClause = statusUpper === 'ALL'
      ? {}
      : { status: statusUpper as 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' };

    const secrets = await prisma.detectedSecret.findMany({
      where: whereClause,
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' }
      ]
    });

    res.json(secrets);
  } catch (error) {
    console.error('Failed to get active secrets:', error);
    res.status(500).json({ error: 'Failed to fetch active secrets' });
  }
}));

/**
 * POST /api/security/secret-scanning/scan
 * Trigger a manual scan
 */
router.post('/scan', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const { path = '.', trigger = 'manual' } = req.body;

    const startTime = Date.now();

    // Run the scan
    const result = await scanner.scanDirectory(process.cwd(), {
      include: ['**/*'],
      exclude: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '*.lock',
        'package-lock.json',
        '**/*.md',
        '**/*.log',
        '.env.example',
        '**/*.min.js'
      ]
    });

    const duration = (Date.now() - startTime) / 1000;

    // Save scan result to database
    const scan = await prisma.secretScan.create({
      data: {
        timestamp: new Date(),
        scannedFiles: result.scannedFiles,
        matchesFound: result.matchesFound,
        criticalIssues: result.criticalIssues,
        highIssues: result.highIssues,
        mediumIssues: result.mediumIssues,
        lowIssues: result.lowIssues,
        duration,
        trigger,
        passed: result.matchesFound === 0,
        triggeredBy: req.user?.id
      }
    });

    // Save detected secrets - batch query to avoid N+1
    // First, get all existing secrets that match any of the detected matches
    const matchKeys = result.matches.map(m => ({
      file: m.file,
      line: m.line,
      patternName: m.patternName
    }));

    const existingSecrets = await prisma.detectedSecret.findMany({
      where: {
        OR: matchKeys.map(key => ({
          file: key.file,
          line: key.line,
          patternName: key.patternName
        }))
      },
      select: { file: true, line: true, patternName: true }
    });

    // Create a Set of existing secret keys for O(1) lookup
    const existingKeys = new Set(
      existingSecrets.map(s => `${s.file}:${s.line}:${s.patternName}`)
    );

    // Filter to only new secrets and batch create them
    const newSecrets = result.matches
      .filter(match => !existingKeys.has(`${match.file}:${match.line}:${match.patternName}`))
      .map(match => ({
        file: match.file,
        line: match.line,
        column: match.column,
        patternName: match.patternName,
        severity: match.severity.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        confidence: match.confidence.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
        category: match.category,
        match: match.match,
        detectedAt: new Date(),
        status: 'OPEN' as const,
        scanId: scan.id
      }));

    if (newSecrets.length > 0) {
      await prisma.detectedSecret.createMany({
        data: newSecrets
      });
    }

    res.json({
      scanId: scan.id,
      scannedFiles: result.scannedFiles,
      matchesFound: result.matchesFound,
      duration,
      passed: scan.passed
    });

  } catch (error) {
    console.error('Failed to run scan:', error);
    res.status(500).json({ error: 'Failed to run scan' });
  }
}));

/**
 * PATCH /api/security/secret-scanning/secrets/:id
 * Update a secret's status
 */
router.patch('/secrets/:id', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['OPEN', 'RESOLVED', 'FALSE_POSITIVE', 'ACCEPTED_RISK'];
    const statusUpper = status?.toUpperCase();
    if (!validStatuses.includes(statusUpper)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const updated = await prisma.detectedSecret.update({
      where: { id },
      data: {
        status: statusUpper as 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK',
        notes,
        resolvedAt: statusUpper !== 'OPEN' ? new Date() : null,
        resolvedBy: statusUpper !== 'OPEN' ? req.user?.id : null
      }
    });

    res.json(updated);

  } catch (error) {
    console.error('Failed to update secret:', error);
    res.status(500).json({ error: 'Failed to update secret' });
  }
}));

/**
 * GET /api/security/secret-scanning/export
 * Export scan results in various formats
 */
router.get('/export', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const format = (req.query.format as string) || 'json';

    const secrets = await prisma.detectedSecret.findMany({
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' }
      ]
    });

    switch (format) {
      case 'json':
        res.json(secrets);
        break;

      case 'csv':
        const csv = [
          'ID,File,Line,Pattern,Severity,Category,Status,Detected At',
          ...secrets.map(s =>
            `${s.id},"${s.file}",${s.line},"${s.patternName}",${s.severity},${s.category},${s.status},${s.detectedAt}`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=secrets-${Date.now()}.csv`);
        res.send(csv);
        break;

      case 'pdf':
        // For PDF, you would typically use a library like pdfkit
        // For now, return a simple text representation
        res.status(501).json({ error: 'PDF export not yet implemented' });
        break;

      default:
        res.status(400).json({ error: 'Invalid format' });
    }

  } catch (error) {
    console.error('Failed to export:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
}));

/**
 * GET /api/security/secret-scanning/history/:file
 * Get scan history for a specific file
 */
router.get('/history/:file', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const { file } = req.params;

    const secrets = await prisma.detectedSecret.findMany({
      where: { file: decodeURIComponent(file) },
      orderBy: { detectedAt: 'desc' },
      include: {
        scan: true
      }
    });

    res.json(secrets);

  } catch (error) {
    console.error('Failed to get file history:', error);
    res.status(500).json({ error: 'Failed to fetch file history' });
  }
}));

/**
 * DELETE /api/security/secret-scanning/secrets/:id
 * Delete a secret (admin only)
 */
router.delete('/secrets/:id', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { id } = req.params;

    await prisma.detectedSecret.delete({
      where: { id }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Failed to delete secret:', error);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
}));

/**
 * GET /api/security/secret-scanning/trends
 * Get trends over time
 */
router.get('/trends', authHandler, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const scans = await prisma.secretScan.findMany({
      where: {
        timestamp: {
          gte: startDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    const trends = scans.map(scan => ({
      date: scan.timestamp,
      total: scan.matchesFound,
      critical: scan.criticalIssues,
      high: scan.highIssues,
      medium: scan.mediumIssues,
      low: scan.lowIssues,
      passed: scan.passed
    }));

    res.json(trends);

  } catch (error) {
    console.error('Failed to get trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
}));

export default router;

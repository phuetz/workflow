/**
 * Audit Log API Routes
 * Endpoints for enterprise audit logging
 */

import express from 'express';
import { getAuditService } from '../../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../../audit/AuditTypes';
import { logger } from '../../services/LogService';

const router = express.Router();

/**
 * Get audit logs with filtering
 * GET /api/audit/logs
 */
router.get('/logs', async (req, res) => {
  try {
    const auditService = getAuditService();

    const filter = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      actions: req.query.actions ? (req.query.actions as string).split(',') as AuditAction[] : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') as AuditCategory[] : undefined,
      severities: req.query.severities ? (req.query.severities as string).split(',') as AuditSeverity[] : undefined,
      userIds: req.query.userIds ? (req.query.userIds as string).split(',') : undefined,
      resourceTypes: req.query.resourceTypes ? (req.query.resourceTypes as string).split(',') : undefined,
      resourceIds: req.query.resourceIds ? (req.query.resourceIds as string).split(',') : undefined,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
      searchText: req.query.search as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await auditService.query(filter);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to query audit logs', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to query audit logs',
    });
  }
});

/**
 * Get audit log by ID
 * GET /api/audit/logs/:id
 */
router.get('/logs/:id', async (req, res) => {
  try {
    const auditService = getAuditService();
    const { id } = req.params;

    const entry = await auditService.getById(id);

    if (!entry) {
      return res.status(404).json({
        error: 'Audit log entry not found',
      });
    }

    res.json({
      success: true,
      entry,
    });
  } catch (error) {
    logger.error('Failed to get audit log', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get audit log',
    });
  }
});

/**
 * Get audit statistics
 * GET /api/audit/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const auditService = getAuditService();

    const filter = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const stats = await auditService.getStats(filter);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get audit stats', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get audit stats',
    });
  }
});

/**
 * Export audit logs
 * GET /api/audit/export
 */
router.get('/export', async (req, res) => {
  try {
    const auditService = getAuditService();

    const filter = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      actions: req.query.actions ? (req.query.actions as string).split(',') as AuditAction[] : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') as AuditCategory[] : undefined,
      userIds: req.query.userIds ? (req.query.userIds as string).split(',') : undefined,
    };

    const csv = await auditService.export(filter);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Failed to export audit logs', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to export audit logs',
    });
  }
});

/**
 * Create manual audit log entry (for testing/admin)
 * POST /api/audit/logs
 */
router.post('/logs', async (req, res) => {
  try {
    const auditService = getAuditService();

    const entry = await auditService.log(req.body);

    res.status(201).json({
      success: true,
      entry,
    });
  } catch (error) {
    logger.error('Failed to create audit log', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to create audit log',
    });
  }
});

/**
 * Cleanup old audit logs
 * POST /api/audit/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const auditService = getAuditService();
    const { olderThan } = req.body;

    const cutoffDate = olderThan ? new Date(olderThan) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default

    const removed = await auditService.cleanup(cutoffDate);

    res.json({
      success: true,
      removed,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to cleanup audit logs', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to cleanup audit logs',
    });
  }
});

/**
 * Get audit log count
 * GET /api/audit/count
 */
router.get('/count', async (req, res) => {
  try {
    const auditService = getAuditService();
    const count = await auditService.count();

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    logger.error('Failed to get audit count', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Failed to get audit count',
    });
  }
});

export default router;

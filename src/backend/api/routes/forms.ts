/**
 * Forms API Routes
 * Handles form trigger creation, management, and submissions
 * Uses Prisma for database persistence
 */

import { Router, Request, Response } from 'express';
import { FormSubmissionStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { logger } from '../../../services/SimpleLogger';
import { authHandler, AuthRequest } from '../middleware/auth';
import { queueManager } from '../../queue/QueueManager';
import {
  validateBody,
  validateParams,
  createFormBodySchema,
  updateFormBodySchema,
  formIdParamsSchema,
} from '../middleware/validation';

const router = Router();

/**
 * GET /api/forms
 * List all forms for the current user/workspace
 */
router.get('/', authHandler, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Build where clause - if user is authenticated, filter by their forms
    const whereClause = userId ? { createdBy: userId } : {};

    const forms = await prisma.form.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    res.json({
      success: true,
      data: forms.map((form) => ({
        ...form,
        submissionCount: form._count.submissions,
        _count: undefined,
      })),
      total: forms.length,
    });
  } catch (error) {
    logger.error('Failed to fetch forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forms',
    });
  }
});

/**
 * GET /api/forms/:formId
 * Get form configuration by ID
 */
router.get('/:formId', authHandler, validateParams(formIdParamsSchema), async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...form,
        submissionCount: form._count.submissions,
        _count: undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form',
    });
  }
});

/**
 * POST /api/forms
 * Create a new form
 */
router.post('/', authHandler, validateBody(createFormBodySchema), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const formConfig = req.body;

    const form = await prisma.form.create({
      data: {
        name: formConfig.name || 'Untitled Form',
        description: formConfig.description,
        fields: formConfig.fields || [],
        settings: formConfig.settings || {},
        isActive: formConfig.isActive ?? true,
        successMessage: formConfig.successMessage,
        redirectUrl: formConfig.redirectUrl,
        workflowId: formConfig.workflowId,
        createdBy: userId,
      },
    });

    logger.info('Form created:', { formId: form.id, name: form.name });

    res.status(201).json({
      success: true,
      data: form,
    });
  } catch (error) {
    logger.error('Failed to create form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create form',
    });
  }
});

/**
 * PUT /api/forms/:formId
 * Update form configuration
 */
router.put('/:formId', authHandler, validateParams(formIdParamsSchema), validateBody(updateFormBodySchema), async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const updates = req.body;

    // Check if form exists
    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!existingForm) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        name: updates.name,
        description: updates.description,
        fields: updates.fields,
        settings: updates.settings,
        isActive: updates.isActive,
        successMessage: updates.successMessage,
        redirectUrl: updates.redirectUrl,
        workflowId: updates.workflowId,
      },
    });

    logger.info('Form updated:', { formId: updatedForm.id });

    res.json({
      success: true,
      data: updatedForm,
    });
  } catch (error) {
    logger.error('Failed to update form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update form',
    });
  }
});

/**
 * DELETE /api/forms/:formId
 * Delete a form
 */
router.delete('/:formId', authHandler, validateParams(formIdParamsSchema), async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    // Check if form exists
    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!existingForm) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    // Delete form (submissions will be cascade deleted)
    await prisma.form.delete({
      where: { id: formId },
    });

    logger.info('Form deleted:', { formId });

    res.json({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete form',
    });
  }
});

/**
 * POST /api/forms/:formId/submit
 * Submit form data (public endpoint)
 */
router.post('/:formId/submit', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const formData = req.body;

    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    if (!form.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Form is not active',
      });
    }

    // Create submission record
    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        workflowId: form.workflowId,
        data: formData,
        status: 'PENDING',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referrer'),
        metadata: {},
      },
    });

    logger.info('Form submission received:', {
      submissionId: submission.id,
      formId,
      workflowId: form.workflowId,
    });

    // Trigger workflow execution if workflowId is set
    if (form.workflowId) {
      try {
        // Fetch the workflow to get its configuration
        const workflow = await prisma.workflow.findUnique({
          where: { id: form.workflowId },
        });

        if (workflow && workflow.status === 'ACTIVE') {
          // Create execution record - use workflow owner's userId for the execution context
          const execution = await prisma.workflowExecution.create({
            data: {
              workflowId: form.workflowId,
              userId: workflow.userId, // Run under workflow owner's context
              version: workflow.version,
              status: 'PENDING',
              trigger: { type: 'form_submission', source: 'form', formId: form.id },
              input: {
                formId: form.id,
                formName: form.name,
                submissionId: submission.id,
                submissionData: formData,
                submittedAt: submission.submittedAt,
              },
              executionData: {},
              metadata: {
                formSubmissionId: submission.id,
                formId: form.id,
              },
            },
          });

          // Queue the execution for processing
          await queueManager.addJob('workflow-execution', 'workflow_execution', {
            executionId: execution.id,
            workflowId: form.workflowId,
            userId: workflow.userId,
            inputData: {
              formId: form.id,
              formName: form.name,
              submissionId: submission.id,
              submissionData: formData,
              submittedAt: submission.submittedAt,
            },
            triggeredBy: 'form_submission',
            workflow: {
              nodes: workflow.nodes as unknown as { id: string; type: string; data: Record<string, unknown> }[],
              edges: workflow.edges as unknown as { id: string; source: string; target: string }[],
              settings: workflow.settings as Record<string, unknown>,
            },
          }, {
            priority: 'high',
            maxAttempts: 3,
            retryDelay: 5000,
          });

          // Update submission with execution reference
          await prisma.formSubmission.update({
            where: { id: submission.id },
            data: {
              status: 'PROCESSING',
              metadata: {
                executionId: execution.id,
              },
            },
          });

          logger.info('Workflow triggered by form submission', {
            formId: form.id,
            workflowId: form.workflowId,
            submissionId: submission.id,
            executionId: execution.id,
          });
        } else {
          logger.warn('Workflow not found or not active for form submission', {
            formId: form.id,
            workflowId: form.workflowId,
            workflowStatus: workflow?.status,
          });
        }
      } catch (error) {
        logger.error('Failed to trigger workflow from form submission', {
          error,
          formId: form.id,
          workflowId: form.workflowId,
          submissionId: submission.id,
        });
        // Don't fail the submission, just log the error
        // The form submission is still valid even if the workflow trigger fails
      }
    }

    res.status(201).json({
      success: true,
      data: {
        submissionId: submission.id,
        message: form.successMessage || 'Thank you for your submission!',
        redirectUrl: form.redirectUrl,
      },
    });
  } catch (error) {
    logger.error('Failed to submit form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit form',
    });
  }
});

/**
 * GET /api/forms/:formId/submissions
 * Get form submissions with pagination
 */
router.get('/:formId/submissions', authHandler, async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: { formId: string; status?: FormSubmissionStatus } = { formId };
    if (status && typeof status === 'string') {
      whereClause.status = status.toUpperCase() as FormSubmissionStatus;
    }

    // Get total count for pagination
    const totalCount = await prisma.formSubmission.count({
      where: whereClause,
    });

    const submissions = await prisma.formSubmission.findMany({
      where: whereClause,
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions',
    });
  }
});

/**
 * GET /api/forms/:formId/submissions/:submissionId
 * Get a specific submission
 */
router.get('/:formId/submissions/:submissionId', authHandler, async (req: Request, res: Response) => {
  try {
    const { formId, submissionId } = req.params;

    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: submissionId,
        formId,
      },
      include: {
        form: {
          select: {
            name: true,
            fields: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    logger.error('Failed to fetch submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission',
    });
  }
});

/**
 * PATCH /api/forms/:formId/submissions/:submissionId/status
 * Update submission status
 */
router.patch('/:formId/submissions/:submissionId/status', authHandler, async (req: Request, res: Response) => {
  try {
    const { formId, submissionId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: submissionId,
        formId,
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    const updatedSubmission = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: status.toUpperCase(),
        processedAt: status.toUpperCase() === 'COMPLETED' ? new Date() : undefined,
      },
    });

    logger.info('Submission status updated:', {
      submissionId,
      oldStatus: submission.status,
      newStatus: status.toUpperCase(),
    });

    res.json({
      success: true,
      data: updatedSubmission,
    });
  } catch (error) {
    logger.error('Failed to update submission status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update submission status',
    });
  }
});

/**
 * DELETE /api/forms/:formId/submissions/:submissionId
 * Delete a specific submission
 */
router.delete('/:formId/submissions/:submissionId', authHandler, async (req: Request, res: Response) => {
  try {
    const { formId, submissionId } = req.params;

    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: submissionId,
        formId,
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    await prisma.formSubmission.delete({
      where: { id: submissionId },
    });

    logger.info('Submission deleted:', { submissionId, formId });

    res.json({
      success: true,
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete submission',
    });
  }
});

/**
 * GET /api/forms/:formId/stats
 * Get form statistics
 */
router.get('/:formId/stats', authHandler, async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    // Get submission counts by status
    const statusCounts = await prisma.formSubmission.groupBy({
      by: ['status'],
      where: { formId },
      _count: {
        status: true,
      },
    });

    // Get total submissions
    const totalSubmissions = await prisma.formSubmission.count({
      where: { formId },
    });

    // Get submissions in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSubmissions = await prisma.formSubmission.count({
      where: {
        formId,
        submittedAt: { gte: last24Hours },
      },
    });

    // Get submissions in last 7 days
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklySubmissions = await prisma.formSubmission.count({
      where: {
        formId,
        submittedAt: { gte: last7Days },
      },
    });

    // Format status counts
    const statusStats: Record<string, number> = {};
    for (const item of statusCounts) {
      statusStats[item.status.toLowerCase()] = item._count.status;
    }

    res.json({
      success: true,
      data: {
        formId,
        formName: form.name,
        isActive: form.isActive,
        totalSubmissions,
        recentSubmissions,
        weeklySubmissions,
        byStatus: {
          pending: statusStats.pending || 0,
          processing: statusStats.processing || 0,
          completed: statusStats.completed || 0,
          failed: statusStats.failed || 0,
        },
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch form stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form statistics',
    });
  }
});

export default router;

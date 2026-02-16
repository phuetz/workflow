/**
 * Schedule Management API Routes
 * Manage cron/interval workflow triggers.
 */

import { Router, Request, Response } from 'express';
import { schedulerService } from '../../services/SchedulerService';

const router = Router();

// GET /api/schedules - List active schedules
router.get('/', async (_req: Request, res: Response) => {
  try {
    const schedules = schedulerService.listSchedules();
    res.json({ schedules, count: schedules.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

// POST /api/schedules/:workflowId/:nodeId - Register a schedule
router.post('/:workflowId/:nodeId', async (req: Request, res: Response) => {
  try {
    const { workflowId, nodeId } = req.params;
    const config = req.body;

    await schedulerService.registerSchedule(workflowId, nodeId, config);

    res.status(201).json({
      message: 'Schedule registered',
      scheduleId: `${workflowId}:${nodeId}`,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to register schedule',
    });
  }
});

// DELETE /api/schedules/:workflowId/:nodeId - Unregister a schedule
router.delete('/:workflowId/:nodeId', async (req: Request, res: Response) => {
  try {
    const { workflowId, nodeId } = req.params;
    schedulerService.unregisterSchedule(`${workflowId}:${nodeId}`);
    res.json({ message: 'Schedule unregistered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unregister schedule' });
  }
});

// DELETE /api/schedules/workflow/:workflowId - Unregister all schedules for a workflow
router.delete('/workflow/:workflowId', async (req: Request, res: Response) => {
  try {
    schedulerService.unregisterWorkflow(req.params.workflowId);
    res.json({ message: 'All schedules for workflow unregistered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unregister schedules' });
  }
});

export default router;

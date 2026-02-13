import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { getExecution, listNodeExecutions } from '../repositories/adapters';
import { onBroadcast } from '../services/events';

export const executionRouter = Router();

// List all executions
executionRouter.get('/', asyncHandler(async (req, res) => {
  // In a real implementation, this would query a database
  // For now, return empty array
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const workflowId = req.query.workflowId as string | undefined;

  res.json({
    success: true,
    executions: [],
    pagination: {
      page,
      limit,
      total: 0,
      pages: 0
    }
  });
}));

// Get execution detail
executionRouter.get('/:id', asyncHandler(async (req, res) => {
  const exec = getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');
  res.json(exec);
}));

// Get execution logs
executionRouter.get('/:id/logs', asyncHandler(async (req, res) => {
  const exec = getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');
  res.json({ logs: exec.logs });
}));

export default executionRouter;

// Server-Sent Events stream of execution events/logs
executionRouter.get('/:id/stream', asyncHandler(async (req, res) => {
  const exec = await getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial state
  send('execution', exec);

  const unsub = onBroadcast((evt) => {
    const { type, payload } = evt;
    // Filter only this execution id
    if (typeof payload !== 'object' || !payload) return;
    const eid = (payload as any).id || (payload as any).execId;
    if (eid !== req.params.id) return;
    send(type, payload);
  });

  req.on('close', () => {
    unsub();
    res.end();
  });
}));

// List node executions for an execution
executionRouter.get('/:id/nodes', asyncHandler(async (req, res) => {
  const exec = await getExecution(req.params.id);
  if (!exec) throw new ApiError(404, 'Execution not found');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const result = await listNodeExecutions(exec.id, page, limit);
  res.json(result);
}));

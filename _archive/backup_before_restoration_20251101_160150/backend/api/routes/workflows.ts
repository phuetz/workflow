import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import {
  listWorkflows,
  getWorkflow,
  createWorkflow as repoCreate,
  updateWorkflow as repoUpdate,
  deleteWorkflow as repoDelete,
  Workflow,
} from '../repositories/adapters';
import { enqueueExecution } from '../services/queue';
import { listExecutionsPaged, getExecution } from '../repositories/adapters';

const router = Router();

// List workflows
router.get('/', asyncHandler(async (_req, res) => {
  res.json({ workflows: listWorkflows() });
}));

// Get one
router.get('/:id', asyncHandler(async (req, res) => {
  const wf = getWorkflow(req.params.id);
  if (!wf) throw new ApiError(404, 'Workflow not found');
  res.json(wf);
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, tags, nodes, edges, settings } = req.body || {};
  if (!name) throw new ApiError(400, 'Workflow name is required');
  const wf = repoCreate({ name, description, tags, nodes, edges, settings, status: 'draft' });
  res.status(201).json(wf);
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const wf = repoUpdate(req.params.id, req.body as Partial<Workflow>);
  if (!wf) throw new ApiError(404, 'Workflow not found');
  res.json(wf);
}));

// Delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = repoDelete(req.params.id);
  if (!ok) throw new ApiError(404, 'Workflow not found');
  res.json({ success: true });
}));

// Execute
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const wf = getWorkflow(req.params.id);
  if (!wf) throw new ApiError(404, 'Workflow not found');
  if (wf.status !== 'active' && wf.status !== 'draft') throw new ApiError(400, 'Workflow is not active');
  const exec = await enqueueExecution(wf.id, req.body?.input);
  res.status(201).json({ executionId: exec.id, status: exec.status });
}));

// Get executions for a workflow
router.get('/:id/executions', asyncHandler(async (req, res) => {
  const wf = await getWorkflow(req.params.id);
  if (!wf) throw new ApiError(404, 'Workflow not found');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const result = await listExecutionsPaged(wf.id, page, limit);
  res.json(result);
}));

// Get execution detail
router.get('/:id/executions/:execId', asyncHandler(async (req, res) => {
  const exec = getExecution(req.params.execId);
  if (!exec || exec.workflowId !== req.params.id) throw new ApiError(404, 'Execution not found');
  res.json(exec);
}));

export default router;

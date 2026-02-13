/**
 * Nodes API Routes
 * Endpoints for node type information and validation
 */

import { Router } from 'express';
import { nodeTypes } from '../../../data/nodeTypes';
import { nodeExecutors } from '../../services/nodeExecutors';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get nodes API info (root endpoint)
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Nodes API',
    endpoints: [
      'GET /api/nodes/types - List all node types',
      'GET /api/nodes/types/:type - Get specific node type',
      'GET /api/nodes/categories - List all categories',
      'GET /api/nodes/search?q=query - Search nodes',
      'POST /api/nodes/validate - Validate node configuration'
    ]
  });
}));

// Get all available node types
router.get('/types', asyncHandler(async (req, res) => {
  const types = Object.entries(nodeTypes).map(([key, config]) => ({
    ...config,
    hasExecutor: !!nodeExecutors[key]
  }));

  res.json(types);
}));

// Get node type by ID
router.get('/types/:type', asyncHandler(async (req, res) => {
  const { type: nodeTypeName } = req.params;
  const nodeType = nodeTypes[nodeTypeName];

  if (!nodeType) {
    throw new ApiError(404, 'Node type not found');
  }

  res.json({
    ...nodeType,
    hasExecutor: !!nodeExecutors[nodeTypeName]
  });
}));

// Validate node configuration
router.post('/validate', asyncHandler(async (req, res) => {
  const { type: nodeType, config } = req.body;

  if (!nodeType) {
    throw new ApiError(400, 'Node type is required');
  }

  const executor = nodeExecutors[nodeType];

  if (!executor) {
    throw new ApiError(400, `No executor found for node type: ${nodeType}`);
  }

  const errors = executor.validate ?
    executor.validate({
      id: 'test',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { type: nodeType, config }
    }) : [];

  res.json({
    valid: errors.length === 0,
    errors
  });
}));

// Get node categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = new Set<string>();

  Object.values(nodeTypes).forEach(nodeType => {
    if (nodeType.category) {
      categories.add(nodeType.category);
    }
  });

  res.json(Array.from(categories).sort());
}));

// Search nodes
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.json([]);
    return;
  }

  const query = q.toLowerCase();
  const results = Object.entries(nodeTypes)
    .filter(([nodeTypeName, config]) =>
      nodeTypeName.toLowerCase().includes(query) ||
      config.label.toLowerCase().includes(query) ||
      config.description.toLowerCase().includes(query) ||
      config.category?.toLowerCase().includes(query)
    )
    .map(([, config]) => config);

  res.json(results);
}));

export const nodeRouter = router;
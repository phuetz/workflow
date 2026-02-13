import { Router, Request } from 'express';
import crypto from 'crypto';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import {
  validateParams,
  validateBody,
  validateQuery,
  webhookWorkflowParamsSchema,
  webhookDetailParamsSchema,
  webhookSecretBodySchema,
  webhookFilterBodySchema,
  webhookFilterTestBodySchema,
  webhookHistoryQuerySchema,
  webhookReplayParamsSchema,
  webhookPathParamsSchema,
  webhookRouteCreateBodySchema,
  webhookRouteUpdateBodySchema,
  simpleIdParamsSchema
} from '../middleware/validation';
import { getWorkflow, getWebhookSecret, upsertWebhookSecret } from '../repositories/adapters';
import {
  listWebhooksByWorkflow,
  getWebhookByWorkflowAndPath,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from '../repositories/adapters';
import { executeWorkflowSimple } from '../services/simpleExecutionService';
import { logger } from '../../../services/SimpleLogger';

// Note: Webhook secrets are now stored in the database via the adapter functions.
// The in-memory webhookFilters map is still used for advanced filtering configuration.

// ============================================
// SECURITY: Webhook Replay Attack Protection
// ============================================

/**
 * Maximum allowed age for webhook timestamps (5 minutes)
 * Webhooks older than this will be rejected to prevent replay attacks
 */
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Verify webhook signature with timestamp-based replay protection
 *
 * This function implements a secure webhook verification pattern:
 * 1. Validates the timestamp is not too old (replay protection)
 * 2. Validates the HMAC signature includes the timestamp (prevents tampering)
 * 3. Uses timing-safe comparison to prevent timing attacks
 *
 * @param req - Express request object
 * @param secret - Webhook secret for HMAC calculation
 * @returns Object with validation result and error message if failed
 */
function verifyWebhookWithReplayProtection(
  req: Request,
  secret: string
): { valid: boolean; error?: string; isReplayAttempt?: boolean } {
  // Extract signature and timestamp from headers
  const signature = (req.headers['x-webhook-signature'] || req.headers['x-signature']) as string | undefined;
  const timestampHeader = req.headers['x-webhook-timestamp'] as string | undefined;

  // Reject if signature is missing
  if (!signature) {
    logger.warn('Webhook security: Missing signature header', {
      ip: req.ip || req.socket.remoteAddress,
      path: req.path,
      headers: Object.keys(req.headers)
    });
    return {
      valid: false,
      error: 'Missing webhook signature. Include signature in x-webhook-signature or x-signature header.'
    };
  }

  // For requests with timestamp header, verify replay protection
  if (timestampHeader) {
    const webhookTime = parseInt(timestampHeader, 10);
    const now = Date.now();

    // Validate timestamp is a valid number
    if (isNaN(webhookTime)) {
      logger.warn('Webhook security: Invalid timestamp format', {
        ip: req.ip || req.socket.remoteAddress,
        timestamp: timestampHeader
      });
      return {
        valid: false,
        error: 'Invalid webhook timestamp format. Timestamp must be a Unix millisecond timestamp.'
      };
    }

    // Reject if timestamp is too old (replay attack prevention)
    const timeDiff = Math.abs(now - webhookTime);
    if (timeDiff > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
      logger.warn('Webhook security: Potential replay attack detected', {
        ip: req.ip || req.socket.remoteAddress,
        path: req.path,
        webhookTime,
        serverTime: now,
        timeDiffMs: timeDiff,
        maxToleranceMs: WEBHOOK_TIMESTAMP_TOLERANCE_MS
      });
      return {
        valid: false,
        error: 'Webhook timestamp is too old. Timestamp must be within 5 minutes of current time.',
        isReplayAttempt: true
      };
    }

    // Compute expected signature with timestamp included (more secure)
    // Format: timestamp.body -> prevents tampering with timestamp
    const rawBody = JSON.stringify(req.body || {});
    const payload = `${timestampHeader}.${rawBody}`;
    const h = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const expectedSignature = `sha256=${h}`;

    // Timing-safe comparison
    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length ||
          !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        logger.warn('Webhook security: Invalid signature with timestamp', {
          ip: req.ip || req.socket.remoteAddress,
          path: req.path
        });
        return { valid: false, error: 'Invalid webhook signature' };
      }
    } catch {
      logger.warn('Webhook security: Signature verification error', {
        ip: req.ip || req.socket.remoteAddress
      });
      return { valid: false, error: 'Invalid webhook signature' };
    }

    return { valid: true };
  }

  // Fallback: Legacy mode without timestamp (backward compatible but less secure)
  // Compute expected signature using HMAC-SHA256 (body only)
  const rawBody = JSON.stringify(req.body || {});
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedSignature = `sha256=${h}`;

  // Timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      logger.warn('Webhook security: Invalid signature (legacy mode)', {
        ip: req.ip || req.socket.remoteAddress,
        path: req.path
      });
      return { valid: false, error: 'Invalid webhook signature' };
    }
  } catch {
    logger.warn('Webhook security: Signature verification error (legacy mode)', {
      ip: req.ip || req.socket.remoteAddress
    });
    return { valid: false, error: 'Invalid webhook signature' };
  }

  // Log warning for requests without timestamp (less secure)
  logger.info('Webhook received without timestamp header (legacy mode)', {
    ip: req.ip || req.socket.remoteAddress,
    path: req.path,
    recommendation: 'Include x-webhook-timestamp header for replay attack protection'
  });

  return { valid: true };
}

// Webhook filters storage (id -> filters)
const webhookFilters = new Map<string, WebhookFilter>();

// ============================================
// WEBHOOK REQUEST HISTORY FOR REPLAY
// ============================================

/**
 * Stored webhook request for replay functionality
 */
interface WebhookRequestRecord {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, unknown>;
  ip: string;
  responseStatus: number;
  responseBody?: unknown;
}

// In-memory storage for webhook request history (webhookId -> requests[])
// Keeps last MAX_REQUESTS_PER_WEBHOOK requests per webhook
const MAX_REQUESTS_PER_WEBHOOK = 100;
const webhookRequestHistory = new Map<string, WebhookRequestRecord[]>();

/**
 * List of sensitive headers to exclude from stored requests
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'x-auth-token',
  'cookie',
  'set-cookie',
  'x-csrf-token',
  'x-xsrf-token',
  'proxy-authorization',
];

/**
 * Sanitize headers by removing sensitive information
 */
function sanitizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = String(value ?? '');
    }
  }
  return sanitized;
}

/**
 * Store a webhook request in history
 */
function storeWebhookRequest(
  webhookId: string,
  request: Request,
  responseStatus: number,
  responseBody?: unknown
): string {
  const requestId = crypto.randomUUID();

  const record: WebhookRequestRecord = {
    id: requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    headers: sanitizeHeaders(request.headers as Record<string, unknown>),
    body: request.body,
    query: request.query as Record<string, unknown>,
    ip: request.ip || request.socket.remoteAddress || 'unknown',
    responseStatus,
    responseBody,
  };

  let history = webhookRequestHistory.get(webhookId);
  if (!history) {
    history = [];
    webhookRequestHistory.set(webhookId, history);
  }

  // Add new request at the beginning
  history.unshift(record);

  // Keep only the last MAX_REQUESTS_PER_WEBHOOK requests
  if (history.length > MAX_REQUESTS_PER_WEBHOOK) {
    history.length = MAX_REQUESTS_PER_WEBHOOK;
  }

  return requestId;
}

/**
 * Get webhook request history
 */
function getWebhookRequestHistory(webhookId: string, limit: number = 50): WebhookRequestRecord[] {
  const history = webhookRequestHistory.get(webhookId) || [];
  return history.slice(0, Math.min(limit, MAX_REQUESTS_PER_WEBHOOK));
}

/**
 * Get a specific request from history
 */
function getWebhookRequest(webhookId: string, requestId: string): WebhookRequestRecord | null {
  const history = webhookRequestHistory.get(webhookId) || [];
  return history.find(r => r.id === requestId) || null;
}

/**
 * Webhook Filter Configuration
 * Similar to n8n's webhook filtering capabilities
 */
interface WebhookFilter {
  enabled: boolean;
  // Header filters
  headers?: Array<{
    name: string;
    value: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
  }>;
  // Query parameter filters
  queryParams?: Array<{
    name: string;
    value: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
  }>;
  // Body path filters (JSON path)
  bodyPaths?: Array<{
    path: string;
    value: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists' | 'gt' | 'lt' | 'gte' | 'lte';
  }>;
  // IP whitelist
  ipWhitelist?: string[];
  // HTTP methods allowed
  methods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  // Response configuration
  responseOnFilter?: {
    statusCode: number;
    body?: unknown;
  };
}

/**
 * Get value from object using dot notation path
 */
function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    // Handle array indexing: items[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

/**
 * Check if value matches filter criteria
 */
function matchesFilter(
  actual: unknown,
  expected: string,
  operator: string
): boolean {
  if (operator === 'exists') {
    return actual !== undefined && actual !== null;
  }

  const actualStr = String(actual ?? '');

  switch (operator) {
    case 'equals':
      return actualStr === expected;
    case 'contains':
      return actualStr.includes(expected);
    case 'startsWith':
      return actualStr.startsWith(expected);
    case 'endsWith':
      return actualStr.endsWith(expected);
    case 'regex':
      try {
        return new RegExp(expected).test(actualStr);
      } catch {
        return false;
      }
    case 'gt':
      return parseFloat(actualStr) > parseFloat(expected);
    case 'lt':
      return parseFloat(actualStr) < parseFloat(expected);
    case 'gte':
      return parseFloat(actualStr) >= parseFloat(expected);
    case 'lte':
      return parseFloat(actualStr) <= parseFloat(expected);
    default:
      return false;
  }
}

/**
 * Apply webhook filters to incoming request
 */
function applyWebhookFilters(
  req: Request,
  filter: WebhookFilter
): { passed: boolean; reason?: string } {
  if (!filter.enabled) {
    return { passed: true };
  }

  // Check HTTP method
  if (filter.methods && filter.methods.length > 0) {
    if (!filter.methods.includes(req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')) {
      return { passed: false, reason: `Method ${req.method} not allowed` };
    }
  }

  // Check IP whitelist
  if (filter.ipWhitelist && filter.ipWhitelist.length > 0) {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const ipAllowed = filter.ipWhitelist.some(ip => {
      // Support CIDR notation and exact match
      if (ip.includes('/')) {
        return isIpInCidr(clientIp, ip);
      }
      return clientIp === ip || clientIp.endsWith(ip);
    });
    if (!ipAllowed) {
      return { passed: false, reason: `IP ${clientIp} not in whitelist` };
    }
  }

  // Check header filters
  if (filter.headers) {
    for (const headerFilter of filter.headers) {
      const headerValue = req.headers[headerFilter.name.toLowerCase()];
      if (!matchesFilter(headerValue, headerFilter.value, headerFilter.operator)) {
        return { passed: false, reason: `Header filter failed: ${headerFilter.name}` };
      }
    }
  }

  // Check query param filters
  if (filter.queryParams) {
    for (const paramFilter of filter.queryParams) {
      const paramValue = req.query[paramFilter.name];
      if (!matchesFilter(paramValue, paramFilter.value, paramFilter.operator)) {
        return { passed: false, reason: `Query param filter failed: ${paramFilter.name}` };
      }
    }
  }

  // Check body path filters
  if (filter.bodyPaths) {
    for (const pathFilter of filter.bodyPaths) {
      const pathValue = getValueByPath(req.body, pathFilter.path);
      if (!matchesFilter(pathValue, pathFilter.value, pathFilter.operator)) {
        return { passed: false, reason: `Body path filter failed: ${pathFilter.path}` };
      }
    }
  }

  return { passed: true };
}

/**
 * Simple CIDR check for IP whitelist
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
  const maskNum = ~((1 << (32 - mask)) - 1);

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

const router = Router();

// ============================================
// MULTI-WEBHOOK MANAGEMENT ENDPOINTS
// ============================================

/**
 * List all webhooks for a workflow
 * GET /api/webhooks/workflow/:workflowId
 *
 * Returns all webhooks associated with a workflow, ordered by creation date.
 *
 * Example response:
 * {
 *   "webhooks": [
 *     {
 *       "id": "whk_abc123",
 *       "workflowId": "wf_123",
 *       "name": "GitHub Events",
 *       "path": "github",
 *       "url": "/webhook/wf_123/github",
 *       "method": "POST",
 *       "isActive": true,
 *       "triggerCount": 42,
 *       "lastTriggeredAt": "2024-01-15T10:30:00.000Z"
 *     }
 *   ],
 *   "total": 1
 * }
 */
router.get('/workflow/:workflowId', validateParams(webhookWorkflowParamsSchema), asyncHandler(async (req, res) => {
  const { workflowId } = req.params;

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  const webhooks = await listWebhooksByWorkflow(workflowId);

  res.json({
    webhooks,
    total: webhooks.length,
  });
}));

/**
 * Create a new webhook for a workflow
 * POST /api/webhooks/workflow/:workflowId
 *
 * Creates a new webhook endpoint for the specified workflow.
 * Each webhook must have a unique path within the workflow.
 *
 * Example payload:
 * {
 *   "name": "GitHub Events",
 *   "path": "github",
 *   "method": "POST",
 *   "secret": "your-webhook-secret",
 *   "description": "Receives GitHub webhook events"
 * }
 *
 * Example response:
 * {
 *   "webhook": {
 *     "id": "whk_abc123",
 *     "workflowId": "wf_123",
 *     "name": "GitHub Events",
 *     "path": "github",
 *     "url": "/webhook/wf_123/github",
 *     "method": "POST",
 *     "isActive": true
 *   }
 * }
 */
router.post('/workflow/:workflowId', validateParams(webhookWorkflowParamsSchema), validateBody(webhookRouteCreateBodySchema), asyncHandler(async (req, res) => {
  const { workflowId } = req.params;
  const { name, path, method, secret, description, headers } = req.body;

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Sanitize path: alphanumeric, hyphens, underscores only
  const sanitizedPath = path.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (sanitizedPath !== path.toLowerCase()) {
    throw new ApiError(400, 'Path can only contain alphanumeric characters, hyphens, and underscores');
  }

  // Check if webhook with this path already exists
  const existingWebhook = await getWebhookByWorkflowAndPath(workflowId, sanitizedPath);
  if (existingWebhook) {
    throw new ApiError(409, `Webhook with path '${sanitizedPath}' already exists for this workflow`);
  }

  const webhook = await createWebhook({
    workflowId,
    name: name || sanitizedPath,
    path: sanitizedPath,
    method: method || 'POST',
    secret,
    description,
    headers: headers || {},
  });

  res.status(201).json({ webhook });
}));

/**
 * Get a specific webhook
 * GET /api/webhooks/workflow/:workflowId/:webhookId
 */
router.get('/workflow/:workflowId/:webhookId', validateParams(webhookDetailParamsSchema), asyncHandler(async (req, res) => {
  const { workflowId, webhookId } = req.params;

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  const webhook = await getWebhookById(webhookId);
  if (!webhook || webhook.workflowId !== workflowId) {
    throw new ApiError(404, 'Webhook not found');
  }

  res.json({ webhook });
}));

/**
 * Update a webhook
 * PUT /api/webhooks/workflow/:workflowId/:webhookId
 *
 * Updates an existing webhook's configuration.
 *
 * Example payload:
 * {
 *   "name": "Updated Name",
 *   "isActive": false,
 *   "secret": "new-secret",
 *   "description": "Updated description"
 * }
 */
router.put('/workflow/:workflowId/:webhookId', validateParams(webhookDetailParamsSchema), validateBody(webhookRouteUpdateBodySchema), asyncHandler(async (req, res) => {
  const { workflowId, webhookId } = req.params;
  const { name, path, method, secret, description, isActive, headers } = req.body;

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Verify webhook exists and belongs to this workflow
  const existingWebhook = await getWebhookById(webhookId);
  if (!existingWebhook || existingWebhook.workflowId !== workflowId) {
    throw new ApiError(404, 'Webhook not found');
  }

  // If path is being changed, check for conflicts
  if (path && path !== existingWebhook.path) {
    const sanitizedPath = path.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const conflictingWebhook = await getWebhookByWorkflowAndPath(workflowId, sanitizedPath);
    if (conflictingWebhook && conflictingWebhook.id !== webhookId) {
      throw new ApiError(409, `Webhook with path '${sanitizedPath}' already exists for this workflow`);
    }
  }

  const updatedWebhook = await updateWebhook(webhookId, {
    name,
    path: path ? path.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : undefined,
    method,
    secret,
    description,
    isActive,
    headers,
  });

  res.json({ webhook: updatedWebhook });
}));

/**
 * Delete a webhook
 * DELETE /api/webhooks/workflow/:workflowId/:webhookId
 */
router.delete('/workflow/:workflowId/:webhookId', validateParams(webhookDetailParamsSchema), asyncHandler(async (req, res) => {
  const { workflowId, webhookId } = req.params;

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Verify webhook exists and belongs to this workflow
  const existingWebhook = await getWebhookById(webhookId);
  if (!existingWebhook || existingWebhook.workflowId !== workflowId) {
    throw new ApiError(404, 'Webhook not found');
  }

  await deleteWebhook(webhookId);

  // Clean up associated filters and history
  webhookFilters.delete(webhookId);
  webhookRequestHistory.delete(webhookId);

  res.json({ success: true, message: 'Webhook deleted' });
}));

// ============================================
// LEGACY SINGLE-WEBHOOK ENDPOINTS (Backward Compatibility)
// ============================================

// Register/rotate a secret for a webhook id (admin-only in real app)
router.post('/:id/secret', validateParams(simpleIdParamsSchema), validateBody(webhookSecretBodySchema), asyncHandler(async (req, res) => {
  const { secret } = req.body;
  await upsertWebhookSecret(req.params.id, secret);
  res.json({ success: true });
}));

// ============================================
// WEBHOOK FILTERING ENDPOINTS
// ============================================

/**
 * Get webhook filter configuration
 */
router.get('/:id/filter', validateParams(simpleIdParamsSchema), asyncHandler(async (req, res) => {
  const filter = webhookFilters.get(req.params.id);
  res.json({ filter: filter || { enabled: false } });
}));

/**
 * Set webhook filter configuration
 *
 * Example payload:
 * {
 *   "enabled": true,
 *   "headers": [
 *     { "name": "x-github-event", "value": "push", "operator": "equals" }
 *   ],
 *   "queryParams": [
 *     { "name": "source", "value": "production", "operator": "equals" }
 *   ],
 *   "bodyPaths": [
 *     { "path": "action", "value": "created", "operator": "equals" },
 *     { "path": "repository.name", "value": "my-repo", "operator": "contains" }
 *   ],
 *   "ipWhitelist": ["192.168.1.0/24", "10.0.0.1"],
 *   "methods": ["POST"],
 *   "responseOnFilter": { "statusCode": 200, "body": { "filtered": true } }
 * }
 */
router.post('/:id/filter', validateParams(simpleIdParamsSchema), validateBody(webhookFilterBodySchema), asyncHandler(async (req, res) => {
  const filter = req.body as WebhookFilter;
  // Zod already validated all fields
  webhookFilters.set(req.params.id, filter);
  res.json({ success: true, filter });
}));

/**
 * Delete webhook filter configuration
 */
router.delete('/:id/filter', validateParams(simpleIdParamsSchema), asyncHandler(async (req, res) => {
  webhookFilters.delete(req.params.id);
  res.json({ success: true });
}));

/**
 * Test webhook filter against sample data
 */
router.post('/:id/filter/test', validateParams(simpleIdParamsSchema), validateBody(webhookFilterTestBodySchema), asyncHandler(async (req, res) => {
  const filter = webhookFilters.get(req.params.id);

  if (!filter) {
    return res.json({ passed: true, reason: 'No filter configured' });
  }

  // Create a mock request from test data
  const testData = req.body as {
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    ip?: string;
    method?: string;
  };

  const mockReq = {
    headers: testData.headers || {},
    query: testData.query || {},
    body: testData.body || {},
    ip: testData.ip || '127.0.0.1',
    method: testData.method || 'POST',
    socket: { remoteAddress: testData.ip || '127.0.0.1' }
  } as Request;

  const result = applyWebhookFilters(mockReq, filter);
  res.json(result);
}));

// ============================================
// WEBHOOK REQUEST HISTORY & REPLAY ENDPOINTS
// ============================================

/**
 * Get webhook request history
 *
 * Returns the last N webhook requests for debugging purposes.
 * Sensitive headers (Authorization, API keys, etc.) are redacted.
 *
 * Query parameters:
 * - limit: Number of requests to return (default: 50, max: 100)
 *
 * Example response:
 * {
 *   "webhookId": "wf_123",
 *   "requests": [
 *     {
 *       "id": "req_abc123",
 *       "timestamp": "2024-01-15T10:30:00.000Z",
 *       "method": "POST",
 *       "headers": { "content-type": "application/json", "authorization": "[REDACTED]" },
 *       "body": { "event": "push", "repository": "my-repo" },
 *       "query": {},
 *       "ip": "192.168.1.100",
 *       "responseStatus": 202
 *     }
 *   ],
 *   "total": 1
 * }
 */
router.get('/:id/history', validateParams(simpleIdParamsSchema), validateQuery(webhookHistoryQuerySchema), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const limit = Math.min(req.query.limit as unknown as number || 50, MAX_REQUESTS_PER_WEBHOOK);

  // Verify webhook/workflow exists
  const wf = await getWorkflow(id);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  const requests = getWebhookRequestHistory(id, limit);

  res.json({
    webhookId: id,
    requests,
    total: requests.length,
  });
}));

/**
 * Replay a webhook request
 *
 * Re-executes a previous webhook request from history.
 * This is useful for debugging webhook integrations without
 * needing to trigger the external service again.
 *
 * NOTE: This endpoint bypasses signature verification since
 * the original request was already verified when it was first received.
 *
 * Example response:
 * {
 *   "success": true,
 *   "replayedRequestId": "req_abc123",
 *   "originalTimestamp": "2024-01-15T10:30:00.000Z",
 *   "executionStatus": "accepted"
 * }
 */
router.post('/:id/replay/:requestId', validateParams(webhookReplayParamsSchema), asyncHandler(async (req, res) => {
  const { id, requestId } = req.params;

  // Verify webhook/workflow exists
  const wf = await getWorkflow(id);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Find the original request
  const originalRequest = getWebhookRequest(id, requestId);
  if (!originalRequest) {
    throw new ApiError(404, 'Request not found in history. It may have been pruned (only last 100 requests are kept).');
  }

  // Apply webhook filters if configured (replay should respect filters)
  const filter = webhookFilters.get(id);
  if (filter && filter.enabled) {
    // Create a mock request object for filter evaluation
    const mockReq = {
      headers: originalRequest.headers,
      query: originalRequest.query,
      body: originalRequest.body,
      ip: originalRequest.ip,
      method: originalRequest.method,
      socket: { remoteAddress: originalRequest.ip }
    } as Request;

    const filterResult = applyWebhookFilters(mockReq, filter);
    if (!filterResult.passed) {
      return res.status(400).json({
        success: false,
        error: 'Replay blocked by webhook filter',
        reason: filterResult.reason,
      });
    }
  }

  // Execute the workflow with the original request body
  await executeWorkflowSimple(wf, originalRequest.body);

  res.status(202).json({
    success: true,
    replayedRequestId: requestId,
    originalTimestamp: originalRequest.timestamp,
    executionStatus: 'accepted',
  });
}));

/**
 * Clear webhook request history
 *
 * Deletes all stored requests for a webhook.
 * Useful for cleaning up sensitive data or resetting history.
 */
router.delete('/:id/history', validateParams(simpleIdParamsSchema), asyncHandler(async (req, res) => {
  const id = req.params.id;

  // Verify webhook/workflow exists
  const wf = await getWorkflow(id);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  webhookRequestHistory.delete(id);

  res.json({ success: true, message: 'Request history cleared' });
}));

// ============================================
// PATH-BASED WEBHOOK INGESTION (New Multi-Webhook System)
// ============================================

/**
 * Path-based Webhook Ingestion Endpoint (POST)
 * POST /api/webhooks/:workflowId/:webhookPath
 *
 * This is the new multi-webhook ingestion endpoint that routes to specific
 * webhook configurations based on the path.
 *
 * Example URLs:
 * - /api/webhooks/wf_123/github  -> GitHub webhook for workflow wf_123
 * - /api/webhooks/wf_123/stripe  -> Stripe webhook for workflow wf_123
 * - /api/webhooks/wf_123/default -> Default webhook (backward compatible)
 *
 * SECURITY: Signature verification is MANDATORY for all webhooks
 */
router.post('/:workflowId/:webhookPath', validateParams(webhookPathParamsSchema), asyncHandler(async (req, res) => {
  const { workflowId, webhookPath } = req.params;

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Find the webhook by workflow and path
  const webhook = await getWebhookByWorkflowAndPath(workflowId, webhookPath.toLowerCase());
  if (!webhook) {
    throw new ApiError(404, `Webhook '${webhookPath}' not found for this workflow`);
  }

  // Check if webhook is active
  if (!webhook.isActive) {
    throw new ApiError(403, 'Webhook is disabled');
  }

  // CRITICAL SECURITY: Signature verification is MANDATORY
  const secret = webhook.secret;

  // Reject if no secret is configured
  if (!secret) {
    throw new ApiError(400,
      'Webhook signature verification must be enabled. Configure a secret when creating or updating the webhook.'
    );
  }

  // Verify webhook signature with replay protection
  const verification = verifyWebhookWithReplayProtection(req, secret);
  if (!verification.valid) {
    // Return 401 for replay attacks, 401 for invalid signatures
    const statusCode = verification.isReplayAttempt ? 401 : 401;
    throw new ApiError(statusCode, verification.error || 'Invalid webhook signature');
  }

  // Apply webhook filters if configured
  const filter = webhookFilters.get(webhook.id);
  if (filter && filter.enabled) {
    const filterResult = applyWebhookFilters(req, filter);
    if (!filterResult.passed) {
      // Return configured response or default 200
      const responseConfig = filter.responseOnFilter || { statusCode: 200 };
      const responseBody = {
        filtered: true,
        reason: filterResult.reason,
        ...(responseConfig.body as object || {})
      };

      // Store filtered request in history
      storeWebhookRequest(webhook.id, req, responseConfig.statusCode, responseBody);

      return res.status(responseConfig.statusCode).json(responseBody);
    }
  }

  // Signature verified and filters passed - execute workflow
  // Pass webhook metadata in the execution context
  const webhookContext = {
    body: req.body,
    headers: req.headers,
    query: req.query,
    webhookId: webhook.id,
    webhookName: webhook.name,
    webhookPath: webhook.path,
  };
  await executeWorkflowSimple(wf, webhookContext);

  // Store successful request in history
  const responseBody = { accepted: true, webhookId: webhook.id, webhookPath: webhook.path };
  storeWebhookRequest(webhook.id, req, 202, responseBody);

  res.status(202).json(responseBody);
}));

/**
 * Path-based Webhook GET endpoint (for webhook verification callbacks)
 * GET /api/webhooks/:workflowId/:webhookPath
 *
 * Some services like Slack require GET verification.
 */
router.get('/:workflowId/:webhookPath', validateParams(webhookPathParamsSchema), asyncHandler(async (req, res) => {
  const { workflowId, webhookPath } = req.params;

  // Skip if webhookPath looks like a known sub-route (history, filter, secret, replay)
  // This ensures backward compatibility with legacy single-webhook endpoints
  if (['history', 'filter', 'secret'].includes(webhookPath)) {
    throw new ApiError(404, 'Webhook not found');
  }

  // Verify workflow exists
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Find the webhook by workflow and path
  const webhook = await getWebhookByWorkflowAndPath(workflowId, webhookPath.toLowerCase());
  if (!webhook) {
    throw new ApiError(404, `Webhook '${webhookPath}' not found for this workflow`);
  }

  // Check if webhook is active
  if (!webhook.isActive) {
    throw new ApiError(403, 'Webhook is disabled');
  }

  // Check if filter allows GET method
  const filter = webhookFilters.get(webhook.id);
  if (filter && filter.enabled) {
    if (filter.methods && !filter.methods.includes('GET')) {
      throw new ApiError(405, 'GET method not allowed for this webhook');
    }
    const filterResult = applyWebhookFilters(req, filter);
    if (!filterResult.passed) {
      const responseConfig = filter.responseOnFilter || { statusCode: 200 };
      return res.status(responseConfig.statusCode).json({
        filtered: true,
        reason: filterResult.reason,
        ...(responseConfig.body as object || {})
      });
    }
  }

  // Handle Slack-style challenge verification
  const challenge = req.query.challenge;
  if (challenge) {
    return res.json({ challenge });
  }

  // Return webhook info
  res.json({
    id: webhook.id,
    name: webhook.name,
    path: webhook.path,
    workflowId,
    active: webhook.isActive,
    methods: filter?.methods || ['POST'],
    filtering: filter?.enabled || false
  });
}));

// ============================================
// LEGACY SINGLE-WEBHOOK INGESTION (Backward Compatibility)
// ============================================

/**
 * Legacy Webhook Ingestion Endpoint
 * POST /api/webhooks/:id
 *
 * DEPRECATED: Use /api/webhooks/:workflowId/:webhookPath instead
 *
 * This endpoint is maintained for backward compatibility with existing
 * single-webhook workflows. It treats the :id as the workflowId and
 * looks for a webhook with path "default".
 *
 * SECURITY: Signature verification is MANDATORY for all webhooks
 *
 * Supported signature methods:
 * - HMAC-SHA256 (default, GitHub-style: "sha256=<signature>")
 *
 * Features:
 * - Signature verification (HMAC-SHA256)
 * - Advanced filtering (headers, query params, body paths, IP whitelist)
 * - Configurable response on filter rejection
 *
 * Migration guide for existing webhooks:
 * 1. Generate a secret: POST /api/webhooks/:id/secret with { "secret": "your-secret-key" }
 * 2. Update webhook callers to include signature in headers:
 *    - Header: x-webhook-signature or x-signature
 *    - Format: sha256=<hmac-sha256(secret, body)>
 *
 * Breaking change: Webhooks without valid signatures will be rejected with 401
 */
router.post('/:id', validateParams(simpleIdParamsSchema), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const wf = await getWorkflow(id);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // CRITICAL SECURITY: Signature verification is MANDATORY
  const secret = await getWebhookSecret(id);

  // Reject if no secret is configured
  if (!secret) {
    throw new ApiError(400,
      'Webhook signature verification must be enabled. Configure a secret via POST /api/webhooks/' + id + '/secret'
    );
  }

  // Verify webhook signature with replay protection
  const verification = verifyWebhookWithReplayProtection(req, secret);
  if (!verification.valid) {
    throw new ApiError(401, verification.error || 'Invalid webhook signature');
  }

  // Apply webhook filters if configured
  const filter = webhookFilters.get(id);
  if (filter && filter.enabled) {
    const filterResult = applyWebhookFilters(req, filter);
    if (!filterResult.passed) {
      // Return configured response or default 200
      const responseConfig = filter.responseOnFilter || { statusCode: 200 };
      const responseBody = {
        filtered: true,
        reason: filterResult.reason,
        ...(responseConfig.body as object || {})
      };

      // Store filtered request in history
      storeWebhookRequest(id, req, responseConfig.statusCode, responseBody);

      return res.status(responseConfig.statusCode).json(responseBody);
    }
  }

  // Signature verified and filters passed - execute workflow
  await executeWorkflowSimple(wf, req.body);

  // Store successful request in history
  const responseBody = { accepted: true };
  storeWebhookRequest(id, req, 202, responseBody);

  res.status(202).json(responseBody);
}));

/**
 * GET webhook endpoint (for webhook verification callbacks)
 * Some services like Slack require GET verification
 */
router.get('/:id', validateParams(simpleIdParamsSchema), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const wf = await getWorkflow(id);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // Check if filter allows GET method
  const filter = webhookFilters.get(id);
  if (filter && filter.enabled) {
    if (filter.methods && !filter.methods.includes('GET')) {
      throw new ApiError(405, 'GET method not allowed for this webhook');
    }
    const filterResult = applyWebhookFilters(req, filter);
    if (!filterResult.passed) {
      const responseConfig = filter.responseOnFilter || { statusCode: 200 };
      return res.status(responseConfig.statusCode).json({
        filtered: true,
        reason: filterResult.reason,
        ...(responseConfig.body as object || {})
      });
    }
  }

  // Handle Slack-style challenge verification
  const challenge = req.query.challenge;
  if (challenge) {
    return res.json({ challenge });
  }

  // Return webhook info
  res.json({
    id,
    active: true,
    methods: filter?.methods || ['POST'],
    filtering: filter?.enabled || false
  });
}));

export default router;

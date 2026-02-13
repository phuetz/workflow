import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { getWorkflow, getWebhookSecret, upsertWebhookSecret } from '../repositories/adapters';
import { executeWorkflowSimple } from '../services/simpleExecutionService';

// Minimal in-memory secrets map (id -> secret)
const webhookSecrets = new Map<string, string>();

const router = Router();

// Register/rotate a secret for a webhook id (admin-only in real app)
router.post('/:id/secret', asyncHandler(async (req, res) => {
  const { secret } = req.body || {};
  if (!secret || typeof secret !== 'string') throw new ApiError(400, 'Secret is required');
  await upsertWebhookSecret(req.params.id, secret);
  res.json({ success: true });
}));

/**
 * Webhook Ingestion Endpoint
 *
 * SECURITY: Signature verification is MANDATORY for all webhooks
 *
 * Supported signature methods:
 * - HMAC-SHA256 (default, GitHub-style: "sha256=<signature>")
 *
 * Migration guide for existing webhooks:
 * 1. Generate a secret: POST /api/webhooks/:id/secret with { "secret": "your-secret-key" }
 * 2. Update webhook callers to include signature in headers:
 *    - Header: x-webhook-signature or x-signature
 *    - Format: sha256=<hmac-sha256(secret, body)>
 *
 * Breaking change: Webhooks without valid signatures will be rejected with 401
 */
router.post('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const wf = getWorkflow(id);
  if (!wf) throw new ApiError(404, 'Workflow not found');

  // CRITICAL SECURITY: Signature verification is MANDATORY
  const secret = await getWebhookSecret(id);

  // Reject if no secret is configured
  if (!secret) {
    throw new ApiError(400,
      'Webhook signature verification must be enabled. Configure a secret via POST /api/webhooks/' + id + '/secret'
    );
  }

  // Extract signature from headers
  const theirSig = (req.headers['x-webhook-signature'] || req.headers['x-signature']) as string | undefined;

  // Reject if signature is missing
  if (!theirSig) {
    throw new ApiError(401,
      'Missing webhook signature. Include signature in x-webhook-signature or x-signature header.'
    );
  }

  // Compute expected signature using HMAC-SHA256
  const rawBody = JSON.stringify(req.body || {});
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const computed = `sha256=${h}`;

  // Reject if signature is invalid (timing-safe comparison)
  if (!crypto.timingSafeEqual(Buffer.from(theirSig), Buffer.from(computed))) {
    throw new ApiError(401, 'Invalid webhook signature');
  }

  // Signature verified - execute workflow
  await executeWorkflowSimple(wf, req.body);
  res.status(202).json({ accepted: true });
}));

export default router;

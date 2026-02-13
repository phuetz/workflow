import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface PendingRequest {
  timestamp: number;
  promise: Promise<any>;
}

const pendingRequests = new Map<string, PendingRequest>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingRequests.entries()) {
    if (now - value.timestamp > DEDUP_WINDOW_MS) {
      pendingRequests.delete(key);
    }
  }
}, 30000);

export function generateIdempotencyKey(req: Request): string {
  // Use client-provided key if available
  const clientKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (clientKey) {
    return `idem:${clientKey}`;
  }

  // Generate key from request details
  const userId = (req as any).user?.id || 'anonymous';
  const body = JSON.stringify(req.body || {});
  const hash = crypto.createHash('sha256')
    .update(`${userId}:${req.method}:${req.path}:${body}`)
    .digest('hex');

  return `auto:${hash}`;
}

export function deduplication(req: Request, res: Response, next: NextFunction): void {
  // Only apply to POST, PUT, PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Skip certain paths
  const skipPaths = ['/api/health', '/api/docs'];
  if (skipPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  const key = generateIdempotencyKey(req);

  // Check if request is already pending
  const pending = pendingRequests.get(key);
  if (pending && Date.now() - pending.timestamp < DEDUP_WINDOW_MS) {
    res.status(409).json({
      error: 'Duplicate request',
      message: 'A similar request is already being processed',
      idempotencyKey: key
    });
    return;
  }

  next();
}

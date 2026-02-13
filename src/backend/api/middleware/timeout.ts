/**
 * Request Timeout Middleware
 * Prevents long-running requests from blocking the server
 */

import { Request, Response, NextFunction } from 'express';

export interface TimeoutOptions {
  defaultTimeoutMs: number;
  paths?: Record<string, number>; // Path-specific timeouts
}

const defaultOptions: TimeoutOptions = {
  defaultTimeoutMs: 30000, // 30 seconds default
  paths: {
    '/api/executions': 300000,     // 5 min for workflow executions
    '/api/export': 120000,         // 2 min for exports
    '/api/queue': 60000,           // 1 min for queue operations
    '/api/health': 5000,           // 5 sec for health checks
  }
};

export function requestTimeout(options: Partial<TimeoutOptions> = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Find matching path timeout
    let timeoutMs = config.defaultTimeoutMs;
    for (const [path, timeout] of Object.entries(config.paths || {})) {
      if (req.path.startsWith(path)) {
        timeoutMs = timeout;
        break;
      }
    }

    // Set request timeout
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: `Request exceeded ${timeoutMs}ms timeout`,
          requestId: (req as any).context?.requestId
        });
      }
    });

    // Set response timeout
    res.setTimeout(timeoutMs);

    next();
  };
}

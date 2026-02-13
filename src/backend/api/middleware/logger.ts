/**
 * Request Logger Middleware
 * Logs incoming requests for monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../services/SimpleLogger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.info(`→ ${req.method} ${req.path}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const emoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✓';

    logger.info(`${emoji} ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });

  next();
}
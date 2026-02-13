import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../services/SimpleLogger';

interface ErrorContext {
  requestId?: string;
  userId?: string;
  path: string;
  method: string;
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

export function errorTrackingMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context: ErrorContext = {
    requestId: req.context?.requestId,
    userId: (req as any).user?.id,
    path: req.path,
    method: req.method,
    query: req.query,
    params: req.params
  };

  // Don't log request body for security

  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log error with context
  if (isServerError) {
    logger.error('Server error', {
      ...context,
      error: {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack,
        details: err.details
      }
    });
  } else {
    logger.warn('Client error', {
      ...context,
      error: {
        name: err.name,
        message: err.message,
        code: err.code
      }
    });
  }

  // Send response
  res.status(statusCode).json({
    error: {
      message: isServerError ? 'Internal server error' : err.message,
      code: err.code || 'ERROR',
      requestId: context.requestId
    }
  });
}

// Async error wrapper
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

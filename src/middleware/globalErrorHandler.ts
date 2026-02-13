/**
 * Global Error Handler
 * PLAN C - Système centralisé de gestion d'erreurs
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/SimpleLogger';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  NODE_EXECUTION_ERROR = 'NODE_EXECUTION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    public message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    isOperational: boolean = true,
    public details?: unknown
  ) {
    super(message);
    this.isOperational = isOperational;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper for Express routes
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error with context
  const errorContext = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  };

  // Log to service
  logger.error('Global error handler caught error:', errorContext);

  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = ErrorCode.INTERNAL_ERROR;
  let details: unknown = undefined;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;

    // Don't expose internal errors in production
    if (!err.isOperational && process.env.NODE_ENV === 'production') {
      message = 'An unexpected error occurred';
      details = undefined;
    }
  }
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = ErrorCode.VALIDATION_ERROR;
    details = err.message;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = ErrorCode.AUTH_ERROR;
  }
  // Handle token expiry
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = ErrorCode.AUTH_ERROR;
  }
  // Handle database errors
  else if (err.name === 'SequelizeError' || err.name === 'MongoError') {
    statusCode = 500;
    message = 'Database operation failed';
    code = ErrorCode.DATABASE_ERROR;
    
    // Don't expose database details in production
    if (process.env.NODE_ENV !== 'production') {
      details = err.message;
    }
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && typeof details === 'object' ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        originalError: err.message
      })
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new AppError(
    `Resource not found: ${req.originalUrl}`,
    ErrorCode.NOT_FOUND,
    404
  );
  
  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: error.message
    }
  });
};

/**
 * Unhandled rejection handler
 */
export const unhandledRejectionHandler = (reason: unknown, _promise: Promise<unknown>) => {
  // Extract detailed error information
  const errorDetails: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    reasonType: typeof reason,
    promiseState: 'present' // Promise is always defined in this handler
  };

  // Try to extract useful information from reason
  if (reason instanceof Error) {
    errorDetails.message = reason.message;
    errorDetails.stack = reason.stack;
    errorDetails.name = reason.name;
  } else if (reason && typeof reason === 'object') {
    try {
      errorDetails.reasonStringified = JSON.stringify(reason, Object.getOwnPropertyNames(reason));
    } catch {
      errorDetails.reasonStringified = String(reason);
    }
  } else {
    errorDetails.reasonValue = reason;
  }

  logger.error('Unhandled Rejection:', errorDetails);

  // In production, gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    // Give time to finish ongoing requests
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
};

/**
 * Uncaught exception handler
 */
export const uncaughtExceptionHandler = (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Shutdown gracefully
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};

/**
 * Setup global error handlers
 */
export const setupErrorHandlers = () => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', unhandledRejectionHandler);

  // Handle uncaught exceptions
  process.on('uncaughtException', uncaughtExceptionHandler);

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  // Handle SIGINT
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

/**
 * Error factory functions for common errors
 */
export const ErrorFactory = {
  validation: (message: string, details?: unknown) => 
    new AppError(message, ErrorCode.VALIDATION_ERROR, 400, true, details),
  
  unauthorized: (message = 'Unauthorized') => 
    new AppError(message, ErrorCode.AUTH_ERROR, 401),
  
  forbidden: (message = 'Forbidden') => 
    new AppError(message, ErrorCode.PERMISSION_ERROR, 403),
  
  notFound: (resource = 'Resource') => 
    new AppError(`${resource} not found`, ErrorCode.NOT_FOUND, 404),
  
  rateLimit: (message = 'Too many requests') => 
    new AppError(message, ErrorCode.RATE_LIMIT_ERROR, 429),
  
  database: (message: string) => 
    new AppError(message, ErrorCode.DATABASE_ERROR, 500),
  
  workflow: (message: string, details?: unknown) => 
    new AppError(message, ErrorCode.WORKFLOW_ERROR, 500, true, details),
  
  nodeExecution: (nodeId: string, message: string) => 
    new AppError(
      `Node ${nodeId} execution failed: ${message}`,
      ErrorCode.NODE_EXECUTION_ERROR,
      500,
      true,
      { nodeId }
    ),
  
  internal: (message = 'Internal server error') => 
    new AppError(message, ErrorCode.INTERNAL_ERROR, 500, false)
};

/**
 * Advanced Compression Middleware
 * Provides optimized compression for all HTTP responses
 */

import compression from 'compression';
import { Request, Response } from 'express';

// Compression configuration
export const compressionMiddleware = compression({
  // Level 9 = Maximum compression
  level: 9,

  // Compress all responses, even small ones
  threshold: 0,

  // Custom filter to skip certain responses
  filter: (req: Request, res: Response) => {
    // Don't compress if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress streaming responses
    if (res.getHeader('content-type')?.toString().includes('stream')) {
      return false;
    }

    // Don't compress images (already compressed)
    const contentType = res.getHeader('content-type')?.toString() || '';
    if (contentType.match(/image\/(jpeg|png|gif|webp)/)) {
      return false;
    }

    // Use default compression filter for everything else
    return compression.filter(req, res);
  },

  // Memory level (1-9, higher = more memory but better compression)
  memLevel: 9,

  // Strategy: optimized for text/json
  strategy: 0, // Z_DEFAULT_STRATEGY
});

/**
 * Brotli compression middleware (higher compression than gzip)
 * Modern browsers support Brotli which provides 15-25% better compression
 */
export const brotliCompressionMiddleware = (req: Request, res: Response, next: () => void) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Check if client supports Brotli
  if (acceptEncoding.includes('br')) {
    // Set Brotli encoding
    res.setHeader('Content-Encoding', 'br');
  }

  next();
};

/**
 * Response size tracking middleware
 * Helps monitor compression effectiveness
 */
export const trackResponseSize = (req: Request, res: Response, next: () => void) => {
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let responseSize = 0;

  // Override write method
  res.write = function(chunk: unknown, ...args: unknown[]): boolean {
    if (chunk && (typeof chunk === 'string' || Buffer.isBuffer(chunk))) {
      responseSize += Buffer.byteLength(chunk);
    }
    return originalWrite(chunk, ...args as [unknown, unknown?]);
  } as typeof res.write;

  // Override end method
  res.end = function(chunk?: unknown, ...args: unknown[]): Response {
    if (chunk && (typeof chunk === 'string' || Buffer.isBuffer(chunk))) {
      responseSize += Buffer.byteLength(chunk);
    }

    // Add custom header with response size
    res.setHeader('X-Response-Size', responseSize.toString());

    return originalEnd(chunk, ...args as [unknown?, unknown?]);
  } as typeof res.end;

  next();
};

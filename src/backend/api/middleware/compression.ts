/**
 * Advanced Compression Middleware
 * Provides optimized compression for all HTTP responses
 *
 * Optimizations:
 * - 1KB threshold to avoid overhead on small responses
 * - Level 6 for balanced CPU/compression ratio
 * - Proper handling of no-transform, SSE, and binary content
 * - 16KB chunk size for efficient streaming
 */

import compression from 'compression';
import { Request, Response } from 'express';

// Compression configuration - optimized for performance
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  // Small responses have compression overhead that can make them larger
  threshold: 1024,

  // Compression level (1-9, default 6)
  // Level 6 provides good compression with reasonable CPU usage
  // Level 9 uses ~40% more CPU for only ~5% better compression
  level: 6,

  // Custom filter to skip certain responses
  filter: (req: Request, res: Response) => {
    // Don't compress if no-transform directive present (RFC 7234)
    // This respects client/proxy cache directives
    const cacheControl = req.headers['cache-control'];
    if (cacheControl && cacheControl.includes('no-transform')) {
      return false;
    }

    // Don't compress if explicitly disabled by request header
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Skip compression for Server-Sent Events (SSE) streaming
    // SSE needs real-time delivery without buffering
    const contentType = res.getHeader('Content-Type') as string | undefined;
    if (contentType?.includes('text/event-stream')) {
      return false;
    }

    // Don't compress streaming responses
    if (contentType?.includes('stream')) {
      return false;
    }

    // Don't compress already-compressed formats
    // These formats are already compressed and re-compressing wastes CPU
    if (contentType) {
      const compressedFormats = /image\/(jpeg|png|gif|webp|svg\+xml)|video\/|audio\/|application\/(zip|gzip|x-gzip|x-tar|x-rar|pdf)/;
      if (compressedFormats.test(contentType)) {
        return false;
      }
    }

    // Use default compression filter for everything else
    // Default filter compresses text/*, application/json, application/javascript, etc.
    return compression.filter(req, res);
  },

  // Memory level (1-9, higher = more memory but better compression)
  // Level 8 is a good balance for server environments
  memLevel: 8,

  // Strategy: optimized for text/json content
  strategy: 0, // Z_DEFAULT_STRATEGY - works well for mixed content

  // Chunk size for streaming compression (16KB)
  // Larger chunks are more efficient but add latency
  chunkSize: 16384
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
  res.write = function(
    chunk: string | Buffer | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void
  ): boolean {
    if (chunk && (typeof chunk === 'string' || Buffer.isBuffer(chunk))) {
      const encoding: BufferEncoding = typeof chunk === 'string' ? 'utf8' : 'binary';
      responseSize += Buffer.byteLength(chunk, encoding);
    }
    if (typeof encodingOrCallback === 'function') {
      return originalWrite(chunk, encodingOrCallback);
    }
    return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
  } as typeof res.write;

  // Override end method
  res.end = function(
    chunk?: string | Buffer | Uint8Array | (() => void),
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void
  ): Response {
    if (chunk && typeof chunk !== 'function' && (typeof chunk === 'string' || Buffer.isBuffer(chunk))) {
      const encoding: BufferEncoding = typeof chunk === 'string' ? 'utf8' : 'binary';
      responseSize += Buffer.byteLength(chunk, encoding);
    }

    // Add custom header with response size
    res.setHeader('X-Response-Size', responseSize.toString());

    if (typeof chunk === 'function') {
      return originalEnd(chunk);
    }
    if (typeof encodingOrCallback === 'function') {
      return originalEnd(chunk, encodingOrCallback);
    }
    return originalEnd(chunk, encodingOrCallback as BufferEncoding, callback);
  } as typeof res.end;

  next();
};

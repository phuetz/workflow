/**
 * Static Assets Middleware
 * Optimizes caching and delivery of static assets
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';

/**
 * Static assets caching middleware
 * Sets aggressive caching headers for static assets
 */
export const staticAssetsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const urlPath = req.path;

  // Check if request is for a static asset
  const isStaticAsset = urlPath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$/);

  if (isStaticAsset) {
    // Immutable assets (with content hash in filename)
    if (urlPath.match(/\.[a-f0-9]{8,}\./)) {
      // Cache for 1 year with immutable flag
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Regular static assets
    else {
      // Cache for 1 hour
      res.set('Cache-Control', 'public, max-age=3600');
    }

    // Add ETag support
    res.set('ETag', 'W/"' + Date.now() + '"');

    // Add Vary header for better caching
    res.set('Vary', 'Accept-Encoding');
  }

  next();
};

/**
 * Preload headers middleware
 * Adds Link headers for HTTP/2 Server Push
 */
export const preloadHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only add preload headers for HTML requests
  if (req.path === '/' || req.path.endsWith('.html')) {
    const preloadLinks = [
      '</assets/main.css>; rel=preload; as=style',
      '</assets/main.js>; rel=preload; as=script',
    ];

    res.set('Link', preloadLinks.join(', '));
  }

  next();
};

/**
 * Content type optimization middleware
 * Ensures correct content types for modern formats
 */
export const contentTypeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ext = path.extname(req.path).toLowerCase();

  const contentTypes: Record<string, string> = {
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  };

  if (contentTypes[ext]) {
    res.set('Content-Type', contentTypes[ext]);
  }

  next();
};

/**
 * Security headers for static assets
 */
export const staticSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Only for static assets
  const isStaticAsset = req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$/);

  if (isStaticAsset) {
    // Prevent MIME type sniffing
    res.set('X-Content-Type-Options', 'nosniff');

    // CORS for fonts and assets
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Max-Age', '86400');

    // Timing-Allow-Origin for performance monitoring
    res.set('Timing-Allow-Origin', '*');
  }

  next();
};

/**
 * Image optimization headers
 */
export const imageOptimizationHeaders = (req: Request, res: Response, next: NextFunction) => {
  const isImage = req.path.match(/\.(png|jpg|jpeg|gif|webp|avif)$/);

  if (isImage) {
    // Accept Client Hints for responsive images
    res.set('Accept-CH', 'DPR, Viewport-Width, Width');

    // Vary header for client hints
    res.set('Vary', 'Accept, DPR, Viewport-Width, Width');
  }

  next();
};

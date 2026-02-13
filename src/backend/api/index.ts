/**
 * Backend API Barrel Export
 *
 * This module provides unified exports for the Express API layer.
 *
 * @module backend/api
 * @version 1.0.0
 * @since 2026-01-10
 */

// Main application
export { createApp } from './app';
export { default as app } from './app';

// Routes (lazy loaded in production)
export * from './routes';

// Middleware
export * from './middleware';

// Repositories
export * from './repositories';

// Services
export * from './services';

/**
 * Architecture Overview:
 *
 * API Layer:
 * ├── app.ts          - Express app configuration
 * ├── server.ts       - HTTP server initialization
 * ├── routes/         - API route handlers
 * ├── middleware/     - Express middleware (auth, rate limiting, etc.)
 * ├── repositories/   - Data access layer
 * └── services/       - Business logic services
 *
 * Usage:
 * ```typescript
 * import { createApp } from '@backend/api';
 * const app = createApp();
 * ```
 */

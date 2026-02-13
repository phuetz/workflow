/**
 * API Routes Barrel Export
 *
 * This module provides unified exports for all API route handlers.
 *
 * @module backend/api/routes
 * @version 1.0.0
 * @since 2026-01-10
 */

// Core workflow routes
export { default as workflowsRouter } from './workflows';
export { default as executionsRouter } from './executions';
export { nodeRouter as nodesRouter } from './nodes';
export { default as templatesRouter } from './templates';
export { default as subworkflowsRouter } from './subworkflows';

// Authentication & authorization
export { authRouter } from './auth';
export { default as oauthRouter } from './oauth';
export { default as ssoRouter } from './sso';
export { default as credentialsRouter } from './credentials';
export { default as usersRouter } from './users';

// Monitoring & health
export { default as healthRouter } from './health';
export { default as metricsRouter } from './metrics';
export { analyticsRouter } from './analytics';
export { default as auditRouter } from './audit';

// Webhooks & integrations
export { default as webhooksRouter } from './webhooks';
export { default as formsRouter } from './forms';
export { default as chatRouter } from './chat';
export { marketplaceRouter } from './marketplace';

// Queue management
export { default as queueRouter } from './queue';
export { default as queueMetricsRouter } from './queue-metrics';
export { default as rateLimitRouter } from './rate-limit';
export { default as dlqRouter } from './dlq';

// Environment & git
export { default as environmentRouter } from './environment';
export { default as gitRouter } from './git';

// Security
export { default as secretScanningRouter } from './secret-scanning';
export { default as secretRemediationRouter } from './secret-remediation';

// Error handling
export { default as errorWorkflowsRouter } from './error-workflows';
export { default as reviewsRouter } from './reviews';

// Team management
export { default as teamsRouter } from './teams';

/**
 * Route Groups:
 *
 * Core:      /api/workflows, /api/executions, /api/nodes, /api/templates
 * Auth:      /api/auth, /api/oauth, /api/sso, /api/credentials, /api/users
 * Teams:     /api/teams
 * Monitor:   /api/health, /api/metrics, /api/analytics, /api/audit
 * Queue:     /api/queue, /api/queue-metrics, /api/rate-limit, /api/dlq
 * Security:  /api/secret-scanning, /api/secret-remediation
 */

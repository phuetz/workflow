/**
 * Audit Logger Middleware
 * Tracks sensitive operations for compliance and security monitoring
 *
 * Features:
 * - Automatic detection of sensitive operations based on method and path
 * - Captures request context (user, IP, user agent, request ID)
 * - Records response status and duration
 * - Integrates with existing AuditService for persistence
 * - Non-blocking - audit failures don't affect API responses
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../services/SimpleLogger';
import { getAuditService } from '../../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../../audit/AuditTypes';

/**
 * Audit log entry structure for HTTP operations
 */
export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  statusCode?: number;
  duration?: number;
  changes?: unknown;
}

/**
 * Mapping of HTTP operations to audit actions
 * Format: 'METHOD /api/path' -> audit action name
 */
const AUDIT_PATHS: Record<string, { action: AuditAction; category: AuditCategory; severity?: AuditSeverity }> = {
  // Workflow operations
  'POST /api/workflows': { action: AuditAction.WORKFLOW_CREATE, category: AuditCategory.WORKFLOW },
  'PUT /api/workflows': { action: AuditAction.WORKFLOW_UPDATE, category: AuditCategory.WORKFLOW },
  'PATCH /api/workflows': { action: AuditAction.WORKFLOW_UPDATE, category: AuditCategory.WORKFLOW },
  'DELETE /api/workflows': { action: AuditAction.WORKFLOW_DELETE, category: AuditCategory.WORKFLOW, severity: AuditSeverity.WARNING },

  // Credential operations (sensitive)
  'POST /api/credentials': { action: AuditAction.CREDENTIAL_CREATE, category: AuditCategory.CREDENTIAL, severity: AuditSeverity.WARNING },
  'PUT /api/credentials': { action: AuditAction.CREDENTIAL_UPDATE, category: AuditCategory.CREDENTIAL, severity: AuditSeverity.WARNING },
  'PATCH /api/credentials': { action: AuditAction.CREDENTIAL_UPDATE, category: AuditCategory.CREDENTIAL, severity: AuditSeverity.WARNING },
  'DELETE /api/credentials': { action: AuditAction.CREDENTIAL_DELETE, category: AuditCategory.CREDENTIAL, severity: AuditSeverity.CRITICAL },

  // User operations (sensitive)
  'POST /api/users': { action: AuditAction.USER_CREATE, category: AuditCategory.USER, severity: AuditSeverity.WARNING },
  'PUT /api/users': { action: AuditAction.USER_UPDATE, category: AuditCategory.USER },
  'PATCH /api/users': { action: AuditAction.USER_UPDATE, category: AuditCategory.USER },
  'DELETE /api/users': { action: AuditAction.USER_DELETE, category: AuditCategory.USER, severity: AuditSeverity.CRITICAL },
  'PUT /api/users/*/role': { action: AuditAction.USER_ROLE_CHANGE, category: AuditCategory.USER, severity: AuditSeverity.CRITICAL },
  'PATCH /api/users/*/role': { action: AuditAction.USER_ROLE_CHANGE, category: AuditCategory.USER, severity: AuditSeverity.CRITICAL },

  // API Key operations (security-sensitive)
  'POST /api/api-keys': { action: AuditAction.SECURITY_API_KEY_CREATE, category: AuditCategory.SECURITY, severity: AuditSeverity.WARNING },
  'DELETE /api/api-keys': { action: AuditAction.SECURITY_API_KEY_REVOKE, category: AuditCategory.SECURITY, severity: AuditSeverity.CRITICAL },

  // Authentication operations
  'POST /api/auth/login': { action: AuditAction.USER_LOGIN, category: AuditCategory.USER },
  'POST /api/auth/logout': { action: AuditAction.USER_LOGOUT, category: AuditCategory.USER },
  'POST /api/auth/register': { action: AuditAction.USER_CREATE, category: AuditCategory.USER },
  'POST /api/auth/password': { action: AuditAction.USER_PASSWORD_CHANGE, category: AuditCategory.USER, severity: AuditSeverity.WARNING },
  'PUT /api/auth/password': { action: AuditAction.USER_PASSWORD_CHANGE, category: AuditCategory.USER, severity: AuditSeverity.WARNING },

  // Environment operations
  'POST /api/environments': { action: AuditAction.ENVIRONMENT_CREATE, category: AuditCategory.ENVIRONMENT },
  'PUT /api/environments': { action: AuditAction.ENVIRONMENT_UPDATE, category: AuditCategory.ENVIRONMENT },
  'DELETE /api/environments': { action: AuditAction.ENVIRONMENT_DELETE, category: AuditCategory.ENVIRONMENT, severity: AuditSeverity.WARNING },

  // Queue operations (admin)
  'POST /api/queue/pause': { action: AuditAction.QUEUE_PAUSE, category: AuditCategory.QUEUE, severity: AuditSeverity.WARNING },
  'POST /api/queue/resume': { action: AuditAction.QUEUE_RESUME, category: AuditCategory.QUEUE },
  'POST /api/queue/clean': { action: AuditAction.QUEUE_CLEAN, category: AuditCategory.QUEUE, severity: AuditSeverity.WARNING },
  'DELETE /api/dlq': { action: AuditAction.QUEUE_CLEAN, category: AuditCategory.QUEUE, severity: AuditSeverity.WARNING },

  // Execution operations
  'POST /api/executions': { action: AuditAction.EXECUTION_START, category: AuditCategory.EXECUTION },
  'DELETE /api/executions': { action: AuditAction.EXECUTION_CANCEL, category: AuditCategory.EXECUTION },

  // SSO operations
  'POST /api/sso': { action: AuditAction.SECURITY_SSO_LOGIN, category: AuditCategory.SECURITY },

  // Settings operations
  'PUT /api/settings': { action: AuditAction.SETTINGS_UPDATE, category: AuditCategory.SETTINGS },
  'PATCH /api/settings': { action: AuditAction.SETTINGS_UPDATE, category: AuditCategory.SETTINGS },
};

/**
 * Match a request method and path against audit patterns
 * Supports wildcard patterns like /api/users/USERID/role
 */
function matchPath(method: string, path: string): { action: AuditAction; category: AuditCategory; severity?: AuditSeverity } | null {
  // Normalize path - remove trailing slashes and query strings
  const normalizedPath = path.split('?')[0].replace(/\/+$/, '');
  const key = `${method} ${normalizedPath}`;

  // Direct match
  if (AUDIT_PATHS[key]) {
    return AUDIT_PATHS[key];
  }

  // Check patterns with wildcards
  for (const [pattern, config] of Object.entries(AUDIT_PATHS)) {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
      .replace(/\*/g, '[^/]+'); // Replace * with non-slash pattern

    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(key)) {
      return config;
    }
  }

  // Check for partial matches (e.g., POST /api/workflows/123 matches POST /api/workflows)
  for (const [pattern, config] of Object.entries(AUDIT_PATHS)) {
    const [patternMethod, patternPath] = pattern.split(' ');
    if (method === patternMethod && normalizedPath.startsWith(patternPath)) {
      return config;
    }
  }

  return null;
}

/**
 * Extract resource ID from path
 */
function extractResourceId(path: string): string | undefined {
  // Match patterns like /api/workflows/123 or /api/users/abc-def
  const match = path.match(/\/api\/\w+\/([^/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract resource type from path
 */
function extractResourceType(path: string): string {
  // Match the resource name after /api/
  const match = path.match(/\/api\/(\w+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Get client IP address, handling proxies
 */
function getClientIp(req: Request): string {
  // Check common proxy headers
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ips.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Audit logger middleware
 * Automatically logs sensitive operations based on HTTP method and path
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const auditConfig = matchPath(req.method, req.path);

  // Skip non-auditable operations
  if (!auditConfig) {
    return next();
  }

  const startTime = Date.now();
  const resourceType = extractResourceType(req.path);
  const resourceId = extractResourceId(req.path) || req.params?.id;

  // Build audit entry
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    userId: (req as any).user?.id || (req as any).user?.userId || 'anonymous',
    action: auditConfig.action,
    resource: resourceType,
    resourceId,
    method: req.method,
    path: req.path,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    requestId: (req as any).context?.requestId || req.headers['x-request-id'] as string,
  };

  // Capture changes from request body (sanitize sensitive data)
  if (req.body && typeof req.body === 'object') {
    entry.changes = sanitizeRequestBody(req.body);
  }

  // Listen for response finish to capture status and duration
  res.on('finish', () => {
    entry.statusCode = res.statusCode;
    entry.duration = Date.now() - startTime;

    const success = res.statusCode >= 200 && res.statusCode < 400;
    const severity = !success ? AuditSeverity.ERROR : (auditConfig.severity || AuditSeverity.INFO);

    // Log to console for immediate visibility
    logger.info('AUDIT', {
      action: entry.action,
      userId: entry.userId,
      resource: `${entry.resource}${entry.resourceId ? `:${entry.resourceId}` : ''}`,
      method: entry.method,
      path: entry.path,
      status: entry.statusCode,
      duration: `${entry.duration}ms`,
      ip: entry.ipAddress,
      success,
    });

    // Store in AuditService for persistence and querying
    const auditService = getAuditService();
    auditService.log({
      action: auditConfig.action,
      category: auditConfig.category,
      severity,
      userId: entry.userId,
      username: (req as any).user?.username || (req as any).user?.name,
      userEmail: (req as any).user?.email,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      resourceType: entry.resource,
      resourceId: entry.resourceId || 'N/A',
      details: {
        method: entry.method,
        path: entry.path,
        requestId: entry.requestId,
        changes: entry.changes,
      },
      success,
      errorMessage: !success ? `HTTP ${entry.statusCode}` : undefined,
      duration: entry.duration,
      metadata: {
        statusCode: entry.statusCode,
      },
    }).catch((err) => {
      // Never let audit logging failures affect the response
      logger.error('Failed to persist audit log', { error: err.message, entry: entry.action });
    });
  });

  next();
}

/**
 * Patterns for detecting sensitive field names
 * Uses regex for flexible matching of various naming conventions
 */
const SENSITIVE_FIELD_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /bearer/i,
  /jwt/i,
  /session/i,
  /cookie/i,
  /private/i,
  /credential/i,
  /ssn/i,
  /credit/i,
  /cvv/i,
  /pin/i,
  /key[_-]?id/i,
  /access[_-]?key/i,
  /secret[_-]?key/i,
  /encryption/i,
  /signature/i,
  /cert/i,
  /x[_-]?api/i,
  /oauth/i,
  /refresh/i,
];

/**
 * Patterns for detecting sensitive values (e.g., tokens in Authorization header values)
 */
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /^Bearer\s+.+$/i,       // Bearer tokens
  /^Basic\s+.+$/i,        // Basic auth
  /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,  // JWT tokens
  /^[A-Za-z0-9]{32,}$/,   // Long alphanumeric strings (potential API keys)
  /^sk[_-]?[A-Za-z0-9]+$/,  // Stripe-style secret keys
  /^pk[_-]?[A-Za-z0-9]+$/,  // Public keys that may still be sensitive in logs
  /^ghp_[A-Za-z0-9]+$/,     // GitHub personal access tokens
  /^xox[pbar]-[A-Za-z0-9-]+$/, // Slack tokens
];

/**
 * Check if a field name matches any sensitive pattern
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Check if a value looks like a sensitive token or secret
 */
function isSensitiveValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Sanitize request body to remove sensitive data before logging
 * Recursively processes nested objects and arrays
 */
function sanitizeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    // Check if the field name indicates sensitive data
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]';
    }
    // Check if the value itself looks like a sensitive token
    else if (isSensitiveValue(value)) {
      sanitized[key] = '[REDACTED]';
    }
    // Recursively sanitize nested objects
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeRequestBody(value as Record<string, unknown>);
    }
    // Recursively sanitize arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeRequestBody(item as Record<string, unknown>);
        }
        if (isSensitiveValue(item)) {
          return '[REDACTED]';
        }
        return item;
      });
    }
    // Keep non-sensitive values as-is
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Export sanitize function for use by other modules (e.g., SimpleLogger)
 */
export { sanitizeRequestBody, isSensitiveField, isSensitiveValue, SENSITIVE_FIELD_PATTERNS, SENSITIVE_VALUE_PATTERNS };

/**
 * Create a custom audit logger with additional options
 */
export function createAuditLogger(options?: {
  additionalPaths?: Record<string, { action: AuditAction; category: AuditCategory; severity?: AuditSeverity }>;
  excludePaths?: string[];
  logLevel?: 'verbose' | 'normal' | 'minimal';
}) {
  const additionalPaths = options?.additionalPaths || {};
  const excludePaths = options?.excludePaths || [];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if path is excluded
    if (excludePaths.some(p => req.path.startsWith(p))) {
      return next();
    }

    // Check additional paths first, then fall back to default
    const key = `${req.method} ${req.path.split('?')[0].replace(/\/+$/, '')}`;
    let auditConfig = additionalPaths[key] || matchPath(req.method, req.path);

    if (!auditConfig) {
      return next();
    }

    // Use the default auditLogger implementation
    auditLogger(req, res, next);
  };
}

export default auditLogger;

/**
 * Authentication Error Patterns
 * Contains authentication and authorization error patterns
 */

import { ErrorCategory, ErrorSeverity } from '../../../utils/ErrorHandler';
import type { ErrorKnowledge } from '../types';

export const AUTH_ERRORS: ErrorKnowledge[] = [
  {
    id: 'auth-001',
    code: 'AUTH_401',
    name: 'Authentication Failed',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    description: 'Invalid or missing authentication credentials',
    symptoms: ['401 Unauthorized response', 'Invalid token error', 'Authentication required message'],
    rootCauses: ['Token expired', 'Invalid credentials', 'Missing authentication header', 'Token revoked or invalidated', 'Clock skew issues with JWT'],
    solutions: [
      {
        id: 'sol-auth-001-1',
        title: 'Implement Token Refresh',
        description: 'Automatically refresh expired tokens',
        steps: ['Check if token is expired before request', 'Call refresh token endpoint', 'Update stored token', 'Retry original request', 'Handle refresh token expiration'],
        estimatedTime: '30 minutes',
        difficulty: 'medium',
        successRate: 0.95,
        testable: true
      },
      {
        id: 'sol-auth-001-2',
        title: 'Add Authentication Interceptor',
        description: 'Automatically handle 401 responses',
        steps: ['Create axios/fetch interceptor', 'Detect 401 response', 'Attempt token refresh', 'Retry original request', 'Redirect to login if refresh fails'],
        estimatedTime: '20 minutes',
        difficulty: 'medium',
        successRate: 0.92,
        testable: true
      }
    ],
    prevention: [
      { title: 'Proactive Token Refresh', description: 'Refresh tokens before they expire', implementation: ['Monitor token expiration time', 'Refresh token 5-10 minutes before expiration'], impact: 'high', effort: 'medium' },
      { title: 'Secure Token Storage', description: 'Store tokens securely to prevent theft', implementation: ['Use HttpOnly cookies for sensitive tokens', 'Implement CSRF protection'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://tools.ietf.org/html/rfc6750'],
    tags: ['authentication', 'jwt', 'token'],
    frequency: 0,
    resolutionRate: 0.93
  },
  {
    id: 'auth-002',
    code: 'AUTH_403',
    name: 'Permission Denied',
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    description: 'User lacks required permissions for the action',
    symptoms: ['403 Forbidden response', 'Access denied message', 'Permission error in logs'],
    rootCauses: ['Insufficient user permissions', 'Role not assigned', 'Resource-level permissions missing', 'RBAC misconfiguration', 'Organization/team access restrictions'],
    solutions: [
      {
        id: 'sol-auth-002-1',
        title: 'Check User Permissions',
        description: 'Verify user has required permissions',
        steps: ['Identify required permission for action', 'Check user roles and permissions', 'Request admin to grant permission if needed', 'Update user role in system', 'Test access after permission grant'],
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        successRate: 0.90,
        testable: true
      },
      {
        id: 'sol-auth-002-2',
        title: 'Implement Permission Check Before Request',
        description: 'Check permissions on client side before making request',
        steps: ['Fetch user permissions on login', 'Store permissions in state', 'Check permissions before showing UI elements', 'Disable actions user cannot perform', 'Show helpful error messages'],
        estimatedTime: '30 minutes',
        difficulty: 'medium',
        successRate: 0.85,
        testable: true
      }
    ],
    prevention: [
      { title: 'Implement RBAC Properly', description: 'Use role-based access control consistently', implementation: ['Define clear roles and permissions', 'Document permission requirements for each action'], impact: 'high', effort: 'high' },
      { title: 'UI Permission Indicators', description: 'Show/hide UI elements based on permissions', implementation: ['Fetch permissions on app load', 'Conditionally render UI components'], impact: 'medium', effort: 'medium' }
    ],
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403'],
    tags: ['authorization', 'permissions', 'rbac'],
    frequency: 0,
    resolutionRate: 0.78
  }
];

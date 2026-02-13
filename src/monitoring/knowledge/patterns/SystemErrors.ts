/**
 * System Error Patterns
 * Contains database, filesystem, and system error patterns
 */

import { ErrorCategory, ErrorSeverity } from '../../../utils/ErrorHandler';
import type { ErrorKnowledge } from '../types';

export const DATABASE_ERRORS: ErrorKnowledge[] = [
  {
    id: 'db-001',
    code: 'DB_CONNECTION',
    name: 'Database Connection Failed',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    description: 'Cannot establish connection to database',
    symptoms: ['Database connection error', 'Timeout connecting to database', 'Connection refused'],
    rootCauses: ['Database server down', 'Wrong connection string', 'Network issues', 'Firewall blocking connection', 'Connection pool exhausted'],
    solutions: [
      {
        id: 'sol-db-001-1',
        title: 'Check Database Status',
        description: 'Verify database server is running',
        steps: ['Check database server status', 'Verify connection string', 'Test network connectivity', 'Check firewall rules', 'Review database logs'],
        estimatedTime: '15 minutes',
        difficulty: 'medium',
        successRate: 0.85,
        testable: true
      },
      {
        id: 'sol-db-001-2',
        title: 'Implement Connection Retry',
        description: 'Automatically retry database connections',
        steps: ['Implement exponential backoff retry', 'Set maximum retry attempts', 'Log connection attempts', 'Alert on persistent failures', 'Implement circuit breaker'],
        estimatedTime: '30 minutes',
        difficulty: 'medium',
        successRate: 0.90,
        testable: true
      }
    ],
    prevention: [
      { title: 'Connection Pool Management', description: 'Properly configure and monitor connection pool', implementation: ['Set appropriate pool size', 'Configure connection timeouts'], impact: 'high', effort: 'medium' },
      { title: 'Database Redundancy', description: 'Use replicas and failover', implementation: ['Set up read replicas', 'Configure automatic failover'], impact: 'high', effort: 'high' }
    ],
    relatedDocs: ['https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-pool'],
    tags: ['database', 'connection', 'critical'],
    frequency: 0,
    resolutionRate: 0.87
  }
];

export const FILESYSTEM_ERRORS: ErrorKnowledge[] = [
  {
    id: 'fs-001',
    code: 'ENOENT',
    name: 'File Not Found',
    category: ErrorCategory.FILE_SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    description: 'File or directory does not exist',
    symptoms: ['ENOENT error', 'No such file or directory', 'File not found'],
    rootCauses: ['Wrong file path', 'File deleted or moved', 'Relative vs absolute path issue', 'Case sensitivity issue', 'Permission denied'],
    solutions: [
      {
        id: 'sol-fs-001-1',
        title: 'Check File Existence Before Access',
        description: 'Verify file exists before attempting to read/write',
        steps: ['Use fs.existsSync() or fs.access()', 'Handle file not found gracefully', 'Provide meaningful error message', 'Create file if missing (if appropriate)', 'Use absolute paths'],
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        successRate: 0.95,
        testable: true
      }
    ],
    prevention: [
      { title: 'Use Absolute Paths', description: 'Always use absolute paths for file operations', implementation: ['Use path.resolve() for all file paths', 'Store base directory in config'], impact: 'medium', effort: 'low' }
    ],
    relatedDocs: ['https://nodejs.org/api/fs.html'],
    tags: ['filesystem', 'file', 'path'],
    frequency: 0,
    resolutionRate: 0.93
  },
  {
    id: 'fs-002',
    code: 'EACCES',
    name: 'Permission Denied',
    category: ErrorCategory.FILE_SYSTEM,
    severity: ErrorSeverity.HIGH,
    description: 'Insufficient permissions to access file or directory',
    symptoms: ['EACCES error', 'Permission denied', 'Access forbidden'],
    rootCauses: ['Incorrect file permissions', 'Process running with wrong user', 'SELinux blocking access', 'Parent directory not accessible', 'Read-only filesystem'],
    solutions: [
      {
        id: 'sol-fs-002-1',
        title: 'Fix File Permissions',
        description: 'Set correct permissions on file or directory',
        steps: ['Check current permissions: ls -la', 'Set read permissions: chmod +r file', 'Set write permissions: chmod +w file', 'Change ownership if needed: chown user:group file', 'Apply recursively if directory: chmod -R'],
        estimatedTime: '5 minutes',
        difficulty: 'easy',
        successRate: 0.90,
        testable: true
      }
    ],
    prevention: [
      { title: 'Principle of Least Privilege', description: 'Grant minimum required permissions', implementation: ['Create dedicated service accounts', 'Set specific file permissions'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://www.linux.org/docs/man1/chmod.html'],
    tags: ['filesystem', 'permissions', 'security'],
    frequency: 0,
    resolutionRate: 0.88
  }
];

export const SYSTEM_ERRORS: ErrorKnowledge[] = [
  {
    id: 'sys-001',
    code: 'UNHANDLED_REJECTION',
    name: 'Unhandled Promise Rejection',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    description: 'Promise rejection not handled with catch block',
    symptoms: ['UnhandledPromiseRejectionWarning', 'Process exits unexpectedly', 'Uncaught error in async code'],
    rootCauses: ['Missing catch block', 'Async function without try-catch', 'Event handler throwing error', 'Third-party library error', 'Race condition'],
    solutions: [
      {
        id: 'sol-sys-001-1',
        title: 'Add Global Error Handler',
        description: 'Catch all unhandled promise rejections',
        steps: ['Add global rejection handler', 'Log error details', 'Send to error tracking service', 'Prevent process crash', 'Find and fix root cause'],
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        successRate: 0.90,
        testable: true
      },
      {
        id: 'sol-sys-001-2',
        title: 'Add Try-Catch to Async Functions',
        description: 'Wrap async code in try-catch blocks',
        steps: ['Find async functions without error handling', 'Add try-catch blocks', 'Handle errors appropriately', 'Use async error handling middleware', 'Test error scenarios'],
        estimatedTime: '30 minutes per file',
        difficulty: 'medium',
        successRate: 0.95,
        testable: true
      }
    ],
    prevention: [
      { title: 'Lint Rules for Async/Await', description: 'Enforce error handling with linter', implementation: ['Enable ESLint rules for async/await', 'Require return await in try-catch'], impact: 'high', effort: 'low' },
      { title: 'Async Error Handling Patterns', description: 'Use consistent error handling patterns', implementation: ['Create async utility functions', 'Use error handling middleware'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://nodejs.org/api/process.html#process_event_unhandledrejection'],
    tags: ['async', 'promise', 'error-handling'],
    frequency: 0,
    resolutionRate: 0.92
  }
];

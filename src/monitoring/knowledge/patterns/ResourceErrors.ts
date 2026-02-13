/**
 * Resource Error Patterns
 * Contains memory and resource-related error patterns
 */

import { ErrorCategory, ErrorSeverity } from '../../../utils/ErrorHandler';
import type { ErrorKnowledge } from '../types';

export const RESOURCE_ERRORS: ErrorKnowledge[] = [
  {
    id: 'res-001',
    code: 'MEMORY_LIMIT',
    name: 'Out of Memory',
    category: ErrorCategory.MEMORY,
    severity: ErrorSeverity.CRITICAL,
    description: 'Process exceeded memory limits',
    symptoms: ['Process crashed', 'Heap out of memory error', 'Memory allocation failed'],
    rootCauses: ['Memory leak', 'Large data processing', 'Insufficient heap size', 'Circular references', 'Large payload in memory'],
    solutions: [
      {
        id: 'sol-res-001-1',
        title: 'Increase Memory Limit',
        description: 'Allocate more memory to Node.js process',
        steps: ['Check current memory limit', 'Analyze actual memory usage', 'Increase Node.js heap size', 'Test with increased memory', 'Monitor memory usage'],
        estimatedTime: '5 minutes',
        difficulty: 'easy',
        successRate: 0.80,
        testable: true
      },
      {
        id: 'sol-res-001-2',
        title: 'Implement Streaming for Large Data',
        description: 'Process data in chunks instead of loading all at once',
        steps: ['Identify large data operations', 'Use streams instead of loading to memory', 'Implement pagination for large datasets', 'Process data in batches', 'Use worker threads for heavy processing'],
        estimatedTime: '1 hour',
        difficulty: 'hard',
        successRate: 0.95,
        testable: true
      },
      {
        id: 'sol-res-001-3',
        title: 'Find and Fix Memory Leaks',
        description: 'Identify and eliminate memory leaks',
        steps: ['Take heap snapshots', 'Compare snapshots over time', 'Identify growing objects', 'Fix circular references', 'Clear event listeners', 'Implement proper cleanup'],
        estimatedTime: '2-4 hours',
        difficulty: 'hard',
        successRate: 0.75,
        prerequisites: ['Memory profiling tools', 'Heap snapshots'],
        testable: true
      }
    ],
    prevention: [
      { title: 'Regular Memory Profiling', description: 'Monitor memory usage in production', implementation: ['Use memory monitoring tools', 'Set up alerts for high memory usage'], impact: 'high', effort: 'high' },
      { title: 'Implement Resource Limits', description: 'Set limits on data processing', implementation: ['Limit payload sizes', 'Implement pagination everywhere'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://nodejs.org/api/cli.html#cli_max_old_space_size_size_in_megabytes'],
    tags: ['memory', 'performance', 'critical'],
    frequency: 0,
    resolutionRate: 0.82
  },
  {
    id: 'res-002',
    code: 'RESOURCE_404',
    name: 'Resource Not Found',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    description: 'Requested resource does not exist',
    symptoms: ['404 Not Found response', 'Resource not found message', 'Invalid ID error'],
    rootCauses: ['Invalid resource ID', 'Resource deleted', 'Wrong endpoint URL', 'Typo in URL', 'Resource moved or renamed'],
    solutions: [
      {
        id: 'sol-res-002-1',
        title: 'Verify Resource ID',
        description: 'Check if resource ID is correct',
        steps: ['Verify resource ID format', 'Check if resource exists in database', 'Confirm user has access to resource', 'Check for typos in ID', 'Use correct ID from source'],
        estimatedTime: '5 minutes',
        difficulty: 'easy',
        successRate: 0.90,
        testable: true
      },
      {
        id: 'sol-res-002-2',
        title: 'Implement Proper Error Handling',
        description: 'Handle 404 errors gracefully in UI',
        steps: ['Catch 404 errors', 'Show user-friendly message', 'Offer alternatives or search', 'Redirect to valid page', 'Log for monitoring'],
        estimatedTime: '20 minutes',
        difficulty: 'easy',
        successRate: 0.95,
        testable: true
      }
    ],
    prevention: [
      { title: 'Validate IDs Before API Calls', description: 'Check if resource exists before making request', implementation: ['Validate ID format client-side', 'Cache recently accessed resources'], impact: 'medium', effort: 'low' }
    ],
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404'],
    tags: ['404', 'not-found', 'resource'],
    frequency: 0,
    resolutionRate: 0.92
  }
];

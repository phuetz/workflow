/**
 * Network Error Patterns
 * Contains timeout, connection refused, and rate limit error patterns
 */

import { ErrorCategory, ErrorSeverity } from '../../../utils/ErrorHandler';
import type { ErrorKnowledge } from '../types';

export const NETWORK_ERRORS: ErrorKnowledge[] = [
  {
    id: 'net-001',
    code: 'ETIMEDOUT',
    name: 'Connection Timeout',
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    description: 'Request exceeded the specified timeout limit without receiving a response',
    symptoms: ['Request hangs for extended period', 'No response from server', 'Timeout error in logs'],
    rootCauses: ['Slow server response time', 'Network latency or congestion', 'Insufficient timeout configuration', 'Server under heavy load', 'Large payload taking too long to process'],
    solutions: [
      {
        id: 'sol-net-001-1',
        title: 'Increase Timeout Duration',
        description: 'Extend the timeout limit to accommodate slower responses',
        steps: ['Identify current timeout setting', 'Analyze average response time from server', 'Set timeout to 2-3x average response time', 'Test with increased timeout', 'Monitor for improvement'],
        codeExample: `// Increase axios timeout\naxios.get(url, { timeout: 30000 });`,
        estimatedTime: '5 minutes',
        difficulty: 'easy',
        successRate: 0.85,
        testable: true
      },
      {
        id: 'sol-net-001-2',
        title: 'Implement Retry with Backoff',
        description: 'Automatically retry failed requests with exponential backoff',
        steps: ['Implement retry logic with exponential backoff', 'Set maximum retry attempts (3-5)', 'Add jitter to prevent thundering herd', 'Log retry attempts for monitoring'],
        estimatedTime: '15 minutes',
        difficulty: 'medium',
        successRate: 0.90,
        testable: true
      }
    ],
    prevention: [
      { title: 'Set Appropriate Timeouts', description: 'Configure timeouts based on expected response times', implementation: ['Monitor average API response times', 'Set timeouts to 95th percentile + buffer'], impact: 'high', effort: 'low' },
      { title: 'Implement Circuit Breaker', description: 'Prevent cascading failures from slow services', implementation: ['Use circuit breaker pattern', 'Configure failure thresholds'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/API/AbortController'],
    tags: ['network', 'timeout', 'performance'],
    frequency: 0,
    resolutionRate: 0.87
  },
  {
    id: 'net-002',
    code: 'ECONNREFUSED',
    name: 'Connection Refused',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    description: 'Target server actively refused the connection',
    symptoms: ['Immediate connection failure', 'ECONNREFUSED error in logs', 'Cannot reach service'],
    rootCauses: ['Service is not running', 'Wrong port configuration', 'Firewall blocking connection', 'Service crashed or restarting', 'Network misconfiguration'],
    solutions: [
      {
        id: 'sol-net-002-1',
        title: 'Verify Service is Running',
        description: 'Check if the target service is active and listening',
        steps: ['Check service status', 'Verify process is running', 'Check listening ports', 'Restart service if needed', 'Check service logs for startup errors'],
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        successRate: 0.95,
        testable: true
      },
      {
        id: 'sol-net-002-2',
        title: 'Check Network Configuration',
        description: 'Verify network settings and connectivity',
        steps: ['Verify correct hostname/IP address', 'Confirm correct port number', 'Test connection', 'Check DNS resolution', 'Verify no firewall rules blocking connection'],
        estimatedTime: '15 minutes',
        difficulty: 'medium',
        successRate: 0.80,
        testable: true
      }
    ],
    prevention: [
      { title: 'Health Check Monitoring', description: 'Implement continuous health monitoring', implementation: ['Add health check endpoints to all services', 'Configure monitoring system'], impact: 'high', effort: 'medium' },
      { title: 'Load Balancer with Failover', description: 'Use load balancer for automatic failover', implementation: ['Deploy multiple service instances', 'Configure load balancer'], impact: 'high', effort: 'high' }
    ],
    relatedDocs: ['https://nodejs.org/api/errors.html#errors_common_system_errors'],
    tags: ['network', 'connection', 'service-down'],
    frequency: 0,
    resolutionRate: 0.88
  },
  {
    id: 'net-003',
    code: 'RATE_LIMIT_429',
    name: 'Rate Limit Exceeded',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    description: 'Too many requests sent to API within time window',
    symptoms: ['429 Too Many Requests response', 'Rate limit headers in response', 'Requests being rejected'],
    rootCauses: ['Exceeded API quota', 'Too many concurrent requests', 'Missing rate limiting in client', 'Burst traffic pattern', 'Insufficient API plan/tier'],
    solutions: [
      {
        id: 'sol-net-003-1',
        title: 'Implement Request Throttling',
        description: 'Limit request rate on client side',
        steps: ['Check API rate limit documentation', 'Implement token bucket algorithm', 'Add queue for requests', 'Spread requests evenly over time', 'Monitor request rate'],
        estimatedTime: '20 minutes',
        difficulty: 'medium',
        successRate: 0.95,
        testable: true
      },
      {
        id: 'sol-net-003-2',
        title: 'Use Response Headers for Backoff',
        description: 'Respect Retry-After header from server',
        steps: ['Parse Retry-After header from 429 response', 'Implement dynamic backoff based on header', 'Queue pending requests', 'Resume after backoff period', 'Log rate limit events'],
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        successRate: 0.90,
        testable: true
      }
    ],
    prevention: [
      { title: 'Proactive Rate Limiting', description: 'Implement client-side rate limiting before hitting API limits', implementation: ['Monitor rate limit headers from API', 'Track request count per time window'], impact: 'high', effort: 'medium' }
    ],
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429'],
    tags: ['rate-limit', 'api', 'throttling'],
    frequency: 0,
    resolutionRate: 0.92
  }
];

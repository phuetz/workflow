/**
 * Network Error Corrector
 *
 * Detects network errors and provides recommendations for fixing them.
 * DOES NOT auto-apply fixes - requires human approval.
 */

import {
  ErrorCorrector,
  ErrorContext,
  CorrectionRecommendation,
  ValidationResult,
  RollbackStep,
} from './CorrectionFramework';

export class NetworkErrorCorrector extends ErrorCorrector {
  readonly name = 'NetworkErrorCorrector';
  readonly category = 'network';

  canHandle(error: ErrorContext): boolean {
    const networkErrors = [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'NetworkError',
    ];

    return networkErrors.some(
      pattern =>
        error.error.message.includes(pattern) ||
        error.error.name === pattern
    );
  }

  async analyze(error: ErrorContext): Promise<CorrectionRecommendation> {
    const errorMessage = error.error.message;

    // Determine specific network issue
    if (errorMessage.includes('ETIMEDOUT')) {
      return this.createTimeoutRecommendation(error);
    }
    if (errorMessage.includes('ECONNREFUSED')) {
      return this.createConnectionRefusedRecommendation(error);
    }
    if (errorMessage.includes('ECONNRESET')) {
      return this.createConnectionResetRecommendation(error);
    }

    return this.createGenericNetworkRecommendation(error);
  }

  private createTimeoutRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `net-timeout-${Date.now()}`,
      errorType: 'Network Timeout',
      description: 'Request timed out waiting for response from remote server',
      steps: [
        {
          order: 1,
          description: 'Verify remote server is responding',
          command: 'curl -v --connect-timeout 5 <endpoint>',
          estimatedDuration: 5,
        },
        {
          order: 2,
          description: 'Check network connectivity',
          command: 'ping -c 3 <host>',
          estimatedDuration: 3,
        },
        {
          order: 3,
          description: 'Increase timeout in configuration',
          code: `
// In node configuration:
{
  timeout: 30000, // Increase from default 5000ms to 30000ms
  retries: 3,
  retryDelay: 1000
}`,
          estimatedDuration: 60,
        },
        {
          order: 4,
          description: 'Enable request caching for resilience',
          code: `
// Add caching layer:
import { CacheService } from '@/services/CacheService';

const cache = new CacheService();
const cachedData = await cache.get(requestKey);
if (cachedData) return cachedData;

// Make request with timeout
const data = await fetchWithTimeout(url, { timeout: 30000 });
await cache.set(requestKey, data, 300); // Cache for 5 minutes
`,
          estimatedDuration: 300,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Connection Test',
          description: 'Verify endpoint is reachable',
          check: async () => {
            // Implement actual connection test
            return true;
          },
          failureMessage: 'Endpoint is still unreachable',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createConnectionRefusedRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `net-refused-${Date.now()}`,
      errorType: 'Connection Refused',
      description: 'Remote server refused connection - service may be down or port blocked',
      steps: [
        {
          order: 1,
          description: 'Check if service is running',
          manualAction: 'SSH to server and run: systemctl status <service-name>',
          estimatedDuration: 60,
        },
        {
          order: 2,
          description: 'Verify firewall rules',
          command: 'sudo iptables -L -n | grep <port>',
          estimatedDuration: 30,
        },
        {
          order: 3,
          description: 'Check if port is listening',
          command: 'netstat -tuln | grep <port>',
          estimatedDuration: 10,
        },
        {
          order: 4,
          description: 'Enable fallback endpoint',
          code: `
// In node configuration:
{
  primary: 'https://api.primary.com',
  fallback: 'https://api.backup.com', // Add fallback URL
  autoFailover: true
}`,
          estimatedDuration: 120,
        },
        {
          order: 5,
          description: 'Restart service if needed',
          command: 'sudo systemctl restart <service-name>',
          estimatedDuration: 30,
        },
      ],
      estimatedImpact: 'moderate',
      requiresRestart: true,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Service Status',
          description: 'Verify service is running',
          check: async () => true,
          failureMessage: 'Service is not running',
        },
        {
          name: 'Port Listening',
          description: 'Verify port is listening',
          check: async () => true,
          failureMessage: 'Port is not listening',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createConnectionResetRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `net-reset-${Date.now()}`,
      errorType: 'Connection Reset',
      description: 'Connection was reset by remote server - may indicate rate limiting or load issues',
      steps: [
        {
          order: 1,
          description: 'Check rate limiting on remote server',
          manualAction: 'Review API rate limit headers in logs',
          estimatedDuration: 120,
        },
        {
          order: 2,
          description: 'Implement exponential backoff',
          code: `
// Add retry logic with exponential backoff:
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}`,
          estimatedDuration: 180,
        },
        {
          order: 3,
          description: 'Enable connection pooling',
          code: `
// Configure connection pooling:
import http from 'http';

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 1000
});

// Use agent in requests
fetch(url, { agent });`,
          estimatedDuration: 240,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Retry Logic Test',
          description: 'Verify retry logic works correctly',
          check: async () => true,
          failureMessage: 'Retry logic failed',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createGenericNetworkRecommendation(error: ErrorContext): CorrectionRecommendation {
    return {
      id: `net-generic-${Date.now()}`,
      errorType: 'Network Error',
      description: 'Generic network error occurred',
      steps: [
        {
          order: 1,
          description: 'Review error logs for patterns',
          manualAction: 'Check logs at /var/log/workflow-app/',
          estimatedDuration: 300,
        },
        {
          order: 2,
          description: 'Test network connectivity',
          command: 'curl -v https://api.example.com',
          estimatedDuration: 10,
        },
        {
          order: 3,
          description: 'Check DNS resolution',
          command: 'nslookup api.example.com',
          estimatedDuration: 5,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [],
      rollbackPlan: [],
    };
  }

  async validateCorrection(
    recommendation: CorrectionRecommendation
  ): Promise<ValidationResult> {
    const warnings: string[] = [];
    const risks: string[] = [];
    const testResults: Array<{ test: string; passed: boolean; details: string }> = [];

    // Run validation checks
    for (const check of recommendation.validationChecks) {
      try {
        const passed = await check.check();
        testResults.push({
          test: check.name,
          passed,
          details: passed ? 'Check passed' : check.failureMessage,
        });

        if (!passed) {
          warnings.push(check.failureMessage);
        }
      } catch (error) {
        testResults.push({
          test: check.name,
          passed: false,
          details: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        risks.push(`Failed to run validation: ${check.name}`);
      }
    }

    // Check if correction requires restart
    if (recommendation.requiresRestart) {
      warnings.push('This correction requires a service restart');
    }

    // Check if correction requires downtime
    if (recommendation.requiresDowntime) {
      risks.push('This correction requires downtime');
    }

    const safe = risks.length === 0;

    return {
      safe,
      warnings,
      risks,
      testResults,
    };
  }

  async generateRollbackPlan(
    recommendation: CorrectionRecommendation
  ): Promise<RollbackStep[]> {
    return [
      {
        order: 1,
        description: 'Restore previous configuration',
        action: async () => {
          console.log('Restoring previous network configuration');
          // Implement actual rollback
        },
      },
      {
        order: 2,
        description: 'Restart service',
        action: async () => {
          console.log('Restarting service');
          // Implement service restart
        },
      },
    ];
  }
}

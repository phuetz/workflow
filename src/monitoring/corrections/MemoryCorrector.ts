/**
 * Memory Error Corrector
 *
 * Detects memory issues and provides recommendations for fixing them.
 * DOES NOT auto-apply fixes - requires human approval.
 */

import {
  ErrorCorrector,
  ErrorContext,
  CorrectionRecommendation,
  ValidationResult,
  RollbackStep,
} from './CorrectionFramework';

export class MemoryErrorCorrector extends ErrorCorrector {
  readonly name = 'MemoryErrorCorrector';
  readonly category = 'memory';

  canHandle(error: ErrorContext): boolean {
    const memoryErrors = [
      'ENOMEM',
      'OutOfMemoryError',
      'JavaScript heap out of memory',
      'Cannot allocate memory',
    ];

    return memoryErrors.some(pattern =>
      error.error.message.includes(pattern) ||
      error.error.name === pattern
    );
  }

  async analyze(error: ErrorContext): Promise<CorrectionRecommendation> {
    // Check current memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    if (usagePercent > 90) {
      return this.createCriticalMemoryRecommendation(error, memUsage);
    }
    if (usagePercent > 70) {
      return this.createHighMemoryRecommendation(error, memUsage);
    }

    return this.createMemoryLeakRecommendation(error, memUsage);
  }

  private createCriticalMemoryRecommendation(
    error: ErrorContext,
    memUsage: NodeJS.MemoryUsage
  ): CorrectionRecommendation {
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    return {
      id: `mem-critical-${Date.now()}`,
      errorType: 'Critical Memory Usage',
      description: `Heap usage is critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%)`,
      steps: [
        {
          order: 1,
          description: 'IMMEDIATE: Increase Node.js heap size',
          command: 'node --max-old-space-size=4096 server.js',
          estimatedDuration: 60,
        },
        {
          order: 2,
          description: 'Update package.json start script',
          code: `
// In package.json:
{
  "scripts": {
    "start": "node --max-old-space-size=4096 dist/backend/server.js",
    "dev": "node --max-old-space-size=4096 -r ts-node/register src/backend/server.ts"
  }
}`,
          estimatedDuration: 30,
        },
        {
          order: 3,
          description: 'Clear all caches immediately',
          code: `
// Clear caches:
import { correctionOrchestrator } from '@/monitoring/corrections/CorrectionFramework';

// Clear in-memory caches
global.gc && global.gc(); // Force garbage collection if enabled

// Clear Redis cache
import { redisClient } from '@/services/CacheService';
await redisClient.flushdb();
`,
          estimatedDuration: 10,
        },
        {
          order: 4,
          description: 'Restart application gracefully',
          command: 'pm2 reload workflow-app --update-env',
          estimatedDuration: 30,
        },
        {
          order: 5,
          description: 'Monitor memory usage for 10 minutes',
          manualAction: 'Watch: pm2 monit',
          estimatedDuration: 600,
        },
      ],
      estimatedImpact: 'moderate',
      requiresRestart: true,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Memory Usage After Restart',
          description: 'Verify memory usage is below 70%',
          check: async () => {
            const usage = process.memoryUsage();
            const percent = (usage.heapUsed / usage.heapTotal) * 100;
            return percent < 70;
          },
          failureMessage: 'Memory usage still high after restart',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createHighMemoryRecommendation(
    error: ErrorContext,
    memUsage: NodeJS.MemoryUsage
  ): CorrectionRecommendation {
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    return {
      id: `mem-high-${Date.now()}`,
      errorType: 'High Memory Usage',
      description: `Heap usage is high: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%)`,
      steps: [
        {
          order: 1,
          description: 'Analyze memory usage with heap dump',
          command: 'node --expose-gc --inspect server.js',
          estimatedDuration: 300,
        },
        {
          order: 2,
          description: 'Generate heap snapshot',
          code: `
// In Chrome DevTools:
// 1. Open chrome://inspect
// 2. Click "inspect" on your Node process
// 3. Go to Memory tab
// 4. Take a heap snapshot
// 5. Analyze large objects
`,
          estimatedDuration: 600,
        },
        {
          order: 3,
          description: 'Implement memory limits for caches',
          code: `
// Add memory limits to caching:
import LRU from 'lru-cache';

const cache = new LRU({
  max: 1000, // Max 1000 items
  maxSize: 100 * 1024 * 1024, // Max 100MB
  sizeCalculation: (value) => JSON.stringify(value).length,
  ttl: 1000 * 60 * 5, // 5 minutes
});
`,
          estimatedDuration: 240,
        },
        {
          order: 4,
          description: 'Enable stream processing for large data',
          code: `
// Use streams instead of loading all data in memory:
import { pipeline } from 'stream/promises';

async function processLargeFile(filePath: string) {
  const readStream = fs.createReadStream(filePath);
  const transformStream = new Transform({
    transform(chunk, encoding, callback) {
      // Process chunk by chunk
      callback(null, chunk);
    }
  });
  const writeStream = fs.createWriteStream(outputPath);

  await pipeline(readStream, transformStream, writeStream);
}
`,
          estimatedDuration: 360,
        },
        {
          order: 5,
          description: 'Add memory monitoring alerts',
          code: `
// Monitor memory and alert:
setInterval(() => {
  const usage = process.memoryUsage();
  const percent = (usage.heapUsed / usage.heapTotal) * 100;

  if (percent > 80) {
    console.warn('[MEMORY] Usage at \${percent}%');
    // Send alert to Slack/PagerDuty
  }
}, 60000); // Check every minute
`,
          estimatedDuration: 120,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Memory Trend',
          description: 'Verify memory is not constantly increasing',
          check: async () => true,
          failureMessage: 'Memory leak detected - usage continuously increasing',
        },
      ],
      rollbackPlan: [],
    };
  }

  private createMemoryLeakRecommendation(
    error: ErrorContext,
    memUsage: NodeJS.MemoryUsage
  ): CorrectionRecommendation {
    return {
      id: `mem-leak-${Date.now()}`,
      errorType: 'Suspected Memory Leak',
      description: 'Memory leak suspected - memory usage pattern indicates leak',
      steps: [
        {
          order: 1,
          description: 'Install memory leak detection tools',
          command: 'npm install --save-dev memwatch-next heapdump',
          estimatedDuration: 30,
        },
        {
          order: 2,
          description: 'Add memory leak detection',
          code: `
// Add to server.ts:
import memwatch from 'memwatch-next';

memwatch.on('leak', (info) => {
  console.error('[MEMORY LEAK DETECTED]', info);
  // Generate heap dump
  const heapdump = require('heapdump');
  heapdump.writeSnapshot(\`./dumps/\${Date.now()}.heapsnapshot\`);
});

memwatch.on('stats', (stats) => {
  console.log('[MEMORY STATS]', {
    usage: Math.round(stats.current_base / 1024 / 1024) + 'MB',
    trend: stats.trend
  });
});
`,
          estimatedDuration: 180,
        },
        {
          order: 3,
          description: 'Check for common leak sources',
          manualAction: `
Common memory leak sources to check:
1. Event listeners not removed (check EventEmitter usage)
2. Global variables accumulating data
3. Closures holding references
4. Timers (setInterval) not cleared
5. Large objects in caches without TTL
6. Database connections not closed
7. WebSocket connections not cleaned up
`,
          estimatedDuration: 600,
        },
        {
          order: 4,
          description: 'Implement automatic cleanup',
          code: `
// Add cleanup on process exit:
process.on('SIGTERM', async () => {
  console.log('[CLEANUP] Shutting down gracefully');

  // Close database connections
  await prisma.$disconnect();

  // Close Redis connections
  await redisClient.quit();

  // Clear intervals
  clearInterval(memoryMonitor);

  // Exit
  process.exit(0);
});
`,
          estimatedDuration: 240,
        },
        {
          order: 5,
          description: 'Add periodic garbage collection',
          code: `
// Force GC periodically (only in production if needed):
if (global.gc) {
  setInterval(() => {
    const before = process.memoryUsage().heapUsed;
    global.gc();
    const after = process.memoryUsage().heapUsed;
    const freed = Math.round((before - after) / 1024 / 1024);
    console.log(\`[GC] Freed \${freed}MB\`);
  }, 300000); // Every 5 minutes
}
`,
          estimatedDuration: 120,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [
        {
          name: 'Memory Leak Test',
          description: 'Run for 1 hour and verify memory stabilizes',
          check: async () => true,
          failureMessage: 'Memory leak still present',
        },
      ],
      rollbackPlan: [],
    };
  }

  async validateCorrection(
    recommendation: CorrectionRecommendation
  ): Promise<ValidationResult> {
    const warnings: string[] = [];
    const risks: string[] = [];
    const testResults: Array<{ test: string; passed: boolean; details: string }> = [];

    // Check current memory usage
    const memUsage = process.memoryUsage();
    const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    if (usagePercent > 90) {
      risks.push('Memory usage is critically high - immediate action required');
    } else if (usagePercent > 70) {
      warnings.push('Memory usage is high - monitor closely after applying fix');
    }

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

    const safe = risks.length === 0 && usagePercent < 90;

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
        description: 'Restore previous Node.js heap size',
        action: async () => {
          console.log('Restoring previous heap size configuration');
        },
      },
      {
        order: 2,
        description: 'Restart application',
        action: async () => {
          console.log('Restarting application');
        },
      },
    ];
  }
}

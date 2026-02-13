#!/usr/bin/env tsx

/**
 * Error Monitoring and Recommendation Script
 *
 * This script monitors the application for errors and generates
 * correction recommendations. It DOES NOT apply fixes automatically.
 *
 * Usage:
 *   npm run monitor:errors
 *   node --loader ts-node/esm scripts/monitor-and-recommend.ts
 */

import { correctionOrchestrator } from '../src/monitoring/corrections/CorrectionFramework';
import { NetworkErrorCorrector } from '../src/monitoring/corrections/NetworkCorrector';
import { MemoryErrorCorrector } from '../src/monitoring/corrections/MemoryCorrector';
import { DatabaseErrorCorrector } from '../src/monitoring/corrections/DatabaseCorrector';

// Register all correctors
correctionOrchestrator.registerCorrector(new NetworkErrorCorrector());
correctionOrchestrator.registerCorrector(new MemoryErrorCorrector());
correctionOrchestrator.registerCorrector(new DatabaseErrorCorrector());

console.log('✅ Error Monitoring System Started');
console.log('📊 Registered correctors:');
console.log('  - NetworkErrorCorrector');
console.log('  - MemoryErrorCorrector');
console.log('  - DatabaseErrorCorrector');
console.log('');

/**
 * Monitor process for uncaught errors
 */
process.on('uncaughtException', async (error: Error) => {
  console.error('❌ Uncaught Exception:', error.message);

  try {
    const recommendation = await correctionOrchestrator.analyzeError(error, {
      source: 'uncaughtException',
    });

    if (recommendation) {
      console.log('💡 Correction recommendation generated:');
      console.log(`   ID: ${recommendation.id}`);
      console.log(`   Type: ${recommendation.errorType}`);
      console.log(`   Impact: ${recommendation.estimatedImpact}`);
      console.log(`   Steps: ${recommendation.steps.length}`);
      console.log('');
      console.log('🔍 View full recommendation in dashboard or logs');
    }
  } catch (err) {
    console.error('Failed to analyze error:', err);
  }
});

/**
 * Monitor process for unhandled rejections
 */
process.on('unhandledRejection', async (reason: any) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error('❌ Unhandled Rejection:', error.message);

  try {
    const recommendation = await correctionOrchestrator.analyzeError(error, {
      source: 'unhandledRejection',
    });

    if (recommendation) {
      console.log('💡 Correction recommendation generated');
    }
  } catch (err) {
    console.error('Failed to analyze error:', err);
  }
});

/**
 * Monitor memory usage
 */
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  if (usagePercent > 80) {
    console.warn(`⚠️  High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`);

    const error = new Error('High memory usage detected');
    error.name = 'MemoryWarning';

    correctionOrchestrator.analyzeError(error, {
      source: 'memoryMonitor',
      memoryUsage: memUsage,
    }).then(recommendation => {
      if (recommendation) {
        console.log('💡 Memory optimization recommendation generated');
      }
    });
  }
}, 60000); // Check every minute

/**
 * Periodic statistics report
 */
setInterval(() => {
  const stats = correctionOrchestrator.getStatistics();

  console.log('');
  console.log('📊 Error Monitoring Statistics:');
  console.log(`   Total Errors: ${stats.totalErrors}`);
  console.log(`   Recommendations: ${stats.recommendationsGenerated}`);
  console.log(`   Critical: ${stats.errorsBySeverity.critical || 0}`);
  console.log(`   High: ${stats.errorsBySeverity.high || 0}`);
  console.log(`   Medium: ${stats.errorsBySeverity.medium || 0}`);
  console.log(`   Low: ${stats.errorsBySeverity.low || 0}`);
  console.log('');

  // Show top error types
  const topErrors = Object.entries(stats.errorsByType)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  if (topErrors.length > 0) {
    console.log('🔝 Top Error Types:');
    topErrors.forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');
  }
}, 300000); // Every 5 minutes

/**
 * Simulate some test errors for demonstration
 */
if (process.argv.includes('--demo')) {
  console.log('🎬 Running in demo mode with simulated errors\n');

  setTimeout(async () => {
    console.log('Simulating network timeout...');
    const netError = new Error('ETIMEDOUT: Connection timeout');
    netError.name = 'NetworkError';
    await correctionOrchestrator.analyzeError(netError);
  }, 2000);

  setTimeout(async () => {
    console.log('Simulating database connection error...');
    const dbError = new Error('ECONNREFUSED: Database connection refused');
    dbError.name = 'DatabaseError';
    await correctionOrchestrator.analyzeError(dbError);
  }, 4000);

  setTimeout(async () => {
    console.log('Simulating memory issue...');
    const memError = new Error('JavaScript heap out of memory');
    memError.name = 'OutOfMemoryError';
    await correctionOrchestrator.analyzeError(memError, {
      memoryUsage: {
        heapUsed: 950 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        external: 0,
        rss: 1200 * 1024 * 1024,
        arrayBuffers: 0,
      },
    });
  }, 6000);

  setTimeout(() => {
    console.log('\n✅ Demo complete! Check recommendations in dashboard.');
    const recommendations = correctionOrchestrator.getRecommendations();
    console.log(`\n📋 Generated ${recommendations.length} recommendations:`);
    recommendations.forEach(rec => {
      console.log(`\n${rec.errorType} (${rec.estimatedImpact})`);
      console.log(`  ${rec.description}`);
      console.log(`  ${rec.steps.length} steps to fix`);
    });
  }, 8000);
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down error monitoring system...');

  const stats = correctionOrchestrator.getStatistics();
  console.log(`📊 Final Statistics:`);
  console.log(`   Total Errors Monitored: ${stats.totalErrors}`);
  console.log(`   Recommendations Generated: ${stats.recommendationsGenerated}`);

  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down error monitoring system...');
  process.exit(0);
});

console.log('👀 Monitoring for errors...');
console.log('   Press Ctrl+C to stop');
console.log('   Use --demo flag for demonstration mode');
console.log('');

// Keep process alive
process.stdin.resume();

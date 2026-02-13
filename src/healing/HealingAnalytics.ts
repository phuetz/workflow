/**
 * Healing Analytics
 * Tracks healing attempts, calculates success rates, and ROI
 */

import type {
  HealingAnalytics as IHealingAnalytics,
  HealingResult,
  WorkflowError,
  Diagnosis,
  ErrorTypeStats,
  StrategyPerformance,
  DailyHealingStats
} from '../types/healing';
import { ErrorType } from '../types/healing';
import { logger } from '../services/SimpleLogger';

interface HealingRecord {
  errorId: string;
  workflowId: string;
  errorType: ErrorType;
  strategyId: string;
  success: boolean;
  duration: number;
  timestamp: Date;
}

export class HealingAnalytics {
  private records: HealingRecord[] = [];
  private maxRecords: number = 10000;

  /**
   * Record a healing attempt
   */
  async recordHealingAttempt(
    error: WorkflowError,
    diagnosis: Diagnosis,
    result: HealingResult
  ): Promise<void> {
    const record: HealingRecord = {
      errorId: error.id,
      workflowId: error.workflowId,
      errorType: diagnosis.errorType,
      strategyId: result.strategyId,
      success: result.success,
      duration: result.duration,
      timestamp: result.timestamp
    };

    this.records.push(record);

    // Keep only last N records
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    logger.debug(`Recorded healing attempt: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(): Promise<IHealingAnalytics> {
    const totalAttempts = this.records.length;
    const successful = this.records.filter(r => r.success).length;
    const failed = totalAttempts - successful;
    const successRate = totalAttempts > 0 ? successful / totalAttempts : 0;

    // Calculate healing times
    const durations = this.records.filter(r => r.success).map(r => r.duration);
    const averageHealingTime = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianHealingTime = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]
      : 0;
    const p95HealingTime = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length * 0.95)]
      : 0;

    // By error type
    const healingByErrorType = this.getErrorTypeStats();

    // By strategy
    const strategyPerformance = this.getStrategyPerformance();

    // Daily stats
    const dailyStats = this.getDailyStats();

    // Impact metrics
    const mttrReduction = this.calculateMTTRReduction();
    const uptimeImprovement = this.calculateUptimeImprovement();
    const manualInterventionReduction = this.calculateManualInterventionReduction();

    // ROI
    const timesSaved = this.calculateTimeSaved();
    const errorsPrevented = successful;
    const costSavings = this.calculateCostSavings(timesSaved);

    return {
      totalHealingAttempts: totalAttempts,
      successfulHealings: successful,
      failedHealings: failed,
      successRate,
      averageHealingTime,
      medianHealingTime,
      p95HealingTime,
      healingByErrorType,
      strategyPerformance,
      dailyStats,
      mttrReduction,
      uptimeImprovement,
      manualInterventionReduction,
      timesSaved,
      errorsPrevented,
      costSavings
    };
  }

  /**
   * Get error type statistics
   */
  private getErrorTypeStats(): Record<ErrorType, ErrorTypeStats> {
    const stats: Record<string, ErrorTypeStats> = {};

    for (const record of this.records) {
      const errorType = record.errorType;
      
      if (!stats[errorType]) {
        stats[errorType] = {
          count: 0,
          healed: 0,
          failed: 0,
          successRate: 0,
          averageHealingTime: 0,
          mostEffectiveStrategy: ''
        };
      }

      stats[errorType].count++;
      if (record.success) {
        stats[errorType].healed++;
      } else {
        stats[errorType].failed++;
      }
    }

    // Calculate success rates and averages
    for (const errorType in stats) {
      const stat = stats[errorType];
      stat.successRate = stat.count > 0 ? stat.healed / stat.count : 0;

      const successfulRecords = this.records.filter(
        r => r.errorType === errorType && r.success
      );
      
      if (successfulRecords.length > 0) {
        stat.averageHealingTime = successfulRecords.reduce((sum, r) => sum + r.duration, 0) / successfulRecords.length;
        
        // Find most effective strategy
        const strategyCounts: Record<string, number> = {};
        for (const r of successfulRecords) {
          strategyCounts[r.strategyId] = (strategyCounts[r.strategyId] || 0) + 1;
        }
        
        stat.mostEffectiveStrategy = Object.entries(strategyCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
      }
    }

    return stats as Record<ErrorType, ErrorTypeStats>;
  }

  /**
   * Get strategy performance
   */
  private getStrategyPerformance(): Record<string, StrategyPerformance> {
    const performance: Record<string, StrategyPerformance> = {};

    for (const record of this.records) {
      const strategyId = record.strategyId;
      
      if (!performance[strategyId]) {
        performance[strategyId] = {
          strategyId,
          strategyName: strategyId,
          timesUsed: 0,
          timesSucceeded: 0,
          timesFailed: 0,
          successRate: 0,
          averageDuration: 0,
          totalTimeSaved: 0,
          trend: 'stable'
        };
      }

      performance[strategyId].timesUsed++;
      if (record.success) {
        performance[strategyId].timesSucceeded++;
        performance[strategyId].totalTimeSaved += this.estimateTimeSaved(record.errorType);
      } else {
        performance[strategyId].timesFailed++;
      }
    }

    // Calculate averages and trends
    for (const strategyId in performance) {
      const perf = performance[strategyId];
      perf.successRate = perf.timesUsed > 0 ? perf.timesSucceeded / perf.timesUsed : 0;

      const strategyRecords = this.records.filter(r => r.strategyId === strategyId);
      if (strategyRecords.length > 0) {
        perf.averageDuration = strategyRecords.reduce((sum, r) => sum + r.duration, 0) / strategyRecords.length;
      }

      // Determine trend
      if (strategyRecords.length > 10) {
        const recent = strategyRecords.slice(-5);
        const older = strategyRecords.slice(0, 5);
        
        const recentSuccessRate = recent.filter(r => r.success).length / recent.length;
        const olderSuccessRate = older.filter(r => r.success).length / older.length;

        if (recentSuccessRate > olderSuccessRate + 0.1) {
          perf.trend = 'improving';
        } else if (recentSuccessRate < olderSuccessRate - 0.1) {
          perf.trend = 'declining';
        }
      }
    }

    return performance;
  }

  /**
   * Get daily statistics
   */
  private getDailyStats(): DailyHealingStats[] {
    const dailyMap = new Map<string, DailyHealingStats>();

    for (const record of this.records) {
      const date = record.timestamp.toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          attempts: 0,
          successes: 0,
          failures: 0,
          averageTime: 0,
          topErrorTypes: [],
          topStrategies: []
        });
      }

      const stats = dailyMap.get(date)!;
      stats.attempts++;
      if (record.success) {
        stats.successes++;
      } else {
        stats.failures++;
      }
    }

    // Calculate averages and tops
    for (const [date, stats] of Array.from(dailyMap.entries())) {
      const dayRecords = this.records.filter(
        r => r.timestamp.toISOString().split('T')[0] === date
      );

      stats.averageTime = dayRecords.reduce((sum, r) => sum + r.duration, 0) / dayRecords.length;

      // Top error types
      const errorTypeCounts: Record<string, number> = {};
      for (const r of dayRecords) {
        errorTypeCounts[r.errorType] = (errorTypeCounts[r.errorType] || 0) + 1;
      }
      stats.topErrorTypes = Object.entries(errorTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type: type as ErrorType, count }));

      // Top strategies
      const strategyCounts: Record<string, number> = {};
      for (const r of dayRecords) {
        strategyCounts[r.strategyId] = (strategyCounts[r.strategyId] || 0) + 1;
      }
      stats.topStrategies = Object.entries(strategyCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ id, count }));
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate MTTR reduction
   */
  private calculateMTTRReduction(): number {
    // Estimate: Auto-healing reduces MTTR by 60-80%
    const successRate = this.records.filter(r => r.success).length / Math.max(1, this.records.length);
    return successRate * 70; // 70% reduction when fully successful
  }

  /**
   * Calculate uptime improvement
   */
  private calculateUptimeImprovement(): number {
    // Estimate: Each healed error improves uptime by 0.01%
    const healedErrors = this.records.filter(r => r.success).length;
    return Math.min(5, healedErrors * 0.01); // Cap at 5% improvement
  }

  /**
   * Calculate manual intervention reduction
   */
  private calculateManualInterventionReduction(): number {
    const successRate = this.records.filter(r => r.success).length / Math.max(1, this.records.length);
    return successRate * 100; // Percentage of errors that didn't need manual intervention
  }

  /**
   * Calculate time saved in hours
   */
  private calculateTimeSaved(): number {
    const healedErrors = this.records.filter(r => r.success);
    
    // Estimate: Each healed error saves 30 minutes of manual intervention
    const minutesSaved = healedErrors.reduce((sum, record) => {
      return sum + this.estimateTimeSaved(record.errorType);
    }, 0);

    return minutesSaved / 60; // Convert to hours
  }

  /**
   * Estimate time saved for error type (in minutes)
   */
  private estimateTimeSaved(errorType: ErrorType): number {
    const timeSavings: Record<ErrorType, number> = {
      // Network Errors
      [ErrorType.RATE_LIMIT]: 15,
      [ErrorType.TIMEOUT]: 20,
      [ErrorType.CONNECTION_FAILED]: 30,
      [ErrorType.DNS_FAILURE]: 35,
      [ErrorType.SSL_ERROR]: 40,

      // API Errors
      [ErrorType.AUTHENTICATION_FAILED]: 25,
      [ErrorType.AUTHORIZATION_FAILED]: 25,
      [ErrorType.INVALID_REQUEST]: 20,
      [ErrorType.RESOURCE_NOT_FOUND]: 15,
      [ErrorType.CONFLICT]: 20,

      // Data Errors
      [ErrorType.VALIDATION_ERROR]: 15,
      [ErrorType.PARSE_ERROR]: 10,
      [ErrorType.SCHEMA_MISMATCH]: 20,
      [ErrorType.ENCODING_ERROR]: 15,

      // Service Errors
      [ErrorType.SERVICE_UNAVAILABLE]: 45,
      [ErrorType.TEMPORARY_FAILURE]: 20,
      [ErrorType.QUOTA_EXCEEDED]: 30,
      [ErrorType.DEPRECATED_API]: 60,

      // Resource Errors
      [ErrorType.MEMORY_LIMIT]: 40,
      [ErrorType.CPU_LIMIT]: 40,
      [ErrorType.DISK_FULL]: 45,
      [ErrorType.FILE_NOT_FOUND]: 15,

      // Logic Errors
      [ErrorType.INFINITE_LOOP]: 90,
      [ErrorType.CIRCULAR_DEPENDENCY]: 60,
      [ErrorType.DEADLOCK]: 75,

      // Unknown
      [ErrorType.UNKNOWN]: 30
    };

    return timeSavings[errorType] || 30;
  }

  /**
   * Calculate cost savings in USD
   */
  private calculateCostSavings(hoursSaved: number): number {
    // Estimate: Developer time costs $75/hour on average
    const developerHourlyRate = 75;
    return hoursSaved * developerHourlyRate;
  }

  /**
   * Clear old records
   */
  clearOldRecords(maxAge: number = 2592000000): number {
    // Default: 30 days
    const cutoff = Date.now() - maxAge;
    const before = this.records.length;
    
    this.records = this.records.filter(r => r.timestamp.getTime() >= cutoff);
    
    const cleared = before - this.records.length;
    logger.info(`Cleared ${cleared} old healing records`);
    return cleared;
  }

  /**
   * Get records
   */
  getRecords(): HealingRecord[] {
    return [...this.records];
  }
}

// Export singleton
export const healingAnalytics = new HealingAnalytics();

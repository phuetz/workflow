/**
 * Error Diagnostician
 *
 * Analyzes workflow errors to identify root causes, classify error types,
 * and suggest appropriate healing strategies with confidence scoring.
 */

import {
  WorkflowError,
  Diagnosis,
  ErrorType,
  ErrorSeverity,
  ErrorPattern,
  HealingStrategyReference,
  ErrorContext
} from '../types/healing';

// ============================================================================
// Error Classification Rules
// ============================================================================

interface ClassificationRule {
  errorType: ErrorType;
  patterns: Array<{
    field: keyof WorkflowError | keyof ErrorContext;
    matcher: (value: unknown) => boolean;
  }>;
  priority: number;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Rate Limiting
  {
    errorType: ErrorType.RATE_LIMIT,
    patterns: [
      { field: 'statusCode', matcher: (v) => v === 429 },
      { field: 'message', matcher: (v) => typeof v === 'string' && /rate limit|too many requests|quota exceeded/i.test(v) },
      { field: 'code', matcher: (v) => v === 'RATE_LIMIT_EXCEEDED' || v === 'TOO_MANY_REQUESTS' }
    ],
    priority: 10
  },

  // Timeout
  {
    errorType: ErrorType.TIMEOUT,
    patterns: [
      { field: 'code', matcher: (v) => v === 'ETIMEDOUT' || v === 'TIMEOUT' },
      { field: 'message', matcher: (v) => typeof v === 'string' && /timeout|timed out/i.test(v) },
      { field: 'statusCode', matcher: (v) => v === 408 || v === 504 }
    ],
    priority: 9
  },

  // Authentication
  {
    errorType: ErrorType.AUTHENTICATION_FAILED,
    patterns: [
      { field: 'statusCode', matcher: (v) => v === 401 },
      { field: 'message', matcher: (v) => typeof v === 'string' && /unauthorized|authentication failed|invalid token/i.test(v) },
      { field: 'code', matcher: (v) => v === 'UNAUTHORIZED' }
    ],
    priority: 10
  },

  // Authorization
  {
    errorType: ErrorType.AUTHORIZATION_FAILED,
    patterns: [
      { field: 'statusCode', matcher: (v) => v === 403 },
      { field: 'message', matcher: (v) => typeof v === 'string' && /forbidden|access denied|permission denied/i.test(v) },
      { field: 'code', matcher: (v) => v === 'FORBIDDEN' }
    ],
    priority: 10
  },

  // Resource Not Found
  {
    errorType: ErrorType.RESOURCE_NOT_FOUND,
    patterns: [
      { field: 'statusCode', matcher: (v) => v === 404 },
      { field: 'message', matcher: (v) => typeof v === 'string' && /not found|does not exist/i.test(v) },
      { field: 'code', matcher: (v) => v === 'NOT_FOUND' }
    ],
    priority: 8
  },

  // Service Unavailable
  {
    errorType: ErrorType.SERVICE_UNAVAILABLE,
    patterns: [
      { field: 'statusCode', matcher: (v) => v === 503 || v === 502 },
      { field: 'message', matcher: (v) => typeof v === 'string' && /service unavailable|temporarily unavailable/i.test(v) },
      { field: 'code', matcher: (v) => v === 'SERVICE_UNAVAILABLE' }
    ],
    priority: 9
  },

  // Connection Failed
  {
    errorType: ErrorType.CONNECTION_FAILED,
    patterns: [
      { field: 'code', matcher: (v) => v === 'ECONNREFUSED' || v === 'ECONNRESET' || v === 'ENOTFOUND' },
      { field: 'message', matcher: (v) => typeof v === 'string' && /connection refused|connection reset|connect ECONNREFUSED/i.test(v) }
    ],
    priority: 9
  },

  // Validation Error
  {
    errorType: ErrorType.VALIDATION_ERROR,
    patterns: [
      { field: 'statusCode', matcher: (v) => v === 400 || v === 422 },
      { field: 'message', matcher: (v) => typeof v === 'string' && /validation|invalid input|bad request/i.test(v) },
      { field: 'code', matcher: (v) => v === 'VALIDATION_ERROR' || v === 'BAD_REQUEST' }
    ],
    priority: 7
  },

  // Parse Error
  {
    errorType: ErrorType.PARSE_ERROR,
    patterns: [
      { field: 'message', matcher: (v) => typeof v === 'string' && /parse error|JSON parse|XML parse|unexpected token/i.test(v) },
      { field: 'code', matcher: (v) => v === 'PARSE_ERROR' }
    ],
    priority: 7
  },

  // Memory Limit
  {
    errorType: ErrorType.MEMORY_LIMIT,
    patterns: [
      { field: 'message', matcher: (v) => typeof v === 'string' && /out of memory|memory limit|heap out of memory/i.test(v) },
      { field: 'code', matcher: (v) => v === 'MEMORY_LIMIT_EXCEEDED' }
    ],
    priority: 10
  },

  // Quota Exceeded
  {
    errorType: ErrorType.QUOTA_EXCEEDED,
    patterns: [
      { field: 'message', matcher: (v) => typeof v === 'string' && /quota exceeded|limit exceeded|usage limit/i.test(v) },
      { field: 'code', matcher: (v) => v === 'QUOTA_EXCEEDED' }
    ],
    priority: 9
  }
];

// ============================================================================
// Error Diagnostician
// ============================================================================

export class ErrorDiagnostician {
  private errorHistory: Map<string, WorkflowError[]> = new Map();
  private patternCache: Map<string, ErrorPattern[]> = new Map();

  /**
   * Diagnose an error and provide healing recommendations
   */
  async diagnose(error: WorkflowError): Promise<Diagnosis> {
    const startTime = Date.now();

    // Store error in history
    this.addToHistory(error);

    // Classify error
    const errorType = this.classifyError(error);

    // Find root cause
    const rootCause = this.findRootCause(error, errorType);

    // Determine severity
    const severity = this.determineSeverity(error, errorType);

    // Check if healable
    const healable = this.isHealable(errorType, error);

    // Analyze patterns
    const patterns = this.analyzePatterns(error);

    // Find similar errors
    const similarErrors = this.findSimilarErrors(error);

    // Affected nodes
    const affectedNodes = this.findAffectedNodes(error);

    // Timeline analysis
    const timelineAnalysis = this.analyzeTimeline(error);

    // Suggest strategies
    const suggestedStrategies = this.selectStrategies(errorType, error, patterns);

    // Estimate success rate
    const estimatedSuccessRate = this.estimateSuccessRate(suggestedStrategies);

    // Estimate recovery time
    const estimatedRecoveryTime = this.estimateRecoveryTime(suggestedStrategies);

    // Calculate confidence
    const confidence = this.calculateConfidence(errorType, patterns, similarErrors.length);

    const diagnosisTime = Date.now() - startTime;

    return {
      errorId: error.id,
      errorType,
      rootCause,
      severity,
      healable,
      confidence,
      analysis: {
        patterns,
        similarErrors,
        affectedNodes,
        timelineAnalysis
      },
      suggestedStrategies,
      estimatedSuccessRate,
      estimatedRecoveryTime,
      diagnosisTime,
      timestamp: new Date()
    };
  }

  /**
   * Classify error type using pattern matching
   */
  private classifyError(error: WorkflowError): ErrorType {
    const scores: Map<ErrorType, number> = new Map();

    for (const rule of CLASSIFICATION_RULES) {
      let matchCount = 0;

      for (const pattern of rule.patterns) {
        let value: unknown;

        if (pattern.field in error) {
          value = error[pattern.field as keyof WorkflowError];
        } else if (pattern.field in error.context) {
          value = error.context[pattern.field as keyof ErrorContext];
        }

        if (value !== undefined && pattern.matcher(value)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const score = (matchCount / rule.patterns.length) * rule.priority;
        scores.set(rule.errorType, (scores.get(rule.errorType) || 0) + score);
      }
    }

    // Return highest scoring error type
    if (scores.size > 0) {
      return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Find root cause of the error
   */
  private findRootCause(error: WorkflowError, errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.RATE_LIMIT:
        return 'API rate limit exceeded due to high request volume or insufficient quota';

      case ErrorType.TIMEOUT:
        if (error.context.executionTime && error.context.executionTime > 30000) {
          return 'Request exceeded timeout threshold, likely due to slow API response or large payload';
        }
        return 'Request timed out before receiving response';

      case ErrorType.AUTHENTICATION_FAILED:
        if (error.message.toLowerCase().includes('expired')) {
          return 'Authentication credentials have expired and need to be refreshed';
        }
        return 'Invalid or missing authentication credentials';

      case ErrorType.AUTHORIZATION_FAILED:
        return 'User lacks necessary permissions to access this resource';

      case ErrorType.RESOURCE_NOT_FOUND:
        return 'Requested resource does not exist or has been moved/deleted';

      case ErrorType.SERVICE_UNAVAILABLE:
        return 'External service is temporarily unavailable or under maintenance';

      case ErrorType.CONNECTION_FAILED:
        if (error.code === 'ECONNREFUSED') {
          return 'Target server refused connection - service may be down or firewall blocking';
        }
        if (error.code === 'ENOTFOUND') {
          return 'DNS lookup failed - hostname does not resolve';
        }
        return 'Network connection failed';

      case ErrorType.VALIDATION_ERROR:
        return 'Input data failed validation - incorrect format or missing required fields';

      case ErrorType.PARSE_ERROR:
        return 'Failed to parse response data - unexpected format or encoding';

      case ErrorType.MEMORY_LIMIT:
        return 'Process exceeded memory limits - payload too large or memory leak';

      case ErrorType.QUOTA_EXCEEDED:
        return 'API quota or usage limit has been exceeded for current billing period';

      default:
        return error.message || 'Unknown error cause';
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: WorkflowError, errorType: ErrorType): ErrorSeverity {
    // Critical errors
    if ([
      ErrorType.MEMORY_LIMIT,
      ErrorType.INFINITE_LOOP,
      ErrorType.DEADLOCK,
      ErrorType.CIRCULAR_DEPENDENCY
    ].includes(errorType)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if ([
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.CONNECTION_FAILED,
      ErrorType.AUTHENTICATION_FAILED
    ].includes(errorType)) {
      return ErrorSeverity.HIGH;
    }

    // Check frequency
    const history = this.errorHistory.get(error.nodeId) || [];
    const recentErrors = history.filter(
      e => Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentErrors.length > 10) {
      return ErrorSeverity.HIGH;
    }

    if (recentErrors.length > 5) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity by default
    return ErrorSeverity.LOW;
  }

  /**
   * Check if error is healable
   */
  private isHealable(errorType: ErrorType, error: WorkflowError): boolean {
    // Non-healable errors
    const nonHealable = [
      ErrorType.AUTHORIZATION_FAILED,
      ErrorType.VALIDATION_ERROR,
      ErrorType.INFINITE_LOOP,
      ErrorType.CIRCULAR_DEPENDENCY
    ];

    if (nonHealable.includes(errorType)) {
      return false;
    }

    // Check if too many attempts
    if (error.attempt > 10) {
      return false;
    }

    return true;
  }

  /**
   * Analyze error patterns
   */
  private analyzePatterns(error: WorkflowError): ErrorPattern[] {
    const cacheKey = `${error.workflowId}-${error.nodeId}`;
    const cached = this.patternCache.get(cacheKey);

    if (cached && Date.now() - cached[0].lastOccurrence.getTime() < 60000) {
      return cached;
    }

    const history = this.errorHistory.get(cacheKey) || [];
    const patterns: Map<string, ErrorPattern> = new Map();

    // Group by error message pattern
    for (const histError of history) {
      const pattern = this.extractPattern(histError.message);

      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          pattern,
          frequency: 0,
          lastOccurrence: histError.timestamp,
          trending: 'stable'
        });
      }

      const p = patterns.get(pattern)!;
      p.frequency++;
      if (histError.timestamp > p.lastOccurrence) {
        p.lastOccurrence = histError.timestamp;
      }
    }

    // Calculate trends and intervals
    const result = Array.from(patterns.values()).map(p => {
      const relevantErrors = history.filter(e =>
        this.extractPattern(e.message) === p.pattern
      ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (relevantErrors.length > 1) {
        const intervals = [];
        for (let i = 1; i < relevantErrors.length; i++) {
          intervals.push(
            relevantErrors[i].timestamp.getTime() -
            relevantErrors[i - 1].timestamp.getTime()
          );
        }
        p.averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Determine trend
        const recentCount = relevantErrors.filter(
          e => Date.now() - e.timestamp.getTime() < 3600000 // Last hour
        ).length;
        const olderCount = relevantErrors.filter(
          e => {
            const age = Date.now() - e.timestamp.getTime();
            return age >= 3600000 && age < 7200000; // 1-2 hours ago
          }
        ).length;

        if (recentCount > olderCount * 1.5) {
          p.trending = 'increasing';
        } else if (recentCount < olderCount * 0.5) {
          p.trending = 'decreasing';
        }
      }

      return p;
    });

    this.patternCache.set(cacheKey, result);
    return result;
  }

  /**
   * Extract pattern from error message
   */
  private extractPattern(message: string): string {
    // Remove numbers, IDs, and specific values
    return message
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\/[a-zA-Z0-9_-]+/g, '/PATH')
      .toLowerCase()
      .trim();
  }

  /**
   * Find similar errors
   */
  private findSimilarErrors(error: WorkflowError): string[] {
    const allHistory = Array.from(this.errorHistory.values()).flat();
    const errorPattern = this.extractPattern(error.message);

    return allHistory
      .filter(e =>
        e.id !== error.id &&
        this.extractPattern(e.message) === errorPattern
      )
      .map(e => e.id)
      .slice(0, 10);
  }

  /**
   * Find affected nodes
   */
  private findAffectedNodes(error: WorkflowError): string[] {
    const nodes = new Set<string>();
    nodes.add(error.nodeId);

    // Add related errors' nodes
    if (error.relatedErrors) {
      error.relatedErrors.forEach(e => nodes.add(e.nodeId));
    }

    return Array.from(nodes);
  }

  /**
   * Analyze timeline
   */
  private analyzeTimeline(error: WorkflowError): string {
    const history = this.errorHistory.get(`${error.workflowId}-${error.nodeId}`) || [];

    if (history.length === 1) {
      return 'First occurrence of this error';
    }

    const recentCount = history.filter(
      e => Date.now() - e.timestamp.getTime() < 3600000
    ).length;

    if (recentCount > 5) {
      return `Frequent errors detected: ${recentCount} in the last hour`;
    }

    const lastError = history[history.length - 2];
    const timeSinceLast = Date.now() - lastError.timestamp.getTime();

    if (timeSinceLast < 60000) {
      return 'Repeated error within 1 minute - potential cascading failure';
    }

    if (timeSinceLast < 3600000) {
      return `Error recurred after ${Math.floor(timeSinceLast / 60000)} minutes`;
    }

    return 'Intermittent error with irregular pattern';
  }

  /**
   * Select appropriate healing strategies
   */
  private selectStrategies(
    errorType: ErrorType,
    error: WorkflowError,
    patterns: ErrorPattern[]
  ): HealingStrategyReference[] {
    const strategies: HealingStrategyReference[] = [];

    // Strategy selection based on error type
    switch (errorType) {
      case ErrorType.RATE_LIMIT:
        strategies.push(
          { strategyId: 'exponential-backoff', expectedSuccessRate: 0.85, estimatedDuration: 5000, priority: 1 },
          { strategyId: 'use-cached-data', expectedSuccessRate: 0.70, estimatedDuration: 100, priority: 2 },
          { strategyId: 'switch-api-key', expectedSuccessRate: 0.60, estimatedDuration: 1000, priority: 3 }
        );
        break;

      case ErrorType.TIMEOUT:
        strategies.push(
          { strategyId: 'increase-timeout', expectedSuccessRate: 0.75, estimatedDuration: 2000, priority: 1 },
          { strategyId: 'reduce-payload', expectedSuccessRate: 0.80, estimatedDuration: 1000, priority: 2 },
          { strategyId: 'simple-retry', expectedSuccessRate: 0.65, estimatedDuration: 3000, priority: 3 }
        );
        break;

      case ErrorType.AUTHENTICATION_FAILED:
        strategies.push(
          { strategyId: 'refresh-token', expectedSuccessRate: 0.90, estimatedDuration: 1500, priority: 1 },
          { strategyId: 'switch-credentials', expectedSuccessRate: 0.70, estimatedDuration: 1000, priority: 2 }
        );
        break;

      case ErrorType.SERVICE_UNAVAILABLE:
        strategies.push(
          { strategyId: 'failover-backup', expectedSuccessRate: 0.85, estimatedDuration: 2000, priority: 1 },
          { strategyId: 'exponential-backoff', expectedSuccessRate: 0.75, estimatedDuration: 8000, priority: 2 },
          { strategyId: 'use-cached-data', expectedSuccessRate: 0.60, estimatedDuration: 100, priority: 3 }
        );
        break;

      case ErrorType.CONNECTION_FAILED:
        strategies.push(
          { strategyId: 'failover-backup', expectedSuccessRate: 0.80, estimatedDuration: 2000, priority: 1 },
          { strategyId: 'switch-endpoint', expectedSuccessRate: 0.75, estimatedDuration: 1500, priority: 2 },
          { strategyId: 'exponential-backoff', expectedSuccessRate: 0.70, estimatedDuration: 5000, priority: 3 }
        );
        break;

      case ErrorType.PARSE_ERROR:
        strategies.push(
          { strategyId: 'change-encoding', expectedSuccessRate: 0.65, estimatedDuration: 1000, priority: 1 },
          { strategyId: 'use-cached-data', expectedSuccessRate: 0.50, estimatedDuration: 100, priority: 2 }
        );
        break;

      case ErrorType.MEMORY_LIMIT:
        strategies.push(
          { strategyId: 'reduce-payload', expectedSuccessRate: 0.70, estimatedDuration: 1500, priority: 1 },
          { strategyId: 'batch-to-individual', expectedSuccessRate: 0.85, estimatedDuration: 5000, priority: 2 }
        );
        break;

      default:
        strategies.push(
          { strategyId: 'simple-retry', expectedSuccessRate: 0.60, estimatedDuration: 2000, priority: 1 },
          { strategyId: 'exponential-backoff', expectedSuccessRate: 0.70, estimatedDuration: 5000, priority: 2 }
        );
    }

    return strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Estimate overall success rate
   */
  private estimateSuccessRate(strategies: HealingStrategyReference[]): number {
    if (strategies.length === 0) return 0;

    // Calculate combined success rate
    let failureRate = 1;
    for (const strategy of strategies) {
      failureRate *= (1 - strategy.expectedSuccessRate);
    }

    return 1 - failureRate;
  }

  /**
   * Estimate recovery time
   */
  private estimateRecoveryTime(strategies: HealingStrategyReference[]): number {
    if (strategies.length === 0) return 0;

    // Weighted average based on success rate
    let totalWeight = 0;
    let weightedTime = 0;

    for (const strategy of strategies) {
      totalWeight += strategy.expectedSuccessRate;
      weightedTime += strategy.estimatedDuration * strategy.expectedSuccessRate;
    }

    return totalWeight > 0 ? weightedTime / totalWeight : 0;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    errorType: ErrorType,
    patterns: ErrorPattern[],
    similarErrorsCount: number
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have a specific error type
    if (errorType !== ErrorType.UNKNOWN) {
      confidence += 0.2;
    }

    // Increase confidence based on pattern frequency
    const highFrequencyPatterns = patterns.filter(p => p.frequency > 3);
    if (highFrequencyPatterns.length > 0) {
      confidence += 0.15;
    }

    // Increase confidence if we've seen similar errors
    if (similarErrorsCount > 5) {
      confidence += 0.15;
    } else if (similarErrorsCount > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Add error to history
   */
  private addToHistory(error: WorkflowError): void {
    const key = `${error.workflowId}-${error.nodeId}`;
    const history = this.errorHistory.get(key) || [];

    history.push(error);

    // Keep last 100 errors per node
    if (history.length > 100) {
      history.shift();
    }

    this.errorHistory.set(key, history);
  }

  /**
   * Get error history for a workflow/node
   */
  getHistory(workflowId: string, nodeId?: string): WorkflowError[] {
    if (nodeId) {
      return this.errorHistory.get(`${workflowId}-${nodeId}`) || [];
    }

    // Return all errors for workflow
    return Array.from(this.errorHistory.entries())
      .filter(([key]) => key.startsWith(`${workflowId}-`))
      .flatMap(([, errors]) => errors);
  }

  /**
   * Clear history
   */
  clearHistory(workflowId?: string): void {
    if (workflowId) {
      const keysToDelete = Array.from(this.errorHistory.keys())
        .filter(key => key.startsWith(`${workflowId}-`));

      keysToDelete.forEach(key => this.errorHistory.delete(key));
    } else {
      this.errorHistory.clear();
    }

    this.patternCache.clear();
  }
}

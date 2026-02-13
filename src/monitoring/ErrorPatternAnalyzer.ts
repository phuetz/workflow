/**
 * ErrorPatternAnalyzer.ts
 * Machine learning-powered error pattern detection and analysis
 */

import type { ErrorEvent, ErrorType, ErrorSeverity } from './ErrorMonitoringSystem';
import { logger } from '../services/SimpleLogger';

export interface ErrorPattern {
  id: string;
  pattern: string | RegExp;
  signature: string; // Normalized pattern signature
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedUsers: Set<string>;
  affectedWorkflows: Set<string>;
  suggestedFix?: string;
  autoFixAvailable: boolean;
  confidence: number; // 0-1
  severity: ErrorSeverity;
  type: ErrorType;
  examples: ErrorEvent[];
  metadata: {
    averageResolutionTime?: number;
    successRate?: number;
    relatedPatterns?: string[];
    rootCause?: string;
  };
}

export interface PatternCluster {
  id: string;
  patterns: ErrorPattern[];
  centroid: string;
  size: number;
  commonality: number; // 0-1
}

export interface PatternAnalysis {
  patterns: ErrorPattern[];
  clusters: PatternCluster[];
  trending: ErrorPattern[];
  predictions: ErrorPrediction[];
  recommendations: string[];
}

export interface ErrorPrediction {
  pattern: ErrorPattern;
  probability: number;
  timeframe: string;
  reasoning: string;
}

export interface CorrelationResult {
  event: string;
  correlation: number; // -1 to 1
  significance: number; // p-value
}

export class ErrorPatternAnalyzer {
  private patterns: Map<string, ErrorPattern> = new Map();
  private readonly minOccurrences = 3; // Min occurrences to consider a pattern
  private readonly similarityThreshold = 0.7; // For clustering
  private readonly trendingWindow = 60 * 60 * 1000; // 1 hour for trending

  constructor() {
    // Initialize with common patterns
    this.initializeCommonPatterns();
  }

  /**
   * Analyze a batch of errors and detect patterns
   */
  public async analyzeErrors(errors: ErrorEvent[]): Promise<PatternAnalysis> {
    // Update existing patterns with new errors
    this.updatePatterns(errors);

    // Cluster similar patterns
    const clusters = this.clusterPatterns();

    // Identify trending patterns
    const trending = this.identifyTrending();

    // Predict future errors
    const predictions = this.predictFutureErrors();

    // Generate recommendations
    const recommendations = this.generateRecommendations(clusters, trending);

    return {
      patterns: Array.from(this.patterns.values()),
      clusters,
      trending,
      predictions,
      recommendations,
    };
  }

  /**
   * Update patterns with new errors
   */
  private updatePatterns(errors: ErrorEvent[]): void {
    errors.forEach(error => {
      const signature = this.generateSignature(error);
      let pattern = this.patterns.get(signature);

      if (pattern) {
        // Update existing pattern
        pattern.count++;
        pattern.lastSeen = error.timestamp;
        if (error.context.userId) {
          pattern.affectedUsers.add(error.context.userId);
        }
        if (error.context.workflowId) {
          pattern.affectedWorkflows.add(error.context.workflowId);
        }
        if (pattern.examples.length < 5) {
          pattern.examples.push(error);
        }
      } else {
        // Create new pattern
        pattern = {
          id: `pattern_${signature}`,
          pattern: this.extractPattern(error),
          signature,
          count: 1,
          firstSeen: error.timestamp,
          lastSeen: error.timestamp,
          affectedUsers: new Set(error.context.userId ? [error.context.userId] : []),
          affectedWorkflows: new Set(error.context.workflowId ? [error.context.workflowId] : []),
          autoFixAvailable: this.checkAutoFixAvailable(error),
          confidence: 1.0,
          severity: error.severity,
          type: error.type,
          examples: [error],
          metadata: {},
        };

        // Add suggested fix if available
        pattern.suggestedFix = this.suggestFix(pattern);

        this.patterns.set(signature, pattern);
      }
    });

    // Cleanup old patterns (not seen in 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    Array.from(this.patterns.entries()).forEach(([signature, pattern]) => {
      if (pattern.lastSeen < sevenDaysAgo && pattern.count < this.minOccurrences) {
        this.patterns.delete(signature);
      }
    });
  }

  /**
   * Cluster similar patterns
   */
  private clusterPatterns(): PatternCluster[] {
    const patterns = Array.from(this.patterns.values()).filter(
      p => p.count >= this.minOccurrences
    );

    if (patterns.length === 0) return [];

    const clusters: PatternCluster[] = [];
    const visited = new Set<string>();

    patterns.forEach(pattern => {
      if (visited.has(pattern.id)) return;

      const cluster: ErrorPattern[] = [pattern];
      visited.add(pattern.id);

      // Find similar patterns
      patterns.forEach(other => {
        if (visited.has(other.id)) return;
        if (this.calculateSimilarity(pattern, other) >= this.similarityThreshold) {
          cluster.push(other);
          visited.add(other.id);
        }
      });

      if (cluster.length > 1) {
        clusters.push({
          id: `cluster_${clusters.length}`,
          patterns: cluster,
          centroid: this.calculateCentroid(cluster),
          size: cluster.reduce((sum, p) => sum + p.count, 0),
          commonality: this.calculateCommonality(cluster),
        });
      }
    });

    return clusters.sort((a, b) => b.size - a.size);
  }

  /**
   * Identify trending patterns (increasing error rate)
   */
  private identifyTrending(): ErrorPattern[] {
    const now = Date.now();
    const windowStart = now - this.trendingWindow;

    return Array.from(this.patterns.values())
      .filter(pattern => {
        // Check if pattern is recent
        if (pattern.lastSeen.getTime() < windowStart) return false;

        // Calculate recent rate vs historical rate
        const recentErrors = pattern.examples.filter(
          e => e.timestamp.getTime() >= windowStart
        ).length;

        const totalTime = now - pattern.firstSeen.getTime();
        const historicalRate = pattern.count / totalTime;
        const recentRate = recentErrors / this.trendingWindow;

        // Trending if recent rate is 2x historical rate
        return recentRate > historicalRate * 2;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Predict future errors based on patterns
   */
  private predictFutureErrors(): ErrorPrediction[] {
    const predictions: ErrorPrediction[] = [];
    const now = Date.now();

    Array.from(this.patterns.values()).forEach(pattern => {
      if (pattern.count < this.minOccurrences) return;

      // Calculate error frequency
      const timeSpan = now - pattern.firstSeen.getTime();
      const frequency = pattern.count / timeSpan; // errors per ms

      // Predict if we'll see this error in the next hour
      const expectedInNextHour = frequency * (60 * 60 * 1000);

      if (expectedInNextHour >= 1) {
        predictions.push({
          pattern,
          probability: Math.min(expectedInNextHour / 10, 1), // Cap at 100%
          timeframe: '1 hour',
          reasoning: `Based on ${pattern.count} occurrences over ${this.formatTimeSpan(timeSpan)}, expecting ${Math.round(expectedInNextHour)} occurrences in next hour`,
        });
      }
    });

    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 5);
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    clusters: PatternCluster[],
    trending: ErrorPattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommendations for large clusters
    clusters.slice(0, 3).forEach(cluster => {
      const totalErrors = cluster.size;
      const pattern = cluster.patterns[0];
      recommendations.push(
        `Address error cluster affecting ${totalErrors} occurrences: "${pattern.pattern}". ${pattern.suggestedFix || 'Manual investigation recommended.'}`
      );
    });

    // Recommendations for trending errors
    trending.slice(0, 3).forEach(pattern => {
      recommendations.push(
        `Investigate trending error (${pattern.count} recent occurrences): "${pattern.pattern}". This error rate is increasing rapidly.`
      );
    });

    // Recommendations for high-severity patterns
    const criticalPatterns = Array.from(this.patterns.values())
      .filter(p => p.severity === 'critical' && p.count >= this.minOccurrences)
      .slice(0, 2);

    criticalPatterns.forEach(pattern => {
      recommendations.push(
        `CRITICAL: "${pattern.pattern}" has occurred ${pattern.count} times affecting ${pattern.affectedUsers.size} users. Immediate action required.`
      );
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('No critical patterns detected. System is operating normally.');
    }

    return recommendations;
  }

  /**
   * Correlate errors with system events
   */
  public correlateWithEvents(
    errors: ErrorEvent[],
    events: Array<{ type: string; timestamp: Date }>
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];

    // Group errors by time windows (5 minutes)
    const windowSize = 5 * 60 * 1000;
    const errorWindows = this.groupByTimeWindows(errors, windowSize);
    const eventWindows = this.groupByTimeWindows(events, windowSize);

    // Calculate correlation for each event type
    const eventTypes = [...new Set(events.map(e => e.type))];

    eventTypes.forEach(eventType => {
      const eventCounts = eventWindows.map(w =>
        w.filter(e => e.type === eventType).length
      );
      const errorCounts = errorWindows.map(w => w.length);

      const correlation = this.calculatePearsonCorrelation(eventCounts, errorCounts);
      const significance = this.calculateSignificance(correlation, eventCounts.length);

      if (Math.abs(correlation) > 0.5 && significance < 0.05) {
        correlations.push({
          event: eventType,
          correlation,
          significance,
        });
      }
    });

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Find root cause of an error pattern
   */
  public async findRootCause(pattern: ErrorPattern): Promise<string> {
    // Analyze stack traces
    const stackAnalysis = this.analyzeStackTraces(pattern.examples);

    // Check for common factors
    const commonFactors: string[] = [];

    // Same workflow?
    if (pattern.affectedWorkflows.size === 1) {
      commonFactors.push(`All errors occur in workflow: ${Array.from(pattern.affectedWorkflows)[0]}`);
    }

    // Same user?
    if (pattern.affectedUsers.size === 1) {
      commonFactors.push(`All errors affect user: ${Array.from(pattern.affectedUsers)[0]}`);
    }

    // Same time of day?
    const hours = pattern.examples.map(e => e.timestamp.getHours());
    const hourMode = this.findMode(hours);
    if (hours.filter(h => h === hourMode).length / hours.length > 0.7) {
      commonFactors.push(`Errors cluster around ${hourMode}:00 (${Math.round(hours.filter(h => h === hourMode).length / hours.length * 100)}% of occurrences)`);
    }

    // Build root cause explanation
    let rootCause = `Pattern: ${pattern.pattern}\n\n`;

    if (stackAnalysis) {
      rootCause += `Stack trace analysis: ${stackAnalysis}\n\n`;
    }

    if (commonFactors.length > 0) {
      rootCause += `Common factors:\n${commonFactors.map(f => `- ${f}`).join('\n')}`;
    } else {
      rootCause += 'No obvious common factors detected. Further investigation needed.';
    }

    return rootCause;
  }

  /**
   * Utility methods
   */
  private generateSignature(error: ErrorEvent): string {
    // Normalize error message for signature
    const normalized = error.message
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/https?:\/\/[^\s]+/g, 'URL')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    // Include stack trace first line if available
    const stackLine = error.stack?.split('\n')[0]?.trim() || '';
    return `${error.type}:${normalized}:${stackLine}`;
  }

  private extractPattern(error: ErrorEvent): string | RegExp {
    // Extract a pattern that can match similar errors
    return error.message
      .replace(/\d+/g, '\\d+')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[a-f0-9-]{36}');
  }

  private checkAutoFixAvailable(error: ErrorEvent): boolean {
    // Check if this error type has an auto-fix available
    const message = error.message.toLowerCase();

    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('connection')
    );
  }

  private suggestFix(pattern: ErrorPattern): string | undefined {
    const message = String(pattern.pattern).toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Implement retry logic with exponential backoff';
    }
    if (message.includes('timeout')) {
      return 'Increase timeout threshold or optimize slow operations';
    }
    if (message.includes('rate limit')) {
      return 'Implement request throttling or increase rate limits';
    }
    if (message.includes('memory')) {
      return 'Review memory allocation and implement garbage collection optimization';
    }
    if (message.includes('undefined') || message.includes('null')) {
      return 'Add null/undefined checks and default values';
    }
    if (message.includes('validation')) {
      return 'Review input validation rules and provide better user feedback';
    }

    return undefined;
  }

  private calculateSimilarity(p1: ErrorPattern, p2: ErrorPattern): number {
    // Calculate Jaccard similarity between two patterns
    const s1 = new Set(String(p1.pattern).split(/\s+/));
    const s2 = new Set(String(p2.pattern).split(/\s+/));

    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return intersection.size / union.size;
  }

  private calculateCentroid(patterns: ErrorPattern[]): string {
    // Find the most representative pattern in the cluster
    let maxSimilarity = 0;
    let centroid = patterns[0].signature;

    patterns.forEach(p1 => {
      let totalSimilarity = 0;
      patterns.forEach(p2 => {
        if (p1 !== p2) {
          totalSimilarity += this.calculateSimilarity(p1, p2);
        }
      });
      if (totalSimilarity > maxSimilarity) {
        maxSimilarity = totalSimilarity;
        centroid = p1.signature;
      }
    });

    return centroid;
  }

  private calculateCommonality(patterns: ErrorPattern[]): number {
    // Calculate average similarity between all patterns in cluster
    if (patterns.length < 2) return 1;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        totalSimilarity += this.calculateSimilarity(patterns[i], patterns[j]);
        comparisons++;
      }
    }

    return totalSimilarity / comparisons;
  }

  private groupByTimeWindows<T extends { timestamp: Date }>(
    items: T[],
    windowSize: number
  ): T[][] {
    const windows: T[][] = [];
    const sorted = [...items].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (sorted.length === 0) return windows;

    let currentWindow: T[] = [];
    let windowStart = sorted[0].timestamp.getTime();

    sorted.forEach(item => {
      if (item.timestamp.getTime() - windowStart > windowSize) {
        windows.push(currentWindow);
        currentWindow = [];
        windowStart = item.timestamp.getTime();
      }
      currentWindow.push(item);
    });

    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateSignificance(correlation: number, n: number): number {
    // Simple t-test for correlation significance
    if (n < 3) return 1;

    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    // This is a simplified p-value calculation
    return 1 / (1 + Math.abs(t));
  }

  private analyzeStackTraces(errors: ErrorEvent[]): string | null {
    const stacks = errors.map(e => e.stack).filter(Boolean) as string[];
    if (stacks.length === 0) return null;

    // Find common stack trace elements
    const firstStack = stacks[0].split('\n');
    const commonLines = firstStack.filter(line =>
      stacks.every(stack => stack.includes(line))
    );

    if (commonLines.length > 1) {
      return `Common stack trace: ${commonLines[0]}`;
    }

    return null;
  }

  private findMode(numbers: number[]): number {
    const counts = new Map<number, number>();
    numbers.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
    let maxCount = 0;
    let mode = numbers[0];
    counts.forEach((count, num) => {
      if (count > maxCount) {
        maxCount = count;
        mode = num;
      }
    });
    return mode;
  }

  private formatTimeSpan(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    if (hours > 24) {
      return `${Math.floor(hours / 24)} days`;
    }
    if (hours > 0) {
      return `${hours} hours`;
    }
    return `${Math.floor(ms / (60 * 1000))} minutes`;
  }

  private initializeCommonPatterns(): void {
    // Pre-populate with known patterns
    // This would be loaded from a database in production
  }

  /**
   * Export patterns for persistence
   */
  public exportPatterns(): string {
    const patternsArray = Array.from(this.patterns.values()).map(p => ({
      ...p,
      affectedUsers: Array.from(p.affectedUsers),
      affectedWorkflows: Array.from(p.affectedWorkflows),
    }));
    return JSON.stringify(patternsArray, null, 2);
  }

  /**
   * Import patterns from persistence
   */
  public importPatterns(data: string): void {
    try {
      const patternsArray = JSON.parse(data);
      patternsArray.forEach((p: Partial<ErrorPattern> & { affectedUsers: string[], affectedWorkflows: string[] }) => {
        if (p.signature) {
          this.patterns.set(p.signature, {
            ...p as ErrorPattern,
            affectedUsers: new Set(p.affectedUsers),
            affectedWorkflows: new Set(p.affectedWorkflows),
          });
        }
      });
    } catch (error) {
      logger.error('Failed to import patterns', { component: 'ErrorPatternAnalyzer', error });
    }
  }
}

export default ErrorPatternAnalyzer;

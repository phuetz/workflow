/**
 * Complex Event Processing (CEP) Engine
 *
 * Pattern detection and matching for event streams:
 * - Sequence patterns (A followed by B)
 * - Conjunction patterns (A and B)
 * - Disjunction patterns (A or B)
 * - Negation patterns (A not followed by B)
 * - Iteration patterns (A repeated N times)
 * - Temporal constraints (within time window)
 * - Correlation analysis
 * - Anomaly detection
 */

import { EventEmitter } from 'events';
import type {
  StreamEvent,
  CEPPattern,
  PatternMatch,
  PatternCondition,
  FilterCondition,
  TimeConstraint,
  Quantifier,
  AnomalyDetectionConfig,
  Anomaly,
} from '../types/streaming';

export class CEPEngine extends EventEmitter {
  private patterns = new Map<string, CEPPattern>();
  private eventBuffer: StreamEvent[] = [];
  private maxBufferSize = 10000;
  private matches: PatternMatch[] = [];
  private anomalies: Anomaly[] = [];

  constructor(maxBufferSize = 10000) {
    super();
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Register a pattern for detection
   */
  registerPattern(pattern: CEPPattern): void {
    this.patterns.set(pattern.id, pattern);
    this.emit('pattern-registered', pattern);
  }

  /**
   * Unregister a pattern
   */
  unregisterPattern(patternId: string): void {
    this.patterns.delete(patternId);
    this.emit('pattern-unregistered', patternId);
  }

  /**
   * Process events and detect patterns
   */
  async processEvents(events: StreamEvent[]): Promise<PatternMatch[]> {
    // Add events to buffer
    this.eventBuffer.push(...events);

    // Maintain buffer size
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }

    // Detect patterns
    const newMatches: PatternMatch[] = [];

    for (const [, pattern] of this.patterns) {
      const matches = await this.detectPattern(pattern);
      newMatches.push(...matches);
    }

    this.matches.push(...newMatches);

    // Emit matches
    for (const match of newMatches) {
      this.emit('pattern-match', match);
    }

    return newMatches;
  }

  /**
   * Detect anomalies in event stream
   */
  async detectAnomalies(
    events: StreamEvent[],
    config: AnomalyDetectionConfig
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    switch (config.method) {
      case 'zscore':
        anomalies.push(...this.detectZScoreAnomalies(events, config));
        break;

      case 'iqr':
        anomalies.push(...this.detectIQRAnomalies(events, config));
        break;

      case 'isolation-forest':
        // Simplified isolation forest (would need proper ML lib in production)
        anomalies.push(...this.detectOutliers(events, config));
        break;

      case 'custom':
        if (config.customDetector) {
          const isAnomaly = config.customDetector(events);
          events.forEach((event, index) => {
            if (isAnomaly[index]) {
              anomalies.push({
                event,
                score: 1.0,
                method: 'custom',
                detectedAt: Date.now(),
                context: events,
              });
            }
          });
        }
        break;
    }

    this.anomalies.push(...anomalies);

    for (const anomaly of anomalies) {
      this.emit('anomaly-detected', anomaly);
    }

    return anomalies;
  }

  /**
   * Correlate events based on shared attributes
   */
  correlateEvents(
    events: StreamEvent[],
    correlationKeys: string[]
  ): Map<string, StreamEvent[]> {
    const correlations = new Map<string, StreamEvent[]>();

    for (const event of events) {
      const key = this.extractCorrelationKey(event, correlationKeys);
      if (!correlations.has(key)) {
        correlations.set(key, []);
      }
      correlations.get(key)!.push(event);
    }

    return correlations;
  }

  /**
   * Get all pattern matches
   */
  getMatches(): PatternMatch[] {
    return [...this.matches];
  }

  /**
   * Get all detected anomalies
   */
  getAnomalies(): Anomaly[] {
    return [...this.anomalies];
  }

  /**
   * Clear all matches and anomalies
   */
  clear(): void {
    this.matches = [];
    this.anomalies = [];
    this.eventBuffer = [];
  }

  // ============================================================================
  // Pattern Detection
  // ============================================================================

  private async detectPattern(pattern: CEPPattern): Promise<PatternMatch[]> {
    switch (pattern.type) {
      case 'sequence':
        return this.detectSequencePattern(pattern);

      case 'conjunction':
        return this.detectConjunctionPattern(pattern);

      case 'disjunction':
        return this.detectDisjunctionPattern(pattern);

      case 'negation':
        return this.detectNegationPattern(pattern);

      case 'iteration':
        return this.detectIterationPattern(pattern);

      case 'temporal':
        return this.detectTemporalPattern(pattern);

      default:
        return [];
    }
  }

  private detectSequencePattern(pattern: CEPPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const { conditions, timeConstraint, quantifier } = pattern;

    // Find all possible starting points
    for (let i = 0; i < this.eventBuffer.length; i++) {
      const matchedEvents: StreamEvent[] = [];
      let currentIndex = i;

      for (const condition of conditions) {
        let found = false;

        // Search forward for matching event
        for (let j = currentIndex; j < this.eventBuffer.length; j++) {
          const event = this.eventBuffer[j];

          if (this.matchesCondition(event, condition)) {
            // Check time constraint
            if (timeConstraint && matchedEvents.length > 0) {
              const timeDiff = event.timestamp - matchedEvents[0].timestamp;
              if (timeConstraint.within && timeDiff > timeConstraint.within) {
                break;
              }
            }

            matchedEvents.push(event);
            currentIndex = j + 1;
            found = true;
            break;
          }
        }

        if (!found) {
          break;
        }
      }

      // Check if sequence is complete
      if (matchedEvents.length === conditions.length) {
        if (!quantifier || this.checkQuantifier(matchedEvents, quantifier)) {
          matches.push({
            patternId: pattern.id,
            events: matchedEvents,
            matchedAt: Date.now(),
            duration: matchedEvents[matchedEvents.length - 1].timestamp - matchedEvents[0].timestamp,
          });
        }
      }
    }

    return matches;
  }

  private detectConjunctionPattern(pattern: CEPPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const { conditions, timeConstraint } = pattern;

    // Group events by time window
    const windows = this.createTimeWindows(
      this.eventBuffer,
      timeConstraint?.within || 60000
    );

    for (const windowEvents of windows) {
      const matchedEvents: StreamEvent[] = [];

      // Check if all conditions are met within the window
      for (const condition of conditions) {
        const match = windowEvents.find((e) => this.matchesCondition(e, condition));
        if (match) {
          matchedEvents.push(match);
        }
      }

      if (matchedEvents.length === conditions.length) {
        matches.push({
          patternId: pattern.id,
          events: matchedEvents,
          matchedAt: Date.now(),
          duration: Math.max(...matchedEvents.map((e) => e.timestamp)) -
                    Math.min(...matchedEvents.map((e) => e.timestamp)),
        });
      }
    }

    return matches;
  }

  private detectDisjunctionPattern(pattern: CEPPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const { conditions, timeConstraint } = pattern;

    const windows = this.createTimeWindows(
      this.eventBuffer,
      timeConstraint?.within || 60000
    );

    for (const windowEvents of windows) {
      // Check if any condition is met
      for (const condition of conditions) {
        const match = windowEvents.find((e) => this.matchesCondition(e, condition));
        if (match) {
          matches.push({
            patternId: pattern.id,
            events: [match],
            matchedAt: Date.now(),
            duration: 0,
          });
          break; // Only one match per window
        }
      }
    }

    return matches;
  }

  private detectNegationPattern(pattern: CEPPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    if (pattern.conditions.length < 2) return matches;

    const positiveCondition = pattern.conditions[0];
    const negativeCondition = pattern.conditions[1];

    for (let i = 0; i < this.eventBuffer.length; i++) {
      const event = this.eventBuffer[i];

      if (this.matchesCondition(event, positiveCondition)) {
        // Check if negative condition does NOT occur within time window
        const timeWindow = pattern.timeConstraint?.within || 60000;
        let negativeFound = false;

        for (let j = i + 1; j < this.eventBuffer.length; j++) {
          const nextEvent = this.eventBuffer[j];
          if (nextEvent.timestamp - event.timestamp > timeWindow) {
            break;
          }

          if (this.matchesCondition(nextEvent, negativeCondition)) {
            negativeFound = true;
            break;
          }
        }

        if (!negativeFound) {
          matches.push({
            patternId: pattern.id,
            events: [event],
            matchedAt: Date.now(),
            duration: 0,
          });
        }
      }
    }

    return matches;
  }

  private detectIterationPattern(pattern: CEPPattern): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const { conditions, quantifier, timeConstraint } = pattern;

    if (conditions.length === 0 || !quantifier) return matches;

    const condition = conditions[0];
    const target = quantifier.exactly || quantifier.min || 1;

    for (let i = 0; i < this.eventBuffer.length; i++) {
      const matchedEvents: StreamEvent[] = [];
      let currentIndex = i;

      while (currentIndex < this.eventBuffer.length) {
        const event = this.eventBuffer[currentIndex];

        if (this.matchesCondition(event, condition)) {
          if (timeConstraint?.within && matchedEvents.length > 0) {
            const timeDiff = event.timestamp - matchedEvents[0].timestamp;
            if (timeDiff > timeConstraint.within) {
              break;
            }
          }

          matchedEvents.push(event);

          if (quantifier.exactly && matchedEvents.length === quantifier.exactly) {
            break;
          }
          if (quantifier.max && matchedEvents.length >= quantifier.max) {
            break;
          }
        }

        currentIndex++;
      }

      if (matchedEvents.length >= target) {
        matches.push({
          patternId: pattern.id,
          events: matchedEvents,
          matchedAt: Date.now(),
          duration: matchedEvents[matchedEvents.length - 1].timestamp - matchedEvents[0].timestamp,
        });
      }
    }

    return matches;
  }

  private detectTemporalPattern(pattern: CEPPattern): PatternMatch[] {
    // Similar to sequence but with strict time ordering
    return this.detectSequencePattern(pattern);
  }

  // ============================================================================
  // Anomaly Detection
  // ============================================================================

  private detectZScoreAnomalies(
    events: StreamEvent[],
    config: AnomalyDetectionConfig
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const values = events.map((e) => this.extractNumericValue(e, config.field));

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    const threshold = config.threshold || 3; // 3 standard deviations

    events.forEach((event, index) => {
      const value = values[index];
      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > threshold) {
        anomalies.push({
          event,
          score: zScore,
          method: 'zscore',
          detectedAt: Date.now(),
          context: events.slice(Math.max(0, index - config.windowSize), index + 1),
        });
      }
    });

    return anomalies;
  }

  private detectIQRAnomalies(
    events: StreamEvent[],
    config: AnomalyDetectionConfig
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const values = events.map((e) => this.extractNumericValue(e, config.field)).sort((a, b) => a - b);

    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    events.forEach((event, index) => {
      const value = this.extractNumericValue(event, config.field);

      if (value < lowerBound || value > upperBound) {
        const score = Math.max(
          Math.abs(value - lowerBound) / iqr,
          Math.abs(value - upperBound) / iqr
        );

        anomalies.push({
          event,
          score,
          method: 'iqr',
          detectedAt: Date.now(),
          context: events.slice(Math.max(0, index - config.windowSize), index + 1),
        });
      }
    });

    return anomalies;
  }

  private detectOutliers(
    events: StreamEvent[],
    config: AnomalyDetectionConfig
  ): Anomaly[] {
    // Simplified outlier detection using distance-based method
    const anomalies: Anomaly[] = [];
    const values = events.map((e) => this.extractNumericValue(e, config.field));

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    events.forEach((event, index) => {
      const value = values[index];
      const distance = Math.abs(value - mean);

      // Normalize by mean
      const score = distance / (mean || 1);

      if (score > (config.sensitivity || 5)) {
        anomalies.push({
          event,
          score,
          method: 'isolation-forest',
          detectedAt: Date.now(),
          context: events.slice(Math.max(0, index - config.windowSize), index + 1),
        });
      }
    });

    return anomalies;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private matchesCondition(event: StreamEvent, condition: PatternCondition): boolean {
    if (condition.eventType && event.metadata?.type !== condition.eventType) {
      return false;
    }

    if (condition.filter) {
      return this.evaluateFilter(event, condition.filter);
    }

    return true;
  }

  private evaluateFilter(event: StreamEvent, filter: FilterCondition): boolean {
    const value = this.getNestedValue(event.value, filter.field);

    let result = false;

    switch (filter.operator) {
      case 'eq':
        result = value === filter.value;
        break;
      case 'ne':
        result = value !== filter.value;
        break;
      case 'gt':
        result = value > filter.value;
        break;
      case 'gte':
        result = value >= filter.value;
        break;
      case 'lt':
        result = value < filter.value;
        break;
      case 'lte':
        result = value <= filter.value;
        break;
      case 'in':
        result = Array.isArray(filter.value) && filter.value.includes(value);
        break;
      case 'contains':
        result = String(value).includes(String(filter.value));
        break;
      case 'regex':
        result = new RegExp(filter.value).test(String(value));
        break;
    }

    if (filter.next) {
      const nextResult = this.evaluateFilter(event, filter.next);
      return filter.logicalOp === 'and' ? result && nextResult : result || nextResult;
    }

    return result;
  }

  private checkQuantifier(events: StreamEvent[], quantifier: Quantifier): boolean {
    const count = events.length;

    if (quantifier.exactly !== undefined) {
      return count === quantifier.exactly;
    }

    if (quantifier.min !== undefined && count < quantifier.min) {
      return false;
    }

    if (quantifier.max !== undefined && count > quantifier.max) {
      return false;
    }

    return true;
  }

  private createTimeWindows(events: StreamEvent[], windowSize: number): StreamEvent[][] {
    if (events.length === 0) return [];

    const windows: StreamEvent[][] = [];
    let currentWindow: StreamEvent[] = [];
    let windowStart = events[0].timestamp;

    for (const event of events) {
      if (event.timestamp - windowStart <= windowSize) {
        currentWindow.push(event);
      } else {
        if (currentWindow.length > 0) {
          windows.push(currentWindow);
        }
        currentWindow = [event];
        windowStart = event.timestamp;
      }
    }

    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  private extractCorrelationKey(event: StreamEvent, keys: string[]): string {
    const values = keys.map((key) => this.getNestedValue(event.value, key));
    return JSON.stringify(values);
  }

  private extractNumericValue(event: StreamEvent, field: string): number {
    const value = this.getNestedValue(event.value, field);
    return Number(value) || 0;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// ============================================================================
// Pattern Builder
// ============================================================================

export class PatternBuilder {
  private pattern: Partial<CEPPattern> = {};

  constructor(id: string) {
    this.pattern.id = id;
  }

  /**
   * Create sequence pattern (A followed by B)
   */
  sequence(...conditions: PatternCondition[]): this {
    this.pattern.type = 'sequence';
    this.pattern.conditions = conditions;
    return this;
  }

  /**
   * Create conjunction pattern (A and B together)
   */
  conjunction(...conditions: PatternCondition[]): this {
    this.pattern.type = 'conjunction';
    this.pattern.conditions = conditions;
    return this;
  }

  /**
   * Create disjunction pattern (A or B)
   */
  disjunction(...conditions: PatternCondition[]): this {
    this.pattern.type = 'disjunction';
    this.pattern.conditions = conditions;
    return this;
  }

  /**
   * Create negation pattern (A not followed by B)
   */
  negation(positive: PatternCondition, negative: PatternCondition): this {
    this.pattern.type = 'negation';
    this.pattern.conditions = [positive, negative];
    return this;
  }

  /**
   * Create iteration pattern (A repeated N times)
   */
  iteration(condition: PatternCondition, quantifier: Quantifier): this {
    this.pattern.type = 'iteration';
    this.pattern.conditions = [condition];
    this.pattern.quantifier = quantifier;
    return this;
  }

  /**
   * Add time constraint
   */
  within(milliseconds: number): this {
    this.pattern.timeConstraint = { within: milliseconds };
    return this;
  }

  /**
   * Build the pattern
   */
  build(): CEPPattern {
    if (!this.pattern.type || !this.pattern.conditions) {
      throw new Error('Pattern type and conditions are required');
    }
    return this.pattern as CEPPattern;
  }
}

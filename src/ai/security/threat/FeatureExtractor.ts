/**
 * Feature Extraction for Security Events
 * Extracts numerical, categorical, temporal, and behavioral features
 * @module threat/FeatureExtractor
 */

import type { SecurityEvent, SecurityFeatures } from './types';

/**
 * Baseline metrics for deviation calculations
 */
export interface BaselineMetrics {
  avgEventRate: number;
  avgFailureRate: number;
  avgPortDiversity: number;
  stdEventRate: number;
  stdFailureRate: number;
}

/**
 * Default baseline values
 */
export const DEFAULT_BASELINE: BaselineMetrics = {
  avgEventRate: 10,
  avgFailureRate: 0.05,
  avgPortDiversity: 3,
  stdEventRate: 5,
  stdFailureRate: 0.02,
};

/**
 * Suspicious protocol list
 */
const SUSPICIOUS_PROTOCOLS = ['telnet', 'ftp', 'http'];

/**
 * Feature Extractor for security events
 */
export class FeatureExtractor {
  private baseline: BaselineMetrics;

  constructor(baseline: Partial<BaselineMetrics> = {}) {
    this.baseline = { ...DEFAULT_BASELINE, ...baseline };
  }

  /**
   * Extract features from security event and recent history
   */
  extractFeatures(event: SecurityEvent, recentEvents: SecurityEvent[]): SecurityFeatures {
    // Numerical features
    const eventCount = recentEvents.length;
    const eventsPerHour = this.calculateEventsPerHour(recentEvents);
    const failureRate = this.calculateFailureRate(recentEvents);
    const avgPayloadSize = this.calculateAvgPayloadSize(recentEvents);
    const portDiversity = this.calculatePortDiversity(recentEvents);
    const protocolDiversity = this.calculateProtocolDiversity(recentEvents);
    const timeSinceLast = recentEvents.length > 0
      ? event.timestamp - recentEvents[recentEvents.length - 1].timestamp
      : 0;

    // Categorical features
    const eventTypes = this.aggregateStringField(recentEvents, 'eventType');
    const sourceCountries = new Map<string, number>(); // Placeholder for GeoIP
    const targetPorts = this.aggregatePortField(recentEvents);
    const protocols = this.aggregateStringField(recentEvents, 'protocol');

    // Temporal features
    const now = new Date(event.timestamp);
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isBusinessHours = hour >= 9 && hour < 17;
    const weekendActivity = dayOfWeek === 0 || dayOfWeek === 6;

    // Behavioral features
    const eventRateDeviation = this.calculateDeviation(
      eventsPerHour,
      this.baseline.avgEventRate,
      this.baseline.stdEventRate
    );
    const failureRateDeviation = this.calculateDeviation(
      failureRate,
      this.baseline.avgFailureRate,
      this.baseline.stdFailureRate
    );
    const portDiversityAnomaly = this.calculateDeviation(
      portDiversity,
      this.baseline.avgPortDiversity,
      1
    );

    // Network features
    const uniqueSourceIPs = new Set(recentEvents.map(e => e.sourceIP)).size;
    const uniqueTargetIPs = new Set(recentEvents.map(e => e.targetIP)).size;
    const geoIPMismatches = this.detectGeoIPMismatches(recentEvents);
    const suspiciousProtocols = this.countSuspiciousProtocols(recentEvents);

    return {
      eventCount,
      eventsPerHour,
      failureRate,
      avgPayloadSize,
      portDiversity,
      protocolDiversity,
      timeSinceLast,
      eventTypes,
      sourceCountries,
      targetPorts,
      protocols,
      hour,
      dayOfWeek,
      isBusinessHours,
      weekendActivity,
      eventRateDeviation,
      failureRateDeviation,
      portDiversityAnomaly,
      uniqueSourceIPs,
      uniqueTargetIPs,
      geoIPMismatches,
      suspiciousProtocols,
    };
  }

  /**
   * Update baseline metrics
   */
  updateBaseline(metrics: Partial<BaselineMetrics>): void {
    this.baseline = { ...this.baseline, ...metrics };
  }

  /**
   * Get current baseline
   */
  getBaseline(): BaselineMetrics {
    return { ...this.baseline };
  }

  /**
   * Calculate events per hour
   */
  private calculateEventsPerHour(events: SecurityEvent[]): number {
    if (events.length < 2) return 0;
    const timeRange = events[events.length - 1].timestamp - events[0].timestamp;
    const hours = timeRange / (1000 * 60 * 60);
    return hours > 0 ? events.length / hours : 0;
  }

  /**
   * Calculate failure rate
   */
  private calculateFailureRate(events: SecurityEvent[]): number {
    if (events.length === 0) return 0;
    const failures = events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
    return failures / events.length;
  }

  /**
   * Calculate average payload size
   */
  private calculateAvgPayloadSize(events: SecurityEvent[]): number {
    const payloads = events.filter(e => e.payload);
    if (payloads.length === 0) return 0;
    const totalSize = payloads.reduce((sum, e) => sum + (e.payload?.length || 0), 0);
    return totalSize / payloads.length;
  }

  /**
   * Calculate port diversity
   */
  private calculatePortDiversity(events: SecurityEvent[]): number {
    const ports = new Set(events.filter(e => e.port).map(e => e.port));
    return ports.size;
  }

  /**
   * Calculate protocol diversity
   */
  private calculateProtocolDiversity(events: SecurityEvent[]): number {
    const protocols = new Set(events.filter(e => e.protocol).map(e => e.protocol));
    return protocols.size;
  }

  /**
   * Calculate standard deviation from baseline
   */
  private calculateDeviation(value: number, baseline: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return Math.abs(value - baseline) / stdDev;
  }

  /**
   * Aggregate string field values
   */
  private aggregateStringField(events: SecurityEvent[], field: keyof SecurityEvent): Map<string, number> {
    const map = new Map<string, number>();
    for (const event of events) {
      const value = event[field];
      if (typeof value === 'string') {
        map.set(value, (map.get(value) || 0) + 1);
      }
    }
    return map;
  }

  /**
   * Aggregate port field values
   */
  private aggregatePortField(events: SecurityEvent[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const event of events) {
      if (event.port !== undefined) {
        map.set(event.port, (map.get(event.port) || 0) + 1);
      }
    }
    return map;
  }

  /**
   * Detect geo-IP mismatches
   */
  private detectGeoIPMismatches(events: SecurityEvent[]): number {
    let mismatches = 0;
    for (let i = 1; i < events.length; i++) {
      const timeDiff = events[i].timestamp - events[i - 1].timestamp;
      if (timeDiff < 1000 && events[i].sourceIP !== events[i - 1].sourceIP) {
        mismatches++;
      }
    }
    return mismatches;
  }

  /**
   * Count suspicious protocols
   */
  private countSuspiciousProtocols(events: SecurityEvent[]): number {
    return events.filter(e => SUSPICIOUS_PROTOCOLS.includes(e.protocol?.toLowerCase() || '')).length;
  }
}

export default FeatureExtractor;

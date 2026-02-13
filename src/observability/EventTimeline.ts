/**
 * Event Timeline
 * Real-time event stream visualization with filtering and pattern highlighting
 *
 * Features:
 * - Real-time event stream
 * - Timeline with zoom and pan
 * - Event filtering and search
 * - Pattern highlighting
 * - Event correlation
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

/**
 * Event type
 */
export type EventType =
  | 'execution'
  | 'node'
  | 'agent'
  | 'device'
  | 'deployment'
  | 'alert'
  | 'metric'
  | 'error'
  | 'user'
  | 'system';

/**
 * Event severity
 */
export type EventSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  timestamp: number;
  source: string;
  title: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  correlationId?: string;
  userId?: string;
  workflowId?: string;
  executionId?: string;
  agentId?: string;
  deviceId?: string;
}

/**
 * Event filter
 */
export interface EventFilter {
  types?: EventType[];
  severities?: EventSeverity[];
  sources?: string[];
  tags?: string[];
  search?: string;
  startTime?: number;
  endTime?: number;
  correlationId?: string;
  userId?: string;
  workflowId?: string;
  executionId?: string;
}

/**
 * Event pattern
 */
export interface EventPattern {
  id: string;
  name: string;
  description: string;
  events: TimelineEvent[];
  frequency: number;
  confidence: number; // 0-100
  firstSeen: number;
  lastSeen: number;
}

/**
 * Event correlation
 */
export interface EventCorrelation {
  id: string;
  events: TimelineEvent[];
  type: 'sequential' | 'concurrent' | 'causation';
  confidence: number;
  timeSpan: number;
}

/**
 * Timeline range
 */
export interface TimelineRange {
  start: number;
  end: number;
  zoom: number; // 0-100, where 100 is most zoomed in
}

/**
 * Event Timeline Manager
 */
export class EventTimeline extends EventEmitter {
  private events: TimelineEvent[] = [];
  private maxEventCount = 100000;
  private patterns: EventPattern[] = [];
  private correlations: EventCorrelation[] = [];
  private patternAnalysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startPatternAnalysis();
    logger.info('EventTimeline initialized');
  }

  /**
   * Add event to timeline
   */
  addEvent(event: Omit<TimelineEvent, 'id' | 'timestamp'>): string {
    const fullEvent: TimelineEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };

    this.events.push(fullEvent);

    // Limit event count
    if (this.events.length > this.maxEventCount) {
      this.events = this.events.slice(-this.maxEventCount);
    }

    // Emit real-time update
    this.emit('event:added', { event: fullEvent });

    logger.debug('Event added to timeline', {
      id: fullEvent.id,
      type: fullEvent.type,
      severity: fullEvent.severity
    });

    return fullEvent.id;
  }

  /**
   * Add multiple events
   */
  addEvents(events: Array<Omit<TimelineEvent, 'id' | 'timestamp'>>): string[] {
    const ids: string[] = [];

    for (const event of events) {
      ids.push(this.addEvent(event));
    }

    return ids;
  }

  /**
   * Get events
   */
  getEvents(filter?: EventFilter, limit?: number): TimelineEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      filteredEvents = this.filterEvents(filteredEvents, filter);
    }

    // Sort by timestamp descending (newest first)
    filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

    if (limit !== undefined) {
      filteredEvents = filteredEvents.slice(0, limit);
    }

    return filteredEvents;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): TimelineEvent | null {
    return this.events.find(e => e.id === eventId) || null;
  }

  /**
   * Get events in time range
   */
  getEventsInRange(start: number, end: number): TimelineEvent[] {
    return this.events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Get correlated events
   */
  getCorrelatedEvents(correlationId: string): TimelineEvent[] {
    return this.events.filter(e => e.correlationId === correlationId);
  }

  /**
   * Search events
   */
  searchEvents(query: string): TimelineEvent[] {
    const lowerQuery = query.toLowerCase();

    return this.events.filter(event => {
      return (
        event.title.toLowerCase().includes(lowerQuery) ||
        event.description?.toLowerCase().includes(lowerQuery) ||
        event.source.toLowerCase().includes(lowerQuery) ||
        event.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Get event patterns
   */
  getPatterns(minConfidence: number = 50): EventPattern[] {
    return this.patterns.filter(p => p.confidence >= minConfidence);
  }

  /**
   * Get event correlations
   */
  getCorrelations(minConfidence: number = 50): EventCorrelation[] {
    return this.correlations.filter(c => c.confidence >= minConfidence);
  }

  /**
   * Get timeline statistics
   */
  getStatistics(timeRange?: { start: number; end: number }): {
    totalEvents: number;
    eventsByType: Record<EventType, number>;
    eventsBySeverity: Record<EventSeverity, number>;
    eventsPerHour: number;
    topSources: Array<{ source: string; count: number }>;
    topTags: Array<{ tag: string; count: number }>;
  } {
    let events = this.events;

    if (timeRange) {
      events = events.filter(
        e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const totalEvents = events.length;

    // Events by type
    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    // Events by severity
    const eventsBySeverity: Record<string, number> = {};
    for (const event of events) {
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    // Events per hour
    const timeSpan = timeRange
      ? timeRange.end - timeRange.start
      : events.length > 0
      ? events[events.length - 1].timestamp - events[0].timestamp
      : 0;
    const hours = timeSpan / (1000 * 60 * 60);
    const eventsPerHour = hours > 0 ? totalEvents / hours : 0;

    // Top sources
    const sourceCounts = new Map<string, number>();
    for (const event of events) {
      sourceCounts.set(event.source, (sourceCounts.get(event.source) || 0) + 1);
    }
    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top tags
    const tagCounts = new Map<string, number>();
    for (const event of events) {
      if (event.tags) {
        for (const tag of event.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents,
      eventsByType: eventsByType as Record<EventType, number>,
      eventsBySeverity: eventsBySeverity as Record<EventSeverity, number>,
      eventsPerHour,
      topSources,
      topTags
    };
  }

  /**
   * Get timeline buckets for visualization
   */
  getTimelineBuckets(
    start: number,
    end: number,
    bucketCount: number = 50
  ): Array<{
    timestamp: number;
    count: number;
    eventsBySeverity: Record<EventSeverity, number>;
  }> {
    const bucketSize = (end - start) / bucketCount;
    const buckets: Array<{
      timestamp: number;
      count: number;
      eventsBySeverity: Record<EventSeverity, number>;
    }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = start + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;

      const bucketEvents = this.events.filter(
        e => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );

      const eventsBySeverity: Record<string, number> = {};
      for (const event of bucketEvents) {
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      }

      buckets.push({
        timestamp: bucketStart,
        count: bucketEvents.length,
        eventsBySeverity: eventsBySeverity as Record<EventSeverity, number>
      });
    }

    return buckets;
  }

  /**
   * Export events
   */
  exportEvents(
    filter?: EventFilter,
    format: 'json' | 'csv' = 'json'
  ): string {
    const events = this.getEvents(filter);

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else {
      // CSV format
      const headers = [
        'id',
        'type',
        'severity',
        'timestamp',
        'source',
        'title',
        'description',
        'tags'
      ];

      const rows = events.map(event => [
        event.id,
        event.type,
        event.severity,
        new Date(event.timestamp).toISOString(),
        event.source,
        event.title,
        event.description || '',
        event.tags?.join(';') || ''
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
    }
  }

  /**
   * Clear events
   */
  clearEvents(olderThan?: number): void {
    if (olderThan !== undefined) {
      this.events = this.events.filter(e => e.timestamp >= olderThan);
    } else {
      this.events = [];
    }

    logger.info('Timeline events cleared');
  }

  /**
   * Shutdown timeline
   */
  shutdown(): void {
    if (this.patternAnalysisInterval) {
      clearInterval(this.patternAnalysisInterval);
      this.patternAnalysisInterval = null;
    }

    this.removeAllListeners();
    logger.info('EventTimeline shutdown');
  }

  // Private methods

  private filterEvents(events: TimelineEvent[], filter: EventFilter): TimelineEvent[] {
    return events.filter(event => {
      if (filter.types && !filter.types.includes(event.type)) {
        return false;
      }

      if (filter.severities && !filter.severities.includes(event.severity)) {
        return false;
      }

      if (filter.sources && !filter.sources.includes(event.source)) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const eventTags = event.tags || [];
        if (!filter.tags.some(tag => eventTags.includes(tag))) {
          return false;
        }
      }

      if (filter.search) {
        const lowerSearch = filter.search.toLowerCase();
        const matches =
          event.title.toLowerCase().includes(lowerSearch) ||
          event.description?.toLowerCase().includes(lowerSearch) ||
          event.source.toLowerCase().includes(lowerSearch);
        if (!matches) return false;
      }

      if (filter.startTime && event.timestamp < filter.startTime) {
        return false;
      }

      if (filter.endTime && event.timestamp > filter.endTime) {
        return false;
      }

      if (filter.correlationId && event.correlationId !== filter.correlationId) {
        return false;
      }

      if (filter.userId && event.userId !== filter.userId) {
        return false;
      }

      if (filter.workflowId && event.workflowId !== filter.workflowId) {
        return false;
      }

      if (filter.executionId && event.executionId !== filter.executionId) {
        return false;
      }

      return true;
    });
  }

  private startPatternAnalysis(): void {
    // Analyze patterns every 60 seconds
    this.patternAnalysisInterval = setInterval(() => {
      this.analyzePatterns();
      this.detectCorrelations();
    }, 60000);
  }

  private analyzePatterns(): void {
    // Group events by type and source
    const groupMap = new Map<string, TimelineEvent[]>();

    for (const event of this.events) {
      const key = `${event.type}-${event.source}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(event);
    }

    // Analyze each group
    const newPatterns: EventPattern[] = [];

    for (const [key, events] of groupMap) {
      if (events.length < 10) continue; // Need minimum events

      const [type, source] = key.split('-');

      // Calculate frequency (events per hour)
      const timeSpan = events[events.length - 1].timestamp - events[0].timestamp;
      const hours = timeSpan / (1000 * 60 * 60);
      const frequency = hours > 0 ? events.length / hours : 0;

      // Calculate confidence based on regularity
      const confidence = this.calculatePatternConfidence(events);

      newPatterns.push({
        id: `pattern-${key}-${Date.now()}`,
        name: `${type} events from ${source}`,
        description: `Regular pattern of ${type} events`,
        events: events.slice(-100), // Keep last 100
        frequency,
        confidence,
        firstSeen: events[0].timestamp,
        lastSeen: events[events.length - 1].timestamp
      });
    }

    this.patterns = newPatterns;

    logger.debug('Event patterns analyzed', {
      patternsFound: newPatterns.length
    });
  }

  private calculatePatternConfidence(events: TimelineEvent[]): number {
    if (events.length < 2) return 0;

    // Calculate time intervals between events
    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push(events[i].timestamp - events[i - 1].timestamp);
    }

    // Calculate standard deviation
    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher confidence
    const coefficientOfVariation = stdDev / mean;
    const confidence = Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)));

    return confidence;
  }

  private detectCorrelations(): void {
    const newCorrelations: EventCorrelation[] = [];
    const timeWindow = 60000; // 1 minute

    // Look for events with same correlation ID
    const correlationMap = new Map<string, TimelineEvent[]>();

    for (const event of this.events) {
      if (event.correlationId) {
        if (!correlationMap.has(event.correlationId)) {
          correlationMap.set(event.correlationId, []);
        }
        correlationMap.get(event.correlationId)!.push(event);
      }
    }

    // Create correlations
    for (const [correlationId, events] of correlationMap) {
      if (events.length < 2) continue;

      // Sort by timestamp
      events.sort((a, b) => a.timestamp - b.timestamp);

      const timeSpan = events[events.length - 1].timestamp - events[0].timestamp;

      // Determine correlation type
      let type: EventCorrelation['type'] = 'sequential';
      if (timeSpan < 1000) {
        type = 'concurrent'; // Events within 1 second
      } else if (events.length > 2) {
        type = 'causation'; // Chain of events
      }

      newCorrelations.push({
        id: correlationId,
        events,
        type,
        confidence: 100, // Explicit correlation ID = high confidence
        timeSpan
      });
    }

    this.correlations = newCorrelations;

    logger.debug('Event correlations detected', {
      correlationsFound: newCorrelations.length
    });
  }
}

/**
 * Global event timeline instance
 */
export const globalEventTimeline = new EventTimeline();

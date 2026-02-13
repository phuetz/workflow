/**
 * Performance Profiler
 * Tracks and analyzes performance metrics for workflow execution
 */

import type {
  NodePerformanceMetrics,
  TimelineEvent,
  ProfilerStatistics,
  FlameGraphNode,
  PerformanceRecommendation,
  NodeExecutionStatus
} from '../types/debugging';

export class Profiler {
  private metrics: Map<string, NodePerformanceMetrics> = new Map();
  private timeline: TimelineEvent[] = [];
  private executionTimes: Map<string, number[]> = new Map();
  private networkCalls: Map<string, number> = new Map();
  private databaseCalls: Map<string, number> = new Map();
  private startTime = 0;
  private enabled = true;

  /**
   * Start profiling session
   */
  start(): void {
    this.startTime = performance.now();
    this.enabled = true;
  }

  /**
   * Stop profiling session
   */
  stop(): void {
    this.enabled = false;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.timeline = [];
    this.executionTimes.clear();
    this.networkCalls.clear();
    this.databaseCalls.clear();
    this.startTime = 0;
  }

  /**
   * Record node execution start
   */
  startNode(nodeId: string, nodeName: string, depth: number = 0): string {
    if (!this.enabled) return '';

    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const event: TimelineEvent = {
      id: eventId,
      nodeId,
      nodeName,
      startTime: performance.now(),
      status: 'running',
      depth,
      parallel: false
    };

    this.timeline.push(event);
    return eventId;
  }

  /**
   * Record node execution end
   */
  endNode(
    eventId: string,
    status: NodeExecutionStatus = 'completed',
    cpuUsage = 0,
    memoryUsage = 0
  ): void {
    if (!this.enabled) return;

    const event = this.timeline.find(e => e.id === eventId);
    if (!event) return;

    event.endTime = performance.now();
    event.duration = event.endTime - event.startTime;
    event.status = status;

    // Update metrics
    this.updateMetrics(
      event.nodeId,
      event.nodeName,
      event.duration,
      cpuUsage,
      memoryUsage
    );
  }

  /**
   * Update node metrics
   */
  private updateMetrics(
    nodeId: string,
    nodeName: string,
    duration: number,
    cpuUsage: number,
    memoryUsage: number
  ): void {
    let metrics = this.metrics.get(nodeId);

    if (!metrics) {
      metrics = {
        nodeId,
        nodeName,
        executionCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        medianTime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        networkRequests: 0,
        networkTime: 0,
        databaseQueries: 0,
        databaseTime: 0
      };
      this.metrics.set(nodeId, metrics);
    }

    // Update execution count and times
    metrics.executionCount++;
    metrics.totalTime += duration;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.avgTime = metrics.totalTime / metrics.executionCount;
    metrics.cpuUsage = cpuUsage;
    metrics.memoryUsage = memoryUsage;

    // Track execution times for median calculation
    const times = this.executionTimes.get(nodeId) || [];
    times.push(duration);
    this.executionTimes.set(nodeId, times);
    metrics.medianTime = this.calculateMedian(times);

    // Update network and database metrics
    metrics.networkRequests = this.networkCalls.get(nodeId) || 0;
    metrics.databaseQueries = this.databaseCalls.get(nodeId) || 0;
  }

  /**
   * Record network request
   */
  recordNetworkRequest(nodeId: string, duration: number): void {
    if (!this.enabled) return;

    this.networkCalls.set(nodeId, (this.networkCalls.get(nodeId) || 0) + 1);

    const metrics = this.metrics.get(nodeId);
    if (metrics) {
      metrics.networkRequests++;
      metrics.networkTime += duration;
    }
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(nodeId: string, duration: number): void {
    if (!this.enabled) return;

    this.databaseCalls.set(nodeId, (this.databaseCalls.get(nodeId) || 0) + 1);

    const metrics = this.metrics.get(nodeId);
    if (metrics) {
      metrics.databaseQueries++;
      metrics.databaseTime += duration;
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): ProfilerStatistics {
    const totalExecutionTime = this.timeline.reduce(
      (sum, event) => sum + (event.duration || 0),
      0
    );

    const totalCPUTime = Array.from(this.metrics.values()).reduce(
      (sum, m) => sum + m.cpuUsage,
      0
    );

    const totalMemoryUsed = Array.from(this.metrics.values()).reduce(
      (sum, m) => sum + m.memoryUsage,
      0
    );

    const totalNetworkRequests = Array.from(this.metrics.values()).reduce(
      (sum, m) => sum + m.networkRequests,
      0
    );

    const totalDatabaseQueries = Array.from(this.metrics.values()).reduce(
      (sum, m) => sum + m.databaseQueries,
      0
    );

    const bottlenecks = this.identifyBottlenecks();
    const recommendations = this.generateRecommendations();

    return {
      totalExecutionTime,
      totalCPUTime,
      totalMemoryUsed,
      totalNetworkRequests,
      totalDatabaseQueries,
      nodeMetrics: this.metrics,
      timeline: this.timeline,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const avgTotalTime =
      Array.from(this.metrics.values()).reduce((sum, m) => sum + m.avgTime, 0) /
      this.metrics.size;

    // Nodes taking > 2x average time are bottlenecks
    this.metrics.forEach((metrics, nodeId) => {
      if (metrics.avgTime > avgTotalTime * 2) {
        bottlenecks.push(nodeId);
      }
    });

    return bottlenecks;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    this.metrics.forEach(metrics => {
      // Slow execution
      if (metrics.avgTime > 500) {
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: metrics.avgTime > 2000 ? 'critical' : 'warning',
          nodeId: metrics.nodeId,
          nodeName: metrics.nodeName,
          type: 'slow-execution',
          message: `Node "${metrics.nodeName}" is slow (avg: ${metrics.avgTime.toFixed(0)}ms)`,
          suggestion: 'Consider caching results or optimizing the operation',
          metrics: {
            current: metrics.avgTime,
            threshold: 500,
            unit: 'ms'
          }
        });
      }

      // High memory usage
      if (metrics.memoryUsage > 100 * 1024 * 1024) {
        // 100MB
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: metrics.memoryUsage > 500 * 1024 * 1024 ? 'critical' : 'warning',
          nodeId: metrics.nodeId,
          nodeName: metrics.nodeName,
          type: 'high-memory',
          message: `Node "${metrics.nodeName}" uses high memory (${(
            metrics.memoryUsage /
            1024 /
            1024
          ).toFixed(0)}MB)`,
          suggestion: 'Optimize data structures or process data in chunks',
          metrics: {
            current: metrics.memoryUsage,
            threshold: 100 * 1024 * 1024,
            unit: 'bytes'
          }
        });
      }

      // Too many network requests
      if (metrics.networkRequests > 10) {
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: metrics.networkRequests > 50 ? 'critical' : 'warning',
          nodeId: metrics.nodeId,
          nodeName: metrics.nodeName,
          type: 'too-many-requests',
          message: `Node "${metrics.nodeName}" makes too many network requests (${metrics.networkRequests})`,
          suggestion: 'Implement batching or caching to reduce API calls',
          metrics: {
            current: metrics.networkRequests,
            threshold: 10,
            unit: 'requests'
          }
        });
      }

      // Inefficient queries
      if (metrics.databaseQueries > 10) {
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: metrics.databaseQueries > 50 ? 'critical' : 'warning',
          nodeId: metrics.nodeId,
          nodeName: metrics.nodeName,
          type: 'inefficient-query',
          message: `Node "${metrics.nodeName}" executes too many database queries (${metrics.databaseQueries})`,
          suggestion: 'Use batch queries or optimize with indexes',
          metrics: {
            current: metrics.databaseQueries,
            threshold: 10,
            unit: 'queries'
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate flame graph
   */
  generateFlameGraph(): FlameGraphNode {
    const root: FlameGraphNode = {
      name: 'Workflow',
      value: 0,
      children: []
    };

    // Group timeline events by depth
    const eventsByDepth = new Map<number, TimelineEvent[]>();
    this.timeline.forEach(event => {
      if (!eventsByDepth.has(event.depth)) {
        eventsByDepth.set(event.depth, []);
      }
      eventsByDepth.get(event.depth)!.push(event);
    });

    // Build flame graph from depth 0
    const depth0Events = eventsByDepth.get(0) || [];
    depth0Events.forEach(event => {
      if (event.duration) {
        root.children.push(this.createFlameNode(event, eventsByDepth));
        root.value += event.duration;
      }
    });

    return root;
  }

  /**
   * Create flame graph node
   */
  private createFlameNode(
    event: TimelineEvent,
    eventsByDepth: Map<number, TimelineEvent[]>
  ): FlameGraphNode {
    const node: FlameGraphNode = {
      name: event.nodeName,
      value: event.duration || 0,
      children: [],
      nodeId: event.nodeId,
      color: this.getFlameColor(event.status)
    };

    // Find children at next depth level
    const childEvents = (eventsByDepth.get(event.depth + 1) || []).filter(
      child =>
        child.startTime >= event.startTime &&
        (child.endTime || 0) <= (event.endTime || Infinity)
    );

    childEvents.forEach(childEvent => {
      node.children.push(this.createFlameNode(childEvent, eventsByDepth));
    });

    return node;
  }

  /**
   * Get color for flame graph based on status
   */
  private getFlameColor(status: NodeExecutionStatus): string {
    const colors: Record<NodeExecutionStatus, string> = {
      pending: '#9CA3AF',
      running: '#3B82F6',
      completed: '#10B981',
      failed: '#EF4444',
      skipped: '#6B7280'
    };
    return colors[status] || '#9CA3AF';
  }

  /**
   * Calculate median
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Get node metrics
   */
  getNodeMetrics(nodeId: string): NodePerformanceMetrics | null {
    return this.metrics.get(nodeId) || null;
  }

  /**
   * Get timeline
   */
  getTimeline(): TimelineEvent[] {
    return [...this.timeline];
  }

  /**
   * Export profiling data
   */
  export(): ProfilerExport {
    return {
      startTime: this.startTime,
      metrics: Array.from(this.metrics.values()),
      timeline: this.timeline,
      statistics: this.getStatistics()
    };
  }

  /**
   * Import profiling data
   */
  import(data: ProfilerExport): void {
    this.startTime = data.startTime;
    this.timeline = data.timeline;

    this.metrics.clear();
    data.metrics.forEach(metrics => {
      this.metrics.set(metrics.nodeId, metrics);
    });
  }
}

interface ProfilerExport {
  startTime: number;
  metrics: NodePerformanceMetrics[];
  timeline: TimelineEvent[];
  statistics: ProfilerStatistics;
}

// Singleton instance
export const profiler = new Profiler();

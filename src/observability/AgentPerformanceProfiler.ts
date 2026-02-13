/**
 * Agent Performance Profiler
 *
 * Comprehensive performance profiling for AI agents including CPU, memory,
 * network, and I/O metrics. Identifies bottlenecks and provides optimization
 * recommendations.
 */

import { EventEmitter } from 'events';
import {
  PerformanceProfile,
  CPUProfile,
  MemoryProfile,
  NetworkProfile,
  Bottleneck,
  Recommendation,
  AlertSeverity,
} from './types/observability';

/**
 * Performance sample
 */
interface PerformanceSample {
  timestamp: number;
  cpu: number;
  memory: number;
  network: {
    requests: number;
    bytes: number;
    latency: number;
    errors: number;
  };
}

/**
 * Profiling session
 */
interface ProfilingSession {
  id: string;
  agentId: string;
  startTime: number;
  endTime?: number;
  samples: PerformanceSample[];
  profile?: PerformanceProfile;
}

/**
 * Agent performance profiler implementation
 */
export class AgentPerformanceProfiler extends EventEmitter {
  private sessions: Map<string, ProfilingSession>;
  private activeSessions: Map<string, string>; // agentId -> sessionId
  private samplingInterval: number = 1000; // 1 second
  private samplingIntervals: Map<string, NodeJS.Timeout>;

  constructor() {
    super();
    this.sessions = new Map();
    this.activeSessions = new Map();
    this.samplingIntervals = new Map();
  }

  /**
   * Start profiling an agent
   */
  startProfiling(agentId: string): string {
    // Stop existing session if any
    const existingSessionId = this.activeSessions.get(agentId);
    if (existingSessionId) {
      this.stopProfiling(existingSessionId);
    }

    const sessionId = this.generateSessionId();
    const session: ProfilingSession = {
      id: sessionId,
      agentId,
      startTime: Date.now(),
      samples: [],
    };

    this.sessions.set(sessionId, session);
    this.activeSessions.set(agentId, sessionId);

    // Start sampling
    const interval = setInterval(() => {
      this.collectSample(sessionId);
    }, this.samplingInterval);

    this.samplingIntervals.set(sessionId, interval);

    this.emit('profiling:started', { agentId, sessionId });

    return sessionId;
  }

  /**
   * Stop profiling and generate profile
   */
  async stopProfiling(sessionId: string): Promise<PerformanceProfile> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Profiling session not found: ${sessionId}`);
    }

    // Stop sampling
    const interval = this.samplingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.samplingIntervals.delete(sessionId);
    }

    session.endTime = Date.now();
    this.activeSessions.delete(session.agentId);

    // Generate profile
    const profile = await this.generateProfile(session);
    session.profile = profile;

    this.emit('profiling:completed', { sessionId, profile });

    return profile;
  }

  /**
   * Record a performance sample manually
   */
  recordSample(
    agentId: string,
    cpu: number,
    memoryMB: number,
    networkStats: {
      requests: number;
      bytes: number;
      latency: number;
      errors: number;
    }
  ): void {
    const sessionId = this.activeSessions.get(agentId);
    if (!sessionId) {
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.samples.push({
      timestamp: Date.now(),
      cpu,
      memory: memoryMB,
      network: networkStats,
    });
  }

  /**
   * Get profiling session
   */
  getSession(sessionId: string): ProfilingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get active session for agent
   */
  getActiveSession(agentId: string): ProfilingSession | undefined {
    const sessionId = this.activeSessions.get(agentId);
    if (!sessionId) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for an agent
   */
  getAgentSessions(agentId: string): ProfilingSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.agentId === agentId)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Compare two profiling sessions
   */
  compareSessions(
    sessionId1: string,
    sessionId2: string
  ): {
    cpuChange: number;
    memoryChange: number;
    networkChange: number;
    improvements: string[];
    regressions: string[];
  } {
    const session1 = this.sessions.get(sessionId1);
    const session2 = this.sessions.get(sessionId2);

    if (!session1?.profile || !session2?.profile) {
      throw new Error('Both sessions must have completed profiles');
    }

    const cpuChange = ((session2.profile.cpu.average - session1.profile.cpu.average) /
      session1.profile.cpu.average) * 100;

    const memoryChange = ((session2.profile.memory.averageMB - session1.profile.memory.averageMB) /
      session1.profile.memory.averageMB) * 100;

    const networkChange = ((session2.profile.network.averageLatency - session1.profile.network.averageLatency) /
      session1.profile.network.averageLatency) * 100;

    const improvements: string[] = [];
    const regressions: string[] = [];

    if (cpuChange < -5) {
      improvements.push(`CPU usage decreased by ${Math.abs(cpuChange).toFixed(1)}%`);
    } else if (cpuChange > 5) {
      regressions.push(`CPU usage increased by ${cpuChange.toFixed(1)}%`);
    }

    if (memoryChange < -5) {
      improvements.push(`Memory usage decreased by ${Math.abs(memoryChange).toFixed(1)}%`);
    } else if (memoryChange > 5) {
      regressions.push(`Memory usage increased by ${memoryChange.toFixed(1)}%`);
    }

    if (networkChange < -5) {
      improvements.push(`Network latency decreased by ${Math.abs(networkChange).toFixed(1)}%`);
    } else if (networkChange > 5) {
      regressions.push(`Network latency increased by ${networkChange.toFixed(1)}%`);
    }

    return {
      cpuChange,
      memoryChange,
      networkChange,
      improvements,
      regressions,
    };
  }

  /**
   * Get real-time metrics for an agent
   */
  getRealTimeMetrics(agentId: string): {
    cpu: number;
    memory: number;
    network: {
      requests: number;
      bytes: number;
      latency: number;
    };
  } | undefined {
    const session = this.getActiveSession(agentId);
    if (!session || session.samples.length === 0) {
      return undefined;
    }

    const lastSample = session.samples[session.samples.length - 1];
    return {
      cpu: lastSample.cpu,
      memory: lastSample.memory,
      network: {
        requests: lastSample.network.requests,
        bytes: lastSample.network.bytes,
        latency: lastSample.network.latency,
      },
    };
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    // Stop all active sampling
    for (const interval of this.samplingIntervals.values()) {
      clearInterval(interval);
    }

    this.sessions.clear();
    this.activeSessions.clear();
    this.samplingIntervals.clear();
  }

  /**
   * Collect a performance sample
   */
  private collectSample(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // In production, collect real metrics from the system
    // For now, emit an event for external collection
    this.emit('sample:needed', {
      sessionId,
      agentId: session.agentId,
      callback: (sample: PerformanceSample) => {
        session.samples.push(sample);
      },
    });
  }

  /**
   * Generate performance profile from session
   */
  private async generateProfile(session: ProfilingSession): Promise<PerformanceProfile> {
    const cpuProfile = this.analyzeCPU(session.samples);
    const memoryProfile = this.analyzeMemory(session.samples);
    const networkProfile = this.analyzeNetwork(session.samples);

    const bottlenecks = this.identifyBottlenecks(cpuProfile, memoryProfile, networkProfile);
    const recommendations = this.generateRecommendations(
      bottlenecks,
      cpuProfile,
      memoryProfile,
      networkProfile
    );

    return {
      agentId: session.agentId,
      timestamp: Date.now(),
      period: {
        start: session.startTime,
        end: session.endTime!,
      },
      cpu: cpuProfile,
      memory: memoryProfile,
      network: networkProfile,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * Analyze CPU usage
   */
  private analyzeCPU(samples: PerformanceSample[]): CPUProfile {
    const cpuValues = samples.map(s => s.cpu).sort((a, b) => a - b);

    return {
      average: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length,
      peak: Math.max(...cpuValues),
      p50: this.percentile(cpuValues, 0.5),
      p95: this.percentile(cpuValues, 0.95),
      p99: this.percentile(cpuValues, 0.99),
      samples: samples.map(s => ({ timestamp: s.timestamp, value: s.cpu })),
    };
  }

  /**
   * Analyze memory usage
   */
  private analyzeMemory(samples: PerformanceSample[]): MemoryProfile {
    const memoryValues = samples.map(s => s.memory).sort((a, b) => a - b);

    // Simple leak detection: check if memory continuously increases
    let increasingCount = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].memory > samples[i - 1].memory) {
        increasingCount++;
      }
    }
    const leakDetected = increasingCount > samples.length * 0.8;

    return {
      averageMB: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length,
      peakMB: Math.max(...memoryValues),
      p50: this.percentile(memoryValues, 0.5),
      p95: this.percentile(memoryValues, 0.95),
      p99: this.percentile(memoryValues, 0.99),
      heapUsed: memoryValues[memoryValues.length - 1],
      heapTotal: Math.max(...memoryValues) * 1.5, // Estimate
      leakDetected,
      samples: samples.map(s => ({ timestamp: s.timestamp, value: s.memory })),
    };
  }

  /**
   * Analyze network usage
   */
  private analyzeNetwork(samples: PerformanceSample[]): NetworkProfile {
    const latencies = samples.map(s => s.network.latency).sort((a, b) => a - b);

    return {
      totalRequests: samples.reduce((sum, s) => sum + s.network.requests, 0),
      totalBytes: samples.reduce((sum, s) => sum + s.network.bytes, 0),
      averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      p50: this.percentile(latencies, 0.5),
      p95: this.percentile(latencies, 0.95),
      p99: this.percentile(latencies, 0.99),
      errors: samples.reduce((sum, s) => sum + s.network.errors, 0),
      timeouts: 0, // Would track separately
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    cpu: CPUProfile,
    memory: MemoryProfile,
    network: NetworkProfile
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // CPU bottleneck
    if (cpu.p95 > 80) {
      bottlenecks.push({
        type: 'cpu',
        severity: cpu.p95 > 95 ? 'critical' : cpu.p95 > 90 ? 'high' : 'medium',
        location: 'Agent execution',
        impact: cpu.p95,
        description: `High CPU usage (P95: ${cpu.p95.toFixed(1)}%)`,
        suggestions: [
          'Optimize computational algorithms',
          'Use caching for repeated calculations',
          'Consider parallel processing',
        ],
      });
    }

    // Memory bottleneck
    if (memory.p95 > 1024) { // > 1GB
      bottlenecks.push({
        type: 'memory',
        severity: memory.p95 > 2048 ? 'critical' : memory.p95 > 1536 ? 'high' : 'medium',
        location: 'Agent memory usage',
        impact: (memory.p95 / memory.heapTotal) * 100,
        description: `High memory usage (P95: ${memory.p95.toFixed(0)}MB)`,
        suggestions: [
          'Reduce in-memory data structures',
          'Implement streaming for large datasets',
          'Clear unused references',
        ],
      });
    }

    if (memory.leakDetected) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        location: 'Memory management',
        impact: 100,
        description: 'Potential memory leak detected',
        suggestions: [
          'Review event listener cleanup',
          'Check for circular references',
          'Use WeakMap/WeakSet where appropriate',
        ],
      });
    }

    // Network bottleneck
    if (network.p95 > 1000) { // > 1 second
      bottlenecks.push({
        type: 'network',
        severity: network.p95 > 5000 ? 'critical' : network.p95 > 2000 ? 'high' : 'medium',
        location: 'Network requests',
        impact: (network.p95 / 10000) * 100,
        description: `High network latency (P95: ${network.p95.toFixed(0)}ms)`,
        suggestions: [
          'Implement request batching',
          'Use connection pooling',
          'Add caching layer',
          'Consider CDN for static assets',
        ],
      });
    }

    if (network.errors > network.totalRequests * 0.05) {
      bottlenecks.push({
        type: 'network',
        severity: 'high',
        location: 'Network reliability',
        impact: (network.errors / network.totalRequests) * 100,
        description: `High error rate (${((network.errors / network.totalRequests) * 100).toFixed(1)}%)`,
        suggestions: [
          'Implement retry logic',
          'Add circuit breaker',
          'Improve error handling',
        ],
      });
    }

    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    bottlenecks: Bottleneck[],
    cpu: CPUProfile,
    memory: MemoryProfile,
    network: NetworkProfile
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Add recommendations based on bottlenecks
    for (const bottleneck of bottlenecks) {
      for (const suggestion of bottleneck.suggestions) {
        recommendations.push({
          id: this.generateRecommendationId(),
          priority: bottleneck.severity === 'critical' ? 'critical' : 'high',
          category: 'performance',
          title: suggestion,
          description: `Addresses ${bottleneck.type} bottleneck: ${bottleneck.description}`,
          expectedImpact: `Reduce ${bottleneck.type} usage by 20-40%`,
          implementation: `See bottleneck details for ${bottleneck.location}`,
          estimatedEffort: 'medium',
        });
      }
    }

    // General recommendations
    if (cpu.average > 50) {
      recommendations.push({
        id: this.generateRecommendationId(),
        priority: 'medium',
        category: 'performance',
        title: 'Optimize agent execution',
        description: 'Average CPU usage is elevated',
        expectedImpact: 'Reduce CPU usage by 15-25%',
        implementation: 'Profile hot code paths and optimize algorithms',
        estimatedEffort: 'medium',
      });
    }

    if (memory.averageMB > 512) {
      recommendations.push({
        id: this.generateRecommendationId(),
        priority: 'medium',
        category: 'cost',
        title: 'Reduce memory footprint',
        description: 'Memory usage could be optimized',
        expectedImpact: 'Reduce memory costs by 20-30%',
        implementation: 'Review data structures and implement lazy loading',
        estimatedEffort: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate recommendation ID
   */
  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AgentPerformanceProfiler;

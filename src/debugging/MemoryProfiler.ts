/**
 * Memory Profiler
 * Tracks memory usage, detects leaks, and monitors GC events
 */

import type {
  MemorySnapshot,
  MemoryAllocation,
  MemoryProfilerResults,
  MemoryLeak,
  GCEvent
} from '../types/debugging';

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private allocations: Map<string, MemoryAllocation[]> = new Map();
  private gcEvents: GCEvent[] = [];
  private enabled = false;
  private snapshotInterval: number | null = null;
  private baselineSnapshot: MemorySnapshot | null = null;

  /**
   * Start memory profiling
   */
  start(intervalMs = 1000): void {
    if (this.enabled) return;

    this.enabled = true;
    this.baselineSnapshot = this.takeSnapshot();

    // Take snapshots at regular intervals
    this.snapshotInterval = window.setInterval(() => {
      if (this.enabled) {
        this.takeSnapshot();
      }
    }, intervalMs);
  }

  /**
   * Stop memory profiling
   */
  stop(): void {
    if (!this.enabled) return;

    this.enabled = false;

    if (this.snapshotInterval !== null) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.snapshots = [];
    this.allocations.clear();
    this.gcEvents = [];
    this.baselineSnapshot = null;
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const memory = this.getMemoryInfo();

    const snapshot: MemorySnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      external: 0, // Not available in browser
      arrayBuffers: 0, // Would need to track manually
      rss: 0, // Not available in browser
      allocations: this.getAllocations()
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const mem = (performance as { memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      } }).memory;
      if (mem) {
        return mem;
      }
    }

    // Fallback to estimates
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  /**
   * Record memory allocation
   */
  recordAllocation(nodeId: string, size: number, type: string): void {
    if (!this.enabled) return;

    const allocation: MemoryAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      size,
      timestamp: Date.now(),
      type,
      retained: true
    };

    const nodeAllocations = this.allocations.get(nodeId) || [];
    nodeAllocations.push(allocation);
    this.allocations.set(nodeId, nodeAllocations);
  }

  /**
   * Record deallocation
   */
  recordDeallocation(nodeId: string, allocationId: string): void {
    const nodeAllocations = this.allocations.get(nodeId);
    if (!nodeAllocations) return;

    const allocation = nodeAllocations.find(a => a.id === allocationId);
    if (allocation) {
      allocation.retained = false;
    }
  }

  /**
   * Get all current allocations
   */
  private getAllocations(): MemoryAllocation[] {
    const allAllocations: MemoryAllocation[] = [];

    this.allocations.forEach(nodeAllocations => {
      allAllocations.push(...nodeAllocations.filter(a => a.retained));
    });

    return allAllocations;
  }

  /**
   * Record GC event
   */
  recordGC(type: GCEvent['type'], duration: number, freedMemory: number): void {
    const event: GCEvent = {
      id: `gc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      duration,
      freedMemory
    };

    this.gcEvents.push(event);
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    if (this.snapshots.length < 3) {
      return leaks; // Need at least 3 snapshots to detect trends
    }

    // Check each node's memory growth
    this.allocations.forEach((nodeAllocations, nodeId) => {
      const retainedAllocations = nodeAllocations.filter(a => a.retained);
      const totalSize = retainedAllocations.reduce((sum, a) => sum + a.size, 0);

      // Calculate growth rate (bytes per snapshot)
      const growthRate = this.calculateGrowthRate(nodeId);

      if (growthRate > 1024 * 1024) {
        // Growing > 1MB per interval
        const severity = this.getLeakSeverity(growthRate);

        leaks.push({
          id: `leak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nodeId,
          nodeName: nodeId, // Would need to look up actual name
          size: totalSize,
          growthRate,
          allocations: retainedAllocations.length,
          severity
        });
      }
    });

    return leaks;
  }

  /**
   * Calculate memory growth rate for a node
   */
  private calculateGrowthRate(nodeId: string): number {
    if (this.snapshots.length < 2) return 0;

    const recentSnapshots = this.snapshots.slice(-5); // Last 5 snapshots
    const nodeAllocations = this.allocations.get(nodeId) || [];

    const sizes = recentSnapshots.map(snapshot => {
      const snapshotAllocs = nodeAllocations.filter(
        a => a.timestamp <= snapshot.timestamp && a.retained
      );
      return snapshotAllocs.reduce((sum, a) => sum + a.size, 0);
    });

    // Calculate average growth between snapshots
    let totalGrowth = 0;
    for (let i = 1; i < sizes.length; i++) {
      totalGrowth += sizes[i] - sizes[i - 1];
    }

    return totalGrowth / (sizes.length - 1);
  }

  /**
   * Get leak severity
   */
  private getLeakSeverity(growthRate: number): MemoryLeak['severity'] {
    if (growthRate > 10 * 1024 * 1024) return 'critical'; // > 10MB
    if (growthRate > 5 * 1024 * 1024) return 'high'; // > 5MB
    if (growthRate > 1024 * 1024) return 'medium'; // > 1MB
    return 'low';
  }

  /**
   * Get profiling results
   */
  getResults(): MemoryProfilerResults {
    const leaks = this.detectLeaks();
    const peakMemory = Math.max(...this.snapshots.map(s => s.heapUsed), 0);
    const averageMemory =
      this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.snapshots.length || 0;

    return {
      snapshots: this.snapshots,
      leaks,
      gcEvents: this.gcEvents,
      peakMemory,
      averageMemory
    };
  }

  /**
   * Get memory statistics
   */
  getStatistics(): MemoryStatistics {
    const results = this.getResults();

    return {
      snapshotCount: this.snapshots.length,
      peakMemory: results.peakMemory,
      averageMemory: results.averageMemory,
      currentMemory: this.snapshots.length > 0
        ? this.snapshots[this.snapshots.length - 1].heapUsed
        : 0,
      memoryGrowth: this.calculateTotalGrowth(),
      leakCount: results.leaks.length,
      criticalLeaks: results.leaks.filter(l => l.severity === 'critical').length,
      gcEventCount: this.gcEvents.length,
      totalGCTime: this.gcEvents.reduce((sum, e) => sum + e.duration, 0),
      totalFreedMemory: this.gcEvents.reduce((sum, e) => sum + e.freedMemory, 0)
    };
  }

  /**
   * Calculate total memory growth since baseline
   */
  private calculateTotalGrowth(): number {
    if (!this.baselineSnapshot || this.snapshots.length === 0) return 0;

    const latest = this.snapshots[this.snapshots.length - 1];
    return latest.heapUsed - this.baselineSnapshot.heapUsed;
  }

  /**
   * Get snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get GC events
   */
  getGCEvents(): GCEvent[] {
    return [...this.gcEvents];
  }

  /**
   * Get allocations for a node
   */
  getNodeAllocations(nodeId: string): MemoryAllocation[] {
    return [...(this.allocations.get(nodeId) || [])];
  }

  /**
   * Format memory size
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    snapshot1Id: string,
    snapshot2Id: string
  ): SnapshotComparison | null {
    const snapshot1 = this.snapshots.find(s => s.id === snapshot1Id);
    const snapshot2 = this.snapshots.find(s => s.id === snapshot2Id);

    if (!snapshot1 || !snapshot2) return null;

    return {
      snapshot1,
      snapshot2,
      heapDiff: snapshot2.heapUsed - snapshot1.heapUsed,
      allocationsDiff: snapshot2.allocations.length - snapshot1.allocations.length,
      timeDiff: snapshot2.timestamp - snapshot1.timestamp
    };
  }

  /**
   * Export profiling data
   */
  export(): MemoryProfilerExport {
    return {
      snapshots: this.snapshots,
      allocations: Array.from(this.allocations.entries()),
      gcEvents: this.gcEvents,
      baselineSnapshot: this.baselineSnapshot,
      statistics: this.getStatistics()
    };
  }

  /**
   * Import profiling data
   */
  import(data: MemoryProfilerExport): void {
    this.snapshots = data.snapshots;
    this.allocations = new Map(data.allocations);
    this.gcEvents = data.gcEvents;
    this.baselineSnapshot = data.baselineSnapshot;
  }
}

interface MemoryStatistics {
  snapshotCount: number;
  peakMemory: number;
  averageMemory: number;
  currentMemory: number;
  memoryGrowth: number;
  leakCount: number;
  criticalLeaks: number;
  gcEventCount: number;
  totalGCTime: number;
  totalFreedMemory: number;
}

interface SnapshotComparison {
  snapshot1: MemorySnapshot;
  snapshot2: MemorySnapshot;
  heapDiff: number;
  allocationsDiff: number;
  timeDiff: number;
}

interface MemoryProfilerExport {
  snapshots: MemorySnapshot[];
  allocations: [string, MemoryAllocation[]][];
  gcEvents: GCEvent[];
  baselineSnapshot: MemorySnapshot | null;
  statistics: MemoryStatistics;
}

// Singleton instance
export const memoryProfiler = new MemoryProfiler();

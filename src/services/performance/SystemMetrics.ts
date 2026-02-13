/**
 * Performance Module - SystemMetrics
 *
 * Unified system metrics collection using Node.js os module.
 * Consolidates duplicate CPU/memory/disk/network collection from:
 * - PerformanceMonitoringService
 * - PerformanceOptimizationService
 * - PerformanceMonitoringHub
 * - MetricsCollector
 */

import * as os from 'os';
import { logger } from '../SimpleLogger';
import type {
  CPUMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  SystemMetrics as SystemMetricsType,
} from './types';

/**
 * Previous CPU times for calculating usage delta
 */
interface CPUTimes {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
}

/**
 * Collector for system-level metrics (CPU, memory, disk, network)
 */
export class SystemMetricsCollector {
  private previousCPUTimes: CPUTimes | null = null;
  private previousNetworkStats: { bytesIn: number; bytesOut: number } | null = null;
  private startTime: number;
  private isNodeEnvironment: boolean;

  constructor() {
    this.startTime = Date.now();
    this.isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node != null;
  }

  /**
   * Collect all system metrics
   */
  collect(): SystemMetricsType {
    return {
      cpu: this.collectCPU(),
      memory: this.collectMemory(),
      disk: this.collectDisk(),
      network: this.collectNetwork(),
      uptime: this.getUptime(),
      timestamp: Date.now(),
    };
  }

  /**
   * Collect CPU metrics
   */
  collectCPU(): CPUMetrics {
    if (!this.isNodeEnvironment) {
      return this.getMockCPUMetrics();
    }

    const cpus = os.cpus();
    const cores = cpus.length;

    // Calculate total CPU times
    let totalUser = 0;
    let totalNice = 0;
    let totalSys = 0;
    let totalIdle = 0;
    let totalIrq = 0;

    for (const cpu of cpus) {
      totalUser += cpu.times.user;
      totalNice += cpu.times.nice;
      totalSys += cpu.times.sys;
      totalIdle += cpu.times.idle;
      totalIrq += cpu.times.irq;
    }

    const currentTimes: CPUTimes = {
      user: totalUser,
      nice: totalNice,
      sys: totalSys,
      idle: totalIdle,
      irq: totalIrq,
    };

    let usage = 0;
    let userPercent = 0;
    let systemPercent = 0;
    let idlePercent = 100;

    if (this.previousCPUTimes) {
      const deltaUser = currentTimes.user - this.previousCPUTimes.user;
      const deltaNice = currentTimes.nice - this.previousCPUTimes.nice;
      const deltaSys = currentTimes.sys - this.previousCPUTimes.sys;
      const deltaIdle = currentTimes.idle - this.previousCPUTimes.idle;
      const deltaIrq = currentTimes.irq - this.previousCPUTimes.irq;

      const totalDelta = deltaUser + deltaNice + deltaSys + deltaIdle + deltaIrq;

      if (totalDelta > 0) {
        userPercent = ((deltaUser + deltaNice) / totalDelta) * 100;
        systemPercent = ((deltaSys + deltaIrq) / totalDelta) * 100;
        idlePercent = (deltaIdle / totalDelta) * 100;
        usage = 100 - idlePercent;
      }
    }

    this.previousCPUTimes = currentTimes;

    // Get load average (Unix only, returns [0, 0, 0] on Windows)
    const loadAverage = os.loadavg() as [number, number, number];

    return {
      usage: Math.round(usage * 100) / 100,
      cores,
      loadAverage,
      user: Math.round(userPercent * 100) / 100,
      system: Math.round(systemPercent * 100) / 100,
      idle: Math.round(idlePercent * 100) / 100,
    };
  }

  /**
   * Collect memory metrics
   */
  collectMemory(): MemoryMetrics {
    if (!this.isNodeEnvironment) {
      return this.getMockMemoryMetrics();
    }

    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentage = (used / total) * 100;

    // Process memory (heap)
    const processMemory = process.memoryUsage();

    return {
      total,
      free,
      used,
      percentage: Math.round(percentage * 100) / 100,
      heapUsed: processMemory.heapUsed,
      heapTotal: processMemory.heapTotal,
      external: processMemory.external,
      rss: processMemory.rss,
    };
  }

  /**
   * Collect disk metrics
   * Note: Real disk metrics require OS-specific implementations or external packages
   */
  collectDisk(): DiskMetrics {
    // Disk metrics require OS-specific APIs or external packages like 'diskusage'
    // Returning simulated data for now
    return this.getMockDiskMetrics();
  }

  /**
   * Collect network metrics
   * Note: Real network metrics require OS-specific implementations or external packages
   */
  collectNetwork(): NetworkMetrics {
    // Network metrics require OS-specific APIs or external packages
    // Returning simulated data for now
    return this.getMockNetworkMetrics();
  }

  /**
   * Get system uptime
   */
  getUptime(): number {
    if (this.isNodeEnvironment) {
      return os.uptime() * 1000; // Convert to milliseconds
    }
    return Date.now() - this.startTime;
  }

  /**
   * Get process uptime
   */
  getProcessUptime(): number {
    if (this.isNodeEnvironment) {
      return process.uptime() * 1000; // Convert to milliseconds
    }
    return Date.now() - this.startTime;
  }

  /**
   * Get CPU cores count
   */
  getCPUCores(): number {
    if (this.isNodeEnvironment) {
      return os.cpus().length;
    }
    // Browser fallback
    if (typeof navigator !== 'undefined') {
      return navigator.hardwareConcurrency || 4;
    }
    return 4;
  }

  /**
   * Get hostname
   */
  getHostname(): string {
    if (this.isNodeEnvironment) {
      return os.hostname();
    }
    return 'browser';
  }

  /**
   * Get platform info
   */
  getPlatform(): { os: string; arch: string; release: string } {
    if (this.isNodeEnvironment) {
      return {
        os: os.platform(),
        arch: os.arch(),
        release: os.release(),
      };
    }
    return {
      os: 'browser',
      arch: 'unknown',
      release: 'unknown',
    };
  }

  // ============================================================================
  // Mock/Fallback Metrics (for browser or when real data unavailable)
  // ============================================================================

  private getMockCPUMetrics(): CPUMetrics {
    // Simulate realistic CPU metrics
    const usage = Math.random() * 30 + 20; // 20-50%
    return {
      usage: Math.round(usage * 100) / 100,
      cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
      loadAverage: [
        Math.random() * 2,
        Math.random() * 2,
        Math.random() * 2,
      ] as [number, number, number],
      user: usage * 0.7,
      system: usage * 0.3,
      idle: 100 - usage,
    };
  }

  private getMockMemoryMetrics(): MemoryMetrics {
    // Try to use performance.memory if available (Chrome)
    const perfWithMemory = performance as unknown as {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
    };
    if (typeof performance !== 'undefined' && perfWithMemory.memory) {
      const perfMemory = perfWithMemory.memory;
      const used = perfMemory.usedJSHeapSize;
      const total = perfMemory.jsHeapSizeLimit;
      return {
        total,
        free: total - used,
        used,
        percentage: (used / total) * 100,
        heapUsed: perfMemory.usedJSHeapSize,
        heapTotal: perfMemory.totalJSHeapSize,
      };
    }

    // Fallback mock data
    const total = 8 * 1024 * 1024 * 1024; // 8GB
    const usagePercent = 40 + Math.random() * 30; // 40-70%
    const used = Math.floor(total * (usagePercent / 100));
    return {
      total,
      free: total - used,
      used,
      percentage: Math.round(usagePercent * 100) / 100,
    };
  }

  private getMockDiskMetrics(): DiskMetrics {
    const total = 500 * 1024 * 1024 * 1024; // 500GB
    const usagePercent = 50 + Math.random() * 30; // 50-80%
    const used = Math.floor(total * (usagePercent / 100));
    return {
      total,
      used,
      free: total - used,
      percentage: Math.round(usagePercent * 100) / 100,
      readBytes: Math.floor(Math.random() * 50000),
      writeBytes: Math.floor(Math.random() * 30000),
      readOps: Math.floor(Math.random() * 100),
      writeOps: Math.floor(Math.random() * 50),
    };
  }

  private getMockNetworkMetrics(): NetworkMetrics {
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 500000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 5000),
      errors: Math.floor(Math.random() * 10),
      dropped: Math.floor(Math.random() * 5),
    };
  }
}

/**
 * Singleton instance for convenience
 */
let systemMetricsInstance: SystemMetricsCollector | null = null;

/**
 * Get or create the system metrics collector singleton
 */
export function getSystemMetrics(): SystemMetricsCollector {
  if (!systemMetricsInstance) {
    systemMetricsInstance = new SystemMetricsCollector();
  }
  return systemMetricsInstance;
}

/**
 * Collect system metrics (convenience function)
 */
export function collectSystemMetrics(): SystemMetricsType {
  return getSystemMetrics().collect();
}

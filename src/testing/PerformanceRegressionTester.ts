import { logger } from '../services/SimpleLogger';
/**
 * Performance Regression Tester
 * Detects performance regressions by comparing metrics against baselines
 */

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkRequests?: number;
  renderTime?: number;
  domNodes?: number;
  timestamp: number;
}

export interface PerformanceBaseline {
  name: string;
  metrics: PerformanceMetrics;
  thresholds: PerformanceThresholds;
  createdAt: number;
  version: string;
}

export interface PerformanceThresholds {
  executionTime: { warning: number; error: number };
  memoryUsage: { warning: number; error: number };
  cpuUsage?: { warning: number; error: number };
  networkRequests?: { warning: number; error: number };
  renderTime?: { warning: number; error: number };
}

export interface PerformanceComparison {
  metric: string;
  baseline: number;
  current: number;
  difference: number;
  percentChange: number;
  status: 'improved' | 'stable' | 'degraded' | 'critical';
}

export interface PerformanceRegressionReport {
  passed: boolean;
  comparisons: PerformanceComparison[];
  summary: {
    improved: number;
    stable: number;
    degraded: number;
    critical: number;
  };
  recommendations: string[];
  timestamp: number;
}

export interface PerformanceTestOptions {
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
  collectMemory?: boolean;
  collectCPU?: boolean;
  collectNetwork?: boolean;
  collectRender?: boolean;
}

export class PerformanceRegressionTester {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private options: PerformanceTestOptions;

  constructor(options: PerformanceTestOptions = {}) {
    this.options = {
      iterations: options.iterations ?? 10,
      warmupIterations: options.warmupIterations ?? 3,
      timeout: options.timeout ?? 30000,
      collectMemory: options.collectMemory ?? true,
      collectCPU: options.collectCPU ?? false,
      collectNetwork: options.collectNetwork ?? true,
      collectRender: options.collectRender ?? true,
    };
  }

  /**
   * Run performance test and compare with baseline
   */
  async runPerformanceTest(
    name: string,
    testFn: () => Promise<void> | void
  ): Promise<PerformanceRegressionReport> {
    // Collect current metrics
    const currentMetrics = await this.collectMetrics(testFn);

    // Get baseline
    const baseline = this.baselines.get(name);

    if (!baseline) {
      logger.warn(`[PerformanceRegressionTester] No baseline found for "${name}"`);
      // Create new baseline
      this.setBaseline(name, currentMetrics);
      return this.createPassReport(currentMetrics);
    }

    // Compare metrics
    const comparisons = this.compareMetrics(baseline.metrics, currentMetrics, baseline.thresholds);

    // Generate report
    return this.generateReport(comparisons);
  }

  /**
   * Set baseline metrics for a test
   */
  setBaseline(
    name: string,
    metrics: PerformanceMetrics,
    thresholds?: PerformanceThresholds,
    version: string = '1.0.0'
  ): void {
    const baseline: PerformanceBaseline = {
      name,
      metrics,
      thresholds: thresholds || this.getDefaultThresholds(),
      createdAt: Date.now(),
      version,
    };

    this.baselines.set(name, baseline);
    logger.debug(`[PerformanceRegressionTester] Baseline set for "${name}"`);
  }

  /**
   * Get baseline for a test
   */
  getBaseline(name: string): PerformanceBaseline | undefined {
    return this.baselines.get(name);
  }

  /**
   * Load baselines from storage
   */
  loadBaselines(baselines: PerformanceBaseline[]): void {
    baselines.forEach((baseline) => {
      this.baselines.set(baseline.name, baseline);
    });
    logger.debug(`[PerformanceRegressionTester] Loaded ${baselines.length} baselines`);
  }

  /**
   * Export baselines for storage
   */
  exportBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(testFn: () => Promise<void> | void): Promise<PerformanceMetrics> {
    const metrics: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
    };

    // Warmup iterations
    for (let i = 0; i < this.options.warmupIterations!; i++) {
      await testFn();
    }

    // Measurement iterations
    const executionTimes: number[] = [];
    const memoryUsages: number[] = [];
    const renderTimes: number[] = [];

    for (let i = 0; i < this.options.iterations!; i++) {
      // Measure execution time
      const startTime = performance.now();
      const memoryBefore = this.getMemoryUsage();

      await testFn();

      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      executionTimes.push(endTime - startTime);

      if (this.options.collectMemory && memoryAfter && memoryBefore) {
        memoryUsages.push(memoryAfter - memoryBefore);
      }

      if (this.options.collectRender) {
        const renderTime = this.getRenderTime();
        if (renderTime) {
          renderTimes.push(renderTime);
        }
      }

      // Small delay between iterations
      await this.delay(10);
    }

    // Calculate averages
    metrics.executionTime = this.average(executionTimes);

    if (memoryUsages.length > 0) {
      metrics.memoryUsage = this.average(memoryUsages);
    } else {
      metrics.memoryUsage = 0;
    }

    if (renderTimes.length > 0) {
      metrics.renderTime = this.average(renderTimes);
    }

    // Collect other metrics
    if (this.options.collectNetwork) {
      metrics.networkRequests = this.getNetworkRequestCount();
    }

    metrics.domNodes = document.getElementsByTagName('*').length;

    return metrics as PerformanceMetrics;
  }

  /**
   * Compare metrics with baseline
   */
  private compareMetrics(
    baseline: PerformanceMetrics,
    current: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): PerformanceComparison[] {
    const comparisons: PerformanceComparison[] = [];

    // Execution time
    comparisons.push(
      this.compareMetric(
        'Execution Time',
        baseline.executionTime,
        current.executionTime,
        thresholds.executionTime
      )
    );

    // Memory usage
    comparisons.push(
      this.compareMetric(
        'Memory Usage',
        baseline.memoryUsage,
        current.memoryUsage,
        thresholds.memoryUsage
      )
    );

    // Render time
    if (baseline.renderTime && current.renderTime && thresholds.renderTime) {
      comparisons.push(
        this.compareMetric(
          'Render Time',
          baseline.renderTime,
          current.renderTime,
          thresholds.renderTime
        )
      );
    }

    // Network requests
    if (baseline.networkRequests && current.networkRequests && thresholds.networkRequests) {
      comparisons.push(
        this.compareMetric(
          'Network Requests',
          baseline.networkRequests,
          current.networkRequests,
          thresholds.networkRequests
        )
      );
    }

    return comparisons;
  }

  /**
   * Compare a single metric
   */
  private compareMetric(
    name: string,
    baseline: number,
    current: number,
    threshold: { warning: number; error: number }
  ): PerformanceComparison {
    const difference = current - baseline;
    const percentChange = baseline > 0 ? (difference / baseline) * 100 : 0;

    let status: PerformanceComparison['status'];

    if (percentChange <= -5) {
      status = 'improved';
    } else if (percentChange >= threshold.error) {
      status = 'critical';
    } else if (percentChange >= threshold.warning) {
      status = 'degraded';
    } else {
      status = 'stable';
    }

    return {
      metric: name,
      baseline,
      current,
      difference,
      percentChange,
      status,
    };
  }

  /**
   * Generate performance regression report
   */
  private generateReport(comparisons: PerformanceComparison[]): PerformanceRegressionReport {
    const summary = {
      improved: comparisons.filter((c) => c.status === 'improved').length,
      stable: comparisons.filter((c) => c.status === 'stable').length,
      degraded: comparisons.filter((c) => c.status === 'degraded').length,
      critical: comparisons.filter((c) => c.status === 'critical').length,
    };

    const passed = summary.critical === 0;

    const recommendations = this.generateRecommendations(comparisons);

    return {
      passed,
      comparisons,
      summary,
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate recommendations based on comparisons
   */
  private generateRecommendations(comparisons: PerformanceComparison[]): string[] {
    const recommendations: string[] = [];

    comparisons.forEach((comp) => {
      if (comp.status === 'critical') {
        recommendations.push(
          `Critical: ${comp.metric} increased by ${comp.percentChange.toFixed(1)}%. ` +
            `Investigate immediately.`
        );
      } else if (comp.status === 'degraded') {
        recommendations.push(
          `Warning: ${comp.metric} increased by ${comp.percentChange.toFixed(1)}%. ` +
            `Consider optimization.`
        );
      } else if (comp.status === 'improved') {
        recommendations.push(
          `Great! ${comp.metric} improved by ${Math.abs(comp.percentChange).toFixed(1)}%.`
        );
      }
    });

    // General recommendations
    const executionTimeComp = comparisons.find((c) => c.metric === 'Execution Time');
    if (executionTimeComp && executionTimeComp.current > 1000) {
      recommendations.push('Consider code splitting or lazy loading to improve load time.');
    }

    const memoryComp = comparisons.find((c) => c.metric === 'Memory Usage');
    if (memoryComp && memoryComp.current > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push('High memory usage detected. Check for memory leaks.');
    }

    return recommendations;
  }

  /**
   * Create a passing report for new baseline
   */
  private createPassReport(metrics: PerformanceMetrics): PerformanceRegressionReport {
    return {
      passed: true,
      comparisons: [],
      summary: { improved: 0, stable: 0, degraded: 0, critical: 0 },
      recommendations: ['Baseline created. Future tests will be compared against these metrics.'],
      timestamp: Date.now(),
    };
  }

  /**
   * Get default thresholds
   */
  private getDefaultThresholds(): PerformanceThresholds {
    return {
      executionTime: { warning: 10, error: 25 }, // % increase
      memoryUsage: { warning: 15, error: 30 },
      renderTime: { warning: 10, error: 25 },
      networkRequests: { warning: 20, error: 50 },
    };
  }

  /**
   * Get memory usage (browser only)
   */
  private getMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return null;
  }

  /**
   * Get render time
   */
  private getRenderTime(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : null;
  }

  /**
   * Get network request count
   */
  private getNetworkRequestCount(): number {
    const resourceEntries = performance.getEntriesByType('resource');
    return resourceEntries.length;
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default PerformanceRegressionTester;

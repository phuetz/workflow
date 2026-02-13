/**
 * Monitoring Service - Layer 1: Basic Monitoring
 *
 * Responsibilities:
 * - Simple metric collection (counters, gauges, histograms)
 * - Request and error tracking
 * - Performance timing with percentiles
 * - Prometheus-format metric export
 * - Health status reporting
 *
 * Use Cases:
 * - Track requests: monitoringService.incrementRequestCount(method, path, status)
 * - Record timing: const stopTimer = monitoringService.startTimer('operation')
 * - Get Prometheus metrics: monitoringService.getPrometheusMetrics()
 * - Health check: monitoringService.getHealthStatus()
 *
 * Note: This is the basic monitoring service for production use.
 * For detailed system metrics, use PerformanceMonitoringService.
 * For auto-optimization, use PerformanceOptimizationService.
 *
 * @see src/services/monitoring/index.ts for architecture overview
 * @module MonitoringService
 */
class MonitoringService {
  private metrics: Map<string, any> = new Map();
  private startTime: number = Date.now();
  private requestCounter: number = 0;
  private errorCounter: number = 0;
  private performanceMarks: Map<string, number> = new Map();

  constructor() {
    this.initializeMetrics();
    this.startHealthCheck();
  }

  /**
   * Initialise les métriques de base
   */
  private initializeMetrics() {
    this.metrics.set('app_start_time', this.startTime);
    this.metrics.set('app_version', process.env.npm_package_version || '2.0.0');
    this.metrics.set('node_version', process.version);
    this.metrics.set('environment', process.env.NODE_ENV || 'development');
  }

  /**
   * Health check périodique
   */
  private startHealthCheck() {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Met à jour les métriques système
   */
  private updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.metrics.set('memory_heap_used', memUsage.heapUsed);
    this.metrics.set('memory_heap_total', memUsage.heapTotal);
    this.metrics.set('memory_rss', memUsage.rss);
    this.metrics.set('memory_external', memUsage.external);
    
    this.metrics.set('uptime_seconds', process.uptime());
    this.metrics.set('cpu_usage', process.cpuUsage());
  }

  /**
   * Incrémente le compteur de requêtes
   */
  incrementRequestCount(method: string, path: string, status: number) {
    this.requestCounter++;
    const key = `http_requests_total{method="${method}",path="${path}",status="${status}"}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    
    // Update global counter
    this.metrics.set('http_requests_total', this.requestCounter);
  }

  /**
   * Incrémente le compteur d'erreurs
   */
  incrementErrorCount(type: string, message: string) {
    this.errorCounter++;
    const key = `errors_total{type="${type}"}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    
    // Update global counter
    this.metrics.set('errors_total', this.errorCounter);
    
    // Store last error
    this.metrics.set('last_error', {
      type,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Enregistre une métrique de performance
   */
  recordTiming(operation: string, duration: number) {
    const key = `operation_duration_ms{operation="${operation}"}`;
    const timings = this.metrics.get(key) || [];
    timings.push(duration);
    
    // Keep only last 100 timings
    if (timings.length > 100) {
      timings.shift();
    }
    
    this.metrics.set(key, timings);
    
    // Calculate percentiles
    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    this.metrics.set(`${key}_p50`, p50);
    this.metrics.set(`${key}_p95`, p95);
    this.metrics.set(`${key}_p99`, p99);
  }

  /**
   * Marque le début d'une opération
   */
  startTimer(label: string): () => number {
    const startTime = Date.now();
    this.performanceMarks.set(label, startTime);
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.recordTiming(label, duration);
      this.performanceMarks.delete(label);
      return duration;
    };
  }

  /**
   * Enregistre une métrique personnalisée
   */
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    const key = labels 
      ? `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
      : name;
    this.metrics.set(key, value);
  }

  /**
   * Incrémente un compteur
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = labels 
      ? `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
      : name;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  /**
   * Enregistre un histogramme
   */
  recordHistogram(name: string, value: number, buckets: number[] = [0.1, 0.5, 1, 2, 5, 10]) {
    const histogram = this.metrics.get(`${name}_histogram`) || {
      buckets: {},
      sum: 0,
      count: 0
    };

    histogram.sum += value;
    histogram.count += 1;

    // Update buckets
    for (const bucket of buckets) {
      const bucketKey = bucket.toString();
      if (!histogram.buckets[bucketKey]) {
        histogram.buckets[bucketKey] = 0;
      }
      if (value <= bucket) {
        histogram.buckets[bucketKey]++;
      }
    }

    this.metrics.set(`${name}_histogram`, histogram);
    this.metrics.set(`${name}_sum`, histogram.sum);
    this.metrics.set(`${name}_count`, histogram.count);
  }

  /**
   * Record a custom metric with optional tags
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (tags && Object.keys(tags).length > 0) {
      const tagString = Object.entries(tags)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      const key = `${name}{${tagString}}`;
      this.metrics.set(key, value);
    } else {
      this.metrics.set(name, value);
    }
  }

  /**
   * Expose les métriques au format Prometheus
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Add headers
    lines.push('# HELP app_info Application information');
    lines.push('# TYPE app_info gauge');
    lines.push(`app_info{version="${this.metrics.get('app_version')}",environment="${this.metrics.get('environment')}"} 1`);
    
    // Add all metrics
    for (const [key, value] of this.metrics.entries()) {
      if (key === 'last_error' || typeof value === 'object') {
        continue; // Skip complex objects
      }
      
      if (typeof value === 'number') {
        lines.push(`${key} ${value}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Récupère toutes les métriques en JSON
   */
  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    
    return {
      ...result,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Récupère le statut de santé
   */
  getHealthStatus() {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    return {
      status: heapUsedPercent < 90 && this.errorCounter < 100 ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
      checks: {
        memory: {
          status: heapUsedPercent < 90 ? 'ok' : 'warning',
          heapUsedPercent: Math.round(heapUsedPercent),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal
        },
        errors: {
          status: this.errorCounter < 100 ? 'ok' : 'warning',
          count: this.errorCounter,
          lastError: this.metrics.get('last_error')
        },
        requests: {
          total: this.requestCounter,
          rps: this.requestCounter / process.uptime()
        }
      }
    };
  }

  /**
   * Reset des métriques (utile pour les tests)
   */
  reset() {
    this.metrics.clear();
    this.requestCounter = 0;
    this.errorCounter = 0;
    this.performanceMarks.clear();
    this.initializeMetrics();
  }
}

// Export singleton instance
const monitoringService = new MonitoringService();
export default monitoringService;
export { MonitoringService };
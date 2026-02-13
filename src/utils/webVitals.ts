/**
 * Web Vitals Monitoring
 * Track Core Web Vitals metrics and send to analytics
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

// Thresholds for good/needs improvement/poor
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Get rating for a metric
 */
function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: Metric): Promise<void> {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating || getMetricRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    entries: metric.entries?.map(entry => ({
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
    })),
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  });

  // Don't throw errors if backend is not ready
  try {
    // Use sendBeacon if available (doesn't block page unload)
    if (navigator.sendBeacon) {
      // sendBeacon requires a Blob to set Content-Type properly
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/analytics/vitals', blob);
      if (!sent && process.env.NODE_ENV === 'development') {
        console.debug('sendBeacon failed, backend may not be ready');
      }
    } else {
      // Fallback to fetch with keepalive
      fetch('/api/analytics/vitals', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(err => {
        // Silently fail if backend not ready (common during HMR)
        if (process.env.NODE_ENV === 'development') {
          console.debug('Web vitals submission failed (backend may not be ready):', err.message);
        }
      });
    }
  } catch (error) {
    // Completely silent in production, debug in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('Web vitals error:', error);
    }
  }
}

/**
 * Log metric to console in development
 */
function logMetric(metric: Metric): void {
  if (process.env.NODE_ENV === 'development') {
    const rating = metric.rating || getMetricRating(metric.name, metric.value);
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(
      `${emoji} ${metric.name}:`,
      metric.value.toFixed(2),
      metric.name === 'CLS' ? '' : 'ms',
      `(${rating})`
    );
  }
}

/**
 * Handle metric reporting
 */
function handleMetric(metric: Metric): void {
  logMetric(metric);
  sendToAnalytics(metric);
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(): void {
  // Report all metrics
  onCLS(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);

  // Log summary on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Web Vitals Summary:');
        console.table({
          CLS: { threshold: '< 0.1', current: 'see logs' },
          INP: { threshold: '< 200ms', current: 'see logs' },
          FCP: { threshold: '< 1.8s', current: 'see logs' },
          LCP: { threshold: '< 2.5s', current: 'see logs' },
          TTFB: { threshold: '< 800ms', current: 'see logs' },
        });
      }
    });
  }
}

/**
 * Report current Web Vitals on demand
 */
export function reportWebVitals(): void {
  onCLS(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Get current Web Vitals values
 */
export async function getCurrentWebVitals(): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    const vitals: Record<string, number> = {};
    let count = 0;
    const totalMetrics = 5;

    const collector = (metric: Metric) => {
      vitals[metric.name] = metric.value;
      count++;
      if (count === totalMetrics) {
        resolve(vitals);
      }
    };

    // Collect all metrics
    onCLS(collector);
    onINP(collector);
    onFCP(collector);
    onLCP(collector);
    onTTFB(collector);

    // Timeout after 5 seconds
    setTimeout(() => resolve(vitals), 5000);
  });
}

/**
 * Export individual metric functions for selective monitoring
 */
export {
  onCLS,
  onINP,
  onFCP,
  onLCP,
  onTTFB,
};

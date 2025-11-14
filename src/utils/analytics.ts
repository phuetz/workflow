/**
 * Analytics & Telemetry
 * Privacy-respecting user behavior tracking
 */

export enum EventCategory {
  WORKFLOW = 'workflow',
  USER = 'user',
  SYSTEM = 'system',
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  ERROR = 'error',
  PERFORMANCE = 'performance'
}

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackPageViews: boolean;
  trackErrors: boolean;
  trackPerformance: boolean;
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  sampleRate: number; // 0-1, percentage of events to track
}

class Analytics {
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private pageLoadTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = Date.now();

    this.config = {
      enabled: true,
      trackPageViews: true,
      trackErrors: true,
      trackPerformance: true,
      anonymizeIp: true,
      respectDoNotTrack: true,
      sampleRate: 1.0
    };

    this.initialize();
  }

  private initialize() {
    // Check Do Not Track preference
    if (this.config.respectDoNotTrack && this.isDNTEnabled()) {
      this.config.enabled = false;
      return;
    }

    // Track page view
    if (this.config.trackPageViews) {
      this.trackPageView();
    }

    // Track performance metrics
    if (this.config.trackPerformance) {
      this.trackPerformanceMetrics();
    }

    // Track page visibility changes
    this.setupVisibilityTracking();

    // Flush events before page unload
    this.setupBeforeUnload();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isDNTEnabled(): boolean {
    if (typeof navigator === 'undefined') return false;
    return (
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      (navigator as any).msDoNotTrack === '1'
    );
  }

  /**
   * Check if event should be tracked (sampling)
   */
  private shouldTrack(): boolean {
    return this.config.enabled && Math.random() <= this.config.sampleRate;
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string | undefined) {
    this.userId = userId;
  }

  /**
   * Configure analytics
   */
  configure(config: Partial<AnalyticsConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Track custom event
   */
  track(
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ) {
    if (!this.shouldTrack()) return;

    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      metadata,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.events.push(event);
    this.sendEvent(event);
  }

  /**
   * Track page view
   */
  trackPageView(path?: string) {
    const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');

    this.track(EventCategory.NAVIGATION, 'page_view', currentPath, undefined, {
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      title: typeof document !== 'undefined' ? document.title : undefined
    });
  }

  /**
   * Track workflow events
   */
  trackWorkflow(action: string, workflowId?: string, metadata?: Record<string, any>) {
    this.track(EventCategory.WORKFLOW, action, workflowId, undefined, metadata);
  }

  /**
   * Track user interactions
   */
  trackInteraction(action: string, element: string, metadata?: Record<string, any>) {
    this.track(EventCategory.INTERACTION, action, element, undefined, metadata);
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: Record<string, any>) {
    if (!this.config.trackErrors) return;

    this.track(EventCategory.ERROR, 'error', error.message, undefined, {
      errorName: error.name,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Track performance metrics
   */
  private trackPerformanceMetrics() {
    if (typeof window === 'undefined' || !window.performance) return;

    // Wait for page to fully load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (perfData) {
          this.track(EventCategory.PERFORMANCE, 'page_load', undefined, Math.round(perfData.loadEventEnd - perfData.fetchStart), {
            dns: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
            tcp: Math.round(perfData.connectEnd - perfData.connectStart),
            request: Math.round(perfData.responseStart - perfData.requestStart),
            response: Math.round(perfData.responseEnd - perfData.responseStart),
            dom: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
            load: Math.round(perfData.loadEventEnd - perfData.loadEventStart)
          });
        }

        // Track First Contentful Paint
        const fcp = window.performance.getEntriesByName('first-contentful-paint')[0];
        if (fcp) {
          this.track(EventCategory.PERFORMANCE, 'first_contentful_paint', undefined, Math.round(fcp.startTime));
        }

        // Track resource timings
        const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const resourceStats = {
          count: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          scripts: resources.filter(r => r.initiatorType === 'script').length,
          stylesheets: resources.filter(r => r.initiatorType === 'link').length,
          images: resources.filter(r => r.initiatorType === 'img').length
        };

        this.track(EventCategory.PERFORMANCE, 'resources', undefined, resourceStats.count, resourceStats);
      }, 0);
    });
  }

  /**
   * Track page visibility
   */
  private setupVisibilityTracking() {
    if (typeof document === 'undefined') return;

    let visibilityStart = Date.now();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const duration = Date.now() - visibilityStart;
        this.track(EventCategory.USER, 'page_hidden', undefined, duration);
      } else {
        visibilityStart = Date.now();
        this.track(EventCategory.USER, 'page_visible');
      }
    });
  }

  /**
   * Setup before unload handler
   */
  private setupBeforeUnload() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - this.pageLoadTime;
      this.track(EventCategory.USER, 'session_end', undefined, sessionDuration);
      this.flush();
    });
  }

  /**
   * Send event to analytics service
   */
  private sendEvent(event: AnalyticsEvent) {
    // Send to Google Analytics 4 (if configured)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.metadata
      });
    }

    // Send to Plausible (if configured)
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible(event.action, {
        props: {
          category: event.category,
          label: event.label,
          value: event.value,
          ...event.metadata
        }
      });
    }

    // Send to custom analytics endpoint
    if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
      this.sendToEndpoint(event);
    }
  }

  /**
   * Send event to custom endpoint
   */
  private async sendToEndpoint(event: AnalyticsEvent) {
    try {
      await fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event),
        keepalive: true // Ensure request completes even if page unloads
      });
    } catch (error) {
      // Silently fail - don't want analytics to break the app
      console.debug('Analytics error:', error);
    }
  }

  /**
   * Flush all pending events
   */
  flush() {
    // Send batch of events
    if (this.events.length > 0 && import.meta.env.VITE_ANALYTICS_ENDPOINT) {
      navigator.sendBeacon(
        import.meta.env.VITE_ANALYTICS_ENDPOINT + '/batch',
        JSON.stringify(this.events)
      );
      this.events = [];
    }
  }

  /**
   * Get analytics statistics
   */
  getStatistics() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      sessionDuration: Date.now() - this.pageLoadTime,
      eventCount: this.events.length,
      eventsPerCategory: Object.values(EventCategory).reduce((acc, cat) => ({
        ...acc,
        [cat]: this.events.filter(e => e.category === cat).length
      }), {} as Record<EventCategory, number>)
    };
  }

  /**
   * Clear all events (useful for testing)
   */
  clear() {
    this.events = [];
  }

  /**
   * Opt out of tracking
   */
  optOut() {
    this.config.enabled = false;
    this.clear();
    localStorage.setItem('analytics_opt_out', 'true');
  }

  /**
   * Opt in to tracking
   */
  optIn() {
    this.config.enabled = true;
    localStorage.removeItem('analytics_opt_out');
  }

  /**
   * Check if user has opted out
   */
  hasOptedOut(): boolean {
    return localStorage.getItem('analytics_opt_out') === 'true';
  }
}

// Singleton instance
export const analytics = new Analytics();

/**
 * React hook for tracking component mount/unmount
 */
export function useAnalytics(
  category: EventCategory,
  action: string,
  metadata?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  const mountTime = Date.now();

  // Track mount
  analytics.track(category, `${action}_mounted`, undefined, undefined, metadata);

  // Track unmount and duration
  return () => {
    const duration = Date.now() - mountTime;
    analytics.track(category, `${action}_unmounted`, undefined, duration, metadata);
  };
}

/**
 * HOC to track component render time
 */
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  category: EventCategory,
  name: string
) {
  return function WithAnalytics(props: P) {
    const renderStart = Date.now();

    React.useEffect(() => {
      const renderTime = Date.now() - renderStart;
      analytics.track(category, 'component_render', name, renderTime);
    }, []);

    return React.createElement(Component, props);
  };
}

// Global tracking shortcuts
export const trackWorkflow = analytics.trackWorkflow.bind(analytics);
export const trackInteraction = analytics.trackInteraction.bind(analytics);
export const trackPageView = analytics.trackPageView.bind(analytics);
export const trackError = analytics.trackError.bind(analytics);

// React namespace for use in components
import * as React from 'react';

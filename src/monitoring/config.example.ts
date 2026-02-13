/**
 * Error Monitoring Configuration Example
 * Copy this file to config.ts and customize for your environment
 */

import type { MonitoringConfig } from './ErrorMonitoringSystem';

/**
 * Development Configuration
 * - Capture all errors
 * - Verbose logging
 * - No external integrations
 */
export const developmentConfig: Partial<MonitoringConfig> = {
  enabled: true,
  captureUnhandledRejections: true,
  captureConsoleErrors: true,
  sampleRate: 1.0, // Capture 100% of errors
  ignoredErrors: [
    /ResizeObserver loop/i,
    /Loading chunk .+ failed/i,
  ],
  severityThresholds: {
    alertOnCritical: false, // No alerts in dev
    alertOnHigh: false,
    criticalErrorsBeforeAlert: 999,
  },
  storage: {
    maxErrors: 1000,
    retentionDays: 7,
  },
  performance: {
    maxOverhead: 5, // Allow more overhead in dev
    batchSize: 10,
    flushIntervalMs: 1000, // Flush quickly for debugging
  },
};

/**
 * Staging Configuration
 * - Capture most errors
 * - Test alerts
 * - Enable external integrations
 */
export const stagingConfig: Partial<MonitoringConfig> = {
  enabled: true,
  captureUnhandledRejections: true,
  captureConsoleErrors: false,
  sampleRate: 0.8, // Sample 80%
  ignoredErrors: [
    /ResizeObserver loop/i,
    /Loading chunk .+ failed/i,
    /Script error/i,
  ],
  severityThresholds: {
    alertOnCritical: true,
    alertOnHigh: true,
    criticalErrorsBeforeAlert: 3,
  },
  storage: {
    maxErrors: 5000,
    retentionDays: 14,
  },
  performance: {
    maxOverhead: 2,
    batchSize: 50,
    flushIntervalMs: 5000,
  },
};

/**
 * Production Configuration
 * - Optimized for performance
 * - Smart sampling
 * - Full integration
 */
export const productionConfig: Partial<MonitoringConfig> = {
  enabled: true,
  captureUnhandledRejections: true,
  captureConsoleErrors: false, // Don't capture console.error in production
  sampleRate: 0.5, // Sample 50% to reduce overhead
  ignoredErrors: [
    /ResizeObserver loop/i,
    /Loading chunk .+ failed/i,
    /Script error/i,
    /Network request failed/i, // Too noisy
    /AbortError/i, // User-initiated
  ],
  severityThresholds: {
    alertOnCritical: true,
    alertOnHigh: true,
    criticalErrorsBeforeAlert: 5, // Only alert after 5 critical errors
  },
  storage: {
    maxErrors: 10000,
    retentionDays: 30,
  },
  performance: {
    maxOverhead: 1, // Strict 1% overhead limit
    batchSize: 100,
    flushIntervalMs: 5000,
  },
};

/**
 * Get configuration based on environment
 */
export function getMonitoringConfig(): Partial<MonitoringConfig> {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

/**
 * External Integrations Configuration
 */
export const integrationsConfig = {
  sentry: {
    enabled: process.env.SENTRY_DSN !== undefined,
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  },

  datadog: {
    enabled: process.env.DATADOG_API_KEY !== undefined,
    apiKey: process.env.DATADOG_API_KEY || '',
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    service: process.env.DATADOG_SERVICE || 'workflow-automation',
    env: process.env.NODE_ENV || 'development',
  },

  slack: {
    enabled: process.env.SLACK_WEBHOOK_URL !== undefined,
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_CHANNEL || '#errors',
    username: process.env.SLACK_USERNAME || 'Error Monitor',
    iconEmoji: process.env.SLACK_ICON_EMOJI || ':rotating_light:',
    mentionUsers: process.env.SLACK_MENTION_USERS?.split(',') || [],
  },

  pagerduty: {
    enabled: process.env.PAGERDUTY_INTEGRATION_KEY !== undefined,
    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
    routingKey: process.env.PAGERDUTY_ROUTING_KEY,
  },

  discord: {
    enabled: process.env.DISCORD_WEBHOOK_URL !== undefined,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    username: process.env.DISCORD_USERNAME || 'Error Monitor',
    avatarUrl: process.env.DISCORD_AVATAR_URL,
  },

  newrelic: {
    enabled: process.env.NEW_RELIC_LICENSE_KEY !== undefined,
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY || '',
    accountId: process.env.NEW_RELIC_ACCOUNT_ID || '',
    applicationId: process.env.NEW_RELIC_APP_ID,
  },
};

/**
 * Auto-Correction Configuration
 */
export const autoCorrectionConfig = {
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      /network/i,
      /timeout/i,
      /rate limit/i,
      /connection/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
    ],
  },

  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    halfOpenAttempts: 1,
  },

  strategies: {
    networkRetry: true,
    rateLimitBackoff: true,
    memoryCleanup: true,
    cacheInvalidation: true,
    serviceRestart: false, // Disable in production unless safe
    defaultFallback: true,
    circuitBreaker: true,
  },
};

/**
 * Storage Configuration
 */
export const storageConfig = {
  development: {
    maxErrors: 1000,
    retentionDays: 7,
    persistToFile: true,
    filePath: './data/errors-dev.json',
  },

  staging: {
    maxErrors: 5000,
    retentionDays: 14,
    persistToFile: true,
    filePath: './data/errors-staging.json',
  },

  production: {
    maxErrors: 10000,
    retentionDays: 30,
    persistToFile: true,
    filePath: process.env.ERROR_STORAGE_PATH || './data/errors.json',
  },
};

/**
 * Dashboard Configuration
 */
export const dashboardConfig = {
  autoRefresh: true,
  refreshInterval: 5000, // 5 seconds
  defaultTimeRange: '24h',
  maxErrorsDisplay: 100,
  enableExport: true,
  enableManualResolution: true,
};

/**
 * Alert Rules Configuration
 */
export const alertRulesConfig = {
  rules: [
    {
      name: 'Critical Error Spike',
      condition: 'error_count > 10 in 5 minutes',
      severity: 'critical',
      channels: ['slack', 'pagerduty'],
      enabled: true,
    },
    {
      name: 'High Error Rate',
      condition: 'error_rate > 5 per minute for 10 minutes',
      severity: 'high',
      channels: ['slack'],
      enabled: true,
    },
    {
      name: 'Security Error',
      condition: 'error_type = security',
      severity: 'critical',
      channels: ['slack', 'pagerduty'],
      enabled: true,
    },
    {
      name: 'Database Connection Issues',
      condition: 'error_type = database AND error_count > 3 in 5 minutes',
      severity: 'high',
      channels: ['slack'],
      enabled: true,
    },
    {
      name: 'Unresolved Critical Errors',
      condition: 'unresolved_critical > 5',
      severity: 'high',
      channels: ['slack'],
      enabled: true,
    },
  ],
};

/**
 * Example usage:
 *
 * import { ErrorMonitoringSystem } from './ErrorMonitoringSystem';
 * import { ExternalIntegrations } from './ExternalIntegrations';
 * import { getMonitoringConfig, integrationsConfig } from './config';
 *
 * // Initialize monitoring
 * const monitor = ErrorMonitoringSystem.getInstance(getMonitoringConfig());
 *
 * // Configure integrations
 * const integrations = new ExternalIntegrations();
 * if (integrationsConfig.sentry.enabled) {
 *   integrations.configureSentry(integrationsConfig.sentry);
 * }
 * if (integrationsConfig.slack.enabled) {
 *   integrations.configureSlack(integrationsConfig.slack);
 * }
 */

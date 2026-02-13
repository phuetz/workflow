/**
 * Error Monitoring System - Main Export
 * Central export point for all monitoring functionality
 */

// Internal imports for use in helper functions
import { ErrorMonitoringSystem as ErrorMonitoringSystemClass } from './ErrorMonitoringSystem';
import { ExternalIntegrations as ExternalIntegrationsClass } from './ExternalIntegrations';
import { logger } from '../services/SimpleLogger';
import {
  developmentConfig as devConfig,
  stagingConfig as stageConfig,
  productionConfig as prodConfig,
  integrationsConfig as intConfig,
} from './config.example';

// Core system
export {
  ErrorMonitoringSystem,
  type ErrorEvent,
  type ErrorContext,
  type ErrorStats,
  type ErrorType,
  type ErrorSeverity,
  type ResolutionMethod,
  type MonitoringConfig,
} from './ErrorMonitoringSystem';

// Pattern analysis
export {
  ErrorPatternAnalyzer,
  type ErrorPattern,
  type PatternCluster,
  type PatternAnalysis,
  type ErrorPrediction,
  type CorrelationResult,
} from './ErrorPatternAnalyzer';

// Auto-correction
export {
  AutoCorrection,
  type CorrectionStrategy,
  type CorrectionResult,
  type RetryConfig,
  type CircuitBreakerConfig,
  type CorrectionStats,
} from './AutoCorrection';

// Storage
export {
  ErrorStorage,
  type StorageConfig,
  type QueryOptions,
  type RecentErrorsOptions,
  type StorageStats,
} from './ErrorStorage';

// External integrations
export {
  ExternalIntegrations,
  type IntegrationConfig,
  type SentryConfig,
  type DataDogConfig,
  type SlackConfig as ExternalSlackConfig,
  type PagerDutyConfig as ExternalPagerDutyConfig,
  type DiscordConfig,
  type NewRelicConfig,
} from './ExternalIntegrations';

// Alert Manager (Week 8 Phase 2)
export {
  AlertManager,
  alertManager,
  type Alert,
  type AlertFilter,
  type AlertSeverity,
  type AlertCategory,
  type AlertStatus,
  type NotificationChannelType,
  type DeliveryStatus,
  type NotificationChannel,
  type NotificationChannelConfig,
  type EmailConfig,
  type SlackConfig as AlertSlackConfig,
  type TeamsConfig,
  type PagerDutyConfig as AlertPagerDutyConfig,
  type SMSConfig,
  type WebhookConfig,
  type EscalationPolicy,
  type EscalationRule,
  type RoutingRule,
  type AggregatedAlert,
  type DeliveryStatusRecord,
  type AlertStatistics,
  type ChannelStatistics,
  type TimeRange,
} from './AlertManager';

// Configuration (if using config.ts)
export {
  getMonitoringConfig,
  developmentConfig,
  stagingConfig,
  productionConfig,
  integrationsConfig,
  autoCorrectionConfig,
  storageConfig,
  dashboardConfig,
  alertRulesConfig,
} from './config.example';

/**
 * Quick start helper function
 * Sets up monitoring with sensible defaults
 */
export function initializeMonitoring(options?: {
  environment?: 'development' | 'staging' | 'production';
  enableIntegrations?: boolean;
  customConfig?: Partial<import('./ErrorMonitoringSystem').MonitoringConfig>;
}) {
  const { environment = 'development', enableIntegrations = false, customConfig } = options || {};

  // Get base config for environment
  let baseConfig;
  switch (environment) {
    case 'production':
      baseConfig = prodConfig;
      break;
    case 'staging':
      baseConfig = stageConfig;
      break;
    default:
      baseConfig = devConfig;
  }

  // Initialize monitoring system
  const monitor = ErrorMonitoringSystemClass.getInstance({
    ...baseConfig,
    ...customConfig,
  });

  // Setup integrations if enabled
  if (enableIntegrations) {
    const integrations = new ExternalIntegrationsClass();

    if (intConfig.sentry.enabled) {
      integrations.configureSentry(intConfig.sentry);
    }
    if (intConfig.datadog.enabled) {
      integrations.configureDataDog(intConfig.datadog);
    }
    if (intConfig.slack.enabled) {
      integrations.configureSlack(intConfig.slack);
    }
    if (intConfig.pagerduty.enabled) {
      integrations.configurePagerDuty(intConfig.pagerduty);
    }
    if (intConfig.discord.enabled) {
      integrations.configureDiscord(intConfig.discord);
    }
    if (intConfig.newrelic.enabled) {
      integrations.configureNewRelic(intConfig.newrelic);
    }
  }

  logger.info(`Error monitoring initialized (${environment})`, { component: 'monitoring' });

  return monitor;
}

/**
 * Example usage:
 *
 * // Simple initialization
 * import { initializeMonitoring } from './monitoring';
 * const monitor = initializeMonitoring({ environment: 'production' });
 *
 * // Or import specific components
 * import { ErrorMonitoringSystem, ErrorPatternAnalyzer } from './monitoring';
 * const monitor = ErrorMonitoringSystem.getInstance();
 * const analyzer = new ErrorPatternAnalyzer();
 */

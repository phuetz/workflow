/**
 * Log Streaming & Advanced Monitoring
 * Main entry point for logging system
 */

// Core Components
export { LogStreamer } from './LogStreamer';
export type { StreamedLog, LogStreamConfig, StreamMetrics, StreamHealth } from './LogStreamer';
export { StreamBuffer } from './StreamBuffer';
export type { StreamBufferConfig, BufferStats } from './StreamBuffer';
export { StreamTransport } from './StreamTransport';
export type { TransportConfig, TransportStatus, TransportMetrics } from './StreamTransport';

// Structured Logging
export {
  StructuredLogger,
  structuredLogger,
} from './StructuredLogger';
export type {
  LogLevel,
  StructuredLogOptions,
  LogContextData,
  PerformanceData,
  UserData,
  TraceData,
} from './StructuredLogger';

// Context Management
export {
  LogContext,
  getCurrentContext,
  runWithContext,
  runWithContextAsync,
} from './LogContext';

// Retention
export {
  LogRetention,
  createDefaultPolicies,
} from './LogRetention';
export type {
  RetentionPolicy,
  RetentionPeriod,
  RetentionStats,
  RetentionCondition,
} from './LogRetention';

// Filtering
export {
  LogFilter,
} from './LogFilter';
export type {
  FilterRule,
  FilterConfig,
  FilterStats,
} from './LogFilter';

// Integrations
export { DatadogStream } from './integrations/DatadogStream';
export type { DatadogConfig } from './integrations/DatadogStream';
export { SplunkStream } from './integrations/SplunkStream';
export type { SplunkConfig } from './integrations/SplunkStream';
export { ElasticsearchStream } from './integrations/ElasticsearchStream';
export type { ElasticsearchConfig } from './integrations/ElasticsearchStream';
export { CloudWatchStream } from './integrations/CloudWatchStream';
export type { CloudWatchConfig } from './integrations/CloudWatchStream';
export { GCPLoggingStream } from './integrations/GCPLoggingStream';
export type { GCPLoggingConfig } from './integrations/GCPLoggingStream';

// Legacy (for backward compatibility)
export {
  CentralizedLoggingSystem,
  loggingSystem,
} from './CentralizedLoggingSystem';
export type {
  LogEntry as LegacyLogEntry,
  LogLevel as LegacyLogLevel,
  LogCategory,
} from './CentralizedLoggingSystem';

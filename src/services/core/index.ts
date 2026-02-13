/**
 * Core Services Barrel Export
 *
 * This module provides unified exports for core infrastructure services.
 *
 * @module services/core
 * @version 1.0.0
 * @since 2026-01-10
 */

// Data Pipeline Service
export { DataPipelineService } from './DataPipelineService';
export type {
  PipelineConfig,
  PipelineStage,
  DataTransformation
} from './DataPipelineService';

// Performance Monitoring Hub
export { PerformanceMonitoringHub } from './PerformanceMonitoringHub';
export type {
  PerformanceMetric,
  MonitoringConfig
} from './PerformanceMonitoringHub';

// Unified Authentication Service
export { UnifiedAuthenticationService } from './UnifiedAuthenticationService';
export type {
  AuthConfig,
  AuthProvider,
  AuthResult
} from './UnifiedAuthenticationService';

// Unified Notification Service
export { UnifiedNotificationService } from './UnifiedNotificationService';
export type {
  NotificationChannel,
  NotificationConfig
} from './UnifiedNotificationService';

// Workflow Orchestration Service
export { WorkflowOrchestrationService } from './WorkflowOrchestrationService';
export type {
  OrchestrationConfig,
  WorkflowTask
} from './WorkflowOrchestrationService';

/**
 * Architecture Overview:
 *
 * Core Services Layer:
 * ├── DataPipelineService      - Data transformation and ETL pipelines
 * ├── PerformanceMonitoringHub - APM, tracing, and profiling
 * ├── UnifiedAuthenticationService - Multi-provider authentication
 * ├── UnifiedNotificationService - Multi-channel notifications
 * └── WorkflowOrchestrationService - Workflow execution orchestration
 *
 * Usage:
 * ```typescript
 * import {
 *   DataPipelineService,
 *   PerformanceMonitoringHub
 * } from '@services/core';
 * ```
 */

/**
 * Security Data Lake Manager - Barrel Export
 * Multi-cloud support with schema evolution, partitioning, retention, and lineage tracking
 */

// Re-export all types
export * from './types';

// Re-export data ingestion components
export {
  BaseDataLakeAdapter,
  AWSDataLakeAdapter,
  AzureDataLakeAdapter,
  GCPDataLakeAdapter,
  SnowflakeDataLakeAdapter,
  DatabricksDataLakeAdapter,
  AdapterFactory,
} from './DataIngestion';

// Re-export query components
export { QueryCache, QueryExecutor, QueryBuilder } from './DataQuery';

// Re-export retention components
export {
  RetentionPolicyManager,
  StorageOptimizer,
  CostCalculator,
  PartitionManager,
} from './DataRetention';

// Re-export analytics components
export {
  LineageTracker,
  MetricsCollector,
  SchemaRegistry,
  CatalogManager,
} from './SecurityAnalytics';

// Re-export main class and convenience function
export {
  SecurityDataLakeManager,
  getSecurityDataLakeManager,
} from './SecurityDataLakeManager';

// Default export
export { SecurityDataLakeManager as default } from './SecurityDataLakeManager';

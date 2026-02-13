/**
 * SecurityDataLakeManager - Enterprise Security Data Lake for Workflow Automation
 * Multi-cloud support with schema evolution, partitioning, retention, and lineage tracking
 *
 * This file is a facade that re-exports from the modular security/ directory.
 * For implementation details, see:
 * - ./security/types.ts - Type definitions
 * - ./security/DataIngestion.ts - Adapters and data ingestion
 * - ./security/DataQuery.ts - Query execution and caching
 * - ./security/DataRetention.ts - Retention and storage optimization
 * - ./security/SecurityAnalytics.ts - Lineage, metrics, and schema management
 * - ./security/index.ts - Main class and barrel exports
 */

// Re-export everything from the modular implementation
export * from './security';

// Re-export convenience function for backward compatibility
export { getSecurityDataLakeManager } from './security';

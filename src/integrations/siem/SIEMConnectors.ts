/**
 * SIEM Connectors Implementation
 * Supports Splunk, Elasticsearch, QRadar, LogRhythm, and Datadog
 * Features: Connection pooling, retry logic, batch processing, rate limiting
 *
 * This file is now a facade that re-exports from the modular implementation.
 * The actual implementation has been split into:
 * - src/integrations/siem/connectors/types.ts (shared types + base class)
 * - src/integrations/siem/connectors/SplunkConnector.ts (Splunk HEC)
 * - src/integrations/siem/connectors/ElasticConnector.ts (Elasticsearch)
 * - src/integrations/siem/connectors/QRadarConnector.ts (QRadar, LogRhythm, Datadog)
 * - src/integrations/siem/connectors/index.ts (barrel export + manager)
 */

// Re-export everything from the modular implementation
export * from './connectors';

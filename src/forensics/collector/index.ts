/**
 * Evidence Collector Module - Barrel Export
 *
 * Provides clean imports for all forensic evidence collection components.
 */

// Export all types
export * from './types';

// Export specialized collectors
export { MemoryCollector } from './MemoryCollector';
export { DiskCollector } from './DiskCollector';
export { NetworkCollector } from './NetworkCollector';
export { LogCollector, type LogType, type LogEntry, type LogCollectionResult } from './LogCollector';
export { CloudCollector } from './CloudCollector';
export { ChainOfCustodyManager, type ChainOfCustodyReport, type VerificationResult } from './ChainOfCustody';

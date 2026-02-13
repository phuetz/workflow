/**
 * Error Knowledge Base
 * Barrel export for error knowledge management system
 *
 * Split from original 1669 LOC file following SOLID principles:
 * - types.ts: Type definitions (~80 LOC)
 * - ErrorPatterns.ts: Network and auth error patterns (~380 LOC)
 * - SolutionMatcher.ts: Validation and resource error patterns (~350 LOC)
 * - KnowledgeStore.ts: Database, filesystem, system errors + service (~320 LOC)
 *
 * @see src/monitoring/knowledge/ for implementation details
 */

// Re-export all types
export * from './types';

// Re-export error pattern collections
export { NETWORK_ERRORS, AUTH_ERRORS } from './ErrorPatterns';
export { VALIDATION_ERRORS, RESOURCE_ERRORS } from './SolutionMatcher';
export {
  DATABASE_ERRORS,
  FILESYSTEM_ERRORS,
  SYSTEM_ERRORS,
  ERROR_KNOWLEDGE_BASE,
  ErrorKnowledgeBaseService
} from './KnowledgeStore';

// Import for singleton creation
import { ErrorKnowledgeBaseService } from './KnowledgeStore';

// Singleton instance
export const knowledgeBase = new ErrorKnowledgeBaseService();

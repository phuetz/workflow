/**
 * Error Knowledge Base
 *
 * Comprehensive catalog of known errors with:
 * - Detailed error descriptions
 * - Root cause analysis
 * - Tested solutions and fixes
 * - Prevention strategies
 * - Success rate tracking
 * - Related documentation
 *
 * Contains 50+ common error patterns with proven solutions
 *
 * REFACTORED: This file is now a facade that re-exports from modular components.
 * Original file was 1669 LOC, now split following SOLID principles:
 *
 * - src/monitoring/knowledge/types.ts - Type definitions (~80 LOC)
 * - src/monitoring/knowledge/ErrorPatterns.ts - Network/auth patterns (~380 LOC)
 * - src/monitoring/knowledge/SolutionMatcher.ts - Validation/resource patterns (~350 LOC)
 * - src/monitoring/knowledge/KnowledgeStore.ts - DB/FS/system patterns + service (~320 LOC)
 * - src/monitoring/knowledge/index.ts - Barrel export (~40 LOC)
 *
 * @see src/monitoring/knowledge/ for implementation details
 */

// Re-export everything from the modular implementation
export * from './knowledge';

// Re-export the singleton for backwards compatibility
export { knowledgeBase } from './knowledge';

// Re-export ErrorCategory and ErrorSeverity for backwards compatibility
import { ErrorCategory, ErrorSeverity } from '../utils/ErrorHandler';
export { ErrorCategory, ErrorSeverity };

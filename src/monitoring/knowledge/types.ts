/**
 * Error Knowledge Base - Type Definitions
 * Shared types for error knowledge management
 */

import { ErrorCategory, ErrorSeverity } from '../../utils/ErrorHandler';

// Re-export for convenience
export { ErrorCategory, ErrorSeverity };

// ============================================================================
// ERROR KNOWLEDGE TYPES
// ============================================================================

/**
 * Complete error knowledge entry
 */
export interface ErrorKnowledge {
  id: string;
  code: string;
  name: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  description: string;
  symptoms: string[];
  rootCauses: string[];
  solutions: Solution[];
  prevention: PreventionStrategy[];
  relatedDocs: string[];
  tags: string[];
  frequency: number;
  lastOccurrence?: Date;
  resolutionRate: number;
}

/**
 * Solution for an error
 */
export interface Solution {
  id: string;
  title: string;
  description: string;
  steps: string[];
  codeExample?: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  successRate: number;
  prerequisites?: string[];
  risks?: string[];
  testable: boolean;
}

/**
 * Prevention strategy for an error
 */
export interface PreventionStrategy {
  title: string;
  description: string;
  implementation: string[];
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Statistics about the knowledge base
 */
export interface KnowledgeBaseStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  totalSolutions: number;
  avgResolutionRate: number;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Search options for knowledge base queries
 */
export interface SearchOptions {
  categories?: ErrorCategory[];
  severities?: ErrorSeverity[];
  tags?: string[];
  minResolutionRate?: number;
  maxDifficulty?: 'easy' | 'medium' | 'hard';
}

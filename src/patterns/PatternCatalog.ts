/**
 * Workflow Pattern Catalog
 * Comprehensive library of 50+ workflow patterns across 5 categories
 *
 * This file serves as the main orchestrator for the pattern catalog.
 * Individual patterns are defined in the catalog/ subdirectory.
 */

import type { PatternDefinition, PatternCategory, PatternComplexity } from '../types/patterns';
import {
  ALL_PATTERNS,
  PATTERNS_BY_CATEGORY,
  // Re-export collections for backwards compatibility
  MESSAGING_PATTERNS,
  INTEGRATION_PATTERNS,
  RELIABILITY_PATTERNS,
  DATA_PATTERNS,
  WORKFLOW_PATTERNS,
} from './catalog';

// Re-export individual patterns for direct access
export {
  // Messaging patterns
  CHAIN_OF_RESPONSIBILITY,
  EVENT_DRIVEN,
  PUB_SUB,
  REQUEST_REPLY,
  MESSAGE_QUEUE,
  PIPES_AND_FILTERS,
  CONTENT_BASED_ROUTER,
  MESSAGE_TRANSLATOR,
  SCATTER_GATHER,
  CORRELATION_IDENTIFIER,
  // Integration patterns
  API_GATEWAY,
  BACKEND_FOR_FRONTEND,
  SERVICE_MESH,
  ADAPTER,
  FACADE,
  WEBHOOK_INTEGRATION,
  ANTI_CORRUPTION_LAYER,
  STRANGLER_FIG,
  SIDECAR,
  AMBASSADOR,
  // Reliability patterns
  RETRY,
  CIRCUIT_BREAKER,
  BULKHEAD,
  RATE_LIMITING,
  TIMEOUT,
  FALLBACK,
  HEALTH_CHECK,
  IDEMPOTENCY,
  COMPENSATING_TRANSACTION,
  DEAD_LETTER_QUEUE,
  // Data patterns
  ETL,
  DATA_VALIDATION,
  DATA_ENRICHMENT,
  DATA_AGGREGATION,
  CACHE_ASIDE,
  DATA_PARTITIONING,
  CQRS,
  EVENT_SOURCING,
  MATERIALIZED_VIEW,
  CHANGE_DATA_CAPTURE,
  // Workflow patterns
  SAGA,
  ORCHESTRATION,
  CHOREOGRAPHY,
  FAN_OUT_FAN_IN,
  PRIORITY_QUEUE,
  BATCH_PROCESSING,
  SCHEDULED_WORKFLOW,
  CONDITIONAL_WORKFLOW,
  PARALLEL_WORKFLOW,
  SEQUENTIAL_WORKFLOW,
  LOOP_WORKFLOW,
} from './catalog';

/**
 * Export all patterns as a catalog
 */
export const PATTERN_CATALOG: PatternDefinition[] = ALL_PATTERNS;

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): PatternDefinition | undefined {
  return PATTERN_CATALOG.find((pattern) => pattern.id === id);
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: PatternCategory | string): PatternDefinition[] {
  if (category in PATTERNS_BY_CATEGORY) {
    return PATTERNS_BY_CATEGORY[category as keyof typeof PATTERNS_BY_CATEGORY];
  }
  return PATTERN_CATALOG.filter((pattern) => pattern.category === category);
}

/**
 * Get patterns by complexity
 */
export function getPatternsByComplexity(complexity: PatternComplexity | string): PatternDefinition[] {
  return PATTERN_CATALOG.filter((pattern) => pattern.complexity === complexity);
}

/**
 * Search patterns by tag
 */
export function getPatternsByTag(tag: string): PatternDefinition[] {
  return PATTERN_CATALOG.filter((pattern) => pattern.tags.includes(tag));
}

/**
 * Search patterns by multiple tags (AND condition)
 */
export function getPatternsByTags(tags: string[]): PatternDefinition[] {
  return PATTERN_CATALOG.filter((pattern) =>
    tags.every((tag) => pattern.tags.includes(tag))
  );
}

/**
 * Search patterns by any of the given tags (OR condition)
 */
export function getPatternsByAnyTag(tags: string[]): PatternDefinition[] {
  return PATTERN_CATALOG.filter((pattern) =>
    tags.some((tag) => pattern.tags.includes(tag))
  );
}

/**
 * Search patterns by text (searches in name, description, and tags)
 */
export function searchPatterns(query: string): PatternDefinition[] {
  const lowerQuery = query.toLowerCase();
  return PATTERN_CATALOG.filter(
    (pattern) =>
      pattern.name.toLowerCase().includes(lowerQuery) ||
      pattern.description.toLowerCase().includes(lowerQuery) ||
      pattern.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      pattern.useCases.some((useCase) => useCase.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get related patterns for a given pattern
 */
export function getRelatedPatterns(patternId: string): PatternDefinition[] {
  const pattern = getPatternById(patternId);
  if (!pattern) return [];

  return pattern.relatedPatterns
    .map((id) => getPatternById(id))
    .filter((p): p is PatternDefinition => p !== undefined);
}

/**
 * Get anti-patterns for a given pattern
 */
export function getAntiPatterns(patternId: string): string[] {
  const pattern = getPatternById(patternId);
  return pattern?.antiPatterns ?? [];
}

/**
 * Filter patterns by multiple criteria
 */
export function filterPatterns(criteria: {
  categories?: PatternCategory[];
  complexities?: PatternComplexity[];
  tags?: string[];
  searchTerm?: string;
}): PatternDefinition[] {
  let results = PATTERN_CATALOG;

  if (criteria.categories && criteria.categories.length > 0) {
    results = results.filter((p) => criteria.categories!.includes(p.category));
  }

  if (criteria.complexities && criteria.complexities.length > 0) {
    results = results.filter((p) => criteria.complexities!.includes(p.complexity));
  }

  if (criteria.tags && criteria.tags.length > 0) {
    results = results.filter((p) => criteria.tags!.some((tag) => p.tags.includes(tag)));
  }

  if (criteria.searchTerm) {
    const term = criteria.searchTerm.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
  }

  return results;
}

/**
 * Get all unique tags from the catalog
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  PATTERN_CATALOG.forEach((pattern) => {
    pattern.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

/**
 * Get patterns grouped by category
 */
export function getPatternsCategorized(): Record<PatternCategory, PatternDefinition[]> {
  return {
    messaging: MESSAGING_PATTERNS,
    integration: INTEGRATION_PATTERNS,
    reliability: RELIABILITY_PATTERNS,
    data: DATA_PATTERNS,
    workflow: WORKFLOW_PATTERNS,
    architecture: [], // Currently empty, can be extended
  };
}

/**
 * Pattern catalog statistics
 */
export const PATTERN_STATS = {
  total: PATTERN_CATALOG.length,
  byCategory: {
    messaging: MESSAGING_PATTERNS.length,
    integration: INTEGRATION_PATTERNS.length,
    reliability: RELIABILITY_PATTERNS.length,
    data: DATA_PATTERNS.length,
    workflow: WORKFLOW_PATTERNS.length,
    architecture: 0,
  },
  byComplexity: {
    beginner: getPatternsByComplexity('beginner').length,
    intermediate: getPatternsByComplexity('intermediate').length,
    advanced: getPatternsByComplexity('advanced').length,
    expert: getPatternsByComplexity('expert').length,
  },
};

/**
 * Validate a pattern definition
 */
export function validatePattern(pattern: PatternDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pattern.id) errors.push('Pattern must have an id');
  if (!pattern.name) errors.push('Pattern must have a name');
  if (!pattern.category) errors.push('Pattern must have a category');
  if (!pattern.complexity) errors.push('Pattern must have a complexity');
  if (!pattern.description) errors.push('Pattern must have a description');
  if (!pattern.structure) errors.push('Pattern must have a structure');
  if (!pattern.benefits || pattern.benefits.length === 0) {
    errors.push('Pattern must have at least one benefit');
  }
  if (!pattern.useCases || pattern.useCases.length === 0) {
    errors.push('Pattern must have at least one use case');
  }
  if (!pattern.tags || pattern.tags.length === 0) {
    errors.push('Pattern must have at least one tag');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get suggested patterns based on node types
 */
export function getSuggestedPatterns(nodeTypes: string[]): PatternDefinition[] {
  return PATTERN_CATALOG.filter((pattern) => {
    const required = pattern.structure.requiredNodeTypes;
    const optional = pattern.structure.optionalNodeTypes;
    const allTypes = [...required, ...optional];

    // Check if any of the provided node types match pattern requirements
    return nodeTypes.some((type) => allTypes.includes(type));
  }).sort((a, b) => {
    // Sort by match count (more matches = higher relevance)
    const aMatches = [...a.structure.requiredNodeTypes, ...a.structure.optionalNodeTypes]
      .filter((t) => nodeTypes.includes(t)).length;
    const bMatches = [...b.structure.requiredNodeTypes, ...b.structure.optionalNodeTypes]
      .filter((t) => nodeTypes.includes(t)).length;
    return bMatches - aMatches;
  });
}

/**
 * Check if a workflow matches a pattern
 */
export function checkPatternMatch(
  pattern: PatternDefinition,
  nodeTypes: string[],
  edgeCount: number
): { matches: boolean; score: number; missing: string[] } {
  const required = pattern.structure.requiredNodeTypes;
  const missing = required.filter((type) => !nodeTypes.includes(type));

  const matchedRequired = required.filter((type) => nodeTypes.includes(type)).length;
  const totalRequired = required.length;

  const minNodes = pattern.structure.minNodes;
  const maxNodes = pattern.structure.maxNodes;
  const nodeCount = nodeTypes.length;

  const nodeCountValid = nodeCount >= minNodes && (!maxNodes || nodeCount <= maxNodes);

  const score = totalRequired > 0
    ? (matchedRequired / totalRequired) * (nodeCountValid ? 1 : 0.5)
    : nodeCountValid ? 1 : 0.5;

  return {
    matches: missing.length === 0 && nodeCountValid,
    score,
    missing,
  };
}

// Export category arrays for backwards compatibility
export {
  MESSAGING_PATTERNS,
  INTEGRATION_PATTERNS,
  RELIABILITY_PATTERNS,
  DATA_PATTERNS,
  WORKFLOW_PATTERNS,
};

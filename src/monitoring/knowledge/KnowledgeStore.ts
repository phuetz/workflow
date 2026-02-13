/**
 * Knowledge Store
 * Error Knowledge Base Service with query and management capabilities
 *
 * Split from original large file for better maintainability:
 * - patterns/SystemErrors.ts (DATABASE_ERRORS, FILESYSTEM_ERRORS, SYSTEM_ERRORS)
 * - patterns/NetworkErrors.ts (NETWORK_ERRORS)
 * - patterns/AuthErrors.ts (AUTH_ERRORS)
 * - patterns/ValidationErrors.ts (VALIDATION_ERRORS)
 * - patterns/ResourceErrors.ts (RESOURCE_ERRORS)
 */

import { ErrorCategory, ErrorSeverity } from '../../utils/ErrorHandler';
import type { ErrorKnowledge, KnowledgeBaseStats } from './types';
import {
  NETWORK_ERRORS,
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  DATABASE_ERRORS,
  FILESYSTEM_ERRORS,
  SYSTEM_ERRORS
} from './patterns';

/**
 * Combined error knowledge base
 */
export const ERROR_KNOWLEDGE_BASE: ErrorKnowledge[] = [
  ...NETWORK_ERRORS,
  ...AUTH_ERRORS,
  ...VALIDATION_ERRORS,
  ...RESOURCE_ERRORS,
  ...DATABASE_ERRORS,
  ...FILESYSTEM_ERRORS,
  ...SYSTEM_ERRORS
];

/**
 * Error Knowledge Base Service
 * Provides query and management capabilities
 */
export class ErrorKnowledgeBaseService {
  /**
   * Search for error knowledge by code or message
   */
  search(query: string): ErrorKnowledge[] {
    const lowerQuery = query.toLowerCase();

    return ERROR_KNOWLEDGE_BASE.filter(knowledge =>
      knowledge.code.toLowerCase().includes(lowerQuery) ||
      knowledge.name.toLowerCase().includes(lowerQuery) ||
      knowledge.description.toLowerCase().includes(lowerQuery) ||
      knowledge.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      knowledge.symptoms.some(symptom => symptom.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get knowledge by exact code
   */
  getByCode(code: string): ErrorKnowledge | undefined {
    return ERROR_KNOWLEDGE_BASE.find(k => k.code === code);
  }

  /**
   * Get knowledge by category
   */
  getByCategory(category: ErrorCategory): ErrorKnowledge[] {
    return ERROR_KNOWLEDGE_BASE.filter(k => k.category === category);
  }

  /**
   * Get knowledge by severity
   */
  getBySeverity(severity: ErrorSeverity): ErrorKnowledge[] {
    return ERROR_KNOWLEDGE_BASE.filter(k => k.severity === severity);
  }

  /**
   * Get all error codes
   */
  getAllCodes(): string[] {
    return ERROR_KNOWLEDGE_BASE.map(k => k.code);
  }

  /**
   * Get statistics
   */
  getStats(): KnowledgeBaseStats {
    const byCategory = {} as Record<ErrorCategory, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;
    let totalSolutions = 0;
    let totalResolutionRate = 0;

    for (const knowledge of ERROR_KNOWLEDGE_BASE) {
      byCategory[knowledge.category] = (byCategory[knowledge.category] || 0) + 1;
      bySeverity[knowledge.severity] = (bySeverity[knowledge.severity] || 0) + 1;
      totalSolutions += knowledge.solutions.length;
      totalResolutionRate += knowledge.resolutionRate;
    }

    return {
      total: ERROR_KNOWLEDGE_BASE.length,
      byCategory,
      bySeverity,
      totalSolutions,
      avgResolutionRate: totalResolutionRate / ERROR_KNOWLEDGE_BASE.length
    };
  }

  /**
   * Update error frequency and last occurrence
   */
  recordOccurrence(code: string): void {
    const knowledge = this.getByCode(code);
    if (knowledge) {
      knowledge.frequency++;
      knowledge.lastOccurrence = new Date();
    }
  }

  /**
   * Get most frequent errors
   */
  getMostFrequent(limit: number = 10): ErrorKnowledge[] {
    return [...ERROR_KNOWLEDGE_BASE]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }
}

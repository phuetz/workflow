/**
 * SearchService - Advanced search with fuzzy matching and filters
 * Optimized for large datasets with indexing and caching
 */

import {
  SearchQuery,
  SearchResult,
  SearchResults,
  SearchFilters,
  WorkflowStatus,
  SearchFacets,
} from '../types/organization';
import { tagService } from './TagService';
import { folderService } from './FolderService';
import { logger } from '../services/SimpleLogger';

interface WorkflowSearchIndex {
  workflowId: string;
  workflowName: string;
  folderId?: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: WorkflowStatus;
  executionStats?: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    lastExecuted?: string;
  };
  searchableText: string; // Lowercase concatenated text for searching
}

export class SearchService {
  private index: Map<string, WorkflowSearchIndex> = new Map();
  private cache: Map<string, SearchResults> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Index a workflow for search
   */
  indexWorkflow(
    workflowId: string,
    workflow: {
      name: string;
      folderId?: string;
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      status: WorkflowStatus;
      executionStats?: {
        totalExecutions: number;
        successRate: number;
        avgExecutionTime: number;
        lastExecuted?: string;
      };
      description?: string;
      nodes?: Array<{ data?: { label?: string; type?: string } }>;
    }
  ): void {
    const tags = tagService.getWorkflowTags(workflowId);
    const tagIds = tags.map((t) => t.id);

    // Build searchable text
    const searchableText = [
      workflow.name,
      workflow.description || '',
      tags.map((t) => t.name).join(' '),
      workflow.nodes?.map((n) => `${n.data?.label || ''} ${n.data?.type || ''}`).join(' ') || '',
    ]
      .join(' ')
      .toLowerCase();

    const indexEntry: WorkflowSearchIndex = {
      workflowId,
      workflowName: workflow.name,
      folderId: workflow.folderId,
      tagIds,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      createdBy: workflow.createdBy,
      status: workflow.status,
      executionStats: workflow.executionStats,
      searchableText,
    };

    this.index.set(workflowId, indexEntry);
    this.invalidateCache();
  }

  /**
   * Remove workflow from index
   */
  removeFromIndex(workflowId: string): void {
    this.index.delete(workflowId);
    this.invalidateCache();
  }

  /**
   * Rebuild entire index
   */
  rebuildIndex(workflows: Array<{
    id: string;
    name: string;
    folderId?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    status: WorkflowStatus;
    executionStats?: {
      totalExecutions: number;
      successRate: number;
      avgExecutionTime: number;
      lastExecuted?: string;
    };
    description?: string;
    nodes?: Array<{ data?: { label?: string; type?: string } }>;
  }>): void {
    this.index.clear();
    for (const workflow of workflows) {
      this.indexWorkflow(workflow.id, workflow);
    }
    logger.info(`Search index rebuilt with ${this.index.size} workflows`);
  }

  /**
   * Search workflows
   */
  search(query: SearchQuery): SearchResults {
    const cacheKey = this.getCacheKey(query);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - (cached as any)._timestamp < this.cacheExpiry) {
      logger.debug('Returning cached search results', { cacheKey });
      return cached;
    }

    const results = this.executeSearch(query);
    (results as any)._timestamp = Date.now();
    this.cache.set(cacheKey, results);

    return results;
  }

  /**
   * Execute search query
   */
  private executeSearch(query: SearchQuery): SearchResults {
    const startTime = Date.now();
    let candidates = Array.from(this.index.values());

    // Apply filters
    if (query.filters) {
      candidates = this.applyFilters(candidates, query.filters);
    }

    // Apply text search with fuzzy matching
    if (query.query && query.query.trim()) {
      candidates = this.fuzzySearch(candidates, query.query.trim());
    }

    // Sort results
    if (query.sort) {
      candidates = this.sortResults(candidates, query.sort);
    }

    // Calculate facets
    const facets = this.calculateFacets(candidates);

    // Pagination
    const page = query.pagination?.page || 1;
    const pageSize = query.pagination?.pageSize || 50;
    const total = candidates.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCandidates = candidates.slice(startIndex, endIndex);

    // Convert to results
    const results: SearchResult[] = paginatedCandidates.map((candidate) => {
      const tags = tagService.getWorkflowTags(candidate.workflowId);
      const folder = candidate.folderId
        ? folderService.getFolder(candidate.folderId)
        : null;

      return {
        workflowId: candidate.workflowId,
        workflowName: candidate.workflowName,
        folderId: candidate.folderId,
        folderPath: folder?.path,
        tags,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        createdBy: candidate.createdBy,
        status: candidate.status,
        executionStats: candidate.executionStats,
        matchScore: (candidate as any).matchScore,
        highlights: (candidate as any).highlights,
      };
    });

    const duration = Date.now() - startTime;
    logger.debug(`Search completed in ${duration}ms`, {
      query: query.query,
      total,
      page,
      pageSize,
    });

    return {
      results,
      total,
      page,
      pageSize,
      totalPages,
      facets,
    };
  }

  /**
   * Apply filters to candidates
   */
  private applyFilters(
    candidates: WorkflowSearchIndex[],
    filters: SearchFilters
  ): WorkflowSearchIndex[] {
    let filtered = candidates;

    // Name filter (simple substring match, fuzzy search is done separately)
    if (filters.name) {
      const lowerName = filters.name.toLowerCase();
      filtered = filtered.filter((c) =>
        c.workflowName.toLowerCase().includes(lowerName)
      );
    }

    // Folder filter
    if (filters.folderId !== undefined) {
      if (filters.includeSubfolders && filters.folderId) {
        const descendants = folderService
          .getDescendants(filters.folderId)
          .map((f) => f.id);
        const folderIds = [filters.folderId, ...descendants];
        filtered = filtered.filter(
          (c) => c.folderId && folderIds.includes(c.folderId)
        );
      } else {
        filtered = filtered.filter((c) => c.folderId === filters.folderId);
      }
    }

    // Tag filter
    if (filters.tags) {
      const { operation, tagIds } = filters.tags;
      if (tagIds.length > 0) {
        if (operation === 'AND') {
          filtered = filtered.filter((c) =>
            tagIds.every((tagId) => c.tagIds.includes(tagId))
          );
        } else if (operation === 'OR') {
          filtered = filtered.filter((c) =>
            tagIds.some((tagId) => c.tagIds.includes(tagId))
          );
        } else if (operation === 'NOT') {
          filtered = filtered.filter(
            (c) => !tagIds.some((tagId) => c.tagIds.includes(tagId))
          );
        }
      }
    }

    // Created by filter
    if (filters.createdBy && filters.createdBy.length > 0) {
      filtered = filtered.filter((c) =>
        filters.createdBy!.includes(c.createdBy)
      );
    }

    // Date created filter
    if (filters.dateCreated) {
      if (filters.dateCreated.from) {
        const fromDate = new Date(filters.dateCreated.from);
        filtered = filtered.filter(
          (c) => new Date(c.createdAt) >= fromDate
        );
      }
      if (filters.dateCreated.to) {
        const toDate = new Date(filters.dateCreated.to);
        filtered = filtered.filter(
          (c) => new Date(c.createdAt) <= toDate
        );
      }
    }

    // Date modified filter
    if (filters.dateModified) {
      if (filters.dateModified.from) {
        const fromDate = new Date(filters.dateModified.from);
        filtered = filtered.filter(
          (c) => new Date(c.updatedAt) >= fromDate
        );
      }
      if (filters.dateModified.to) {
        const toDate = new Date(filters.dateModified.to);
        filtered = filtered.filter(
          (c) => new Date(c.updatedAt) <= toDate
        );
      }
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((c) => filters.status!.includes(c.status));
    }

    // Execution stats filter
    if (filters.executionStats && filtered.length > 0) {
      const stats = filters.executionStats;

      if (stats.successRate) {
        filtered = filtered.filter((c) => {
          if (!c.executionStats) return false;
          const rate = c.executionStats.successRate;
          return (
            (stats.successRate!.min === undefined ||
              rate >= stats.successRate!.min) &&
            (stats.successRate!.max === undefined ||
              rate <= stats.successRate!.max)
          );
        });
      }

      if (stats.executionCount) {
        filtered = filtered.filter((c) => {
          if (!c.executionStats) return false;
          const count = c.executionStats.totalExecutions;
          return (
            (stats.executionCount!.min === undefined ||
              count >= stats.executionCount!.min) &&
            (stats.executionCount!.max === undefined ||
              count <= stats.executionCount!.max)
          );
        });
      }

      if (stats.avgExecutionTime) {
        filtered = filtered.filter((c) => {
          if (!c.executionStats) return false;
          const time = c.executionStats.avgExecutionTime;
          return (
            (stats.avgExecutionTime!.min === undefined ||
              time >= stats.avgExecutionTime!.min) &&
            (stats.avgExecutionTime!.max === undefined ||
              time <= stats.avgExecutionTime!.max)
          );
        });
      }

      if (stats.lastExecuted) {
        if (stats.lastExecuted.from) {
          const fromDate = new Date(stats.lastExecuted.from);
          filtered = filtered.filter((c) => {
            if (!c.executionStats?.lastExecuted) return false;
            return new Date(c.executionStats.lastExecuted) >= fromDate;
          });
        }
        if (stats.lastExecuted.to) {
          const toDate = new Date(stats.lastExecuted.to);
          filtered = filtered.filter((c) => {
            if (!c.executionStats?.lastExecuted) return false;
            return new Date(c.executionStats.lastExecuted) <= toDate;
          });
        }
      }
    }

    return filtered;
  }

  /**
   * Fuzzy search implementation
   */
  private fuzzySearch(
    candidates: WorkflowSearchIndex[],
    query: string
  ): WorkflowSearchIndex[] {
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 0);

    const scored = candidates.map((candidate) => {
      let score = 0;
      const highlights: string[] = [];

      // Exact match in name (highest score)
      if (candidate.workflowName.toLowerCase() === lowerQuery) {
        score += 100;
        highlights.push(candidate.workflowName);
      }

      // Starts with query (high score)
      else if (candidate.workflowName.toLowerCase().startsWith(lowerQuery)) {
        score += 50;
        highlights.push(candidate.workflowName);
      }

      // Contains query (medium score)
      else if (candidate.workflowName.toLowerCase().includes(lowerQuery)) {
        score += 30;
        const index = candidate.workflowName.toLowerCase().indexOf(lowerQuery);
        highlights.push(
          candidate.workflowName.substring(
            Math.max(0, index - 20),
            Math.min(candidate.workflowName.length, index + lowerQuery.length + 20)
          )
        );
      }

      // Word matches in searchable text
      for (const word of queryWords) {
        if (candidate.searchableText.includes(word)) {
          score += 10;
        }
      }

      // Fuzzy match (Levenshtein-like)
      const nameWords = candidate.workflowName.toLowerCase().split(/\s+/);
      for (const nameWord of nameWords) {
        for (const queryWord of queryWords) {
          const similarity = this.calculateSimilarity(nameWord, queryWord);
          if (similarity > 0.7) {
            score += Math.floor(similarity * 20);
          }
        }
      }

      return {
        ...candidate,
        matchScore: score,
        highlights,
      };
    });

    // Filter out zero scores and sort by score
    return scored.filter((s) => s.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate string similarity (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    const longerLength = longer.length;
    if (longerLength === 0) return 1;

    return (longerLength - this.levenshteinDistance(longer, shorter)) / longerLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Sort results
   */
  private sortResults(
    candidates: WorkflowSearchIndex[],
    sort: { field: string; direction: 'asc' | 'desc' }
  ): WorkflowSearchIndex[] {
    const { field, direction } = sort;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...candidates].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'name':
          aValue = a.workflowName.toLowerCase();
          bValue = b.workflowName.toLowerCase();
          return multiplier * aValue.localeCompare(bValue);

        case 'createdAt':
          return (
            multiplier *
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );

        case 'updatedAt':
          return (
            multiplier *
            (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
          );

        case 'executionCount':
          aValue = a.executionStats?.totalExecutions || 0;
          bValue = b.executionStats?.totalExecutions || 0;
          return multiplier * (aValue - bValue);

        case 'successRate':
          aValue = a.executionStats?.successRate || 0;
          bValue = b.executionStats?.successRate || 0;
          return multiplier * (aValue - bValue);

        case 'avgExecutionTime':
          aValue = a.executionStats?.avgExecutionTime || 0;
          bValue = b.executionStats?.avgExecutionTime || 0;
          return multiplier * (aValue - bValue);

        case 'lastExecuted':
          aValue = a.executionStats?.lastExecuted
            ? new Date(a.executionStats.lastExecuted).getTime()
            : 0;
          bValue = b.executionStats?.lastExecuted
            ? new Date(b.executionStats.lastExecuted).getTime()
            : 0;
          return multiplier * (aValue - bValue);

        default:
          return 0;
      }
    });
  }

  /**
   * Calculate search facets for filtering
   */
  private calculateFacets(candidates: WorkflowSearchIndex[]): SearchFacets {
    const tagCounts = new Map<string, number>();
    const folderCounts = new Map<string, number>();
    const statusCounts = new Map<WorkflowStatus, number>();
    const creatorCounts = new Map<string, number>();

    for (const candidate of candidates) {
      // Count tags
      for (const tagId of candidate.tagIds) {
        tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
      }

      // Count folders
      if (candidate.folderId) {
        folderCounts.set(
          candidate.folderId,
          (folderCounts.get(candidate.folderId) || 0) + 1
        );
      }

      // Count statuses
      statusCounts.set(
        candidate.status,
        (statusCounts.get(candidate.status) || 0) + 1
      );

      // Count creators
      creatorCounts.set(
        candidate.createdBy,
        (creatorCounts.get(candidate.createdBy) || 0) + 1
      );
    }

    return {
      tags: Array.from(tagCounts.entries())
        .map(([tagId, count]) => ({
          tag: tagService.getTag(tagId)!,
          count,
        }))
        .filter((t) => t.tag)
        .sort((a, b) => b.count - a.count),

      folders: Array.from(folderCounts.entries())
        .map(([folderId, count]) => ({
          folder: folderService.getFolder(folderId)!,
          count,
        }))
        .filter((f) => f.folder)
        .sort((a, b) => b.count - a.count),

      status: Array.from(statusCounts.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),

      creators: Array.from(creatorCounts.entries())
        .map(([userId, count]) => ({
          userId,
          userName: userId, // Would get from user service
          count,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Generate cache key from query
   */
  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      query: query.query,
      filters: query.filters,
      sort: query.sort,
      pagination: query.pagination,
    });
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.index.clear();
    this.cache.clear();
  }
}

// Singleton instance
export const searchService = new SearchService();

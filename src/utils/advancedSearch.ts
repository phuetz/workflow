/**
 * Advanced Search System
 * Powerful search with filters, operators, and fuzzy matching
 */

export interface SearchQuery {
  text?: string;
  filters?: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: any;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  facets?: Record<string, FacetResult[]>;
}

export interface FacetResult {
  value: string;
  count: number;
}

export interface SearchIndex<T> {
  id: string;
  data: T;
  searchableText: string;
  fields: Record<string, any>;
}

class AdvancedSearch<T> {
  private indices: SearchIndex<T>[] = [];
  private searchableFields: string[] = [];

  constructor(searchableFields: string[]) {
    this.searchableFields = searchableFields;
  }

  /**
   * Index items for search
   */
  index(items: T[], idField: string = 'id'): void {
    this.indices = items.map(item => {
      const searchableText = this.buildSearchableText(item);
      const fields = this.extractFields(item);

      return {
        id: (item as any)[idField],
        data: item,
        searchableText,
        fields
      };
    });
  }

  /**
   * Build searchable text from item
   */
  private buildSearchableText(item: any): string {
    const texts: string[] = [];

    for (const field of this.searchableFields) {
      const value = this.getNestedValue(item, field);
      if (value !== undefined && value !== null) {
        texts.push(String(value).toLowerCase());
      }
    }

    return texts.join(' ');
  }

  /**
   * Extract all fields from item
   */
  private extractFields(item: any): Record<string, any> {
    const fields: Record<string, any> = {};

    const extract = (obj: any, prefix: string = '') => {
      for (const key in obj) {
        const value = obj[key];
        const fieldName = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          extract(value, fieldName);
        } else {
          fields[fieldName] = value;
        }
      }
    };

    extract(item);
    return fields;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Search with query
   */
  search(query: SearchQuery): SearchResult<T> {
    let results = [...this.indices];

    // Apply text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(index => {
        // Exact match
        if (index.searchableText.includes(searchText)) {
          return true;
        }

        // Fuzzy match
        return this.fuzzyMatch(index.searchableText, searchText);
      });

      // Sort by relevance
      results.sort((a, b) => {
        const scoreA = this.calculateRelevance(a.searchableText, searchText);
        const scoreB = this.calculateRelevance(b.searchableText, searchText);
        return scoreB - scoreA;
      });
    }

    // Apply filters
    if (query.filters && query.filters.length > 0) {
      results = results.filter(index => {
        return query.filters!.every(filter => {
          return this.applyFilter(index.fields, filter);
        });
      });
    }

    // Apply sorting
    if (query.sortBy) {
      results.sort((a, b) => {
        const valueA = a.fields[query.sortBy!];
        const valueB = b.fields[query.sortBy!];

        let comparison = 0;
        if (valueA < valueB) comparison = -1;
        if (valueA > valueB) comparison = 1;

        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    const total = results.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    results = results.slice(offset, offset + limit);

    return {
      items: results.map(r => r.data),
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * Apply filter
   */
  private applyFilter(fields: Record<string, any>, filter: SearchFilter): boolean {
    const value = fields[filter.field];

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'gt':
        return value > filter.value;
      case 'gte':
        return value >= filter.value;
      case 'lt':
        return value < filter.value;
      case 'lte':
        return value <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'between':
        return Array.isArray(filter.value) && value >= filter.value[0] && value <= filter.value[1];
      default:
        return true;
    }
  }

  /**
   * Fuzzy matching using Levenshtein distance
   */
  private fuzzyMatch(text: string, query: string, threshold: number = 0.7): boolean {
    const words = query.split(' ');

    return words.some(word => {
      const textWords = text.split(' ');
      return textWords.some(textWord => {
        const distance = this.levenshteinDistance(textWord, word);
        const similarity = 1 - distance / Math.max(textWord.length, word.length);
        return similarity >= threshold;
      });
    });
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
   * Calculate relevance score
   */
  private calculateRelevance(text: string, query: string): number {
    let score = 0;

    // Exact match bonus
    if (text.includes(query)) {
      score += 100;

      // Position bonus (earlier is better)
      const position = text.indexOf(query);
      score += 50 / (position + 1);
    }

    // Word match bonus
    const queryWords = query.split(' ');
    const textWords = text.split(' ');

    for (const queryWord of queryWords) {
      if (textWords.some(textWord => textWord.includes(queryWord))) {
        score += 10;
      }
    }

    return score;
  }

  /**
   * Get facets for field
   */
  getFacets(field: string): FacetResult[] {
    const facetCounts = new Map<string, number>();

    for (const index of this.indices) {
      const value = String(index.fields[field] || 'Unknown');
      facetCounts.set(value, (facetCounts.get(value) || 0) + 1);
    }

    return Array.from(facetCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Suggest completions
   */
  suggest(query: string, limit: number = 5): string[] {
    const suggestions = new Set<string>();

    for (const index of this.indices) {
      const words = index.searchableText.split(' ');

      for (const word of words) {
        if (word.startsWith(query.toLowerCase())) {
          suggestions.add(word);
          if (suggestions.size >= limit) break;
        }
      }

      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions);
  }

  /**
   * Clear index
   */
  clear(): void {
    this.indices = [];
  }
}

// Factory function
export function createSearch<T>(searchableFields: string[]): AdvancedSearch<T> {
  return new AdvancedSearch<T>(searchableFields);
}

/**
 * Example usage with workflows
 */
export const workflowSearch = createSearch<any>(['name', 'description', 'tags']);

/**
 * Search operators for query building
 */
export const SEARCH_OPERATORS = [
  { label: 'Equals', value: 'equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Starts with', value: 'startsWith' },
  { label: 'Ends with', value: 'endsWith' },
  { label: 'Greater than', value: 'gt' },
  { label: 'Greater than or equal', value: 'gte' },
  { label: 'Less than', value: 'lt' },
  { label: 'Less than or equal', value: 'lte' },
  { label: 'In list', value: 'in' },
  { label: 'Between', value: 'between' }
] as const;
